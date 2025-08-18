// src/app/teacher/communication/message/page.tsx
// This page is deprecated and its functionality is now part of the unified /messages page.
import { redirect } from 'next/navigation';

export default function DeprecatedTeacherMessagePage() {
  redirect('/messages');
}
