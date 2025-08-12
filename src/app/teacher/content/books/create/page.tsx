// src/app/teacher/content/books/create/page.tsx
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
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
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, FileText, PlusCircle } from 'lucide-react';
import type { Subject as SubjectInterface, Class as ClassInterface, School } from '@/interfaces';
import { useAuth } from '@/context/AuthContext';


const bookSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  author: z.string().optional(),
  file: z.any().refine(files => files?.length === 1, 'File is required.'),
  subject_id: z.string().optional(),
  master_class_id: z.string().optional(),
});

type BookCreateFormValues = z.infer<typeof bookSchema>;

export default function CreateBookPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [classes, setClasses] = useState<ClassInterface[]>([]);
  const [subjects, setSubjects] = useState<SubjectInterface[]>([]);
  
  const form = useForm<BookCreateFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: { title: '', author: '' },
  });

  useEffect(() => {
    if (!currentUser?.teacher_profile?.school) return;
    const schoolId = currentUser.teacher_profile.school;
    
    api.get<{results: ClassInterface[]}>(`/classes/?school=${schoolId}`).then(res => {
      setClasses(res.results || []);
    }).catch(err => toast({ title: "Error", description: "Failed to load classes", variant: "destructive"}));

    api.get<{results: SubjectInterface[]}>(`/subjects/?master_class__schoolclass__school=${schoolId}`).then(res => {
      setSubjects(res.results || []);
    }).catch(err => toast({ title: "Error", description: "Failed to load subjects", variant: "destructive"}));
  }, [currentUser, toast]);


  const onSubmit = async (data: BookCreateFormValues) => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('title', data.title);
    if(data.author) formData.append('author', data.author);
    if(data.subject_id) formData.append('subject_id', data.subject_id);
    if(data.master_class_id) formData.append('master_class_id', data.master_class_id);
    if(data.file?.[0]) formData.append('file', data.file[0]);

    try {
      await api.post('/books/', formData, true);
      toast({ title: "Resource Uploaded!", description: `${data.title} has been added to the library.` });
      router.push('/teacher/content');
    } catch (error: any) {
      toast({ title: "Upload Failed", description: error.message || "Could not upload resource.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center"><UploadCloud className="mr-2 text-primary" /> Upload New Resource</CardTitle>
          <CardDescription>Add a new book, PDF, or other file to the school library.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Resource Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="author" render={({ field }) => (
                    <FormItem><FormLabel>Author (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="file" render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                        <FormLabel>File</FormLabel>
                        <FormControl><Input type="file" {...rest} onChange={e => onChange(e.target.files)} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="master_class_id" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Target Class (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger></FormControl>
                            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <FormDescription className="text-xs">Assign to a specific class.</FormDescription>
                        <FormMessage />
                    </FormItem>)} />
                     <FormField control={form.control} name="subject_id" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Target Subject (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="All subjects" /></SelectTrigger></FormControl>
                            <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                         <FormDescription className="text-xs">Assign to a specific subject.</FormDescription>
                        <FormMessage />
                    </FormItem>)} />
                </div>
              

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Upload and Save
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
