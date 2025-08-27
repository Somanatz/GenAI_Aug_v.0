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
  prompt: `You are an expert, compassionate, and insightful educator tasked with generating a student report card.

  **Your Task:**
  1.  **Analyze Holistically**: Review the student's information, the type of test, and the performance data for each subject, including both the quantitative scores and the qualitative teacher remarks.
  2.  **Generate Subject-Specific Analysis**: For each subject, provide a balanced analysis.
      -   Identify at least one specific **strength**, referencing the score or remarks (e.g., "Excellent problem-solving skills reflected in a high score" or "Teacher's note on 'active participation' shows great engagement").
      -   Identify at least one constructive **area for improvement**, phrasing it positively (e.g., "Can focus more on 'chemical equations' to solidify understanding" or "Improving consistency in homework submission will further boost their grades").
  3.  **Write an Overall Summary**: Synthesize all the information into a comprehensive, encouraging summary. This should touch upon the student's general academic standing, attitude, and potential. Avoid generic phrases.
  4.  **Prepare Graph Data**: Format the scores into a simple array of objects, with each object containing the subject name and the score percentage, suitable for a bar chart. Calculate the percentage score as (score / maxScore) * 100.

  **Input Data:**

  - **Student Name:** {{{student.name}}}
  - **Class Level:** {{{student.classLevel}}}
  - **Test Type:** {{{testType}}}

  - **Subject Performances:**
    {{#each subjectPerformances}}
    - **Subject:** {{{subject}}}
      - **Score:** {{{score}}} out of {{{maxScore}}}
      - **Teacher's Remarks:** "{{{remarks}}}"
    {{/each}}

  Please generate the report now according to the specified JSON output format.
  `, 
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
