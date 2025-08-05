
// src/app/school-admin/layout.tsx
import React from 'react';
import MainAppShell from '@/components/layout/MainAppShell';

export default function SchoolAdminLayout({
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
