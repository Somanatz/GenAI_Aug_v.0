
// src/components/dashboard/StudentDashboard.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { SchoolClass as SchoolClassInterface, Book as BookInterface, Event as EventInterface, Subject as SubjectDisplay } from '@/interfaces';
import ClassSection from '@/components/dashboard/ClassSection';
import Link from 'next/link';
import { BookOpen, Calculator, FlaskConical, Globe, Library, CalendarDays, Loader2, AlertTriangle, FileText, Music, Palette, Brain, Users, Award, Lightbulb, MessageSquare, UserCheck, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Helper to map subject names to icons
const subjectIconMap: Record<string, LucideIcon> = {
  default: BookOpen, math: Calculator, mathematics: Calculator, english: BookOpen,
  science: FlaskConical, history: Globe, geography: Globe, physics: Brain,
  chemistry: FlaskConical, biology: Brain, art: Palette, music: Music,
};
const getIconForSubject = (subjectName: string): LucideIcon => {
  const nameLower = subjectName.toLowerCase();
  for (const key in subjectIconMap) {
    if (nameLower.includes(key)) { return subjectIconMap[key]; }
  }
  return subjectIconMap.default;
};

// Interface for the transformed ClassLevel data structure used by ClassSection
interface ClassLevelDisplay {
  id: string | number;
  level: number;
  title: string;
  subjects: SubjectDisplay[];
}

// API response interfaces
interface ApiLesson { id: string | number; title: string; is_locked?: boolean; lesson_order?: number; }
interface ApiSubject {
  id: string | number; name: string; description: string;
  lessons: ApiLesson[]; class_obj_name?: string; class_obj: string | number;
  progress: number;
}
interface ApiClass {
  id: string | number; name: string; description?: string;
  subjects: ApiSubject[]; school_name?: string; school: string | number;
}

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const [classData, setClassData] = useState<ClassLevelDisplay[]>([]);
  const [books, setBooks] = useState<BookInterface[]>([]);
  const [events, setEvents] = useState<EventInterface[]>([]);
  const [totalSubjects, setTotalSubjects] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [booksError, setBooksError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    setEventsError(null);
    try {
        const eventResponse = await api.get<{results: EventInterface[]}>('/events/?ordering=date');
        const actualEvents = eventResponse.results || [];
        setEvents(actualEvents.filter(e => new Date(e.date) >= new Date()).slice(0, 3));
    } catch (eventErr) {
        console.error("Failed to fetch events:", eventErr);
        setEventsError(eventErr instanceof Error ? eventErr.message : "Failed to load events");
    } finally {
        setIsLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentUser || !currentUser.profile_completed || !currentUser.student_profile?.enrolled_class) {
        setIsLoading(false);
        setIsLoadingBooks(false);
        setIsLoadingEvents(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const enrolledClassId = currentUser.student_profile.enrolled_class;
        const classResponse = await api.get<SchoolClassInterface>(`/school-classes/${enrolledClassId}/`);

        const subjectResponse = await api.get<{results: SubjectDisplay[]}>(`/subjects/?master_class=${classResponse.master_class}`);
        const apiSubjects = subjectResponse.results || [];

        const levelMatch = classResponse.name.match(/\d+/);
        const level = levelMatch ? parseInt(levelMatch[0], 10) : 0; 
        
        const subjects: SubjectDisplay[] = apiSubjects.map((apiSub: SubjectDisplay) => {
            return {
              id: String(apiSub.id), name: apiSub.name, icon: getIconForSubject(apiSub.name),
              description: apiSub.description, 
              lessonsCount: (apiSub.lessons || []).length,
              progress: apiSub.progress,
              href: `/student/learn/class/${classResponse.id}/subject/${apiSub.id}`,
              is_locked: apiSub.lessons?.some(l => l.is_locked), 
              bgColor: "bg-primary", textColor: "text-primary-foreground",
              classId: classResponse.id,
            }
          });

        const transformedClassData: ClassLevelDisplay[] = [{
            id: classResponse.id,
            level: level,
            title: `${currentUser.student_profile.school_name} (${classResponse.name})`,
            subjects: subjects
        }];

        setClassData(transformedClassData);
        setTotalSubjects(subjects.length);

      } catch (err) { 
        console.error("Failed to fetch student dashboard data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }

      // Fetch books and events separately
      setIsLoadingBooks(true);
      setBooksError(null);
      try {
          const bookResponse = await api.get<{ results: BookInterface[] }>('/books/');
          const actualBooks = bookResponse.results || [];
          setBooks(actualBooks.slice(0, 3)); 
      } catch (bookErr) {
          console.error("Failed to fetch books:", bookErr);
          setBooksError(bookErr instanceof Error ? bookErr.message : "Failed to load books");
      } finally {
          setIsLoadingBooks(false);
      }

      fetchEvents();
    };

    if (currentUser) {
      fetchDashboardData();
    } else {
      setIsLoading(false);
    }
  }, [currentUser, fetchEvents]);

  if (isLoading) { 
    return (
      <div className="space-y-12 p-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        {[1, 2].map(i => (
          <section key={i} className="mb-12">
            <Skeleton className="h-10 w-1/3 mb-6 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(j => <Skeleton key={j} className="h-64 w-full rounded-xl" />)}
            </div>
          </section>
        ))}
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="h-48 w-full rounded-xl" /> 
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) { 
    return (
      <div className="text-center py-10 text-red-500 bg-red-50 p-6 rounded-lg shadow-md">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Oops! Something went wrong.</h2>
        <p className="mb-4">Error loading dashboard: {error}</p>
        <Button onClick={() => window.location.reload()} variant="destructive">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Try Again
        </Button>
      </div>
    );
  }

  // Gate content if profile is incomplete or no class is enrolled
  if (!currentUser?.profile_completed || !currentUser?.student_profile?.enrolled_class) {
    return (
      <Card className="text-center py-10 shadow-lg rounded-xl bg-secondary">
        <CardHeader>
          <UserCheck className="mx-auto h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-2xl font-bold">Complete Your Profile to Begin!</CardTitle>
          <CardDescription className="max-w-md mx-auto">
            Please complete your profile and enroll in a class to access your subjects, lessons, and all the exciting features of GenAI-Campus.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg">
            <Link href="/student/complete-profile">Complete Your Profile</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-10">
      <section className="text-center mb-9 p-10 bg-gradient-to-r from-primary to-accent rounded-xl text-white shadow-lg">
        <h1 className="text-4xl font-poppins font-extrabold mb-4 text-primary-foreground">Welcome, {currentUser?.student_profile?.full_name || currentUser?.username || 'Student'}!</h1>
        <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto">
          Your personalized journey to academic excellence starts here. Explore subjects, track progress, and unlock your potential.
        </p>
      </section>

      {classData.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>My Subjects Overview</CardTitle>
              <CardDescription>You are enrolled in {totalSubjects} subjects in {classData[0].title}.</CardDescription>
            </CardHeader>
          </Card>
          {classData.map((classLevel) => (
            <ClassSection key={classLevel.id} classLevelData={classLevel} />
          ))}
        </>
      ) : (
         <Card className="text-center py-10 shadow-md rounded-lg">
            <CardHeader><CardTitle>No Subjects Found</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">We couldn't find any subjects for your enrolled class. Please contact support if you believe this is an error.</p>
            </CardContent>
         </Card>
      )}
      
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Library className="mr-3 text-primary"/> Resource Library</CardTitle>
            <CardDescription>Explore additional books and materials.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingBooks ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : booksError ? (
                 <p className="text-red-500 text-sm"><AlertTriangle className="inline mr-1 h-4 w-4" /> Error: {booksError}</p>
            ) : books.length > 0 ? (
              <ul className="space-y-3">
                {books.map(book => (
                  <li key={book.id} className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <h4 className="font-semibold">{book.title}</h4>
                    <p className="text-xs text-muted-foreground"> {book.author && `By ${book.author} `} {book.subject_name && `(${book.subject_name})`}</p>
                    {book.file_url && <Button variant="link" size="sm" asChild className="p-0 h-auto"><a href={book.file_url} target="_blank" rel="noopener noreferrer">View Book</a></Button>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No books available in the library yet.</p>}
             <Button variant="outline" size="sm" className="w-full mt-4" asChild><Link href="/student/library">View Full Library</Link></Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center"><CalendarDays className="mr-3 text-primary"/> Upcoming Events</CardTitle>
                <Button variant="ghost" size="icon" onClick={fetchEvents} disabled={isLoadingEvents}>
                    <RefreshCw className={`h-4 w-4 ${isLoadingEvents ? 'animate-spin' : ''}`} />
                </Button>
            </div>
            <CardDescription>Stay informed about important dates.</CardDescription>
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
              <ul className="space-y-3">
                {events.map(event => (
                  <li key={event.id} className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
                    <h4 className="font-semibold">{event.title} <span className="text-xs font-normal text-muted-foreground">({event.type})</span></h4>
                    <p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">No upcoming events scheduled.</p>}
            <Button variant="outline" size="sm" className="w-full mt-4" asChild><Link href="/student/calendar">View Full Calendar</Link></Button>
          </CardContent>
        </Card>
      </div>

      <section className="mt-16 p-8 bg-secondary rounded-xl shadow-lg">
        <h2 className="text-3xl font-poppins font-semibold text-secondary-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="outline" className="bg-background hover:bg-muted h-20 text-base" asChild><Link href="/student/rewards"><Award className="mr-2"/>My Rewards</Link></Button>
          <Button variant="outline" className="bg-background hover:bg-muted h-20 text-base" asChild><Link href="/student/recommendations"><Lightbulb className="mr-2"/>AI Suggestions</Link></Button>
          <Button variant="outline" className="bg-background hover:bg-muted h-20 text-base" asChild><Link href="/student/view-my-report"><FileText className="mr-2"/>My Reports</Link></Button>
          <Button variant="outline" className="bg-background hover:bg-muted h-20 text-base" asChild><Link href="/forum"><MessageSquare className="mr-2"/>Community Forum</Link></Button>
        </div>
      </section>
    </div>
  );
}
