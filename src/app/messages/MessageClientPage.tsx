// src/app/messages/MessageClientPage.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, Send, Inbox, Mail, AlertTriangle, MessageSquare, Users2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { User as UserInterface, Message as MessageInterface } from '@/interfaces';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow, isSameDay, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';


// Type for a unified conversation thread
interface Conversation {
    other_user: {
        id: number;
        username: string;
        full_name?: string | null;
        avatar_url?: string | null;
    };
    last_message: MessageInterface;
    unread_count: number;
}


const NewMessageForm = ({ onMessageSent, contacts }: { onMessageSent: (userId: number) => void; contacts: UserInterface[] }) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserInterface | null>(null);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    const filteredContacts = useMemo(() => 
        contacts.filter(c => 
            (c.full_name || c.username).toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase())
        ), 
    [contacts, searchTerm]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedUser || !subject.trim() || !body.trim()) {
            toast({ title: "Missing Information", description: "Please select a contact and fill out both subject and body.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            await api.post('/messages/', {
                recipient: selectedUser.id,
                subject,
                body,
            });
            toast({ title: "Message Sent!", description: "Your message has been sent successfully." });
            onMessageSent(selectedUser.id);
        } catch (err: any) {
            toast({ title: "Error", description: err.message || "Could not send the message.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (selectedUser) {
        return (
            <form onSubmit={handleSubmit} className="p-4 flex flex-col h-full">
                <div className="flex items-center gap-2 border-b pb-3 mb-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedUser(null)}><ArrowLeft className="h-4 w-4"/></Button>
                    <Avatar className="h-9 w-9"><AvatarImage src={selectedUser.student_profile?.profile_picture_url || selectedUser.teacher_profile?.profile_picture_url || selectedUser.parent_profile?.profile_picture_url || ''} /><AvatarFallback>{(selectedUser.full_name || selectedUser.username).charAt(0)}</AvatarFallback></Avatar>
                    <h3 className="font-semibold">{selectedUser.full_name || selectedUser.username}</h3>
                </div>
                <div className="space-y-4 flex-grow">
                    <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
                    <Textarea placeholder={`Message to ${selectedUser.full_name || selectedUser.username}...`} value={body} onChange={(e) => setBody(e.target.value)} required className="h-32"/>
                </div>
                <Button type="submit" disabled={isSubmitting} className="mt-4">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>} Send Message
                </Button>
            </form>
        )
    }

    return (
      <div className="p-4 flex flex-col h-full">
        <Input placeholder="Search contacts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="mb-4" />
        <div className="flex-grow overflow-y-auto space-y-2">
            {filteredContacts.length > 0 ? filteredContacts.map(contact => (
                <div key={contact.id} onClick={() => setSelectedUser(contact)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                    <Avatar><AvatarImage src={contact.student_profile?.profile_picture_url || contact.teacher_profile?.profile_picture_url || contact.parent_profile?.profile_picture_url || ''} /><AvatarFallback>{(contact.full_name || contact.username).charAt(0)}</AvatarFallback></Avatar>
                    <div><p className="font-semibold">{contact.full_name || contact.username}</p><p className="text-xs text-muted-foreground">{contact.role}</p></div>
                </div>
            )) : <p className="text-center text-sm text-muted-foreground p-4">No contacts found.</p>}
        </div>
      </div>
    );
};


export default function MessageClientPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [contacts, setContacts] = useState<UserInterface[]>([]);

  const messageEndRef = useRef<HTMLDivElement | null>(null);

  const fetchData = useCallback(async (selectUserId?: number) => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
        const [convosRes, contactsRes] = await Promise.all([
            api.get<Conversation[]>('/messages/conversations/'),
            api.get<UserInterface[]>('/messages/contacts/')
        ]);
        setConversations(convosRes || []);
        setContacts(contactsRes || []);
        
        let conversationToSelect = null;
        if(selectUserId) {
            conversationToSelect = (convosRes || []).find(c => c.other_user.id === selectUserId);
        } else if ((convosRes || []).length > 0) {
            conversationToSelect = convosRes[0];
        }
        
        if (conversationToSelect) {
            handleConversationSelect(conversationToSelect);
        } else if (selectUserId) {
            const contact = (contactsRes || []).find(c => c.id === selectUserId);
            if (contact) {
                 setIsComposing(true);
                 setSelectedConversation({
                     other_user: {id: contact.id, username: contact.username, full_name: contact.full_name},
                     last_message: {} as MessageInterface,
                     unread_count: 0
                 });
                 setMessages([]);
            }
        }
        
    } catch (err: any) {
        setError(err.message || "Failed to load messaging data.");
    } finally {
        setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    const recipientId = searchParams.get('recipientId');
    fetchData(recipientId ? parseInt(recipientId) : undefined);
  }, [fetchData, searchParams]);

  const handleConversationSelect = async (conversation: Conversation) => {
      setIsComposing(false);
      setSelectedConversation(conversation);
      setIsLoadingMessages(true);
      try {
          const res = await api.get<{results: MessageInterface[]}>(`/messages/?user_id=${conversation.other_user.id}`);
          setMessages(res.results || []);
          // Mark conversation as read locally
          setConversations(prev => prev.map(c => c.other_user.id === conversation.other_user.id ? {...c, unread_count: 0} : c));
      } catch (err) {
          toast({title: "Error", description: "Could not load messages.", variant: "destructive"});
      } finally {
          setIsLoadingMessages(false);
      }
  };

  const handleReplySubmit = async (content: string) => {
      if(!selectedConversation) return;
      try {
        await api.post('/messages/', {
            recipient: selectedConversation.other_user.id,
            subject: `Re: ${messages[0]?.subject || 'Conversation'}`,
            body: content,
        });
        handleConversationSelect(selectedConversation); // Refetch messages for this convo
        fetchData(); // Refetch conversation list to update last message
      } catch(err:any) {
        toast({title: "Error", description: "Could not send reply.", variant: "destructive"});
      }
  };
  
  const handleNewMessageSent = (userId: number) => {
      setIsComposing(false);
      fetchData(userId);
  };
  
   useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  let lastDate: string | null = null;
  
  const renderMessages = () => {
    if (isLoadingMessages) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>
    }
    return messages.slice().reverse().map(message => {
        const messageDate = format(parseISO(message.sent_at), 'yyyy-MM-dd');
        const showDateSeparator = messageDate !== lastDate;
        lastDate = messageDate;

        const isSender = String(message.sender) === String(currentUser?.id);

        return (
            <React.Fragment key={message.id}>
                {showDateSeparator && (
                    <div className="text-center text-xs text-muted-foreground my-4">
                        {isSameDay(parseISO(message.sent_at), new Date()) ? 'Today' : format(parseISO(message.sent_at), 'PPP')}
                    </div>
                )}
                <div className={cn("flex items-end gap-2", isSender ? "justify-end" : "justify-start")}>
                    {!isSender && (
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={selectedConversation?.other_user.avatar_url || undefined} />
                            <AvatarFallback>{(selectedConversation?.other_user.full_name || '?').charAt(0)}</AvatarFallback>
                        </Avatar>
                    )}
                    <div className={cn("max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl", isSender ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none")}>
                        <p className="text-sm">{message.body}</p>
                        <p className="text-xs opacity-70 mt-1 text-right">{format(parseISO(message.sent_at), 'p')}</p>
                    </div>
                </div>
            </React.Fragment>
        )
    });
  };

  return (
    <div className="h-[calc(100vh-10rem)] border rounded-lg shadow-sm flex">
        {/* Left: Conversation List */}
        <aside className="w-1/3 border-r flex flex-col">
            <header className="p-4 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold">Conversations</h2>
                <Button variant="ghost" size="icon" onClick={() => { setIsComposing(true); setSelectedConversation(null); setMessages([]); }}><Mail className="h-5 w-5"/></Button>
            </header>
            <div className="flex-grow overflow-y-auto">
                {isLoading ? (
                    <div className="p-2 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full"/>)}</div>
                ) : error ? (
                    <p className="p-4 text-sm text-destructive">{error}</p>
                ) : (
                    conversations.map(convo => (
                        <div key={convo.other_user.id} onClick={() => handleConversationSelect(convo)} 
                             className={cn("flex items-start gap-3 p-3 border-b last:border-b-0 cursor-pointer", selectedConversation?.other_user.id === convo.other_user.id ? "bg-muted" : "hover:bg-muted/50")}>
                            <Avatar><AvatarImage src={convo.other_user.avatar_url || undefined}/><AvatarFallback>{(convo.other_user.full_name || convo.other_user.username).charAt(0)}</AvatarFallback></Avatar>
                            <div className="flex-1 truncate">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold truncate">{convo.other_user.full_name || convo.other_user.username}</p>
                                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(convo.last_message.sent_at), {addSuffix: true})}</p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-muted-foreground truncate">{convo.last_message.body}</p>
                                    {convo.unread_count > 0 && <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full h-5 w-5 flex items-center justify-center">{convo.unread_count}</span>}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </aside>

        {/* Right: Chat Panel */}
        <main className="w-2/3 flex flex-col">
            {selectedConversation || isComposing ? (
                 isComposing ? (
                     <NewMessageForm onMessageSent={handleNewMessageSent} contacts={contacts}/>
                 ) : (
                    <>
                        <header className="p-4 border-b flex items-center gap-3">
                           <Avatar><AvatarImage src={selectedConversation?.other_user.avatar_url || undefined} /><AvatarFallback>{(selectedConversation?.other_user.full_name || '?').charAt(0)}</AvatarFallback></Avatar>
                           <h3 className="font-bold">{selectedConversation?.other_user.full_name || selectedConversation?.other_user.username}</h3>
                        </header>
                        <div className="flex-grow p-4 overflow-y-auto space-y-4">
                            {renderMessages()}
                            <div ref={messageEndRef}/>
                        </div>
                        <div className="p-4 border-t">
                            <ReplyForm onSubmit={handleReplySubmit} />
                        </div>
                    </>
                 )
            ) : (
                <div className="flex flex-col justify-center items-center h-full text-muted-foreground">
                    <Inbox className="h-16 w-16 mb-4"/>
                    <h3 className="text-lg font-semibold">Select a conversation</h3>
                    <p className="text-sm">Or start a new one to begin messaging.</p>
                </div>
            )}
        </main>
    </div>
  );
}

const ReplyForm = ({ onSubmit }: { onSubmit: (content: string) => void }) => {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if(!content.trim()) return;
        setIsSubmitting(true);
        await onSubmit(content);
        setContent('');
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Type a message..." className="flex-1"/>
            <Button type="submit" disabled={isSubmitting || !content.trim()}>
                 {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
        </form>
    )
}
