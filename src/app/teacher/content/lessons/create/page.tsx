
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookOpen, PlusCircle } from 'lucide-react';
import type { Subject as SubjectInterface, Class as ClassInterface, School } from '@/interfaces';

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
  // Optional: class_id and school_id for filtering subjects
  class_id: z.string().optional(),
  school_id: z.string().optional(),
});

type LessonCreateFormValues = z.infer<typeof lessonSchema>;

export default function CreateLessonPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassInterface[]>([]);
  const [subjects, setSubjects] = useState<SubjectInterface[]>([]);
  
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);


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
    api.get<School[] | {results: School[]}>('/schools/').then(res => {
      const data = Array.isArray(res) ? res : res.results || [];
      setSchools(data);
    }).catch(err => toast({ title: "Error", description: "Failed to load schools", variant: "destructive"}));
  }, [toast]);

  useEffect(() => {
    if (selectedSchool) {
      api.get<ClassInterface[] | {results: ClassInterface[]}>(`/classes/?school=${selectedSchool}`)
        .then(res => {
          const data = Array.isArray(res) ? res : res.results || [];
          setClasses(data);
        })
        .catch(err => toast({ title: "Error", description: "Failed to load classes for school", variant: "destructive"}));
      setSubjects([]); // Reset subjects when school changes
      form.resetField("class_id");
      form.resetField("subject_id");
    } else {
      setClasses([]);
      setSubjects([]);
    }
  }, [selectedSchool, toast, form]);

  useEffect(() => {
    if (selectedClass) {
      api.get<SubjectInterface[] | {results: SubjectInterface[]}>(`/subjects/?class_obj=${selectedClass}`)
        .then(res => {
          const data = Array.isArray(res) ? res : res.results || [];
          setSubjects(data);
        })
        .catch(err => toast({ title: "Error", description: "Failed to load subjects for class", variant: "destructive"}));
      form.resetField("subject_id");
    } else {
      setSubjects([]);
    }
  }, [selectedClass, toast, form]);


  const onSubmit = async (data: LessonCreateFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        ...data,
        subject: data.subject_id, // API expects 'subject' not 'subject_id'
      };
      // delete payload.subject_id; // Not needed as serializer uses source='subject'
      delete payload.class_id; // Not part of Lesson model
      delete payload.school_id; // Not part of Lesson model

      await api.post('/lessons/', payload);
      toast({ title: "Lesson Created!", description: `${data.title} has been successfully created.` });
      router.push('/teacher/content'); // Or to the lesson detail page
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
              <FormField control={form.control} name="school_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>School for this Lesson</FormLabel>
                  <Select onValueChange={(value) => { field.onChange(value); setSelectedSchool(value);}} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger></FormControl>
                    <SelectContent>{schools.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>)} />
              
              <FormField control={form.control} name="class_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Class for this Lesson</FormLabel>
                  <Select onValueChange={(value) => { field.onChange(value); setSelectedClass(value);}} value={field.value} disabled={!selectedSchool || classes.length === 0}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger></FormControl>
                    <SelectContent>{classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>)} />

              <FormField control={form.control} name="subject_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject for this Lesson</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!selectedClass || subjects.length === 0}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger></FormControl>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>)} />

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Lesson Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="content" render={({ field }) => (
                <FormItem><FormLabel>Main Content (Text, HTML)</FormLabel><FormControl><Textarea rows={8} {...field} /></FormControl><FormMessage /></FormItem>
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
