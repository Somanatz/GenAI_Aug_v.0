
// src/app/parent/child/[childId]/progress/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, BookOpen, Target, CheckCircle2, Activity, CalendarClock, Loader2, AlertTriangle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { api } from '@/lib/api';
import type { User, StudentProfileData, UserLessonProgress, UserQuizAttempt, Subject as SubjectInterface, Class as ClassInterface } from '@/interfaces'; 
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SubjectProgress {
  name: string;
  progress: number; 
  color?: string; 
}

interface RecentActivityItem {
  id: string;
  date: string;
  description: string;
  score?: string | null;
}

interface ChildProgressData {
  studentId: string;
  name: string;
  avatarUrl?: string;
  classLevel: string;
  overallProgress: number;
  subjects: SubjectProgress[];
  recentActivities: RecentActivityItem[];
}


const subjectProgressChartConfig = {
  progress: { label: "Progress (%)" },
} satisfies ChartConfig;


export default function ChildProgressPage() {
  const params = useParams();
  const childId = params.childId as string;
  
  const [childData, setChildData] = useState<ChildProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChildProgress = async () => {
      if (!childId) return;
      setIsLoading(true);
      setError(null);
      try {
        const studentUser = await api.get<User>(`/users/${childId}/`);
        if (!studentUser || !studentUser.student_profile) {
            throw new Error("Student profile not found.");
        }

        const lessonProgress = await api.get<UserLessonProgress[]>(`/userprogress/?user=${childId}`);
        const quizAttempts = await api.get<UserQuizAttempt[]>(`/quizattempts/?user=${childId}`);
        
        let allSubjects: SubjectInterface[] = [];
        if (studentUser.student_profile.enrolled_class) {
            const classDetails = await api.get<ClassInterface>(`/classes/${studentUser.student_profile.enrolled_class}/`);
            allSubjects = classDetails.subjects || [];
        }

        const completedLessonIds = new Set(lessonProgress.filter(p => p.completed).map(p => p.lesson));
        
        let totalLessons = 0;
        const subjectProgressData: SubjectProgress[] = allSubjects.map((subject, index) => {
            const lessonsInSubject = subject.lessons || [];
            totalLessons += lessonsInSubject.length;
            const completedInSubject = lessonsInSubject.filter(l => completedLessonIds.has(l.id)).length;
            const progress = lessonsInSubject.length > 0 ? Math.round((completedInSubject / lessonsInSubject.length) * 100) : 0;
            return {
                name: subject.name,
                progress: progress,
                color: `hsl(var(--chart-${(index % 5) + 1}))`
            };
        });

        const overallProgress = totalLessons > 0 ? Math.round((completedLessonIds.size / totalLessons) * 100) : 0;
        
        const recentActivities: RecentActivityItem[] = quizAttempts.slice(0, 5).map(attempt => ({
            id: String(attempt.id),
            date: attempt.completed_at,
            description: `Attempted Quiz: ${attempt.quiz_title}`,
            score: `${attempt.score.toFixed(0)}%`
        }));


        setChildData({
            studentId: childId,
            name: studentUser.student_profile.full_name || studentUser.username,
            avatarUrl: studentUser.student_profile.profile_picture_url,
            classLevel: studentUser.student_profile.enrolled_class_name || 'N/A',
            overallProgress: overallProgress,
            subjects: subjectProgressData,
            recentActivities: recentActivities,
        });

      } catch (err) {
        console.error("Failed to fetch child progress:", err);
        setError(err instanceof Error ? err.message : "Could not load child's progress data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchChildProgress();
  }, [childId]);


  if (isLoading) {
    return (
      <div className="space-y-8 p-4">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-12 w-1/2 rounded" />
        <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-80 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error) { 
    return (
         <Card className="text-center py-10 bg-destructive/10 border-destructive rounded-xl shadow-lg">
            <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>Error Loading Progress</CardTitle></CardHeader>
            <CardContent><CardDescription className="text-destructive-foreground">{error}</CardDescription></CardContent>
        </Card>
    );
  }
  
  if (!childData) {
      return <p>No progress data available for this child.</p>;
  }

  const chartData = childData.subjects.map(subject => ({
    name: subject.name,
    progress: subject.progress,
    fill: subject.color || `hsl(var(--chart-${(childData.subjects.indexOf(subject) % 5) + 1}))`
  }));

  return (
    <div className="space-y-8">
      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary-foreground">
              <AvatarImage src={childData.avatarUrl} alt={childData.name} data-ai-hint="child avatar"/>
              <AvatarFallback>{childData.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl font-bold">{childData.name}'s Progress</CardTitle>
              <CardDescription className="text-primary-foreground/80">Class {childData.classLevel} - Detailed Learning Journey</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><TrendingUp className="mr-2 text-accent"/>Overall Progress: {childData.overallProgress}%</CardTitle>
            </CardHeader>
            <CardContent>
               <Progress value={childData.overallProgress} aria-label={`${childData.name}'s overall progress`} className="h-4" />
            </CardContent>
          </Card>
          
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><BookOpen className="mr-2 text-primary"/>Subject Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {chartData.length > 0 ? (
                    <ChartContainer config={subjectProgressChartConfig} className="w-full h-full">
                    <BarChart data={chartData} layout="vertical" accessibilityLayer>
                        <CartesianGrid horizontal={false}/>
                        <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} className="text-xs"/>
                        <XAxis type="number" dataKey="progress" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                        <RechartsTooltip cursor={{fill: 'hsl(var(--muted))'}} content={<ChartTooltipContent hideLabel />} />
                        <Bar dataKey="progress" radius={5}>
                            {chartData.map((entry) => (
                                <rect key={entry.name} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                    </ChartContainer>
                ) : <p className="text-sm text-muted-foreground">No subject progress data available.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Target className="mr-2 text-primary"/>Active Goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Goals section can be implemented later */}
                <p className="text-sm text-muted-foreground">No active goals set. (Feature TBI)</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Activity className="mr-2 text-primary"/>Recent Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead className="text-right">Outcome/Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {childData.recentActivities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>{new Date(activity.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{activity.description}</TableCell>
                        <TableCell className="text-right">{activity.score || "N/A"}</TableCell>
                      </TableRow>
                    ))}
                    {childData.recentActivities.length === 0 && 
                        <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No recent activities.</TableCell></TableRow>
                    }
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
