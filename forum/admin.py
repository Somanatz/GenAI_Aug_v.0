from django.contrib import admin
from .models import ForumThread, ForumPost, PostAttachment, PostLike

admin.site.register(ForumThread)
admin.site.register(ForumPost)
admin.site.register(PostAttachment)
admin.site.register(PostLike)
