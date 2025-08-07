
// src/app/student/library/page.tsx
'use client';

import { useEffect, useState, ChangeEvent, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Library, PlusCircle, Book, Video, StickyNote, Loader2, AlertTriangle, FileUp, Link as LinkIcon, Edit, Trash2, PieChart as PieChartIcon, Eye, Search, Filter, Timer, PlayCircle, StopCircle, Clock, CalendarDays, BarChartHorizontal } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import type { Book as OfficialBook, StudentResource as PersonalResource, UserDailyActivity } from '@/interfaces';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format, startOfWeek, eachDayOfInterval, startOfMonth, getDaysInMonth, addDays } from 'date-fns';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { TooltipProvider, Tooltip as UiTooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


const resourceFormSchema = z.object({
  title: z.string().min(3, "Title is required."),
  description: z.string().optional(),
  resource_type: z.enum(['BOOK', 'NOTE', 'VIDEO']),
  file: z.any().optional(),
  url: z.string().url("Please enter a valid URL for video links.").optional().or(z.literal('')),
  content: z.string().optional(), // For direct note input
}).refine(data => {
  if (data.resource_type === 'VIDEO') return !!data.url;
  if (data.resource_type === 'NOTE') return !!data.content;
  return true;
}, {
    message: "A valid URL is required for Video, and content is required for a Note.",
    path: ["url"], // Can point to one, error shows on form level
});


type ResourceFormValues = z.infer<typeof resourceFormSchema>;
type FilterType = 'ALL' | 'BOOK' | 'NOTE' | 'VIDEO';

const ResourceIcon = ({ type }: { type: PersonalResource['resource_type'] }) => {
  switch (type) {
    case 'BOOK': return <Book className="h-5 w-5 text-blue-500" />;
    case 'NOTE': return <StickyNote className="h-5 w-5 text-amber-500" />;
    case 'VIDEO': return <Video className="h-5 w-5 text-red-500" />;
    default: return <Book className="h-5 w-5 text-gray-500" />;
  }
};

const COLORS = {
  BOOK: 'hsl(var(--chart-1))',
  NOTE: 'hsl(var(--chart-2))',
  VIDEO: 'hsl(var(--chart-3))',
};

// Helper function to format seconds into HH:MM:SS
const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
const formatTotalTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
};


export default function StudentLibraryPage() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [officialBooks, setOfficialBooks] = useState<OfficialBook[]>([]);
  const [personalResources, setPersonalResources] = useState<PersonalResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingResource, setEditingResource] = useState<PersonalResource | null>(null);

  // New state for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('official');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  
  // State for the study timer and data
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [studyData, setStudyData] = useState<Record<string, number>>({});
  
  const totalStudyTime = useMemo(() => Object.values(studyData).reduce((sum, duration) => sum + duration, 0), [studyData]);

  // Fetches only general library study data
  const fetchAnalytics = useCallback(async () => {
    if (!currentUser) return;
    try {
        // Fetch daily activities which now includes library-specific time
        const dailyActivities = await api.get<{results: UserDailyActivity[]}>(`/daily-activities/?user=${currentUser.id}`);
        const activities = dailyActivities.results || [];
        
        const formattedData: Record<string, number> = {};
        activities.forEach(item => {
            formattedData[item.date] = (item.library_study_duration_minutes || 0) * 60; // Convert minutes to seconds
        });
        setStudyData(formattedData);
    } catch(err) {
        console.error("Could not fetch library study analytics", err);
    }
  }, [currentUser]);


  const fetchResources = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const [booksResponse, personalResponse] = await Promise.all([
        api.get<OfficialBook[] | {results: OfficialBook[]}>('/books/'),
        api.get<PersonalResource[] | {results: PersonalResource[]}>('/student-resources/'),
      ]);
      const official = Array.isArray(booksResponse) ? booksResponse : booksResponse.results || [];
      const personal = Array.isArray(personalResponse) ? personalResponse : personalResponse.results || [];
      setOfficialBooks(official);
      setPersonalResources(personal);
      // Fetch analytics after resources are loaded.
      await fetchAnalytics();
    } catch (err) {
      console.error("Failed to fetch library resources:", err);
      setError(err instanceof Error ? err.message : "Could not load library data.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, fetchAnalytics]);


  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);
  
  // Ping effect when timer is running
  useEffect(() => {
    let pingInterval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      pingInterval = setInterval(() => {
        // Send a 1-minute duration ping to the backend. The subject_id is null for general library study.
        api.post('/record-study-ping/', { subject_id: null, duration: 1 })
          .catch(err => console.error("Failed to ping study time:", err));
      }, 60000); // every minute
    }
    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [isTimerRunning]);

  const handleStartTimer = () => {
    setElapsedTime(0);
    setIsTimerRunning(true);
    api.post('/recent-activities/', { activity_type: 'Library', details: 'Started library study session.' })
      .catch(err => console.error("Failed to log start timer activity:", err));
  };
  
  const handleStopTimer = () => {
    setIsTimerRunning(false);
    if(elapsedTime > 0) {
      const durationString = formatTime(elapsedTime);
      toast({
          title: "Session Ended",
          description: `You studied for ${durationString}. Your progress has been saved.`,
      });
      api.post('/recent-activities/', { activity_type: 'Library', details: `Stopped library study session. Duration: ${durationString}` })
        .catch(err => console.error("Failed to log stop timer activity:", err));
      // Refetch analytics to update visuals with latest data
      fetchAnalytics();
    }
    setElapsedTime(0);
  };
  
  
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      form.clearErrors("file");
    }
  };
  
  const handleEditClick = (resource: PersonalResource) => {
    setEditingResource(resource);
    form.reset({
      title: resource.title,
      description: resource.description || '',
      resource_type: resource.resource_type,
      url: resource.url || '',
      content: resource.content || '',
    });
    setIsFormOpen(true);
  };
  
  const handleAddNewClick = () => {
    setEditingResource(null);
    form.reset({ resource_type: "BOOK", title: "", description: "", url: "" });
    setIsFormOpen(true);
  };
  
  const { watch } = useForm<ResourceFormValues>();
  const resourceType = watch("resource_type");

  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceFormSchema),
    defaultValues: { resource_type: "BOOK", title: "", description: "", url: "" },
  });


  const onSubmit = async (data: ResourceFormValues) => {
    if (data.resource_type === 'BOOK' && !selectedFile && !editingResource?.file) {
      form.setError("file", { type: "manual", message: "A file is required for this resource type." });
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('resource_type', data.resource_type);
    if(data.description) formData.append('description', data.description);
    if(data.url) formData.append('url', data.url);
    if(data.content) formData.append('content', data.content);
    if(selectedFile) formData.append('file', selectedFile);

    try {
      const endpoint = editingResource ? `/student-resources/${editingResource.id}/` : '/student-resources/';
      const method = editingResource ? 'patch' : 'post';
      await api[method](endpoint, formData, true);

      toast({ title: `Resource ${editingResource ? 'Updated' : 'Added'}!`, description: `Your resource is now in your personal library.` });
      setIsFormOpen(false);
      form.reset();
      setSelectedFile(null);
      setEditingResource(null);
      fetchResources();
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message || "Could not save resource.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (resourceId: number) => {
    try {
        await api.delete(`/student-resources/${resourceId}/`);
        toast({title: "Resource Deleted", description: "The resource has been removed from your personal library."});
        fetchResources();
    } catch (err: any) {
        toast({title: "Delete Failed", description: err.message, variant: "destructive"});
    }
  };
  
  const resourceStats = useMemo(() => {
    const stats = { BOOK: 0, NOTE: 0, VIDEO: 0 };
    personalResources.forEach(r => {
      if (stats[r.resource_type] !== undefined) {
        stats[r.resource_type]++;
      }
    });
    return [
      { name: 'Books/PDFs', value: stats.BOOK, fill: COLORS.BOOK },
      { name: 'Notes', value: stats.NOTE, fill: COLORS.NOTE },
      { name: 'Videos', value: stats.VIDEO, fill: COLORS.VIDEO },
    ].filter(item => item.value > 0);
  }, [personalResources]);

  const filteredPersonalResources = useMemo(() => {
    return personalResources
      .filter(r => filterType === 'ALL' || r.resource_type === filterType)
      .filter(r => r.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [personalResources, filterType, searchTerm]);

  const filteredOfficialBooks = useMemo(() => {
    return officialBooks.filter(b => b.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [officialBooks, searchTerm]);


  const renderPersonalResources = () => {
    if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}</div>;
    if (filteredPersonalResources.length === 0) return <p className="text-muted-foreground text-center py-10">No personal resources found{searchTerm || filterType !== 'ALL' ? ' matching your criteria' : ''}.</p>;
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPersonalResources.map(item => {
            const isNote = item.resource_type === 'NOTE';
            const resourceUrl = item.resource_type === 'VIDEO' ? item.url : item.file_url;
            return (
                <Card key={item.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                    <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-semibold pr-2">{item.title}</CardTitle>
                    <ResourceIcon type={item.resource_type} />
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-xs text-muted-foreground line-clamp-3">{item.description || 'No description.'}</p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(item)}><Edit className="h-4 w-4"/></Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4"/></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete "{item.title}" from your personal library. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button asChild size="sm" disabled={isNote || !resourceUrl}>
                        <a href={resourceUrl} target="_blank" rel="noopener noreferrer">{item.resource_type === 'VIDEO' ? 'Watch Video' : 'Open'}</a>
                    </Button>
                </CardFooter>
                </Card>
            )
        })}
      </div>
    );
  };

  const renderOfficialResources = () => {
    if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)}</div>;
    if (error) return <p className="text-destructive text-sm text-center py-4">{error}</p>;
    if (filteredOfficialBooks.length === 0) return <p className="text-muted-foreground text-center py-10">No official resources found{searchTerm ? ' matching your search' : ''}.</p>;
    
    return (
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredOfficialBooks.map(item => (
            <Card key={item.id} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start"><CardTitle className="text-base font-semibold pr-2">{item.title}</CardTitle><Book className="h-5 w-5 text-blue-500"/></div>
                {item.author && <CardDescription>by {item.author}</CardDescription>}
              </CardHeader>
              <CardContent className="flex-grow"><p className="text-xs text-muted-foreground line-clamp-3">Subject: {item.subject_name || 'General'}</p></CardContent>
              <CardFooter className="flex justify-end">
                <Button asChild size="sm">
                    <a href={item.file_url} target="_blank" rel="noopener noreferrer">Open</a>
                </Button>
              </CardFooter>
            </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center"><Library className="mr-3 text-primary" /> Resource Library</h1>
          <p className="text-muted-foreground">Access official school materials and manage your personal collection.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild><Button size="lg" onClick={handleAddNewClick}><PlusCircle className="mr-2 h-5 w-5" /> Add to My Library</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingResource ? 'Edit Resource' : 'Add a New Personal Resource'}</DialogTitle>
              <DialogDescription>Add a book, personal note, or a video link to your library.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="resource_type" render={({field}) => (
                  <FormItem>
                    <FormLabel>Resource Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="BOOK">Book / PDF</SelectItem>
                        <SelectItem value="NOTE">Personal Note</SelectItem>
                        <SelectItem value="VIDEO">Video Link</SelectItem>
                      </SelectContent>
                    </Select><FormMessage/>
                  </FormItem>
                )}/>
                <FormField control={form.control} name="title" render={({field}) => (
                  <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({field}) => (
                  <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field}/></FormControl><FormMessage/></FormItem>
                )}/>
                {resourceType === 'VIDEO' ? (
                  <FormField control={form.control} name="url" render={({field}) => (
                    <FormItem><FormLabel><LinkIcon className="inline mr-1 h-4"/>URL</FormLabel><FormControl><Input placeholder="https://youtube.com/..." {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                ) : resourceType === 'NOTE' ? (
                  <FormField control={form.control} name="content" render={({field}) => (
                    <FormItem><FormLabel>Note Content</FormLabel><FormControl><Textarea placeholder="Type your notes here..." rows={6} {...field}/></FormControl><FormMessage/></FormItem>
                  )}/>
                ) : ( // BOOK
                  <FormField control={form.control} name="file" render={({field}) => (
                     <FormItem>
                        <FormLabel><FileUp className="inline mr-1 h-4"/>File</FormLabel>
                        <FormControl><Input type="file" onChange={handleFileChange}/></FormControl>
                        <FormMessage/>
                     </FormItem>
                  )}/>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} {editingResource ? 'Save Changes' : 'Add Resource'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

       <Card>
        <CardHeader>
            <CardTitle className="flex items-center"><Timer className="mr-2 text-primary" /> My Library Stats & Study Timer</CardTitle>
            <CardDescription>Manually track your general study time and visualize your efforts.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Timer and Stats Column */}
            <div className="flex flex-col gap-6">
                <div className="p-6 rounded-lg bg-muted flex flex-col items-center justify-center space-y-4">
                    {isTimerRunning ? (
                        <>
                            <h3 className="text-lg font-semibold text-primary">Session in Progress</h3>
                            <div className="text-5xl font-mono font-bold text-foreground tracking-wider">{formatTime(elapsedTime)}</div>
                            <Button onClick={handleStopTimer} variant="destructive" size="lg"><StopCircle className="mr-2"/> Stop Session</Button>
                        </>
                    ) : (
                        <>
                            <h3 className="text-lg font-semibold text-muted-foreground">Ready to study?</h3>
                            <Button onClick={handleStartTimer} size="lg"><PlayCircle className="mr-2"/> Start Study Session</Button>
                        </>
                    )}
                </div>
                <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
                        <span className="font-medium flex items-center gap-2"><Book className="text-muted-foreground"/>Total Personal Resources</span>
                        <span className="font-bold text-lg">{personalResources.length}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-secondary rounded-lg">
                        <span className="font-medium flex items-center gap-2"><Clock className="text-muted-foreground"/>Total Library Study Time</span>
                        <span className="font-bold text-lg">{formatTotalTime(totalStudyTime)}</span>
                    </div>
                </div>
            </div>
            
            {/* Visualizations Column */}
            <div className="flex flex-col gap-8">
                <StudyHeatmap studyData={studyData} />
                <WeeklyBarChart studyData={studyData} />
            </div>
        </CardContent>
      </Card>


      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="official">Official School Resources</TabsTrigger>
          <TabsTrigger value="personal">My Personal Library</TabsTrigger>
        </TabsList>
        <TabsContent value="official" className="mt-6">
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search official resources..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
            {renderOfficialResources()}
        </TabsContent>
        <TabsContent value="personal" className="mt-6">
            <div className="flex flex-wrap items-center gap-4 mb-4">
                <div className="relative flex-grow"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search my library..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
                <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-muted-foreground"/><span className="text-sm font-medium">Filter by type:</span>
                    <Button variant={filterType === 'ALL' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('ALL')}>All</Button>
                    <Button variant={filterType === 'BOOK' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('BOOK')}>Books</Button>
                    <Button variant={filterType === 'NOTE' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('NOTE')}>Notes</Button>
                    <Button variant={filterType === 'VIDEO' ? 'default' : 'outline'} size="sm" onClick={() => setFilterType('VIDEO')}>Videos</Button>
                </div>
            </div>
            {renderPersonalResources()}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Visualization Components ---

const StudyHeatmap = ({ studyData }: { studyData: Record<string, number> }) => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const daysInMonth = getDaysInMonth(today);
    const startingDayOfWeek = monthStart.getDay(); // 0 for Sunday, 1 for Monday etc.

    const heatmapDays = useMemo(() => {
        const days = [];
        // Add blank placeholders for days before the 1st of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push({ key: `blank-${i}`, date: null, duration: 0 });
        }
        // Add actual days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            const date = addDays(monthStart, i - 1);
            const dateStr = format(date, 'yyyy-MM-dd');
            days.push({ key: dateStr, date, duration: studyData[dateStr] || 0 });
        }
        return days;
    }, [studyData, monthStart, daysInMonth, startingDayOfWeek]);
    
    const maxDuration = Math.max(1, ...Object.values(studyData));

    return (
        <Card className="shadow-md">
            <CardHeader><CardTitle className="text-base flex items-center"><CalendarDays className="mr-2"/>Study Activity Heatmap ({format(today, 'MMMM')})</CardTitle></CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 gap-1.5">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="text-xs font-bold text-center text-muted-foreground">{day}</div>)}
                    {heatmapDays.map(day => (
                        <TooltipProvider key={day.key} delayDuration={0}>
                            <UiTooltip>
                                <TooltipTrigger>
                                    <div className={cn("h-8 w-8 rounded-md flex items-center justify-center text-xs", day.date ? 'border' : '')}
                                        style={{ backgroundColor: day.duration > 0 ? `hsl(var(--primary-hsl), ${Math.min(0.2 + (day.duration / maxDuration) * 0.8, 1)})` : 'hsl(var(--muted))' }}>
                                        {day.date ? format(day.date, 'd') : ''}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {day.date ? `${format(day.date, 'PPP')}: ${formatTotalTime(day.duration)}` : 'No activity'}
                                </TooltipContent>
                            </UiTooltip>
                        </TooltipProvider>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

const WeeklyBarChart = ({ studyData }: { studyData: Record<string, number> }) => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    
    const chartData = weekDays.map(date => ({
        name: format(date, 'EEE'),
        duration: (studyData[format(date, 'yyyy-MM-dd')] || 0) / 60, // in minutes
    }));

    return (
        <Card className="shadow-md">
            <CardHeader><CardTitle className="text-base flex items-center"><BarChartHorizontal className="mr-2"/>This Week's Study (Minutes)</CardTitle></CardHeader>
            <CardContent className="h-48">
                <ChartContainer config={{duration: {label: "Minutes"}}} className="w-full h-full">
                    <BarChart data={chartData} accessibilityLayer layout="vertical">
                         <XAxis type="number" dataKey="duration" hide />
                         <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} />
                         <Tooltip cursor={{fill: 'hsl(var(--muted))'}} content={<ChartTooltipContent hideLabel />} />
                         <Bar dataKey="duration" fill="hsl(var(--chart-1))" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

    

    
