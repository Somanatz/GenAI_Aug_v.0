'use server';
/**
 * @fileOverview Flow to translate lesson content.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { TranslateContentInput, TranslateContentInputSchema, TranslateContentOutput, TranslateContentOutputSchema } from './translate-content-types';

export async function translateContent(input: TranslateContentInput): Promise<TranslateContentOutput> {
  return translateContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'translateContentPrompt',
  input: {schema: TranslateContentInputSchema},
  output: {schema: TranslateContentOutputSchema},
  prompt: `Translate the following HTML content into {{targetLanguage}}. It is critical that you maintain all original HTML tags and structure. Only translate the text content within the tags.

HTML Content to Translate:
"""
{{{content}}}
"""

Provide only the translated HTML content.`,
});

const translateContentFlow = ai.defineFlow(
  {
    name: 'translateContentFlow',
    inputSchema: TranslateContentInputSchema,
    outputSchema: TranslateContentOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
