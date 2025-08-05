/**
 * @fileOverview Types and schemas for the summarize lesson flow.
 */
import {z} from 'genkit';

export const SummarizeLessonInputSchema = z.object({
  lessonContent: z.string().describe("The full text content of the lesson to summarize."),
});
export type SummarizeLessonInput = z.infer<typeof SummarizeLessonInputSchema>;

export const SummarizeLessonOutputSchema = z.object({
  summary: z.string().describe("The concise summary of the lesson, formatted as HTML with headings and lists."),
});
export type SummarizeLessonOutput = z.infer<typeof SummarizeLessonOutputSchema>;
