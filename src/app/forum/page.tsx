'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Loader2, AlertTriangle, MessageSquare, Users, Brain, School, Paperclip } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import type { ForumThread } from '@/interfaces';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { parseISO } from 'date-fns';

type ThreadCategory = 'GENERAL' | 'CLASS' | 'MANAGEMENT';

export default function ForumPage() {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const [threads, setThreads]     = useState<ForumThread[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string|null>(null);

  // For modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle]   = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<ThreadCategory>('GENERAL');
  const [newFile, setNewFile]       = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const availableCategories = useMemo(() => {
    if (!currentUser) return [];
    const cats: { value: ThreadCategory, label: string }[] = [{ value: 'GENERAL', label: 'General Discussion' }];
    if (currentUser.role === 'Student') {
      cats.push({ value: 'CLASS', label: 'My Class Discussion' });
    }
    if (currentUser.role === 'Teacher' || currentUser.role === 'Admin') {
      cats.push({ value: 'MANAGEMENT', label: 'School Management (Staff Only)' });
    }
    return cats;
  }, [currentUser]);

  const fetchThreads = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    let endpoint = '/forum-threads/';
    if (activeTab !== 'all') {
      endpoint += `?category=${activeTab}`;
    }
    try {
        const threadData = await api.get<{results: ForumThread[]}>(endpoint);
        setThreads(threadData.results || []);
    } catch(e) {
        console.error(e);
        setError('Could not load threads');
        setThreads([]);
    } finally {
        setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentUser) {
        fetchThreads();
    }
  }, [activeTab, currentUser, fetchThreads]);

  async function handleCreateThread() {
    if (!newCategory || !newTitle || !newContent) {
        toast({title: "Missing fields", description: "Please select a category and provide a title and message.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('title', newTitle);
    formData.append('category', newCategory);
    formData.append('content', newContent);
    if (newFile) {
        formData.append('file', newFile);
    }

    try {
      await api.post<ForumThread>('/forum-threads/', formData, true);
      toast({title: "Thread Created!", description: "Your new thread has been posted."});
      
      setIsModalOpen(false);
      setNewTitle(''); 
      setNewContent(''); 
      setNewCategory('GENERAL');
      setNewFile(null);
      if(fileInputRef.current) fileInputRef.current.value = '';

      setActiveTab('all'); // This will trigger a re-fetch via useEffect
      fetchThreads(); // Also explicitly re-fetch

    } catch(e: any) {
      const errorMessage = e.response?.data?.title?.[0] || e.message || "An error occurred.";
      toast({title: "Failed to create thread", description: errorMessage, variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  }

  const getCategoryDisplay = (categoryValue: string) => {
    const cat = availableCategories.find(c => c.value === categoryValue);
    if (!cat) {
      switch(categoryValue) {
        case 'GENERAL': return { name: 'General', Icon: School };
        case 'CLASS': return { name: 'Class', Icon: Brain };
        case 'MANAGEMENT': return { name: 'Management', Icon: Users };
        default: return { name: 'Discussion', Icon: MessageSquare };
      }
    }
    switch (cat.value) {
      case 'GENERAL': return { name: cat.label, Icon: School };
      case 'CLASS': return { name: cat.label, Icon: Brain };
      case 'MANAGEMENT': return { name: cat.label, Icon: Users };
      default: return { name: cat.label, Icon: MessageSquare };
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <header className="text-center mb-8 p-6 bg-gradient-to-r from-primary to-accent rounded-xl text-white shadow-lg">
        <MessageSquare className="mx-auto w-16 h-16 mb-4" />
        <h1 className="text-3xl font-bold">GenAI-Campus Forum</h1>
        <p className="text-white/80">Discuss topics with your school community.</p>
      </header>

      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <Tabs defaultValue="all" value={activeTab} onValueChange={(v) => setActiveTab(v)}>
          <TabsList>
            <TabsTrigger value="all">All Threads</TabsTrigger>
            {availableCategories.map(c => (
              <TabsTrigger key={c.value} value={c.value}>{c.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4"/> New Thread</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a new discussion</DialogTitle>
              <DialogDescription>Your thread will be visible to members of your school based on the category you choose.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-select">Category</Label>
                <Select onValueChange={(v) => setNewCategory(v as ThreadCategory)} value={newCategory}>
                    <SelectTrigger id="category-select"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                        {availableCategories.map(c=>(<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}
                    </SelectContent>
                </Select>
              </div>
               <div className="space-y-2">
                <Label htmlFor="thread-title">Title</Label>
                <Input id="thread-title" value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="What is your thread about?"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="thread-content">Message</Label>
                <Textarea id="thread-content" rows={5} value={newContent} onChange={e=>setNewContent(e.target.value)} placeholder="Start the conversation here..."/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="thread-attachment">Attachment (Optional)</Label>
                <Input 
                  id="thread-attachment" 
                  type="file" 
                  ref={fileInputRef}
                  onChange={(e) => setNewFile(e.target.files ? e.target.files[0] : null)}
                />
                {newFile && (
                  <p className="text-xs text-muted-foreground flex items-center gap-2 pt-2">
                    <Paperclip className="h-4 w-4" />
                    Selected: {newFile.name}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
                <Button onClick={handleCreateThread} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create Thread
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <div className="space-y-4">
            {[1,2,3].map(i => <Skeleton key={i} className="w-full h-32 rounded-lg" />)}
        </div>
      )}
      {error && (
        <div className="text-center text-red-600 bg-red-100 p-4 rounded-lg">
          <AlertTriangle className="mx-auto mb-2"/> {error}
        </div>
      )}

      <div className="space-y-4">
        {!isLoading && threads.map(t => {
          const { name, Icon } = getCategoryDisplay(t.category);
          return (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <Link href={`/forum/thread/${t.id}`} legacyBehavior>
                  <a className="text-lg font-semibold text-primary hover:underline">{t.title}</a>
                </Link>
                <CardDescription className="text-xs flex items-center gap-2">
                  by {t.author_username} in 
                  <span className="font-medium flex items-center gap-1"><Icon className="h-3 w-3"/>{name}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between items-center text-xs text-muted-foreground pt-2">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4"/> {t.reply_count} replies</span>
                    <span className="flex items-center gap-1"><Users className="h-4 w-4"/> {t.view_count} views</span>
                  </div>
                  <span>
                    Last activity {formatDistanceToNow(parseISO(t.last_activity_at || t.created_at), { addSuffix: true })}
                    {t.last_activity_by && ` by ${t.last_activity_by}`}
                  </span>
                </CardContent>
            </Card>
          )
        })}
        {(!isLoading && threads.length===0 && !error) && (
          <p className="text-center text-muted-foreground py-10">No threads here yet. Be the first to start a conversation!</p>
        )}
      </div>
    </div>
  );
}
