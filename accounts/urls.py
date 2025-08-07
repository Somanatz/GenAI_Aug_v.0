
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomUserViewSet, UserSignupView, ParentStudentLinkViewSet, 
    TeacherActionsViewSet, bulk_upload_users, SchoolViewSet,
    LoginView, LogoutView, ProgressAnalyticsView, record_study_ping,
    RecentActivityViewSet, SyllabusListView, MasterClassListView, SchoolClassListView,
    StudentRecommendationViewSet, verify_email_view, contact_sales_view, StudentTaskViewSet,
    UserDailyActivityViewSet
)
from content.views import RewardProgressView # Import the view

router = DefaultRouter()
router.register(r'users', CustomUserViewSet, basename='customuser')
router.register(r'parent-student-links', ParentStudentLinkViewSet)
router.register(r'teacher-actions', TeacherActionsViewSet, basename='teacher-actions')
router.register(r'schools', SchoolViewSet)
router.register(r'recent-activities', RecentActivityViewSet, basename='recentactivity')
router.register(r'school-classes', SchoolClassListView, basename='schoolclass')
router.register(r'student-recommendations', StudentRecommendationViewSet, basename='studentrecommendation')
router.register(r'student-tasks', StudentTaskViewSet, basename='studenttask')
router.register(r'daily-activities', UserDailyActivityViewSet, basename='userdailyactivity')


urlpatterns = [
    path('', include(router.urls)),
    path('signup/', UserSignupView.as_view(), name='signup'),
    path('bulk-upload-users/', bulk_upload_users, name='bulk-upload-users'),
    path('login/', LoginView.as_view(), name='api_login'),
    path('logout/', LogoutView.as_view(), name='api_logout'),
    path('progress-analytics/', ProgressAnalyticsView.as_view(), name='progress_analytics'),
    path('record-study-ping/', record_study_ping, name='record_study_ping'),
    path('syllabuses/', SyllabusListView.as_view(), name='syllabus-list'),
    path('master-classes/', MasterClassListView.as_view(), name='masterclass-list'),
    # Add the missing rewards progress URL directly here
    path('rewards/progress/', RewardProgressView.as_view(), name='reward-progress'),
    path('verify-email/<uuid:token>/', verify_email_view, name='verify_email'),
    path('contact-sales/', contact_sales_view, name='contact-sales'),
]
