from django.contrib import admin
from .models import ForumCategory, ForumThread, ForumPost

admin.site.register(ForumCategory)
admin.site.register(ForumThread)
admin.site.register(ForumPost)

    