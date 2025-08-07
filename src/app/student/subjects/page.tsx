
// src/app/student/subjects/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Class as ClassInterface, Subject as SubjectInterface, SchoolClass } from '@/interfaces';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, BookOpen, Calculator, FlaskConical, Globe, Palette, Music, Brain } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

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


export default function MySubjectsPage() {
  const { currentUser } = useAuth();
  const [enrolledClass, setEnrolledClass] = useState<SchoolClass | null>(null);
  const [subjects, setSubjects] = useState<SubjectInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !currentUser.student_profile?.school) {
      setError("Student profile is not set up or not assigned to a school.");
      setIsLoading(false);
      return;
    }

    const fetchClassesAndSubjects = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const enrolledClassId = currentUser.student_profile?.enrolled_class;
        if (!enrolledClassId) {
          setError("You are not enrolled in any class. Please contact your administrator.");
          setIsLoading(false);
          return;
        }
        
        // Correctly fetch the SchoolClass instance first
        const schoolClassData = await api.get<SchoolClass>(`/school-classes/${enrolledClassId}/`);
        setEnrolledClass(schoolClassData);
        
        if (schoolClassData && schoolClassData.master_class) {
          // Then fetch the subjects for that master_class
          const subjectResponse = await api.get<{results: SubjectInterface[]}>(`/subjects/?master_class=${schoolClassData.master_class}`);
          const subjectsWithIcons = (subjectResponse.results || []).map(subject => ({
            ...subject,
            icon: getIconForSubject(subject.name),
          }));
          setSubjects(subjectsWithIcons);
        } else {
          setSubjects([]);
        }

      } catch (err) {
        console.error("Failed to fetch subjects:", err);
        setError(err instanceof Error ? err.message : "Could not load your subjects.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClassesAndSubjects();
  }, [currentUser]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <BookOpen className="h-10 w-10 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">My Subjects</h1>
          <p className="text-muted-foreground">Here are all the subjects for your enrolled class. Select one to start learning.</p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="space-y-6">
            <Skeleton className="h-10 w-1/3 rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-xl" />)}
            </div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Loading Subjects</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !enrolledClass ? (
        <Card className="text-center py-10">
            <CardHeader>
                <CardTitle>No Subjects Found</CardTitle>
                <CardDescription>We couldn't find any subjects for your enrolled class.</CardDescription>
            </CardHeader>
        </Card>
      ) : (
          <section key={enrolledClass.id} className="space-y-6">
            <h2 className="text-2xl font-semibold border-b pb-2">{enrolledClass.name}</h2>
            {subjects && subjects.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {subjects.map(subject => (
                        <Card key={subject.id} className="flex flex-col shadow-md hover:shadow-xl hover:border-primary/30 transition-all duration-200">
                           <CardHeader>
                            <div className="flex items-center gap-3">
                                {subject.icon && <subject.icon className="h-8 w-8 text-primary" />}
                                <CardTitle>{subject.name}</CardTitle>
                            </div>
                           </CardHeader>
                           <CardContent className="flex-grow">
                             <CardDescription>{subject.description || `Lessons and quizzes for ${subject.name}.`}</CardDescription>
                           </CardContent>
                           <CardFooter className="flex-col items-start gap-3">
                                <div className="w-full">
                                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                        <span>Progress</span>
                                        <span>{Math.round(subject.progress || 0)}%</span>
                                    </div>
                                    <Progress value={subject.progress || 0} className="h-2" />
                                </div>
                                <Button asChild className="w-full">
                                    <Link href={`/student/learn/class/${enrolledClass.id}/subject/${subject.id}`}>
                                        Go to Subject
                                    </Link>
                                </Button>
                           </CardFooter>
                        </Card>
                    ))}
                 </div>
            ) : (
                <p className="text-muted-foreground">No subjects found for this class.</p>
            )}
          </section>
      )}
    </div>
  );
}
