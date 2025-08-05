/**
 * @fileOverview Types and schemas for the personalized learning suggestions flow.
 */
import {z} from 'genkit';

// Detailed schemas for the analytics data
const WeeklyStudySchema = z.object({
  date: z.string().describe("The date of the study session."),
  duration: z.number().describe("The duration of study in minutes."),
});

const SubjectDistributionSchema = z.object({
  subject__name: z.string().describe("The name of the subject."),
  total_duration: z.number().describe("Total minutes spent on the subject."),
});

const SubjectProgressSchema = z.object({
  subject__name: z.string().describe("The name of the subject."),
  completed_lessons: z.number().describe("Number of lessons completed in the subject."),
  total_lessons: z.number().describe("Total number of lessons in the subject."),
});

const QuizAttemptSchema = z.object({
  lesson__title: z.string().describe("The title of the lesson quiz."),
  attempts: z.number().describe("Number of attempts for the quiz."),
  final_score: z.number().nullable().describe("The final score achieved, if any."),
});

const RecentActivitySchema = z.object({
    activity_type: z.string().describe("Type of activity, e.g., 'Lesson', 'Quiz', 'Reward'."),
    details: z.string().describe("A description of the activity, e.g., 'Viewed lesson: The Solar System' or 'Attempted quiz for Photosynthesis: Scored 85% - Passed'."),
    timestamp: z.string().describe("The date and time the activity occurred."),
});


export const PersonalizedLearningSuggestionsInputSchema = z.object({
  studentId: z.string().describe('The unique identifier of the student.'),
  analytics: z.object({
    today_study_minutes: z.number(),
    weekly_study_minutes: z.array(WeeklyStudySchema),
    attendance: z.object({
      total_days: z.number(),
      present_days: z.number(),
    }),
    subject_distribution: z.array(SubjectDistributionSchema),
    subject_progress: z.array(SubjectProgressSchema),
    quiz_attempts: z.array(QuizAttemptSchema),
  }).describe("A JSON object containing the student's detailed performance analytics."),
  recentActivities: z.array(RecentActivitySchema).describe("A list of the student's most recent activities on the platform."),
  availableLessons: z.array(z.string()).describe("A list of available lesson titles the student can take next."),
});
export type PersonalizedLearningSuggestionsInput = z.infer<
  typeof PersonalizedLearningSuggestionsInputSchema
>;

// Add a schema for future performance projection
const PerformanceProjectionPointSchema = z.object({
    month: z.string().describe("The month for the data point (e.g., 'Jan', 'Feb')."),
    past_performance: z.number().nullable().describe("The student's actual average performance metric for that month."),
    projected_performance: z.number().nullable().describe("The AI's projected performance if suggestions are followed."),
});

// New Schemas for structured and more detailed output
const SuggestionItemSchema = z.object({
  title: z.string().describe("The title of the suggested lesson, video, or quiz."),
  reason: z.string().describe("A concise explanation of why this specific item is being recommended and how it will help the student."),
});

const AnalysisSectionSchema = z.object({
    praise: z.array(z.string()).describe("A list of positive observations about the student's efforts and strengths (e.g., 'Consistent daily logins', 'Strong performance in Science')."),
    improvement_areas: z.array(z.string()).describe("A list of specific, constructive areas for improvement identified from the data (e.g., 'Low quiz scores in History despite high study time')."),
    strategic_summary: z.string().describe("A brief, forward-looking summary of the overall strategy for the student."),
});

// Schema for the AI-generated study timetable
const StudyTimeSlotSchema = z.object({
    time: z.string().describe("The time for the slot, e.g., '8:00 AM'."),
    subject: z.string().describe("The subject to study or activity name."),
    activity: z.enum(['Study Time', 'Revision', 'Free Time']).describe("The type of activity for this time slot."),
    details: z.string().optional().describe("Optional details like topic or teacher name."),
});

const StudyDaySchema = z.object({
    day: z.string().describe("The day of the week (e.g., 'MON', 'TUE')."),
    slots: z.array(StudyTimeSlotSchema).describe("An array of time slots for the day."),
});


export const PersonalizedLearningSuggestionsOutputSchema = z.object({
  analysis: AnalysisSectionSchema.describe("The AI coach's structured analysis of the student's performance."),
  suggestedLessons: z.array(SuggestionItemSchema).describe('A list of specific lessons suggested for the student, each with a reason.'),
  suggestedVideos: z.array(SuggestionItemSchema).optional().describe('A list of suggested video titles or topics, each with a reason.'),
  suggestedQuizzes: z.array(SuggestionItemSchema).describe('A list of specific quizzes for practice, each with a reason.'),
  performance_projection: z.array(PerformanceProjectionPointSchema).describe("An array of data points for plotting past vs. projected future performance over several months."),
  studyTimetable: z.array(StudyDaySchema).optional().describe("An optional 7-day study timetable generated by the AI."),
});
export type PersonalizedLearningSuggestionsOutput = z.infer<
  typeof PersonalizedLearningSuggestionsOutputSchema
>;
