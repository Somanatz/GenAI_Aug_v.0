
// src/app/student/progress/page.tsx
'use client';

import React from 'react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, CheckCircle, Clock, TrendingUp, BookOpen, Percent, CalendarDays, Activity, PieChart as PieChartIcon, LineChart, AlertTriangle, ListChecks, Star, ChevronLeft, ChevronRight, BarChartHorizontal, LogIn } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, Line, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format, formatDistanceToNow, startOfWeek, endOfWeek, startOfMonth, endOfMonth, add, sub, getWeeksInMonth, getDaysInMonth, getDate } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';


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

interface RecentActivityItem {
    id: number;
    activity_type: string;
    details: string;
    timestamp: string;
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function StudentProgressPage() {
  const { currentUser } = useAuth();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (isInitialLoad = false) => {
    if (!currentUser) return;
    if (isInitialLoad) setIsLoading(true);
    setError(null);
    try {
      const [analytics, activitiesResponse] = await Promise.all([
          api.get<AnalyticsData>('/progress-analytics/'),
          api.get<{ results: RecentActivityItem[] }>(`/recent-activities/?user=${currentUser.id}&page_size=20`)
      ]);
      setAnalyticsData(analytics);
      setRecentActivities(activitiesResponse.results || []);

    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
      setError(err instanceof Error ? err.message : "Could not load progress data.");
    } finally {
      if (isInitialLoad) setIsLoading(false);
    }
  }, [currentUser]);


  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (!isLoading && currentUser) { 
      interval = setInterval(() => fetchAnalytics(false), 60000); 
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoading, fetchAnalytics, currentUser]);
  
  useEffect(() => {
    fetchAnalytics(true);
  }, [fetchAnalytics]);


  const subjectDistributionData = useMemo(() => analyticsData?.subject_distribution.map((d, i) => ({
    name: d.subject__name,
    value: d.total_duration,
    fill: COLORS[i % COLORS.length]
  })) || [], [analyticsData]);

  const subjectProgressRadarData = useMemo(() => analyticsData?.subject_progress.map(p => ({
    subject: p.subject__name,
    progress: p.total_lessons > 0 ? (p.completed_lessons / p.total_lessons) * 100 : 0,
    fullMark: 100,
  })) || [], [analyticsData]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
         <Skeleton className="h-96 w-full rounded-xl" />
        <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="h-80 w-full rounded-xl" />
            <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
    );
  }
  
  if (error || !analyticsData) {
    return (
      <Card className="text-center py-10 bg-destructive/10 border-destructive rounded-xl">
        <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>Error Loading Progress</CardTitle></CardHeader>
        <CardContent><CardDescription className="text-destructive-foreground">{error || "No analytics data available."}</CardDescription></CardContent>
      </Card>
    );
  }

  const attendancePercentage = analyticsData.attendance.total_days > 0
    ? ((analyticsData.attendance.present_days / analyticsData.attendance.total_days) * 100).toFixed(1)
    : 0;
  
  const overallQuizScore = analyticsData.quiz_attempts.reduce((acc, curr) => acc + (curr.final_score || 0), 0) / (analyticsData.quiz_attempts.filter(q => q.final_score !== null).length || 1);


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center">
            <BarChart3 className="mr-3 h-7 w-7 text-primary" /> My Progress Dashboard
          </CardTitle>
          <CardDescription>
            A detailed look at your learning journey, habits, and achievements.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Clock} title="Today's Study Time" value={`${analyticsData.today_study_minutes} Min`} note="Keep up the great work!"/>
        <StatCard icon={CheckCircle} title="Attendance Rate" value={`${attendancePercentage}%`} note={`${analyticsData.attendance.present_days} of ${analyticsData.attendance.total_days} days`}/>
        <StatCard icon={Percent} title="Overall Average Quiz Score" value={`${overallQuizScore.toFixed(1)}%`} note="Average on passed quizzes"/>
        <StatCard icon={BookOpen} title="Subjects Studied Today" value={analyticsData.today_subjects_studied_count} note="Stay focused!"/>
      </div>
       <Card className="shadow-lg rounded-xl">
            <CardHeader><CardTitle>Subject Progress</CardTitle><CardDescription>Your completion progress for each subject.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
    <div className="h-[350px]">
        <ChartContainer config={{ progress: { label: "Progress (%)" } }} className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={subjectProgressRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tickFormatter={(val) => `${val}%`}/>
                    <Radar name="Progress" dataKey="progress" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.6} />
                    <Tooltip content={<ChartTooltipContent />} />
                </RadarChart>
            </ResponsiveContainer>
        </ChartContainer>
    </div>
    <div className="space-y-4">
        {analyticsData.subject_progress.map(p => {
            const percentage = p.total_lessons > 0 ? (p.completed_lessons / p.total_lessons) * 100 : 0;
            return (
                <div key={p.subject__name}>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-muted-foreground">{p.subject__name}</span>
                        <span className="text-foreground">{p.completed_lessons} / {p.total_lessons} lessons</span>
                    </div>
                    <Progress value={percentage} aria-label={`${p.subject__name} progress`} />
                </div>
            )
        })}
    </div>
</CardContent>
        </Card>
      
      <div className="grid gap-8 md:grid-cols-5">
        <Card className="lg:col-span-3 shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Daily Study Time (Last 7 Days)</CardTitle>
          </CardHeader>
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
        
        <Card className="lg:col-span-2 shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Subject Time Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
             {subjectDistributionData.length > 0 ? (
                <ChartContainer config={{}} className="w-full h-full">
                  <PieChart>
                    <Tooltip content={<ChartTooltipContent hideLabel nameKey="name" />} />
                    <Pie data={subjectDistributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {subjectDistributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}
                    </Pie>
                    <Legend/>
                  </PieChart>
                </ChartContainer>
            ) : (
                <p className="text-sm text-muted-foreground text-center">No subject study time recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <LoginActivityTimeline data={analyticsData.login_timeline} />
        <QuizPerformance data={analyticsData.quiz_attempts} />
      </div>
      <Card className="shadow-lg rounded-xl">
            <CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>A timeline of your latest actions.</CardDescription></CardHeader>
            <CardContent>
                <ActivityFeed activities={recentActivities} />
            </CardContent>
      </Card>
    </div>
  );
}

// Helper Components
const StatCard: React.FC<{ icon: React.ElementType, title: string, value: string | number, note: string }> = ({ icon: Icon, title, value, note }) => (
  <Card className="shadow-md rounded-xl hover:shadow-lg transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-5 w-5 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{note}</p>
    </CardContent>
  </Card>
);

const LoginActivityTimeline = ({ data }: { data: AnalyticsData['login_timeline']}) => {
    const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
    const [currentDate, setCurrentDate] = useState(new Date());

    const { periodDates, periodLabel } = useMemo(() => {
        if (viewMode === 'weekly') {
            const start = startOfWeek(currentDate, { weekStartsOn: 1 });
            const end = endOfWeek(currentDate, { weekStartsOn: 1 });
            const dates = [];
            for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                dates.push(new Date(dt));
            }
            const label = `${format(start, 'd MMM yyyy')} - ${format(end, 'd MMM yyyy')}`;
            return { periodDates: dates, periodLabel: label };
        } else { // monthly
            const start = startOfMonth(currentDate);
            const daysInMonth = getDaysInMonth(start);
            const dates = Array.from({ length: daysInMonth }, (_, i) => add(start, { days: i }));
            const label = format(start, 'MMMM yyyy');
            return { periodDates: dates, periodLabel: label };
        }
    }, [currentDate, viewMode]);

    const handleNav = (direction: 'prev' | 'next') => {
        const amount = direction === 'prev' ? -1 : 1;
        setCurrentDate(add(currentDate, viewMode === 'weekly' ? { weeks: amount } : { months: amount }));
    };
    
    const dayGridClass = viewMode === 'weekly' ? 'grid-cols-7' : 'grid-cols-7'; // Monthly could be grid-rows-5 for calendar layout

    return (
        <Card className="shadow-lg rounded-xl">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <CardTitle className="text-base font-bold flex items-center"><LogIn className="mr-2 h-5 w-5 text-primary"/>Login Activity</CardTitle>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleNav('prev')} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
                        <span className="text-sm font-medium text-muted-foreground text-center w-40">{periodLabel}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleNav('next')} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
                        <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'weekly' | 'monthly')}>
                            <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                 <div className={cn("grid gap-1", dayGridClass)}>
                    {viewMode === 'monthly' && Array.from({length: (startOfMonth(currentDate).getDay() + 6) % 7}).map((_, i) => <div key={`empty-${i}`} />)}
                    {periodDates?.map(date => {
                        const dateStr = format(date, 'yyyy-MM-dd');
                        const dayData = data[dateStr];
                        const loginCount = dayData ? dayData.login_count : 0;
                        const firstLogin = dayData ? format(new Date(dayData.first_login), 'p') : 'N/A';
                        
                        let bgColor = 'bg-muted/30';
                        if (loginCount > 0) bgColor = 'bg-green-200 dark:bg-green-900';
                        if (loginCount > 2) bgColor = 'bg-green-400 dark:bg-green-700';
                        if (viewMode === 'weekly') {
                            return (
                                <TooltipProvider key={dateStr} delayDuration={100}>
                                    <UiTooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs text-muted-foreground">{format(date, 'E')}</span>
                                                <div className={`h-10 w-10 flex items-center justify-center rounded-md text-xs font-bold ${bgColor}`}>
                                                    {format(date, 'd')}
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{format(date, 'PPP')}</p>
                                            <p>Logins: {loginCount}</p>
                                            <p>First Login: {firstLogin}</p>
                                        </TooltipContent>
                                    </UiTooltip>
                                </TooltipProvider>
                            )
                        } else { // Monthly view
                           return (
                               <TooltipProvider key={dateStr} delayDuration={100}>
                                    <UiTooltip>
                                        <TooltipTrigger asChild>
                                             <div className={cn("h-8 w-8 flex items-center justify-center rounded text-xs font-medium", bgColor)}>
                                                {getDate(date)}
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{format(date, 'PPP')}</p>
                                            <p>Logins: {loginCount}</p>
                                            <p>First Login: {firstLogin}</p>
                                        </TooltipContent>
                                    </UiTooltip>
                                </TooltipProvider>
                           )
                        }
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

const QuizPerformance = ({ data }: { data: AnalyticsData['quiz_attempts'] }) => {
    return (
        <Card className="shadow-lg rounded-xl">
            <CardHeader>
                <CardTitle>Quiz Performance</CardTitle>
                <CardDescription>Your attempts and scores on passed quizzes.</CardDescription>
            </CardHeader>
            <CardContent>
                {data.length > 0 ? (
                <div className="max-h-80 overflow-y-auto pr-2">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Lesson Quiz</TableHead>
                            <TableHead className="text-center">Attempts</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map(attempt => (
                            <TableRow key={attempt.lesson__title}>
                                <TableCell className="font-medium">{attempt.lesson__title}</TableCell>
                                <TableCell className="text-center">{attempt.attempts}</TableCell>
                                <TableCell className="text-right font-semibold">{attempt.final_score !== null ? `${attempt.final_score.toFixed(0)}%` : 'N/A'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                </div>
                ) : (
                    <p className="text-center text-sm text-muted-foreground py-4">No quiz attempts recorded yet.</p>
                )}
            </CardContent>
        </Card>
    );
}

const ActivityFeed = ({ activities }: { activities: RecentActivityItem[] }) => {
    if (!activities.length) {
        return <p className="text-center text-sm text-muted-foreground py-4">No recent activity to display.</p>;
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'Lesson': return <BookOpen className="h-5 w-5 text-blue-500" />;
            case 'Quiz': return <ListChecks className="h-5 w-5 text-green-500" />;
            case 'Reward': return <Star className="h-5 w-5 text-amber-500" />;
            case 'Login': return <Clock className="h-5 w-5 text-sky-500" />;
            case 'Logout': return <Clock className="h-5 w-5 text-gray-500" />;
            default: return <Activity className="h-5 w-5 text-muted-foreground" />;
        }
    };
    
    return (
        <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
            {activities.map(activity => (
                <div key={activity.id} className="flex items-start gap-4 p-3 border-b last:border-0">
                    <div className="flex-shrink-0 mt-1">{getIcon(activity.activity_type)}</div>
                    <div className="flex-grow">
                        <p className="text-sm font-medium">{activity.details}</p>
                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

    