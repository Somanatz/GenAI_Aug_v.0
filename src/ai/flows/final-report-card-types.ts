/**
 * @fileOverview Types and schemas for the final report card generation flow.
 */
import {z} from 'genkit';

export const TestScoreSchema = z.object({
  subject: z.string().describe('The subject of the test.'),
  score: z.number().describe('The score obtained in the test.'),
  maxScore: z.number().describe('The maximum possible score for the test.'),
  date: z.string().describe('The date when the test was taken.'),
});

export const StudentSchema = z.object({
  name: z.string().describe('The name of the student.'),
  classLevel: z.number().describe('The class level of the student (e.g., 1 for 1st grade).'),
});

export const FinalReportCardInputSchema = z.object({
  student: StudentSchema.describe('Information about the student.'),
  testScores: z.array(TestScoreSchema).describe('An array of test scores for the student.'),
});
export type FinalReportCardInput = z.infer<typeof FinalReportCardInputSchema>;

export const FinalReportCardOutputSchema = z.object({
  reportCard: z.string().describe('The generated final report card.'),
  classLeader: z.string().optional().describe('The name of the class leader, if applicable.'),
  rank: z.number().optional().describe('The student rank in class, if applicable.'),
});
export type FinalReportCardOutput = z.infer<typeof FinalReportCardOutputSchema>;
