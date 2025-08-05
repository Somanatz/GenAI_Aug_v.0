'use server';
/**
 * @fileOverview Generates a quiz based on lesson content.
 *
 * - generateLessonQuiz - A function that generates quiz questions.
 * - QuizGenerationInput - The input type for the function.
 * - QuizGenerationOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {
    QuizGenerationInput,
    QuizGenerationInputSchema,
    QuizGenerationOutput,
    QuizGenerationOutputSchema
} from './lesson-quiz-types';


export async function generateLessonQuiz(input: QuizGenerationInput): Promise<QuizGenerationOutput> {
  return lessonQuizFlow(input);
}

const prompt = ai.definePrompt({
  name: 'lessonQuizPrompt',
  input: {schema: QuizGenerationInputSchema},
  output: {schema: QuizGenerationOutputSchema},
  prompt: `You are an expert educator responsible for creating quizzes to test student comprehension. Based on the provided lesson content, generate a quiz with exactly 25 questions.

The quiz must include a mix of the following question types if lesson content is telugu/hindi:
- multiple_choice: A question with several options, only one of which is correct. Provide 4 options.
- true_false: A statement that is either true or false.
- find the incorrect sentence from list of options (for telugu and hindi subjects only).

The quiz must include a mix of the following question types for other subjects:
- multiple_choice: A question with several options, only one of which is correct. Provide 4 options.
- true_false: A statement that is either true or false.
- fill_in_the_blank: A sentence with a word or phrase missing. The correct_answer should be the missing word/phrase.

The questions should also have a mix of difficulty levels: easy, medium, and hard.

Ensure the questions are diverse and cover different aspects of the lesson content provided below.

Lesson Content:
"""
{{{lessonContent}}}
"""

Generate the 25 quiz questions now.`,
});

const lessonQuizFlow = ai.defineFlow(
  {
    name: 'lessonQuizFlow',
    inputSchema: QuizGenerationInputSchema,
    outputSchema: QuizGenerationOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
