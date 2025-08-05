// src/components/dashboard/StudentDashboard.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import ClassSection from '@/components/dashboard/ClassSection';
import type { Class as ClassInterface, Subject as SubjectInterfaceFull, Book as BookInterface, Event as EventInterface, UserLessonProgress, Subject as SubjectDisplay, StudentTask as TaskInterface } from '@/interfaces';
import { BookOpen, Calculator, FlaskConical, Globe, Library, CalendarDays, Loader2, AlertTriangle, FileText, Music, Palette, Brain, Users, Award, Lightbulb, MessageSquare, UserCheck, RefreshCw, CheckSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { Separator } from '@/components/ui/separator';

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

interface ClassLevelDisplay {
  id: string | number;
  level: number;
  title: string;
  subjects: SubjectDisplay[];
}

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
  const [upcomingEvents, setUpcomingEvents] = useState<EventInterface[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TaskInterface[]>([]);
  const [totalSubjects, setTotalSubjects] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agendaError, setAgendaError] = useState<string | null>(null);
  const [booksError, setBooksError] = useState<string | null>(null);

  const fetchAgenda = useCallback(async () => {
    setIsLoadingAgenda(true);
    setAgendaError(null);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [eventResponse, taskResponse] = await Promise.all([
        api.get<{ results: EventInterface[] }>('/events/?ordering=date'),
        api.get<{ results: TaskInterface[] }>('/student-tasks/')
      ]);

      const allEvents = eventResponse.results || [];
      const futureEvents = allEvents.filter(e => new Date(e.date) >= today);
      setUpcomingEvents(futureEvents.slice(0, 3));

      const allTasks = taskResponse.results || [];
      const futureTasks = allTasks.filter(t => !t.completed && new Date(t.due_date) >= today);
      setUpcomingTasks(futureTasks.slice(0, 3));

    } catch (err) {
      console.error("Failed to fetch agenda data:", err);
      setAgendaError(err instanceof Error ? err.message : "Failed to load agenda");
    } finally {
      setIsLoadingAgenda(false);
    }
  }, []);

  useEffect(() => {
    const fetchPrimaryData = async () => {
        if (!currentUser?.profile_completed || !currentUser?.student_profile?.enrolled_class) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const enrolledClassId = currentUser.student_profile.enrolled_class;
            const classResponse = await api.get<ApiClass>(`/classes/${enrolledClassId}/`);
            const transformedClassData: ClassLevelDisplay[] = [classResponse].map(apiClass => {
                const levelMatch = apiClass.name.match(/\d+/);
                const level = levelMatch ? parseInt(levelMatch[0], 10) : 0;
                const subjects: SubjectDisplay[] = (apiClass.subjects || []).map((apiSub: ApiSubject) => ({
                    id: String(apiSub.id), name: apiSub.name, icon: getIconForSubject(apiSub.name),
                    description: apiSub.description, lessonsCount: (apiSub.lessons || []).length,
                    progress: apiSub.progress, href: `/student/learn/class/${apiClass.id}/subject/${apiSub.id}`,
                    is_locked: apiSub.lessons?.some(l => l.is_locked), 
                    // Reverted to original static background color
                    bgColor: "bg-primary", 
                    textColor: "text-primary-foreground", classId: apiClass.id,
                }));
                return { id: apiClass.id, level, title: `${apiClass.name} ${apiClass.school_name ? `(${apiClass.school_name})` : ''}`, subjects };
            });
            setClassData(transformedClassData);
            setTotalSubjects(transformedClassData.reduce((acc, curr) => acc + curr.subjects.length, 0));
        } catch (err) {
            console.error("Failed to fetch student dashboard data:", err);
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setIsLoading(false);
        }
    };

    const fetchBookData = async () => {
        setIsLoadingBooks(true);
        setBooksError(null);
        try {
            const bookResponse = await api.get<{ results: BookInterface[] }>('/books/');
            setBooks((bookResponse.results || []).slice(0, 3));
        } catch (bookErr) {
            console.error("Failed to fetch books:", bookErr);
            setBooksError(bookErr instanceof Error ? bookErr.message : "Failed to load books");
        } finally {
            setIsLoadingBooks(false);
        }
    };

    if (currentUser) {
        fetchPrimaryData();
        fetchBookData();
        fetchAgenda();
    } else {
        setIsLoading(false);
        setIsLoadingBooks(false);
        setIsLoadingAgenda(false);
    }
  }, [currentUser, fetchAgenda]);
  
  // Render loading skeletons, error states, and profile completion prompts...
  if (isLoading && isLoadingBooks && isLoadingAgenda) {
    return (
      <div className="space-y-12 p-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="text-center py-10 bg-gradient-to-r from-primary to-emerald-600 rounded-xl shadow-xl">
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
            {isLoadingBooks ? <Skeleton className="h-24 w-full" /> : booksError ? (
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
            ) : <p className="text-sm text-muted-foreground">No books available yet.</p>}
             <Button variant="outline" size="sm" className="w-full mt-4" asChild><Link href="/student/library">View Full Library</Link></Button>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg">
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center"><CalendarDays className="mr-3 text-primary"/> Upcoming Agenda</CardTitle>
                <Button variant="ghost" size="icon" onClick={fetchAgenda} disabled={isLoadingAgenda}>
                    <RefreshCw className={`h-4 w-4 ${isLoadingAgenda ? 'animate-spin' : ''}`} />
                </Button>
            </div>
            <CardDescription>A look at your school events and personal tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingAgenda ? <Skeleton className="h-24 w-full" /> : agendaError ? (
              <p className="text-red-500 text-sm"><AlertTriangle className="inline mr-1 h-4 w-4" /> Error: {agendaError}</p>
            ) : upcomingEvents.length > 0 || upcomingTasks.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center"><Users className="mr-2 h-4 w-4 text-sky-500"/>School Events</h4>
                    <ul className="space-y-2">
                      {upcomingEvents.map(event => (
                        <li key={`evt-${event.id}`} className="text-sm p-2 border-l-4 border-sky-500 bg-sky-50 dark:bg-sky-900/50 dark:border-sky-700 rounded-r-md">
                          <p className="font-medium text-foreground">{event.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {upcomingEvents.length > 0 && upcomingTasks.length > 0 && <Separator />}
                {upcomingTasks.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center"><CheckSquare className="mr-2 h-4 w-4 text-emerald-500"/>Personal Tasks</h4>
                    <ul className="space-y-2">
                      {upcomingTasks.map(task => (
                        <li key={`task-${task.id}`} className="text-sm p-2 border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/50 dark:border-emerald-700 rounded-r-md">
                          <p className="font-medium text-foreground">{task.title}</p>
                          <p className="text-xs text-muted-foreground">Due: {new Date(task.due_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming items scheduled.</p>
            )}
            <Button variant="outline" size="sm" className="w-full mt-4" asChild><Link href="/student/calendar">View Full Calendar</Link></Button>
          </CardContent>
        </Card>
      </div>

      <section className="mt-16 p-8 bg-secondary rounded-xl shadow-lg">
        <h2 className="text-3xl font-poppins font-semibold text-secondary-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="bg-background hover:bg-primary/10 h-20 text-base" asChild><Link href="/student/rewards"><Award className="mr-2"/>My Rewards</Link></Button>
            <Button variant="outline" className="bg-background hover:bg-primary/10 h-20 text-base" asChild><Link href="/student/recommendations"><Lightbulb className="mr-2"/>AI Suggestions</Link></Button>
            <Button variant="outline" className="bg-background hover:bg-primary/10 h-20 text-base" asChild><Link href="/student/view-my-report"><FileText className="mr-2"/>My Reports</Link></Button>
            <Button variant="outline" className="bg-background hover:bg-primary/10 h-20 text-base" asChild><Link href="/forum"><MessageSquare className="mr-2"/>Community Forum</Link></Button>
        </div>
      </section>
    </div>
  );
}