
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes as dec_permission_classes
from rest_framework.response import Response
from .models import (
    Class, Subject, Lesson, Quiz, Question, Choice, UserLessonProgress, 
    UserQuizAttempt, Book, ProcessedNote, Reward, UserReward, Checkpoint, AILessonQuizAttempt,
    UserNote, TranslatedLessonContent, AILessonSummary, StudentResource
)
from accounts.models import CustomUser, ParentStudentLink, StudentProfile, RecentActivity
from .serializers import ( 
    ProcessedNoteSerializer, ClassSerializer, SubjectSerializer, LessonSerializer, BookSerializer, 
    UserLessonProgressSerializer, QuizSerializer, QuestionSerializer, ChoiceSerializer, UserQuizAttemptSerializer,
    RewardSerializer, UserRewardSerializer, CheckpointSerializer, AILessonQuizAttemptSerializer,
    UserNoteSerializer, TranslatedLessonContentSerializer, AILessonSummarySerializer, StudentResourceSerializer
)
from .services import check_and_award_rewards, get_reward_progress
from accounts.permissions import IsTeacher, IsTeacherOrReadOnly, IsStudent, IsParent
from rest_framework.permissions import IsAuthenticatedOrReadOnly, IsAdminUser, AllowAny, IsAuthenticated
from rest_framework.generics import ListAPIView
from django_filters.rest_framework import DjangoFilterBackend 
from django.http import JsonResponse 
from django.db.models import Q, Exists, OuterRef
from django.utils import timezone
from datetime import timedelta
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.exceptions import PermissionDenied, NotFound, ValidationError


class ClassViewSet(viewsets.ModelViewSet):
    queryset = Class.objects.all().select_related('syllabus')
    serializer_class = ClassSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] 
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['syllabus', 'name']

    def get_serializer_context(self):
        return {'request': self.request, **super().get_serializer_context()}

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_staff and not (user.role == 'Admin'):
            raise PermissionDenied("Only authorized staff can create master classes.")
        serializer.save()


class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all().select_related('master_class', 'master_class__syllabus')
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] 
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['master_class', 'name']

    def get_serializer_context(self):
        return {'request': self.request, **super().get_serializer_context()}

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_staff and not (user.role == 'Admin'):
            raise PermissionDenied("You do not have permission to create subjects.")
        serializer.save()


class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] 
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['subject', 'subject__master_class', 'title']

    def get_queryset(self):
        return Lesson.objects.all().select_related('subject', 'subject__master_class').order_by('subject__master_class__id', 'subject__id', 'lesson_order')

    def get_serializer_context(self):
        return {'request': self.request, **super().get_serializer_context()}
        
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user
        if user.is_authenticated and user.role == 'Student':
            ten_minutes_ago = timezone.now() - timedelta(minutes=10)
            activity_details_start = f"Viewed lesson: '{instance.title}'"
            if not RecentActivity.objects.filter(
                user=user, 
                activity_type='Lesson', 
                details__startswith=activity_details_start, 
                timestamp__gte=ten_minutes_ago
            ).exists():
                RecentActivity.objects.create(
                    user=user,
                    activity_type='Lesson',
                    details=f"Viewed lesson: '{instance.title}' in {instance.subject.name}"
                )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_staff and not (user.role == 'Admin' or user.role == 'Teacher'):
            raise PermissionDenied("You do not have permission to create lessons.")
        serializer.save()


    @action(detail=True, methods=['post'], permission_classes=[IsTeacher | IsAdminUser])
    def simplify_content(self, request, pk=None):
        lesson = self.get_object()
        simplified_text = request.data.get('simplified_text', None)
        if simplified_text:
            lesson.simplified_content = simplified_text
        elif lesson.content:
            lesson.simplified_content = "Simplified (AI Placeholder): " + lesson.content[:100] + "..." 
        else:
            return Response({"error": "Lesson content is empty or no simplified text provided."}, status=status.HTTP_400_BAD_REQUEST)
        lesson.save()
        return Response(LessonSerializer(lesson, context=self.get_serializer_context()).data)


class QuizViewSet(viewsets.ModelViewSet):
    queryset = Quiz.objects.all().select_related('lesson', 'lesson__subject').prefetch_related('questions__choices')
    serializer_class = QuizSerializer
    permission_classes = [IsTeacherOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lesson', 'lesson__subject', 'title']

    def get_serializer_context(self):
        return {'request': self.request, **super().get_serializer_context()}
    
    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_staff and not (user.role == 'Admin' or user.role == 'Teacher'):
            raise PermissionDenied("You do not have permission to create quizzes.")
        serializer.save()


    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsStudent])
    def submit_quiz(self, request, pk=None):
        quiz = self.get_object()
        user = request.user
        answers_data = request.data.get('answers', []) 
        
        if not isinstance(answers_data, list):
             return Response({"error": "Answers must be a list."}, status=status.HTTP_400_BAD_REQUEST)

        correct_answers_count = 0
        total_questions_in_quiz = quiz.questions.count()

        if total_questions_in_quiz == 0:
            attempt = UserQuizAttempt.objects.create(user=user, quiz=quiz, score=0, passed=False, answers=answers_data)
            return Response(UserQuizAttemptSerializer(attempt, context=self.get_serializer_context()).data, status=status.HTTP_200_OK)

        for answer_data in answers_data:
            question_id = answer_data.get('question_id')
            selected_choice_id = answer_data.get('choice_id')

            if question_id is None or selected_choice_id is None:
                continue 

            try:
                question = Question.objects.get(pk=question_id, quiz=quiz) 
                selected_choice = Choice.objects.get(pk=selected_choice_id, question=question) 
                if selected_choice.is_correct:
                    correct_answers_count += 1
            except Question.DoesNotExist:
                pass 
            except Choice.DoesNotExist:
                pass
        
        score_percentage = (correct_answers_count / total_questions_in_quiz) * 100 if total_questions_in_quiz > 0 else 0
        passed = score_percentage >= quiz.pass_mark_percentage

        attempt = UserQuizAttempt.objects.create(
            user=user,
            quiz=quiz,
            score=score_percentage,
            passed=passed,
            answers=answers_data 
        )
        
        return Response(UserQuizAttemptSerializer(attempt, context=self.get_serializer_context()).data, status=status.HTTP_200_OK)


class QuestionViewSet(viewsets.ModelViewSet):
    queryset = Question.objects.all().prefetch_related('choices')
    serializer_class = QuestionSerializer
    permission_classes = [IsTeacherOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['quiz']

    def perform_create(self, serializer):
        user = self.request.user
        quiz_id = self.request.data.get('quiz') 
        if not quiz_id:
            raise ValidationError("Quiz ID must be provided to create a question.")
        try:
            quiz = Quiz.objects.get(pk=quiz_id)
            if not user.is_staff and user.role not in ['Admin', 'Teacher']:
                raise PermissionDenied("You cannot add questions to this quiz.")
            serializer.save(quiz=quiz)
        except Quiz.DoesNotExist:
            raise NotFound("Quiz not found.")


class ChoiceViewSet(viewsets.ModelViewSet):
    queryset = Choice.objects.all().select_related('question')
    serializer_class = ChoiceSerializer
    permission_classes = [IsTeacherOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['question', 'question__quiz']

    def perform_create(self, serializer):
        user = self.request.user
        question_id = self.request.data.get('question') 
        if not question_id:
            raise ValidationError("Question ID must be provided to create a choice.")
        try:
            question = Question.objects.get(pk=question_id)
            if not user.is_staff and user.role not in ['Admin', 'Teacher']:
                 raise PermissionDenied("You cannot add choices to this question.")
            serializer.save(question=question)
        except Question.DoesNotExist:
            raise NotFound("Question not found.")


class UserLessonProgressViewSet(viewsets.ModelViewSet):
    queryset = UserLessonProgress.objects.all().select_related('user', 'lesson', 'lesson__subject')
    serializer_class = UserLessonProgressSerializer
    permission_classes = [IsAuthenticated] 
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lesson', 'lesson__subject', 'lesson__subject__master_class', 'user', 'completed']

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if not user.is_authenticated: 
            return qs.none() 

        if user.role == 'Student':
            return qs.filter(user=user)
        elif user.role == 'Teacher' and user.school:
            student_ids = CustomUser.objects.filter(school=user.school, role='Student').values_list('id', flat=True)
            return qs.filter(user_id__in=student_ids)
        elif user.role == 'Parent':
            linked_student_ids = ParentStudentLink.objects.filter(parent=user).values_list('student_id', flat=True)
            return qs.filter(user_id__in=linked_student_ids)
        elif user.is_staff or (user.role == 'Admin' and user.is_school_admin): 
            if user.school:
                 student_ids = CustomUser.objects.filter(school=user.school, role='Student').values_list('id', flat=True)
                 return qs.filter(user_id__in=student_ids)
            return qs.all() 
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_authenticated or user.role != 'Student':
            raise PermissionDenied("Only students can record their lesson progress.")
        lesson = serializer.validated_data.get('lesson')
        
        completed_flag = serializer.validated_data.get('completed', False)
        
        progress, created = UserLessonProgress.objects.update_or_create(
            user=user, 
            lesson=lesson,
            defaults={'completed': completed_flag, 'progress_data': serializer.validated_data.get('progress_data')}
        )

        if completed_flag:
            check_and_award_rewards(user, trigger_event='LESSON_COMPLETED')
        
        serializer.instance = progress


    def perform_update(self, serializer):
        user = self.request.user
        if serializer.instance.user != user and not (user.is_staff or (user.is_authenticated and user.role == 'Teacher')): 
            raise PermissionDenied("You can only update your own progress or lack permissions.")
        
        instance = serializer.save()
        
        if instance.completed:
            check_and_award_rewards(user, trigger_event='LESSON_COMPLETED')



class ProcessedNoteViewSet(viewsets.ModelViewSet):
    queryset = ProcessedNote.objects.all().select_related('user', 'lesson')
    serializer_class = ProcessedNoteSerializer
    permission_classes = [IsAuthenticated] 
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'lesson']

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        original_notes = serializer.validated_data.get('original_notes')
        processed_output = f"AI Processed Output (Placeholder): {original_notes[:50]}..." if original_notes else "No notes to process."
        serializer.save(user=self.request.user, processed_output=processed_output)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def export_email(self, request, pk=None):
        note = self.get_object()
        return Response({"message": f"Email export for note '{note.id}' requested (placeholder)."}, status=status.HTTP_200_OK)


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all().select_related('subject', 'master_class')
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] 
    filter_backends = [DjangoFilterBackend]
    parser_classes = [MultiPartParser, FormParser] 
    filterset_fields = ['subject', 'master_class', 'author', 'title']

    def get_serializer_context(self):
        return {'request': self.request, **super().get_serializer_context()}
    
    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_staff and user.role not in ['Admin', 'Teacher']:
            raise PermissionDenied("You do not have permission to upload books.")
        serializer.save()


@api_view(['POST'])
@dec_permission_classes([IsAuthenticated]) 
def ai_note_taking(request):
    notes_input = request.data.get('notes')
    lesson_id = request.data.get('lesson_id') 
    user = request.user

    if not notes_input:
        return Response({'error': 'No notes provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    processed_notes_result = f"AI Processed Output (Placeholder): {notes_input[:50]}..."
    
    lesson = None
    if lesson_id:
        try:
            lesson = Lesson.objects.get(id=lesson_id)
        except Lesson.DoesNotExist:
            pass 

    processed_note_obj = ProcessedNote.objects.create(
        user=user,
        lesson=lesson,
        original_notes=notes_input,
        processed_output=processed_notes_result
    )
    
    serializer = ProcessedNoteSerializer(processed_note_obj, context={'request': request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@dec_permission_classes([IsAuthenticated]) 
def dictionary_lookup(request):
    term = request.data.get('term')
    if not term:
        return Response({'error': 'No term provided for lookup'}, status=status.HTTP_400_BAD_REQUEST)
    
    mock_definition = f"Mock definition for '{term}': This is a placeholder. In a real app, this would come from a dictionary API or database."
    return Response({'term': term, 'definition': mock_definition}, status=status.HTTP_200_OK)

class UserQuizAttemptViewSet(viewsets.ReadOnlyModelViewSet): 
    queryset = UserQuizAttempt.objects.all().select_related('user', 'quiz', 'quiz__lesson')
    serializer_class = UserQuizAttemptSerializer
    permission_classes = [IsAuthenticatedOrReadOnly] 
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'quiz', 'quiz__lesson__subject', 'passed']

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if not user.is_authenticated:
            return qs.none() 

        if user.role == 'Student':
            return qs.filter(user=user)
        elif user.role == 'Parent':
            linked_student_ids = ParentStudentLink.objects.filter(parent=user).values_list('student_id', flat=True)
            return qs.filter(user_id__in=linked_student_ids)
        elif user.role == 'Teacher' and user.school:
            student_ids_in_school = CustomUser.objects.filter(school=user.school, role='Student').values_list('id', flat=True)
            return qs.filter(user_id__in=student_ids_in_school)
        elif user.is_staff or (user.role == 'Admin' and user.is_school_admin and user.school): 
            student_ids_in_school = CustomUser.objects.filter(school=user.school, role='Student').values_list('id', flat=True)
            return qs.filter(user_id__in=student_ids_in_school)
        elif user.is_staff: 
             return qs.all()
        return qs.none()

    def get_serializer_context(self):
        return {'request': self.request, **super().get_serializer_context()}


class RewardViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Reward.objects.all()
    serializer_class = RewardSerializer
    permission_classes = [permissions.AllowAny]

class RewardProgressView(ListAPIView):
    """
    Provides the progress for unearned rewards for the current user.
    """
    serializer_class = RewardSerializer # The base data is a reward
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # This view doesn't use a standard queryset, it builds a custom response.
        return Reward.objects.none()

    def list(self, request, *args, **kwargs):
        user = request.user
        progress_data = get_reward_progress(user)
        
        # Serialize the reward part and add progress fields
        serialized_rewards = []
        for p_data in progress_data:
            reward_instance = Reward.objects.get(id=p_data['reward'])
            serialized_reward = self.get_serializer(reward_instance).data
            serialized_reward['progress'] = {
                'current': p_data['current'],
                'target': p_data['target'],
                'text': p_data['text'],
            }
            serialized_rewards.append(serialized_reward)
            
        return Response(serialized_rewards)


class UserRewardViewSet(viewsets.ModelViewSet):
    serializer_class = UserRewardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            if user.is_staff or user.role == 'Admin':
                return UserReward.objects.all().select_related('user', 'reward')
            return UserReward.objects.filter(user=user).select_related('user', 'reward')
        return UserReward.objects.none()

    def perform_create(self, serializer):
        if not self.request.user.is_staff and self.request.user.role != 'Teacher':
             raise PermissionDenied("You do not have permission to award rewards.")
        user_reward = serializer.save()
        RecentActivity.objects.create(
            user=user_reward.user, 
            activity_type='Reward', 
            details=f"Earned a new reward: '{user_reward.reward.title}'"
        )


class CheckpointViewSet(viewsets.ModelViewSet):
    queryset = Checkpoint.objects.all()
    serializer_class = CheckpointSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AILessonQuizAttemptViewSet(viewsets.ModelViewSet):
    queryset = AILessonQuizAttempt.objects.all()
    serializer_class = AILessonQuizAttemptSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'lesson', 'passed']

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        if user.is_staff or user.role == 'Admin':
            return qs
        return qs.filter(user=user)

    def perform_create(self, serializer):
        user = self.request.user
        lesson = serializer.validated_data.get('lesson')
        
        latest_attempt = AILessonQuizAttempt.objects.filter(user=user, lesson=lesson).order_by('-attempted_at').first()
        if latest_attempt and latest_attempt.can_reattempt_at and timezone.now() < latest_attempt.can_reattempt_at:
            raise PermissionDenied(f"You must wait until {latest_attempt.can_reattempt_at.strftime('%Y-%m-%d %H:%M:%S')} to attempt this quiz again.")

        passed = serializer.validated_data.get('passed', False)
        can_reattempt_at = None
        if not passed:
            can_reattempt_at = timezone.now() + timedelta(hours=2)

        attempt = serializer.save(user=user, can_reattempt_at=can_reattempt_at)
        
        score = attempt.score
        details = f"Attempted quiz for '{lesson.title}': Scored {score:.0f}% - {'Passed' if passed else 'Failed'}."
        RecentActivity.objects.create(user=user, activity_type='Quiz', details=details)
        
        if passed:
            check_and_award_rewards(user, trigger_event='QUIZ_PASSED')


class UserNoteViewSet(viewsets.ModelViewSet):
    queryset = UserNote.objects.all()
    serializer_class = UserNoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return self.queryset.all()
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        lesson = serializer.validated_data.get('lesson')
        note, created = UserNote.objects.update_or_create(
            user=self.request.user,
            lesson=lesson,
            defaults={'notes': serializer.validated_data.get('notes')}
        )
        serializer.instance = note
    
    def perform_update(self, serializer):
        if serializer.instance.user != self.request.user:
            raise PermissionDenied("You can only update your own notes.")
        serializer.save()


class TranslatedLessonContentViewSet(viewsets.ModelViewSet):
    queryset = TranslatedLessonContent.objects.all()
    serializer_class = TranslatedLessonContentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            raise PermissionDenied("You do not have permission to add translations.")
        serializer.save()

class AILessonSummaryViewSet(viewsets.ModelViewSet):
    queryset = AILessonSummary.objects.all()
    serializer_class = AILessonSummarySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['lesson']

    def perform_create(self, serializer):
        if not self.request.user.is_authenticated:
            raise PermissionDenied("You do not have permission to add summaries.")
        lesson = serializer.validated_data.get('lesson')
        summary, created = AILessonSummary.objects.update_or_create(
            lesson=lesson,
            defaults={'summary': serializer.validated_data.get('summary')}
        )
        serializer.instance = summary


class StudentResourceViewSet(viewsets.ModelViewSet):
    serializer_class = StudentResourceSerializer
    permission_classes = [IsAuthenticated, IsStudent]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        """Only show resources for the currently authenticated student."""
        return StudentResource.objects.filter(student=self.request.user)

    def perform_create(self, serializer):
        """Associate the new resource with the current user."""
        serializer.save(student=self.request.user)

    def perform_update(self, serializer):
        # Ensure a student can only update their own resources
        if self.get_object().student != self.request.user:
            raise PermissionDenied("You can only edit your own resources.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.student != self.request.user:
            raise PermissionDenied("You can only delete your own resources.")
        instance.delete()
        
    @action(detail=True, methods=['post'], url_path='record-view-ping')
    def record_view_ping(self, request, pk=None):
        # Placeholder for a more robust tracking system
        # For now, we can log an activity
        resource = self.get_object()
        RecentActivity.objects.create(
            user=request.user,
            activity_type='Library',
            details=f"Viewed personal resource: '{resource.title}'"
        )
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

# AI-specific views
@api_view(['POST'])
@dec_permission_classes([IsAuthenticated])
def ai_summarize_lesson(request):
    lesson_id = request.data.get('lesson_id')
    if not lesson_id:
        return Response({'error': 'Lesson ID is required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        lesson = Lesson.objects.get(pk=lesson_id)
        summary_placeholder = f"<h3>Summary for {lesson.title}</h3><p>This is an AI-generated summary placeholder.</p>"
        summary, created = AILessonSummary.objects.update_or_create(
            lesson=lesson,
            defaults={'summary': summary_placeholder}
        )
        return Response(AILessonSummarySerializer(summary).data, status=status.HTTP_200_OK)

    except Lesson.DoesNotExist:
        return Response({'error': 'Lesson not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@dec_permission_classes([IsAuthenticated])
def ai_translate_lesson(request):
    lesson_id = request.data.get('lesson_id')
    language = request.data.get('language')
    if not lesson_id or not language:
        return Response({'error': 'Lesson ID and language are required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        lesson = Lesson.objects.get(pk=lesson_id)
        translation_placeholder = f"<h3>{lesson.title} (Translated to {language})</h3><p>This is a placeholder for the translated content.</p>"

        translation, created = TranslatedLessonContent.objects.update_or_create(
            lesson=lesson,
            language_code=language,
            defaults={'translated_title': f"{lesson.title} ({language})", 'translated_content': translation_placeholder}
        )
        return Response(TranslatedLessonContentSerializer(translation).data, status=status.HTTP_200_OK)
    except Lesson.DoesNotExist:
        return Response({'error': 'Lesson not found'}, status=status.HTTP_404_NOT_FOUND)

    