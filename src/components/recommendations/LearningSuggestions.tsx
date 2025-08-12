// src/components/recommendations/LearningSuggestions.tsx
'use client';

import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { personalizedLearningSuggestions, PersonalizedLearningSuggestionsInput, PersonalizedLearningSuggestionsOutput } from '@/ai/flows/personalized-learning-suggestions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lightbulb, BookOpen, Video, HelpCircle, BarChart, LineChart, Activity, AlertTriangle, Calendar, Award, CheckCircle, Target, TrendingUp, Sparkles, Brain, Download } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Subject as SubjectInterface, RecentActivity, StudentRecommendation, SchoolClass } from '@/interfaces';
import { ResponsiveContainer, Bar, BarChart as RechartsBarChart, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, LineChart as RechartsLineChart, Line, CartesianGrid, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { format, subDays, eachDayOfInterval, addDays, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


interface AnalyticsData {
  today_study_minutes: number;
  weekly_study_minutes: { date: string; duration: number }[];
  attendance: { total_days: number; present_days: number };
  subject_distribution: { subject__name: string; total_duration: number }[];
  subject_progress: {
      subject__name: string;
      completed_lessons: number;
      total_lessons: number;
  }[];
  quiz_attempts: { lesson__title: string; attempts: number; final_score: number | null }[];
}

interface StudyTimeSlot {
    time: string;
    subject: string;
    activity: 'Study Time' | 'Revision' | 'Free Time';
    details?: string;
}

const performanceChartConfig = {
    past_performance: { label: "Past Performance", color: "hsl(var(--chart-2))" },
    projected_performance: { label: "Projected Performance", color: "hsl(var(--chart-1))", dash: [4, 4] },
} satisfies ChartConfig;

export default function LearningSuggestions() {
  const { currentUser } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PersonalizedLearningSuggestionsOutput | null>(null);
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [availableLessons, setAvailableLessons] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRecommendationDate, setLastRecommendationDate] = useState<Date | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Step 1: Always try to fetch saved recommendations first.
      const savedRecsResponse = await api.get<{results: StudentRecommendation[]}>(`/student-recommendations/`);
      const savedRecs = savedRecsResponse.results || [];
      
      if (savedRecs && savedRecs.length > 0) {
        const latestRec = savedRecs[0];
        const recDate = new Date(latestRec.created_at);
        const sevenDaysAgo = subDays(new Date(), 7);
        
        // Step 2: Check if the recommendation is recent.
        if (recDate > sevenDaysAgo) {
          setSuggestions(latestRec.recommendation_data);
          setLastRecommendationDate(recDate);
          setIsLoading(false); // We have data to show, exit loading.
          return;
        }
      }
      
      // Step 3: If no recent recommendation, fetch data to generate a new one.
      const [analytics, activities, schoolClass] = await Promise.all([
        api.get<AnalyticsData>('/progress-analytics/'),
        api.get<{results: RecentActivity[]}>(`/recent-activities/?user=${currentUser.id}&page_size=20`),
        currentUser.student_profile?.enrolled_class ? api.get<SchoolClass>(`/school-classes/${currentUser.student_profile.enrolled_class}/`) : Promise.resolve(null),
      ]);
      setAnalyticsData(analytics);
      const actualActivities = activities.results || [];
      setRecentActivities(actualActivities);
      
      let lessonTitles: string[] = [];
      if (schoolClass?.master_class) {
        const subjectsResponse = await api.get<{results: SubjectInterface[]}>(`/subjects/?master_class=${schoolClass.master_class}`);
        lessonTitles = (subjectsResponse.results || []).flatMap(s => s.lessons?.map(l => l.title) || []);
      }
      setAvailableLessons(lessonTitles);

    } catch (err) {
      console.error("Error fetching data for AI suggestions:", err);
      setError("Could not load necessary data for suggestions.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const generateNewSuggestions = async () => {
    if (!currentUser || isLoading || !analyticsData) {
        setError("Cannot fetch suggestions: prerequisite data is missing or still loading.");
        return;
    }
    setIsGenerating(true);
    setError(null);
    
    const input: PersonalizedLearningSuggestionsInput = {
      studentId: String(currentUser.id),
      analytics: analyticsData,
      recentActivities: recentActivities.map(a => ({
          activity_type: a.activity_type,
          details: a.details,
          timestamp: a.timestamp
      })),
      availableLessons,
    };

    try {
      const result = await personalizedLearningSuggestions(input);
      // Step 5: Save the newly generated recommendation to the database.
      const savedResult = await api.post<StudentRecommendation>('/student-recommendations/', {
          recommendation_data: result
      });
      setSuggestions(savedResult.recommendation_data);
      setLastRecommendationDate(new Date(savedResult.created_at));
    } catch (err) {
      console.error("Error fetching learning suggestions:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching suggestions.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!suggestions || !currentUser) return;
    const { analysis, performance_projection, studyTimetable } = suggestions;
    const studentName = currentUser.student_profile?.full_name || currentUser.username;

    const printableContent = `
      <html>
        <head>
          <title>Learning Compass Report for ${studentName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
            h1, h2, h3 { color: #1a73e8; border-bottom: 2px solid #eee; padding-bottom: 5px; }
            h1 { font-size: 28px; text-align: center; }
            h2 { font-size: 22px; margin-top: 30px; }
            h3 { font-size: 18px; margin-top: 20px; border-bottom: 1px solid #eee; }
            .section { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
            .praise { background-color: #e6f4ea; border-left: 5px solid #4caf50; }
            .improvement { background-color: #fff8e1; border-left: 5px solid #ffc107; }
            .summary { background-color: #e3f2fd; border-left: 5px solid #2196f3; }
            ul { padding-left: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .timetable { font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Learning Compass Report</h1>
            <p style="text-align:center;"><strong>Student:</strong> ${studentName}</p>
            <p style="text-align:center;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            
            <h2>AI Coach's Analysis</h2>
            <div class="section praise"><h3>Strengths</h3><ul>${analysis.praise.map((p: string) => `<li>${p}</li>`).join('')}</ul></div>
            <div class="section improvement"><h3>Areas for Improvement</h3><ul>${analysis.improvement_areas.map((p: string) => `<li>${p}</li>`).join('')}</ul></div>
            <div class="section summary"><h3>Strategic Summary</h3><p>${analysis.strategic_summary}</p></div>

            <h2>Action Plan</h2>
            <h3>Suggested Lessons</h3><ul>${suggestions.suggestedLessons.map((i: { title: string; reason: string }) => `<li><strong>${i.title}:</strong> <em>${i.reason}</em></li>`).join('')}</ul>
            <h3>Suggested Videos</h3><ul>${suggestions.suggestedVideos?.map((i: { title: string; reason: string }) => `<li><strong>${i.title}:</strong> <em>${i.reason}</em></li>`).join('') || '<li>None</li>'}</ul>
            <h3>Suggested Quizzes</h3><ul>${suggestions.suggestedQuizzes.map((i: { title: string; reason: string }) => `<li><strong>${i.title}:</strong> <em>${i.reason}</em></li>`).join('')}</ul>
            
            ${studyTimetable ? `
              <h2>AI-Generated Weekly Study Timetable</h2>
              <table class="timetable">
                <thead><tr><th>Time</th>${studyTimetable.map((d: any) => `<th>${d.day}</th>`).join('')}</tr></thead>
                <tbody>
                  ${["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM"].map((time: string) => `
                    <tr>
                      <td>${time}</td>
                      ${studyTimetable.map((day: any) => {
                        const slot = day.slots.find((s: any) => s.time === time);
                        return `<td>${slot ? `<strong>${slot.subject}</strong><br><small>${slot.activity}</small>` : ''}</td>`
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>
        </body>
      </html>
    `;
    const blob = new Blob([printableContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const nextAvailableDate = lastRecommendationDate ? addDays(lastRecommendationDate, 7) : null;
  const canGenerate = !nextAvailableDate || new Date() >= nextAvailableDate;
  const daysUntilNext = nextAvailableDate ? differenceInCalendarDays(nextAvailableDate, new Date()) : 0;

  return (
    <Card className="w-full max-w-5xl mx-auto shadow-2xl">
      <CardHeader>
        <CardTitle className="text-3xl font-poppins flex items-center">
          <Lightbulb className="mr-3 text-primary" size={30} />
          AI Learning Compass
        </CardTitle>
        <CardDescription>Your personalized guide to academic success, powered by performance analytics.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-12">
        <div className="flex justify-end">
           <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div tabIndex={0}>
                            <Button onClick={generateNewSuggestions} disabled={isGenerating || isLoading || !canGenerate}>
                                {isGenerating || isLoading ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isLoading ? 'Loading Analytics...' : 'Generating Insights...'}</>
                                ) : "Generate New Recommendations"}
                            </Button>
                        </div>
                    </TooltipTrigger>
                    {!canGenerate && nextAvailableDate && (
                        <TooltipContent>
                            <p>Next recommendations available in {daysUntilNext} day(s) on {format(nextAvailableDate, 'PPP')}.</p>
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>
        </div>

        {isLoading ? (
          <div className="space-y-8 p-4">
            <Skeleton className="h-48 w-full" />
            <div className="grid md:grid-cols-2 gap-8"><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" /></div>
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>
        ) : suggestions ? (
          <div className="space-y-12">
            <Card className="bg-secondary/50 border-primary/20">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center"><Sparkles className="mr-2 text-primary"/>AI Coach's Analysis</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-2 p-4 rounded-lg bg-green-50 dark:bg-green-900/30">
                        <h4 className="font-semibold flex items-center text-green-700 dark:text-green-300"><Award className="mr-2"/>Praise & Strengths</h4>
                        <ul className="list-disc pl-5 text-sm text-green-800 dark:text-green-200 space-y-1">
                            {suggestions.analysis.praise.map((item : string, i : number) => <li key={`praise-${i}`}>{item}</li>)}
                        </ul>
                    </div>
                     <div className="space-y-2 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/30">
                        <h4 className="font-semibold flex items-center text-amber-700 dark:text-amber-300"><Target className="mr-2"/>Areas for Improvement</h4>
                        <ul className="list-disc pl-5 text-sm text-amber-800 dark:text-amber-200 space-y-1">
                            {suggestions.analysis.improvement_areas.map((item : string, i : number) => <li key={`imp-${i}`}>{item}</li>)}
                        </ul>
                    </div>
                     <div className="space-y-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                        <h4 className="font-semibold flex items-center text-blue-700 dark:text-blue-300"><TrendingUp className="mr-2"/>Strategic Summary</h4>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{suggestions.analysis.strategic_summary}</p>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader><CardTitle className="flex items-center"><LineChart className="mr-2"/>Past vs. Projected Performance</CardTitle><CardDescription>This chart shows your performance trend and a projection if you follow the suggestions.</CardDescription></CardHeader>
                <CardContent className="h-72">
                    <ChartContainer config={performanceChartConfig} className="w-full h-full">
                        <RechartsLineChart data={suggestions.performance_projection} accessibilityLayer margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" tick={{fontSize: 12}} />
                            <YAxis tickFormatter={(val) => `${val}%`}/>
                            <RechartsTooltip content={<ChartTooltipContent hideIndicator />} />
                            <Legend />
                            <Line type="monotone" dataKey="past_performance" strokeWidth={2} name="Past Performance" stroke="hsl(var(--chart-2))" dot={<></>} />
                            <Line type="monotone" dataKey="projected_performance" strokeWidth={2} strokeDasharray="5 5" name="Projected Performance" stroke="hsl(var(--chart-1))" dot={<></>} />
                        </RechartsLineChart>
                    </ChartContainer>
                </CardContent>
            </Card>

            {suggestions.studyTimetable && <StudyTimetableComponent timetable={suggestions.studyTimetable} />}

            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center"><CheckCircle className="mr-3 text-primary"/>Your Action Plan</CardTitle>
                    <CardDescription>Focus on these specific items to boost your performance.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-6">
                    <SuggestionCard icon={BookOpen} title="Suggested Lessons" items={suggestions.suggestedLessons} />
                    <SuggestionCard icon={Video} title="Suggested Videos" items={suggestions.suggestedVideos || []} />
                    <SuggestionCard icon={HelpCircle} title="Suggested Quizzes" items={suggestions.suggestedQuizzes} />
                </CardContent>
                <CardFooter>
                     <Button onClick={handleDownload} variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Download Full Report
                    </Button>
                </CardFooter>
            </Card>
          </div>
        ) : (
            <div className="text-center p-8 text-muted-foreground">Click "Generate New Recommendations" to create your personalized learning plan.</div>
        )}
      </CardContent>
    </Card>
  );
}

interface SuggestionItem { title: string; reason: string; }

const SuggestionCard = ({ icon: Icon, title, items }: { icon: React.ElementType, title: string, items: SuggestionItem[] }) => (
    <Card className="bg-background shadow-md">
        <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center text-primary"><Icon className="mr-2 h-5 w-5" />{title}</CardTitle>
        </CardHeader>
        <CardContent>
             {items.length > 0 ? (
                <ul className="space-y-4 text-sm">
                  {items.map((item, index) => (
                    <li key={`${title}-${index}`} className="p-3 border-l-4 border-accent/50 bg-secondary/30 rounded-r-md">
                       <p className="font-semibold text-foreground">{item.title}</p>
                       <p className="text-muted-foreground mt-1 text-xs italic">"{item.reason}"</p>
                    </li>
                    ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No specific suggestions at this time.</p>}
        </CardContent>
    </Card>
);

const StudyTimetableComponent = ({ timetable }: { timetable: { day: string; slots: StudyTimeSlot[] }[] }) => {
    const timeSlots = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM"];
    const activityColors = {
        'Study Time': 'bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200',
        'Revision': 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200',
        'Free Time': 'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Calendar className="mr-2" /> AI-Generated Weekly Study Timetable</CardTitle>
                <CardDescription>A personalized schedule to help you balance your studies and improve your performance.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="flex justify-center gap-4 mb-4 text-xs">
                    {Object.entries(activityColors).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2">
                           <div className={`w-4 h-4 rounded-sm ${value.split(' ')[0]}`}></div>
                           <span>{key}</span>
                        </div>
                    ))}
                </div>
                <div className="overflow-x-auto">
                    <div className="grid grid-cols-8 min-w-[800px] border rounded-lg">
                        {/* Header Row */}
                        <div className="font-bold text-center p-2 border-r border-b">Time</div>
                        {timetable.map(day => (
                            <div key={day.day} className="font-bold text-center p-2 border-r border-b last:border-r-0">{day.day}</div>
                        ))}

                        {/* Time Slots */}
                        {timeSlots.map(time => (
                           <div key={time} className="contents">
                                <div className="font-semibold text-center p-2 border-r border-b">{time}</div>
                                {timetable.map(day => {
                                    const slot = day.slots.find(s => s.time === time);
                                    return (
                                        <div key={`${day.day}-${time}`} className={cn("p-2 border-r border-b text-center text-xs last:border-r-0", slot ? activityColors[slot.activity] : 'bg-muted/20')}>
                                            {slot ? (
                                                <div>
                                                    <p className="font-bold">{slot.subject}</p>
                                                    <p className="text-muted-foreground">{slot.details || ''}</p>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
