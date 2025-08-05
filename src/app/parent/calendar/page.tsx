
// src/app/parent/calendar/page.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar"; // ShadCN Calendar
import { useState } from "react";

export default function ParentCalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="space-y-8">
      <Card className="shadow-xl rounded-xl">
        <CardHeader className="p-6">
          <CardTitle className="flex items-center text-2xl font-bold">
            <CalendarDays className="mr-3 h-7 w-7 text-primary" /> School & Child Calendar
          </CardTitle>
          <CardDescription>
            View school-wide events and important dates related to your children.
          </CardDescription>
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
            {/* TODO: Fetch and display events for the selected date/month, potentially filtering by child's class/school */}
            <p className="text-sm text-muted-foreground">Event details will appear here.</p>
             <p className="text-xs text-muted-foreground mt-2">Events specific to your children's classes will also be highlighted.</p>
              {/* Example Event Item */}
            <div className="mt-2 p-3 border rounded-md bg-secondary/50">
                <h4 className="font-semibold">School Holiday: Spring Break</h4>
                <p className="text-xs text-muted-foreground">All Day</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
