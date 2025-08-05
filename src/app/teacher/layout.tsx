
// src/app/teacher/layout.tsx
import React from 'react';
import MainAppShell from '@/components/layout/MainAppShell';

export default function TeacherLayout({
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
