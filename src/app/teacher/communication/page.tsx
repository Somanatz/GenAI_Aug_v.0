
// src/app/teacher/communication/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Users, User, Bell, PlusCircle, Loader2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from '@/lib/api';
import type { Class as ClassInterface, Event as EventInterface } from '@/interfaces'; // Assuming interfaces exist
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';


const announcementSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().min(10, "Message content is required"),
  target_class_id: z.string().optional().nullable(), // Optional: for specific class or all
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;


export default function TeacherCommunicationPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<ClassInterface[]>([]);
  const [recentAnnouncements, setRecentAnnouncements] = useState<EventInterface[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [errorClasses, setErrorClasses] = useState<string | null>(null);
  const [errorAnnouncements, setErrorAnnouncements] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', description: '', target_class_id: ''},
  });

  const fetchClasses = async () => {
    if (!currentUser?.teacher_profile?.school) return;
    setIsLoadingClasses(true);
    setErrorClasses(null);
    try {
      const response = await api.get<ClassInterface[] | {results: ClassInterface[]}>(`/classes/?school=${currentUser.teacher_profile.school}&page_size=100`);
      setClasses(Array.isArray(response) ? response : response.results || []);
    } catch (err) {
      setErrorClasses(err instanceof Error ? err.message : "Failed to load classes.");
    } finally {
      setIsLoadingClasses(false);
    }
  };

  const fetchAnnouncements = async () => {
     if (!currentUser?.teacher_profile?.school) return;
    setIsLoadingAnnouncements(true);
    setErrorAnnouncements(null);
    try {
      // Assuming announcements are 'General' type events for the teacher's school or their specific classes
      const response = await api.get<EventInterface[] | {results: EventInterface[]}>(`/events/?school=${currentUser.teacher_profile.school}&type=General&ordering=-date&page_size=5`);
      setRecentAnnouncements(Array.isArray(response) ? response : response.results || []);
    } catch (err) {
      setErrorAnnouncements(err instanceof Error ? err.message : "Failed to load announcements.");
    } finally {
      setIsLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchAnnouncements();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const onAnnouncementSubmit = async (data: AnnouncementFormValues) => {
    if (!currentUser?.teacher_profile?.school) {
        toast({title: "Error", description: "School information missing for teacher.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);
    try {
        const payload = {
            title: data.title,
            description: data.description,
            type: 'General' as EventInterface['type'], // Assuming 'General' for announcements
            date: format(new Date(), 'yyyy-MM-dd'), // Post immediately
            school: currentUser.teacher_profile.school,
            target_class: data.target_class_id || null,
        };
        await api.post('/events/', payload);
        toast({title: "Announcement Sent!", description: `"${data.title}" has been posted.`});
        form.reset();
        fetchAnnouncements(); // Refresh list
    } catch(err: any) {
        toast({title: "Error Sending Announcement", description: err.message || "Could not send announcement.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center"><MessageSquare className="mr-3 text-primary" /> Communication Center</h1>
          <p className="text-muted-foreground">Send announcements, messages, and manage communication with students and parents.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center"><Send className="mr-2 text-accent" /> Send New Announcement</CardTitle>
            <CardDescription>Compose and send important updates to students or parents.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onAnnouncementSubmit)} className="space-y-6">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g., Upcoming Holiday Schedule" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    
                    <FormField control={form.control} name="target_class_id" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Recipients</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""} disabled={isLoadingClasses}>
                                <FormControl><SelectTrigger>
                                    <SelectValue placeholder={isLoadingClasses ? "Loading classes..." : "Entire School or Select Class"} />
                                </SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="">Entire School (All My Classes)</SelectItem>
                                    {errorClasses && <SelectItem value="" disabled>{errorClasses}</SelectItem>}
                                    {classes.map(c => ( <SelectItem key={String(c.id)} value={String(c.id)}>{c.name}</SelectItem> ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="Type your announcement here..." rows={6} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    
                    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Announcement
                    </Button>
                </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center"><Bell className="mr-2 text-primary" /> Recent Announcements</CardTitle>
            <CardDescription>Overview of recently sent communications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingAnnouncements ? (
              <div className="space-y-2"> <Skeleton className="h-16 w-full"/><Skeleton className="h-16 w-full"/></div>
            ) : errorAnnouncements ? (
              <p className="text-destructive text-sm"><AlertTriangle className="inline mr-1 h-4"/>{errorAnnouncements}</p>
            ) : recentAnnouncements.length > 0 ? (
              recentAnnouncements.map(ann => (
                <div key={ann.id} className="p-3 border rounded-md bg-secondary/50">
                  <h4 className="font-semibold text-sm">{ann.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    To: {ann.target_class_name || "Entire School"}
                  </p>
                  <p className="text-xs text-muted-foreground">Date: {new Date(ann.date).toLocaleDateString()}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent announcements.</p>
            )}
             {/* <Button variant="outline" className="w-full mt-4">View All Announcements (TBI)</Button> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
