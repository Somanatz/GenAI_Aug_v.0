// src/components/layout/ParentSidebarNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, BarChart3, Settings, MessageSquare, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/parent', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/parent/children', label: 'My Children', icon: Users },
  { href: '/parent/progress', label: 'Progress Overview', icon: BarChart3 },
  { href: '/parent/calendar', label: 'School Calendar', icon: CalendarDays },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/parent/settings', label: 'Settings', icon: Settings },
];

export function ParentSidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href} legacyBehavior passHref>
            <SidebarMenuButton
              className={cn(
                "w-full justify-start",
                pathname === item.href ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
              isActive={pathname === item.href}
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
