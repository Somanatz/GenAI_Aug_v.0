// src/app/teacher/content/lessons/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Loader2, BookOpen, PlusCircle } from 'lucide-react';
import type { Subject as SubjectInterface, SchoolClass, User } from '@/interfaces';
import { useAuth } from '@/context/AuthContext';

const lessonSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  video_url: z.string().url({ message: "Invalid URL" }).optional().or(z.literal('')),
  audio_url: z.string().url({ message: "Invalid URL" }).optional().or(z.literal('')),
  image_url: z.string().url({ message: "Invalid URL" }).optional().or(z.literal('')),
  simplified_content: z.string().optional(),
  lesson_order: z.coerce.number().min(0).default(0),
  requires_previous_quiz: z.boolean().default(false),
  subject_id: z.string().min(1, "Subject is required"),
  class_id: z.string().optional(), // This is for filtering only
});

type LessonCreateFormValues = z.infer<typeof lessonSchema>;

export default function CreateLessonPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const assignedClasses = currentUser?.teacher_profile?.assigned_classes_details || [];
  const [subjects, setSubjects] = useState<SubjectInterface[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const form = useForm<LessonCreateFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: '',
      content: '',
      video_url: '',
      audio_url: '',
      image_url: '',
      lesson_order: 0,
      requires_previous_quiz: false,
    },
  });

  useEffect(() => {
    // Ensure we only fetch subjects if a valid class ID is selected
    if (selectedClassId && selectedClassId !== 'undefined' && selectedClassId !== null) {
      api.get<{results: SubjectInterface[]}>(`/subjects/?master_class=${selectedClassId}`)
        .then(res => {
          const subjectData = Array.isArray(res) ? res : res.results || [];
          setSubjects(subjectData);
        })
        .catch(err => toast({ title: "Error", description: "Failed to load subjects for class", variant: "destructive"}));
      form.resetField("subject_id");
    } else {
      setSubjects([]);
    }
  }, [selectedClassId, toast, form]);


  const onSubmit = async (data: LessonCreateFormValues) => {
    setIsLoading(true);
    try {
      const payload = { ...data, subject: data.subject_id };
      delete (payload as any).class_id;

      await api.post('/lessons/', payload);
      toast({ title: "Lesson Created!", description: `${data.title} has been successfully created.` });
      router.push('/teacher/content'); 
    } catch (error: any) {
      toast({ title: "Lesson Creation Failed", description: error.message || "Could not create lesson.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center"><BookOpen className="mr-2 text-primary" /> Create New Lesson</CardTitle>
          <CardDescription>Fill in the details to add a new lesson to your curriculum.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
               <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="class_id" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Class for this Lesson</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); setSelectedClassId(value);}} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {assignedClasses && assignedClasses.length > 0 ? assignedClasses.map(c => 
                                    <SelectItem key={c.id} value={String(c.master_class)}>{c.name}</SelectItem>
                                ) : <div className="text-center text-xs text-muted-foreground p-2">No classes assigned.</div>}
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
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Create Lesson
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
