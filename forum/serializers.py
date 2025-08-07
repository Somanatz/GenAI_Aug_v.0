# forum/serializers.py

from rest_framework import serializers
from .models import ForumThread, ForumPost, PostAttachment, PostLike

class PostAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.FileField(source='file', read_only=True)
    file_name = serializers.SerializerMethodField()
    file_type = serializers.SerializerMethodField()
    
    class Meta:
        model = PostAttachment
        fields = ['id', 'file_url', 'file_name', 'file_type']

    def get_file_name(self, obj):
        return obj.file.name.split('/')[-1]

    def get_file_type(self, obj):
        name = obj.file.name.lower()
        if name.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
            return 'image'
        if name.endswith('.pdf'):
            return 'pdf'
        return 'file'

class RecursivePostSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar_url = serializers.SerializerMethodField()
    attachments = PostAttachmentSerializer(many=True, read_only=True)
    replies = serializers.SerializerMethodField()
    
    like_count = serializers.IntegerField(read_only=True, default=0)
    is_liked_by_user = serializers.BooleanField(read_only=True, default=False)
    
    class Meta:
        model = ForumPost
        fields = [
            'id', 'author_username', 'author_avatar_url', 'content', 'parent_post',
            'created_at', 'replies', 'attachments', 'like_count', 'is_liked_by_user'
        ]
    
    def get_author_avatar_url(self, obj):
        request = self.context.get('request')
        if not request: return None
        author = obj.author
        profile = None
        role = getattr(author, 'role', None)
        if role == 'Student': profile = getattr(author, 'student_profile', None)
        elif role == 'Teacher': profile = getattr(author, 'teacher_profile', None)
        elif role == 'Parent': profile = getattr(author, 'parent_profile', None)
        if profile and hasattr(profile, 'profile_picture') and profile.profile_picture:
            return request.build_absolute_uri(profile.profile_picture.url)
        return None
    
    def get_replies(self, obj):
        if hasattr(obj, 'replies_cache'):
            return RecursivePostSerializer(obj.replies_cache, many=True, context=self.context).data
        return []


class ForumPostSerializer(RecursivePostSerializer):
    class Meta(RecursivePostSerializer.Meta):
        fields = RecursivePostSerializer.Meta.fields + ['thread']
        read_only_fields = ['author', 'created_at', 'replies', 'attachments', 'like_count', 'is_liked_by_user']


class ForumThreadSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_avatar_url = serializers.SerializerMethodField()
    posts = serializers.SerializerMethodField()
    # Direct relation from thread to its own attachments (for initial post)
    attachments = PostAttachmentSerializer(many=True, read_only=True)
    
    reply_count = serializers.IntegerField(read_only=True, required=False)
    last_activity_at = serializers.DateTimeField(read_only=True, required=False)
    last_activity_by = serializers.CharField(read_only=True, required=False)

    class Meta:
        model = ForumThread
        fields = [
            'id', 'school', 'school_class', 'author', 'author_username', 'author_avatar_url',
            'category', 'title', 'created_at', 'updated_at', 'view_count', 'posts', 
            'attachments', 'reply_count', 'last_activity_at', 'last_activity_by'
        ]
        read_only_fields = ['author', 'created_at', 'updated_at', 'view_count', 'posts', 'attachments', 'school', 'author_username', 'author_avatar_url']

    def get_author_avatar_url(self, obj):
        request = self.context.get('request')
        if not request: return None
        author = obj.author
        profile = None
        role = getattr(author, 'role', None)
        if role == 'Student': profile = getattr(author, 'student_profile', None)
        elif role == 'Teacher': profile = getattr(author, 'teacher_profile', None)
        elif role == 'Parent': profile = getattr(author, 'parent_profile', None)
        if profile and hasattr(profile, 'profile_picture') and profile.profile_picture:
            return request.build_absolute_uri(profile.profile_picture.url)
        return None

    def get_posts(self, obj):
        if hasattr(obj, 'prefetched_posts'):
            return ForumPostSerializer(obj.prefetched_posts, many=True, context=self.context).data
        return []
