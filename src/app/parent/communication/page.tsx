
// src/app/parent/communication/page.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send, Inbox, Users, Mail, Loader2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api"; // Assuming API utility
import { Skeleton } from "@/components/ui/skeleton";

interface Message {
  id: string;
  subject: string;
  sender: string; // Or 'You'
  recipient?: string; // For sent messages
  avatarUrl?: string; // Placeholder
  date: string;
  snippet: string;
  read: boolean;
  childName?: string; // Relevant child for the message
}

export default function ParentCommunicationPage() {
  const [inboxMessages, setInboxMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: Implement API endpoints for parent messages
        // const inbox = await api.get<Message[]>('/messages/inbox/');
        // const sent = await api.get<Message[]>('/messages/sent/');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
        setInboxMessages([]); // setInboxMessages(inbox);
        setSentMessages([]); // setSentMessages(sent);
        setError("Messaging API not yet implemented. Displaying empty state.");
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        setError(err instanceof Error ? err.message : "Could not load messages.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchMessages();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center"><MessageSquare className="mr-3 text-primary" /> Communication Hub</h1>
          <p className="text-muted-foreground">Stay connected with teachers and school administration.</p>
        </div>
      </div>

      <Tabs defaultValue="inbox" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 mb-6">
          <TabsTrigger value="inbox"><Inbox className="mr-2 h-4 w-4" />Inbox ({inboxMessages.filter(m => !m.read).length} unread)</TabsTrigger>
          <TabsTrigger value="sent"><Send className="mr-2 h-4 w-4" />Sent</TabsTrigger>
          <TabsTrigger value="compose" className="col-span-2 md:col-span-1"><Mail className="mr-2 h-4 w-4" />Compose Message</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <MessageList messages={inboxMessages} type="inbox" isLoading={isLoading} error={error} />
        </TabsContent>
        <TabsContent value="sent">
          <MessageList messages={sentMessages} type="sent" isLoading={isLoading} error={error} />
        </TabsContent>
        <TabsContent value="compose">
          <Card className="shadow-lg rounded-xl">
            <CardHeader>
              <CardTitle>Compose New Message</CardTitle>
              <CardDescription>Send a message to a teacher or school staff. (TBI: Teacher/Staff list from API)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recipient">Recipient</Label>
                <Select>
                  <SelectTrigger id="recipient">
                    <SelectValue placeholder="Select teacher or staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teacher_placeholder_1">Teacher Placeholder 1</SelectItem>
                    <SelectItem value="admin_placeholder">School Admin Placeholder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="child-context">Regarding (Child)</Label>
                <Select>
                  <SelectTrigger id="child-context">
                    <SelectValue placeholder="Select child (if applicable)" />
                  </SelectTrigger>
                  <SelectContent>
                     {/* TODO: Populate with parent's linked children */}
                    <SelectItem value="child_placeholder_1">Child Placeholder 1</SelectItem>
                    <SelectItem value="general">General Inquiry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="Enter message subject" />
              </div>
              <div>
                <Label htmlFor="message-body">Message</Label>
                <Textarea id="message-body" placeholder="Type your message here..." rows={5} />
              </div>
              <Button className="w-full sm:w-auto" onClick={() => alert("Send Message - TBI")}>
                <Send className="mr-2 h-4 w-4" /> Send Message
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  type: "inbox" | "sent";
  isLoading: boolean;
  error: string | null;
}

const MessageList: React.FC<MessageListProps> = ({ messages, type, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="space-y-0">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-none border-b" />)}
      </div>
    );
  }
  if (error) {
     return (
        <Card className="text-center py-6 bg-destructive/10 border-destructive rounded-md">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
            <CardTitle className="text-lg">Error Loading Messages</CardTitle>
            <CardDescription className="text-destructive-foreground">{error}</CardDescription>
        </Card>
    );
  }
  if (messages.length === 0) {
    return <p className="text-center text-muted-foreground py-10">No messages in your {type} box. (Messaging API TBI)</p>;
  }
  return (
    <Card className="shadow-md rounded-xl">
      <CardContent className="p-0">
        <div className="space-y-0">
          {messages.map(msg => (
            <div key={msg.id} className={`flex items-start gap-4 p-4 border-b last:border-b-0 hover:bg-secondary/30 ${!msg.read && type === "inbox" ? "bg-primary/5" : ""}`}>
              <Avatar className="h-10 w-10 mt-1">
                <AvatarImage src={msg.avatarUrl} alt={type === "inbox" ? msg.sender : msg.recipient} data-ai-hint="user avatar"/>
                <AvatarFallback>{(type === "inbox" ? msg.sender : msg.recipient || "U").substring(0,2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <p className={`font-semibold ${!msg.read && type === "inbox" ? "text-primary" : ""}`}>
                    {type === "inbox" ? msg.sender : `To: ${msg.recipient}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(msg.date).toLocaleDateString()}</p>
                </div>
                <p className={`text-sm font-medium ${!msg.read && type === "inbox" ? "text-foreground" : "text-muted-foreground"}`}>{msg.subject}</p>
                <p className="text-xs text-muted-foreground truncate max-w-md">{msg.snippet}</p>
                {msg.childName && <p className="text-xs text-accent mt-1">Regarding: {msg.childName}</p>}
              </div>
               {!msg.read && type === "inbox" && (
                  <div className="h-2.5 w-2.5 bg-primary rounded-full self-center" title="Unread"></div>
                )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
