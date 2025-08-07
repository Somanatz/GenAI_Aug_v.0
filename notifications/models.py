
from django.db import models
from django.conf import settings
from accounts.models import School # Import School
from django.core.exceptions import ValidationError

class Event(models.Model):
    EVENT_TYPES = [
        ('Holiday', 'Holiday'),
        ('Exam', 'Exam'),
        ('Meeting', 'Meeting'),
        ('Activity', 'Activity'),
        ('Deadline', 'Deadline'),
        ('General', 'General'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    date = models.DateField()
    end_date = models.DateField(null=True, blank=True, help_text="Optional: For multi-day events")
    type = models.CharField(max_length=10, choices=EVENT_TYPES, default='General')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_events')
    
    # Target audience for the event
    school = models.ForeignKey(School, on_delete=models.CASCADE, null=True, blank=True, related_name='school_events', help_text="If specific to a school")
    # This should link to the instance of a class in a school, not the master template
    target_class = models.ForeignKey('accounts.SchoolClass', on_delete=models.SET_NULL, null=True, blank=True, related_name='class_events', help_text="If specific to a class within the selected school")
    
    class Meta:
        ordering = ['date']

    def __str__(self):
        return f"{self.title} ({self.type}) on {self.date}"

    def clean(self):
        # This validation runs in Django Admin or when .full_clean() is called
        if self.target_class and self.target_class.school != self.school:
            raise ValidationError({'target_class': 'Target class must belong to the selected school.'})
