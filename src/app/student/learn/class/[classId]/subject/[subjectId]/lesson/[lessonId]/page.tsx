// src/app/student/learn/class/[classId]/subject/[subjectId]/lesson/[lessonId]/page.tsx
'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { api } from '@/lib/api';
import type { Lesson as LessonInterface, LessonSummary, AILessonQuizAttempt as AILessonQuizAttemptInterface, UserLessonProgress, UserNote, TranslatedLessonContent, AILessonSummary } from '@/interfaces';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, PlayCircle, Lightbulb, CheckCircle2, AlertTriangle, Send, Loader2, BookOpen, Maximize2, Minimize2, Bookmark, HelpCircle, Download, FilePenLine, Languages, VideoIcon, MicIcon } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import Link from 'next/link';
import { generateLessonQuiz } from '@/ai/flows/lesson-quiz-flow';
import type { QuizQuestion } from '@/ai/flows/lesson-quiz-types';
import { summarizeLesson } from '@/ai/flows/summarize-lesson-flow';
import { translateContent } from '@/ai/flows/translate-content-flow';
import Image from 'next/image';
import { cn } from '@/lib/utils';


// --- Google Drive Link Helpers ---
const getGoogleDriveImageSrc = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  }
  return url;
};

const getGoogleDriveVideoEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return null; 
};

const getGoogleDriveAudioEmbedUrl = (url: string): string | null => {
  if (!url) return null;
  const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  }
  return url;
};


// --- JSON Content Types ---
interface ContentItem {
  type: 'video' | 'audio-with-image' | 'json';
  content: any; // URL for media, or the parsed JSON object
}

// --- New Robust JSON Renderer ---
const JsonContentRenderer = ({ jsonData }: { jsonData: any }) => {
  
  const renderFormattedText = (formattedText: any[], keyPrefix: string) => {
    if (!Array.isArray(formattedText)) return null;
    return (
      <>
        {formattedText.map((item, index) => {
          const styleClass = item.style === 'bold' ? 'font-bold' : item.style === 'italic' ? 'italic' : 'font-normal';
          return <span key={`${keyPrefix}-${index}`} className={styleClass}>{item.text}</span>;
        })}
      </>
    );
  };
  
  const renderSection = (sectionData: any, key: string) => {
    if (!sectionData) return null;
    
    const highlightColorMap: { [key: string]: string } = {
        blue: 'text-blue-600 dark:text-blue-400', yellow: 'text-yellow-800 dark:text-yellow-300',
        green: 'text-green-800 dark:text-green-300', red: 'text-red-700 dark:text-red-300'
    };
    const activityBgColorMap: { [key: string]: string } = {
        yellow: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400',
        green: 'bg-green-100 dark:bg-green-900/30 border-green-400'
    };

    return (
      <div key={key} className="mb-6">
        {sectionData.heading && <h3 className={cn("text-2xl font-bold my-4", highlightColorMap[sectionData.heading.highlight_color] || 'text-primary')}>{sectionData.heading.text}</h3>}
        {sectionData.main_paragraph && <p className="text-base md:text-lg leading-relaxed">{renderFormattedText(sectionData.main_paragraph.formatted_text, `${key}-main`)}</p>}
        {sectionData.detailed_paragraphs && sectionData.detailed_paragraphs.map((p: any, i: number) => (
          <p key={`${key}-detail-p-${i}`} className="mt-4 text-base md:text-lg leading-relaxed">{renderFormattedText(p.formatted_text, `${key}-detail-p-${i}`)}</p>
        ))}
        {sectionData.activity && (
          <div className={cn("p-4 border-l-4 my-4 rounded-r-lg", activityBgColorMap[sectionData.activity.heading.highlight_color] || 'bg-muted')}>
            <h4 className={cn("font-semibold text-lg", highlightColorMap[sectionData.activity.heading.highlight_color])}>{sectionData.activity.heading.text}</h4>
            <p className="italic mt-1">{sectionData.activity.question.text}</p>
          </div>
        )}
        {sectionData.sensory_details && (
           <div className={cn("p-4 border-l-4 my-4 rounded-r-lg", activityBgColorMap[sectionData.sensory_details.heading.highlight_color] || 'bg-muted')}>
             <h4 className={cn("font-semibold text-lg", highlightColorMap[sectionData.sensory_details.heading.highlight_color])}>{sectionData.sensory_details.heading.text}</h4>
             <ul className="list-disc pl-5 mt-2 space-y-1">
                {sectionData.sensory_details.details.map((d: any, i: number) => (
                  <li key={`${key}-sensory-${i}`}><span className="font-bold">{d.sense}:</span> {d.description}</li>
                ))}
             </ul>
           </div>
        )}
      </div>
    );
  };
  
  const { lesson_meta, lesson_overview, vocabulary_section, story_content, educational_components, image_placement } = jsonData;
  const storyDays = Object.keys(story_content || {}).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));

  return (
    <div className="prose-lg max-w-none dark:prose-invert">
      {lesson_meta && (
        <header className="mb-8 p-6 bg-muted/50 rounded-lg shadow-sm">
          <h1 className="text-4xl font-extrabold text-primary !mb-2">{lesson_meta.title}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-2">
            <span><strong>Subject:</strong> {lesson_meta.subject}</span>
            <span><strong>Grade:</strong> {lesson_meta.grade_level}</span>
            <span><strong>Duration:</strong> {lesson_meta.duration}</span>
          </div>
          <h2 className="text-xl font-semibold mt-6 !mb-2">Learning Objectives:</h2>
          <ul className="list-disc pl-5 space-y-1 text-base">
            {lesson_meta.learning_objectives.map((obj: string, i: number) => <li key={`obj-${i}`}>{obj}</li>)}
          </ul>
        </header>
      )}

      {lesson_overview && <p className="lead text-xl italic my-6 text-foreground/90">{lesson_overview.content}</p>}

      {vocabulary_section && (
        <section className="my-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow">
          <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-300 !mt-0 !mb-4">{vocabulary_section.heading.text}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-base">
            {vocabulary_section.words.map((word: any, i: number) => (
              <div key={`vocab-${i}`}><strong className="font-bold">{word.term}:</strong> {word.definition}</div>
            ))}
          </div>
        </section>
      )}

      {story_content && storyDays.map(dayKey => {
          const dayContent = story_content[dayKey];
          const imageAfterThisDay = image_placement && image_placement.placement === `center_after_${dayKey}`;
          return (
              <React.Fragment key={dayKey}>
                  {renderSection(dayContent, dayKey)}
                  {imageAfterThisDay && image_placement.url && (
                       <figure className="my-8 text-center">
                          <Image src={getGoogleDriveImageSrc(image_placement.url)!} alt={image_placement.caption.text} width={800} height={450} className="rounded-lg shadow-lg mx-auto" data-ai-hint="lesson content illustration"/>
                          <figcaption className="mt-2 text-sm italic text-muted-foreground">{image_placement.caption.text}</figcaption>
                       </figure>
                  )}
              </React.Fragment>
          );
      })}

      {educational_components && educational_components.comprehension_questions && (
         <section className="my-8 p-6 bg-red-50 dark:bg-red-900/20 rounded-lg shadow">
            <h2 className="text-2xl font-bold text-red-700 dark:text-red-300 !mt-0 !mb-4">{educational_components.comprehension_questions.heading.text}</h2>
            <ul className="list-decimal pl-5 space-y-3 text-base">
              {educational_components.comprehension_questions.questions.map((q: any) => (
                  <li key={q.number}>
                      <p className="font-semibold">{q.question_text}</p>
                  </li>
              ))}
            </ul>
         </section>
      )}

    </div>
  );
};

const PASSING_SCORE = 75;

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'te', name: 'Telugu' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ta', name: 'Tamil' },
];

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);

  const lessonId = params.lessonId as string;
  const subjectId = params.subjectId as string;
  const classId = params.classId as string;

  const [lesson, setLesson] = useState<LessonInterface | null>(null);
  const [subjectLessons, setSubjectLessons] = useState<LessonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [isCompleted, setIsCompleted] = useState(false);
  
  // --- Unified Content Pagination State ---
  const [contentPages, setContentPages] = useState<ContentItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  
  // AI Quiz State
  const [isQuizDialogOpen, setIsQuizDialogOpen] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [cooldownMessage, setCooldownMessage] = useState<string | null>(null);
  const [hasPassedQuiz, setHasPassedQuiz] = useState(false);

  // Notes, Summary, Translation State
  const [userNote, setUserNote] = useState<UserNote | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [aiSummary, setAiSummary] = useState<AILessonSummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<TranslatedLessonContent | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<string>('te');

  // Study Ping Logic
  useEffect(() => {
    const PING_INTERVAL = 60000; // 1 minute
    const DURATION_PER_PING = 1; // 1 minute
    let intervalId: NodeJS.Timeout;

    if (currentUser?.role === 'Student' && subjectId) {
      const recordStudyPing = () => {
        api.post('/record-study-ping/', {
          subject_id: subjectId,
          duration: DURATION_PER_PING,
        }).catch(err => console.error("Failed to record study ping:", err));
      };
      // Start pinging immediately and then on interval
      recordStudyPing(); 
      intervalId = setInterval(recordStudyPing, PING_INTERVAL);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentUser, subjectId]);


  const buildContentPages = (lessonData: LessonInterface) => {
    const pages: ContentItem[] = [];

    // 1. Add Video
    if (lessonData.video_url) {
      pages.push({ type: 'video', content: lessonData.video_url });
    }

    // 2. Add Audio and Main Image together
    if (lessonData.audio_url || lessonData.image_url) {
      pages.push({
        type: 'audio-with-image',
        content: {
          audio: lessonData.audio_url,
          image: lessonData.image_url,
        },
      });
    }

    // 3. Add the entire structured JSON content as a single, final page
    if (lessonData.content) {
      pages.push({ type: 'json', content: lessonData.content });
    }

    setContentPages(pages);
    setCurrentPage(0);
  };

  const fetchLessonData = useCallback(async () => {
    if (!lessonId || !subjectId || !currentUser) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const lessonData = await api.get<LessonInterface>(`/lessons/${lessonId}/`);
      setLesson(lessonData);
      buildContentPages(lessonData);
      
      if (lessonData.ai_summary) setAiSummary(lessonData.ai_summary);
      if (lessonData.translations && lessonData.translations.length > 0) {
        const preferredTranslation = lessonData.translations.find(t => t.language_code === targetLanguage) || lessonData.translations[0];
        setTranslatedContent(preferredTranslation);
      }

      const [allLessonsData, progressData, quizAttemptsData, userNoteData] = await Promise.all([
        api.get<LessonSummary[] | {results: LessonSummary[]}>(`/lessons/?subject=${subjectId}`),
        api.get<UserLessonProgress[] | {results: UserLessonProgress[]}>(`/userprogress/?user=${currentUser.id}&lesson=${lessonId}`),
        api.get<AILessonQuizAttemptInterface[]>(`/ai-quiz-attempts/?user=${currentUser.id}&lesson=${lessonId}&passed=true`),
        api.get<UserNote[]>(`/usernotes/?user=${currentUser.id}&lesson=${lessonId}`),
      ]);

      const lessonsList = Array.isArray(allLessonsData) ? allLessonsData : allLessonsData.results || [];
      setSubjectLessons(lessonsList.sort((a,b) => (a.lesson_order || 0) - (b.lesson_order || 0)));

      const currentProgress = Array.isArray(progressData) ? progressData[0] : (progressData.results || [])[0];
      if (currentProgress) setIsCompleted(currentProgress.completed); else setIsCompleted(false);
      
      const passedAttempts = Array.isArray(quizAttemptsData) ? quizAttemptsData : (quizAttemptsData as any).results || [];
      setHasPassedQuiz(passedAttempts.length > 0);
      
      const note = Array.isArray(userNoteData) ? userNoteData[0] : (userNoteData as any).results[0];
      setUserNote(note || null);

    } catch (err) {
      console.error("Failed to fetch lesson data:", err);
      setError(err instanceof Error ? err.message : "Failed to load lesson data.");
    } finally {
      setIsLoading(false);
    }
  }, [lessonId, subjectId, currentUser, targetLanguage]);


  useEffect(() => {
    fetchLessonData();
  }, [fetchLessonData]);
  
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
       if (event.key === 'Escape' && isFullScreen) {
         setIsFullScreen(false);
       }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullScreen]);

  const toggleFullScreen = () => setIsFullScreen(!isFullScreen);

  const currentLessonIndex = useMemo(() => subjectLessons.findIndex(l => String(l.id) === lessonId), [subjectLessons, lessonId]);
  const previousLesson = useMemo(() => currentLessonIndex > 0 ? subjectLessons[currentLessonIndex - 1] : null, [subjectLessons, currentLessonIndex]);
  const nextLesson = useMemo(() => currentLessonIndex > -1 && currentLessonIndex < subjectLessons.length - 1 ? subjectLessons[currentLessonIndex + 1] : null, [subjectLessons, currentLessonIndex]);
  
  const handleStartQuiz = async () => {
    if (!lesson?.content || hasPassedQuiz) return;
    setIsQuizDialogOpen(true);
    setIsLoadingQuiz(true);
    setQuizError(null);
    setQuizResult(null);
    setUserAnswers({});
    setCooldownMessage(null);
    
    try {
        const previousAttempts = await api.get<AILessonQuizAttemptInterface[]>(`/ai-quiz-attempts/?user=${currentUser?.id}&lesson=${lessonId}&ordering=-attempted_at`);
        const latestAttempt = Array.isArray(previousAttempts) ? previousAttempts[0] : (previousAttempts as any).results[0];
        if (latestAttempt && latestAttempt.can_reattempt_at) {
            const now = new Date();
            const reattemptTime = new Date(latestAttempt.can_reattempt_at);
            if (now < reattemptTime) {
                setCooldownMessage(`You must wait until ${reattemptTime.toLocaleString()} to try again.`);
                setIsLoadingQuiz(false);
                return;
            }
        }
    } catch (err) { /* Ignore if no attempts found */ }

    try {
      const quizData = await generateLessonQuiz({ lessonContent: lesson.content });
      setQuizQuestions(quizData.questions || []);
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : "Failed to generate quiz questions.");
    } finally {
      setIsLoadingQuiz(false);
    }
  };
  
  const handleQuizAnswerChange = (questionIndex: number, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmitQuiz = async () => {
    if (!currentUser) return;
    setIsSubmittingQuiz(true);
    setQuizError(null);
    
    let correctAnswers = 0;
    quizQuestions.forEach((q, index) => {
      const userAnswer = userAnswers[index];
      if (q.question_type === 'true_false' || q.question_type === 'multiple_choice') {
        if (userAnswer === q.correct_answer) correctAnswers++;
      } else if (q.question_type === 'fill_in_the_blank') {
        if (userAnswer?.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()) correctAnswers++;
      }
    });

    const score = (correctAnswers / quizQuestions.length) * 100;
    const passed = score >= PASSING_SCORE;
    setQuizResult({ score, passed });

    const quizDataPayload = { questions: quizQuestions.map((q, i) => ({ ...q, user_answer: userAnswers[i] || "" })) };
    
    try {
        await api.post('/ai-quiz-attempts/', { lesson: lessonId, score: score, passed: passed, quiz_data: quizDataPayload });
        if (passed) {
            setHasPassedQuiz(true);
            if (nextLesson) {
                setSubjectLessons(prevLessons => prevLessons.map(l => l.id === nextLesson.id ? { ...l, is_locked: false } : l));
            }
        }
    } catch (err: any) {
        toast({ title: "Error Saving Quiz Result", description: err.message, variant: "destructive" });
    } finally {
        setIsSubmittingQuiz(false);
    }
  };

  const handleMarkAsComplete = async () => {
      if (!currentUser || isCompleted) return Promise.resolve();
      try {
        await api.post(`/userprogress/`, { lesson_id: lessonId, completed: true });
        toast({ title: "Lesson Complete!", description: "Great work! Your progress has been saved." });
        setIsCompleted(true);
      } catch (err: any) {
        toast({ title: "Error Saving Progress", description: err.message || "Could not mark lesson as complete.", variant: "destructive" });
      }
  };

  const handleSaveNote = async () => {
    if (!currentUser || !lesson) return;
    setIsSavingNote(true);
    const payload = { lesson: lesson.id, notes: userNote?.notes || "" };
    try {
        let updatedNote: UserNote;
        if(userNote?.id) {
            updatedNote = await api.patch(`/usernotes/${userNote.id}/`, payload);
        } else {
            updatedNote = await api.post(`/usernotes/`, payload);
        }
        setUserNote(updatedNote);
        toast({ title: "Note Saved!", description: "Your personal notes have been saved." });
    } catch(err: any) {
        toast({ title: "Error Saving Note", description: err.message, variant: "destructive" });
    } finally {
        setIsSavingNote(false);
    }
  }
  
  const handleGenerateSummary = async () => {
    if(!lesson?.content) return;
    setIsSummarizing(true);
    try {
        const result = await summarizeLesson({ lessonContent: lesson.content });
        const savedSummary = await api.post<AILessonSummary>('/ai-summaries/', {
          lesson: lessonId,
          summary: result.summary,
        });
        setAiSummary(savedSummary);
    } catch(err:any) {
        toast({title: "Error Generating Summary", description: err.message, variant: "destructive"});
    } finally {
        setIsSummarizing(false);
    }
  }
  
  const handleTranslate = async () => {
    if(!lesson?.content) return;
    
    const existingTranslation = lesson.translations?.find(t => t.language_code === targetLanguage);
    if (existingTranslation) {
        setTranslatedContent(existingTranslation);
        toast({ title: "Translation Loaded", description: `Loaded existing translation for ${targetLanguage}.`});
        return;
    }

    setIsTranslating(true);
    try {
        const result = await translateContent({ content: lesson.content, targetLanguage });
        const savedTranslation = await api.post<TranslatedLessonContent>('/translated-content/', {
          lesson: lessonId,
          language_code: targetLanguage,
          translated_title: `${lesson.title} (${targetLanguage})`,
          translated_content: result.translatedContent,
        });
        setTranslatedContent(savedTranslation);
    } catch(err:any) {
        toast({title: "Error Translating", description: err.message, variant: "destructive"});
    } finally {
        setIsTranslating(false);
    }
  }
  
  if (isLoading) return <div className="space-y-6 p-4"><Skeleton className="h-10 w-1/4" /><Skeleton className="h-16 w-3/4" /><Skeleton className="h-64 w-full" /><Skeleton className="h-48 w-full" /></div>;
  if (error) return <Card className="text-center py-10 bg-destructive/10 border-destructive"><CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>Error Loading Lesson</CardTitle></CardHeader><CardContent><CardDescription className="text-destructive-foreground">{error}</CardDescription><Button variant="outline" onClick={() => router.back()} className="mt-4"><ChevronLeft className="mr-2 h-4 w-4"/> Go Back</Button></CardContent></Card>;
  if (!lesson) return <p>Lesson not found.</p>;

  const renderCurrentPage = () => {
    const currentPageContent = contentPages[currentPage];
    if (!currentPageContent) return <div className="text-center p-8 text-muted-foreground">End of lesson content.</div>;
    
    const { type, content } = currentPageContent;
    switch(type) {
        case 'video':
            const videoEmbedSrc = getGoogleDriveVideoEmbedUrl(content);
            return (
              <Card className="shadow-md">
                <CardHeader><CardTitle className="flex items-center"><VideoIcon className="mr-2 text-primary"/>Video Content</CardTitle></CardHeader>
                <CardContent>
                  <div className="w-full rounded-md shadow-lg aspect-video bg-black overflow-hidden">
                    {videoEmbedSrc ? 
                        <iframe src={videoEmbedSrc} width="100%" height="100%" allow="autoplay" title="Lesson Video" sandbox="allow-scripts allow-same-origin allow-presentation"></iframe> :
                        <video src={content} controls className="w-full h-full"></video>
                    }
                  </div>
                </CardContent>
              </Card>
            );
        case 'audio-with-image':
            const audioSrc = content.audio ? getGoogleDriveAudioEmbedUrl(content.audio) : null;
            return (
              <Card className="shadow-md">
                <CardHeader><CardTitle className="flex items-center"><MicIcon className="mr-2 text-primary"/>Audio & Image</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {audioSrc && <audio src={audioSrc} controls className="w-full"></audio>}
                  {content.image && getGoogleDriveImageSrc(content.image) && (
                      <div className="relative w-full aspect-[16/9] my-4 rounded-lg overflow-hidden shadow-lg">
                        <Image src={getGoogleDriveImageSrc(content.image)!} alt="Lesson image" layout="fill" objectFit="cover" className="bg-muted" />
                      </div>
                  )}
                </CardContent>
              </Card>
            );
        case 'json':
            try {
                const jsonData = JSON.parse(content);
                return <JsonContentRenderer jsonData={jsonData} />;
            } catch (e) {
                // If parsing fails, render as plain text to avoid crashing.
                return <div className="prose prose-lg max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: content || '' }} />;
            }
        default: return <p>Unsupported content type.</p>;
    }
  };
  
  const lessonContentSection = (
      <div id="lesson-content-area" ref={contentRef} className="space-y-8 max-w-4xl mx-auto">
          <div className="rounded-md bg-muted/30 min-h-[400px]">
            {renderCurrentPage()}
          </div>
          <div className="flex justify-between items-center mt-8">
              <Button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}><ChevronLeft className="mr-2 h-4 w-4"/> Previous</Button>
              <span className="text-sm text-muted-foreground">Page {currentPage + 1} of {contentPages.length}</span>
              <Button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= contentPages.length - 1}>Next <ChevronRight className="ml-2 h-4 w-4"/></Button>
          </div>
      </div>
  );
  
  const aiToolsSection = (
      <div className="max-w-4xl mx-auto space-y-4">
        <Tabs defaultValue="notes" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="notes"><FilePenLine className="mr-2 h-4 w-4"/>My Notes</TabsTrigger>
                <TabsTrigger value="summary"><Lightbulb className="mr-2 h-4 w-4"/>AI Summary</TabsTrigger>
                <TabsTrigger value="translate"><Languages className="mr-2 h-4 w-4"/>Translate</TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="mt-4">
                <div className="space-y-2">
                    <Textarea placeholder="Write your personal notes for this lesson here..." className="min-h-[250px] text-base" value={userNote?.notes || ''} onChange={(e) => setUserNote(prev => ({...(prev || {lesson: parseInt(lessonId), user: currentUser?.id}), notes: e.target.value}))} />
                    <Button onClick={handleSaveNote} disabled={isSavingNote}>{isSavingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save Notes</Button>
                </div>
            </TabsContent>
            <TabsContent value="summary" className="mt-4">
                <div className="space-y-4">
                    {!aiSummary && (<Button onClick={handleGenerateSummary} disabled={isSummarizing}>{isSummarizing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Generate AI Summary</Button>)}
                    {aiSummary && <div className="p-4 border rounded-md bg-background prose dark:prose-invert max-w-none"><div dangerouslySetInnerHTML={{__html: aiSummary.summary}}/></div>}
                </div>
            </TabsContent>
            <TabsContent value="translate" className="mt-4">
                <div className="space-y-4">
                    <div className="flex gap-2 items-center">
                        <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Language"/></SelectTrigger>
                            <SelectContent>{SUPPORTED_LANGUAGES.map(lang => <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button onClick={handleTranslate} disabled={isTranslating}>{isTranslating && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Translate Lesson</Button>
                    </div>
                     {translatedContent && (() => {
                      try {
                        const jsonData = JSON.parse(translatedContent.translated_content);
                        return <JsonContentRenderer jsonData={jsonData} />;
                      } catch (e) {
                        return (
                           <div className="p-4 border rounded-md bg-background prose dark:prose-invert max-w-none">
                              <pre className="whitespace-pre-wrap">{translatedContent.translated_content}</pre>
                           </div>
                        );
                      }
                    })()}
                </div>
            </TabsContent>
        </Tabs>
      </div>
  );

  return (
    <>
      <div className={cn("space-y-8", isFullScreen && "fixed inset-0 z-50 bg-background p-0 m-0 overflow-y-auto")}>
        {!isFullScreen && (
            <div className="flex justify-between items-center">
                <Button variant="outline" asChild><Link href={`/student/learn/class/${classId}/subject/${subjectId}`}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Subject</Link></Button>
            </div>
        )}
        <Card className={cn("shadow-xl rounded-xl overflow-hidden", isFullScreen && "w-full h-full border-none rounded-none shadow-none flex flex-col")}>
          <CardHeader className={cn("bg-primary text-primary-foreground p-6 md:p-8", isFullScreen && "rounded-none")}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                      <CardTitle className="text-2xl md:text-3xl font-bold flex items-center"><PlayCircle className="mr-3 h-7 w-7 md:h-8 md:w-8" /> {lesson.title}</CardTitle>
                      <CardDescription className="text-primary-foreground/80 mt-1">Subject: {lesson.subject_name || 'N/A'}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 self-start sm:self-center">
                      <Button variant="secondary" size="icon" onClick={toggleFullScreen}>{isFullScreen ? <Minimize2 className="h-5 w-5"/> : <Maximize2 className="h-5 w-5"/>}</Button>
                  </div>
              </div>
          </CardHeader>
          <CardContent className={cn("p-6 md:p-8 space-y-12", isFullScreen && "flex-grow overflow-y-auto")}>
              {lessonContentSection}
              {!isFullScreen && aiToolsSection}
          </CardContent>
          {!isFullScreen && (
              <CardFooter className="p-6 md:p-8 flex justify-between items-center border-t bg-muted/50">
                  <Button variant="outline" disabled={!previousLesson} onClick={() => { if (previousLesson) { router.push(`/student/learn/class/${classId}/subject/${subjectId}/lesson/${previousLesson.id}`); } }}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Previous Lesson
                  </Button>
                  
                  {currentPage === contentPages.length - 1 && (
                    isCompleted ? <Button variant="secondary" disabled className="text-green-600 dark:text-green-400"><CheckCircle2 className="mr-2 h-4 w-4"/> Completed</Button> :
                    (nextLesson && !hasPassedQuiz && lesson.requires_previous_quiz) ? <Button onClick={handleStartQuiz} size="lg" className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white"><HelpCircle className="mr-2 h-4 w-4" /> Take Quiz to Unlock Next</Button> :
                    <Button onClick={handleMarkAsComplete} size="lg" className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white"><CheckCircle2 className="mr-2 h-4 w-4" />Mark as Complete</Button>
                  )}

                  <Button variant="default" disabled={!nextLesson || nextLesson.is_locked} onClick={() => { if (nextLesson && !nextLesson.is_locked) { router.push(`/student/learn/class/${classId}/subject/${subjectId}/lesson/${nextLesson.id}`); } }}>
                      Next Lesson <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
              </CardFooter>
          )}
        </Card>
      </div>

      <Dialog open={isQuizDialogOpen} onOpenChange={setIsQuizDialogOpen}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle className="text-2xl">Quiz for: {lesson.title}</DialogTitle><DialogDescription>You must score at least {PASSING_SCORE}% to unlock the next lesson.</DialogDescription></DialogHeader><div className="py-4 max-h-[60vh] overflow-y-auto">{isLoadingQuiz && <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}{quizError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{quizError}</AlertDescription></Alert>}{cooldownMessage && <Alert variant="destructive"><AlertTitle>Attempt Cooldown</AlertTitle><AlertDescription>{cooldownMessage}</AlertDescription></Alert>}{!isLoadingQuiz && !quizError && !cooldownMessage && !quizResult && quizQuestions.length > 0 && (<div className="space-y-6">{quizQuestions.map((q, qIndex) => (<fieldset key={qIndex} className="p-4 border rounded-lg bg-background shadow-sm"><legend className="font-semibold mb-3 text-md">Question {qIndex + 1}: {q.question_text}</legend>{q.question_type === 'multiple_choice' && (<RadioGroup onValueChange={(value) => handleQuizAnswerChange(qIndex, value)} value={userAnswers[qIndex] || ''} className="space-y-2">{q.options?.map((option, oIndex) => (<div key={oIndex} className="flex items-center space-x-3 space-y-0 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"><RadioGroupItem value={option} id={`q${qIndex}-o${oIndex}`} /><Label htmlFor={`q${qIndex}-o${oIndex}`} className="font-normal cursor-pointer flex-1 text-sm">{option}</Label></div>))}</RadioGroup>)}{q.question_type === 'true_false' && (<RadioGroup onValueChange={(value) => handleQuizAnswerChange(qIndex, value)} value={userAnswers[qIndex] || ''} className="space-y-2"><div className="flex items-center space-x-3"><RadioGroupItem value="True" id={`q${qIndex}-true`} /><Label htmlFor={`q${qIndex}-true`} className="font-normal">True</Label></div><div className="flex items-center space-x-3"><RadioGroupItem value="False" id={`q${qIndex}-false`} /><Label htmlFor={`q${qIndex}-false`} className="font-normal">False</Label></div></RadioGroup>)}{q.question_type === 'fill_in_the_blank' && (<Input placeholder="Type your answer here..." value={userAnswers[qIndex] || ''} onChange={(e) => handleQuizAnswerChange(qIndex, e.target.value)} />)}</fieldset>))}</div>)}{quizResult && (<Alert variant={quizResult.passed ? "default" : "destructive"} className="mt-4 rounded-lg shadow-md"><AlertTitle className="font-bold text-lg">{quizResult.passed ? `Passed! Score: ${quizResult.score.toFixed(0)}%` : `Failed. Score: ${quizResult.score.toFixed(0)}%`}</AlertTitle><AlertDescription>{quizResult.passed ? "Congratulations! You have unlocked the next lesson." : "Please review the material and try again later. There is a 2-hour cooldown before your next attempt."}</AlertDescription></Alert>)}</div><DialogFooter><Button variant="outline" onClick={() => setIsQuizDialogOpen(false)}>Close</Button>{!quizResult && !cooldownMessage && (<Button onClick={handleSubmitQuiz} disabled={isSubmittingQuiz || Object.keys(userAnswers).length < quizQuestions.length}>{isSubmittingQuiz ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Submit Quiz</Button>)}</DialogFooter></DialogContent></Dialog>
    </>
  );
}
