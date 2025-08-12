
// src/components/dashboard/TeacherDashboard.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BookOpenText, BarChartBig, CalendarCheck2, PlusCircle, FileText, CalendarDays, AlertTriangle, Loader2, MessageSquare, ActivityIcon, RefreshCw, Eye } from "lucide-react";
import Link from "next/link";
import { api } from '@/lib/api';
import type { Event as EventInterface, User as UserInterface, RecentActivity, SchoolClass, Subject as SubjectInterface, TeacherTask } from '@/interfaces';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import ClassSection from './ClassSection';
import { getIconForSubject } from '@/lib/utils'; // Import helper
import type { ClassLevelDisplay, UserRole } from '@/interfaces';

interface Stat {
    title: string;
    value: string | number | JSX.Element;
    icon: React.ElementType;
    color: string;
    link: string;
    note?: string;
}

const quickLinks = [
    { href: "/teacher/students", label: "Manage Students", icon: Users },
    { href: "/teacher/report-card", label: "Generate Reports", icon: FileText },
    { href: "/teacher/content", label: "Manage Content", icon: BookOpenText },
    { href: "/teacher/communication", label: "Send Announcements", icon: MessageSquare },
];

export default function TeacherDashboard() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState<EventInterface[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null); 
  
  const [stats, setStats] = useState<Stat[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  
  const [classData, setClassData] = useState<ClassLevelDisplay[]>([]); 
  const [isLoadingCurriculum, setIsLoadingCurriculum] = useState(true);
  const [curriculumError, setCurriculumError] = useState<string|null>(null);

  const fetchEvents = useCallback(async () => {
    if (!currentUser?.teacher_profile?.school) return;
    setIsLoadingEvents(true);
    setEventsError(null); 
    try {
      const schoolId = currentUser.teacher_profile.school;
      const eventResponse = await api.get<{results: EventInterface[]}>(`/events/?school=${schoolId}&ordering=date`);
      const actualEvents = eventResponse.results || [];
      setEvents(actualEvents.filter(e => new Date(e.date) >= new Date()).slice(0, 5)); 
    } catch (err) {
      console.error("Failed to fetch events:", err);
      setEventsError(err instanceof Error ? err.message : "Failed to load events"); 
    } finally {
      setIsLoadingEvents(false);
    }
  }, [currentUser]);

  const fetchActivities = useCallback(async () => {
    if (!currentUser?.teacher_profile?.school) return;
    setIsLoadingActivities(true);
    setActivitiesError(null);
    try {
        const response = await api.get<{results: RecentActivity[]}>(`/recent-activities/`);
        setRecentActivities(response.results || []);
    } catch (err) {
        console.error("Failed to fetch recent activities:", err);
        setActivitiesError(err instanceof Error ? err.message : "Failed to load recent activities.");
    } finally {
        setIsLoadingActivities(false);
    }
  }, [currentUser]);

  const fetchCurriculum = useCallback(async () => {
    if (!currentUser?.teacher_profile?.assigned_classes_details || currentUser.teacher_profile.assigned_classes_details.length === 0) {
        setIsLoadingCurriculum(false);
        return;
    }
    setIsLoadingCurriculum(true);
    setCurriculumError(null);

    try {
        const teacherProfile = currentUser.teacher_profile;
        const assignedClasses = teacherProfile.assigned_classes_details || [];
        const expertiseSubjectIds = new Set((teacherProfile.subject_expertise_details || []).map(sub => sub.id));
        
        const curriculumDataPromises = assignedClasses.map(async (schoolClass) => {
            const schoolClassDetails = await api.get<SchoolClass>(`/school-classes/${schoolClass.id}/`);
            if (!schoolClassDetails || !schoolClassDetails.master_class) return null;

            const subjectsResponse = await api.get<{results: SubjectInterface[]}>(`/subjects/?master_class=${schoolClassDetails.master_class}`);
            const allSubjectsForClass = subjectsResponse.results || [];
            
            const relevantSubjects = expertiseSubjectIds.size > 0 
              ? allSubjectsForClass.filter(sub => expertiseSubjectIds.has(sub.id))
              : allSubjectsForClass;

            if (relevantSubjects.length === 0) return null;

            const transformedSubjects = relevantSubjects.map(sub => ({
                id: String(sub.id), name: sub.name, icon: getIconForSubject(sub.name),
                description: sub.description, 
                lessonsCount: (sub.lessons || []).length,
                href: `/teacher/learn/class/${schoolClass.id}/subject/${sub.id}`,
            }));
            
            const levelMatch = schoolClass.name.match(/\d+/);
            const level = levelMatch ? parseInt(levelMatch[0], 10) : 0;
            
            return {
                id: schoolClass.id,
                title: `${currentUser.school_name} (${schoolClass.name})`,
                level: level,
                subjects: transformedSubjects
            };
        });

        const resolvedCurriculumData = (await Promise.all(curriculumDataPromises)).filter(Boolean) as ClassLevelDisplay[];
        setClassData(resolvedCurriculumData);

    } catch (err) {
        setCurriculumError(err instanceof Error ? err.message : "Failed to load curriculum data.");
        console.error(err);
    } finally {
        setIsLoadingCurriculum(false);
    }
  }, [currentUser]);


  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser || !currentUser.teacher_profile?.school) {
        setIsLoadingStats(false);
        setStatsError("Teacher profile is not associated with a school.");
        return;
      }
      const assignedSubjects = classData.flatMap(c => c.subjects);
      const totalLessons = assignedSubjects.reduce((sum, s) => sum + (s.lessonsCount || 0), 0);

      setIsLoadingStats(true);
      setStatsError(null);
      try {
        const [studentCountData, teacherTasksData, performanceData] = await Promise.all([
          api.get<{ count: number }>(`/users/?school=${currentUser.teacher_profile.school}&role=Student&page_size=1`),
          api.get<{ results: TeacherTask[] }>(`/teacher-tasks/`),
          api.get<{ average_performance: number }>(`/teacher-analytics/class-performance/`)
        ]);

        const pendingTasks = (teacherTasksData.results || []).filter(t => !t.completed).length;

        const fetchedStats: Stat[] = [
            { title: "Total Students", value: studentCountData.count, icon: Users, color: "text-primary", link: "/teacher/students", note: "In your classes" }, 
            { title: "Active Courses", value: assignedSubjects.length, icon: BookOpenText, color: "text-accent", link: "/teacher/content", note: `${totalLessons} total lessons`}, 
            { title: "My Tasks", value: pendingTasks, icon: CalendarCheck2, color: "text-orange-500", link: "/teacher/calendar", note:"Pending tasks"}, 
            { title: "Student Performance", value: `${performanceData.average_performance.toFixed(1)}%`, icon: BarChartBig, color: "text-green-500", link: "/teacher/analytics", note:"Avg. class score"}, 
        ];
        setStats(fetchedStats);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
        setStatsError(err instanceof Error ? err.message : "Failed to load dashboard stats.");
      } finally {
        setIsLoadingStats(false);
      }
    };
    if (currentUser?.profile_completed) {
      if (classData.length > 0 || !isLoadingCurriculum) { 
        fetchDashboardData();
      }
      fetchEvents();
      fetchActivities();
    }
  }, [currentUser, classData, isLoadingCurriculum, fetchEvents, fetchActivities]);

  useEffect(() => {
     if (currentUser?.profile_completed) {
       fetchCurriculum();
     }
  }, [currentUser, fetchCurriculum]);

  const uniqueRecentActivities = useMemo(() => {
    const uniqueStudentIds = new Set<number>();
    const uniqueActivities: RecentActivity[] = [];
    for (const activity of recentActivities) {
        if (!uniqueStudentIds.has(activity.user)) {
            uniqueActivities.push(activity);
            uniqueStudentIds.add(activity.user);
        }
        if (uniqueActivities.length >= 6) break;
    }
    return uniqueActivities;
  }, [recentActivities]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 bg-card rounded-xl shadow-lg">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {currentUser?.teacher_profile?.full_name || currentUser?.username}! Manage your classes and students efficiently.</p>
        </div>
        <Button size="lg" asChild>
          <Link href="/teacher/content/lessons/create"> 
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Content
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {isLoadingStats ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : statsError ? (
            <Card className="lg:col-span-4 p-4 text-center text-destructive bg-destructive/10 border-destructive rounded-xl">
                <AlertTriangle className="inline mr-2"/> Error loading stats: {statsError}
            </Card>
        ) : stats.map((stat) => ( 
          <Link key={stat.title} href={stat.link} passHref legacyBehavior>
            <a className="block">
                <Card className="shadow-md hover:shadow-lg transition-shadow rounded-xl h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold">{stat.value}</div>
                    {stat.note && <p className="text-xs text-muted-foreground pt-1">{stat.note}</p>}
                </CardContent>
                </Card>
            </a>
          </Link>
        ))}
      </div>

       <section>
        <h2 className="text-2xl font-semibold mb-4">My Curriculum</h2>
        {isLoadingCurriculum ? (
             <div className="space-y-6">
                <Skeleton className="h-10 w-1/3 rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
                </div>
            </div>
        ) : curriculumError ? (
             <p className="text-destructive text-sm"><AlertTriangle className="inline mr-1 h-4 w-4" /> {curriculumError}</p>
        ) : classData.length > 0 ? (
          classData.map((classLevel) => (
            <ClassSection key={classLevel.id} classLevelData={classLevel} userRole="Teacher" />
          ))
        ) : (
          <Card className="text-center py-10">
            <CardHeader>
              <CardTitle>No Assigned Classes Found</CardTitle>
              <CardDescription>It looks like you haven't been assigned to any classes or subjects yet.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/profile">Update Your Profile & Assignments</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-md rounded-xl">
          <CardHeader>
             <div className="flex justify-between items-center">
                <CardTitle className="flex items-center"><ActivityIcon className="mr-2 text-primary"/>Recent Student Activity</CardTitle>
                 <Button variant="ghost" size="icon" onClick={fetchActivities} disabled={isLoadingActivities}>
                    <RefreshCw className={`h-4 w-4 ${isLoadingActivities ? 'animate-spin' : ''}`} />
                </Button>
            </div>
            <CardDescription>A quick look at the latest student interactions from your classes.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoadingActivities ? <div className="space-y-2">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-12 w-full"/>)}</div> :
              activitiesError ? <p className="text-destructive text-sm"><AlertTriangle className="inline mr-1 h-4 w-4" /> {activitiesError}</p> :
              uniqueRecentActivities.length > 0 ? (
                <div className="space-y-3">
                    {uniqueRecentActivities.map(activity => (
                        <div key={activity.id} className="flex items-start gap-3 p-2 border-b last:border-0">
                            <Avatar className="h-9 w-9 mt-1"><AvatarImage src={activity.user_avatar_url} /><AvatarFallback>{activity.user_username.charAt(0)}</AvatarFallback></Avatar>
                            <div className="flex-1">
                                <p className="text-sm"><span className="font-semibold">{activity.user_username}</span> {activity.details}</p>
                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</p>
                            </div>
                        </div>
                    ))}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No recent student activities to display.</p>}
            <Button variant="outline" className="mt-6 w-full" asChild>
                <Link href="/teacher/students"><Eye className="mr-2 h-4 w-4"/>View All Students</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-md rounded-xl">
          <CardHeader>
             <div className="flex justify-between items-center">
              <CardTitle className="flex items-center"><CalendarDays className="mr-2 text-primary"/>Upcoming School Events</CardTitle>
               <Button variant="ghost" size="icon" onClick={fetchEvents} disabled={isLoadingEvents}>
                <RefreshCw className={`h-4 w-4 ${isLoadingEvents ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingEvents ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : eventsError ? (
                 <p className="text-red-500 text-sm"><AlertTriangle className="inline mr-1 h-4 w-4" /> Error: {eventsError}</p>
            ) : events.length > 0 ? (
              <ul className="space-y-2">
                {events.map(event => (
                  <li key={event.id} className="p-2 border-b last:border-b-0">
                    <h4 className="font-semibold text-sm">{event.title} <span className="text-xs font-normal text-muted-foreground">({event.type})</span></h4>
                    <p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming school events.</p>
            )}
            <Button variant="outline" size="sm" className="w-full mt-4" asChild>
              <Link href="/teacher/calendar">View Full Calendar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>Access your most used tools and sections.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map(link => (
                <Button variant="outline" asChild key={link.href} className="h-auto py-6 flex-col items-center justify-center gap-2 text-base hover:bg-accent/10 hover:border-primary transition-all duration-150 ease-in-out group">
                  <Link href={link.href}>
                    <link.icon className="h-8 w-8 mb-1 text-primary group-hover:text-accent transition-colors" />
                    <span className="text-center">{link.label}</span>
                  </Link>
                </Button>
            ))}
          </CardContent>
        </Card>
    </div>
  );
}
