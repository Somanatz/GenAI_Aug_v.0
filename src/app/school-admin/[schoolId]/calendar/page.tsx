
// src/app/school-admin/[schoolId]/calendar/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, PlusCircle, Loader2, AlertTriangle, CalendarIcon as CalendarIconLucide } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from '@/components/ui/button';
import { useState, useEffect } from "react";
import { api } from '@/lib/api';
import type { Event as EventInterface, School } from '@/interfaces';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';

const eventSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  date: z.date({ required_error: "Date is required" }),
  end_date: z.date().optional().nullable(),
  type: z.enum(['Holiday', 'Exam', 'Meeting', 'Activity', 'Deadline', 'General'], { required_error: "Event type is required"}),
  target_class_id: z.string().optional().nullable(), // Class ID if event is class-specific
});
type EventFormValues = z.infer<typeof eventSchema>;

export default function SchoolAdminCalendarPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const schoolId = params.schoolId as string;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<EventInterface[]>([]);
  const [classes, setClasses] = useState<School['classes']>([]); // Assuming School interface has classes
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const eventForm = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: { type: 'General', title: '', description: '', date: new Date() },
  });

  const fetchEventsAndClasses = async () => {
    if (!schoolId) return;
    setIsLoadingEvents(true);
    setError(null);
    try {
      const [eventsData, classesData] = await Promise.all([
        api.get<EventInterface[] | {results: EventInterface[]}>(`/events/?school=${schoolId}&ordering=date`),
        api.get<Class[] | {results: Class[]}>(`/classes/?school=${schoolId}&page_size=100`) // Fetch all classes for dropdown
      ]);
      const actualEvents = Array.isArray(eventsData) ? eventsData : eventsData.results || [];
      const actualClasses = Array.isArray(classesData) ? classesData : classesData.results || [];
      setEvents(actualEvents);
      setClasses(actualClasses);
    } catch (err) {
      console.error("Failed to fetch calendar data:", err);
      setError(err instanceof Error ? err.message : "Could not load calendar data.");
    } finally {
      setIsLoadingEvents(false);
    }
  };
  
  useEffect(() => {
    fetchEventsAndClasses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);


  const onEventSubmit = async (data: EventFormValues) => {
    if (!schoolId) return;
    setIsSubmittingEvent(true);
    try {
      const payload: any = { 
        ...data, 
        school: schoolId, // Auto-assign current school
        date: format(data.date, "yyyy-MM-dd"),
        target_class: data.target_class_id || null, // Use null if not selected
      };
      if (data.end_date) {
        payload.end_date = format(data.end_date, "yyyy-MM-dd");
      }
      delete payload.target_class_id;


      const newEvent = await api.post<EventInterface>('/events/', payload);
      setEvents(prev => [...prev, newEvent].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      toast({ title: "Event Created", description: `${newEvent.title} has been added to the calendar.` });
      eventForm.reset({ type: 'General', title: '', description: '', date: new Date() });
      setIsEventDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error Creating Event", description: err.message || "Could not create event.", variant: "destructive" });
    } finally {
      setIsSubmittingEvent(false);
    }
  };
  
  const eventsForSelectedDate = selectedDate 
    ? events.filter(event => format(new Date(event.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd'))
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold flex items-center">
            <CalendarDays className="mr-3 text-primary" /> Manage School Calendar
        </h1>
        <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => { eventForm.reset({ date: selectedDate || new Date(), type: 'General' }); setIsEventDialogOpen(true); }}>
                    <PlusCircle className="mr-2 h-4 w-4"/> Add New Event
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New School Event</DialogTitle>
                    <DialogDescription>Add an event to the school calendar. It will be visible to relevant users.</DialogDescription>
                </DialogHeader>
                <Form {...eventForm}>
                    <form onSubmit={eventForm.handleSubmit(onEventSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
                        <FormField control={eventForm.control} name="title" render={({ field }) => (
                            <FormItem><FormLabel>Event Title</FormLabel><FormControl><Input placeholder="e.g., Annual Sports Day" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={eventForm.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea placeholder="Details about the event" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={eventForm.control} name="date" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Start Date</FormLabel>
                                    <Popover><PopoverTrigger asChild>
                                        <FormControl><Button variant="outline" className="pl-3 text-left font-normal w-full">{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                                    </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage/>
                                </FormItem>
                            )} />
                             <FormField control={eventForm.control} name="end_date" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>End Date (Optional)</FormLabel>
                                    <Popover><PopoverTrigger asChild>
                                        <FormControl><Button variant="outline" className="pl-3 text-left font-normal w-full">{field.value ? format(field.value, "PPP") : <span>Pick an end date</span>}<CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl>
                                    </PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage/>
                                </FormItem>
                            )} />
                        </div>
                        <FormField control={eventForm.control} name="type" render={({ field }) => (
                            <FormItem><FormLabel>Event Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select event type" /></SelectTrigger></FormControl>
                                <SelectContent>{['Holiday', 'Exam', 'Meeting', 'Activity', 'Deadline', 'General'].map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                            </Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={eventForm.control} name="target_class_id" render={({ field }) => (
                            <FormItem><FormLabel>Target Class (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""} disabled={classes.length === 0}>
                                <FormControl><SelectTrigger><SelectValue placeholder="All school or select class" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="">All School</SelectItem>
                                    {classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                </SelectContent>
                                </Select>
                                <FormDescription className="text-xs">Leave blank for school-wide event.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEventDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmittingEvent}>
                                {isSubmittingEvent && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create Event
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>
      <Card className="shadow-xl rounded-xl">
        <CardHeader className="p-6">
          <CardTitle>School Event Calendar</CardTitle>
          <CardDescription>Add, edit, and manage school-wide events, holidays, and exam schedules for School ID: {schoolId}.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row items-start gap-6 p-4 md:p-6">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border shadow-sm bg-card self-center lg:self-start"
          />
          <div className="mt-6 lg:mt-0 w-full flex-1">
            <h3 className="text-xl font-semibold mb-3">Events for {selectedDate ? format(selectedDate, "PPP") : 'selected date'}:</h3>
            {isLoadingEvents ? (
                 <div className="space-y-2"> {[...Array(3)].map((_,i) => <Skeleton key={i} className="h-12 w-full rounded-md"/>)} </div>
            ) : error ? (
                <Alert variant="destructive"><AlertTriangle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
            ) : eventsForSelectedDate.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {eventsForSelectedDate.map(event => (
                        <div key={event.id} className="p-3 border rounded-lg bg-secondary/50 hover:shadow-md transition-shadow">
                            <h4 className="font-semibold">{event.title} <span className="text-xs font-normal text-muted-foreground">({event.type})</span></h4>
                            {event.target_class_name && <p className="text-xs text-blue-600 dark:text-blue-400">For: {event.target_class_name}</p>}
                            {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
                            {/* TODO: Add edit/delete buttons for events */}
                        </div>
                    ))}
                </div>
            ) : (
              <p className="text-sm text-muted-foreground">No events scheduled for this date.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
