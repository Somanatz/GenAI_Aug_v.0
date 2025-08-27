

'use client';

import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateFinalReportCard, FinalReportCardInput, FinalReportCardOutput } from '@/ai/flows/final-report-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PlusCircle, Trash2, Loader2, FileText, Star, Search, User, Edit, FileUp, ListRestart, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { User as UserInterface, SchoolClass, Subject as SubjectInterface, ManualReport } from '@/interfaces';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Separator } from '../ui/separator';

const subjectPerformanceSchema = z.object({
  subject_name: z.string().min(1, 'Subject is required'),
  score: z.coerce.number().min(0, 'Score must be non-negative'),
  max_score: z.coerce.number().min(1, 'Max score must be at least 1'),
  remarks: z.string().optional(),
});

const reportCardFormSchema = z.object({
  studentId: z.string().min(1, "Please select a student"),
  test_type: z.enum(['SLIP_TEST', 'UNIT_TEST', 'QUARTERLY', 'ANNUAL']),
  test_name: z.string().min(1, "Test name is required"),
  report_date: z.string().refine((date) => date && !isNaN(Date.parse(date)), { message: "A valid date is required." }),
  subjectPerformances: z.array(subjectPerformanceSchema).min(1, 'At least one subject score is required'),
});


type ReportCardFormData = z.infer<typeof reportCardFormSchema>;

type TestType = 'SLIP_TEST' | 'UNIT_TEST' | 'QUARTERLY' | 'ANNUAL';
const testTypes: TestType[] = ['SLIP_TEST', 'UNIT_TEST', 'QUARTERLY', 'ANNUAL'];

const performanceBarChartConfig = {
  score: { label: "Score (%)", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

// Define chart colors from theme
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function ReportCardGenerator() {
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReport, setGeneratedReport] = useState<FinalReportCardOutput | null>(null);

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedTestType, setSelectedTestType] = useState<TestType | null>(null);
  
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<UserInterface[]>([]);
  const [subjects, setSubjects] = useState<SubjectInterface[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [selectedStudent, setSelectedStudent] = useState<UserInterface | null>(null);
  const [reportHistory, setReportHistory] = useState<ManualReport[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [studentSearchOpen, setStudentSearchOpen] = useState(false);


  const form = useForm<ReportCardFormData>({
    resolver: zodResolver(reportCardFormSchema),
    defaultValues: {
        test_name: '',
        studentId: '',
        report_date: format(new Date(), 'yyyy-MM-dd'),
        subjectPerformances: [{ subject_name: '', score: 0, max_score: 100, remarks: '' }]
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'subjectPerformances',
  });
  
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!currentUser?.teacher_profile) {
        setIsDataLoading(false);
        return;
      }
      setIsDataLoading(true);
      try {
        const assignedClasses = currentUser.teacher_profile.assigned_classes_details || [];
        setClasses(assignedClasses as any);
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load assigned classes.', variant: 'destructive' });
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchInitialData();
  }, [currentUser, toast]);
  
  useEffect(() => {
    const fetchClassData = async () => {
      if (!selectedClassId) {
        setStudents([]);
        setSubjects([]);
        return;
      }
      setIsDataLoading(true);
      setSelectedStudent(null);
      form.reset({
        ...form.getValues(),
        studentId: '',
        subjectPerformances: [{ subject_name: '', score: 0, max_score: 100, remarks: '' }],
      });
      try {
        const schoolClassDetails = classes.find(c => String(c.id) === selectedClassId);
        if (!schoolClassDetails) throw new Error("Could not find class details.");

        const [studentsRes, subjectsRes] = await Promise.all([
          api.get<{ results: UserInterface[] }>(`/users/?student_profile__enrolled_class=${selectedClassId}`),
          api.get<{ results: SubjectInterface[] }>(`/subjects/?master_class=${schoolClassDetails.master_class}`)
        ]);
        setStudents(studentsRes.results || []);
        setSubjects(subjectsRes.results || []);
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load data for the selected class.', variant: 'destructive' });
      } finally {
        setIsDataLoading(false);
      }
    };
    fetchClassData();
  }, [selectedClassId, toast, form, classes]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedStudent) {
        setReportHistory([]);
        return;
      }
      setIsHistoryLoading(true);
      try {
        const historyRes = await api.get<{ results: ManualReport[] }>(`/manual-reports/?student=${selectedStudent.id}`);
        setReportHistory(historyRes.results || []);
      } catch (err) {
        toast({ title: 'Error', description: 'Could not load report history.', variant: 'destructive' });
      } finally {
        setIsHistoryLoading(false);
      }
    };
    fetchHistory();
  }, [selectedStudent, toast]);

  const handleEditReport = (report: ManualReport) => {
    setEditingReportId(report.id);
    form.reset({
      studentId: String(report.student),
      test_type: report.test_type,
      test_name: report.test_name,
      report_date: format(new Date(report.report_date), 'yyyy-MM-dd'),
      subjectPerformances: report.scores_data
    });
    setSelectedTestType(report.test_type);
    
    if (report.ai_analysis) {
        setGeneratedReport(report.ai_analysis);
    } else {
        setGeneratedReport(null);
    }
  };
  
  const resetFormAndSelection = () => {
    setEditingReportId(null);
    setSelectedStudent(null);
    form.reset({
        ...form.getValues(),
        studentId: '',
        test_name: '',
        subjectPerformances: [{ subject_name: '', score: 0, max_score: 100, remarks: '' }],
    });
    replace([]);
    append({ subject_name: '', score: 0, max_score: 100, remarks: '' });
    setGeneratedReport(null);
    setError(null);
  };

  const onSubmit: SubmitHandler<ReportCardFormData> = async (data) => {
    if (!selectedStudent) {
      toast({ title: "No student selected", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedReport(null);

    const aiInput: FinalReportCardInput = {
      student: { name: selectedStudent.student_profile?.full_name || selectedStudent.username, classLevel: 0 },
      testType: data.test_type,
      subjectPerformances: data.subjectPerformances.map(p => ({
        subject: p.subject_name,
        score: p.score,
        maxScore: p.max_score,
        remarks: p.remarks || 'No specific remarks.',
      })),
    };

    try {
      const result = await generateFinalReportCard(aiInput);
      setGeneratedReport(result);
      
      const payload = {
          student: selectedStudent.id,
          school: currentUser?.teacher_profile?.school,
          test_type: data.test_type,
          test_name: data.test_name,
          report_date: data.report_date,
          scores_data: data.subjectPerformances,
          ai_analysis: result,
      };
      
      if(editingReportId) {
         await api.patch(`/manual-reports/${editingReportId}/`, payload);
      } else {
         await api.post('/manual-reports/', payload);
      }

      toast({ title: "Report Saved!", description: "The new report has been saved successfully." });
      
      const historyRes = await api.get<{ results: ManualReport[] }>(`/manual-reports/?student=${selectedStudent.id}`);
      setReportHistory(historyRes.results || []);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      toast({ title: "Generation/Save Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const MemoizedBarChart = React.memo(({ data }: { data: { subject: string, score: number }[] }) => (
    <ChartContainer config={performanceBarChartConfig} className="w-full h-full">
      <ResponsiveContainer width="100%" height={250}>
        <RechartsBarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid horizontal={false} />
          <XAxis type="number" dataKey="score" domain={[0, 100]} tickFormatter={(val) => `${val}%`}/>
          <YAxis dataKey="subject" type="category" tick={{ fontSize: 12 }} width={80}/>
          <Tooltip content={<ChartTooltipContent />} />
          <Bar dataKey="score" radius={4}>
             {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </ChartContainer>
  ));
  MemoizedBarChart.displayName = 'MemoizedBarChart';
  
  return (
    <>
    {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Generating Insights...</p>
        </div>
    )}
    <div className="space-y-8 max-w-5xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-poppins flex items-center"><FileText className="mr-3 text-primary" size={30} /> AI Report Card Generator</CardTitle>
          <CardDescription>Select a class and test type to begin creating a student report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Test Type</Label>
              <Select onValueChange={(v) => {setSelectedTestType(v as TestType); form.setValue('test_type', v as TestType);}} value={selectedTestType || ''}>
                <SelectTrigger><SelectValue placeholder="Select a test type..." /></SelectTrigger>
                <SelectContent>{testTypes.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select onValueChange={setSelectedClassId} disabled={isDataLoading}>
                <SelectTrigger><SelectValue placeholder={isDataLoading ? "Loading classes..." : "Select a class..."}/></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {selectedClassId && selectedTestType && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Create Report for {selectedTestType.replace('_',' ')}</CardTitle>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-8">
                <div className="space-y-2">
                  <Label>Select Student</Label>
                  <Controller
                      control={form.control}
                      name="studentId"
                      render={({ field }) => (
                          <Popover open={studentSearchOpen} onOpenChange={setStudentSearchOpen}>
                              <PopoverTrigger asChild>
                                  <Button variant="outline" role="combobox" className="w-full justify-between">
                                      {selectedStudent ? (
                                          <div className="flex items-center gap-2"><User className="h-4 w-4" />{selectedStudent.student_profile?.full_name || selectedStudent.username} (ID: {selectedStudent.id})</div>
                                      ) : 'Select student...'}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                  <Command>
                                      <CommandInput placeholder="Search student..." />
                                      <CommandEmpty>No student found.</CommandEmpty>
                                      <CommandList>
                                        <CommandGroup>
                                            {students.map(student => (
                                                <CommandItem key={student.id} value={student.student_profile?.full_name || student.username} onSelect={() => {
                                                    setSelectedStudent(student);
                                                    field.onChange(String(student.id));
                                                    setStudentSearchOpen(false);
                                                }}>
                                                    <Check className={cn("mr-2 h-4 w-4", field.value === String(student.id) ? "opacity-100" : "opacity-0")} />
                                                    <div>
                                                        <p>{student.student_profile?.full_name || student.username}</p>
                                                        <p className="text-xs text-muted-foreground">ID: {student.id} | Class: {student.student_profile?.enrolled_class_name}</p>
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                      </CommandList>
                                  </Command>
                              </PopoverContent>
                          </Popover>
                      )}
                  />
                  <FormMessage>{form.formState.errors.studentId?.message}</FormMessage>
                </div>
              
              {selectedStudent && (
                 <fieldset className="space-y-4 p-4 border rounded-lg">
                  <legend className="text-lg font-semibold px-1">Test &amp; Subject Details</legend>
                  <div className="grid md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="test_name" render={({ field }) => (
                          <FormItem><FormLabel>Test Name</FormLabel><FormControl><Input placeholder="e.g., Mid-Term Exam" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="report_date" render={({ field }) => (
                          <FormItem><FormLabel>Test Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                  </div>
                  {fields.map((item, index) => (
                    <div key={item.id} className="p-3 border rounded-md space-y-3 relative bg-secondary/30">
                      <div className="flex justify-between items-center"><FormLabel className="text-sm font-medium">Subject #{index + 1}</FormLabel><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                       <FormField control={form.control} name={`subjectPerformances.${index}.subject_name`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs">Subject</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select subject"/></SelectTrigger></FormControl>
                              <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                            </Select>
                          <FormMessage /></FormItem>
                       )}/>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name={`subjectPerformances.${index}.score`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Score</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                        <FormField control={form.control} name={`subjectPerformances.${index}.max_score`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Max Score</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                      </div>
                      <FormField control={form.control} name={`subjectPerformances.${index}.remarks`} render={({ field }) => (
                          <FormItem><FormLabel className="text-xs">Teacher Remarks (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Excellent grasp of concepts, but needs practice in application." {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                      )}/>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={() => append({ subject_name: '', score: 0, max_score: 100, remarks: '' })}><PlusCircle className="mr-2 h-4 w-4" /> Add Subject</Button>
                </fieldset>
              )}
              </CardContent>
              <CardFooter>
                 <Button type="submit" disabled={isLoading || !selectedStudent} className="w-full text-lg py-6">{isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : editingReportId ? "Update &amp; Regenerate Report" : "Generate Report"}</Button>
              </CardFooter>
            </form>
          </Form>

           {error && <Alert variant="destructive" className="m-6 mt-0"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

           {generatedReport && (
            <div className="p-6 space-y-6">
                <Separator />
                <h3 className="text-2xl font-bold text-center">Generated AI Report</h3>
                <Card className="bg-blue-50 dark:bg-blue-900/30">
                    <CardHeader><CardTitle className="text-blue-700 dark:text-blue-300">Overall Summary</CardTitle></CardHeader>
                    <CardContent className="prose prose-sm dark:prose-invert max-w-none"><p>{generatedReport.overallSummary}</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Subject Performance Analysis</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {generatedReport.subjectAnalyses.map(analysis => (
                            <div key={analysis.subject} className="p-4 border rounded-md">
                                <h4 className="font-semibold text-lg text-primary">{analysis.subject}</h4>
                                <div className="grid md:grid-cols-2 gap-4 mt-2">
                                    <div className="bg-green-50 dark:bg-green-900/50 p-3 rounded-md"><h5 className="font-medium text-sm text-green-700 dark:text-green-300">Strengths</h5><ul className="list-disc pl-5 mt-1 text-xs">{analysis.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                                    <div className="bg-amber-50 dark:bg-amber-900/50 p-3 rounded-md"><h5 className="font-medium text-sm text-amber-700 dark:text-amber-300">Areas for Improvement</h5><ul className="list-disc pl-5 mt-1 text-xs">{analysis.improvementAreas.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card><CardHeader><CardTitle>Performance Graph</CardTitle></CardHeader><CardContent><MemoizedBarChart data={generatedReport.performanceGraphData} /></CardContent></Card>
            </div>
           )}

            {selectedStudent && (
                <div className="p-6 space-y-4">
                    <Separator />
                    <h3 className="text-xl font-semibold">Report History for {selectedStudent.student_profile?.full_name}</h3>
                    {isHistoryLoading ? <Skeleton className="h-24 w-full"/> : reportHistory.length > 0 ? (
                        <div className="space-y-2">
                            {reportHistory.map(report => (
                                <div key={report.id} className="flex justify-between items-center p-3 border rounded-md">
                                    <div>
                                        <p className="font-medium">{report.test_name} ({report.test_type.replace('_',' ')})</p>
                                        <p className="text-xs text-muted-foreground">Date: {format(new Date(report.report_date), 'PPP')} | By: {report.created_by_username || 'N/A'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => handleEditReport(report)}><Edit className="mr-2 h-4"/>Edit</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-muted-foreground">No past reports found for this student.</p>}
                </div>
            )}
        </Card>
      )}
    </div>
    </>
  );
}
