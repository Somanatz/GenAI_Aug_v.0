
// src/components/layout/StudentSidebarNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Award, MessageSquare, Lightbulb, BookOpen, UserCircle, Settings, CalendarDays, FileText, Library, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/subjects', label: 'My Subjects', icon: BookOpen },
  { href: '/student/progress', label: 'My Progress', icon: BarChart3 },
  { href: '/student/rewards', label: 'Rewards', icon: Award },
  { href: '/student/recommendations', label: 'Suggestions', icon: Lightbulb },
  { href: '/student/view-my-report', label: 'My Reports', icon: FileText },
  { href: '/student/library', label: 'Library', icon: Library },
  { href: '/student/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/forum', label: 'Forum', icon: MessageSquare },
  { href: '/student/settings', label: 'Settings', icon: Settings },
];

export function StudentSidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href}>
            <SidebarMenuButton
              className={cn(
                "w-full justify-start",
                pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/student' && item.href !== '/forum')
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/student' && item.href !== '/forum')}
              tooltip={{ children: item.label, side: "right", align: "center" }}
            >
              <item.icon className="h-5 w-5 mr-3" />
              <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
