import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { LucideIcon } from 'lucide-react';
import { BookOpen, Calculator, FlaskConical, Globe, Palette, Music, Brain } from 'lucide-react';


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to map subject names to icons
export const subjectIconMap: Record<string, LucideIcon> = {
  default: BookOpen, math: Calculator, mathematics: Calculator, english: BookOpen,
  science: FlaskConical, history: Globe, geography: Globe, physics: Brain,
  chemistry: FlaskConical, biology: Brain, art: Palette, music: Music,
};

export const getIconForSubject = (subjectName: string): LucideIcon => {
  if (!subjectName) return subjectIconMap.default;
  const nameLower = subjectName.toLowerCase();
  for (const key in subjectIconMap) {
    if (nameLower.includes(key)) { return subjectIconMap[key]; }
  }
  return subjectIconMap.default;
};
