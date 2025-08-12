// src/app/teacher/calendar/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, CheckCircle, ListTodo, School, Loader2, PlusCircle, Edit, Trash2, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Event as EventInterface, TeacherTask as TaskInterface } from '@/interfaces';
import { format, isSameDay, startOfMonth, endOfMonth, parseISO, isToday } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

const taskFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().optional(),
  due_date: z.date({ required_error: "A due date is required." }),
});
type TaskFormValues = z.infer<typeof taskFormSchema>;

export default function TeacherCalendarPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<EventInterface[]>([]);
  const [tasks, setTasks] = useState<TaskInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDateDialogOpen, setIsDateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskInterface | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { title: "", description: "" },
  });

  const fetchData = useCallback(async (month: Date) => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');

      const [eventsResponse, tasksResponse] = await Promise.all([
          api.get<{results: EventInterface[]}>(`/events/?date__gte=${monthStart}&date__lte=${monthEnd}`),
          api.get<{results: TaskInterface[]}>(`/teacher-tasks/`)
      ]);
      setEvents(eventsResponse.results || []);
      setTasks(tasksResponse.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar data.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData(currentMonth);
  }, [fetchData, currentMonth]);
  
  const onTaskSubmit = async (data: TaskFormValues) => {
    setIsSubmitting(true);
    const payload = { ...data, due_date: format(data.due_date, 'yyyy-MM-dd'), description: data.description || '' };
    try {
      if (editingTask) {
        const updatedTask = await api.patch<TaskInterface>(`/teacher-tasks/${editingTask.id}/`, payload);
        setTasks(prevTasks => prevTasks.map(t => t.id === editingTask.id ? updatedTask : t));
        toast({ title: "Task Updated" });
      } else {
        const newTask = await api.post<TaskInterface>(`/teacher-tasks/`, payload);
        setTasks(prevTasks => [...prevTasks, newTask]);
        toast({ title: "Task Added" });
      }
      setIsFormOpen(false);
      setIsDateDialogOpen(false);
      setEditingTask(null);
      taskForm.reset({ title: "", description: "" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await api.delete(`/teacher-tasks/${taskId}/`);
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
      toast({ title: "Task Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: "Could not delete task.", variant: "destructive" });
    }
  };

  const handleToggleTaskCompletion = async (task: TaskInterface) => {
    try {
      const updatedTask = await api.patch<TaskInterface>(`/teacher-tasks/${task.id}/`, { completed: !task.completed });
      setTasks(prevTasks => prevTasks.map(t => t.id === task.id ? updatedTask : t));
    } catch (err: any) {
      toast({ title: "Error", description: "Could not update task status.", variant: "destructive" });
    }
  };

  const handleEditClick = useCallback((task: TaskInterface) => {
    setEditingTask(task);
    taskForm.reset({
      title: task.title,
      description: task.description || '',
      due_date: new Date(task.due_date),
    });
    setIsDateDialogOpen(false);
    setIsFormOpen(true);
  }, [taskForm]);
  
  const handleAddNewClick = (date?: Date) => {
    setEditingTask(null);
    taskForm.reset({ title: "", description: "", due_date: date || new Date() });
    setIsDateDialogOpen(false);
    setIsFormOpen(true);
  };
  
  const handleDateClick = (date: Date) => {
      setSelectedDate(date);
      const itemsOnDate = itemsForDate(date);
      if (itemsOnDate.length > 0) {
        setIsDateDialogOpen(true);
      } else {
        handleAddNewClick(date);
      }
  };

  const itemsForDate = useCallback((date: Date) => {
    const dayEvents = events.filter(e => isSameDay(parseISO(e.date), date)).map(e => ({...e, type: 'event'}));
    const dayTasks = tasks.filter(t => isSameDay(parseISO(t.due_date), date)).map(t => ({...t, type: 'task'}));
    return [...dayEvents, ...dayTasks].sort((a, b) => {
        const timeA = a.type === 'event' && 'date' in a && a.date
            ? parseISO(a.date).getTime()
            : 'due_date' in a && a.due_date
                ? parseISO(a.due_date).getTime()
                : 0;
        const timeB = b.type === 'event' && 'date' in b && b.date
            ? parseISO(b.date).getTime()
            : 'due_date' in b && b.due_date
                ? parseISO(b.due_date).getTime()
                : 0;
        return timeA - timeB;
    });
  }, [events, tasks]);

  const pendingTasks = useMemo(() => tasks.filter(t => !t.completed), [tasks]);
  
  const itemsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return itemsForDate(selectedDate);
  }, [itemsForDate, selectedDate]);
  
  const todayItems = useMemo(() => {
    return itemsForDate(new Date());
  }, [itemsForDate]);

  useEffect(() => {
      if (isDateDialogOpen && itemsForSelectedDate.length === 0) {
          setIsDateDialogOpen(false);
      }
  }, [itemsForSelectedDate, isDateDialogOpen]);

  const DayContent = useCallback(({ date }: { date: Date }) => {
    const items = itemsForDate(date);
    const dayIsToday = isToday(date);
    
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <span className={cn("self-end p-1 text-sm font-medium", dayIsToday && "bg-blue-600 text-white rounded-full h-7 w-7 flex items-center justify-center m-1")}>
                {format(date, 'd')}
            </span>
            <div className="flex-grow space-y-0.5 p-0.5">
                {items.slice(0, 2).map(item => (
                    <div key={`${item.type}-${item.id}`} className={cn("rounded-sm text-xs px-1.5 py-0.5 truncate cursor-pointer", item.type === 'event' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white')}
                        onClick={(e) => { e.stopPropagation(); setSelectedDate(date); setIsDateDialogOpen(true); }}>
                        {item.title}
                    </div>
                ))}
                {items.length > 2 && <div className="text-xs text-center text-muted-foreground">+ {items.length - 2} more</div>}
            </div>
        </div>
    );
  }, [itemsForDate, setIsDateDialogOpen]);

  return (
    <div className="space-y-8 p-4 md:p-6 flex flex-col h-[calc(100vh-8rem)]">
      <header>
        <h1 className="text-3xl font-bold flex items-center"><CalendarDays className="mr-3 h-8 w-8 text-primary" /> My Calendar</h1>
        <p className="text-muted-foreground mt-1">A unified view of school events and your personal tasks.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start flex-grow">
        <div className="lg:col-span-2 h-full flex flex-col">
          <Card className="shadow-lg rounded-xl border overflow-hidden flex-grow flex flex-col">
            <CardContent className="p-0 flex-grow flex flex-col">
              {isLoading ? <Skeleton className="h-full w-full" /> : 
               error ? <p className="text-destructive p-4">{error}</p> : (
                <Calendar mode="single" selected={selectedDate} month={currentMonth} onMonthChange={setCurrentMonth} onDayClick={handleDateClick} className="p-0 flex-grow flex flex-col"
                  classNames={{ months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-3", month: "space-y-4 flex-grow flex flex-col", caption: "flex justify-center pt-1 relative items-center", caption_label: "text-lg font-medium", nav: "space-x-1 flex items-center", nav_button: "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100", table: "w-full border-collapse flex flex-col flex-grow", head_row: "flex divide-x dark:divide-neutral-800 border-b dark:border-neutral-800", head_cell: "text-muted-foreground flex-1 font-normal text-[0.8rem] text-center p-2", row: "flex w-full divide-x dark:divide-neutral-800 flex-1", cell: "text-left text-sm p-0 relative flex-1 focus-within:relative focus-within:z-20 border-b dark:border-neutral-800", day: "h-full w-full p-0 font-normal", day_selected: "bg-yellow-100 text-accent-foreground dark:bg-yellow-800/50", day_today: "", day_outside: "text-muted-foreground opacity-50 bg-gray-50 dark:bg-background/40", day_disabled: "text-muted-foreground opacity-50" }}
                  components={{ DayContent }} />
               )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-1 space-y-6">
          <Card>
              <CardHeader><CardTitle className="flex items-center text-lg"><ListTodo className="mr-2 h-5 w-5"/>Active Tasks</CardTitle></CardHeader>
              <CardContent>
                  {isLoading ? <Skeleton className="h-24 w-full" /> : 
                    pendingTasks.length > 0 ? (
                      <ul className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {pendingTasks.map(task => (
                            <li key={`pending-${task.id}`} className="flex items-start gap-3 text-sm">
                              <Checkbox id={`task-${task.id}`} checked={task.completed} onCheckedChange={() => handleToggleTaskCompletion(task)} className="mt-1"/>
                              <div><label htmlFor={`task-${task.id}`} className="font-medium cursor-pointer">{task.title}</label><p className="text-xs text-muted-foreground">{format(parseISO(task.due_date), 'E, MMM d')}</p></div>
                            </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-muted-foreground text-center py-4">No pending tasks.</p>}
              </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center"><CheckCircle className="mr-2 h-5 w-5"/>Completed Tasks</CardTitle></CardHeader>
            <CardContent>
              {tasks.filter(t => t.completed).length > 0 ? (
                   <ul className="space-y-3 max-h-48 overflow-y-auto pr-2">
                      {tasks.filter(t => t.completed).map(task => (<li key={`done-${task.id}`} className="flex items-center gap-3 text-sm text-muted-foreground"><CheckCircle className="h-4 w-4 text-green-500"/><span className="line-through">{task.title}</span></li>))}
                   </ul>
              ) : <p className="text-sm text-muted-foreground text-center py-4">No tasks completed yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Dialog open={isDateDialogOpen} onOpenChange={setIsDateDialogOpen}>
        <DialogContent><DialogHeader><DialogTitle>Items for {selectedDate ? format(selectedDate, 'PPP') : 'Date'}</DialogTitle><DialogDescription>Manage your tasks and view events for this day.</DialogDescription></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4 pr-2">
            {itemsForSelectedDate.length > 0 ? itemsForSelectedDate.map(item => (
              <div key={`${item.type}-${item.id}`} className={cn("p-3 border-l-4 rounded-r-md flex justify-between items-center", item.type === 'event' ? 'bg-blue-50 border-blue-400 dark:bg-blue-900/50 dark:border-blue-600' : 'bg-green-50 border-green-400 dark:bg-green-900/50 dark:border-green-600')}>
                <div><h4 className="font-semibold">{item.title}</h4><p className="text-xs text-muted-foreground">{item.type === 'event' ? 'School Event' : 'Personal Task'}</p></div>
                {item.type === 'task' && (
                  <div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(item as TaskInterface)}><Edit className="h-4 w-4"/></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteTask(item.id)}><Trash2 className="h-4 w-4"/></Button></div>
                )}
              </div>
            )) : <p className="text-muted-foreground text-center">No items for this date.</p>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDateDialogOpen(false)}>Close</Button><Button onClick={() => handleAddNewClick(selectedDate)}><PlusCircle className="mr-2 h-4 w-4"/> Add New Task</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent><DialogHeader><DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle></DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4">
              <FormField control={taskForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={taskForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={taskForm.control} name="due_date" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel>
                  <Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent></Popover><FormMessage/>
                </FormItem>
              )} />
              <DialogFooter><Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="animate-spin"/> : 'Save Task'}</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
