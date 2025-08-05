
// src/app/school-admin/[schoolId]/communication/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, Send, PlusCircle, Loader2, AlertTriangle, Users, UserCircleIcon, CalendarIcon as CalendarIconLucide } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from "react";
import { api } from '@/lib/api';
import type { Event as EventInterface, Class, School } from '@/interfaces';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const announcementSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().min(10, "Message content is required"),
  // Announcements are like 'General' events, but we might want a specific type
  type: z.literal('General').default('General'), 
  date: z.date({ required_error: "Date is required (today for immediate announcements)" }),
  target_class_id: z.string().optional().nullable(), 
});
type AnnouncementFormValues = z.infer<typeof announcementSchema>;


export default function SchoolAdminCommunicationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const schoolId = params.schoolId as string;

  const [recentAnnouncements, setRecentAnnouncements] = useState<EventInterface[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnnounceDialogOpen, setIsAnnounceDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const announcementForm = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: '', description: '', type: 'General', date: new Date() },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) return;
      setIsLoading(true);
      setError(null);
      try {
        const [announcementsData, classesData] = await Promise.all([
          api.get<EventInterface[] | {results: EventInterface[]}>(`/events/?school=${schoolId}&type=General&ordering=-date&page_size=5`), // Assuming 'General' can be announcements
          api.get<Class[] | {results: Class[]}>(`/classes/?school=${schoolId}&page_size=100`)
        ]);
        const actualAnnouncements = Array.isArray(announcementsData) ? announcementsData : announcementsData.results || [];
        const actualClasses = Array.isArray(classesData) ? classesData : classesData.results || [];
        setRecentAnnouncements(actualAnnouncements);
        setClasses(actualClasses);
      } catch (err) {
        console.error("Failed to fetch communication data:", err);
        setError(err instanceof Error ? err.message : "Could not load data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [schoolId]);

  const onAnnouncementSubmit = async (data: AnnouncementFormValues) => {
    if (!schoolId) return;
    setIsSubmitting(true);
    try {
      const payload: any = { 
        title: data.title,
        description: data.description,
        type: 'General', // For now, use General for announcements
        date: format(data.date, "yyyy-MM-dd"), // Use current date for announcement
        school: schoolId,
        target_class: data.target_class_id || null,
      };
      delete payload.target_class_id;

      const newAnnouncement = await api.post<EventInterface>('/events/', payload);
      setRecentAnnouncements(prev => [newAnnouncement, ...prev].slice(0,5).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      toast({ title: "Announcement Sent!", description: `"${newAnnouncement.title}" has been posted.` });
      announcementForm.reset({ title: '', description: '', type: 'General', date: new Date() });
      setIsAnnounceDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error Sending Announcement", description: err.message || "Could not send.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center">
            <MessageSquare className="mr-3 text-primary" /> School Communication
        </h1>
        <Dialog open={isAnnounceDialogOpen} onOpenChange={setIsAnnounceDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => { announcementForm.reset({date: new Date(), type: 'General'}); setIsAnnounceDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4"/> New Announcement
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New Announcement</DialogTitle>
                    <DialogDescription>Broadcast a message to selected classes or the entire school.</DialogDescription>
                </DialogHeader>
                <Form {...announcementForm}>
                    <form onSubmit={announcementForm.handleSubmit(onAnnouncementSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
                        <FormField control={announcementForm.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Announcement Title" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={announcementForm.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea placeholder="Type your announcement message here..." rows={5} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={announcementForm.control} name="date" render={({ field }) => ( // Usually today for announcements
                            <FormItem className="flex flex-col"><FormLabel>Publish Date</FormLabel>
                                <Popover><PopoverTrigger asChild>
                                    <FormControl><Button variant="outline" className="pl-3 text-left font-normal w-full">{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                                </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage/>
                            </FormItem>
                        )} />
                        <FormField control={announcementForm.control} name="target_class_id" render={({ field }) => (
                            <FormItem><FormLabel>Target Audience</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""} disabled={classes.length === 0}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Entire School or Select Class" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="">Entire School</SelectItem>
                                    {classes.map(c => <SelectItem key={c.id} value={String(c.id)}><Users className="mr-2 h-4 w-4 inline-block" /> {c.name}</SelectItem>)}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAnnounceDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Send Announcement
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle>Recent School Announcements</CardTitle>
          <CardDescription>Announcements are posted as 'General' events for the school or specific classes.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? <p><Loader2 className="inline mr-2 animate-spin"/> Loading announcements...</p> 
            : error ? <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
            : recentAnnouncements.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {recentAnnouncements.map(event => (
                        <Card key={event.id} className="bg-secondary/30">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg">{event.title}</CardTitle>
                                <CardDescription>
                                    Posted on: {format(new Date(event.date), "PPP")} 
                                    {event.target_class_name && ` | For: ${event.target_class_name}`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground whitespace-pre-line">{event.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent announcements found.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
