// src/app/teacher/report-card/page.tsx
import ReportCardGenerator from '@/components/report-card/ReportCardGenerator';
import { api } from '@/lib/api';
import type { User, SchoolClass, Subject } from '@/interfaces';

async function getTeacherData(teacherId: number): Promise<{ classes: SchoolClass[]; students: User[] }> {
    try {
        const teacherData = await api.get<User>(`/users/${teacherId}/`);
        const schoolId = teacherData?.teacher_profile?.school;
        if (!schoolId) return { classes: [], students: [] };
        
        const [classesResponse, studentsResponse] = await Promise.all([
             api.get<{ results: SchoolClass[] }>(`/school-classes/?school=${schoolId}&page_size=100`),
             api.get<{ results: User[] }>(`/users/?school=${schoolId}&role=Student&page_size=500`)
        ]);

        return {
            classes: classesResponse.results || [],
            students: studentsResponse.results || [],
        };
    } catch (error) {
        console.error("Failed to fetch teacher data for report card:", error);
        return { classes: [], students: [] };
    }
}

// This page now acts as a Server Component to fetch initial data
export default async function TeacherReportCardPage() {
  // In a real app, you'd get the teacher's ID from the session.
  // For this example, we'll hardcode a user ID or assume a session provider.
  // const { currentUser } = useAuth(); // Can't use hooks in server components
  // const teacherData = await getTeacherData(currentUser.id); 

  return (
    <div className="py-8">
      {/* Pass fetched data as props to the client component */}
      <ReportCardGenerator />
    </div>
  );
}
