
// src/app/teacher/students/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, PlusCircle, Search, MoreHorizontal, Eye, BarChart3, MessageSquare, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import type { User as UserInterface, UserLessonProgress } from '@/interfaces';
import { formatDistanceToNow } from 'date-fns';

interface DisplayStudent {
  id: string | number;
  username: string;
  email: string;
  full_name?: string | null;
  class_name?: string | null;
  overallProgress: number;
  lastLogin?: string | null;
  avatarUrl?: string;
}

export default function ManageStudentsPage() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<DisplayStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
        if (!currentUser || !currentUser.teacher_profile?.school) {
            setError("Cannot load students: teacher is not associated with a school.");
            setIsLoading(false);
            return;
        }

      setIsLoading(true);
      setError(null);
      try {
        const schoolId = currentUser.teacher_profile.school;
        
        // Fetch all students belonging to the teacher's school
        const studentsResponse = await api.get<{ results: UserInterface[] }>(`/users/?role=Student&school=${schoolId}&page_size=200`);
        const usersData = studentsResponse.results || [];

        const allProgressDataResponse = await api.get<{results: UserLessonProgress[]}>(`/userprogress/?lesson__subject__master_class__syllabus__schools=${schoolId}&page_size=1000`);
        const allProgressData = allProgressDataResponse.results || [];
        
        const allLessonsDataResponse = await api.get<{results: any[]}>(`/lessons/?subject__master_class__syllabus__schools=${schoolId}&page_size=1000`);
        const allLessonsData = allLessonsDataResponse.results || [];

        const progressByUser = new Map<number, Set<number>>();
        allProgressData.forEach(p => {
            if (p.completed) {
                if (!progressByUser.has(p.user)) progressByUser.set(p.user, new Set());
                progressByUser.get(p.user)?.add(p.lesson);
            }
        });
        
        const totalLessonsByClass = new Map<number, number>();
         usersData.forEach(user => {
            const enrolledClassId = user.student_profile?.enrolled_class;
            if (enrolledClassId && !totalLessonsByClass.has(Number(enrolledClassId))) {
                 const classDetails = user.student_profile?.enrolled_class_details;
                 const classLessons = allLessonsData.filter(l => String(l.subject?.master_class) === String(classDetails?.master_class));
                 totalLessonsByClass.set(Number(enrolledClassId), classLessons.length);
            }
        });

        const transformedStudents: DisplayStudent[] = usersData.map(user => {
            const completedCount = progressByUser.get(user.id)?.size || 0;
            const enrolledClassId = user.student_profile?.enrolled_class;
            const totalLessons = enrolledClassId ? totalLessonsByClass.get(Number(enrolledClassId)) || 0 : 0;
            const overallProgress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

            return {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.student_profile?.full_name,
                class_name: user.student_profile?.enrolled_class_name,
                overallProgress: overallProgress,
                avatarUrl: user.student_profile?.profile_picture_url,
                lastLogin: user.last_login, 
            };
        });

        setStudents(transformedStudents);
      } catch (err) {
        console.error("Failed to fetch students:", err);
        setError(err instanceof Error ? err.message : "Failed to load student data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudents();
  }, [currentUser]);

  const filteredStudents = students.filter(student =>
    (student.full_name || student.username).toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center"><Users className="mr-3 text-primary" /> Manage Students</h1>
          <p className="text-muted-foreground">View, edit, and manage student profiles and progress in your classes.</p>
        </div>
        <Button size="lg" onClick={() => alert("Add New Student - To be implemented")}>
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Student
        </Button>
      </div>

      <Card className="shadow-lg rounded-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
            <CardTitle>Student Roster</CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search students by name or email..." 
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
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : error ? (
             <p className="text-red-500 text-center py-4">{error}</p>
          ) : filteredStudents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {students.length === 0 ? "You are not assigned to any classes or your classes have no students." : "No students found matching your search."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell text-center">Class</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="text-center">Progress</TableHead>
                    <TableHead className="hidden md:table-cell text-center">Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={student.avatarUrl} alt={student.username} data-ai-hint="student avatar"/>
                            <AvatarFallback>{(student.full_name || student.username).split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{student.full_name || student.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center">{student.class_name || 'N/A'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">{student.email}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={student.overallProgress > 70 ? "default" : "secondary"} className={student.overallProgress > 85 ? "bg-green-500 hover:bg-green-600 text-white" : student.overallProgress < 60 ? "bg-red-500 hover:bg-red-600 text-white" : ""}>
                          {student.overallProgress}%
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-center text-muted-foreground">
                        {student.lastLogin ? formatDistanceToNow(new Date(student.lastLogin), { addSuffix: true }) : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-5 w-5" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                                <Link href={`/teacher/students/${student.id}`}><Eye className="mr-2 h-4 w-4" /> View Profile</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                               <Link href={`/teacher/analytics/${student.id}`}><BarChart3 className="mr-2 h-4 w-4" /> View Progress</Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem asChild>
                               <Link href={`/teacher/communication/message?studentId=${student.id}`}><MessageSquare className="mr-2 h-4 w-4" /> Send Message</Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
