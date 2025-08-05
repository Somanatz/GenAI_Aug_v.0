
// src/app/school-admin/[schoolId]/content/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookCopy } from "lucide-react";

export default function SchoolAdminContentOverviewPage() {
  const params = useParams();
  const schoolId = params.schoolId;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center">
        <BookCopy className="mr-3 text-primary" /> Content Overview (School ID: {schoolId})
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>School-wide Content</CardTitle>
          <CardDescription>View all classes, subjects, lessons, and quizzes created for this school.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">A summary of all educational content, with options to manage or assign, will be available here.</p>
          {/* TODO: Fetch and display content overview for this schoolId */}
        </CardContent>
      </Card>
    </div>
  );
}
