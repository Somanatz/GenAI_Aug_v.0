
import type { LucideIcon } from 'lucide-react';

export interface ForumCategory {
  id: number;
  name: string;
  description: string;
  slug: string;
}

export interface ForumThread {
  id: number;
  category: number;
  category_name: string;
  author: number;
  author_username: string;
  title: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  reply_count: number;
  last_activity_by: string;
  last_activity_at: string;
}

export interface Syllabus {
  id: string | number;
  name: string;
  description?: string;
}

export interface SchoolClass {
  id: string | number;
  school: number;
  master_class: number;
  name: string; // Master class name, added from serializer
  description?: string; // Master class description, added from serializer
}

export interface School {
  id: string | number;
  name: string;
  school_id_code: string;
  license_number?: string;
  official_email: string;
  phone_number?: string;
  address?: string;
  principal_full_name?: string;
  principal_contact_number?: string;
  principal_email?: string;
  admin_user?: number;
  syllabus?: Syllabus;
  student_count?: number;
  staff_count?: number;
  classes?: SchoolClass[];
}

export interface AILessonSummary {
  id: number;
  lesson: number;
  summary: string;
  created_at: string;
}

export interface TranslatedLessonContent {
  id: number;
  lesson: number;
  language_code: string;
  translated_title: string;
  translated_content: string;
  created_at?: string;
}

export interface LessonSummary { 
  id: string | number;
  title: string;
  lesson_order?: number;
  is_locked?: boolean; 
  video_url?: string;
  audio_url?: string;
  image_url?: string;
}

export interface Choice {
  id: string | number;
  text: string;
  is_correct: boolean;
}

export interface Question {
  id: string | number;
  text: string;
  choices: Choice[];
}

export interface Quiz {
  id: string | number;
  title: string;
  description?: string;
  pass_mark_percentage?: number;
  questions: Question[];
  lesson: string | number; 
}


export interface Lesson extends LessonSummary { 
  content: string;
  simplified_content?: string;
  subject?: string | number; 
  subject_name?: string;
  quiz?: Quiz | null; 
  requires_previous_quiz?: boolean;
  ai_summary?: AILessonSummary | null;
  translations?: TranslatedLessonContent[] | null;
}


export interface Subject {
  id: string | number; 
  name: string;
  icon?: LucideIcon;
  description: string;
  lessonsCount?: number;
  lessons?: LessonSummary[];
  bgColor?: string; 
  textColor?: string; 
  href?: string;
  progress?: number;
  is_locked?: boolean; 
  master_class?: string | number; 
  class_obj_name?: string;
  classId?: string | number;
}

export interface Class { // This is now MasterClass template
  id: string | number; 
  name: string;
  description?: string;
  subjects?: Subject[];
  syllabus?: number; 
}


export type UserRole = 'Student' | 'Teacher' | 'Parent' | 'Admin';

// Profile Data Interfaces
export interface StudentProfileData {
    id?: number;
    user?: number; 
    profile_completed?: boolean;
    full_name?: string | null;
    school?: string | number | null; 
    school_name?: string | null; 
    enrolled_class?: string | number | null; 
    enrolled_class_name?: string | null; 
    nickname?: string | null;
    preferred_language?: string | null;
    father_name?: string | null;
    mother_name?: string | null;
    place_of_birth?: string | null;
    date_of_birth?: string | null; 
    blood_group?: string | null;
    needs_assistant_teacher?: boolean;
    admission_number?: string | null;
    parent_email_for_linking?: string | null;
    parent_mobile_for_linking?: string | null;
    parent_occupation?: string | null;
    hobbies?: string | null;
    favorite_sports?: string | null;
    interested_in_gardening_farming?: boolean;
    profile_picture?: string | null;
    profile_picture_url?: string | null;
}

export interface TeacherProfileData {
    id?: number;
    user?: number;
    profile_completed?: boolean;
    full_name?: string | null;
    school?: string | number | null; 
    school_name?: string | null;
    assigned_classes?: (string | number)[]; 
    assigned_classes_details?: { id: string | number, name: string }[]; 
    subject_expertise?: (string | number)[]; 
    subject_expertise_details?: { id: string | number, name: string }[]; 
    interested_in_tuition?: boolean;
    mobile_number?: string | null;
    address?: string | null;
    profile_picture?: string | null;
    profile_picture_url?: string | null;
}

export interface ParentProfileData {
    id?: number;
    user?: number;
    profile_completed?: boolean;
    full_name?: string | null;
    mobile_number?: string | null;
    address?: string | null;
    profile_picture?: string | null;
    profile_picture_url?: string | null;
}

// User interface
export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  is_school_admin?: boolean;
  school?: string | number | null; // ID of the school
  school_name?: string | null;
  administered_school?: { id: number; name: string; school_id_code: string; } | null;
  student_profile?: StudentProfileData | null;
  teacher_profile?: TeacherProfileData | null;
  parent_profile?: ParentProfileData | null;
  profile_completed?: boolean;
}


export interface ParentStudentLinkAPI {
  id: string | number;
  parent: number; 
  student: number; 
  parent_username: string;
  student_username: string;
  student_details?: StudentProfileData; 
}


export interface Book {
    id: number;
    title: string;
    author?: string;
    file?: string; 
    file_url?: string; 
    subject?: number; 
    subject_name?: string;
    master_class?: number; 
    class_name?: string;
}

export interface StudentResource {
  id: number;
  student: number;
  resource_type: 'BOOK' | 'NOTE' | 'VIDEO';
  title: string;
  description?: string;
  file?: string;
  file_url?: string;
  url?: string;
  content?: string;
  created_at: string;
  updated_at: string;
}

export interface Event {
    id: number;
    title: string;
    description?: string;
    date: string; 
    end_date?: string; 
    type: 'Holiday' | 'Exam' | 'Meeting' | 'Activity' | 'Deadline' | 'General';
    created_by_username?: string;
    school?: number | null;
    school_name?: string | null;
    target_class?: number | null;
    target_class_name?: string | null;
}

export interface StudentTask {
  id: number;
  user: number;
  title: string;
  description?: string;
  due_date: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reward {
    id: number;
    title: string;
    description: string;
    icon: string;
    progress?: {
        current: number;
        target: number;
        text: string;
    };
}


export interface UserQuizAttempt {
  id: string | number;
  user: number;
  user_username: string;
  quiz: number;
  quiz_title: string;
  lesson_title?: string;
  score: number;
  passed: boolean;
  completed_at: string; 
  answers?: any; 
}

export interface UserLessonProgress {
  id: string | number;
  user: number;
  lesson: number;
  lesson_title?: string;
  completed: boolean;
  progress_data?: {
    scrollPosition?: number;
    videoTimestamp?: number;
  };
  last_updated: string; 
}

export interface AILessonQuizAttempt {
  id: number;
  user: number;
  lesson: number;
  score: number;
  passed: boolean;
  quiz_data: any;
  attempted_at: string;
  can_reattempt_at?: string | null;
}


export interface UserNote {
  id?: number;
  user?: number;
  lesson: number;
  notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface Checkpoint {
  id: number;
  user_id: number;
  lesson: number;
  lesson_title?: string;
  name: string;
  progress_data?: {
    scrollPosition?: number;
    videoTimestamp?: number;
  };
  created_at: string;
}

export interface RecentActivity {
    id: number;
    activity_type: string;
    details: string;
    timestamp: string;
}

export interface StudentRecommendation {
    id: number;
    student: number;
    recommendation_data: any; // The full JSON output from the AI
    created_at: string;
}

    