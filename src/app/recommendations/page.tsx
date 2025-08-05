
// src/app/recommendations/page.tsx
// This page is now deprecated. Content should be under /student/recommendations
import { redirect } from 'next/navigation';

export default function DeprecatedRecommendationsPage() {
  redirect('/student/recommendations');
}
