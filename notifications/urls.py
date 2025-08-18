
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, MessageViewSet

router = DefaultRouter()
router.register(r'events', EventViewSet)
router.register(r'messages', MessageViewSet, basename='message')

urlpatterns = [
    path('', include(router.urls)),
]
