
// src/app/teacher/analytics/[studentId]/page.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, BarChart3, CheckCircle, Clock, BookOpen, Percent, CalendarDays, Activity, PieChart as PieChartIcon, LineChart, AlertTriangle, ListChecks, Star, BarChartHorizontal, LogIn } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, Line } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { User as UserInterface } from '@/interfaces';
import Link from 'next/link';

interface AnalyticsData {
  today_study_minutes: number;
  weekly_study_minutes: { date: string; duration: number }[];
  attendance: { total_days: number; present_days: number };
  subject_distribution: { subject__name: string; total_duration: number }[];
  subject_progress: {
      subject__name: string;
      completed_lessons: number;
      total_lessons: number;
  }[];
  quiz_attempts: { lesson__title: string; attempts: number; final_score: number | null }[];
  login_timeline: {
    [date: string]: {
      first_login: string;
      login_count: number;
    };
  };
  today_subjects_studied_count: number;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function TeacherStudentAnalyticsPage() {
  const { currentUser } = useAuth();
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<UserInterface | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!currentUser || !studentId) return;
      setIsLoading(true);
      setError(null);
      try {
        const [analytics, studentData] = await Promise.all([
            api.get<AnalyticsData>(`/progress-analytics/?user_id=${studentId}`),
            api.get<UserInterface>(`/users/${studentId}/`)
        ]);
        setAnalyticsData(analytics);
        setStudent(studentData);
      } catch (err) {
        console.error("Failed to fetch student analytics data:", err);
        setError(err instanceof Error ? err.message : "Could not load progress data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [currentUser, studentId]);

  const subjectDistributionData = useMemo(() => analyticsData?.subject_distribution.map((d, i) => ({
    name: d.subject__name,
    value: d.total_duration,
    fill: COLORS[i % COLORS.length]
  })) || [], [analyticsData]);

  if (isLoading) {
    return <div className="space-y-8"><Skeleton className="h-28 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }
  
  if (error || !analyticsData || !student) {
    return (
      <Card className="text-center py-10 bg-destructive/10 border-destructive">
        <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>Error Loading Data</CardTitle></CardHeader>
        <CardContent><CardDescription>{error || "Analytics data for this student could not be found."}</CardDescription></CardContent>
      </Card>
    );
  }

  const attendancePercentage = analyticsData.attendance.total_days > 0
    ? ((analyticsData.attendance.present_days / analyticsData.attendance.total_days) * 100).toFixed(1)
    : 0;
  
  const overallQuizScore = analyticsData.quiz_attempts.reduce((acc, curr) => acc + (curr.final_score || 0), 0) / (analyticsData.quiz_attempts.length || 1);

  return (
    <div className="space-y-8">
      <Button variant="outline" asChild><Link href="/teacher/students"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Students</Link></Button>
      <Card className="text-center p-6 bg-gradient-to-r from-primary to-accent rounded-xl text-white shadow-lg">
        <CardTitle className="text-3xl font-bold flex items-center justify-center">
          <BarChart3 className="mr-3 h-8 w-8 text-white" />
          Analytics for {student.student_profile?.full_name || student.username}
        </CardTitle>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Clock} title="Today's Study Time" value={`${analyticsData.today_study_minutes} Min`} />
        <StatCard icon={CheckCircle} title="Attendance Rate" value={`${attendancePercentage}%`} />
        <StatCard icon={Percent} title="Avg. Quiz Score" value={`${overallQuizScore.toFixed(1)}%`} />
        <StatCard icon={BookOpen} title="Subjects Studied Today" value={analyticsData.today_subjects_studied_count} />
      </div>
      
      <div className="grid gap-8 md:grid-cols-5">
        <Card className="md:col-span-3 shadow-lg rounded-xl">
          <CardHeader><CardTitle>Daily Study Time (Last 7 Days)</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={{ duration: { label: "Minutes", color: "hsl(var(--chart-1))" } }} className="w-full h-full">
              <BarChart data={analyticsData.weekly_study_minutes} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} tickMargin={10} axisLine={false} stroke="#888888" fontSize={12} tickFormatter={(val) => format(new Date(val), 'd MMM')} />
                <YAxis tickLine={false} axisLine={false} stroke="#888888" fontSize={12} tickFormatter={(value) => `${value}m`} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                <Bar dataKey="duration" fill="var(--color-duration)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 shadow-lg rounded-xl">
          <CardHeader><CardTitle>Subject Time Distribution</CardTitle></CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ChartContainer config={{}} className="w-full h-full">
              <PieChart>
                <Tooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                <Pie data={subjectDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                  {subjectDistributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                </Pie>
                <Legend/>
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const StatCard: React.FC<{ icon: React.ElementType, title: string, value: string | number }> = ({ icon: Icon, title, value }) => (
  <Card className="shadow-md rounded-xl hover:shadow-lg transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
    </CardContent>
  </Card>
);
