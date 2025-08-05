from django.db import models # type: ignore
from django.conf import settings # type: ignore
from django.utils.text import slugify # type: ignore
from accounts.models import School

class ForumCategory(models.Model):
    school=models.ForeignKey(School,related_name='forum_categories',on_delete=models.CASCADE)
    name=models.CharField(max_length=100)
    description=models.TextField(blank=True)
    slug=models.SlugField(max_length=120,blank=True)
    class Meta:
        unique_together=[['school','slug']]
        ordering=['name']
    def save(self,*args,**kwargs):
        if not self.slug:
            base=slugify(self.name)
            slug=base
            cnt=1
            while ForumCategory.objects.filter(school=self.school,slug=slug).exists():
                slug=f"{base}-{cnt}"
                cnt+=1
            self.slug=slug
        super().save(*args,**kwargs)
    def __str__(self):
        return f"{self.school.name}/{self.name}"

class ForumThread(models.Model):
    category=models.ForeignKey(ForumCategory,related_name='threads',on_delete=models.CASCADE)
    author=models.ForeignKey(settings.AUTH_USER_MODEL,related_name='forum_threads',on_delete=models.CASCADE)
    title=models.CharField(max_length=255)
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)
    view_count=models.PositiveIntegerField(default=0)
    class Meta:
        ordering=['-updated_at']
    def __str__(self):
        return self.title
    @property
    def reply_count(self):
        return max(0,self.posts.count()-1)
    @property
    def last_activity_by(self):
        last=self.posts.order_by('-created_at').first()
        return last.author.username if last else self.author.username
    @property
    def last_activity_at(self):
        last=self.posts.order_by('-created_at').first()
        return last.created_at if last else self.created_at

class ForumPost(models.Model):
    thread=models.ForeignKey(ForumThread,related_name='posts',on_delete=models.CASCADE)
    author=models.ForeignKey(settings.AUTH_USER_MODEL,related_name='forum_posts',on_delete=models.CASCADE)
    content=models.TextField()
    created_at=models.DateTimeField(auto_now_add=True)
    parent_post=models.ForeignKey('self',null=True,blank=True,on_delete=models.CASCADE,related_name='replies')
    class Meta:
        ordering=['created_at']
    def __str__(self):
        return f"Post by {self.author.username} in {self.thread.title}"
    def save(self,*args,**kwargs):
        is_new=self.pk is None
        super().save(*args,**kwargs)
        if is_new:
            self.thread.updated_at=self.created_at
            self.thread.save(update_fields=['updated_at'])
