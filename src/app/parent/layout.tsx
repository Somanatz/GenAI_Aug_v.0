
// src/app/parent/layout.tsx
import React from 'react';
import MainAppShell from '@/components/layout/MainAppShell';

export default function ParentLayout({
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
