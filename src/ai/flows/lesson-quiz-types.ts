/**
 * @fileOverview Types and schemas for the lesson quiz generation flow.
 */
import {z} from 'genkit';

export const QuizQuestionSchema = z.object({
  question_text: z.string().describe("The text of the quiz question."),
  question_type: z.enum(['multiple_choice', 'true_false', 'fill_in_the_blank']).describe("The type of the question."),
  options: z.array(z.string()).optional().describe("A list of possible answers for multiple-choice questions."),
  correct_answer: z.string().describe("The correct answer for the question. For true/false, this should be 'True' or 'False'."),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe("The difficulty level of the question."),
});
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizGenerationInputSchema = z.object({
  lessonContent: z.string().describe("The full text content of the lesson to generate a quiz from (If lesson content is telugu/hindi generate questions on true/false, multiple choices, and find the incorrect sentence from list of options)."),
});
export type QuizGenerationInput = z.infer<typeof QuizGenerationInputSchema>;

export const QuizGenerationOutputSchema = z.object({
  questions: z.array(QuizQuestionSchema).describe("An array of 25 generated quiz questions."),
});
export type QuizGenerationOutput = z.infer<typeof QuizGenerationOutputSchema>;
