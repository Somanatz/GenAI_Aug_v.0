
// src/components/layout/SchoolAdminSidebarNav.tsx
'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { LayoutDashboard, Users, FileText, BarChart3, BookCopy, MessageSquare, CalendarDays, Users2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';

const getNavItems = (schoolId?: string | null) => {
  if (!schoolId) return [];
  return [
    { href: `/school-admin/${schoolId}`, label: 'Dashboard', icon: LayoutDashboard },
    { href: `/school-admin/${schoolId}/students`, label: 'Students', icon: Users },
    { href: `/school-admin/${schoolId}/teachers`, label: 'Teachers', icon: Users2 },
    { href: `/school-admin/${schoolId}/content`, label: 'Content', icon: BookCopy },
    { href: `/school-admin/${schoolId}/reports`, label: 'Reports', icon: FileText },
    { href: `/school-admin/${schoolId}/analytics`, label: 'Analytics', icon: BarChart3 },
    { href: `/school-admin/${schoolId}/calendar`, label: 'Calendar', icon: CalendarDays },
    { href: `/school-admin/${schoolId}/communication`, label: 'Communication', icon: MessageSquare },
    { href: `/school-admin/${schoolId}/settings`, label: 'Settings', icon: Settings },
  ];
};

export function SchoolAdminSidebarNav() {
  const pathname = usePathname();
  const params = useParams();
  const schoolId = params.schoolId as string | undefined;
  const navItems = getNavItems(schoolId);

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <Link href={item.href}>
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
