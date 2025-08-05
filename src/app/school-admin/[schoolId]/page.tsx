
// src/app/school-admin/[schoolId]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Briefcase, Users2, BarChart3, Megaphone, CalendarDays, Brain, MessageSquare, Loader2, AlertTriangle, PlusCircle, School as SchoolIcon, Settings, ListChecks, BookOpenText, ActivityIcon } from "lucide-react";
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { School, Event as EventInterface, CustomUser, Class } from '@/interfaces';
import { format } from 'date-fns';
import Link from 'next/link';
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


interface StatCardProps { title: string; value: string | number | JSX.Element; icon: React.ElementType; note?: string; href?: string; }
const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, note, href }) => {
  const content = (
    <Card className="shadow-lg rounded-xl hover:shadow-primary/20 transition-shadow h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-3xl font-bold">{value}</div>
        {note && <p className="text-xs text-muted-foreground pt-1">{note}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href} className="block h-full">{content}</Link> : content;
};

export default function SchoolAdminDashboard() {
  const params = useParams();
  const router = useRouter();
  const { currentUser, isLoadingAuth } = useAuth();
  const schoolId = params.schoolId as string;

  const [schoolDetails, setSchoolDetails] = useState<School | null>(null);
  const [studentCount, setStudentCount] = useState<number | null>(null);
  const [teacherCount, setTeacherCount] = useState<number | null>(null);
  const [teachers, setTeachers] = useState<CustomUser[]>([]);
  const [events, setEvents] = useState<EventInterface[]>([]);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId || isLoadingAuth) {
      if (isLoadingAuth) setIsLoadingPage(true);
      return;
    }
    
    if (!currentUser) {
        setIsLoadingPage(true); 
        return;
    }

    if (currentUser.role !== 'Admin' || !currentUser.is_school_admin || String(currentUser.administered_school?.id) !== schoolId) {
      setError("Access Denied: You do not have permission to view this school's admin dashboard.");
      setIsLoadingPage(false);
      return;
    }
    
    setIsLoadingPage(true);
    setError(null);

    Promise.all([
      api.get<School>(`/schools/${schoolId}/`),
      api.get<{ count: number } | CustomUser[]>(`/users/?school=${schoolId}&role=Student&page_size=1`),
      api.get<{ count: number, results: CustomUser[] } | CustomUser[]>(`/users/?school=${schoolId}&role=Teacher&page_size=5`),
      api.get<EventInterface[] | { results: EventInterface[] }>(`/events/?school=${schoolId}&ordering=-date&page_size=5`)
    ]).then(([schoolData, studentsResponse, teachersResponse, eventsResponse]) => {
      setSchoolDetails(schoolData);

      const getCount = (res: { count: number } | CustomUser[]): number => {
        if (typeof (res as { count: number }).count === 'number') return (res as { count: number }).count;
        if (Array.isArray(res)) return (res as CustomUser[]).length;
        return 0;
      };
      setStudentCount(getCount(studentsResponse));
      
      let actualTeachers: CustomUser[];
      if (typeof (teachersResponse as { count: number, results: CustomUser[] }).count === 'number') {
        setTeacherCount((teachersResponse as { count: number, results: CustomUser[] }).count);
        actualTeachers = (teachersResponse as { count: number, results: CustomUser[] }).results || [];
      } else if (Array.isArray(teachersResponse)) {
        actualTeachers = teachersResponse as CustomUser[];
        setTeacherCount(actualTeachers.length);
      } else {
        actualTeachers = [];
        setTeacherCount(0);
      }
      setTeachers(actualTeachers);
      
      const actualEvents = Array.isArray(eventsResponse) ? eventsResponse : (eventsResponse as {results: EventInterface[]}).results || [];
      setEvents(actualEvents);

    }).catch(err => {
      console.error("Failed to load school dashboard data:", err);
      setError(err.message || "Could not load school dashboard data.");
    }).finally(() => {
      setIsLoadingPage(false);
    });

  }, [schoolId, currentUser, isLoadingAuth, router]);


  if (isLoadingPage || isLoadingAuth) {
    return (
      <div className="space-y-8 p-4 md:p-6">
        <Skeleton className="h-24 w-full rounded-xl mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
         <div className="grid gap-8 md:grid-cols-2">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
         </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <Card className="m-6 p-6 text-center bg-destructive/10 border-destructive rounded-xl shadow-lg">
        <CardHeader>
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-xl font-semibold">Access Error</CardTitle>
        </CardHeader>
        <CardContent>
            <CardDescription className="text-destructive-foreground">{error}</CardDescription>
            <Button onClick={() => router.push('/')} className="mt-6" variant="outline">
                Go to Homepage
            </Button>
        </CardContent>
      </Card>
    );
  }

  if (!schoolDetails) {
    return (
        <Card className="m-6 p-6 text-center rounded-xl shadow-lg">
            <CardHeader><SchoolIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" /><CardTitle>School Not Found</CardTitle></CardHeader>
            <CardContent><CardDescription>The requested school details could not be loaded.</CardDescription></CardContent>
        </Card>
    );
  }

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date());

  return (
    <div className="space-y-10">
      <Card className="shadow-xl rounded-xl bg-gradient-to-br from-primary via-primary/90 to-accent text-primary-foreground overflow-hidden">
        <CardHeader className="p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
             <SchoolIcon size={52} className="flex-shrink-0"/>
            <div className="flex-grow">
                <CardTitle className="text-4xl font-bold">{schoolDetails.name}</CardTitle>
                <CardDescription className="text-primary-foreground/80 text-lg mt-1">School Administration Dashboard (ID: {schoolId})</CardDescription>
            </div>
            <Button variant="secondary" size="lg" asChild className="mt-4 sm:mt-0 self-start sm:self-center">
              <Link href={`/school-admin/${schoolId}/settings`}><Settings className="mr-2"/>School Settings</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value={studentCount ?? <Loader2 className="h-6 w-6 animate-spin"/>} icon={Users} href={`/school-admin/${schoolId}/students`} />
        <StatCard title="Total Staff" value={teacherCount ?? <Loader2 className="h-6 w-6 animate-spin"/>} icon={Briefcase} href={`/school-admin/${schoolId}/teachers`} />
        <StatCard title="Upcoming Events" value={upcomingEvents.length} icon={CalendarDays} href={`/school-admin/${schoolId}/calendar`} />
        <StatCard title="Content Items" value={"N/A"} icon={BookOpenText} note="Lessons, Quizzes" href={`/school-admin/${schoolId}/content`}/>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-lg rounded-xl">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center text-xl"><Megaphone className="mr-2 text-primary"/>Recent School Announcements</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/school-admin/${schoolId}/communication`}><PlusCircle className="mr-2 h-4 w-4"/> New Announcement</Link>
              </Button>
            </div>
            <CardDescription>Latest important updates for your school community.</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                    {events.map(event => (
                        <div key={event.id} className="p-3 border rounded-lg bg-card hover:border-primary transition-colors">
                            <div className="flex justify-between items-start">
                                <h4 className="font-semibold">{event.title}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${event.type === 'Exam' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' : event.type === 'Holiday' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'}`}>{event.type}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(event.date), "PPP")}</p>
                            {event.description && <p className="text-sm mt-1 text-muted-foreground truncate">{event.description}</p>}
                        </div>
                    ))}
                </div>
            ) : <p className="text-sm text-muted-foreground">No announcements or events posted yet.</p>}
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><Brain className="mr-2 text-primary"/>AI Management Tool</CardTitle>
            <CardDescription>Insights & suggestions for school administration.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3"> {/* Changed from flex flex-col h-full */}
            <Textarea placeholder="Ask the AI about student performance, resource allocation, curriculum suggestions, etc..." className="min-h-[100px]" /> {/* Removed mb-3 */}
            <Button variant="default" className="w-full"> {/* Removed mt-auto */}
                <MessageSquare className="mr-2 h-4 w-4"/> Chat with AI Assistant
            </Button>
             <p className="text-xs text-muted-foreground text-center">Feature coming soon.</p> {/* Removed mt-2 */}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center text-xl"><Users2 className="mr-2 text-primary"/>Featured Teachers</CardTitle>
            <CardDescription>A quick look at some of the teaching staff.</CardDescription>
          </CardHeader>
          <CardContent>
            {teachers.length > 0 ? (
              <ul className="space-y-2">
                {teachers.map(teacher => (
                  <li key={teacher.id} className="flex items-center gap-3 p-2 border rounded-md bg-card">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={teacher.teacher_profile?.profile_picture_url} alt={teacher.teacher_profile?.full_name || teacher.username} data-ai-hint="teacher avatar"/>
                      <AvatarFallback>{(teacher.teacher_profile?.full_name || teacher.username).charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{teacher.teacher_profile?.full_name || teacher.username}</p>
                      <p className="text-xs text-muted-foreground">
                        Expertise: {teacher.teacher_profile?.subject_expertise_details?.map(s => s.name).join(', ') || 'N/A'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No teachers listed or information unavailable.</p>}
             <Button variant="outline" size="sm" className="w-full mt-4" asChild>
              <Link href={`/school-admin/${schoolId}/teachers`}>Manage All Staff</Link>
            </Button>
          </CardContent>
        </Card>

         <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle  className="flex items-center text-xl"><BarChart3 className="mr-2 text-primary"/>School Performance (Placeholder)</CardTitle>
            <CardDescription>Yearly progress, student pass rates, and key metrics.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-40 bg-muted/50 rounded-md">
            <p className="text-muted-foreground">Detailed charts and performance data will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

