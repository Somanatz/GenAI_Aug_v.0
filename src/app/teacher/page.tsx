// src/app/teacher/page.tsx
'use client';
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, UserCheck } from 'lucide-react';
import Image from 'next/image'; 
import { Sigma, GraduationCap, School as SchoolIconLucide, Users, HeartHandshake, ClipboardEdit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function TeacherDashboardPage() {
  const { currentUser, isLoadingAuth } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoadingAuth) {
      return; 
    }

    if (!currentUser) {
      if (pathname !== '/login') router.push('/login');
      return;
    }

    if (currentUser.role !== 'Teacher') {
      if (pathname !== '/') router.push('/');
      return;
    }
  }, [isLoadingAuth, currentUser, router, pathname]);

  if (isLoadingAuth || !currentUser) {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background">
        <Image src="/images/Genai.png" alt="GenAI-Campus Logo Loading" width={280} height={77} priority className="mb-8" />
        <div className="flex space-x-3 sm:space-x-4 md:space-x-6 mb-8">
            <Sigma className={cn("h-10 w-10 md:h-12 md:w-12 text-primary", "animation-delay-100")} />
            <GraduationCap className={cn("h-10 w-10 md:h-12 md:w-12 text-primary", "animation-delay-200")} />
            <SchoolIconLucide className={cn("h-10 w-10 md:h-12 md:w-12 text-primary", "animation-delay-300")} />
            <Users className={cn("h-10 w-10 md:h-12 md:w-12 text-primary", "animation-delay-400")} />
            <HeartHandshake className={cn("h-10 w-10 md:h-12 md:w-12 text-primary", "animation-delay-500")} />
            <ClipboardEdit className={cn("h-10 w-10 md:h-12 md:w-12 text-primary", "animation-delay-700")} />
        </div>
        <p className="text-lg md:text-xl text-muted-foreground">
            Loading Teacher Portal...
        </p>
      </div>
    );
  }
  
  if (currentUser.role === 'Teacher') {
    // Add the profile completion check here
    if (!currentUser.profile_completed) {
      return (
        <Card className="text-center py-10 shadow-lg rounded-xl bg-secondary max-w-lg mx-auto mt-10">
          <CardHeader>
            <UserCheck className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-2xl font-bold">Complete Your Profile to Begin!</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              Please complete your teacher profile to access your dashboard and manage your classes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/teacher/complete-profile">Complete Your Profile</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }
    return <TeacherDashboard />;
  }

  // Fallback for unexpected state, should ideally not be reached
  return (
     <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background">
        <Image src="/images/Genai.png" alt="GenAI-Campus Logo Loading" width={280} height={77} priority className="mb-8" />
        <p className="text-lg md:text-xl text-muted-foreground">Verifying access...</p>
      </div>
  );
}
