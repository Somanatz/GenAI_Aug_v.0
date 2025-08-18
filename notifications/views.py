
from rest_framework import viewsets, status, permissions
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from .models import Event, Message
from .serializers import EventSerializer, MessageSerializer, MessageUserSerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter
from accounts.models import CustomUser, StudentProfile, TeacherProfile, ParentStudentLink
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Q, Max, OuterRef, Subquery, Count
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from accounts.serializers import CustomUserSerializer


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
                return self.queryset.none()
            return self.queryset.filter(
                Q(school=user.school) & 
                (Q(target_class=user.student_profile.enrolled_class) | Q(target_class__isnull=True))
            )
        
        if user.role == 'Teacher':
             if not user.school:
                 return self.queryset.none()
             assigned_class_ids = user.teacher_profile.assigned_classes.values_list('id', flat=True)
             return self.queryset.filter(
                 Q(school=user.school) &
                 (Q(target_class_id__in=assigned_class_ids) | Q(target_class__isnull=True))
             )

        if user.is_school_admin and user.school:
            return self.queryset.filter(school=user.school)

        if user.is_staff:
            return self.queryset.all()
            
        return self.queryset.none()


    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            self.permission_classes = [IsAuthenticated, IsAdminUser] 
        else:
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


class MessageViewSet(viewsets.ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        
        # This part handles fetching messages for a specific conversation
        other_user_id = self.request.query_params.get('user_id')
        if other_user_id:
            # Mark messages as read
            Message.objects.filter(sender_id=other_user_id, recipient=user, read_at__isnull=True).update(read_at=timezone.now())

            return Message.objects.filter(
                (Q(sender=user) & Q(recipient_id=other_user_id) & Q(sender_deleted=False)) |
                (Q(sender_id=other_user_id) & Q(recipient=user) & Q(recipient_deleted=False))
            ).select_related('sender__student_profile', 'sender__teacher_profile', 'sender__parent_profile').order_by('sent_at')

        # This part is for the initial list, but the new conversations endpoint is better.
        # This can be left as-is or removed if not used by the client anymore.
        return Message.objects.filter(
            Q(sender=user, sender_deleted=False) | Q(recipient=user, recipient_deleted=False)
        ).select_related('sender', 'recipient').distinct()
        
    @action(detail=False, methods=['get'], url_path='conversations')
    def get_conversations(self, request):
        user = self.request.user
        
        # Get all messages involving the user
        messages_involved = Message.objects.filter(
            Q(sender=user) | Q(recipient=user)
        ).select_related('sender', 'recipient')
        
        # Identify all unique users the current user has talked to
        other_user_ids = set()
        for msg in messages_involved:
            if msg.sender_id != user.id:
                other_user_ids.add(msg.sender_id)
            if msg.recipient_id != user.id:
                other_user_ids.add(msg.recipient_id)

        # Build the conversation list
        conversations = []
        for user_id in other_user_ids:
            try:
                other_user = CustomUser.objects.select_related('student_profile', 'teacher_profile', 'parent_profile').get(id=user_id)
                
                # Get the last message for this conversation
                last_message = Message.objects.filter(
                    (Q(sender=user, recipient=other_user) | Q(sender=other_user, recipient=user))
                ).latest('sent_at')
                
                # Get the count of unread messages from this other user
                unread_count = Message.objects.filter(sender=other_user, recipient=user, read_at__isnull=True).count()
                
                conversations.append({
                    'other_user': MessageUserSerializer(other_user, context={'request': request}).data,
                    'last_message': self.get_serializer(last_message).data,
                    'unread_count': unread_count
                })
            except (CustomUser.DoesNotExist, Message.DoesNotExist):
                continue
                
        # Sort conversations by the date of the last message
        conversations.sort(key=lambda x: x['last_message']['sent_at'], reverse=True)
        
        return Response(conversations)


    def perform_create(self, serializer):
        sender = self.request.user
        recipient = serializer.validated_data.get('recipient')

        if sender == recipient:
            raise ValidationError("You cannot send a message to yourself.")

        # Permission check logic
        if not self.can_send_message(sender, recipient):
            raise PermissionDenied("You do not have permission to send a message to this user.")

        serializer.save(sender=sender)
    
    @action(detail=False, methods=['get'], url_path='contacts')
    def get_contacts(self, request):
        user = request.user
        contacts = self.get_valid_contacts(user)
        serializer = CustomUserSerializer(contacts, many=True, context={'request': request})
        return Response(serializer.data)


    def can_send_message(self, sender, recipient):
        # Admins can message anyone in their school
        if sender.is_school_admin and recipient.school == sender.school:
            return True

        # Students can message teachers of their class and fellow classmates
        if sender.role == 'Student':
            sender_class = sender.student_profile.enrolled_class
            if not sender_class: return False

            # Is recipient a teacher of my class?
            if recipient.role == 'Teacher' and sender_class in recipient.teacher_profile.assigned_classes.all():
                return True
            # Is recipient a student in my class?
            if recipient.role == 'Student' and recipient.student_profile.enrolled_class == sender_class:
                return True
            # Is recipient a linked parent?
            if recipient.role == 'Parent' and ParentStudentLink.objects.filter(parent=recipient, student=sender).exists():
                return True

        # Teachers can message their students, their students' parents, and their school admin
        if sender.role == 'Teacher':
            assigned_classes = sender.teacher_profile.assigned_classes.all()
            # Is recipient a student in one of my classes?
            if recipient.role == 'Student' and recipient.student_profile.enrolled_class in assigned_classes:
                return True
            # Is recipient a parent of a student in one of my classes?
            if recipient.role == 'Parent':
                student_ids_in_classes = StudentProfile.objects.filter(enrolled_class__in=assigned_classes).values_list('user_id', flat=True)
                if ParentStudentLink.objects.filter(parent=recipient, student_id__in=student_ids_in_classes).exists():
                    return True
            # Is recipient the admin of my school?
            if recipient.role == 'Admin' and recipient.school == sender.school:
                return True

        # Parents can message their children's teachers and their own children
        if sender.role == 'Parent':
            linked_student_links = ParentStudentLink.objects.filter(parent=sender)
            linked_student_ids = linked_student_links.values_list('student_id', flat=True)

            # Is recipient one of my children?
            if recipient.id in linked_student_ids:
                return True
            
            # Is recipient a teacher of one of my children?
            if recipient.role == 'Teacher':
                student_classes = StudentProfile.objects.filter(user_id__in=linked_student_ids).values_list('enrolled_class_id', flat=True)
                if recipient.teacher_profile.assigned_classes.filter(id__in=student_classes).exists():
                    return True

        return False

    def get_valid_contacts(self, user):
        """Returns a queryset of all users the current user is allowed to message."""
        if user.is_staff:
            return CustomUser.objects.exclude(id=user.id)
        if user.is_school_admin:
            return CustomUser.objects.filter(school=user.school).exclude(id=user.id)
        
        contact_ids = set()
        if user.role == 'Student':
            profile = getattr(user, 'student_profile', None)
            if profile and profile.enrolled_class:
                classmates = StudentProfile.objects.filter(enrolled_class=profile.enrolled_class).exclude(user=user).values_list('user_id', flat=True)
                contact_ids.update(classmates)
                teachers = TeacherProfile.objects.filter(assigned_classes=profile.enrolled_class).values_list('user_id', flat=True)
                contact_ids.update(teachers)
                parents = ParentStudentLink.objects.filter(student=user).values_list('parent_id', flat=True)
                contact_ids.update(parents)

        elif user.role == 'Teacher':
            profile = getattr(user, 'teacher_profile', None)
            if profile:
                assigned_classes = profile.assigned_classes.all()
                students = StudentProfile.objects.filter(enrolled_class__in=assigned_classes).values_list('user_id', flat=True)
                contact_ids.update(students)
                
                parents = ParentStudentLink.objects.filter(student_id__in=students).values_list('parent_id', flat=True)
                contact_ids.update(parents)
                
                if user.school:
                    admins = CustomUser.objects.filter(school=user.school, role='Admin').values_list('id', flat=True)
                    contact_ids.update(admins)

        elif user.role == 'Parent':
            links = ParentStudentLink.objects.filter(parent=user)
            student_ids = links.values_list('student_id', flat=True)
            contact_ids.update(student_ids)
            
            student_profiles = StudentProfile.objects.filter(user_id__in=student_ids)
            class_ids = student_profiles.values_list('enrolled_class_id', flat=True)
            teachers = TeacherProfile.objects.filter(assigned_classes__id__in=class_ids).values_list('user_id', flat=True)
            contact_ids.update(teachers)
        
        return CustomUser.objects.filter(id__in=contact_ids).select_related('student_profile', 'teacher_profile', 'parent_profile').distinct()
