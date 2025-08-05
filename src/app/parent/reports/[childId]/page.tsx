
// src/app/parent/reports/[childId]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, UserCircle, CalendarDays, BarChartBig, MessageSquare, Loader2, AlertTriangle } from "lucide-react";
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
  avatarUrl?: string;
  classLevel: number | string;
  reportDate: string;
  schoolName: string;
  teacherName: string;
  overallGrade: string;
  overallComments: string;
  subjects: SubjectPerformance[];
}

export default function ChildReportCardPage() {
  const params = useParams();
  const { currentUser } = useAuth();
  const childId = params.childId as string;
  
  const [reportData, setReportData] = useState<ReportCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    const fetchReport = async () => {
      if (!childId || !currentUser) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        // TODO: Implement API endpoint for specific child report card
        // For example: const data = await api.get<ReportCardData>(`/users/${childId}/report-card/latest/`);
        // Simulating API call and response for now:
        await new Promise(resolve => setTimeout(resolve, 1000));
        const mockReport : ReportCardData = {
            studentName: `Child ${childId} (Fetched)`, // Replace with actual data
            avatarUrl: `https://placehold.co/100x100.png?text=C${childId}`,
            classLevel: `Class X (Fetched)`, // Replace
            reportDate: new Date().toISOString(),
            schoolName: "GenAI Campus (Fetched)",
            teacherName: "Dr. Teacher (Fetched)",
            overallGrade: "B+",
            overallComments: "This is a placeholder report. API integration needed to fetch real data for this child.",
            subjects: [
                { name: "Mathematics", score: 80, grade: "B", comments: "Good effort." },
                { name: "Science", score: 75, grade: "B-", comments: "Shows interest." },
            ]
        };
        setReportData(mockReport);
        setError("Child report card API not yet fully implemented. Displaying placeholder structure.");
      } catch (err) {
        console.error("Failed to fetch child report card:", err);
        setError(err instanceof Error ? err.message : "Could not load report card data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [childId, currentUser]);

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

  if (error && !reportData) {
     return (
         <Card className="text-center py-10 bg-destructive/10 border-destructive rounded-xl shadow-lg">
            <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>Error Loading Report</CardTitle></CardHeader>
            <CardContent><CardDescription className="text-destructive-foreground">{error}</CardDescription></CardContent>
        </Card>
    );
  }
  
  if (!reportData) {
      return (
        <Card className="text-center py-10 bg-card border rounded-xl shadow-lg">
            <CardHeader><FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" /><CardTitle>Report Not Available</CardTitle></CardHeader>
            <CardContent><CardDescription>The report card for this child could not be loaded or is not yet available.</CardDescription></CardContent>
        </Card>
      );
  }


  return (
    <div className="max-w-4xl mx-auto space-y-8">
       {error && reportData && ( // Show non-blocking error if data is at least placeholder
         <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Note</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Card className="shadow-xl rounded-xl overflow-hidden">
        <CardHeader className="bg-primary text-primary-foreground p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary-foreground">
              <AvatarImage src={reportData.avatarUrl} alt={reportData.studentName} data-ai-hint="child avatar"/>
              <AvatarFallback>{reportData.studentName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <CardTitle className="text-3xl font-bold">{reportData.studentName}'s Report Card</CardTitle>
              <CardDescription className="text-primary-foreground/80 mt-1">
                {reportData.schoolName} - Class {reportData.classLevel}
              </CardDescription>
            </div>
            <FileText size={48} className="hidden sm:block" />
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm mb-6">
            <InfoBox icon={UserCircle} label="Teacher" value={reportData.teacherName} />
            <InfoBox icon={CalendarDays} label="Report Date" value={new Date(reportData.reportDate).toLocaleDateString()} />
            <InfoBox icon={BarChartBig} label="Overall Grade" value={reportData.overallGrade} className="font-bold text-lg" />
          </div>
          
          <div className="p-6 bg-secondary rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-3 text-secondary-foreground flex items-center">
                <MessageSquare className="mr-2 h-5 w-5" /> Teacher's Overall Remarks
            </h3>
            <p className="text-foreground leading-relaxed italic">{reportData.overallComments}</p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3 text-primary">Subject Performance Details</h3>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Subject</TableHead>
                    <TableHead className="font-bold text-center">Score (%)</TableHead>
                    <TableHead className="font-bold text-center">Grade</TableHead>
                    <TableHead className="font-bold">Comments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.subjects.map((subject) => (
                    <TableRow key={subject.name}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell className="text-center">{subject.score}</TableCell>
                      <TableCell className="text-center font-semibold">{subject.grade}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{subject.comments}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-6 md:p-8 bg-muted border-t">
          <p className="text-xs text-muted-foreground">This report reflects {reportData.studentName}'s performance for the term ending {new Date(reportData.reportDate).toLocaleDateString()}. Please contact {reportData.teacherName} for any clarifications.</p>
          <Button variant="default" size="lg" className="ml-auto" onClick={() => alert("PDF Download TBI")}>
            <Download className="mr-2 h-5 w-5" /> Download Report (PDF)
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

interface InfoBoxProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  className?: string;
}
const InfoBox: React.FC<InfoBoxProps> = ({ icon: Icon, label, value, className }) => (
  <div className="p-4 bg-muted rounded-lg shadow">
    <p className="font-semibold text-muted-foreground flex items-center text-xs uppercase tracking-wider"><Icon className="mr-2 h-4 w-4" /> {label}:</p>
    <p className={`text-foreground mt-0.5 ${className}`}>{value}</p>
  </div>
);
