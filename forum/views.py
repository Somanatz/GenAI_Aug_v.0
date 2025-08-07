
# forum/views.py

from rest_framework import viewsets, permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Prefetch, Count, Q, F, OuterRef, Subquery, Exists, Max
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from .models import ForumThread, ForumPost, PostLike, PostAttachment
from .serializers import ForumThreadSerializer, ForumPostSerializer
from accounts.models import SchoolClass, RecentActivity

def get_user_school(user):
    if user.is_authenticated:
        return user.school
    return None

class ForumThreadViewSet(viewsets.ModelViewSet):
    serializer_class = ForumThreadSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['category', 'school_class', 'author']

    def get_queryset(self):
        user = self.request.user
        school = get_user_school(user)
        if not school:
            return ForumThread.objects.none()

        base_qs = ForumThread.objects.filter(school=school).select_related('author')
        
        last_poster_subquery = ForumPost.objects.filter(thread=OuterRef('pk')).order_by('-created_at').values('author__username')[:1]
        annotated_qs = base_qs.annotate(
            reply_count=Count('posts', distinct=True) - 1,
            last_activity_at=Max('posts__created_at'),
            last_activity_by=Subquery(last_poster_subquery)
        ).order_by(F('last_activity_at').desc(nulls_last=True), '-updated_at')
        
        if self.action == 'list':
            if user.role in ['Admin', 'Teacher']:
                return annotated_qs.exclude(category=ForumThread.ThreadCategory.MANAGEMENT) if user.role == 'Teacher' else annotated_qs
            elif user.role == 'Student':
                student_class = getattr(user.student_profile, 'enrolled_class', None)
                return annotated_qs.filter(
                    Q(category=ForumThread.ThreadCategory.GENERAL) |
                    (Q(category=ForumThread.ThreadCategory.CLASS) & Q(school_class=student_class)) |
                    Q(author=user)
                ).distinct()
            elif user.role == 'Parent':
                return annotated_qs.filter(Q(category=ForumThread.ThreadCategory.GENERAL) | Q(author=user)).distinct()
        
        return base_qs

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object() 
        user = request.user
        
        allowed = False
        if user.role == 'Admin': allowed = True
        elif user.role == 'Teacher': allowed = instance.category != ForumThread.ThreadCategory.MANAGEMENT
        elif user.role == 'Student':
             student_class = getattr(user.student_profile, 'enrolled_class', None)
             if instance.category == ForumThread.ThreadCategory.GENERAL or instance.author == user or instance.school_class == student_class:
                 allowed = True
        elif user.role == 'Parent':
             if instance.category == ForumThread.ThreadCategory.GENERAL or instance.author == user:
                 allowed = True
        
        if not allowed: raise PermissionDenied("You do not have permission to view this thread.")

        session_key = f'viewed_thread_{instance.id}'
        if not request.session.get(session_key, False):
            request.session[session_key] = True
            instance.view_count = F('view_count') + 1
            instance.save(update_fields=['view_count'])
            instance.refresh_from_db()

        user_likes_subquery = PostLike.objects.filter(post=OuterRef('pk'), user=request.user)
        replies_qs = ForumPost.objects.select_related('author__student_profile', 'author__teacher_profile', 'author__parent_profile').prefetch_related('attachments').annotate(
            like_count=Count('likes'),
            is_liked_by_user=Exists(user_likes_subquery)
        )
        top_level_posts_qs = instance.posts.filter(parent_post__isnull=True).select_related('author__student_profile', 'author__teacher_profile', 'author__parent_profile').prefetch_related(
            Prefetch('replies', queryset=replies_qs, to_attr='replies_cache'),
            'attachments'
        ).annotate(
            like_count=Count('likes'),
            is_liked_by_user=Exists(user_likes_subquery)
        )
        
        instance.prefetched_posts = list(top_level_posts_qs)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        school = get_user_school(user)
        content = self.request.data.get('content')
        category = self.request.data.get('category')

        if not school: raise PermissionDenied("You must be associated with a school.")
        if not content: raise ValidationError({'content': 'The initial post content cannot be empty.'})
        if not category: raise ValidationError({'category': 'A category is required.'})

        school_class = None
        if category == ForumThread.ThreadCategory.CLASS:
            student_profile = getattr(user, 'student_profile', None)
            if not student_profile or not student_profile.enrolled_class:
                raise ValidationError({'category': 'You must be enrolled in a class to post in this category.'})
            school_class = student_profile.enrolled_class
        
        thread = serializer.save(author=user, school=school, category=category, school_class=school_class)
        initial_post = ForumPost.objects.create(thread=thread, author=user, content=content)
        
        RecentActivity.objects.create(
            user=user,
            activity_type='Forum',
            details=f"Created a new forum thread: '{thread.title[:100]}...'"
        )

        uploaded_file = self.request.FILES.get('file')
        if uploaded_file:
            # Attach to the thread directly since it's the initial post's attachment
            PostAttachment.objects.create(thread=thread, uploader=user, file=uploaded_file)


class ForumPostViewSet(viewsets.ModelViewSet):
    serializer_class = ForumPostSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser] # Add parsers for attachments

    def get_queryset(self):
        user = self.request.user
        school = get_user_school(user)
        if not school:
            return ForumPost.objects.none()
        return ForumPost.objects.filter(thread__school=school).select_related('author')

    def perform_create(self, serializer):
        post = serializer.save(author=self.request.user)
        
        RecentActivity.objects.create(
            user=self.request.user,
            activity_type='Forum',
            details=f"Replied in forum thread: '{post.thread.title[:100]}...'"
        )
        
        uploaded_file = self.request.FILES.get('file')
        if uploaded_file:
            PostAttachment.objects.create(post=post, uploader=self.request.user, file=uploaded_file)


    @action(detail=True, methods=['post'], url_path='toggle-like')
    def toggle_like(self, request, pk=None):
        user = request.user
        post = self.get_object()
        try:
            like = PostLike.objects.get(post=post, user=user)
            like.delete()
            liked = False
        except PostLike.DoesNotExist:
            PostLike.objects.create(post=post, user=user)
            liked = True
        return Response({'status': 'ok', 'liked': liked}, status=status.HTTP_200_OK)
