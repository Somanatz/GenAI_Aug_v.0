
// src/app/teacher/learn/class/[classId]/subject/[subjectId]/lesson/[lessonId]/page.tsx
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Lesson as LessonInterface, LessonSummary } from '@/interfaces';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, PlayCircle, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';

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
  
  if (typeof jsonData !== 'object' || jsonData === null) {
     return <div className="prose prose-lg max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: String(jsonData) || '' }} />;
  }

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

export default function TeacherLessonPage() {
  const params = useParams();
  const router = useRouter();

  const lessonId = params.lessonId as string;
  const subjectId = params.subjectId as string;
  const classId = params.classId as string;

  const [lesson, setLesson] = useState<LessonInterface | null>(null);
  const [subjectLessons, setSubjectLessons] = useState<LessonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  useEffect(() => {
    const fetchLessonData = async () => {
      if (!lessonId || !subjectId) return;
      
      setIsLoading(true);
      setError(null);

      try {
        const [lessonData, allLessonsData] = await Promise.all([
          api.get<LessonInterface>(`/lessons/${lessonId}/`),
          api.get<{results: LessonSummary[]}>(`/lessons/?subject=${subjectId}`),
        ]);
        
        setLesson(lessonData);
        setSubjectLessons((allLessonsData.results || []).sort((a,b) => (a.lesson_order || 0) - (b.lesson_order || 0)));

      } catch (err) {
        console.error("Failed to fetch lesson data:", err);
        setError(err instanceof Error ? err.message : "Failed to load lesson data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLessonData();
  }, [lessonId, subjectId]);
  
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
  
  if (isLoading) return <div className="space-y-6 p-4"><Skeleton className="h-10 w-1/4" /><Skeleton className="h-16 w-3/4" /><Skeleton className="h-64 w-full" /></div>;
  if (error) return <Card className="text-center py-10 bg-destructive/10 border-destructive"><CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>Error Loading Lesson</CardTitle></CardHeader><CardContent><CardDescription className="text-destructive-foreground">{error}</CardDescription><Button variant="outline" onClick={() => router.back()} className="mt-4"><ChevronLeft className="mr-2 h-4 w-4"/> Go Back</Button></CardContent></Card>;
  if (!lesson) return <p>Lesson not found.</p>;
  
  const videoEmbedUrl = lesson.video_url ? getGoogleDriveVideoEmbedUrl(lesson.video_url) : null;
  let lessonJsonContent;
  try {
      lessonJsonContent = JSON.parse(lesson.content);
  } catch(e) {
      lessonJsonContent = lesson.content;
  }

  return (
    <>
      <div className={cn("space-y-8", isFullScreen && "fixed inset-0 z-50 bg-background p-0 m-0 overflow-y-auto")}>
        {!isFullScreen && (
            <div className="flex justify-between items-center">
                <Button variant="outline" asChild><Link href={`/teacher/learn/class/${classId}/subject/${subjectId}`}><ChevronLeft className="mr-2 h-4 w-4" /> Back to Subject</Link></Button>
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
          <CardContent className={cn("p-4 md:p-6 lg:p-8 space-y-8", isFullScreen && "flex-grow overflow-y-auto")}>
            <div className="max-w-4xl mx-auto">
              {videoEmbedUrl ? (
                <div className="w-full rounded-md shadow-lg aspect-video bg-black overflow-hidden">
                  <iframe src={videoEmbedUrl} width="100%" height="100%" allow="autoplay" title="Lesson Video" sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>
                </div>
              ) : lesson.video_url && 
                <div className="w-full rounded-md shadow-lg aspect-video bg-black overflow-hidden">
                    <video src={lesson.video_url} controls className="w-full h-full"></video>
                </div>
              }
              
              {lesson.image_url && (
                <div className="relative w-full aspect-[16/9] my-4 rounded-lg overflow-hidden shadow-lg">
                  <Image src={getGoogleDriveImageSrc(lesson.image_url)!} alt="Lesson image" layout="fill" objectFit="cover" className="bg-muted" />
                </div>
              )}
            </div>

              <JsonContentRenderer jsonData={lessonJsonContent} />
          </CardContent>
          <CardFooter className={cn("p-6 md:p-8 flex justify-between items-center border-t bg-muted/50", isFullScreen && "rounded-none")}>
              <Button variant="outline" disabled={!previousLesson} onClick={() => { if (previousLesson) { router.push(`/teacher/learn/class/${classId}/subject/${subjectId}/lesson/${previousLesson.id}`); } }}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Previous Lesson
              </Button>
              <Button variant="default" disabled={!nextLesson} onClick={() => { if (nextLesson) { router.push(`/teacher/learn/class/${classId}/subject/${subjectId}/lesson/${nextLesson.id}`); } }}>
                  Next Lesson <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
