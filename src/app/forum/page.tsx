
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Loader2, AlertTriangle, MessageSquare, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import type { ForumCategory, ForumThread } from '@/interfaces';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function ForumPage() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [threads, setThreads]     = useState<ForumThread[]>([]);
  const [activeTab, setActiveTab] = useState<'all'|string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string|null>(null);

  // For modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle]   = useState('');
  const [newCatId, setNewCatId]       = useState<string>('');
  const [newContent, setNewContent] = useState('');

  const fetchCategories = async () => {
      try {
          const catsData = await api.get<ForumCategory[]>('/forum/categories/');
          const actualCategories = Array.isArray(catsData) ? catsData : (catsData as any).results || [];
          setCategories(actualCategories);
      } catch (err) {
          console.error(err);
      }
  };

  const fetchThreads = async (slug?: string) => {
    setIsLoading(true);
    setError(null);
    try {
        const threadData = await api.get<ForumThread[]>(slug ? `/forum/threads/?category__slug=${slug}` : '/forum/threads/');
        const actualThreads = Array.isArray(threadData) ? threadData : (threadData as any).results || [];
        setThreads(actualThreads);
    } catch(e) {
        console.error(e);
        setError('Could not load threads');
        setThreads([]);
    } finally {
        setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchThreads(activeTab === 'all' ? undefined : activeTab);
  }, [activeTab]);

  async function handleCreateThread() {
    if (!newCatId || !newTitle || !newContent) {
        toast({title: "Missing fields", description: "Please select a category and provide a title and message.", variant: "destructive"});
        return;
    }
    setIsSubmitting(true);
    try {
      const thread = await api.post<ForumThread>('/forum/threads/', { category: parseInt(newCatId, 10), title: newTitle });
      
      if (thread && thread.id) {
          await api.post('/forum/posts/', { thread: thread.id, content: newContent });
      }

      toast({title: "Thread Created!", description: "Your new thread has been posted."});
      setIsModalOpen(false);
      setNewTitle(''); setNewContent(''); setNewCatId('');
      if (activeTab !== 'all') {
          setActiveTab('all');
      } else {
          fetchThreads();
      }

    } catch(e: any) {
      toast({title: "Failed to create thread", description: e.message || "An error occurred.", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  }

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
            {categories.map(c => (
              <TabsTrigger key={c.slug} value={c.slug}>{c.name}</TabsTrigger>
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
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-select">Category</Label>
                <Select onValueChange={setNewCatId} value={newCatId}>
                    <SelectTrigger id="category-select"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>
                        {categories.map(c=>(<SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>))}
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
              <Button onClick={handleCreateThread} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Create Thread
              </Button>
            </div>
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
        {!isLoading && threads.map(t => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <Link href={`/forum/thread/${t.id}`} legacyBehavior>
                <a className="text-lg font-semibold text-primary hover:underline">{t.title}</a>
              </Link>
              <CardDescription className="text-xs">
                by {t.author_username} in <span className="font-medium">{t.category_name}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center text-xs text-muted-foreground pt-2">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4"/> {t.reply_count} replies</span>
                <span className="flex items-center gap-1"><Users className="h-4 w-4"/> {t.view_count} views</span>
              </div>
              <span>
                Last post by {t.last_activity_by} ({formatDistanceToNow(new Date(t.last_activity_at),{addSuffix:true})})
              </span>
            </CardContent>
          </Card>
        ))}
        {(!isLoading && threads.length===0 && !error) && (
          <p className="text-center text-muted-foreground py-10">No threads here yet. Be the first to start a conversation!</p>
        )}
      </div>
    </div>
  );
}
