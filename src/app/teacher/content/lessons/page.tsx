
// src/app/teacher/content/lessons/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit2, Trash2, Eye, Search } from "lucide-react";
import Link from "next/link";
import { api } from '@/lib/api';
import type { LessonSummary } from '@/interfaces';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';


export default function ManageLessonsPage() {
  const { currentUser } = useAuth();
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLessons = async () => {
      if (!currentUser?.teacher_profile?.school) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get<{results: LessonSummary[]}>(`/lessons/?subject__master_class__schoolclass__school=${currentUser.teacher_profile.school}`);
        setLessons(response.results || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load lessons.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLessons();
  }, [currentUser]);

  const filteredLessons = lessons.filter(lesson =>
    lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lesson.subject_name && lesson.subject_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage Lessons</h1>
        <Button asChild>
          <Link href="/teacher/content/lessons/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Lesson
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <CardTitle>All Lessons</CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or subject..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <p className="text-destructive text-center">{error}</p>
          ) : filteredLessons.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No lessons found.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-center">Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLessons.map(lesson => (
                  <TableRow key={lesson.id}>
                    <TableCell className="font-medium">{lesson.title}</TableCell>
                    <TableCell>{lesson.subject_name}</TableCell>
                    <TableCell className="text-center">{lesson.lesson_order}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" title="View" asChild>
                        <Link href={`/teacher/content/lessons/${lesson.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                       <Button variant="ghost" size="icon" title="Edit" asChild>
                        <Link href={`/teacher/content/lessons/${lesson.id}/edit`}><Edit2 className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
