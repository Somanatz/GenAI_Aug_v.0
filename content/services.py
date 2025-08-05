from django.utils import timezone
from datetime import timedelta
from django.db.models import Avg, Count
from .models import Reward, UserReward, AILessonQuizAttempt, Lesson, Subject, UserLessonProgress
from accounts.models import UserDailyActivity, RecentActivity

def check_and_award_rewards(user, trigger_event):
    """
    Checks and awards rewards to a user based on a specific trigger.
    `trigger_event` can be 'LOGIN', 'QUIZ_PASSED', 'LESSON_COMPLETED'.
    """
    if user.role != 'Student':
        return

    earned_reward_ids = UserReward.objects.filter(user=user).values_list('reward_id', flat=True)
    potential_rewards = Reward.objects.exclude(id__in=earned_reward_ids)

    for reward in potential_rewards:
        awarded = False
        criteria = reward.criteria_type
        
        if trigger_event == 'LOGIN':
            if criteria == 'WEEK_WARRIOR':
                awarded = check_study_streak(user, 7, 240)
            elif criteria == 'CONSISTENCY_CHAMPION':
                awarded = check_study_streak(user, 14, 240)
            elif criteria == 'MASTER_OF_CONSISTENCY':
                awarded = check_study_streak(user, 90, 240)
            elif criteria == 'PERFECT_ATTENDANCE_STAR':
                awarded = check_perfect_attendance(user)
        
        elif trigger_event == 'QUIZ_PASSED':
            if criteria == 'QUIZ_MASTER':
                awarded = check_quiz_master(user)
            elif criteria == 'COMPLETION_CROWN':
                awarded = check_quiz_completion(user)
            elif criteria == 'PIONEER_GRADUATE':
                awarded = check_pioneer_graduate(user)
        
        elif trigger_event == 'LESSON_COMPLETED':
            if criteria == 'SUBJECT_COMPLETION': # Assuming a criteria type for this
                # This needs to know which subject was completed
                pass


        if awarded:
            UserReward.objects.create(user=user, reward=reward)
            RecentActivity.objects.create(
                user=user,
                activity_type='Reward',
                details=f"Earned a new reward: '{reward.title}'"
            )

# --- Reward Criteria Check Functions ---

def check_study_streak(user, required_days, required_minutes):
    """Checks for an uninterrupted study streak of `required_days` with at least `required_minutes` each day."""
    today = timezone.now().date()
    for i in range(required_days):
        check_date = today - timedelta(days=i)
        try:
            activity = UserDailyActivity.objects.get(user=user, date=check_date)
            if activity.study_duration_minutes < required_minutes:
                return False
        except UserDailyActivity.DoesNotExist:
            return False
    return True

def check_perfect_attendance(user):
    """Checks if the user has 95% attendance for the year-to-date."""
    today = timezone.now().date()
    # This check could be resource-intensive, maybe run it less often or only at year end.
    # For MVP, we'll allow it on any login.
    year_start = today.replace(month=1, day=1)
    total_days_in_year = (today - year_start).days + 1
    
    present_days = UserDailyActivity.objects.filter(
        user=user, 
        date__year=today.year, 
        present=True
    ).count()

    if total_days_in_year == 0:
        return False
    
    attendance_percentage = (present_days / total_days_in_year) * 100
    return attendance_percentage >= 95

def check_quiz_master(user):
    """Checks if the user has a 95% average score across at least 40 passed AI quizzes."""
    passed_quizzes = AILessonQuizAttempt.objects.filter(user=user, passed=True)
    if passed_quizzes.count() >= 40:
        avg_score = passed_quizzes.aggregate(Avg('score'))['score__avg']
        return avg_score is not None and avg_score >= 95
    return False

def check_quiz_completion(user):
    """Checks if the user has passed a quiz for every lesson that has one."""
    lessons_with_quizzes = Lesson.objects.filter(quiz__isnull=False).values_list('id', flat=True)
    if not lessons_with_quizzes.exists():
        return False # No quizzes to complete

    # Check for a passed attempt for each of these lessons
    for lesson_id in lessons_with_quizzes:
        if not AILessonQuizAttempt.objects.filter(user=user, lesson_id=lesson_id, passed=True).exists():
            return False # Missing a passed quiz
    return True

def check_pioneer_graduate(user):
    """Checks if the user has completed their first subject."""
    # This logic assumes 'subject completion' is defined as completing all its lessons.
    subjects = Subject.objects.filter(master_class__schools_offering=user.school)
    for subject in subjects:
        total_lessons = subject.lessons.count()
        if total_lessons > 0:
            completed_lessons = UserLessonProgress.objects.filter(user=user, lesson__subject=subject, completed=True).count()
            if total_lessons == completed_lessons:
                return True # At least one subject is fully completed
    return False


# --- Progress Calculation Functions ---

def get_reward_progress(user):
    """Calculates and returns the progress for all unearned rewards for a user."""
    earned_reward_ids = UserReward.objects.filter(user=user).values_list('reward_id', flat=True)
    potential_rewards = Reward.objects.exclude(id__in=earned_reward_ids)
    
    progress_data = []

    for reward in potential_rewards:
        progress = {'reward': reward.id, 'current': 0, 'target': 1, 'text': 'Not started'}
        
        if reward.criteria_type in ['WEEK_WARRIOR', 'CONSISTENCY_CHAMPION', 'MASTER_OF_CONSISTENCY']:
            target_days = {'WEEK_WARRIOR': 7, 'CONSISTENCY_CHAMPION': 14, 'MASTER_OF_CONSISTENCY': 90}[reward.criteria_type]
            current_streak = get_study_streak_progress(user, 240)
            progress.update({'current': current_streak, 'target': target_days, 'text': f'{current_streak}/{target_days} days'})
        
        elif reward.criteria_type == 'PERFECT_ATTENDANCE_STAR':
            current_perc, total_days = get_attendance_progress(user)
            progress.update({'current': current_perc, 'target': 95, 'text': f'{current_perc:.1f}% of {total_days} days'})
            
        elif reward.criteria_type == 'QUIZ_MASTER':
            current_avg, quizzes_passed = get_quiz_master_progress(user)
            progress.update({'current': quizzes_passed, 'target': 40, 'text': f'{quizzes_passed}/40 quizzes passed (Avg: {current_avg:.1f}%)'})

        elif reward.criteria_type == 'COMPLETION_CROWN':
            completed, total = get_quiz_completion_progress(user)
            progress.update({'current': completed, 'target': total, 'text': f'{completed}/{total} quizzes completed'})
            
        elif reward.criteria_type == 'PIONEER_GRADUATE':
             # This is a one-and-done, so progress is 0 until it's 1
            completed_any_subject = check_pioneer_graduate(user)
            progress.update({'current': 1 if completed_any_subject else 0, 'target': 1, 'text': 'Complete 1 subject'})


        progress_data.append(progress)
        
    return progress_data


def get_study_streak_progress(user, required_minutes):
    """Returns the current length of a user's study streak."""
    streak = 0
    today = timezone.now().date()
    while True:
        check_date = today - timedelta(days=streak)
        try:
            activity = UserDailyActivity.objects.get(user=user, date=check_date)
            if activity.study_duration_minutes < required_minutes:
                break # Streak broken
            streak += 1
        except UserDailyActivity.DoesNotExist:
            break # Day is missing, so streak is broken
    return streak

def get_attendance_progress(user):
    """Returns the current attendance percentage and total days so far."""
    today = timezone.now().date()
    year_start = today.replace(month=1, day=1)
    total_days_so_far = (today - year_start).days + 1
    
    present_days = UserDailyActivity.objects.filter(
        user=user, 
        date__year=today.year, 
        present=True
    ).count()
    
    if total_days_so_far == 0: return 0.0, 0
    
    return (present_days / total_days_so_far) * 100, total_days_so_far

def get_quiz_master_progress(user):
    """Returns current quiz average and number of passed quizzes."""
    passed_quizzes = AILessonQuizAttempt.objects.filter(user=user, passed=True)
    count = passed_quizzes.count()
    avg_score = passed_quizzes.aggregate(Avg('score'))['score__avg'] or 0.0
    return avg_score, count

def get_quiz_completion_progress(user):
    """Returns number of unique quizzes completed vs. total available."""
    lessons_with_quizzes = Lesson.objects.filter(quiz__isnull=False).values_list('id', flat=True)
    total_quizzes = lessons_with_quizzes.count()
    if total_quizzes == 0:
        return 0, 40
        
    completed_count = AILessonQuizAttempt.objects.filter(
        user=user, 
        lesson_id__in=lessons_with_quizzes, 
        passed=True
    ).values('lesson_id').distinct().count()
    
    return completed_count, total_quizzes
