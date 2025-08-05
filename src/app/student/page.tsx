
// src/app/student/page.tsx
'use client';
import StudentDashboard from '@/components/dashboard/StudentDashboard';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image'; // For loading screen
import { Sigma, GraduationCap, School as SchoolIconLucide, Users, HeartHandshake, ClipboardEdit } from 'lucide-react'; // For loading screen
import { cn } from '@/lib/utils'; // For loading screen

export default function StudentPortalPage() {
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

    if (currentUser.role !== 'Student') {
      if (pathname !== '/') router.push('/'); 
      return;
    }
    // If user is Student, no further redirection needed from here, render dashboard.
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
            Loading Student Portal...
        </p>
      </div>
    );
  }
  
  if (currentUser.role === 'Student') {
    return <StudentDashboard />;
  }

  // Fallback for unexpected state, should ideally not be reached
  return (
     <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background">
        <Image src="/images/Genai.png" alt="GenAI-Campus Logo Loading" width={280} height={77} priority className="mb-8" />
        <p className="text-lg md:text-xl text-muted-foreground">Verifying access...</p>
      </div>
  );
}
