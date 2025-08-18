
from rest_framework import serializers
from .models import Event, Message
from accounts.models import School, SchoolClass, CustomUser


class EventSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    school_id = serializers.PrimaryKeyRelatedField(source='school', queryset=School.objects.all(), allow_null=True, required=False)
    school_name = serializers.CharField(source='school.name', read_only=True, allow_null=True)
    target_class_id = serializers.PrimaryKeyRelatedField(source='target_class', queryset=SchoolClass.objects.all(), allow_null=True, required=False)
    target_class_name = serializers.CharField(source='target_class.master_class.name', read_only=True, allow_null=True)


    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'date', 'end_date', 'type', 
            'created_by', 'created_by_username',
            'school', 'school_id', 'school_name', 
            'target_class', 'target_class_id', 'target_class_name'
        ]
        read_only_fields = ['created_by', 'school', 'target_class'] 

    def validate(self, data):
        if data.get('end_date') and data.get('date') > data['end_date']:
            raise serializers.ValidationError("End date cannot be before start date.")
        
        school = data.get('school')
        target_class = data.get('target_class')
        if school and target_class and target_class.school != school:
            raise serializers.ValidationError({"target_class": "The target class must belong to the selected school."})

        return data


class MessageUserSerializer(serializers.ModelSerializer):
    """
    A minimal serializer for displaying user info in message contexts.
    """
    full_name = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'full_name', 'avatar_url']

    def get_full_name(self, obj):
        # A helper to reliably get the full name from any profile
        if obj.role == 'Student' and hasattr(obj, 'student_profile') and obj.student_profile.full_name:
            return obj.student_profile.full_name
        if obj.role == 'Teacher' and hasattr(obj, 'teacher_profile') and obj.teacher_profile.full_name:
            return obj.teacher_profile.full_name
        if obj.role == 'Parent' and hasattr(obj, 'parent_profile') and obj.parent_profile.full_name:
            return obj.parent_profile.full_name
        return obj.username

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if not request: return None
        profile = None
        if obj.role == 'Student': profile = getattr(obj, 'student_profile', None)
        elif obj.role == 'Teacher': profile = getattr(obj, 'teacher_profile', None)
        elif obj.role == 'Parent': profile = getattr(obj, 'parent_profile', None)
        
        if profile and hasattr(profile, 'profile_picture') and profile.profile_picture:
            return request.build_absolute_uri(profile.profile_picture.url)
        return None


class MessageSerializer(serializers.ModelSerializer):
    sender = MessageUserSerializer(read_only=True)
    recipient = serializers.PrimaryKeyRelatedField(queryset=CustomUser.objects.all(), write_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'recipient', 'subject', 'body', 'sent_at', 'read_at'
        ]
        read_only_fields = ['sender', 'sent_at', 'read_at']
