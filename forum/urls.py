from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ForumThreadViewSet, ForumPostViewSet

router = DefaultRouter()
router.register(r'forum-threads', ForumThreadViewSet, basename='forum-thread')
router.register(r'forum-posts', ForumPostViewSet, basename='forum-post')

urlpatterns = [
    path('', include(router.urls)),
]
