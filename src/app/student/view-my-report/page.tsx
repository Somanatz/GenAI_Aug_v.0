
// src/app/student/view-my-report/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, UserCircle, CalendarDays, BarChartBig, MessageSquare, Loader2, AlertTriangle } from "lucide-react";
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface SubjectPerformance {
  name: string;
  score: number;
  grade: string;
  comments: string;
}

interface ReportCardData {
  studentName: string;
  classLevel: number | string;
  reportDate: string;
  overallGrade: string;
  overallComments: string;
  subjects: SubjectPerformance[];
  schoolName?: string; // Optional
  teacherName?: string; // Optional
  avatarUrl?: string; // Optional
}

export default function StudentReportPage() {
  const { currentUser } = useAuth();
  const [reportData, setReportData] = useState<ReportCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      if (!currentUser) {
        setIsLoading(false);
        // setError("User not authenticated."); // Or redirect
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        // TODO: Replace with actual API endpoint to fetch student's latest report card
        // For example: const data = await api.get<ReportCardData>(`/students/${currentUser.id}/report-card/latest/`);
        // Simulating API call and response for now:
        await new Promise(resolve => setTimeout(resolve, 1000));
        // setReportData(data); 
        setError("Report card API not yet implemented. Showing placeholder structure.");
        setReportData({ // Keep placeholder for structure if API fails/not ready
            studentName: currentUser.student_profile?.full_name || currentUser.username,
            classLevel: currentUser.student_profile?.enrolled_class_name || 'N/A',
            reportDate: new Date().toLocaleDateString(),
            overallGrade: "N/A",
            overallComments: "Report data will be fetched from the backend once the API is implemented. This is a placeholder.",
            subjects: [
                { name: "Mathematics", score: 0, grade: "N/A", comments: "Data not available." },
                { name: "Science", score: 0, grade: "N/A", comments: "Data not available." },
            ],
            schoolName: currentUser.student_profile?.school_name || "GenAI Campus",
            avatarUrl: currentUser.student_profile?.profile_picture_url
        });
      } catch (err) {
        console.error("Failed to fetch report card:", err);
        setError(err instanceof Error ? err.message : "Could not load report card data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [currentUser]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-8 p-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-12 w-1/2 rounded" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }


  if (!reportData) { // Handles case where API isn't ready or there's no report
    return (
         <Card className="text-center py-10 bg-card border rounded-xl shadow-lg">
            <CardHeader>
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <CardTitle>Report Card Not Available</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>{error || "Your report card is not yet available or could not be loaded."}</CardDescription>
            </CardContent>
        </Card>
    );
  }


  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-8">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold">My Academic Report</CardTitle>
              <CardDescription className="text-primary-foreground/80 mt-1">Summary of your performance for the current term.</CardDescription>
            </div>
            {reportData.avatarUrl ? (
                 <img src={reportData.avatarUrl} alt={reportData.studentName} className="h-16 w-16 rounded-full border-2 border-primary-foreground" data-ai-hint="student avatar"/>
            ) : (
                <UserCircle size={48} />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div className="p-4 bg-secondary rounded-lg shadow">
              <p className="font-semibold text-secondary-foreground flex items-center"><UserCircle className="mr-2 h-5 w-5" /> Student Name:</p>
              <p className="text-foreground">{reportData.studentName}</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg shadow">
              <p className="font-semibold text-secondary-foreground flex items-center"><BarChartBig className="mr-2 h-5 w-5" /> Class Level:</p>
              <p className="text-foreground">{reportData.classLevel}</p>
            </div>
            <div className="p-4 bg-secondary rounded-lg shadow">
              <p className="font-semibold text-secondary-foreground flex items-center"><CalendarDays className="mr-2 h-5 w-5" /> Report Date:</p>
              <p className="text-foreground">{new Date(reportData.reportDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 text-primary">Subject Performance</h3>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Subject</TableHead>
                    <TableHead className="font-bold text-center">Score (%)</TableHead>
                    <TableHead className="font-bold text-center">Grade</TableHead>
                    <TableHead className="font-bold">Teacher's Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.subjects.map((subject) => (
                    <TableRow key={subject.name}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell className="text-center">{subject.score}</TableCell>
                      <TableCell className="text-center font-semibold">{subject.grade}</TableCell>
                      <TableCell className="text-muted-foreground italic">{subject.comments}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="p-6 bg-muted rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-3 text-foreground flex items-center"><MessageSquare className="mr-2 h-5 w-5 text-primary" /> Overall Summary & Remarks</h3>
            <p className="font-bold text-lg text-primary mb-2">Overall Grade: {reportData.overallGrade}</p>
            <p className="text-muted-foreground leading-relaxed">{reportData.overallComments}</p>
          </div>
        </CardContent>
        <CardFooter className="p-6 md:p-8 bg-secondary border-t">
          <Button variant="default" size="lg" className="ml-auto" onClick={() => alert("PDF Download TBI")}>
            <Download className="mr-2 h-5 w-5" /> Download Report (PDF)
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
