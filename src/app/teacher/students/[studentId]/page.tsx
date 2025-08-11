// src/app/teacher/students/[studentId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, UserCircle, Activity, CalendarDays, BarChart3, Mail, MessageSquare, Loader2, AlertTriangle, BookOpen, ListChecks, Star, Clock } from "lucide-react";
import { api } from '@/lib/api';
import type { User as UserInterface, RecentActivity, StudentProfileData } from '@/interfaces';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';

interface StudentDetails extends UserInterface {
    analytics?: any; // Replace with a proper analytics interface later
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

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    setIsLoading(true);
    setError(null);
    Promise.all([
      api.get<UserInterface>(`/users/${studentId}/`),
      api.get<{ results: RecentActivity[] }>(`/recent-activities/?user=${studentId}&page_size=10`),
      api.get<any>(`/progress-analytics/?user_id=${studentId}`) // Assuming this endpoint can take a user_id param
    ]).then(([userData, activityData, analyticsData]) => {
      setStudent({ ...userData, analytics: analyticsData });
      setRecentActivities(activityData.results || []);
    }).catch(err => {
      console.error("Failed to fetch student details:", err);
      setError(err instanceof Error ? err.message : "Could not load student data.");
    }).finally(() => {
      setIsLoading(false);
    });
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="space-y-8 p-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-64 md:col-span-1 rounded-xl" />
            <Skeleton className="h-64 md:col-span-2 rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <Card className="text-center py-10">
        <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>Error Loading Student</CardTitle></CardHeader>
        <CardContent><CardDescription>{error || "Student not found."}</CardDescription></CardContent>
      </Card>
    );
  }

  const profile = student.student_profile;
  const analytics = student.analytics || {};
  const attendancePercentage = analytics.attendance?.total_days > 0 ? ((analytics.attendance.present_days / analytics.attendance.total_days) * 100).toFixed(0) : 0;
  
  return (
    <div className="space-y-8">
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Student List
      </Button>

      <div className="grid lg:grid-cols-3 gap-8 items-start">
        <Card className="lg:col-span-1 shadow-lg rounded-xl">
          <CardHeader className="items-center text-center p-6">
            <Avatar className="h-24 w-24 border-4 border-primary mb-3">
              <AvatarImage src={profile?.profile_picture_url} alt={student.username} />
              <AvatarFallback className="text-3xl">{(profile?.full_name || student.username).charAt(0)}</AvatarFallback>
            </Avatar>
            <CardTitle>{profile?.full_name || student.username}</CardTitle>
            <CardDescription>{student.email}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-3 px-6 pb-6">
            <div className="flex justify-between items-center"><strong className="text-muted-foreground">Class:</strong> <span>{profile?.enrolled_class_name || 'N/A'}</span></div>
            <div className="flex justify-between items-center"><strong className="text-muted-foreground">Admission No:</strong> <span>{profile?.admission_number || 'N/A'}</span></div>
            <div className="flex justify-between items-center"><strong className="text-muted-foreground">Date of Birth:</strong> <span>{profile?.date_of_birth ? format(new Date(profile.date_of_birth), 'PPP') : 'N/A'}</span></div>
          </CardContent>
           <CardFooter className="flex-col gap-2 p-4 border-t">
              <Button className="w-full" variant="default"><MessageSquare className="mr-2 h-4 w-4"/>Send Message</Button>
              <Button className="w-full" variant="outline"><Mail className="mr-2 h-4 w-4"/>Send Notification</Button>
           </CardFooter>
        </Card>

        <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-lg rounded-xl">
                <CardHeader><CardTitle className="flex items-center"><BarChart3 className="mr-2 text-primary"/>Performance Snapshot</CardTitle></CardHeader>
                <CardContent className="grid sm:grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Attendance</p>
                        <p className="text-2xl font-bold">{attendancePercentage}%</p>
                    </div>
                     <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Avg. Quiz Score</p>
                        <p className="text-2xl font-bold">{analytics.quiz_attempts?.reduce((a: any, b: any) => a + (b.final_score || 0), 0) / (analytics.quiz_attempts?.length || 1) || 0}%</p>
                    </div>
                     <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm text-muted-foreground">Total Study Time</p>
                        <p className="text-2xl font-bold">{(analytics.today_study_minutes || 0) + (analytics.weekly_study_minutes?.reduce((a:any,b:any) => a+b.duration,0) || 0) } min</p>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-lg rounded-xl">
                <CardHeader><CardTitle className="flex items-center"><Activity className="mr-2 text-primary"/>Recent Activity</CardTitle></CardHeader>
                <CardContent>
                    {recentActivities.length > 0 ? (
                         <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                            {recentActivities.map(activity => (
                                <div key={activity.id} className="flex items-start gap-4 p-3 border-b last:border-0">
                                    <div className="flex-shrink-0 mt-1">{getIcon(activity.activity_type)}</div>
                                    <div className="flex-grow">
                                        <p className="text-sm font-medium">{activity.details}</p>
                                        <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-muted-foreground text-center">No recent activity for this student.</p>}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
