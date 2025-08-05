
from rest_framework import serializers # type: ignore
from .models import (
    CustomUser, ParentStudentLink, School, StudentProfile, TeacherProfile, 
    ParentProfile, RecentActivity, Syllabus, SchoolClass, StudentRecommendation
)
from content.models import Class as MasterClass, Subject as ContentSubject # Avoid naming collision
from django.contrib.auth.password_validation import validate_password # type: ignore
from django.core.exceptions import ValidationError as DjangoValidationError # type: ignore
from django.db import transaction # type: ignore

from django.core.mail import send_mail # type: ignore
from django.template.loader import render_to_string # type: ignore
from django.conf import settings # type: ignore
from django.urls import reverse # type: ignore

def send_verification_email(user, request):
    token = user.verification_token
    # Note: You need to configure your frontend URL here
    verification_link = request.build_absolute_uri(reverse('verify_email', kwargs={'token': token}))
    subject = 'Verify your GenAI-Campus Account'
    message = f'Hi {user.username},\n\nPlease click the link to verify your account:\n{verification_link}'
    html_message = render_to_string('emails/account_verification.html', {
        'username': user.username,
        'verification_link': verification_link,
    })
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], html_message=html_message)

class StudentRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentRecommendation
        fields = ['id', 'student', 'recommendation_data', 'created_at']
        read_only_fields = ['student', 'created_at'] # Student is set from request context

class SchoolClassSerializer(serializers.ModelSerializer):
    """Serializer for the SchoolClass model."""
    name = serializers.CharField(source='master_class.name', read_only=True)
    description = serializers.CharField(source='master_class.description', read_only=True)

    class Meta:
        model = SchoolClass
        fields = ['id', 'school', 'master_class', 'name', 'description']

class SchoolSerializer(serializers.ModelSerializer):
    admin_username = serializers.CharField(write_only=True, required=True)
    admin_email = serializers.EmailField(write_only=True, required=True)
    admin_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    syllabus_id = serializers.PrimaryKeyRelatedField(
        queryset=Syllabus.objects.all(), source='syllabus', write_only=True
    )
    selected_class_ids = serializers.ListField(
        child=serializers.IntegerField(), write_only=True, required=True
    )

    class Meta:
        model = School
        fields = [
            'id', 'name', 'school_id_code', 'license_number', 'official_email', 
            'phone_number', 'address', 'principal_full_name', 'principal_contact_number', 
            'principal_email', 'admin_user', 
            'admin_username', 'admin_email', 'admin_password',
            'syllabus_id', 'selected_class_ids', 'syllabus'
        ]
        read_only_fields = ['admin_user', 'syllabus'] 
        extra_kwargs = {
            'school_id_code': {'validators': []}, 
            'official_email': {'validators': []},
        }

    def validate_admin_password(self, value):
        try:
            validate_password(value) 
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        admin_username = validated_data.pop('admin_username')
        admin_email = validated_data.pop('admin_email')
        admin_password = validated_data.pop('admin_password')
        selected_class_ids = validated_data.pop('selected_class_ids')

        if CustomUser.objects.filter(username=admin_username).exists():
            raise serializers.ValidationError({"admin_username": "An admin user with this username already exists."})
        if CustomUser.objects.filter(email=admin_email).exists():
            raise serializers.ValidationError({"admin_email": "An admin user with this email already exists."})
        
        try:
            admin_user = CustomUser.objects.create_user(
                username=admin_username,
                email=admin_email,
                password=admin_password,
                role='Admin',
                is_school_admin=True,
                is_staff=False, 
                is_active=False # Deactivate until email is verified
            )
        except Exception as e: 
            raise serializers.ValidationError({"admin_user_creation": str(e)})

        # Create the school instance first
        school = School.objects.create(admin_user=admin_user, **validated_data)
        
        # Link the school to the selected master classes
        for class_id in selected_class_ids:
            try:
                master_class = MasterClass.objects.get(id=class_id)
                SchoolClass.objects.create(school=school, master_class=master_class)
            except MasterClass.DoesNotExist:
                # Optionally handle or log this error
                continue
        
        admin_user.school = school 
        admin_user.save()
        
        # Send verification email
        send_verification_email(admin_user, self.context['request'])
        
        return school

class StudentProfileSerializer(serializers.ModelSerializer):
    enrolled_class_name = serializers.CharField(source='enrolled_class.master_class.name', read_only=True, allow_null=True)
    school_name = serializers.CharField(source='school.name', read_only=True, allow_null=True)
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = '__all__' 
        read_only_fields = ['user', 'profile_picture_url', 'school_name', 'enrolled_class_name']
        extra_kwargs = {
            'school': {'required': False, 'allow_null': True},
            'enrolled_class': {'required': False, 'allow_null': True},
            'profile_picture': {'write_only': True, 'required': False, 'allow_null':True},
        }
    
    def get_profile_picture_url(self, obj):
        request = self.context.get('request')
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url 
        return None


class TeacherProfileSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True, allow_null=True)
    assigned_classes_details = serializers.SerializerMethodField()
    subject_expertise_details = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = TeacherProfile
        fields = '__all__'
        read_only_fields = ['user', 'profile_picture_url', 'school_name', 'assigned_classes_details', 'subject_expertise_details']
        extra_kwargs = {
            'school': {'required': False, 'allow_null': True},
            'assigned_classes': {'required': False},
            'subject_expertise': {'required': False},
            'profile_picture': {'write_only': True, 'required': False, 'allow_null':True},
        }

    def get_assigned_classes_details(self, obj):
        return [{'id': sc.id, 'name': sc.master_class.name} for sc in obj.assigned_classes.all()]

    def get_subject_expertise_details(self, obj):
        return [{'id': sub.id, 'name': sub.name} for sub in obj.subject_expertise.all()]

    def get_profile_picture_url(self, obj):
        request = self.context.get('request')
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


class ParentProfileSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()
    class Meta:
        model = ParentProfile
        fields = '__all__'
        read_only_fields = ['user', 'profile_picture_url']
        extra_kwargs = {
            'profile_picture': {'write_only': True, 'required': False, 'allow_null':True},
        }

    def get_profile_picture_url(self, obj):
        request = self.context.get('request')
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None

class CustomUserSerializer(serializers.ModelSerializer):
    student_profile = StudentProfileSerializer(read_only=True, context={'request': serializers.CurrentUserDefault()})
    teacher_profile = TeacherProfileSerializer(read_only=True, context={'request': serializers.CurrentUserDefault()})
    parent_profile = ParentProfileSerializer(read_only=True, context={'request': serializers.CurrentUserDefault()})
    school_name = serializers.CharField(source='school.name', read_only=True, allow_null=True)
    school_id = serializers.PrimaryKeyRelatedField(queryset=School.objects.all(), source='school', write_only=True, allow_null=True, required=False)
    profile_completed = serializers.SerializerMethodField()
    administered_school = SchoolSerializer(read_only=True, allow_null=True) # For school admin user details


    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'role', 'password', 'is_school_admin', 'is_verified', 'is_active',
            'school_id', 'school_name', 'administered_school',
            'student_profile', 'teacher_profile', 'parent_profile',
            'profile_completed',
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
        }

    def get_profile_completed(self, obj):
        if obj.role == 'Student' and hasattr(obj, 'student_profile') and obj.student_profile:
            return obj.student_profile.profile_completed
        elif obj.role == 'Teacher' and hasattr(obj, 'teacher_profile') and obj.teacher_profile:
            return obj.teacher_profile.profile_completed
        elif obj.role == 'Parent' and hasattr(obj, 'parent_profile') and obj.parent_profile:
            return obj.parent_profile.profile_completed
        return False 

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
        
        school = validated_data.pop('school', None) 
        if school:
            instance.school = school
        
        return super().update(instance, validated_data)


class UserSignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'role', 'password']
        extra_kwargs = {
            'password': {'write_only': True, 'required': True},
            'role': {'required': True}
        }

    def validate_role(self, value):
        valid_roles = [choice[0] for choice in CustomUser.ROLE_CHOICES if choice[0] != 'Admin'] 
        if value not in valid_roles:
            raise serializers.ValidationError(f"Invalid role. Choose from {', '.join(valid_roles)}.")
        return value
    
    @transaction.atomic
    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            role=validated_data['role'],
            is_active=False # Deactivate until email is verified 
        )
        if user.role == 'Student':
            StudentProfile.objects.create(user=user, profile_completed=False)
        elif user.role == 'Teacher':
            TeacherProfile.objects.create(user=user, profile_completed=False)
        elif user.role == 'Parent':
            ParentProfile.objects.create(user=user, profile_completed=False)

        # Send verification email
        send_verification_email(user, self.context['request'])
        return user


class ParentStudentLinkSerializer(serializers.ModelSerializer):
    parent_username = serializers.CharField(source='parent.username', read_only=True)
    student_username = serializers.CharField(source='student.username', read_only=True)
    student_details = StudentProfileSerializer(source='student.student_profile', read_only=True, context={'request': serializers.CurrentUserDefault()})

    class Meta:
        model = ParentStudentLink
        fields = ['id', 'parent', 'student', 'parent_username', 'student_username', 'student_details']
        extra_kwargs = {
            'parent': {'queryset': CustomUser.objects.filter(role='Parent')},
            'student': {'queryset': CustomUser.objects.filter(role='Student')},
        }

    def validate(self, data):
        parent = data.get('parent')
        student = data.get('student')
        if parent and parent.role != 'Parent':
            raise serializers.ValidationError({"parent": "Selected user is not a Parent."})
        if student and student.role != 'Student':
            raise serializers.ValidationError({"student": "Selected user is not a Student."})
        return data

# Serializers for Profile Completion
class StudentProfileCompletionSerializer(serializers.ModelSerializer):
    school_id = serializers.PrimaryKeyRelatedField(queryset=School.objects.all(), source='school', write_only=True, allow_null=True, required=False)
    enrolled_class_id = serializers.PrimaryKeyRelatedField(queryset=SchoolClass.objects.all(), source='enrolled_class', write_only=True, allow_null=True, required=False)
    profile_picture = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = StudentProfile
        fields = [
            'full_name', 'school', 'school_id', 'enrolled_class', 'enrolled_class_id', 
            'preferred_language', 'father_name', 'mother_name', 'place_of_birth', 
            'date_of_birth', 'blood_group', 'needs_assistant_teacher', 'admission_number', 
            'parent_email_for_linking', 'parent_mobile_for_linking', 'parent_occupation', 
            'hobbies', 'favorite_sports', 'interested_in_gardening_farming', 'nickname', 
            'profile_picture', 'profile_completed'
        ]
        read_only_fields = ['user', 'school', 'enrolled_class'] 

class TeacherProfileCompletionSerializer(serializers.ModelSerializer):
    school_id = serializers.PrimaryKeyRelatedField(queryset=School.objects.all(), source='school', write_only=True, allow_null=True, required=False)
    assigned_classes_ids = serializers.PrimaryKeyRelatedField(
        queryset=SchoolClass.objects.all(), source='assigned_classes', many=True, required=False, write_only=True
    )
    subject_expertise_ids = serializers.PrimaryKeyRelatedField(
        queryset=ContentSubject.objects.all(), source='subject_expertise', many=True, required=False, write_only=True
    )
    profile_picture = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = TeacherProfile
        fields = [
            'full_name', 'school', 'school_id', 'assigned_classes', 'assigned_classes_ids', 
            'subject_expertise', 'subject_expertise_ids', 'interested_in_tuition', 
            'mobile_number', 'address', 'profile_picture', 'profile_completed'
        ]
        read_only_fields = ['user', 'school', 'assigned_classes', 'subject_expertise']

class ParentProfileCompletionSerializer(serializers.ModelSerializer):
    profile_picture = serializers.ImageField(required=False, allow_null=True)
    class Meta:
        model = ParentProfile
        fields = ['full_name', 'mobile_number', 'address', 'profile_picture', 'profile_completed']
        read_only_fields = ['user']


class RecentActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = RecentActivity
        fields = ['id', 'activity_type', 'details', 'timestamp']

class SyllabusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Syllabus
        fields = ['id', 'name', 'description']

from .models import StudentTask # Add StudentTask to the import statement at the top

class StudentTaskSerializer(serializers.ModelSerializer):
    """Serializer for the StudentTask model."""
    class Meta:
        model = StudentTask
        fields = ['id', 'student', 'title', 'description', 'due_date', 'completed', 'created_at']
        read_only_fields = ['student'] # The student is set automatically from the request user