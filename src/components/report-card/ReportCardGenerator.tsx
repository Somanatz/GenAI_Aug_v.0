// src/components/report-card/ReportCardGenerator.tsx
'use client';

import { useState } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateFinalReportCard, FinalReportCardInput, FinalReportCardOutput } from '@/ai/flows/final-report-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, Trash2, Loader2, FileText, Star } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const testScoreSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  score: z.coerce.number().min(0, 'Score must be non-negative'),
  maxScore: z.coerce.number().min(1, 'Max score must be at least 1'),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Invalid date format" }),
});

const reportCardFormSchema = z.object({
  studentName: z.string().min(1, 'Student name is required'),
  classLevel: z.coerce.number().min(1, 'Class level must be at least 1').max(12, 'Class level cannot exceed 12'),
  testScores: z.array(testScoreSchema).min(1, 'At least one test score is required'),
});

type ReportCardFormData = z.infer<typeof reportCardFormSchema>;

export default function ReportCardGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportCardData, setReportCardData] = useState<FinalReportCardOutput | null>(null);

  const form = useForm<ReportCardFormData>({
    resolver: zodResolver(reportCardFormSchema),
    defaultValues: {
      studentName: '',
      classLevel: 1,
      testScores: [{ subject: '', score: 0, maxScore: 100, date: new Date().toISOString().split('T')[0] }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'testScores',
  });

  const onSubmit: SubmitHandler<ReportCardFormData> = async (data) => {
    setIsLoading(true);
    setError(null);
    setReportCardData(null);

    const input: FinalReportCardInput = {
      student: {
        name: data.studentName,
        classLevel: data.classLevel,
      },
      testScores: data.testScores.map(ts => ({ ...ts, date: new Date(ts.date).toLocaleDateString() })), // Format date for AI
    };

    try {
      const result = await generateFinalReportCard(input);
      setReportCardData(result);
    } catch (err) {
      console.error("Error generating report card:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl">
      <CardHeader>
        <CardTitle className="text-3xl font-poppins flex items-center">
          <FileText className="mr-3 text-primary" size={30} />
          GenAI-Campus Report Card Generator
        </CardTitle>
        <CardDescription>Enter student details and test scores to generate an AI-powered report card.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-8">
            <fieldset className="space-y-4 p-4 border rounded-lg">
              <legend className="text-lg font-semibold px-1">Student Information</legend>
              <FormField
                control={form.control}
                name="studentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class Level (1-10)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </fieldset>
            
            <fieldset className="space-y-4 p-4 border rounded-lg">
              <legend className="text-lg font-semibold px-1">Test Scores</legend>
              {fields.map((item, index) => (
                <div key={item.id} className="p-3 border rounded-md space-y-3 relative bg-secondary/30">
                   <FormLabel className="text-sm font-medium">Test Score #{index + 1}</FormLabel>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`testScores.${index}.subject`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Subject</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Mathematics" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`testScores.${index}.date`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`testScores.${index}.score`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Score Achieved</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 85" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`testScores.${index}.maxScore`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Max Possible Score</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  {fields.length > 1 && (
                     <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => remove(index)}
                        className="absolute top-2 right-2 h-7 w-7"
                        aria-label="Remove test score"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => append({ subject: '', score: 0, maxScore: 100, date: new Date().toISOString().split('T')[0] })}
                className="w-full"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Test Score
              </Button>
            </fieldset>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-4">
            <Button type="submit" disabled={isLoading} className="w-full text-lg py-6">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...
                </>
              ) : (
                "Generate Report Card"
              )}
            </Button>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardFooter>
        </form>
      </Form>

      {reportCardData && (
        <Card className="mt-8 bg-secondary">
          <CardHeader>
            <CardTitle className="text-2xl font-poppins text-primary">Generated Report Card</CardTitle>
            {reportCardData.classLeader && (
                <p className="text-sm text-accent font-semibold flex items-center">
                    <Star className="mr-2 h-5 w-5 text-amber-500 fill-amber-500" /> Class Leader: {reportCardData.classLeader}
                </p>
            )}
            {reportCardData.rank && (
                <p className="text-sm text-muted-foreground">Student Rank: {reportCardData.rank}</p>
            )}
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap bg-background p-4 rounded-md text-sm font-mono leading-relaxed shadow">
              {reportCardData.reportCard}
            </pre>
          </CardContent>
        </Card>
      )}
    </Card>
  );
}
