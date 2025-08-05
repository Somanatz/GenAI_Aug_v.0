from django.urls import path,include # type: ignore
from rest_framework.routers import DefaultRouter # type: ignore
from .views import ForumCategoryViewSet,ForumThreadViewSet,ForumPostViewSet

router=DefaultRouter()
router.register(r'categories',ForumCategoryViewSet,basename='forum-category')
router.register(r'threads',ForumThreadViewSet,basename='forum-thread')
router.register(r'posts',ForumPostViewSet,basename='forum-post')

urlpatterns=[
    path('',include(router.urls)),
]
