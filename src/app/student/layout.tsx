
// src/app/student/layout.tsx
import React from 'react';
import MainAppShell from '@/components/layout/MainAppShell';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MainAppShell>
      {children}
    </MainAppShell>
  );
}
