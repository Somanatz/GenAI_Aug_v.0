/**
 * @fileOverview Types and schemas for the final report card generation flow.
 */
import {z} from 'genkit';

export const SubjectPerformanceSchema = z.object({
  subject: z.string().describe('The subject of the test (e.g., Mathematics, Science).'),
  score: z.number().describe('The score obtained in the test.'),
  maxScore: z.number().describe('The maximum possible score for the test.'),
  remarks: z.string().optional().describe('Qualitative feedback or remarks from the teacher about the student\'s performance in this subject.'),
});

export const StudentSchema = z.object({
  name: z.string().describe('The name of the student.'),
  classLevel: z.number().describe('The class level of the student (e.g., 1 for 1st grade).'),
});

export const FinalReportCardInputSchema = z.object({
  student: StudentSchema.describe('Information about the student.'),
  testType: z.enum(['SLIP_TEST', 'UNIT_TEST', 'QUARTERLY', 'ANNUAL']).describe('The type of test this report is for.'),
  subjectPerformances: z.array(SubjectPerformanceSchema).describe("An array of the student's performance data for each subject."),
});
export type FinalReportCardInput = z.infer<typeof FinalReportCardInputSchema>;

const SubjectAnalysisSchema = z.object({
    subject: z.string().describe("The name of the subject being analyzed."),
    strengths: z.array(z.string()).describe("A list of identified strengths for the student in this subject, based on scores and remarks."),
    improvementAreas: z.array(z.string()).describe("A list of specific areas for improvement for the student in this subject."),
});

const PerformanceGraphDataPointSchema = z.object({
    subject: z.string().describe("The subject name."),
    score: z.number().describe("The student's score percentage in this subject."),
});

export const FinalReportCardOutputSchema = z.object({
  overallSummary: z.string().describe("A comprehensive, holistic summary of the student's overall performance, attitude, and potential, written in an encouraging tone."),
  subjectAnalyses: z.array(SubjectAnalysisSchema).describe("A detailed, subject-by-subject breakdown of the student's performance."),
  performanceGraphData: z.array(PerformanceGraphDataPointSchema).describe("Data points suitable for generating a bar chart comparing performance across subjects."),
});
export type FinalReportCardOutput = z.infer<typeof FinalReportCardOutputSchema>;
