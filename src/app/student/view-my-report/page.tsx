
// src/app/student/view-my-report/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Loader2, AlertTriangle, Award, CheckCircle, BarChart, LineChart, TrendingUp, Sparkles, Brain } from "lucide-react";
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart as RechartsBarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import type { ManualReport as ManualReportInterface } from '@/interfaces';
import { format } from 'date-fns';

type AIReportData = {
  overallSummary: string;
  subjectAnalyses: {
    subject: string;
    strengths: string[];
    improvementAreas: string[];
  }[];
  performanceGraphData: {
    subject: string;
    score: number;
  }[];
}

const MemoizedBarChart = React.memo(({ data }: { data: { subject: string, score: number }[] }) => {
    const chartConfig = {
      score: { label: "Score", color: "hsl(var(--chart-1))" },
    } satisfies ChartConfig;

    return (
      <ChartContainer config={chartConfig} className="w-full h-full">
        <ResponsiveContainer width="100%" height={250}>
          <RechartsBarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
            <Tooltip content={<ChartTooltipContent />} />
            <Bar dataKey="score" fill="var(--color-score)" radius={4} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </ChartContainer>
    );
});
MemoizedBarChart.displayName = 'MemoizedBarChart';


export default function StudentReportPage() {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<ManualReportInterface[]>([]);
  const [selectedReport, setSelectedReport] = useState<ManualReportInterface | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const aiAnalysis: AIReportData | null = useMemo(() => {
    if (!selectedReport?.ai_analysis) return null;
    try {
      // If ai_analysis is already an object (from JSONField), use it directly.
      // If it's a string, parse it.
      return typeof selectedReport.ai_analysis === 'string' 
        ? JSON.parse(selectedReport.ai_analysis) 
        : selectedReport.ai_analysis;
    } catch(e) {
      console.error("Could not parse AI analysis:", e);
      return null;
    }
  }, [selectedReport]);


  useEffect(() => {
    const fetchReports = async () => {
      if (!currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get<{ results: ManualReportInterface[] }>(`/manual-reports/?student=${currentUser.id}`);
        const fetchedReports = res.results || [];
        setReports(fetchedReports);
        if (fetchedReports.length > 0) {
          setSelectedReport(fetchedReports[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load report card data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [currentUser]);
  

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 p-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid lg:grid-cols-3 gap-6">
            <Skeleton className="lg:col-span-1 h-64 rounded-xl" />
            <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
        </div>
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <Card className="shadow-xl rounded-xl overflow-hidden bg-gradient-to-r from-primary to-accent text-primary-foreground">
        <CardHeader className="p-8">
            <div className="flex items-center justify-between">
                <div>
                <CardTitle className="text-3xl font-bold">My Academic Reports</CardTitle>
                <CardDescription className="text-primary-foreground/80 mt-1">View official reports and AI-powered performance analysis from your teachers.</CardDescription>
                </div>
                <FileText size={48} className="hidden sm:block"/>
            </div>
        </CardHeader>
      </Card>
      
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle>Report Archive</CardTitle>
                    <CardDescription>Select a report to view details.</CardDescription>
                </CardHeader>
                <CardContent>
                    {reports.length > 0 ? (
                        <div className="space-y-2">
                        {reports.map(report => (
                            <Button key={report.id} variant={selectedReport?.id === report.id ? "secondary" : "ghost"} className="w-full justify-start h-auto py-2" onClick={() => setSelectedReport(report)}>
                                <div className="text-left">
                                    <p className="font-semibold">{report.test_name}</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(report.report_date), 'PPP')}</p>
                                </div>
                            </Button>
                        ))}
                        </div>
                    ) : <p className="text-sm text-muted-foreground text-center py-4">No reports are available yet.</p>}
                </CardContent>
            </Card>
        </div>
        
        <div className="lg:col-span-2">
            {selectedReport ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">{selectedReport.test_name}</CardTitle>
                        <CardDescription>Official report from {format(new Date(selectedReport.report_date), 'PPP')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {aiAnalysis ? (
                            <Card className="bg-blue-50 dark:bg-blue-900/30 border-blue-200">
                                <CardHeader><CardTitle className="text-lg flex items-center text-blue-800 dark:text-blue-200"><Sparkles className="mr-2"/>AI Overall Summary</CardTitle></CardHeader>
                                <CardContent className="prose prose-sm dark:prose-invert max-w-none"><p>{aiAnalysis.overallSummary}</p></CardContent>
                            </Card>
                        ): (
                            <Card><CardHeader><CardTitle>Teacher Remarks</CardTitle></CardHeader><CardContent><p className="italic text-muted-foreground">No overall remarks provided.</p></CardContent></Card>
                        )}
                        
                        <Card>
                            <CardHeader><CardTitle>Performance Details</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Subject</TableHead>
                                            <TableHead>Score</TableHead>
                                            <TableHead>Remarks</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedReport.scores_data.map((subject: any, index: number) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{subject.subject_name}</TableCell>
                                                <TableCell>{subject.score} / {subject.max_score}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground italic">"{subject.remarks || 'N/A'}"</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>


                        {aiAnalysis && (
                            <>
                                <Card>
                                    <CardHeader><CardTitle className="text-lg flex items-center"><Brain className="mr-2"/>AI Subject Analysis</CardTitle></CardHeader>
                                    <CardContent className="space-y-4">
                                        {aiAnalysis.subjectAnalyses.map(analysis => (
                                            <div key={analysis.subject} className="p-3 border rounded-md">
                                                <h4 className="font-semibold text-base">{analysis.subject}</h4>
                                                <div className="grid md:grid-cols-2 gap-3 mt-2 text-xs">
                                                    <div className="bg-green-50 dark:bg-green-900/50 p-2 rounded"><h5 className="font-medium text-green-700 dark:text-green-300">Strengths</h5><ul className="list-disc pl-4 mt-1">{analysis.strengths.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                                                    <div className="bg-amber-50 dark:bg-amber-900/50 p-2 rounded"><h5 className="font-medium text-amber-700 dark:text-amber-300">To Improve</h5><ul className="list-disc pl-4 mt-1">{analysis.improvementAreas.map((s,i) => <li key={i}>{s}</li>)}</ul></div>
                                                </div>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className="text-lg flex items-center"><BarChart className="mr-2"/>Performance Graph</CardTitle></CardHeader>
                                    <CardContent><MemoizedBarChart data={aiAnalysis.performanceGraphData} /></CardContent>
                                </Card>
                            </>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <Card className="flex items-center justify-center h-full min-h-[300px]">
                    <p className="text-muted-foreground">Select a report from the left to view details.</p>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}

