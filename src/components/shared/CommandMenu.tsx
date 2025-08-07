'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, LayoutDashboard, Award, MessageSquare, Lightbulb, BookOpen, Settings, Users, FileText, BarChart3, CalendarDays, Library } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import type { Subject as SubjectInterface, LessonSummary } from '@/interfaces';
import { Input } from '@/components/ui/input';

interface SearchableItem {
  id: string;
  label: string;
  type: 'Page' | 'Subject' | 'Lesson';
  href: string;
  icon: React.ElementType;
}

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [searchableItems, setSearchableItems] = React.useState<SearchableItem[]>([]);
  const { currentUser } = useAuth();
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  React.useEffect(() => {
    const buildSearchableItems = async () => {
      if (!currentUser) {
        setSearchableItems([]);
        return;
      }
      
      const items: SearchableItem[] = [];
      // Add pages based on role
      if (currentUser.role === 'Student') {
        items.push(
          { id: 'dash', label: 'Dashboard', type: 'Page', href: '/student', icon: LayoutDashboard },
          { id: 'subjects', label: 'My Subjects', type: 'Page', href: '/student/subjects', icon: BookOpen },
          { id: 'progress', label: 'My Progress', type: 'Page', href: '/student/progress', icon: BarChart3 },
          { id: 'rewards', label: 'Rewards', type: 'Page', href: '/student/rewards', icon: Award },
          { id: 'suggestions', label: 'AI Suggestions', type: 'Page', href: '/student/recommendations', icon: Lightbulb },
          { id: 'reports', label: 'My Reports', type: 'Page', href: '/student/view-my-report', icon: FileText },
          { id: 'library', label: 'Library', type: 'Page', href: '/student/library', icon: Library },
          { id: 'calendar', label: 'Calendar', type: 'Page', href: '/student/calendar', icon: CalendarDays },
          { id: 'forum', label: 'Forum', type: 'Page', href: '/forum', icon: MessageSquare },
          { id: 'settings', label: 'Settings', type: 'Page', href: '/student/settings', icon: Settings },
        );
      }
      // Add other roles here...

      // Add subjects and lessons for students
      if (currentUser.role === 'Student' && currentUser.student_profile?.enrolled_class) {
        try {
          const classId = currentUser.student_profile.enrolled_class;
          const subjectsResponse = await api.get<{results: SubjectInterface[]}>(`/subjects/?master_class__schoolclass=${classId}`);
          
          for (const subject of subjectsResponse.results || []) {
            items.push({
              id: `subj-${subject.id}`,
              label: `${subject.name} Subject`,
              type: 'Subject',
              href: `/student/learn/class/${classId}/subject/${subject.id}`,
              icon: BookOpen,
            });
            const lessonsResponse = await api.get<{results: LessonSummary[]}>(`/lessons/?subject=${subject.id}`);
            for (const lesson of lessonsResponse.results || []) {
               items.push({
                id: `less-${lesson.id}`,
                label: lesson.title,
                type: 'Lesson',
                href: `/student/learn/class/${classId}/subject/${subject.id}/lesson/${lesson.id}`,
                icon: FileText
               });
            }
          }
        } catch (error) {
            console.error("Failed to fetch subjects/lessons for search:", error);
        }
      }
      setSearchableItems(items);
    };

    buildSearchableItems();
  }, [currentUser]);
  
  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative h-9 w-full sm:w-40 lg:w-64">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
           <Input
              onClick={() => setOpen(true)}
              placeholder="Search platform..."
              className="pl-9 text-sm h-full"
           />
           <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
             <span className="text-xs">⌘</span>K
           </kbd>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Type a command or search..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Pages">
              {searchableItems.filter(i => i.type === 'Page').map(item => (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Subjects">
              {searchableItems.filter(i => i.type === 'Subject').map(item => (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Lessons">
              {searchableItems.filter(i => i.type === 'Lesson').map(item => (
                <CommandItem
                  key={item.id}
                  value={item.label}
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
