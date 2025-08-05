
// src/app/teacher/calendar/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays, PlusCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar"; // ShadCN Calendar
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function TeacherCalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="space-y-8">
      <Card className="shadow-xl rounded-xl">
        <CardHeader className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center text-2xl font-bold">
                <CalendarDays className="mr-3 h-7 w-7 text-primary" /> Academic Calendar
              </CardTitle>
              <CardDescription>
                Manage and view school events, exam schedules, and deadlines for your classes.
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => alert("Open 'Add Event' dialog - TBI")}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Event
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center p-4 md:p-6">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border shadow-sm bg-card" // Added bg-card
          />
          <div className="mt-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Events for {date ? date.toLocaleDateString() : 'selected date'}:</h3>
            {/* TODO: Fetch and display events for the selected date/month, specific to teacher's school/classes */}
            <p className="text-sm text-muted-foreground">Event details will appear here.</p>
            {/* Example Event Item */}
            <div className="mt-2 p-3 border rounded-md bg-secondary/50">
                <h4 className="font-semibold">Staff Meeting</h4>
                <p className="text-xs text-muted-foreground">3:00 PM - 4:00 PM</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
