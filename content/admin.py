from django.contrib import admin
from .models import Class, Subject, Lesson, Quiz, Question, Choice, Book, Reward, UserReward, ProcessedNote, UserLessonProgress, UserQuizAttempt, Checkpoint, AILessonQuizAttempt, UserNote, TranslatedLessonContent, AILessonSummary, StudentResource

# Register your models here.
admin.site.register(Class)
admin.site.register(Subject)
admin.site.register(Lesson)
admin.site.register(Quiz)
admin.site.register(Question)
admin.site.register(Choice)
admin.site.register(Book)
admin.site.register(Reward)
admin.site.register(UserReward)
admin.site.register(ProcessedNote)
admin.site.register(UserLessonProgress)
admin.site.register(UserQuizAttempt)
admin.site.register(Checkpoint)
admin.site.register(AILessonQuizAttempt)
admin.site.register(UserNote)
admin.site.register(TranslatedLessonContent)
admin.site.register(AILessonSummary)
admin.site.register(StudentResource)
