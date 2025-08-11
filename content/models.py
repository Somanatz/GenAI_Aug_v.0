
from django.db import models
from django.db.models import JSONField # Corrected import
from django.conf import settings
# Use string reference to avoid circular import
# from accounts.models import Syllabus

class Class(models.Model):
    # This is now a Master Class Template
    syllabus = models.ForeignKey('accounts.Syllabus', related_name='master_classes', on_delete=models.CASCADE)
    name = models.CharField(max_length=100) # e.g., "Class 5", "Class 10"
    description = models.TextField(blank=True, null=True)
    # The 'school' ForeignKey is removed from here.

    class Meta:
        ordering = ['name']
        verbose_name_plural = "Master Classes"

    def __str__(self):
        return f"{self.name} ({self.syllabus.name})"

class Subject(models.Model):
    # Now linked to a Master Class, not a school-specific class instance
    master_class = models.ForeignKey(Class, related_name='subjects', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        # Format: "CBSE (Class 5) - English" for clarity
        return f"{self.master_class.syllabus.name} ({self.master_class.name}) - {self.name}"

class Lesson(models.Model):
    subject = models.ForeignKey(Subject, related_name='lessons', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content = models.TextField()
    video_url = models.URLField(blank=True, null=True)
    audio_url = models.URLField(blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    simplified_content = models.TextField(blank=True, null=True)
    lesson_order = models.PositiveIntegerField(default=0)
    requires_previous_quiz = models.BooleanField(default=True, help_text="If true, student must pass the quiz of the previous lesson in order to access this one.")

    class Meta:
        ordering = ['lesson_order']

    def __str__(self):
        return f"{self.title} ({self.subject.name})"

class Quiz(models.Model):
    lesson = models.OneToOneField(Lesson, related_name='quiz', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    pass_mark_percentage = models.FloatField(default=70.0, help_text="Percentage required to pass this quiz.")


    class Meta:
        ordering = ['title']

    def __str__(self):
        return f"Quiz for {self.lesson.title}"

class Question(models.Model):
    quiz = models.ForeignKey(Quiz, related_name='questions', on_delete=models.CASCADE)
    text = models.TextField()

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.text[:50] + '...'

class Choice(models.Model):
    question = models.ForeignKey(Question, related_name='choices', on_delete=models.CASCADE)
    text = models.CharField(max_length=200)
    is_correct = models.BooleanField(default=False)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.text

class UserQuizAttempt(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='user_attempts')
    score = models.FloatField(default=0.0, help_text="Score as a percentage (0-100).")
    answers = JSONField(blank=True, null=True, help_text="Stores the user's answers for each question.")
    completed_at = models.DateTimeField(auto_now_add=True)
    passed = models.BooleanField(default=False)

    class Meta:
        ordering = ['-completed_at']

    def __str__(self):
        return f"{self.user.username}'s attempt on {self.quiz.title}"

class UserLessonProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='user_progress')
    completed = models.BooleanField(default=False)
    progress_data = JSONField(blank=True, null=True, help_text="Stores specific progress within a lesson, e.g., last video timestamp, scroll position.")
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'lesson')
        ordering = ['user', 'lesson']

    def __str__(self):
        return f"{self.user.username}'s progress in {self.lesson.title}"

class ProcessedNote(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='processed_notes')
    lesson = models.ForeignKey(Lesson, on_delete=models.SET_NULL, related_name='processed_notes', null=True, blank=True)
    original_notes = models.TextField() 
    processed_output = models.TextField(blank=True, null=True) 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Note from {self.user.username} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"

class Book(models.Model):
    master_class = models.ForeignKey('content.Class', related_name='books', on_delete=models.CASCADE, null=True, blank=True)
    subject = models.ForeignKey(Subject, related_name='books', on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255, blank=True, null=True)
    file = models.FileField(upload_to='books/')

    class Meta:
        ordering = ['title']

    def __str__(self):
        return self.title

class Reward(models.Model):
    REWARD_TYPE_CHOICES = [('Badge', 'Badge'), ('Reward', 'Reward')]
    CATEGORY_CHOICES = [
        ('Study Habits', 'Study Habits'), ('Attendance', 'Attendance'),
        ('Academic Performance', 'Academic Performance'), ('Progression', 'Progression')
    ]
    CRITERIA_TYPE_CHOICES = [
        ('WEEK_WARRIOR', 'Week Warrior'),
        ('CONSISTENCY_CHAMPION', 'Consistency Champion'),
        ('MASTER_OF_CONSISTENCY', 'Master of Consistency'),
        ('PERFECT_ATTENDANCE_STAR', 'Perfect Attendance Star'),
        ('QUIZ_MASTER', 'Quiz Master'),
        ('COMPLETION_CROWN', 'Completion Crown'),
        ('PIONEER_GRADUATE', 'Pioneer Graduate'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    icon = models.ImageField(upload_to='rewards_icons/', help_text="Image for the badge or reward.")
    reward_type = models.CharField(max_length=10, choices=REWARD_TYPE_CHOICES, default='Badge')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    criteria_type = models.CharField(max_length=50, choices=CRITERIA_TYPE_CHOICES, unique=True)
    priority = models.CharField(max_length=20, choices=[('High', 'High'), ('Medium', 'Medium')], default='Medium')

    class Meta:
        ordering = ['category', 'priority']

    def __str__(self):
        return self.title


class UserReward(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='achieved_rewards')
    reward = models.ForeignKey(Reward, on_delete=models.CASCADE, related_name='user_achievements')
    achieved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'reward')
        ordering = ['-achieved_at']

    def __str__(self):
        return f"{self.user.username} achieved {self.reward.title}"

class Checkpoint(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='checkpoints')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='checkpoints')
    name = models.CharField(max_length=100, help_text="A name for this checkpoint, e.g., 'Before the quiz'")
    progress_data = models.JSONField(blank=True, null=True, help_text="Stores lesson state like scroll position.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Checkpoint for {self.user.username} in {self.lesson.title} at {self.created_at}"

class AILessonQuizAttempt(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_quiz_attempts')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='ai_quiz_attempts')
    score = models.FloatField(default=0.0, help_text="Score as a percentage (0-100).")
    passed = models.BooleanField(default=False)
    quiz_data = models.JSONField(help_text="The AI-generated questions and the user's answers.")
    attempted_at = models.DateTimeField(auto_now_add=True)
    can_reattempt_at = models.DateTimeField(null=True, blank=True, help_text="The earliest time the user can re-attempt the quiz.")

    class Meta:
        ordering = ['-attempted_at']
        unique_together = ('user', 'lesson', 'attempted_at')

    def __str__(self):
        return f"{self.user.username}'s AI quiz attempt for {self.lesson.title}"

class UserNote(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='user_notes')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='user_notes')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        unique_together = ('user', 'lesson')

    def __str__(self):
        return f"Note by {self.user.username} for {self.lesson.title}"

class TranslatedLessonContent(models.Model):
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='translations')
    language_code = models.CharField(max_length=10)
    translated_title = models.CharField(max_length=255)
    translated_content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('lesson', 'language_code')

    def __str__(self):
        return f"Translation for {self.lesson.title} into {self.language_code}"

class AILessonSummary(models.Model):
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name='ai_summary')
    summary = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"AI Summary for {self.lesson.title}"

class StudentResource(models.Model):
    """
    A personal resource saved by a student, can be a file, a note, or a video link.
    """
    RESOURCE_TYPE_CHOICES = [
        ('BOOK', 'Book (PDF/ePub)'),
        ('NOTE', 'Personal Note'),
        ('VIDEO', 'Video Link'),
    ]
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='student_resources')
    resource_type = models.CharField(max_length=10, choices=RESOURCE_TYPE_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    # The actual note content for 'NOTE' type resources
    content = models.TextField(blank=True, null=True, help_text="For text-based notes.")
    # File for 'BOOK' type
    file = models.FileField(upload_to='student_resources/', blank=True, null=True, help_text="For uploaded books or PDFs.")
    # URL for 'VIDEO' type
    url = models.URLField(blank=True, null=True, help_text="For video links.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"'{self.title}' for {self.student.username}"

class ManualReport(models.Model):
    """
    A report manually created by a teacher for a student.
    """
    TEST_TYPE_CHOICES = [
        ('SLIP_TEST', 'Slip Test'),
        ('UNIT_TEST', 'Unit Test'),
        ('QUARTERLY', 'Quarterly'),
        ('ANNUAL', 'Annual'),
    ]
    
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='manual_reports')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_reports', limit_choices_to={'role__in': ['Teacher', 'Admin']})
    school = models.ForeignKey('accounts.School', on_delete=models.CASCADE, related_name='manual_reports')
    subject_name = models.CharField(max_length=100)
    test_name = models.CharField(max_length=255)
    test_type = models.CharField(max_length=20, choices=TEST_TYPE_CHOICES)
    score = models.FloatField()
    max_score = models.FloatField(default=100.0)
    grade = models.CharField(max_length=5, blank=True)
    remarks = models.TextField(blank=True)
    report_date = models.DateField()

    class Meta:
        ordering = ['-report_date']

    def __str__(self):
        return f"Report for {self.student.username} in {self.subject_name} ({self.report_date})"

    def save(self, *args, **kwargs):
        # Auto-calculate grade if not provided
        if not self.grade:
            percentage = (self.score / self.max_score) * 100
            if percentage >= 90: self.grade = 'A+'
            elif percentage >= 80: self.grade = 'A'
            elif percentage >= 70: self.grade = 'B'
            elif percentage >= 60: self.grade = 'C'
            elif percentage >= 50: self.grade = 'D'
            else: self.grade = 'F'
        super().save(*args, **kwargs)
