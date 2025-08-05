
// src/components/layout/Header.tsx
'use client';

import Link from 'next/link';
import { Search, UserCircle, Menu, X, LogIn, UserPlus, LogOutIcon, School as SchoolIconLucide, LayoutDashboard, Award, MessageSquare, Lightbulb, Moon, Sun } from 'lucide-react'; // Added Moon, Sun
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { User, UserRole } from '@/interfaces';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Logo from '@/components/shared/Logo';
import { useTheme } from '@/context/ThemeContext';


interface NavLink {
  href: string;
  label:string;
  roles?: UserRole[];
  authRequired?: boolean;
  guestOnly?: boolean;
  icon: LucideIcon;
  desktopHoverClasses: string; // e.g., "hover:bg-primary/15 hover:text-primary"
  mobileHoverClasses: string; // e.g., "hover:bg-primary/15 hover:text-primary"
}

const allNavLinks: NavLink[] = [
  {
    href: '/student/rewards',
    label: 'Rewards',
    roles: ['Student'],
    authRequired: true,
    icon: Award,
    desktopHoverClasses: 'hover:bg-primary/15 hover:text-primary',
    mobileHoverClasses: 'hover:bg-primary/15 hover:text-primary',
  },
  {
    href: '/forum',
    label: 'Forum',
    authRequired: true, // Accessible by all authenticated users
    icon: MessageSquare,
    desktopHoverClasses: 'hover:bg-accent/15 hover:text-accent',
    mobileHoverClasses: 'hover:bg-accent/15 hover:text-accent',
  },
  {
    href: '/student/recommendations', // Example, adjust if needed
    label: 'Suggestions',
    roles: ['Student'], // Assuming this is student-specific
    authRequired: true,
    icon: Lightbulb,
    desktopHoverClasses: 'hover:bg-secondary hover:text-secondary-foreground',
    mobileHoverClasses: 'hover:bg-secondary hover:text-secondary-foreground',
  },
  // Add other general authenticated links here if any
];


export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { currentUser, isLoadingAuth, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();


  const isAuthPage = pathname === '/login' ||
                     pathname === '/signup' ||
                     pathname === '/register-school';

  const isProfileCompletionPage = pathname.startsWith('/student/complete-profile') ||
                                 pathname.startsWith('/parent/complete-profile') ||
                                 pathname.startsWith('/teacher/complete-profile');

  const isUnauthenticatedHomepage = pathname === '/' && !currentUser && !isLoadingAuth;
  // Combine conditions to hide main navigation elements
  const shouldHideMainHeaderElements = isAuthPage || isProfileCompletionPage || isUnauthenticatedHomepage;


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    // router.push('/login'); // AuthContext might handle redirect or Header will update
  };

  const getDashboardPath = (user: User | null): string => {
    if (!user) return '/'; // Should not happen if this link is shown only for authenticated users
    switch (user.role) {
      case 'Student':
        return '/student';
      case 'Teacher':
        return '/teacher';
      case 'Parent':
        return '/parent';
      case 'Admin':
        if (user.is_school_admin && user.administered_school?.id) {
          return `/school-admin/${user.administered_school.id}`;
        }
        return '/'; // Platform admin stays on root
      default:
        return '/';
    }
  };

  const dashboardPath = getDashboardPath(currentUser);

  const visibleNavLinks = allNavLinks.filter(link => {
    if (isLoadingAuth) return false; // Don't render any nav links if auth is still loading
    if (currentUser) { // User is logged in
      if (link.guestOnly) return false; // Hide guest-only links
      if (link.authRequired === false) return true; // Show explicitly public links even if logged in
      if (!link.roles && link.authRequired !== false) return true; // Generic authenticated links (authRequired might be undefined or true)
      return link.roles && link.roles.includes(currentUser.role as UserRole);
    } else { // User is a guest
      return !link.authRequired || link.guestOnly;
    }
  });


  // Placeholder for SSR and initial client render before 'mounted' is true
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background py-2">
        <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4">
          {/* Logo Placeholder */}
          <div className="flex items-center gap-2 md:gap-4">
            <div style={{ width: '218px', height: '60px', minHeight: '60px' }} className="bg-muted rounded animate-pulse opacity-70"></div>
            <Skeleton className="h-8 w-8 rounded-md" /> {/* Theme Toggle Skeleton */}
          </div>

          {/* Nav Links Placeholder - always render the space for them to avoid layout shifts */}
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Search Placeholder */}
            <Skeleton className="h-9 w-24 rounded-md" />
            {/* User Icon/Buttons Placeholder */}
            <Skeleton className="h-8 w-8 rounded-full" />
            {/* Mobile Menu Toggle Placeholder */}
            <Skeleton className="h-8 w-8 rounded-full md:hidden" />
          </div>
        </div>
      </header>
    );
  }
  
  const ThemeToggleButton = () => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );

  const DashboardLink = ({ isMobile = false }: { isMobile?: boolean }) => {
    if (!currentUser || shouldHideMainHeaderElements) return null;
    const isActive = pathname === dashboardPath || (dashboardPath !== '/' && pathname.startsWith(dashboardPath) && dashboardPath.split('/').length <= pathname.split('/').length);

    return (
      <Link
        href={dashboardPath}
        className={cn(
          "font-medium transition-all duration-150 ease-in-out flex items-center gap-2",
          isMobile
            ? "block w-full text-left px-4 py-3 text-base rounded-md"
            : "px-4 py-2 text-sm rounded-lg",
          isActive
            ? (isMobile ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary ring-1 ring-primary/20")
            : "text-muted-foreground hover:bg-primary/15 hover:text-primary"
        )}
        onClick={() => isMobile && setIsMobileMenuOpen(false)}
      >
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </Link>
    );
  };

  const NavItems = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {visibleNavLinks.map((link) => {
        const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/' && link.href.length > 1);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "font-medium transition-all duration-150 ease-in-out flex items-center gap-2",
              isMobile
                ? "block w-full text-left px-4 py-3 text-base rounded-md"
                : "px-4 py-2 text-sm rounded-lg",
              isActive
                ? (isMobile ? "bg-primary/10 text-primary" : "bg-primary/10 text-primary ring-1 ring-primary/20")
                : `text-muted-foreground ${isMobile ? link.mobileHoverClasses : link.desktopHoverClasses}`
            )}
            onClick={() => isMobile && setIsMobileMenuOpen(false)}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background py-2">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Logo />
          <ThemeToggleButton />
        </div>

        {!shouldHideMainHeaderElements && (
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {!isLoadingAuth && <DashboardLink />}
            {!isLoadingAuth && <NavItems />}
            {isLoadingAuth && (
              <>
                <Skeleton className="h-8 w-28 rounded-md" /> {/* Dashboard Link Skeleton */}
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
                <Skeleton className="h-8 w-24 rounded-md" />
              </>
            )}
          </nav>
        )}

        {isUnauthenticatedHomepage && !shouldHideMainHeaderElements && (
            <div className="relative hidden sm:block">
              <SchoolIconLucide className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Find a School..." className="pl-10 h-9 w-[150px] lg:w-[250px]" />
            </div>
        )}

        <div className="flex items-center space-x-2 sm:space-x-4">
          {!shouldHideMainHeaderElements && (
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search platform..." className="pl-10 h-9 w-[100px] lg:w-[200px]" />
            </div>
          )}

          {isLoadingAuth ? (
            <Skeleton className="h-8 w-8 rounded-full" />
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                 <Button variant="ghost" size="icon" aria-label="User Profile">
                    <UserCircle className="h-6 w-6 text-accent" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account ({currentUser.username})</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile"><UserCircle className="mr-2 h-4 w-4" />Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOutIcon className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {pathname !== '/register-school' && (
                 <Button variant="outline" size="sm" asChild>
                    <Link href="/register-school"><SchoolIconLucide className="mr-2 h-4 w-4" />Register School</Link>
                 </Button>
              )}
              {pathname !== '/login' && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login"><LogIn className="mr-2 h-4 w-4" />Login</Link>
                </Button>
              )}
              {pathname !== '/signup' && (
                <Button variant="default" size="sm" asChild>
                  <Link href="/signup"><UserPlus className="mr-2 h-4 w-4" />Sign Up</Link>
                </Button>
              )}
            </div>
          )}

          <div className="md:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Toggle Menu">
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0 flex flex-col">
                 <SheetHeader className="p-4 border-b">
                   <div className="flex justify-between items-center">
                     <Logo />
                     {/* Visually hidden title for accessibility - Re-added here */}
                     <SheetTitle className="sr-only">Main Menu</SheetTitle>
                   </div>
                </SheetHeader>

                <nav className="flex flex-col space-y-1 p-4">
                  {!isLoadingAuth && <DashboardLink isMobile={true} />}
                  {!isLoadingAuth && <NavItems isMobile={true} />}
                   {isLoadingAuth && (
                      <>
                        <Skeleton className="h-10 w-full rounded-md mb-1" /> {/* Dashboard Link Skeleton */}
                        <Skeleton className="h-10 w-full rounded-md mb-1" />
                        <Skeleton className="h-10 w-full rounded-md mb-1" />
                        <Skeleton className="h-10 w-full rounded-md" />
                      </>
                  )}
                </nav>

                <div className={cn("mt-auto p-4 border-t space-y-4", (isLoadingAuth || shouldHideMainHeaderElements) && "pt-4")}>
                  {!shouldHideMainHeaderElements && (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="search" placeholder="Search platform..." className="pl-10 h-9 w-full" />
                    </div>
                  )}
                  {isUnauthenticatedHomepage && !shouldHideMainHeaderElements && (
                     <div className="relative">
                        <SchoolIconLucide className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Find a School..." className="pl-10 h-9 w-full" />
                    </div>
                  )}

                  {isLoadingAuth ? (
                    <Skeleton className="h-10 w-full rounded-md" />
                  ) : currentUser ? (
                    <>
                      <Button variant="outline" size="sm" className="w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
                        <Link href="/profile"> <UserCircle className="mr-2 h-5 w-5 text-accent" /> Profile</Link>
                      </Button>
                      <Button variant="destructive" size="sm" className="w-full" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                        <LogOutIcon className="mr-2 h-5 w-5" /> Logout
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-2">
                     {pathname !== '/register-school' && (
                        <Button variant="outline" size="sm" className="w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
                           <Link href="/register-school"><SchoolIconLucide className="mr-2 h-4 w-4" />Register School</Link>
                        </Button>
                      )}
                      {pathname !== '/login' && (
                        <Button variant="outline" size="sm" className="w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
                          <Link href="/login"><LogIn className="mr-2 h-4 w-4" />Login</Link>
                        </Button>
                      )}
                      {pathname !== '/signup' && (
                        <Button variant="default" size="sm" className="w-full" asChild onClick={() => setIsMobileMenuOpen(false)}>
                          <Link href="/signup"><UserPlus className="mr-2 h-4 w-4" />Sign Up</Link>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
