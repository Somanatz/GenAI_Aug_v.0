// src/ai/flows/personalized-learning-suggestions.ts
'use server';

/**
 * @fileOverview AI flow to provide personalized learning suggestions based on student performance.
 *
 * - personalizedLearningSuggestions - A function that generates personalized learning suggestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { PersonalizedLearningSuggestionsInput, PersonalizedLearningSuggestionsInputSchema, PersonalizedLearningSuggestionsOutput, PersonalizedLearningSuggestionsOutputSchema } from './personalized-learning-suggestions-types';

export async function personalizedLearningSuggestions(
  input: PersonalizedLearningSuggestionsInput
): Promise<PersonalizedLearningSuggestionsOutput> {
  return personalizedLearningSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedLearningSuggestionsPrompt',
  input: {schema: PersonalizedLearningSuggestionsInputSchema},
  output: {schema: PersonalizedLearningSuggestionsOutputSchema},
  prompt: `You are an encouraging and insightful AI learning coach. Your goal is to analyze a student's detailed performance data and provide actionable, structured recommendations, including a 7-day study timetable.

  **Analysis Task:**
  1.  **Review Analytics & Activities**: Carefully examine all the student's data provided in the JSON object.
  2.  **Formulate Structured Analysis**:
      - **Praise**: Identify 2-3 specific positive points from the data (e.g., "Consistent daily logins", "High study time in Science").
      - **Improvement Areas**: Pinpoint 2-3 specific, data-backed areas for improvement (e.g., "Multiple quiz attempts in 'Algebra Basics' suggest difficulty with core concepts", "Low progress in History despite moderate study time").
      - **Strategic Summary**: Write one sentence summarizing the recommended focus.
  3.  **Generate Actionable Suggestions**:
      - For each suggested Lesson, Video, and Quiz, provide a targeted 'reason'. Explain **why** it's recommended based on their data and **how** it will help them improve.
  4.  **Create Performance Projection**: Generate a 6-month performance projection. Use the last 3 months of past performance data from the analytics. Then, project the next 3 months, showing a realistic but optimistic improvement if the student follows your suggestions. The performance metric can be an amalgamation of quiz scores, lesson completion rates, etc., represented as a score out of 100.
  5.  **Generate a 7-Day Study Timetable**:
      - Create a balanced daily schedule for the next 7 days (MON to SUN).
      - **You MUST use the following fixed time slots for each day: "6:00 AM", "7:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "3:00 PM", "6:00 PM", "7:00 PM", "8:00 PM".**
      - Each day should include slots for 'Study Time', 'Revision', and 'Free Time' for all the subjects of student enrolled class and their recent activities. Based on given info abou the user to you.
      - Prioritize 'Study Time' for subjects where the student's progress is low or quiz scores are poor. Recommend the action plans according to the lesons only, don't give any outside actions which are not relevant to the subjects and lessons.
      - Allocate 'Revision' slots for subjects where the student is doing well, to reinforce knowledge.
      - Ensure there is adequate 'Free Time' to prevent burnout.
      - Structure the output according to the provided schema. For example, a slot for Monday morning might be: { time: '8:00 AM', subject: 'Calculus', activity: 'Study Time', details: 'Focus on Chapter 2' }.

  **Input Data:**

  - **Student ID:** {{{studentId}}}
  - **Available Lessons:** {{#each availableLessons}}{{this}}, {{/each}}
  - **Student Data (JSON):**
  \`\`\`json
  {
    "analytics": {{{json analytics}}},
    "recentActivities": {{{json recentActivities}}}
  }
  \`\`\`

  Please provide a complete JSON output with all required fields in the structured format, including the studyTimetable.
  `,
});

const personalizedLearningSuggestionsFlow = ai.defineFlow(
  {
    name: 'personalizedLearningSuggestionsFlow',
    inputSchema: PersonalizedLearningSuggestionsInputSchema,
    outputSchema: PersonalizedLearningSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
