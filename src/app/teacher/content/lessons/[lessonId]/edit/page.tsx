
// src/app/teacher/content/lessons/[lessonId]/edit/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, Save, AlertTriangle } from 'lucide-react';
import type { Subject as SubjectInterface, SchoolClass, Lesson, LessonSummary } from '@/interfaces';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

const lessonEditSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  video_url: z.string().url({ message: "Invalid URL" }).optional().or(z.literal('')),
  audio_url: z.string().url({ message: "Invalid URL" }).optional().or(z.literal('')),
  image_url: z.string().url({ message: "Invalid URL" }).optional().or(z.literal('')),
  simplified_content: z.string().optional(),
  lesson_order: z.coerce.number().min(0).default(0),
  requires_previous_quiz: z.boolean().default(false),
  subject_id: z.string().min(1, "Subject is required"),
  class_id: z.string().optional(),
});

type LessonEditFormValues = z.infer<typeof lessonEditSchema>;

export default function EditLessonPage() {
  const router = useRouter();
  const params = useParams();
  const lessonId = params.lessonId as string;
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  
  const [subjects, setSubjects] = useState<SubjectInterface[]>([]);
  const [assignedClasses, setAssignedClasses] = useState<{ id: string | number; name: string; master_class: string | number; }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LessonEditFormValues>({
    resolver: zodResolver(lessonEditSchema),
    defaultValues: { requires_previous_quiz: false, lesson_order: 0 },
  });
  
  useEffect(() => {
    if (currentUser?.teacher_profile?.assigned_classes_details) {
      setAssignedClasses(currentUser.teacher_profile.assigned_classes_details);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedClassId) {
      api.get<{results: SubjectInterface[]}>(`/subjects/?master_class=${selectedClassId}`)
        .then(res => setSubjects(res.results || []))
        .catch(err => toast({ title: "Error", description: "Failed to load subjects for class", variant: "destructive"}));
    } else {
      setSubjects([]);
    }
  }, [selectedClassId, toast]);

  useEffect(() => {
    const fetchLessonData = async () => {
      if (!lessonId) {
        setError("Lesson ID is missing.");
        setIsFetchingData(false);
        return;
      }
      setIsFetchingData(true);
      try {
        const lessonData = await api.get<Lesson>(`/lessons/${lessonId}/`);
        const subjectData = await api.get<SubjectInterface>(`/subjects/${lessonData.subject}/`);
        const masterClassId = subjectData.master_class;
        
        form.reset({
          title: lessonData.title,
          content: lessonData.content,
          video_url: lessonData.video_url,
          audio_url: lessonData.audio_url,
          image_url: lessonData.image_url,
          simplified_content: lessonData.simplified_content,
          lesson_order: lessonData.lesson_order,
          requires_previous_quiz: lessonData.requires_previous_quiz,
          subject_id: String(lessonData.subject),
          class_id: String(masterClassId),
        });
        
        setSelectedClassId(String(masterClassId));

      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load lesson data.");
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchLessonData();
  }, [lessonId, form, toast]);


  const onSubmit = async (data: LessonEditFormValues) => {
    setIsLoading(true);
    try {
      const payload = { ...data, subject: data.subject_id };
      delete (payload as any).class_id;

      await api.patch(`/lessons/${lessonId}/`, payload);
      toast({ title: "Lesson Updated!", description: `${data.title} has been successfully saved.` });
      router.push('/teacher/content/lessons');
    } catch (error: any) {
      toast({ title: "Lesson Update Failed", description: error.message || "Could not save lesson.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isFetchingData) {
    return (
        <div className="max-w-2xl mx-auto space-y-4 p-4">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-2xl mx-auto text-center py-10 bg-destructive/10 border-destructive">
          <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>Error Loading Lesson</CardTitle></CardHeader>
          <CardContent><CardDescription>{error}</CardDescription></CardContent>
      </Card>
    );
  }


  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center"><BookOpen className="mr-2 text-primary" /> Edit Lesson</CardTitle>
          <CardDescription>Modify the details of your existing lesson.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="class_id" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Class for this Lesson</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); setSelectedClassId(value); form.setValue('subject_id','');}} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {assignedClasses.map(c => <SelectItem key={c.id} value={String(c.master_class)}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select><FormMessage />
                    </FormItem>)} />

                <FormField control={form.control} name="subject_id" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Subject for this Lesson</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedClassId || subjects.length === 0}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger></FormControl>
                        <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                    </Select><FormMessage />
                    </FormItem>)} />
               </div>

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Lesson Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem><FormLabel>Main Content (Text, HTML, or JSON)</FormLabel><FormControl><Textarea rows={8} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="video_url" render={({ field }) => (
                <FormItem><FormLabel>Video URL (Optional)</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="audio_url" render={({ field }) => (
                <FormItem><FormLabel>Audio URL (Optional)</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="image_url" render={({ field }) => (
                <FormItem><FormLabel>Image URL (Optional)</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="simplified_content" render={({ field }) => (
                <FormItem><FormLabel>Simplified Content (Optional)</FormLabel><FormControl><Textarea rows={5} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="lesson_order" render={({ field }) => (
                <FormItem><FormLabel>Lesson Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="requires_previous_quiz" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                        <FormLabel>Requires Previous Lesson's Quiz to be Passed</FormLabel>
                        <FormDescription>If checked, students must pass the quiz of the preceding lesson in this subject to unlock this lesson.</FormDescription>
                    </div>
                </FormItem>
              )} />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
