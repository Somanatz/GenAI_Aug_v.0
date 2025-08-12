
// src/app/teacher/content/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit2, Trash2, FileText, Loader2, AlertTriangle, UploadCloud, BookOpen, ListChecks, Library } from "lucide-react";
import Link from "next/link";
import { api } from '@/lib/api';
import type { LessonSummary, Book } from '@/interfaces';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export default function ContentManagementPage() {
  const { currentUser } = useAuth();
  const [recentLessons, setRecentLessons] = useState<LessonSummary[]>([]);
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentContent = async () => {
      if (!currentUser?.id || !currentUser.teacher_profile?.school) return;
      setIsLoading(true);
      setError(null);
      try {
        const [lessonsResponse, booksResponse] = await Promise.all([
          api.get<{results: LessonSummary[]}>(`/lessons/?created_by=${currentUser.id}&ordering=-id&page_size=5`),
          api.get<{results: Book[]}>(`/books/?master_class__syllabus__schools=${currentUser.teacher_profile.school}&page_size=5`)
        ]);
        setRecentLessons(lessonsResponse.results || []);
        setLibraryBooks(booksResponse.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recent content.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRecentContent();
  }, [currentUser]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center"><BookOpen className="mr-3 text-primary" /> Content Management</h1>
          <p className="text-muted-foreground">Manage lessons, quizzes, and supplementary library materials.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Create New Content</CardTitle>
            <CardDescription>Choose a content type to start building your curriculum.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/teacher/content/lessons/create" passHref legacyBehavior>
                <a className="block p-6 border rounded-lg hover:shadow-lg hover:border-primary transition-all text-center">
                    <BookOpen className="mx-auto h-8 w-8 text-primary mb-2"/>
                    <h3 className="font-semibold">Create Lesson</h3>
                    <p className="text-xs text-muted-foreground">Build a new lesson with text, video, and audio.</p>
                </a>
            </Link>
             <Link href="/teacher/content/quizzes/create" passHref legacyBehavior>
                <a className="block p-6 border rounded-lg hover:shadow-lg hover:border-primary transition-all text-center">
                    <ListChecks className="mx-auto h-8 w-8 text-primary mb-2"/>
                    <h3 className="font-semibold">Create Quiz</h3>
                    <p className="text-xs text-muted-foreground">Design a quiz to test student comprehension.</p>
                </a>
            </Link>
             <Link href="/teacher/content/books/create" passHref legacyBehavior>
                <a className="block p-6 border rounded-lg hover:shadow-lg hover:border-primary transition-all text-center">
                    <UploadCloud className="mx-auto h-8 w-8 text-primary mb-2"/>
                    <h3 className="font-semibold">Upload Resource</h3>
                    <p className="text-xs text-muted-foreground">Add a book, PDF, or other file to the library.</p>
                </a>
            </Link>
        </CardContent>
      </Card>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Recently Created Lessons</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : error ? (
             <Card className="text-center py-6 bg-destructive/10 border-destructive rounded-md">
                <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
                <CardTitle className="text-lg">Error Loading Content</CardTitle>
                <CardDescription className="text-destructive-foreground">{error}</CardDescription>
            </Card>
          ) : recentLessons.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLessons.map((lesson) => (
                    <TableRow key={lesson.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{lesson.title}</TableCell>
                      <TableCell>{lesson.subject_name || 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="Edit" asChild>
                           <Link href={`/teacher/content/lessons/${lesson.id}/edit`}> <Edit2 className="h-4 w-4" /> </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">You have not created any lessons yet.</p>
          )}
        </CardContent>
         <CardFooter>
            <Button variant="outline" asChild>
                <Link href="/teacher/content/lessons">View All Lessons</Link>
            </Button>
         </CardFooter>
      </Card>

       <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <CardTitle>Recent School Library Resources</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : error ? (
             <Card className="text-center py-6 bg-destructive/10 border-destructive rounded-md">
                <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
                <CardTitle className="text-lg">Error Loading Resources</CardTitle>
                <CardDescription className="text-destructive-foreground">{error}</CardDescription>
            </Card>
          ) : libraryBooks.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                     <TableHead>Author</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {libraryBooks.map((book) => (
                    <TableRow key={book.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{book.title}</TableCell>
                      <TableCell>{book.subject_name || 'General'}</TableCell>
                      <TableCell>{book.author || 'N/A'}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" title="Edit" asChild>
                           <Link href={`/teacher/content/books/${book.id}/edit`}> <Edit2 className="h-4 w-4" /> </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No books or resources have been uploaded to the school library yet.</p>
          )}
        </CardContent>
         <CardFooter>
            <Button variant="outline" asChild>
                <Link href="/teacher/content/books">View Full Library</Link>
            </Button>
         </CardFooter>
      </Card>
    </div>
  );
}
