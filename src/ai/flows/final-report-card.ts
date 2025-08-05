'use server';
/**
 * @fileOverview Generates a final report card for a student based on their test scores.
 *
 * - generateFinalReportCard - A function that generates the final report card.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { FinalReportCardInput, FinalReportCardInputSchema, FinalReportCardOutput, FinalReportCardOutputSchema } from './final-report-card-types';

export async function generateFinalReportCard(input: FinalReportCardInput): Promise<FinalReportCardOutput> {
  return finalReportCardFlow(input);
}

const prompt = ai.definePrompt({
  name: 'finalReportCardPrompt',
  input: {schema: FinalReportCardInputSchema},
  output: {schema: FinalReportCardOutputSchema},
  prompt: `You are an expert educator who generates final report cards for students.

  Analyze the student's performance across all subjects and tests taken during the year.
  Provide a summary of their overall academic progress, highlighting strengths and areas for improvement.
  If applicable, identify the class leader based on overall performance and determine the student's rank in the class.

  Student Information:
  Name: {{{student.name}}}
  Class Level: {{{student.classLevel}}}

  Test Scores:
  {{#each testScores}}
  - Subject: {{{subject}}}, Score: {{{score}}}/{{{maxScore}}}, Date: {{{date}}}
  {{/each}}
  \n
  Report Card:`, 
});

const finalReportCardFlow = ai.defineFlow(
  {
    name: 'finalReportCardFlow',
    inputSchema: FinalReportCardInputSchema,
    outputSchema: FinalReportCardOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
