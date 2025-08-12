
from rest_framework import viewsets, status, generics, serializers as drf_serializers, permissions
from rest_framework.generics import CreateAPIView, ListAPIView
from rest_framework.views import APIView
from .models import (
    CustomUser, ParentStudentLink, School, StudentProfile, TeacherProfile, 
    ParentProfile, UserDailyActivity, UserLoginActivity, UserSubjectStudy, 
    RecentActivity, Syllabus, SchoolClass, StudentRecommendation, StudentTask,
    TeacherTask
)
from content.models import Class as MasterClass, Subject as ContentSubject, Lesson, AILessonQuizAttempt, UserLessonProgress, UserQuizAttempt
from content.services import check_and_award_rewards
from rest_framework.decorators import action, api_view, permission_classes as dec_permission_classes, parser_classes
import django_filters.rest_framework
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from .serializers import (
    CustomUserSerializer, UserSignupSerializer, ParentStudentLinkSerializer,
    SchoolSerializer, StudentProfileSerializer, TeacherProfileSerializer, ParentProfileSerializer,
    StudentProfileCompletionSerializer, TeacherProfileCompletionSerializer, ParentProfileCompletionSerializer,
    RecentActivitySerializer, SyllabusSerializer, SchoolClassSerializer, StudentRecommendationSerializer,
    UserDailyActivitySerializer, StudentTaskSerializer, TeacherTaskSerializer
)
from content.serializers import ClassSerializer as MasterClassSerializer
from .permissions import IsParent, IsTeacher, IsTeacherOrReadOnly, IsAdminOfThisSchoolOrPlatformStaff, IsStudent
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.utils import timezone
from django.db.models import F, Sum, OuterRef, Subquery, Count, Avg
from django.db import models as db_models
from datetime import timedelta, datetime

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.http import HttpResponse


@api_view(['POST'])
@dec_permission_classes([AllowAny])
def contact_sales_view(request):
    data = request.data
    school_name = data.get('schoolName')
    contact_person = data.get('contactPerson')
    email = data.get('email')
    school_address = data.get('schoolAddress', 'Not provided')
    zip_code = data.get('zipCode', 'Not provided')
    message = data.get('message', 'No message provided.')

    # Send notification to admin
    admin_subject = f"New GenAI-Campus Inquiry from {school_name}"
    admin_message = f"""
    You have a new inquiry:
    School Name: {school_name}
    Contact Person: {contact_person}
    Email: {email}
    Address: {school_address}
    Zip Code: {zip_code}
    Message:
    {message}
    """
    send_mail(admin_subject, admin_message, settings.DEFAULT_FROM_EMAIL, [settings.EMAIL_HOST_USER])

    # Send confirmation to user
    user_subject = "Thank you for your interest in GenAI-Campus!"
    user_html_message = render_to_string('emails/contact_sales_confirmation.html', {'school_name': school_name})
    send_mail(user_subject, '', settings.DEFAULT_FROM_EMAIL, [email], html_message=user_html_message)

    return Response({"message": "Inquiry sent successfully!"}, status=status.HTTP_200_OK)


@api_view(['GET'])
@dec_permission_classes([AllowAny])
def verify_email_view(request, token):
    try:
        user = CustomUser.objects.get(verification_token=token)
        if not user.is_verified:
            user.is_verified = True
            user.is_active = True
            user.verification_token = None # Token can be cleared after use
            user.save()
        return HttpResponse("Your email has been successfully verified! You can now log in.")
    except CustomUser.DoesNotExist:
        return HttpResponse("Invalid verification link.", status=404)


class LoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        if not user.is_active:
            raise ValidationError("User account is not active. Please verify your email first.")
        
        # Manually update last_login timestamp
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        token, created = Token.objects.get_or_create(user=user)
        
        if user.role == 'Student':
            UserLoginActivity.objects.create(user=user, activity_type='login')
            UserDailyActivity.objects.get_or_create(user=user, date=timezone.now().date(), defaults={'present': True})
            RecentActivity.objects.create(user=user, activity_type='Login', details='Logged in to the platform.')
            check_and_award_rewards(user, trigger_event='LOGIN')
            
        return Response({'token': token.key})

class StudentRecommendationViewSet(viewsets.ModelViewSet):
    queryset = StudentRecommendation.objects.all()
    serializer_class = StudentRecommendationSerializer
    permission_classes = [IsAuthenticated, IsStudent]

    def get_queryset(self):
        user = self.request.user
        return self.queryset.filter(student=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

class SchoolViewSet(viewsets.ModelViewSet):
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_fields = ['name', 'school_id_code']
    
    def get_serializer_context(self):
        return {'request': self.request, **super().get_serializer_context()}

    def get_permissions(self):
        if self.action == 'create':
            self.permission_classes = [permissions.AllowAny]
        elif self.action in ['update', 'partial_update']:
            self.permission_classes = [permissions.IsAuthenticated, IsAdminOfThisSchoolOrPlatformStaff]
        elif self.action == 'destroy':
            self.permission_classes = [permissions.IsAdminUser] 
        else:
            self.permission_classes = [permissions.IsAuthenticatedOrReadOnly]
        return super().get_permissions()

class SyllabusListView(ListAPIView):
    queryset = Syllabus.objects.all()
    serializer_class = SyllabusSerializer
    permission_classes = [AllowAny]

class MasterClassListView(ListAPIView):
    serializer_class = MasterClassSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        syllabus_id = self.request.query_params.get('syllabus_id', None)
        if syllabus_id:
            return MasterClass.objects.filter(syllabus_id=syllabus_id)
        return MasterClass.objects.none()

class SchoolClassListView(viewsets.ReadOnlyModelViewSet):
    serializer_class = SchoolClassSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_fields = ['school']

    def get_queryset(self):
        return SchoolClass.objects.all().select_related('master_class')


class CustomUserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all().select_related('student_profile', 'teacher_profile', 'parent_profile', 'school', 'administered_school')
    serializer_class = CustomUserSerializer
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_fields = ['role', 'username', 'email', 'school'] 
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_context(self):
        return {'request': self.request, **super().get_serializer_context()}

    def get_permissions(self):
        if self.action == 'me':
            self.permission_classes = [IsAuthenticated]
        elif self.action == 'update_profile':
            self.permission_classes = [IsAuthenticated]
        elif self.action == 'create': 
            self.permission_classes = [IsAdminUser] 
        elif self.action == 'list' or self.action == 'retrieve':
             self.permission_classes = [permissions.IsAuthenticatedOrReadOnly] 
        else: 
            self.permission_classes = [IsAdminUser] 
        return super().get_permissions()

    @action(detail=False, methods=['get'], url_path='me', permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user, context=self.get_serializer_context())
        return Response(serializer.data)

    @action(detail=True, methods=['patch'], url_path='profile', permission_classes=[IsAuthenticated])
    def update_profile(self, request, pk=None):
        user = self.get_object()
        if user != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only update your own profile or you lack staff permissions.")

        profile_data = request.data.dict()
        if 'assigned_classes_ids' in request.data:
            profile_data['assigned_classes_ids'] = request.data.getlist('assigned_classes_ids')
        if 'subject_expertise_ids' in request.data:
            profile_data['subject_expertise_ids'] = request.data.getlist('subject_expertise_ids')
        
        custom_user_update_data = {}
        if 'username' in profile_data and profile_data['username'] and profile_data['username'] != user.username:
            custom_user_update_data['username'] = profile_data.pop('username')
        
        if 'email' in profile_data and profile_data['email'] != user.email:
            custom_user_update_data['email'] = profile_data.pop('email', "")

        if 'password' in profile_data and profile_data['password']:
            custom_user_update_data['password'] = profile_data.pop('password')
        
        if custom_user_update_data:
            user_serializer = CustomUserSerializer(user, data=custom_user_update_data, partial=True, context=self.get_serializer_context())
            user_serializer.is_valid(raise_exception=True)
            user_serializer.save()

        profile_serializer_class = None
        profile_instance = None
        
        if 'profile_picture' in request.FILES:
            profile_data['profile_picture'] = request.FILES['profile_picture']

        if user.role == 'Student':
            profile_serializer_class = StudentProfileCompletionSerializer
            profile_instance, _ = StudentProfile.objects.get_or_create(user=user)
            if 'school_id' in profile_data and profile_data['school_id']:
                try:
                    user.school = School.objects.get(pk=profile_data['school_id'])
                    user.save(update_fields=['school'])
                except School.DoesNotExist:
                    pass
        elif user.role == 'Teacher':
            profile_serializer_class = TeacherProfileCompletionSerializer
            profile_instance, _ = TeacherProfile.objects.get_or_create(user=user)
            if 'school_id' in profile_data and profile_data['school_id']:
                try:
                    user.school = School.objects.get(pk=profile_data['school_id'])
                    user.save(update_fields=['school'])
                except School.DoesNotExist:
                    pass
        elif user.role == 'Parent':
            profile_serializer_class = ParentProfileCompletionSerializer
            profile_instance, _ = ParentProfile.objects.get_or_create(user=user)
        
        if profile_serializer_class and profile_instance:
            profile_data['profile_completed'] = True
            
            profile_serializer = profile_serializer_class(profile_instance, data=profile_data, partial=True, context=self.get_serializer_context())
            profile_serializer.is_valid(raise_exception=True)
            profile_serializer.save()

        user.refresh_from_db()
        final_user_serializer = CustomUserSerializer(user, context=self.get_serializer_context())
        return Response(final_user_serializer.data, status=status.HTTP_200_OK)


class UserSignupView(CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserSignupSerializer
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser] 
    
    def get_serializer_context(self):
        return {'request': self.request, **super().get_serializer_context()}


class ParentStudentLinkViewSet(viewsets.ModelViewSet):
    queryset = ParentStudentLink.objects.all()
    serializer_class = ParentStudentLinkSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        return {'request': self.request, **super().get_serializer_context()}

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'Admin': 
            return ParentStudentLink.objects.all()
        if user.role == 'Parent':
            return ParentStudentLink.objects.filter(parent=user)
        if user.is_school_admin and user.school: 
            students_in_school = CustomUser.objects.filter(school=user.school, role='Student')
            return ParentStudentLink.objects.filter(student__in=students_in_school)
        return ParentStudentLink.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        parent_from_data = serializer.validated_data.get('parent')
        student_from_data = serializer.validated_data.get('student')

        if user.role == 'Parent':
            if parent_from_data != user:
                 raise PermissionDenied("Parents can only link students to their own account.")
            serializer.save(parent=user)
        elif user.is_staff or user.role == 'Admin': 
            if not parent_from_data or not student_from_data:
                raise drf_serializers.ValidationError({"detail": "Parent and Student IDs must be provided by admin."})
            if user.is_school_admin and user.school and student_from_data.school != user.school:
                raise PermissionDenied("School admins can only link students within their own school.")
            serializer.save()
        else:
            raise PermissionDenied("You do not have permission to create this link.")

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated, IsParent], url_path='link-child-by-admission')
    def link_child_by_admission(self, request):
        parent_user = request.user
        student_admission_number = request.data.get('admission_number')
        student_school_id_code = request.data.get('school_id_code') 

        if not student_admission_number or not student_school_id_code:
            return Response({"error": "Student admission number and school ID code are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            student_profile = StudentProfile.objects.get(
                admission_number=student_admission_number,
                school__school_id_code=student_school_id_code 
            )
            if student_profile.parent_email_for_linking != parent_user.email:
                 return Response({"error": "Parent email on student record does not match your email. Verification failed. Ensure the student has your email listed for linking."}, status=status.HTTP_403_FORBIDDEN)

            student_user = student_profile.user
        except StudentProfile.DoesNotExist:
            return Response({"error": "Student not found with provided details. Please check the admission number and school ID code carefully."}, status=status.HTTP_404_NOT_FOUND)
        
        link, created = ParentStudentLink.objects.get_or_create(parent=parent_user, student=student_user)
        
        serialized_student_profile = StudentProfileSerializer(student_profile, context={'request': request}).data

        response_data = {
            "link_id": link.id,
            "message": "Link established successfully." if created else "Link already exists.",
            "student_details": serialized_student_profile 
        }
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(response_data, status=status_code)


class TeacherActionsViewSet(viewsets.ViewSet): 
    permission_classes = [IsAuthenticated, IsTeacher | IsAdminUser]
    @action(detail=False, methods=['get'])
    def my_classes(self, request):
        teacher_profile = getattr(request.user, 'teacher_profile', None)
        if teacher_profile:
            classes = teacher_profile.assigned_classes.all()
            return Response([{'id': c.id, 'name': c.master_class.name} for c in classes])
        return Response([])


@api_view(['POST'])
@dec_permission_classes([IsAuthenticated, IsAdminUser]) 
@parser_classes([MultiPartParser, FormParser])
def bulk_upload_users(request):
    return Response({"message": "Bulk user upload received (placeholder)."}, status=status.HTTP_200_OK)


class LogoutView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, *args, **kwargs):
        if request.user.role == 'Student':
            UserLoginActivity.objects.create(user=request.user, activity_type='logout')
            RecentActivity.objects.create(user=request.user, activity_type='Logout', details='Logged out from the platform.')
        
        if hasattr(request.user, 'auth_token'):
            request.user.auth_token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class ProgressAnalyticsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user_id = request.query_params.get('user_id', request.user.id)
        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        today = timezone.now().date()
        
        one_week_ago = today - timezone.timedelta(days=6)
        weekly_activities = UserDailyActivity.objects.filter(user=user, date__gte=one_week_ago, date__lte=today).order_by('date')
        
        activities_dict = {activity.date.strftime('%Y-%m-%d'): activity.study_duration_minutes for activity in weekly_activities}
        
        weekly_study_minutes_list = []
        for i in range(7):
            date_to_check = one_week_ago + timedelta(days=i)
            date_str = date_to_check.strftime('%Y-%m-%d')
            weekly_study_minutes_list.append({
                'date': date_str,
                'duration': activities_dict.get(date_str, 0)
            })

        today_activity = UserDailyActivity.objects.filter(user=user, date=today).first()
        today_study_minutes = today_activity.study_duration_minutes if today_activity else 0

        total_days_in_year = (today - today.replace(month=1, day=1)).days + 1
        present_days = UserDailyActivity.objects.filter(user=user, present=True, date__year=today.year).count()
        attendance = {'total_days': total_days_in_year, 'present_days': present_days}

        subject_distribution = UserSubjectStudy.objects.filter(daily_activity__user=user).values('subject__name').annotate(total_duration=Sum('duration_minutes')).order_by('-total_duration')
        
        today_subjects_studied_count = RecentActivity.objects.filter(
            user=user, 
            activity_type='Lesson', 
            timestamp__date=today
        ).values('details').distinct().count()

        latest_passed_attempt_subquery = AILessonQuizAttempt.objects.filter(
            lesson=OuterRef('lesson'),
            user=user,
            passed=True
        ).order_by('-attempted_at').values('score')[:1]

        quiz_attempts = AILessonQuizAttempt.objects.filter(user=user).values('lesson__title').annotate(
            attempts=Count('id'),
            final_score=Subquery(latest_passed_attempt_subquery, output_field=db_models.FloatField())
        ).order_by('lesson__title')

        login_activities = UserLoginActivity.objects.filter(user=user, timestamp__gte=one_week_ago).order_by('timestamp')
        
        login_timeline = {}
        for activity in login_activities:
            date_str = activity.timestamp.strftime('%Y-%m-%d')
            if date_str not in login_timeline:
                login_timeline[date_str] = {'first_login': activity.timestamp.isoformat(), 'login_count': 0}
            login_timeline[date_str]['login_count'] += 1
            login_timeline[date_str]['latest_login'] = activity.timestamp.isoformat()


        try:
            student_profile = StudentProfile.objects.get(user=user)
            if student_profile.enrolled_class:
                subjects_in_class = ContentSubject.objects.filter(master_class=student_profile.enrolled_class.master_class)
                subject_progress = []
                for subject in subjects_in_class:
                    total_lessons = Lesson.objects.filter(subject=subject).count()
                    completed_lessons = UserLessonProgress.objects.filter(
                        user=user, lesson__subject=subject, completed=True
                    ).count()
                    subject_progress.append({
                        'subject__name': subject.name,
                        'completed_lessons': completed_lessons,
                        'total_lessons': total_lessons,
                    })
            else:
                subject_progress = []
        except StudentProfile.DoesNotExist:
            subject_progress = []


        return Response({
            'today_study_minutes': today_study_minutes,
            'weekly_study_minutes': weekly_study_minutes_list,
            'attendance': attendance,
            'subject_distribution': list(subject_distribution),
            'subject_progress': subject_progress,
            'quiz_attempts': list(quiz_attempts),
            'login_timeline': login_timeline,
            'today_subjects_studied_count': today_subjects_studied_count,
        })


class RecentActivityViewSet(viewsets.ModelViewSet):
    queryset = RecentActivity.objects.all().select_related('user').prefetch_related('user__student_profile')
    serializer_class = RecentActivitySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_fields = ['user', 'activity_type']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return self.queryset
        if user.role == 'Admin' and user.school:
            return self.queryset.filter(user__school=user.school)
        if user.role == 'Teacher' and user.school:
            student_ids = CustomUser.objects.filter(
                school=user.school, 
                student_profile__enrolled_class__in=user.teacher_profile.assigned_classes.all()
            ).values_list('id', flat=True)
            return self.queryset.filter(user_id__in=student_ids)
        if user.role == 'Student':
            return self.queryset.filter(user=user)
        return self.queryset.none()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['POST'])
@dec_permission_classes([IsAuthenticated])
def record_study_ping(request):
    user = request.user
    subject_id = request.data.get('subject_id')
    duration = int(request.data.get('duration', 1))

    if user.role != 'Student':
        return Response({'error': 'Only students can record study time'}, status=status.HTTP_403_FORBIDDEN)
    
    daily_activity, _ = UserDailyActivity.objects.get_or_create(user=user, date=timezone.now().date())

    if subject_id:
        try:
            subject = ContentSubject.objects.get(pk=subject_id)
            
            subject_study, created = UserSubjectStudy.objects.get_or_create(
                daily_activity=daily_activity,
                subject=subject,
                defaults={'duration_minutes': duration}
            )
            if not created:
                subject_study.duration_minutes = F('duration_minutes') + duration
                subject_study.save(update_fields=['duration_minutes'])

            daily_activity.study_duration_minutes = F('study_duration_minutes') + duration
            daily_activity.save(update_fields=['study_duration_minutes'])
            
            daily_activity.refresh_from_db()
            subject_study.refresh_from_db()

            return Response({
                'status': 'ok',
                'total_day_minutes': daily_activity.study_duration_minutes,
                'subject_minutes': subject_study.duration_minutes
            }, status=status.HTTP_200_OK)

        except ContentSubject.DoesNotExist:
            return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)

    else:
        daily_activity.library_study_duration_minutes = F('library_study_duration_minutes') + duration
        daily_activity.save(update_fields=['library_study_duration_minutes'])
        daily_activity.refresh_from_db()
        return Response({
            'status': 'ok',
            'library_minutes': daily_activity.library_study_duration_minutes
        }, status=status.HTTP_200_OK)


class StudentTaskViewSet(viewsets.ModelViewSet):
    queryset = StudentTask.objects.all()
    serializer_class = StudentTaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsStudent]

    def get_queryset(self):
        return self.queryset.filter(student=self.request.user)

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

class UserDailyActivityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserDailyActivity.objects.all()
    serializer_class = UserDailyActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend]
    filterset_fields = ['user', 'date']

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.role == 'Admin':
            return self.queryset
        return self.queryset.filter(user=user)

class TeacherTaskViewSet(viewsets.ModelViewSet):
    queryset = TeacherTask.objects.all()
    serializer_class = TeacherTaskSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacher]

    def get_queryset(self):
        return self.queryset.filter(teacher=self.request.user)

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

class TeacherClassPerformanceView(APIView):
    permission_classes = [IsAuthenticated, IsTeacher]

    def get(self, request, *args, **kwargs):
        teacher = request.user
        
        try:
            teacher_profile = teacher.teacher_profile
            assigned_classes_ids = teacher_profile.assigned_classes.values_list('id', flat=True)
            subject_expertise_ids = teacher_profile.subject_expertise.values_list('id', flat=True)
        except TeacherProfile.DoesNotExist:
            return Response({"error": "Teacher profile not found."}, status=status.HTTP_404_NOT_FOUND)

        # Get all students in the teacher's assigned classes
        students_in_classes = StudentProfile.objects.filter(enrolled_class_id__in=assigned_classes_ids).values_list('user_id', flat=True)
        
        # Filter quiz attempts for those students and for the subjects the teacher is an expert in
        quiz_attempts = UserQuizAttempt.objects.filter(
            user_id__in=students_in_classes,
            quiz__lesson__subject_id__in=subject_expertise_ids
        )
        
        ai_quiz_attempts = AILessonQuizAttempt.objects.filter(
            user_id__in=students_in_classes,
            lesson__subject_id__in=subject_expertise_ids
        )
        
        total_score = 0
        total_attempts = 0

        for attempt in quiz_attempts:
            total_score += attempt.score
            total_attempts += 1
            
        for attempt in ai_quiz_attempts:
            total_score += attempt.score
            total_attempts += 1

        average_performance = total_score / total_attempts if total_attempts > 0 else 0
        
        return Response({'average_performance': average_performance})

    