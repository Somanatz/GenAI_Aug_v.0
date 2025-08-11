
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone
import uuid
# Use string reference to avoid circular import
# from content.models import Class as MasterClass

class Syllabus(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name

class School(models.Model):
    name = models.CharField(max_length=255)
    school_id_code = models.CharField(max_length=100, unique=True, help_text="Unique external ID for the school")
    license_number = models.CharField(max_length=100, blank=True, null=True)
    official_email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    principal_full_name = models.CharField(max_length=255, blank=True, null=True)
    principal_contact_number = models.CharField(max_length=20, blank=True, null=True)
    principal_email = models.EmailField(blank=True, null=True)
    admin_user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='administered_school',
        help_text="The primary admin user for this school, created during registration."
    )
    syllabus = models.ForeignKey(Syllabus, on_delete=models.SET_NULL, null=True, blank=True, related_name='schools')
    # Use through model `SchoolClass` to link to master classes
    master_classes = models.ManyToManyField('content.Class', through='SchoolClass', related_name='schools_offering')


    def __str__(self):
        return self.name

class SchoolClass(models.Model):
    """
    This model links a specific School to a master Class template.
    It represents an "instance" of a class for a particular school.
    """
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    master_class = models.ForeignKey('content.Class', on_delete=models.CASCADE)
    # You can add school-specific details here later, e.g., section_name = models.CharField(max_length=100)

    class Meta:
        unique_together = ('school', 'master_class')
        verbose_name_plural = "School Classes"

    def __str__(self):
        return f"{self.school.name} - {self.master_class.name}"


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('Student', 'Student'),
        ('Teacher', 'Teacher'),
        ('Parent', 'Parent'),
        ('Admin', 'Admin'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='Student')
    is_school_admin = models.BooleanField(default=False, help_text="Designates if this admin user manages a specific school.")
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_and_students')
    is_verified = models.BooleanField(default=False, help_text="Designates whether the user has verified their email address.")
    verification_token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, null=True)

    
    def __str__(self):
        return self.username

class StudentProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='student_profile', limit_choices_to={'role': 'Student'})
    profile_completed = models.BooleanField(default=False)
    full_name = models.CharField(max_length=255, blank=True, null=True)
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True, related_name='students')
    # This should now link to the SchoolClass instance, not the master Class.
    enrolled_class = models.ForeignKey('accounts.SchoolClass', on_delete=models.SET_NULL, null=True, blank=True, related_name='enrolled_students')
    preferred_language = models.CharField(max_length=10, default='en', blank=True, null=True)
    father_name = models.CharField(max_length=255, blank=True, null=True)
    mother_name = models.CharField(max_length=255, blank=True, null=True)
    place_of_birth = models.CharField(max_length=100, blank=True, null=True) 
    date_of_birth = models.DateField(null=True, blank=True)
    blood_group = models.CharField(max_length=10, blank=True, null=True)
    needs_assistant_teacher = models.BooleanField(default=False)
    admission_number = models.CharField(max_length=50, blank=True, null=True)
    parent_email_for_linking = models.EmailField(blank=True, null=True, help_text="Parent's email to verify and link account.")
    parent_mobile_for_linking = models.CharField(max_length=20, blank=True, null=True)
    parent_occupation = models.CharField(max_length=100, blank=True, null=True)
    hobbies = models.TextField(blank=True, null=True)
    favorite_sports = models.CharField(max_length=255, blank=True, null=True)
    interested_in_gardening_farming = models.BooleanField(default=False)
    nickname = models.CharField(max_length=100, blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/students/', null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}'s Profile ({self.full_name or 'N/A'})"

class TeacherProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='teacher_profile', limit_choices_to={'role': 'Teacher'})
    profile_completed = models.BooleanField(default=False)
    full_name = models.CharField(max_length=255, blank=True, null=True)
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True, related_name='teachers')
    # A teacher is assigned to a school's instance of a class
    assigned_classes = models.ManyToManyField('accounts.SchoolClass', blank=True, related_name='teachers_assigned')
    subject_expertise = models.ManyToManyField('content.Subject', blank=True, related_name='expert_teachers')
    interested_in_tuition = models.BooleanField(default=False)
    mobile_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/teachers/', null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}'s Teacher Profile ({self.full_name or 'N/A'})"

class ParentProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='parent_profile', limit_choices_to={'role': 'Parent'})
    profile_completed = models.BooleanField(default=False)
    full_name = models.CharField(max_length=255, blank=True, null=True)
    mobile_number = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/parents/', null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}'s Parent Profile ({self.full_name or 'N/A'})"

class ParentStudentLink(models.Model):
    parent = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='parent_links', limit_choices_to={'role': 'Parent'})
    student = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='student_links', limit_choices_to={'role': 'Student'})

    class Meta:
        unique_together = ('parent', 'student')

    def __str__(self):
        return f"{self.parent.username} is parent of {self.student.username}"

# -- Analytics Models --

class UserLoginActivity(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='login_activities')
    timestamp = models.DateTimeField(auto_now_add=True)
    activity_type = models.CharField(max_length=10, choices=[('login', 'Login'), ('logout', 'Logout')])

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.activity_type} at {self.timestamp}"

class UserDailyActivity(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_activities')
    date = models.DateField(default=timezone.now)
    study_duration_minutes = models.PositiveIntegerField(default=0, help_text="Total study duration for this day in minutes.")
    library_study_duration_minutes = models.PositiveIntegerField(default=0, help_text="Total study duration from the general library timer for this day in minutes.")
    present = models.BooleanField(default=False, help_text="Attendance for the day.")

    class Meta:
        ordering = ['-date']
        unique_together = ('user', 'date')

    def __str__(self):
        return f"{self.user.username}'s activity on {self.date}"

class UserSubjectStudy(models.Model):
    daily_activity = models.ForeignKey(UserDailyActivity, on_delete=models.CASCADE, related_name='subject_studies')
    subject = models.ForeignKey('content.Subject', on_delete=models.CASCADE, related_name='study_sessions')
    duration_minutes = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-duration_minutes']
        unique_together = ('daily_activity', 'subject')

    def __str__(self):
        return f"Study of {self.subject.name} for {self.duration_minutes} mins on {self.daily_activity.date}"

class RecentActivity(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recent_activities')
    ACTIVITY_TYPES = [
        ('Lesson', 'Lesson'),
        ('Quiz', 'Quiz'),
        ('Reward', 'Reward'),
        ('Login', 'Login'),
        ('Logout', 'Logout'),
        ('Library', 'Library'),
        ('Forum', 'Forum'),
    ]
    activity_type = models.CharField(max_length=50, choices=ACTIVITY_TYPES)
    details = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.activity_type}: {self.details}"

class StudentRecommendation(models.Model):
    """
    Stores the AI-generated learning recommendations for a student.
    """
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='recommendations', limit_choices_to={'role': 'Student'})
    recommendation_data = models.JSONField(help_text="The full JSON output from the PersonalizedLearningSuggestions AI flow.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Recommendation for {self.student.username} on {self.created_at.strftime('%Y-%m-%d')}"

class StudentTask(models.Model):
    """
    Represents a personal task created by a student.
    """
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tasks', limit_choices_to={'role': 'Student'})
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    due_date = models.DateField()
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
                ordering = ['due_date', 'created_at']

    def __str__(self):
        return f"Task for {self.student.username}: {self.title}"
