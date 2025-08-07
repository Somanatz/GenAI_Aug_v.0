
from django.db import models
from django.conf import settings
from accounts.models import School, SchoolClass

class ForumThread(models.Model):
    """
    Represents a discussion thread within a specific school context.
    The category determines visibility and permissions.
    """
    class ThreadCategory(models.TextChoices):
        GENERAL = 'GENERAL', 'General Discussion'
        CLASS = 'CLASS', 'Class Discussion'
        MANAGEMENT = 'MANAGEMENT', 'School Management'

    # The default=1 here solves the initial IntegrityError
    school = models.ForeignKey(
        School, 
        on_delete=models.CASCADE, 
        related_name='forum_threads', 
        default=1 
    )
    
    school_class = models.ForeignKey(
        SchoolClass, 
        on_delete=models.CASCADE, 
        related_name='forum_threads', 
        null=True, 
        blank=True
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        related_name='forum_threads', 
        on_delete=models.CASCADE
    )
    category = models.CharField(
        max_length=20, 
        choices=ThreadCategory.choices, 
        default=ThreadCategory.GENERAL
    )
    
    title = models.CharField(max_length=255)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    view_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.title

class ForumPost(models.Model):
    """
    Represents a reply within a thread. Can be a top-level reply or a nested reply.
    """
    thread = models.ForeignKey(ForumThread, related_name='posts', on_delete=models.CASCADE)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='forum_posts', on_delete=models.CASCADE)
    content = models.TextField(default='')
    created_at = models.DateTimeField(auto_now_add=True)
    
    parent_post = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Reply by {self.author.username} in '{self.thread.title}'"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            self.thread.updated_at = self.created_at
            self.thread.save(update_fields=['updated_at'])

class PostAttachment(models.Model):
    """
    Stores file or image attachments for a forum post or the initial thread content.
    """
    post = models.ForeignKey(ForumPost, on_delete=models.CASCADE, related_name='attachments', null=True, blank=True)
    
    thread = models.ForeignKey(ForumThread, on_delete=models.CASCADE, related_name='attachments', null=True, blank=True)
    uploader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file = models.FileField(upload_to='forum_attachments/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.file.name

class PostLike(models.Model):
    """
    Handles Likes and Upvotes for a ForumPost.
    """
    class LikeType(models.TextChoices):
        LIKE = 'LIKE', 'Like'
        UPVOTE = 'UPVOTE', 'Upvote'

    post = models.ForeignKey(ForumPost, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='post_likes')
    like_type = models.CharField(max_length=10, choices=LikeType.choices, default=LikeType.LIKE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user', 'like_type')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} {self.like_type}d Post {self.post.id}"
