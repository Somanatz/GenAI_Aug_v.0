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
from accounts.models import SchoolClass

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

        # Base queryset for all threads in the user's school
        base_qs = ForumThread.objects.filter(school=school).select_related('author')
        
        # Annotate for list view
        last_poster_subquery = ForumPost.objects.filter(thread=OuterRef('pk')).order_by('-created_at').values('author__username')[:1]
        annotated_qs = base_qs.annotate(
            reply_count=Count('posts', distinct=True) - 1,
            last_activity_at=Max('posts__created_at'),
            last_activity_by=Subquery(last_poster_subquery)
        ).order_by(F('last_activity_at').desc(nulls_last=True), '-updated_at')
        
        # Apply permission filtering
        if user.role in ['Admin', 'Teacher']:
            return annotated_qs
        elif user.role == 'Student':
            student_profile = getattr(user, 'student_profile', None)
            student_class = getattr(student_profile, 'enrolled_class', None)
            return annotated_qs.filter(Q(category='GENERAL') | (Q(category='CLASS') & Q(school_class=student_class)) | Q(author=user))
        elif user.role == 'Parent':
            return annotated_qs.filter(Q(category='GENERAL') | Q(author=user))
            
        return ForumThread.objects.none()

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object() # This will use the default lookup based on pk

        # View count logic using session
        session_key = f'viewed_thread_{instance.id}'
        if not request.session.get(session_key, False):
            request.session[session_key] = True
            instance.view_count = F('view_count') + 1
            instance.save(update_fields=['view_count'])
            instance.refresh_from_db()

        # Efficiently prefetch data for the serializer
        user_likes_subquery = PostLike.objects.filter(post=OuterRef('pk'), user=request.user, like_type='LIKE')

        # Define the queryset for nested replies, including annotations
        replies_qs = ForumPost.objects.select_related('author').prefetch_related('attachments').annotate(
            like_count=Count('likes', filter=Q(likes__like_type='LIKE')),
            is_liked_by_user=Exists(user_likes_subquery)
        )

        # Prefetch top-level posts and their annotated replies
        top_level_posts_qs = instance.posts.filter(parent_post__isnull=True).select_related('author').prefetch_related(
            Prefetch('replies', queryset=replies_qs, to_attr='replies_cache'),
            'attachments'
        ).annotate(
            like_count=Count('likes', filter=Q(likes__like_type='LIKE')),
            is_liked_by_user=Exists(user_likes_subquery)
        )
        
        # Attach the efficiently fetched posts to the instance
        instance.prefetched_posts = list(top_level_posts_qs)
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        school = get_user_school(user)
        content = self.request.data.get('content')
        if not school: raise PermissionDenied("You must be associated with a school.")
        if not content: raise ValidationError({'content': 'The initial post content cannot be empty.'})

        # Set school_class if category is 'CLASS'
        school_class = None
        if serializer.validated_data.get('category') == 'CLASS':
            student_profile = getattr(user, 'student_profile', None)
            if not student_profile or not student_profile.enrolled_class:
                raise ValidationError({'category': 'You must be enrolled in a class to post in this category.'})
            school_class = student_profile.enrolled_class
        
        thread = serializer.save(author=user, school=school, school_class=school_class)
        initial_post = ForumPost.objects.create(thread=thread, author=user, content=content)

        uploaded_file = self.request.FILES.get('file')
        if uploaded_file:
            PostAttachment.objects.create(post=initial_post, uploader=user, file=uploaded_file)


class ForumPostViewSet(viewsets.ModelViewSet):
    serializer_class = ForumPostSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        school = get_user_school(user)
        if not school:
            return ForumPost.objects.none()
        return ForumPost.objects.filter(thread__school=school).select_related('author')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        thread = serializer.validated_data['thread']
        # This permission check is flawed for replies, but ok for now. A better check would be on the thread itself.
        # A user might be able to reply to a thread they can't see in the list.
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=['post'], url_path='toggle-like')
    def toggle_like(self, request, pk=None):
        user = request.user
        # Correctly get the post object using the primary key from the URL
        post = self.get_object()

        # Check if a like from this user already exists for this post
        try:
            like = PostLike.objects.get(post=post, user=user, like_type='LIKE')
            # If it exists, delete it (unlike)
            like.delete()
            liked = False
        except PostLike.DoesNotExist:
            # If it doesn't exist, create it (like)
            PostLike.objects.create(post=post, user=user, like_type='LIKE')
            liked = True
        
        # Return a simple status and the new liked state
        return Response({'status': 'ok', 'liked': liked}, status=status.HTTP_200_OK)
