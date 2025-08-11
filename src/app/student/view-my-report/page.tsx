
// src/app/student/view-my-report/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, UserCircle, BarChartBig, MessageSquare, Loader2, AlertTriangle, FileText, CheckCircle, Award } from "lucide-react";
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import type { AILessonQuizAttempt } from '@/interfaces';

type TestType = 'SLIP_TEST' | 'UNIT_TEST' | 'QUARTERLY' | 'ANNUAL';

interface ManualReportData {
  id: string | number;
  subject_name: string;
  test_name: string;
  test_type: TestType;
  score: number;
  max_score: number;
  grade: string;
  report_date: string;
  remarks: string;
}

interface AIQuizReportData {
  id: number;
  lesson_title: string;
  lesson_subject_name: string;
  score: number;
  passed: boolean;
  attempted_at: string;
}

export default function StudentReportPage() {
  const { currentUser } = useAuth();
  const [manualReports, setManualReports] = useState<ManualReportData[]>([]);
  const [aiQuizAttempts, setAIQuizAttempts] = useState<AIQuizReportData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const [manualReportsRes, aiQuizzesRes] = await Promise.all([
          api.get<{ results: ManualReportData[] }>(`/manual-reports/?student=${currentUser.id}`),
          api.get<{ results: AIQuizReportData[] }>(`/ai-quiz-attempts/?user=${currentUser.id}`)
        ]);
        
        setManualReports(manualReportsRes.results || []);
        setAIQuizAttempts(aiQuizzesRes.results || []);

      } catch (err) {
        console.error("Failed to fetch report card data:", err);
        setError(err instanceof Error ? err.message : "Could not load report card data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [currentUser]);

  const overallAverage = useMemo(() => {
    if (manualReports.length === 0) return 0;
    const totalPercentage = manualReports.reduce((sum, item) => sum + (item.score / item.max_score * 100), 0);
    return totalPercentage / manualReports.length;
  }, [manualReports]);
  
  const subjectAverages = useMemo(() => {
    const subjectData: Record<string, { totalPercentage: number, count: number }> = {};
    manualReports.forEach(attempt => {
        if (!subjectData[attempt.subject_name]) {
            subjectData[attempt.subject_name] = { totalPercentage: 0, count: 0 };
        }
        subjectData[attempt.subject_name].totalPercentage += (attempt.score / attempt.max_score * 100);
        subjectData[attempt.subject_name].count++;
    });

    return Object.entries(subjectData).map(([name, data]) => ({
      name,
      average: data.totalPercentage / data.count,
    })).sort((a,b) => b.average - a.average);
  }, [manualReports]);

  const topSubjects = useMemo(() => subjectAverages.slice(0, 3), [subjectAverages]);

  const barChartConfig = {
    average: { label: "Avg. Score", color: "hsl(var(--chart-1))" },
  } satisfies ChartConfig;


  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 p-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
         <Card className="text-center py-10 bg-destructive/10 border-destructive rounded-xl shadow-lg">
            <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>Error Loading Reports</CardTitle></CardHeader>
            <CardContent><CardDescription className="text-destructive-foreground">{error}</CardDescription></CardContent>
        </Card>
    );
  }

  const renderManualReportTable = (data: ManualReportData[], title: string) => (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
           <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Test Name</TableHead>
                        <TableHead className="text-center">Score</TableHead>
                        <TableHead className="text-center">Grade</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {data.map((item) => (
                    <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.subject_name}</TableCell>
                    <TableCell>{item.test_name}</TableCell>
                    <TableCell className="text-center">{item.score.toFixed(1)} / {item.max_score.toFixed(1)}</TableCell>
                    <TableCell className="text-center font-semibold">{item.grade}</TableCell>
                    <TableCell>{new Date(item.report_date).toLocaleDateString()}</TableCell>
                    <TableCell className="italic text-muted-foreground">{item.remarks}</TableCell>
                    <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => alert('Download TBI')}><Download className="h-4 w-4"/></Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
           </div>
        ) : <p className="text-muted-foreground text-center py-4">No {title} reports available yet.</p>}
      </CardContent>
    </Card>
  );
  
  const renderAIQuizTable = (data: AIQuizReportData[]) => (
     <Card>
      <CardHeader>
        <CardTitle>AI Quiz & Practice History</CardTitle>
        <CardDescription>Results from automated quizzes used to unlock lessons and for practice.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
           <div className="overflow-x-auto rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Lesson/Quiz Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead className="text-center">Score (%)</TableHead>
                        <TableHead className="text-center">Result</TableHead>
                        <TableHead>Date</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {data.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.lesson_title}</TableCell>
                        <TableCell>{item.lesson_subject_name}</TableCell>
                        <TableCell className="text-center font-semibold">{item.score.toFixed(0)}%</TableCell>
                        <TableCell className="text-center">
                            {item.passed ? <span className="text-green-600 font-bold">Passed</span> : <span className="text-red-600">Failed</span>}
                        </TableCell>
                        <TableCell>{new Date(item.attempted_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
           </div>
        ) : <p className="text-muted-foreground text-center py-4">No AI quiz attempts found.</p>}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card className="shadow-xl rounded-xl overflow-hidden bg-gradient-to-r from-primary to-accent text-primary-foreground">
        <CardHeader className="p-8">
            <div className="flex items-center justify-between">
                <div>
                <CardTitle className="text-3xl font-bold">My Academic Report</CardTitle>
                <CardDescription className="text-primary-foreground/80 mt-1">A comprehensive summary of your performance.</CardDescription>
                </div>
                <FileText size={48} className="hidden sm:block"/>
            </div>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Overall Official Performance</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-4">
                <div className="p-4 bg-secondary rounded-lg text-center">
                    <p className="text-sm font-medium text-muted-foreground">Official Average Score</p>
                    <p className="text-4xl font-bold text-primary">{overallAverage.toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-secondary rounded-lg">
                    <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center"><Award className="mr-2 h-4 w-4 text-amber-500"/>Top Performing Subjects</p>
                    {topSubjects.length > 0 ? (
                        <ul className="space-y-1 text-sm">
                            {topSubjects.map(s => (
                                <li key={s.name} className="flex justify-between font-medium">
                                    <span>{s.name}</span>
                                    <span className="text-green-600">{s.average.toFixed(1)}%</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-xs text-muted-foreground">No official test data available.</p>}
                </div>
            </div>
            <div className="md:col-span-2 h-64">
              <ChartContainer config={barChartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectAverages}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 12}} angle={-15} textAnchor="end" height={50}/>
                        <YAxis tickFormatter={(val) => `${val}%`} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="average" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="official_reports" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="official_reports">Official Reports</TabsTrigger>
          <TabsTrigger value="ai_quizzes">Practice & AI Quizzes</TabsTrigger>
        </TabsList>
        <TabsContent value="official_reports" className="mt-4">
            {renderManualReportTable(manualReports.filter(r => r.test_type), 'All Official Tests')}
        </TabsContent>
        <TabsContent value="ai_quizzes" className="mt-4">
            {renderAIQuizTable(aiQuizAttempts)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
