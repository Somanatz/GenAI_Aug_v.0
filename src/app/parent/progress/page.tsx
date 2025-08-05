
// src/app/parent/progress/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart3, Users, TrendingUp, Eye, ListFilter, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { ParentStudentLinkAPI, StudentProfileData } from '@/interfaces';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added import

interface ChildProgressSummary {
  studentId: string; // Student User ID
  name: string;
  avatarUrl?: string;
  classLevel: number | string;
  overallProgress: number;
  subjectsBehind?: number; 
  subjectsExcelling?: number; 
  lastActivity: string;
}

export default function ParentProgressOverviewPage() {
  const { currentUser } = useAuth();
  const [childrenProgress, setChildrenProgress] = useState<ChildProgressSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChildrenData = async () => {
      if (!currentUser) return;
      setIsLoading(true);
      setError(null);
      try {
        const linkResponse = await api.get<ParentStudentLinkAPI[] | { results: ParentStudentLinkAPI[] }>(`/parent-student-links/?parent=${currentUser.id}`);
        const actualLinks = Array.isArray(linkResponse) ? linkResponse : linkResponse.results || [];
        
        const progressSummaries: ChildProgressSummary[] = [];
        for (const link of actualLinks) {
          // TODO: Fetch actual progress data for each child from `/api/students/${link.student}/progress-summary/`
          // For now, using placeholder/mocked progress
          await new Promise(resolve => setTimeout(resolve, 200)); // Simulate delay for each child
          progressSummaries.push({
            studentId: String(link.student),
            name: link.student_details?.full_name || link.student_username || "Unknown Student",
            avatarUrl: link.student_details?.profile_picture_url || `https://placehold.co/80x80.png?text=${(link.student_details?.full_name || "S").charAt(0)}`,
            classLevel: link.student_details?.enrolled_class_name || 'N/A',
            overallProgress: Math.floor(Math.random() * 70) + 30, // Mocked
            subjectsBehind: Math.floor(Math.random() * 3), // Mocked
            subjectsExcelling: Math.floor(Math.random() * 2), // Mocked
            lastActivity: "Mocked: Logged In", // Mocked
          });
        }
        setChildrenProgress(progressSummaries);
        if (actualLinks.length > 0) {
            setError("Note: Individual child progress data is currently mocked. API integration needed for real-time progress.");
        }

      } catch (err) {
        console.error("Failed to fetch children progress:", err);
        setError(err instanceof Error ? err.message : "Could not load children's progress data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchChildrenData();
  }, [currentUser]);

  const totalProgress = childrenProgress.reduce((sum, child) => sum + child.overallProgress, 0);
  const averageProgress = childrenProgress.length > 0 ? Math.round(totalProgress / childrenProgress.length) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center"><BarChart3 className="mr-3 text-primary" /> Progress Overview</h1>
          <p className="text-muted-foreground">A summary of your children's academic progress on GenAI-Campus.</p>
        </div>
         <Button variant="outline"><ListFilter className="mr-2 h-4 w-4"/> Filter (TBI)</Button>
      </div>

      <Card className="shadow-lg rounded-xl bg-secondary dark:bg-card">
        <CardHeader>
          <CardTitle className="text-2xl text-secondary-foreground dark:text-primary-foreground">Family Progress Snapshot</CardTitle>
          <CardDescription className="text-secondary-foreground/80 dark:text-primary-foreground/80">Average progress across all linked children.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && childrenProgress.length === 0 ? (
             <Skeleton className="h-10 w-full" />
          ) : childrenProgress.length > 0 ? (
            <div className="flex items-center gap-4">
              <Progress value={averageProgress} aria-label="Average family progress" className="h-6 flex-1 bg-background" />
              <span className="text-3xl font-bold text-primary">{averageProgress}%</span>
            </div>
          ) : (
             <p className="text-sm text-muted-foreground">No children linked to display family progress.</p>
          )}
          {!isLoading && <p className="text-sm text-muted-foreground mt-2">{childrenProgress.length} children linked.</p>}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold flex items-center"><Users className="mr-3 text-accent" />Individual Child Progress</h2>
        {isLoading ? (
             [...Array(childrenProgress.length || 1)].map((_, i) => <Skeleton key={i} className="h-60 w-full rounded-xl" />)
        ) : error && !childrenProgress.length ? (
            <Card className="text-center py-6 bg-destructive/10 border-destructive rounded-md">
                <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
                <CardTitle className="text-lg">Error Loading Children Data</CardTitle>
                <CardDescription className="text-destructive-foreground">{error}</CardDescription>
            </Card>
        ) : childrenProgress.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No children linked to display individual progress.</p>
        ) : (
            childrenProgress.map(child => (
            <Card key={child.studentId} className="shadow-md hover:shadow-lg transition-shadow rounded-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border">
                    <AvatarImage src={child.avatarUrl} alt={child.name} data-ai-hint="child avatar"/>
                    <AvatarFallback>{child.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                    <CardTitle className="text-xl">{child.name}</CardTitle>
                    <CardDescription>Class {child.classLevel} - Overall: {child.overallProgress}%</CardDescription>
                    </div>
                </div>
                <Button asChild variant="default" size="sm">
                    <Link href={`/parent/child/${child.studentId}/progress`}><Eye className="mr-2 h-4 w-4"/>Detailed View</Link>
                </Button>
                </CardHeader>
                <CardContent>
                <Progress value={child.overallProgress} aria-label={`${child.name}'s progress`} className="h-3 mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                    <div className="p-2 bg-muted rounded-md">
                    <p className="font-medium text-muted-foreground">Last Activity:</p>
                    <p className="truncate">{child.lastActivity}</p>
                    </div>
                    {child.subjectsExcelling !== undefined && (
                    <div className={`p-2 rounded-md ${child.subjectsExcelling > 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-muted'}`}>
                    <p className={`font-medium ${child.subjectsExcelling > 0 ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground'}`}>Subjects Excelling:</p>
                    <p className={child.subjectsExcelling > 0 ? 'text-green-600 dark:text-green-200 font-semibold' : ''}>{child.subjectsExcelling}</p>
                    </div>
                    )}
                    {child.subjectsBehind !== undefined && (
                    <div className={`p-2 rounded-md ${child.subjectsBehind > 0 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-muted'}`}>
                    <p className={`font-medium ${child.subjectsBehind > 0 ? 'text-red-700 dark:text-red-300' : 'text-muted-foreground'}`}>Needs Focus:</p>
                    <p className={child.subjectsBehind > 0 ? 'text-red-600 dark:text-red-200 font-semibold' : ''}>{child.subjectsBehind} subject(s)</p>
                    </div>
                    )}
                </div>
                </CardContent>
            </Card>
            ))
        )}
         {error && childrenProgress.length > 0 && ( // Show non-blocking error if some data is already displayed
            <Alert variant="warning" className="mt-4"><AlertTriangle className="h-4 w-4" /><AlertTitle>Note</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
         )}
      </div>
    </div>
  );
}
