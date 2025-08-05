
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EventViewSet, StudentTaskViewSet

router = DefaultRouter()
router.register(r'events', EventViewSet)
router.register(r'student-tasks', StudentTaskViewSet, basename='studenttask')

urlpatterns = [
    path('', include(router.urls)),
]
