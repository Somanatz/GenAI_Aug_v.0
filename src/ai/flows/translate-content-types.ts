/**
 * @fileOverview Types and schemas for the translate content flow.
 */
import {z} from 'genkit';

export const TranslateContentInputSchema = z.object({
  content: z.string().describe("The HTML content to be translated."),
  targetLanguage: z.string().describe("The target language for translation (e.g., 'Spanish', 'Hindi')."),
});
export type TranslateContentInput = z.infer<typeof TranslateContentInputSchema>;

export const TranslateContentOutputSchema = z.object({
  translatedContent: z.string().describe("The translated HTML content."),
});
export type TranslateContentOutput = z.infer<typeof TranslateContentOutputSchema>;
