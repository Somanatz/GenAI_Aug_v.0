'use client';

import { useEffect, useState, useCallback, FormEvent, useRef, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';

// UI Component Imports
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp, MessageSquare, Send, Loader2, AlertTriangle, ArrowLeft, Paperclip, Eye, MessageCircle } from 'lucide-react';

// Type Definitions
import type { ForumPost as PostInterface, PostAttachment } from '@/interfaces';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
interface ForumThreadData { id: number; title: string; author_username: string; created_at: string; view_count: number; posts: PostInterface[]; attachments: PostAttachment[]; }


// Sub-components
const AttachmentDisplay = ({ attachments }: { attachments: PostAttachment[] }) => {
    if (!attachments || attachments.length === 0) return null;
    return (
        <div className="mt-4 p-4 border rounded-lg bg-card/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {attachments.map(att => (
                 att.file_type === 'image' ? (
                    <div key={att.id} className="relative aspect-video rounded-md overflow-hidden">
                       <Image src={att.file_url} alt={att.file_name || 'Attachment'} layout="fill" objectFit="cover" />
                    </div>
                 ) : (
                    <a key={att.id} href={att.file_url} target='_blank' rel='noopener noreferrer' 
                       className='text-primary text-sm flex items-center gap-2 p-3 bg-secondary rounded-md hover:bg-secondary/80 transition-colors'>
                        <Paperclip className='h-5 w-5' /> 
                        <span className="truncate">{att.file_name || 'Download File'}</span>
                    </a>
                 )
            ))}
        </div>
    );
};

const ReplyForm = ({ threadId, parentId, onReplyPosted, onCancel, replyingToUsername }: {
    threadId: number; parentId: number | null; onReplyPosted: () => void; onCancel?: () => void; replyingToUsername?: string;
}) => {
    const { toast } = useToast();
    const { handleSubmit, register, formState: { errors, isSubmitting }, reset } = useForm<{content: string}>();

    const onSubmit = async (data: {content: string}) => {
        if (!data.content.trim()) return;
        try {
            await api.post('/forum-posts/', { thread: threadId, parent_post: parentId, content: data.content });
            onReplyPosted();
            reset();
            onCancel?.();
        } catch (err) {
            toast({title: "Error Posting Reply", description: "Could not post your reply.", variant: "destructive"});
            console.error(err);
        }
    };
    return (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-2">
            <Textarea 
              {...register('content', { required: "Content cannot be empty."})}
              placeholder={replyingToUsername ? `Replying to @${replyingToUsername}...` : "Write your comment..."} 
              rows={3} 
              required 
            />
            {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
            <div className="flex items-center gap-2">
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Post Reply
                </Button>
                {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
            </div>
        </form>
    );
};

const PostCard = ({ post, onLike, onReplyPosted, threadId }: {
    post: PostInterface; onLike: (postId: number) => void; onReplyPosted: () => void; threadId: number;
}) => {
    const [isReplying, setIsReplying] = useState(false);
    return (
        <Fragment key={post.id}>
            <div className="flex gap-4">
                <Avatar className="h-10 w-10 border"><AvatarImage src={post.author_avatar_url ?? undefined} /><AvatarFallback>{post.author_username.charAt(0)}</AvatarFallback></Avatar>
                <div className="flex-1">
                    <div className="bg-muted p-4 rounded-lg rounded-tl-none">
                        <div className="flex justify-between items-center">
                            <p className="font-semibold">{post.author_username}</p>
                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
                        </div>
                        <p className="whitespace-pre-wrap mt-2">{post.content}</p>
                        <AttachmentDisplay attachments={post.attachments} />
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                        <Button variant="ghost" size="sm" onClick={() => onLike(post.id)}>
                            <ThumbsUp className={cn("mr-2 h-4 w-4", post.is_liked_by_user && 'text-primary fill-primary')} /> {post.like_count}
                        </Button>
                        {post.parent_post === null && // Only allow replies to top-level comments
                            <Button variant="ghost" size="sm" onClick={() => setIsReplying(!isReplying)}>
                                <MessageSquare className="mr-2 h-4 w-4" /> Reply
                            </Button>
                        }
                    </div>
                    {isReplying && (
                        <div className="mt-2">
                            <ReplyForm threadId={threadId} parentId={post.id} replyingToUsername={post.author_username} onReplyPosted={() => { setIsReplying(false); onReplyPosted(); }} onCancel={() => setIsReplying(false)} />
                        </div>
                    )}
                </div>
            </div>
            {/* Nested Replies */}
            {post.replies && post.replies.length > 0 && (
                <div className="pl-8 sm:pl-14 mt-4 space-y-4 border-l-2 ml-5">
                    {post.replies.map(reply => (
                        <PostCard key={reply.id} post={reply} onLike={onLike} onReplyPosted={onReplyPosted} threadId={threadId}/>
                    ))}
                </div>
            )}
        </Fragment>
    );
};

export default function ThreadDetailPage() {
    const params = useParams();
    const { toast } = useToast();
    const router = useRouter();
    const threadId = params.threadId as string;
    
    const [thread, setThread] = useState<ForumThreadData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const fetchThread = useCallback(() => {
        if (!threadId) return;
        api.get<ForumThreadData>(`/forum-threads/${threadId}/`).then(data => {
            setThread(data);
            setError(null);
        }).catch(err => {
            setError(err.response?.data?.detail || 'Could not load thread.');
            setThread(null);
        }).finally(() => {
            setIsLoading(false);
        });
    }, [threadId]);

    useEffect(() => {
        const timeout = setTimeout(() => fetchThread(), 0);
        return () => clearTimeout(timeout);
    }, [fetchThread]);

    const handleLike = async (postId: number) => {
        try {
          await api.post(`/forum-posts/${postId}/toggle-like/`, {});
          fetchThread();
        } catch (err) {
          toast({
            title: "Error",
            description: "Could not update like status.",
            variant: "destructive",
          });
          console.error(err);
        }
    };

    if (isLoading) {
        return ( <div className="container mx-auto p-4 md:p-6 space-y-6"><Skeleton className="h-10 w-3/4 rounded-lg" /><Skeleton className="h-40 w-full rounded-lg mt-4" /></div> );
    }
    
    if (error || !thread) {
        return ( <Card className="container mx-auto mt-6 text-center p-8 bg-destructive/10 border-destructive"><CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive" /></CardHeader><CardContent><CardTitle>Error Loading Thread</CardTitle><CardDescription>{error || 'The requested thread could not be found.'}</CardDescription><Button variant="outline" onClick={() => router.push('/forum')} className="mt-4"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Forum</Button></CardContent></Card> );
    }
    
    const { title, author_username, created_at, view_count, posts } = thread;
    const initialPost = posts?.[0];
    const comments = posts?.slice(1) || [];

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            <header>
                <Button variant="outline" asChild size="sm"><Link href="/forum"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Forum</Link></Button>
                <h1 className="text-3xl font-bold mt-4">{title}</h1>
                <div className="text-sm text-muted-foreground flex items-center gap-4 mt-2 flex-wrap">
                    <span>By {author_username} • {formatDistanceToNow(new Date(created_at), { addSuffix: true })}</span>
                    <span className="flex items-center gap-1.5"><Eye className="h-4 w-4" /> {view_count} views</span>
                    <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> {comments.length} comments</span>
                </div>
            </header>
            
            <main className="space-y-6">
                {initialPost && (
                  <Card>
                      <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4">
                        <Avatar className="h-12 w-12 border"><AvatarImage src={initialPost.author_avatar_url ?? undefined} /><AvatarFallback>{initialPost.author_username.charAt(0)}</AvatarFallback></Avatar>
                        <div>
                            <p className="font-semibold text-lg">{initialPost.author_username}</p>
                            <p className="text-xs text-muted-foreground">Original Post</p>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                              {/* FIX: Get attachments from the initialPost object, not the top-level thread */}
                              <AttachmentDisplay attachments={initialPost.attachments} />
                              <p className="whitespace-pre-wrap mt-4">{initialPost.content}</p>
                              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                               <Button variant="ghost" size="sm" onClick={() => handleLike(initialPost.id)}>
                                <ThumbsUp className={cn("mr-2 h-4 w-4", initialPost.is_liked_by_user && 'text-primary fill-primary')} /> Like ({initialPost.like_count})
                               </Button>
                          </div>
                      </CardContent>
                  </Card>
                )}
                
                <h3 className='text-xl font-bold pt-4'>Comments</h3>
                <div className="space-y-6">
                    {comments.map(post => (
                        <PostCard key={post.id} post={post} onLike={handleLike} onReplyPosted={fetchThread} threadId={thread.id}/>
                    ))}
                </div>
            </main>

            <Card className="p-4 mt-6">
                <h3 className="text-lg font-semibold mb-2">Leave a Comment</h3>
                <ReplyForm threadId={thread.id} parentId={null} onReplyPosted={fetchThread} />
            </Card>
        </div>
    );
}