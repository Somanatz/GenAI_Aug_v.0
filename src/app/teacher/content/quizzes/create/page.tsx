
// src/app/teacher/content/quizzes/create/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Loader2, ListChecks, PlusCircle, Trash2, HelpCircle } from 'lucide-react';
import type { LessonSummary, Subject as SubjectInterface, Class as ClassInterface, School } from '@/interfaces';

const choiceSchema = z.object({
  text: z.string().min(1, "Choice text is required"),
  is_correct: z.boolean().default(false),
});

const questionSchema = z.object({
  text: z.string().min(5, "Question text is required"),
  choices: z.array(choiceSchema).min(2, "At least two choices are required").max(5, "Maximum 5 choices"),
});

const quizSchema = z.object({
  title: z.string().min(3, "Quiz title is required"),
  description: z.string().optional(),
  lesson_id: z.string().min(1, "Lesson is required"),
  pass_mark_percentage: z.coerce.number().min(0).max(100).default(70),
  questions: z.array(questionSchema).min(1, "At least one question is required"),
  // For filtering lessons
  school_id: z.string().optional(),
  class_id: z.string().optional(),
  subject_id: z.string().optional(),
});

type QuizCreateFormValues = z.infer<typeof quizSchema>;

export default function CreateQuizPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassInterface[]>([]);
  const [subjects, setSubjects] = useState<SubjectInterface[]>([]);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);

  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const form = useForm<QuizCreateFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: '',
      description: '',
      pass_mark_percentage: 70,
      questions: [{ text: '', choices: [{ text: '', is_correct: false }, { text: '', is_correct: false }] }],
    },
  });

  const { fields: questionFields, append: appendQuestion, remove: removeQuestion } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  // Fetch schools, classes, subjects, lessons for dropdowns
  useEffect(() => { api.get<School[]>('/schools/').then(setSchools).catch(err => console.error("Failed to load schools", err)); }, []);
  useEffect(() => {
    if (selectedSchool) api.get<ClassInterface[]>(`/classes/?school=${selectedSchool}`).then(setClasses).catch(err => console.error("Failed to load classes", err));
    else setClasses([]);
    setSubjects([]); setLessons([]);
  }, [selectedSchool]);
  useEffect(() => {
    if (selectedClass) api.get<SubjectInterface[]>(`/subjects/?class_obj=${selectedClass}`).then(setSubjects).catch(err => console.error("Failed to load subjects", err));
    else setSubjects([]);
    setLessons([]);
  }, [selectedClass]);
  useEffect(() => {
    if (selectedSubject) api.get<LessonSummary[]>(`/lessons/?subject=${selectedSubject}`).then(setLessons).catch(err => console.error("Failed to load lessons", err));
    else setLessons([]);
  }, [selectedSubject]);


  const onSubmit = async (data: QuizCreateFormValues) => {
    setIsLoading(true);
    try {
      const payload = {
        title: data.title,
        description: data.description,
        lesson: data.lesson_id, // API expects 'lesson' ID
        pass_mark_percentage: data.pass_mark_percentage,
        questions: data.questions,
      };
      await api.post('/quizzes/', payload);
      toast({ title: "Quiz Created!", description: `${data.title} has been successfully created.` });
      router.push('/teacher/content');
    } catch (error: any) {
      toast({ title: "Quiz Creation Failed", description: error.message || "Could not create quiz.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center"><ListChecks className="mr-2 text-primary" /> Create New Quiz</CardTitle>
          <CardDescription>Design a new quiz with questions and choices for your lessons.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* School/Class/Subject/Lesson selectors for context */}
              <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="school_id" render={({ field }) => (
                    <FormItem><FormLabel>School (Filter)</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); setSelectedSchool(value); form.setValue('class_id',''); form.setValue('subject_id',''); form.setValue('lesson_id','');}} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger></FormControl>
                        <SelectContent>{schools.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>)} />
                 <FormField control={form.control} name="class_id" render={({ field }) => (
                    <FormItem><FormLabel>Class (Filter)</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); setSelectedClass(value); form.setValue('subject_id',''); form.setValue('lesson_id','');}} value={field.value} disabled={!selectedSchool || classes.length === 0}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger></FormControl>
                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>)} />
                <FormField control={form.control} name="subject_id" render={({ field }) => (
                    <FormItem><FormLabel>Subject (Filter)</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); setSelectedSubject(value); form.setValue('lesson_id','');}} value={field.value} disabled={!selectedClass || subjects.length === 0}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger></FormControl>
                        <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>)} />
                <FormField control={form.control} name="lesson_id" render={({ field }) => (
                    <FormItem><FormLabel>Attach to Lesson</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSubject || lessons.length === 0}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select lesson" /></SelectTrigger></FormControl>
                        <SelectContent>{lessons.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.title}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>)} />
              </div>

              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Quiz Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="pass_mark_percentage" render={({ field }) => (
                <FormItem><FormLabel>Pass Mark (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              {/* Questions Array */}
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Questions</Label>
                {questionFields.map((question, qIndex) => (
                  <Card key={question.id} className="p-4 space-y-3 bg-secondary/30">
                    <div className="flex justify-between items-center">
                      <FormLabel>Question #{qIndex + 1}</FormLabel>
                      {questionFields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(qIndex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                    <FormField control={form.control} name={`questions.${qIndex}.text`} render={({ field }) => (
                      <FormItem><FormControl><Textarea placeholder="Enter question text" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <QuestionChoices questionIndex={qIndex} control={form.control} />
                  </Card>
                ))}
                <Button type="button" variant="outline" onClick={() => appendQuestion({ text: '', choices: [{ text: '', is_correct: false }, { text: '', is_correct: false }] })}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                </Button>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Create Quiz
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for managing choices within a question
function QuestionChoices({ questionIndex, control }: { questionIndex: number; control: any }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.choices`,
  });

  return (
    <div className="space-y-2 pl-4 border-l-2 border-primary/50">
      <FormLabel className="text-sm">Choices</FormLabel>
      {fields.map((choice, cIndex) => (
        <div key={choice.id} className="flex items-center gap-2">
          <FormField control={control} name={`questions.${questionIndex}.choices.${cIndex}.text`} render={({ field }) => (
            <FormItem className="flex-grow"><FormControl><Input placeholder={`Choice ${cIndex + 1}`} {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={control} name={`questions.${questionIndex}.choices.${cIndex}.is_correct`} render={({ field }) => (
            <FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="text-xs">Correct</FormLabel><FormMessage /></FormItem>
          )} />
          {fields.length > 2 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(cIndex)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}
        </div>
      ))}
      {fields.length < 5 && 
        <Button type="button" size="sm" variant="outline" onClick={() => append({ text: '', is_correct: false })}>
           <PlusCircle className="mr-1 h-3 w-3" /> Add Choice
        </Button>
      }
    </div>
  );
}

