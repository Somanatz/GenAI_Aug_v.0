// src/app/teacher/analytics/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChartBig, Users, BookOpenText, CheckCircle2, TrendingUp, Percent } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart'; // Assuming chart components are available

const overallPerformanceData = [
  { month: "Jan", avgScore: 75 }, { month: "Feb", avgScore: 78 }, { month: "Mar", avgScore: 82 },
  { month: "Apr", avgScore: 80 }, { month: "May", avgScore: 85 }, { month: "Jun", avgScore: 88 },
];
const overallPerformanceChartConfig = {
  avgScore: { label: "Avg. Score", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const subjectProgressData = [
  { subject: "Math", progress: 85, color: "hsl(var(--chart-1))" },
  { subject: "Science", progress: 92, color: "hsl(var(--chart-2))" },
  { subject: "English", progress: 78, color: "hsl(var(--chart-3))" },
  { subject: "History", progress: 80, color: "hsl(var(--chart-4))" },
  { subject: "Art", progress: 95, color: "hsl(var(--chart-5))" },
];
const subjectProgressChartConfig = {
  progress: { label: "Progress (%)" },
   Math: { label: "Math", color: "hsl(var(--chart-1))" },
  Science: { label: "Science", color: "hsl(var(--chart-2))" },
  English: { label: "English", color: "hsl(var(--chart-3))" },
  History: { label: "History", color: "hsl(var(--chart-4))" },
  Art: { label: "Art", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;


export default function TeacherAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center"><BarChartBig className="mr-3 text-primary" /> Classroom Analytics</h1>
          <p className="text-muted-foreground">Insights into student performance, engagement, and progress.</p>
        </div>
        <Select defaultValue="last-30-days">
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-7-days">Last 7 Days</SelectItem>
            <SelectItem value="last-30-days">Last 30 Days</SelectItem>
            <SelectItem value="last-quarter">Last Quarter</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Student Score</CardTitle>
            <Percent className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">82%</div>
            <p className="text-xs text-muted-foreground">+3% from last month</p>
          </CardContent>
        </Card>
        <Card className="shadow-md rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Users className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">115/125</div>
            <p className="text-xs text-muted-foreground">92% engagement</p>
          </CardContent>
        </Card>
        <Card className="shadow-md rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments Graded</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">350</div>
            <p className="text-xs text-muted-foreground">12 pending review</p>
          </CardContent>
        </Card>
        <Card className="shadow-md rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Improved Subject</CardTitle>
            <TrendingUp className="h-5 w-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Mathematics</div>
            <p className="text-xs text-muted-foreground">+8% avg. score</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Overall Student Performance Trend</CardTitle>
            <CardDescription>Average scores over the past 6 months.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ChartContainer config={overallPerformanceChartConfig} className="w-full h-full">
              <BarChart data={overallPerformanceData} accessibilityLayer>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                <Bar dataKey="avgScore" fill="var(--color-avgScore)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle>Subject-wise Progress Distribution</CardTitle>
            <CardDescription>Current average progress for key subjects.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
             <ChartContainer config={subjectProgressChartConfig} className="w-full h-full">
              <BarChart data={subjectProgressData} layout="vertical" accessibilityLayer>
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="subject" type="category" tickLine={false} tickMargin={10} axisLine={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))" }} content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="progress" radius={4}>
                  {subjectProgressData.map((entry) => (
                     <rect key={entry.subject} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
