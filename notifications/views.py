
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAdminUser, AllowAny, IsAuthenticated
from .models import Event, StudentTask
from .serializers import EventSerializer, StudentTaskSerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from accounts.models import CustomUser 
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all().select_related('school', 'target_class__master_class', 'created_by').order_by('date')
    serializer_class = EventSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['type', 'date', 'school', 'target_class']
    ordering_fields = ['date', 'type']

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return self.queryset.none()
        
        if user.role == 'Student':
            if not user.student_profile or not user.school or not user.student_profile.enrolled_class:
                return self.queryset.none() # Student not set up properly
            
            # Show events for their school that are either for their specific class OR for the whole school (target_class is null)
            return self.queryset.filter(
                Q(school=user.school) & 
                (Q(target_class=user.student_profile.enrolled_class) | Q(target_class__isnull=True))
            )
        
        if user.role == 'Teacher':
             if not user.school:
                 return self.queryset.none()
             # Teachers see events for their school, and any classes they are assigned to
             assigned_class_ids = user.teacher_profile.assigned_classes.values_list('id', flat=True)
             return self.queryset.filter(
                 Q(school=user.school) &
                 (Q(target_class_id__in=assigned_class_ids) | Q(target_class__isnull=True))
             )

        # Admins and other roles see all events for their school if applicable, or all if platform admin
        if user.is_school_admin and user.school:
            return self.queryset.filter(school=user.school)

        if user.is_staff: # Platform admin
            return self.queryset.all()
            
        return self.queryset.none()


    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Only Platform Admins or School Admins (for their school's events) can CUD
            self.permission_classes = [IsAuthenticated, IsAdminUser] 
        else:
            # Authenticated users can view events relevant to them
            self.permission_classes = [IsAuthenticated] 
        return super().get_permissions()

    def perform_create(self, serializer):
        user = self.request.user
        school_for_event = serializer.validated_data.get('school')
        
        if not user.is_staff and not user.is_school_admin: 
             raise PermissionDenied("You do not have permission to create events.")

        if user.is_school_admin:
            if not school_for_event or school_for_event != user.school:
                raise PermissionDenied("School admins can only create events for their own school.")
        
        serializer.save(created_by=user)

    def perform_update(self, serializer):
        user = self.request.user
        event_school = serializer.instance.school

        if not user.is_staff and not user.is_school_admin:
             raise PermissionDenied("You do not have permission to update this event.")

        if user.is_school_admin:
            if event_school != user.school:
                raise PermissionDenied("School admins can only update events for their own school.")
            new_school = serializer.validated_data.get('school', event_school)
            if new_school != user.school:
                 raise PermissionDenied("School admins cannot change the school of an event to a different school.")
                 
        serializer.save(created_by=serializer.instance.created_by)

    def perform_destroy(self, instance):
        user = self.request.user
        if not user.is_staff and not user.is_school_admin:
            raise PermissionDenied("You do not have permission to delete this event.")
        if user.is_school_admin and instance.school != user.school:
            raise PermissionDenied("School admins can only delete events for their own school.")
        instance.delete()


class StudentTaskViewSet(viewsets.ModelViewSet):
    """
    API endpoint for students to manage their personal calendar tasks.
    """
    serializer_class = StudentTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        This view should only return tasks for the currently authenticated user.
        """
        return StudentTask.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """
        When a new task is created, it's associated with the current user.
        """
        if self.request.user.role != 'Student':
            raise PermissionDenied("Only students can create personal tasks.")
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if self.get_object().user != self.request.user:
            raise PermissionDenied("You can only edit your own tasks.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.user != self.request.user:
            raise PermissionDenied("You can only delete your own tasks.")
        instance.delete()
