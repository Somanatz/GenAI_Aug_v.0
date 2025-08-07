
from rest_framework import serializers
from .models import (
    Class, Subject, Lesson, Quiz, Question, Choice, UserLessonProgress, 
    ProcessedNote, Book, UserQuizAttempt, Reward, UserReward, Checkpoint, 
    AILessonQuizAttempt, UserNote, TranslatedLessonContent, AILessonSummary,
    StudentResource
)
from accounts.models import School, Syllabus # Import School model

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ['id', 'text', 'is_correct']
        # For creating choices under a question, 'question' field is not needed in request body
        extra_kwargs = {'question': {'required': False, 'allow_null': True}}


class QuestionSerializer(serializers.ModelSerializer):
    choices = ChoiceSerializer(many=True, required=True) # For creation, choices are required

    class Meta:
        model = Question
        fields = ['id', 'text', 'choices']
        extra_kwargs = {'quiz': {'required': False, 'allow_null': True}}


    def create(self, validated_data):
        choices_data = validated_data.pop('choices')
        question = Question.objects.create(**validated_data)
        for choice_data in choices_data:
            Choice.objects.create(question=question, **choice_data)
        return question

    def update(self, instance, validated_data):
        choices_data = validated_data.pop('choices', None)
        instance = super().update(instance, validated_data)

        if choices_data is not None:
            # Simple approach: clear existing and add new. More complex merging logic could be implemented.
            instance.choices.all().delete()
            for choice_data in choices_data:
                Choice.objects.create(question=instance, **choice_data)
        return instance


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, required=False) # Optional for creation/update from quiz level
    lesson_id = serializers.PrimaryKeyRelatedField(source='lesson', queryset=Lesson.objects.all(), write_only=True, required=False)

    class Meta:
        model = Quiz
        fields = ['id', 'lesson', 'lesson_id', 'title', 'description', 'pass_mark_percentage', 'questions']
        read_only_fields = ['lesson'] # Lesson is set via lesson_id or directly by LessonSerializer

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        quiz = Quiz.objects.create(**validated_data)
        for question_data in questions_data:
            choices_data = question_data.pop('choices', []) # Pop choices from question_data
            question = Question.objects.create(quiz=quiz, **question_data)
            for choice_data in choices_data:
                Choice.objects.create(question=question, **choice_data)
        return quiz
    
    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        instance = super().update(instance, validated_data)

        if questions_data is not None:
            # Simple approach: clear existing and add new questions.
            instance.questions.all().delete()
            for question_data in questions_data:
                choices_data = question_data.pop('choices', [])
                question = Question.objects.create(quiz=instance, **question_data)
                for choice_data in choices_data:
                    Choice.objects.create(question=question, **choice_data)
        return instance

class AILessonSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = AILessonSummary
        fields = ['id', 'lesson', 'summary', 'created_at']
        read_only_fields = ['id', 'created_at']

class TranslatedLessonContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TranslatedLessonContent
        fields = '__all__'
        read_only_fields = ['created_at']

class LessonSerializer(serializers.ModelSerializer):
    is_locked = serializers.SerializerMethodField()
    quiz = QuizSerializer(read_only=True, context={'request': serializers.CurrentUserDefault()}) 
    subject_id = serializers.PrimaryKeyRelatedField(source='subject', queryset=Subject.objects.all(), write_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    ai_summary = AILessonSummarySerializer(read_only=True)
    translations = TranslatedLessonContentSerializer(many=True, read_only=True)


    class Meta:
        model = Lesson
        fields = [
            'id', 'subject', 'subject_id', 'subject_name', 'title', 'content', 'video_url', 'audio_url', 'image_url',
            'simplified_content', 'lesson_order', 'requires_previous_quiz', 'is_locked', 'quiz', 'ai_summary', 'translations'
        ]
        read_only_fields = ['subject', 'ai_summary', 'translations']

    def get_is_locked(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return obj.requires_previous_quiz
        
        user = request.user
        if user.role in ['Teacher', 'Admin'] or user.is_staff:
             return False

        if obj.lesson_order == 0:
            return False

        previous_lesson = Lesson.objects.filter(
            subject=obj.subject, 
            lesson_order__lt=obj.lesson_order
        ).order_by('-lesson_order').first()

        if not previous_lesson:
            return False

        if not previous_lesson.requires_previous_quiz:
             return False # If previous lesson doesn't require a quiz, this one is unlocked by default

        passed_ai_attempt_exists = AILessonQuizAttempt.objects.filter(
            user=user,
            lesson=previous_lesson,
            passed=True
        ).exists()
        
        if not passed_ai_attempt_exists and hasattr(previous_lesson, 'quiz'):
             passed_normal_attempt_exists = UserQuizAttempt.objects.filter(
                user=user, 
                quiz=previous_lesson.quiz, 
                passed=True
            ).exists()
             return not passed_normal_attempt_exists

        return not passed_ai_attempt_exists


class SubjectSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True, context={'request': serializers.CurrentUserDefault()}) 
    master_class_id = serializers.PrimaryKeyRelatedField(source='master_class', queryset=Class.objects.all(), write_only=True)
    master_class_name = serializers.CharField(source='master_class.name', read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ['id', 'master_class', 'master_class_id', 'master_class_name', 'name', 'description', 'lessons', 'progress']
        read_only_fields = ['master_class']

    def get_progress(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return 0

        user = request.user
        total_lessons = obj.lessons.count()
        if total_lessons == 0:
            return 0
        
        completed_lessons = UserLessonProgress.objects.filter(
            user=user,
            lesson__subject=obj,
            completed=True
        ).count()

        return (completed_lessons / total_lessons) * 100


class ClassSerializer(serializers.ModelSerializer): # This is now MasterClassSerializer
    subjects = SubjectSerializer(many=True, read_only=True, context={'request': serializers.CurrentUserDefault()}) 
    school_name = serializers.SerializerMethodField() # Added this
    syllabus_name = serializers.CharField(source='syllabus.name', read_only=True, allow_null=True)
    syllabus_id = serializers.PrimaryKeyRelatedField(source='syllabus', queryset=Syllabus.objects.all(), allow_null=True, required=False, write_only=True)

    class Meta:
        model = Class
        fields = ['id', 'name', 'description', 'subjects', 'syllabus', 'syllabus_id', 'syllabus_name', 'school_name']
        read_only_fields = ['syllabus']

    def get_school_name(self, obj):
        # This is a bit of a workaround since a MasterClass isn't tied to ONE school
        # It's better to get the school name from the SchoolClass instance when possible
        # This will return the name of the first school it finds offering this class.
        school = obj.schools_offering.first()
        return school.name if school else None


class UserLessonProgressSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    lesson_id = serializers.PrimaryKeyRelatedField(queryset=Lesson.objects.all(), source='lesson', write_only=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)

    class Meta:
        model = UserLessonProgress
        fields = ['id', 'user_id', 'lesson', 'lesson_id', 'lesson_title', 'completed', 'progress_data', 'last_updated']
        read_only_fields = ['user_id', 'lesson', 'last_updated']

class ProcessedNoteSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    lesson_id = serializers.PrimaryKeyRelatedField(queryset=Lesson.objects.all(), source='lesson', allow_null=True, required=False, write_only=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True, allow_null=True)

    class Meta:
        model = ProcessedNote
        fields = ['id', 'user_id', 'lesson', 'lesson_id', 'lesson_title', 'original_notes', 'processed_output', 'created_at', 'updated_at']
        read_only_fields = ['user_id', 'lesson', 'created_at', 'updated_at', 'processed_output']

class BookSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='master_class.name', read_only=True, allow_null=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True, allow_null=True)
    file_url = serializers.SerializerMethodField()
    master_class_id = serializers.PrimaryKeyRelatedField(queryset=Class.objects.all(), source='master_class', write_only=True, allow_null=True, required=False)
    subject_id = serializers.PrimaryKeyRelatedField(queryset=Subject.objects.all(), source='subject', write_only=True, allow_null=True, required=False)

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'author', 'file', 'file_url', 
            'subject', 'subject_name', 'subject_id',
            'master_class', 'class_name', 'master_class_id'
        ]
        read_only_fields = ['subject', 'master_class']
        extra_kwargs = {'file': {'write_only': True} }

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

class UserQuizAttemptSerializer(serializers.ModelSerializer):
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    lesson_title = serializers.CharField(source='quiz.lesson.title', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)
    answers = serializers.JSONField(required=True, write_only=True)

    class Meta:
        model = UserQuizAttempt
        fields = ['id', 'user', 'user_username', 'quiz', 'quiz_title', 'lesson_title', 'score', 'completed_at', 'passed', 'answers']
        read_only_fields = ['user', 'quiz', 'completed_at', 'score', 'passed']

    def create(self, validated_data):
        return super().create(validated_data)


class RewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reward
        fields = '__all__'


class UserRewardSerializer(serializers.ModelSerializer):
    reward_details = RewardSerializer(source='reward', read_only=True)
    user_username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserReward
        fields = ['id', 'user', 'user_username', 'reward', 'reward_details', 'achieved_at']
        read_only_fields = ['user', 'reward', 'achieved_at']


class CheckpointSerializer(serializers.ModelSerializer):
    user_id = serializers.ReadOnlyField(source='user.id')
    lesson_id = serializers.PrimaryKeyRelatedField(queryset=Lesson.objects.all(), source='lesson', write_only=True)
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)

    class Meta:
        model = Checkpoint
        fields = ['id', 'user_id', 'lesson', 'lesson_id', 'lesson_title', 'name', 'progress_data', 'created_at']
        read_only_fields = ['user_id', 'lesson', 'created_at']

class AILessonQuizAttemptSerializer(serializers.ModelSerializer):
    lesson = serializers.PrimaryKeyRelatedField(queryset=Lesson.objects.all(), write_only=True)
    
    class Meta:
        model = AILessonQuizAttempt
        fields = ['id', 'user', 'lesson', 'score', 'passed', 'quiz_data', 'attempted_at', 'can_reattempt_at']
        read_only_fields = ['user', 'attempted_at', 'can_reattempt_at']

class UserNoteSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = UserNote
        fields = ['id', 'user', 'lesson', 'notes', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']

class StudentResourceSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = StudentResource
        fields = [
            'id', 'student', 'resource_type', 'title', 'description', 
            'file', 'url', 'created_at', 'updated_at', 'file_url', 'content'
        ]
        read_only_fields = ['student', 'created_at', 'updated_at', 'file_url']
        extra_kwargs = {
            'file': {'write_only': True, 'required': False},
            'content': {'required': False},
        }

    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and hasattr(obj.file, 'url'):
            if request is not None:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

    def validate(self, data):
        resource_type = data.get('resource_type')
        file = data.get('file', None)
        url = data.get('url', None)
        content = data.get('content', None)

        if resource_type == 'BOOK' and not file and not self.instance:
            raise serializers.ValidationError({"file": "A file is required for the 'Book' resource type."})
        if resource_type == 'VIDEO' and not url:
            raise serializers.ValidationError({"url": "A URL is required for the 'Video Link' resource type."})
        if resource_type == 'NOTE' and not content:
            raise serializers.ValidationError({"content": "Content is required for the 'Note' resource type."})
        return data
