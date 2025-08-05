
// src/components/dashboard/ParentDashboard.tsx
'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Activity, FileText, CalendarDays, MessageCircle, Settings, Users, TrendingUp, ShieldCheck, PlusCircle, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { api } from '@/lib/api';
import type { Event as EventInterface, ParentStudentLinkAPI, StudentProfileData } from '@/interfaces';
import { useAuth } from '@/context/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';


interface DisplayChild {
  id: string; // ParentStudentLink ID
  studentId: string; // Student User ID
  name: string;
  avatarUrl?: string;
  classLevel: number;
  overallProgress: number; 
  lastActivity: string; 
  alerts?: string[];
  studentProfile?: StudentProfileData; 
}

export default function ParentDashboard() {
  const { currentUser } = useAuth();
  const [linkedChildren, setLinkedChildren] = useState<DisplayChild[]>([]);
  const [events, setEvents] = useState<EventInterface[]>([]);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [childrenError, setChildrenError] = useState<string | null>(null);
  const [eventsError, setEventsError] = useState<string | null>(null); 

  useEffect(() => {
    const fetchChildren = async () => {
      if (!currentUser || currentUser.role !== 'Parent') {
        setIsLoadingChildren(false);
        return;
      }
      setIsLoadingChildren(true);
      setChildrenError(null);
      try {
        const linkResponse = await api.get<ParentStudentLinkAPI[] | { results: ParentStudentLinkAPI[] }>(`/parent-student-links/?parent=${currentUser.id}`);
        let actualLinks: ParentStudentLinkAPI[];
        if (Array.isArray(linkResponse)) {
          actualLinks = linkResponse;
        } else if (linkResponse && Array.isArray(linkResponse.results)) {
          actualLinks = linkResponse.results;
        } else {
          console.error("Unexpected parent-student link data format:", linkResponse);
          actualLinks = [];
        }

        const displayChildren: DisplayChild[] = actualLinks.map(link => ({
          id: String(link.id),
          studentId: String(link.student),
          name: link.student_username || "Unknown Student",
          avatarUrl: link.student_details?.profile_picture_url || `https://placehold.co/100x100.png?text=${(link.student_username || "U").charAt(0)}`,
          classLevel: link.student_details?.enrolled_class_name ? parseInt(link.student_details.enrolled_class_name.match(/\d+/)?.[0] || '0') : 0,
          overallProgress: Math.floor(Math.random() * 50) + 50, 
          lastActivity: "Mocked: Completed Math Quiz", 
          studentProfile: link.student_details
        }));
        setLinkedChildren(displayChildren);
      } catch (err) {
        console.error("Failed to fetch linked children:", err);
        setChildrenError(err instanceof Error ? err.message : "Failed to load children data.");
      } finally {
        setIsLoadingChildren(false);
      }
    };

    const fetchEvents = async () => {
      setIsLoadingEvents(true);
      setEventsError(null); 
      try {
        const eventResponse = await api.get<EventInterface[] | { results: EventInterface[] }>('/events/?ordering=date');
        let actualApiEvents: EventInterface[];
        if (Array.isArray(eventResponse)) {
          actualApiEvents = eventResponse;
        } else if (eventResponse && Array.isArray(eventResponse.results)) {
          actualApiEvents = eventResponse.results;
        } else {
          console.error("Unexpected event data format:", eventResponse);
          actualApiEvents = [];
        }
        setEvents(actualApiEvents.filter(e => new Date(e.date) >= new Date()).slice(0, 5)); 
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setEventsError(err instanceof Error ? err.message : "Failed to load events"); 
      } finally {
        setIsLoadingEvents(false);
      }
    };

    fetchChildren();
    fetchEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);


  return (
    <div className="space-y-8">
      <section className="p-6 bg-gradient-to-r from-accent to-blue-600 text-primary-foreground rounded-xl shadow-xl">
        <h1 className="text-3xl font-bold tracking-tight">Parent Dashboard</h1>
        <p className="mt-2 text-lg">Welcome! Here’s an overview of your children's learning journey on StepWise.</p>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold flex items-center">
            <Users className="mr-3 text-primary" /> My Children
          </h2>
          <Button variant="outline" asChild>
            <Link href="/parent/children"><PlusCircle className="mr-2 h-4 w-4"/> Manage Children</Link>
          </Button>
        </div>
        {isLoadingChildren ? (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                {[1,2].map(i => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
            </div>
        ) : childrenError ? (
            <Card className="p-6 text-center text-red-500 bg-red-50 border-red-200"><AlertTriangle className="inline mr-2"/>{childrenError}</Card>
        ) : linkedChildren.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {linkedChildren.map(child => (
                <Card key={child.id} className="shadow-lg hover:shadow-xl transition-shadow rounded-xl">
                <CardHeader className="flex flex-row items-center space-x-4">
                    <Avatar className="h-16 w-16 border-2 border-primary">
                    <AvatarImage src={child.avatarUrl} alt={child.name} data-ai-hint="child portrait"/>
                    <AvatarFallback>{child.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                    <CardTitle className="text-xl">{child.name}</CardTitle>
                    <CardDescription>Class {child.classLevel || 'N/A'}</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-muted-foreground">Overall Progress</span>
                        <span className="text-sm font-bold text-primary">{child.overallProgress}%</span>
                    </div>
                    <Progress value={child.overallProgress} aria-label={`${child.name}'s overall progress`} />
                    </div>
                    <div>
                    <p className="text-sm text-muted-foreground"><strong className="font-medium text-foreground">Last Activity:</strong> {child.lastActivity}</p>
                    </div>
                    {child.alerts && child.alerts.length > 0 && (
                    <div className="p-3 bg-warning/10 border-l-4 border-warning rounded-md">
                        <h4 className="font-semibold text-sm text-warning-foreground mb-1">Important Alerts:</h4>
                        <ul className="list-disc list-inside pl-2 text-xs text-warning-foreground">
                        {child.alerts.map((alert, i) => <li key={i}>{alert}</li>)}
                        </ul>
                    </div>
                    )}
                </CardContent>
                <CardFooter className="gap-2">
                    <Button variant="default" size="sm" asChild>
                    <Link href={`/parent/child/${child.studentId}/progress`}><TrendingUp className="mr-2 h-4 w-4" />View Progress</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                    <Link href={`/parent/reports/${child.studentId}`}><FileText className="mr-2 h-4 w-4" />View Report Card</Link>
                    </Button>
                </CardFooter>
                </Card>
            ))}
            </div>
        ) : (
            <Card className="p-6 text-center">
                <CardTitle>No Children Linked</CardTitle>
                <CardDescription className="my-2">Link your child's account to monitor their progress.</CardDescription>
                <Button asChild>
                    <Link href="/parent/children"><PlusCircle className="mr-2 h-4 w-4"/> Link Child</Link>
                </Button>
            </Card>
        )}
      </section>

      <Separator />

      <section className="grid md:grid-cols-2 gap-6">
        <Card className="rounded-xl shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center"><CalendarDays className="mr-2 text-primary"/>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingEvents ? (
               <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : eventsError ? (
                 <p className="text-red-500 text-sm"><AlertTriangle className="inline mr-1 h-4 w-4" /> Error: {eventsError}</p>
            ) : events.length > 0 ? (
              <ul className="space-y-2">
                {events.map(event => (
                  <li key={event.id} className="p-2 border-b last:border-b-0">
                    <h4 className="font-semibold text-sm">{event.title} <span className="text-xs font-normal text-muted-foreground">({event.type})</span></h4>
                    <p className="text-xs text-muted-foreground">{new Date(event.date).toLocaleDateString()}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming events.</p>
            )}
             <Button variant="outline" size="sm" className="w-full mt-4" asChild>
              <Link href="/parent/calendar">View Full Calendar</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-xl shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center"><MessageCircle className="mr-2 text-primary"/>Communication Center</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Quickly access messages or contact support.</p>
            <Button variant="default" className="w-full sm:w-auto" asChild>
                <Link href="/parent/communication">Messages from Teachers</Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">Contact Support</Button>
          </CardContent>
        </Card>
      </section>
       <section className="p-6 bg-secondary rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-3 text-secondary-foreground flex items-center"><ShieldCheck className="mr-2"/> Account & Settings</h2>
        <p className="text-sm text-muted-foreground mb-4">Manage your account preferences and notification settings.</p>
        <Button variant="outline" className="bg-background hover:bg-muted" asChild>
            <Link href="/parent/settings">
                <Settings className="mr-2 h-4 w-4"/> Go to Settings
            </Link>
        </Button>
      </section>
    </div>
  );
}
