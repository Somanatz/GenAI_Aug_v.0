// src/app/teacher/learn/class/[classId]/subject/[subjectId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Subject as SubjectInterface, LessonSummary } from '@/interfaces';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { BookOpen, PlayCircle, AlertTriangle, ChevronLeft } from 'lucide-react';
import { getIconForSubject } from '@/lib/utils';

export default function TeacherSubjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.classId as string;
  const subjectId = params.subjectId as string;

  const [subject, setSubject] = useState<SubjectInterface | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    setIsLoading(true);
    setError(null);

    const fetchSubjectDetails = async () => {
      try {
        const subjectData = await api.get<SubjectInterface>(`/subjects/${subjectId}/`);
        setSubject({...subjectData, icon: getIconForSubject(subjectData.name)});
        const sortedLessons = (subjectData.lessons || []).sort((a, b) => (a.lesson_order || 0) - (b.lesson_order || 0));
        setLessons(sortedLessons);
      } catch (err) {
        console.error("Failed to fetch subject details:", err);
        setError(err instanceof Error ? err.message : "Failed to load subject data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubjectDetails();
  }, [subjectId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-2/3" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-10 bg-destructive/10 border-destructive">
        <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>Error Loading Subject</CardTitle></CardHeader>
        <CardContent><CardDescription className="text-destructive-foreground">{error}</CardDescription>
        <Button variant="outline" onClick={() => router.back()} className="mt-4"><ChevronLeft className="mr-2 h-4 w-4"/> Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  if (!subject) {
    return <p>Subject not found.</p>;
  }
  
  const Icon = subject.icon;

  return (
    <div className="space-y-8">
      <Button variant="outline" onClick={() => router.push('/teacher')} className="mb-6"><ChevronLeft className="mr-2 h-4 w-4"/> Back to Dashboard</Button>
      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground p-6">
          <div className="flex items-center gap-4">
            {Icon && <Icon size={48} />}
            <div>
              <CardTitle className="text-3xl font-bold">{subject.name}</CardTitle>
              <CardDescription className="text-primary-foreground/80">{subject.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-4 text-primary">Lessons in {subject.name}</h3>
          {lessons.length > 0 ? (
            <ul className="space-y-3">
              {lessons.map((lesson, index) => (
                <li key={lesson.id}>
                  <Link href={`/teacher/learn/class/${classId}/subject/${subjectId}/lesson/${lesson.id}`} passHref>
                    <div className='block p-4 border rounded-lg transition-all duration-200 ease-in-out hover:shadow-md bg-card hover:border-primary cursor-pointer'>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <PlayCircle className="h-5 w-5 text-green-500" />
                          <span className="font-medium">{index + 1}. {lesson.title}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No lessons available for this subject yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
