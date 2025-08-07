from django.contrib import admin
from .models import (
    CustomUser, School, StudentProfile, TeacherProfile, ParentProfile, 
    ParentStudentLink, UserLoginActivity, UserDailyActivity, UserSubjectStudy, 
    RecentActivity, Syllabus, SchoolClass, StudentRecommendation, StudentTask
)

# Register your models here.
admin.site.register(CustomUser)
admin.site.register(School)
admin.site.register(StudentProfile)
admin.site.register(TeacherProfile)
admin.site.register(ParentProfile)
admin.site.register(ParentStudentLink)
admin.site.register(UserLoginActivity)
admin.site.register(UserDailyActivity)
admin.site.register(UserSubjectStudy)
admin.site.register(RecentActivity)
admin.site.register(Syllabus)
admin.site.register(SchoolClass)
admin.site.register(StudentRecommendation)
admin.site.register(StudentTask)
