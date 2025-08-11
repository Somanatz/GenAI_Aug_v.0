
// src/app/teacher/content/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BookCopy, ListChecks, UploadCloud, PlusCircle, Edit2, Trash2, Loader2, AlertTriangle, FileText } from "lucide-react";
import Link from "next/link";
import { api } from '@/lib/api';
import type { LessonSummary, Quiz as QuizInterface, Book } from '@/interfaces'; // Assuming Book interface exists
import { Skeleton } from '@/components/ui/skeleton';

interface ContentItem {
  id: string | number;
  type: "lesson" | "quiz" | "resource";
  title: string;
  description?: string;
  dateCreated?: string; // Or last updated
  status?: "published" | "draft"; // If available from backend
  class_name?: string;
  subject_name?: string;
}

export default function ContentManagementPage() {
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [quizzes, setQuizzes] = useState<QuizInterface[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: Filter by teacher's school/classes if applicable
        const [lessonsData, quizzesData, booksData] = await Promise.all([
          api.get<LessonSummary[] | {results: LessonSummary[]}>('/lessons/'), 
          api.get<QuizInterface[] | {results: QuizInterface[]}>('/quizzes/'), 
          api.get<Book[] | {results: Book[]}>('/books/')
        ]);

        const getResults = <T,>(response: T[] | { results: T[] }): T[] => {
            return Array.isArray(response) ? response : response.results || [];
        };

        setLessons(getResults(lessonsData).slice(0, 5)); // Show recent 5 for overview
        setQuizzes(getResults(quizzesData).slice(0, 5));
        setBooks(getResults(booksData).slice(0,5));

      } catch (err) {
        console.error("Failed to fetch content:", err);
        setError(err instanceof Error ? err.message : "Failed to load content data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchContent();
  }, []);
  
  const allContent: ContentItem[] = [
    ...lessons.map(l => ({ id: l.id, type: "lesson" as const, title: l.title, description: `Lesson in subject...`})), // Add more details if available
    ...quizzes.map(q => ({ id: q.id, type: "quiz" as const, title: q.title, description: q.description || `Quiz for lesson...`})),
    ...books.map(b => ({ id: b.id, type: "resource" as const, title: b.title, description: b.author ? `By ${b.author}` : 'Book resource', class_name: b.class_name, subject_name: b.subject_name }))
  ].sort((a,b) => String(a.id).localeCompare(String(b.id))); // Basic sort, can be improved

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center"><BookCopy className="mr-3 text-primary" /> Content Management</h1>
          <p className="text-muted-foreground">Create, organize, and manage your educational lessons, quizzes, and resources.</p>
        </div>
         <div className="flex gap-2">
            <Button size="lg" asChild>
                <Link href="/teacher/content/lessons/create"><PlusCircle className="mr-2 h-5 w-5" /> Create Lesson</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
                <Link href="/teacher/content/quizzes/create"><PlusCircle className="mr-2 h-5 w-5" /> Create Quiz</Link>
            </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md hover:shadow-lg transition-shadow rounded-xl">
          <CardHeader className="flex-row items-center gap-4">
            <BookCopy className="h-10 w-10 text-primary" />
            <div><CardTitle>Lessons</CardTitle><CardDescription>Manage interactive lessons.</CardDescription></div>
          </CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Create engaging lessons with text, videos, and more.</p></CardContent>
          <CardFooter><Button variant="outline" className="w-full" asChild><Link href="/teacher/content/lessons">Manage Lessons</Link></Button></CardFooter>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow rounded-xl">
          <CardHeader className="flex-row items-center gap-4">
            <ListChecks className="h-10 w-10 text-accent" />
            <div><CardTitle>Quizzes</CardTitle><CardDescription>Build and assign quizzes.</CardDescription></div>
          </CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Design quizzes to assess student understanding.</p></CardContent>
          <CardFooter><Button variant="outline" className="w-full" asChild><Link href="/teacher/content/quizzes">Manage Quizzes</Link></Button></CardFooter>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow rounded-xl">
          <CardHeader className="flex-row items-center gap-4">
            <FileText className="h-10 w-10 text-green-500" /> {/* Changed from UploadCloud */}
            <div><CardTitle>Books & Resources</CardTitle><CardDescription>Upload and share materials.</CardDescription></div>
          </CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">Share documents, presentations, and other learning materials.</p></CardContent>
          <CardFooter><Button variant="outline" className="w-full" asChild><Link href="/teacher/content/books">Manage Books</Link></Button></CardFooter>
        </Card>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Recently Added/Updated Content</CardTitle>
          <CardDescription>Overview of your latest lessons, quizzes, and resources.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-2"> {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)} </div>
          ) : error ? (
            <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
          ) : allContent.length > 0 ? (
            <div className="space-y-4">
              {allContent.slice(0,5).map(item => ( // Show recent 5 combined
                <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    {item.type === "lesson" && <BookCopy className="h-6 w-6 text-primary flex-shrink-0" />}
                    {item.type === "quiz" && <ListChecks className="h-6 w-6 text-accent flex-shrink-0" />}
                    {item.type === "resource" && <FileText className="h-6 w-6 text-green-500 flex-shrink-0" />}
                    <div>
                      <h4 className="font-semibold">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {item.description?.substring(0, 70)}{item.description && item.description.length > 70 ? '...' : ''}
                        {item.class_name && ` (Class: ${item.class_name})`} {item.subject_name && ` (Subject: ${item.subject_name})`}
                      </p>
                      <p className="text-xs text-muted-foreground">Type: <span className="capitalize font-medium">{item.type}</span>
                        {item.dateCreated && ` - Created: ${item.dateCreated}`}
                        {item.status && <span className={`ml-1 font-medium ${item.status === 'published' ? 'text-green-600' : 'text-amber-600'}`}>{item.status}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" title="Edit" asChild>
                        <Link href={`/teacher/content/${item.type === 'lesson' ? 'lessons' : item.type === 'quiz' ? 'quizzes' : 'books'}/${item.id}/edit`}> <Edit2 className="h-4 w-4" /> </Link>
                    </Button>
                    <Button variant="ghost" size="icon" title="Delete" className="text-destructive hover:text-destructive" onClick={() => alert(`Delete ${item.type} ${item.id} - TBI`)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No content created yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
