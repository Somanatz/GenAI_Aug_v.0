from rest_framework import viewsets,permissions
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.exceptions import PermissionDenied
from .models import ForumCategory,ForumThread,ForumPost
from .serializers import ForumCategorySerializer,ForumThreadSerializer,ForumPostSerializer

def get_user_school(user):
    if hasattr(user,'school') and user.school:
        return user.school
    if hasattr(user,'student_profile') and user.student_profile and user.student_profile.school:
        return user.student_profile.school
    if hasattr(user,'teacher_profile') and user.teacher_profile and user.teacher_profile.school:
        return user.teacher_profile.school
    return None

class ForumCategoryViewSet(viewsets.ModelViewSet):
    serializer_class=ForumCategorySerializer
    permission_classes=[permissions.IsAuthenticated]
    queryset=ForumCategory.objects.all()
    def get_queryset(self):
        user=self.request.user
        if not user.is_authenticated:
            return ForumCategory.objects.none()
        school=get_user_school(user)
        if user.is_staff and not school:
            return self.queryset
        if school:
            return self.queryset.filter(school=school)
        return ForumCategory.objects.none()
    def perform_create(self,serializer):
        school=get_user_school(self.request.user)
        if not school:
            raise PermissionDenied("No school linked to your account.")
        serializer.save(school=school)

class ForumThreadViewSet(viewsets.ModelViewSet):
    serializer_class=ForumThreadSerializer
    permission_classes=[permissions.IsAuthenticatedOrReadOnly]
    filter_backends=[DjangoFilterBackend]
    filterset_fields=['category__slug','author']
    queryset=ForumThread.objects.select_related('category','author').prefetch_related('posts')
    def get_queryset(self):
        user=self.request.user
        if not user.is_authenticated:
            return self.queryset.none()
        school=get_user_school(user)
        if school:
            return self.queryset.filter(category__school=school)
        return self.queryset.none()
    def perform_create(self,serializer):
        category=serializer.validated_data['category']
        school=get_user_school(self.request.user)
        if not school or category.school!=school:
            raise PermissionDenied("Invalid category for your school.")
        serializer.save(author=self.request.user)

class ForumPostViewSet(viewsets.ModelViewSet):
    serializer_class=ForumPostSerializer
    permission_classes=[permissions.IsAuthenticatedOrReadOnly]
    filter_backends=[DjangoFilterBackend]
    filterset_fields=['thread']
    queryset=ForumPost.objects.select_related('thread__category','author')
    def get_queryset(self):
        user=self.request.user
        if not user.is_authenticated:
            return self.queryset.none()
        school=get_user_school(user)
        if school:
            return self.queryset.filter(thread__category__school=school)
        return self.queryset.none()
    def perform_create(self,serializer):
        thread=serializer.validated_data['thread']
        school=get_user_school(self.request.user)
        if not school or thread.category.school!=school:
            raise PermissionDenied("You cannot post in a different school's thread.")
        serializer.save(author=self.request.user)
