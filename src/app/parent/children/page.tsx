// src/app/parent/children/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, FileText, PlusCircle, MessageSquare, Loader2, Trash2, AlertTriangle, Link2, UserCheck, AlertCircle as AlertCircleIcon } from "lucide-react"; 
import Link from "next/link";
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { ParentStudentLinkAPI, StudentProfileData, User } from '@/interfaces';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface DisplayChild {
  id: string; // This is the ParentStudentLink ID
  studentId: string;
  name: string;
  avatarUrl?: string;
  classLevel: string; // Can be string like "Class 5" or number converted to string
  overallProgress: number;
  lastActivity?: string;
  studentProfile?: StudentProfileData;
}

const linkChildSchema = z.object({
  student_admission_number: z.string().min(1, "Student admission number is required"),
  student_school_id_code: z.string().min(1, "School ID code is required"),
});

type LinkChildFormValues = z.infer<typeof linkChildSchema>;

interface StudentForConfirmation {
    link_id: string | number;
    message: string;
    student_details: StudentProfileData;
}


export default function MyChildrenPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [linkedChildren, setLinkedChildren] = useState<DisplayChild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLinkChildDialogOpen, setIsLinkChildDialogOpen] = useState(false);
  const [studentToConfirm, setStudentToConfirm] = useState<StudentForConfirmation | null>(null);
  const [linkingError, setLinkingError] = useState<string | null>(null);


  const form = useForm<LinkChildFormValues>({
    resolver: zodResolver(linkChildSchema),
    defaultValues: { student_admission_number: "", student_school_id_code: "" },
  });

  const fetchLinkedChildren = async () => {
    if (!currentUser || currentUser.role !== 'Parent') return;
    setIsLoading(true);
    setError(null);
    try {
      const linkResponse = await api.get<ParentStudentLinkAPI[] | { results: ParentStudentLinkAPI[] }>(`/parent-student-links/?parent=${currentUser.id}`);
      
      let actualLinks: ParentStudentLinkAPI[];
      if (Array.isArray(linkResponse)) {
        actualLinks = linkResponse;
      } else if (linkResponse && Array.isArray(linkResponse.results)) {
        actualLinks = linkResponse.results;
      } else {
        console.error("Unexpected parent-student link data format:", linkResponse);
        actualLinks = [];
      }
      
      const displayChildren: DisplayChild[] = actualLinks.map(link => ({
        id: String(link.id),
        studentId: String(link.student),
        name: link.student_details?.full_name || link.student_username || "Unknown Student",
        avatarUrl: link.student_details?.profile_picture_url || `https://placehold.co/100x100.png?text=${(link.student_details?.full_name || link.student_username || "U").charAt(0).toUpperCase()}`,
        classLevel: typeof link.student_details?.enrolled_class_name === 'string' && link.student_details.enrolled_class_name.trim() !== '' 
            ? link.student_details.enrolled_class_name 
            : (typeof link.student_details?.enrolled_class === 'number' || typeof link.student_details?.enrolled_class === 'string' 
                ? `Class ${link.student_details.enrolled_class}` 
                : 'N/A'),
        overallProgress: Math.floor(Math.random() * 50) + 50, 
        lastActivity: "Mocked: Logged In", 
        studentProfile: link.student_details,
      }));
      setLinkedChildren(displayChildren);
    } catch (err) {
      console.error("Failed to fetch linked children:", err);
      setError(err instanceof Error ? err.message : "Failed to load children data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) { 
        fetchLinkedChildren();
    } else {
        setIsLoading(false); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const onLinkChildSubmit = async (data: LinkChildFormValues) => {
    if (!currentUser) return;
    setIsLinking(true);
    setLinkingError(null);
    setStudentToConfirm(null);
    try {
      const linkedStudentData = await api.post<StudentForConfirmation>(
        '/parent-student-links/link-child-by-admission/', 
        {
          admission_number: data.student_admission_number,
          school_id_code: data.student_school_id_code,
        }
      );
      setStudentToConfirm(linkedStudentData);
      toast({ 
        title: "Child Linked Successfully!", 
        description: `${linkedStudentData.student_details?.full_name || 'The student'} is now linked. ${linkedStudentData.message || ''}` 
      });
      fetchLinkedChildren(); 
      form.reset();
    } catch (err: any) {
      let errMsg = "Linking Failed. Ensure the admission number and school ID are correct, and your email matches the student's parent contact email.";
      if (err.response?.data?.error) {
        errMsg = err.response.data.error;
      } else if (err.response?.data?.detail) {
        errMsg = err.response.data.detail;
      } else if (err.message) {
        errMsg = err.message;
      }
      setLinkingError(errMsg);
      toast({ title: "Linking Failed", description: errMsg, variant: "destructive" });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkChild = async (linkId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to unlink ${studentName}?`)) return;
    try {
        await api.delete(`/parent-student-links/${linkId}/`);
        toast({ title: "Child Unlinked", description: `${studentName} has been unlinked.` });
        fetchLinkedChildren(); 
    } catch (err:any) {
        toast({ title: "Unlinking Failed", description: err.message || "Could not unlink child.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-1/3" /> <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error) {
     return <Card className="text-center py-10"><CardContent><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>Error Loading Children</CardTitle><CardDescription>{error}</CardDescription></CardContent></Card>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center"><Users className="mr-3 text-primary" /> My Children</h1>
          <p className="text-muted-foreground">Manage your children's profiles, link new children, and access their learning information.</p>
        </div>
        <Dialog open={isLinkChildDialogOpen} onOpenChange={(open) => {
            setIsLinkChildDialogOpen(open);
            if (!open) { 
                setStudentToConfirm(null);
                setLinkingError(null);
                form.reset();
            }
        }}>
            <DialogTrigger asChild>
                <Button size="lg" onClick={() => { form.reset(); setStudentToConfirm(null); setLinkingError(null); setIsLinkChildDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-5 w-5" /> Link New Child
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Link a New Child</DialogTitle>
                    <DialogDescription>Enter your child's Admission Number and their School ID Code. Your email ({currentUser?.email}) must match the parent email on the student's record for successful linking.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onLinkChildSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="student_admission_number"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Child's Admission Number</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., ADM12345" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="student_school_id_code"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Child's School ID Code</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., SCH001" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         {linkingError && (
                            <Alert variant="destructive" className="mt-4">
                                <AlertCircleIcon className="h-4 w-4" />
                                <AlertTitle>Linking Error</AlertTitle>
                                <AlertDescription>{linkingError}</AlertDescription>
                            </Alert>
                        )}
                        {studentToConfirm && studentToConfirm.student_details && (
                            <Alert className="mt-4 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700">
                                <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <AlertTitle className="text-green-700 dark:text-green-300">Child Linked Successfully!</AlertTitle>
                                <AlertDescription className="text-green-600 dark:text-green-400 space-y-1">
                                    <p><strong>Name:</strong> {studentToConfirm.student_details.full_name || 'N/A'}</p>
                                    {studentToConfirm.student_details.school_name && <p><strong>School:</strong> {studentToConfirm.student_details.school_name}</p>}
                                    {studentToConfirm.student_details.enrolled_class_name && <p><strong>Class:</strong> {studentToConfirm.student_details.enrolled_class_name}</p>}
                                    {studentToConfirm.message && <p className="mt-1">{studentToConfirm.message}</p>}
                                </AlertDescription>
                            </Alert>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setIsLinkChildDialogOpen(false); setStudentToConfirm(null); setLinkingError(null); form.reset();}}>Close</Button>
                            {!studentToConfirm && (
                                <Button type="submit" disabled={isLinking}>
                                    {isLinking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    <Link2 className="mr-2 h-4 w-4" /> Verify & Link Child
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>

      {linkedChildren.length > 0 ? (
        <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {linkedChildren.map(child => (
            <Card key={child.id} className="shadow-lg hover:shadow-xl transition-shadow rounded-xl flex flex-col">
              <CardHeader className="flex flex-row items-center space-x-4">
                <Avatar className="h-20 w-20 border-2 border-primary">
                  <AvatarImage src={child.avatarUrl} alt={child.name} data-ai-hint="child avatar"/>
                  <AvatarFallback>{child.name ? child.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'S'}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{child.name}</CardTitle>
                  <CardDescription>{child.classLevel || 'N/A'}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 flex-grow">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-muted-foreground">Overall Progress</span>
                    <span className="text-sm font-bold text-primary">{child.overallProgress}%</span>
                  </div>
                  <Progress value={child.overallProgress} aria-label={`${child.name}'s overall progress`} />
                </div>
                {child.lastActivity && (
                  <p className="text-sm text-muted-foreground"><strong className="font-medium text-foreground">Recent Activity:</strong> {child.lastActivity}</p>
                )}
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-2 pt-4 border-t">
                <Button variant="default" asChild className="w-full">
                  <Link href={`/parent/child/${child.studentId}/progress`}><TrendingUp className="mr-2 h-4 w-4" />View Progress</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                   <Link href={`/parent/reports/${child.studentId}`}><FileText className="mr-2 h-4 w-4" />View Report</Link>
                </Button>
                <Button variant="ghost" className="w-full col-span-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleUnlinkChild(child.id, child.name)}>
                   <Trash2 className="mr-2 h-4 w-4" /> Unlink Child
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-10 rounded-xl shadow-md">
          <CardHeader>
            <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle>No Children Linked</CardTitle>
            <CardDescription>It looks like you haven't linked any children to your account yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" onClick={() => { form.reset(); setStudentToConfirm(null); setLinkingError(null); setIsLinkChildDialogOpen(true);}}>
              <PlusCircle className="mr-2 h-5 w-5" /> Link Your First Child
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
