from rest_framework import serializers
from .models import ForumCategory,ForumThread,ForumPost

class ForumCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model=ForumCategory
        fields=['id','name','description','slug']

class ForumThreadSerializer(serializers.ModelSerializer):
    author_username=serializers.CharField(source='author.username',read_only=True)
    category_name=serializers.CharField(source='category.name',read_only=True)
    reply_count=serializers.IntegerField(read_only=True)
    last_activity_by=serializers.CharField(read_only=True)
    last_activity_at=serializers.DateTimeField(read_only=True)
    class Meta:
        model=ForumThread
        fields=['id','category','category_name','author','author_username','title','created_at','updated_at','view_count','reply_count','last_activity_by','last_activity_at']
        read_only_fields=['author','reply_count','last_activity_by','last_activity_at']

class ForumPostSerializer(serializers.ModelSerializer):
    author_username=serializers.CharField(source='author.username',read_only=True)
    class Meta:
        model=ForumPost
        fields=['id','thread','author','author_username','content','created_at','parent_post']
        read_only_fields=['author']
