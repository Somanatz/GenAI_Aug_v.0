
// src/app/profile/page.tsx
'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { UserCircle, Edit3, Shield, LogOut, Mail, Briefcase, BookUser, Star, Languages, Loader2, Building, CalendarClock, Droplets, HeartPulse, Gamepad2, Leaf, Upload, Users2, UserCheck, School as SchoolIcon, AlertCircle } from "lucide-react"; 
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { UserRole, StudentProfileData, TeacherProfileData, ParentProfileData, School as SchoolInterface, SchoolClass, Subject as SubjectInterface, User } from '@/interfaces';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


// Schemas for different profile types
const baseProfileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional().transform(val => val ? val.trim() : undefined),
  email: z.string()
    .transform(val => val ? val.trim() : val) 
    .refine(val => !val || z.string().email().safeParse(val).success, { 
      message: "Invalid email address",
    })
    .optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmNewPassword: z.string().optional(),
  profile_picture: z.any().optional(), 
});

const studentSpecificSchema = z.object({
  full_name: z.string().optional().transform(val => val ? val.trim() : undefined),
  school_id: z.string().optional(),
  enrolled_class_id: z.string().optional(),
  preferred_language: z.string().optional().transform(val => val ? val.trim() : undefined),
  father_name: z.string().optional().transform(val => val ? val.trim() : undefined),
  mother_name: z.string().optional().transform(val => val ? val.trim() : undefined),
  place_of_birth: z.string().optional().transform(val => val ? val.trim() : undefined),
  date_of_birth: z.string().optional(),
  blood_group: z.string().optional().transform(val => val ? val.trim() : undefined),
  needs_assistant_teacher: z.boolean().optional(),
  admission_number: z.string().optional().transform(val => val ? val.trim() : undefined),
  parent_email_for_linking: z.string().transform(val => val ? val.trim() : val).refine(val => !val || z.string().email().safeParse(val).success, { message: "Invalid parent email" }).optional().or(z.literal('')),
  parent_mobile_for_linking: z.string().optional().transform(val => val ? val.trim() : undefined),
  hobbies: z.string().optional().transform(val => val ? val.trim() : undefined),
  favorite_sports: z.string().optional().transform(val => val ? val.trim() : undefined),
  interested_in_gardening_farming: z.boolean().optional(),
  parent_occupation: z.string().optional().transform(val => val ? val.trim() : undefined),
  nickname: z.string().optional().transform(val => val ? val.trim() : undefined),
});

const teacherSpecificSchema = z.object({
  full_name: z.string().optional().transform(val => val ? val.trim() : undefined),
  school_id: z.string().optional(),
  assigned_classes_ids: z.array(z.string()).optional(),
  subject_expertise_ids: z.array(z.string()).optional(),
  interested_in_tuition: z.boolean().optional(),
  mobile_number: z.string().optional().transform(val => val ? val.trim() : undefined),
  address: z.string().optional().transform(val => val ? val.trim() : undefined),
});

const parentSpecificSchema = z.object({
  full_name: z.string().optional().transform(val => val ? val.trim() : undefined),
  mobile_number: z.string().optional().transform(val => val ? val.trim() : undefined),
  address: z.string().optional().transform(val => val ? val.trim() : undefined),
});

const profileSchema = baseProfileSchema.merge(studentSpecificSchema).merge(teacherSpecificSchema).merge(parentSpecificSchema)
.refine(data => {
  if (data.newPassword && !data.currentPassword) {
    return true; 
  }
  return true;
}, {
  message: "Current password is required to set a new password",
  path: ["currentPassword"],
}).refine(data => !data.newPassword || data.newPassword === data.confirmNewPassword, { 
  message: "New passwords don't match",
  path: ["confirmNewPassword"],
});


type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { currentUser, isLoadingAuth, setCurrentUser, logout } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<File | null>(null);
  const [previewProfilePicture, setPreviewProfilePicture] = useState<string | null>(null);


  const [schools, setSchools] = useState<SchoolInterface[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<SubjectInterface[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { 
      username: '', email: '', full_name: '', school_id: undefined, enrolled_class_id: undefined,
      preferred_language: '', father_name: '', mother_name: '', place_of_birth: '', date_of_birth: '',
      blood_group: '', needs_assistant_teacher: false, admission_number: '', parent_email_for_linking: '',
      parent_mobile_for_linking: '', hobbies: '', favorite_sports: '', interested_in_gardening_farming: false,
      parent_occupation: '', nickname: '', assigned_classes_ids: [], subject_expertise_ids: [],
      interested_in_tuition: false, mobile_number: '', address: '', currentPassword: '',
      newPassword: '', confirmNewPassword: '',
    }
  });
  
  useEffect(() => {
    api.get<{results: SchoolInterface[]}>('/schools/').then(response => {
      setSchools(response.results || []);
    }).catch(error => {
      toast({ title: "Error", description: "Could not load schools list.", variant: "destructive" });
    });
  }, [toast]);

  useEffect(() => {
    const fetchDependentData = async () => {
        if (!selectedSchoolId) {
            setClasses([]);
            setSubjects([]);
            return;
        }
        try {
            const classResponse = await api.get<{results: SchoolClass[]}>(`/school-classes/?school=${selectedSchoolId}&page_size=200`);
            setClasses(classResponse.results || []);
            
            const subjectResponse = await api.get<{results: SubjectInterface[]}>(`/subjects/?master_class__syllabus__schools=${selectedSchoolId}&page_size=500`);
            setSubjects(subjectResponse.results || []);
        } catch (error) {
            setClasses([]); 
            setSubjects([]);
            toast({ title: "Error", description: "Could not load classes or subjects for the selected school.", variant: "destructive" });
        }
    };
    fetchDependentData();
  }, [selectedSchoolId, toast]);

  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
      const defaultValues: Partial<ProfileFormValues> = {
        username: currentUser.username || '',
        email: currentUser.email || '',
      };
      let currentProfilePictureUrl: string | null = null;
      let initialSchoolId = null;

      if (currentUser.role === 'Student' && currentUser.student_profile) {
        const sp = currentUser.student_profile;
        initialSchoolId = sp.school ? String(sp.school) : null;
        defaultValues.full_name = sp.full_name || '';
        defaultValues.school_id = initialSchoolId ?? undefined;
        defaultValues.enrolled_class_id = sp.enrolled_class ? String(sp.enrolled_class) : undefined;
        defaultValues.preferred_language = sp.preferred_language || '';
        defaultValues.father_name = sp.father_name || '';
        defaultValues.mother_name = sp.mother_name || '';
        defaultValues.place_of_birth = sp.place_of_birth || '';
        defaultValues.date_of_birth = sp.date_of_birth ? sp.date_of_birth.split('T')[0] : '';
        defaultValues.blood_group = sp.blood_group || '';
        defaultValues.needs_assistant_teacher = sp.needs_assistant_teacher || false;
        defaultValues.admission_number = sp.admission_number || '';
        defaultValues.parent_email_for_linking = sp.parent_email_for_linking || '';
        defaultValues.parent_mobile_for_linking = sp.parent_mobile_for_linking || '';
        defaultValues.hobbies = sp.hobbies || '';
        defaultValues.favorite_sports = sp.favorite_sports || '';
        defaultValues.interested_in_gardening_farming = sp.interested_in_gardening_farming || false;
        defaultValues.nickname = sp.nickname || '';
        defaultValues.parent_occupation = sp.parent_occupation || '';
        currentProfilePictureUrl = sp.profile_picture_url || null;
      } else if (currentUser.role === 'Teacher' && currentUser.teacher_profile) {
        const tp = currentUser.teacher_profile;
        initialSchoolId = tp.school ? String(tp.school) : null;
        defaultValues.full_name = tp.full_name || '';
        defaultValues.school_id = initialSchoolId ?? undefined;
        defaultValues.assigned_classes_ids = tp.assigned_classes?.map(String) || [];
        defaultValues.subject_expertise_ids = tp.subject_expertise?.map(String) || [];
        defaultValues.interested_in_tuition = tp.interested_in_tuition || false;
        defaultValues.mobile_number = tp.mobile_number || '';
        defaultValues.address = tp.address || '';
        currentProfilePictureUrl = tp.profile_picture_url || null;
      } else if (currentUser.role === 'Parent' && currentUser.parent_profile) {
        const pp = currentUser.parent_profile;
        defaultValues.full_name = pp.full_name || '';
        defaultValues.mobile_number = pp.mobile_number || '';
        defaultValues.address = pp.address || '';
        currentProfilePictureUrl = pp.profile_picture_url || null;
      }

      form.reset(defaultValues); 
      if (initialSchoolId) setSelectedSchoolId(initialSchoolId);
      if (currentProfilePictureUrl) {
        setPreviewProfilePicture(currentProfilePictureUrl);
      }
      setIsPageLoading(false);
    } else if (!isLoadingAuth && !currentUser) {
      setIsPageLoading(false); 
    }
  }, [currentUser, isLoadingAuth, form, toast]); 

  const handleProfilePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedProfilePicture(file);
      setPreviewProfilePicture(URL.createObjectURL(file));
    }
  };


  const onSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!currentUser) return;
    setIsSubmitting(true);

    const formData = new FormData();
    
    if (data.username && data.username.trim() && data.username.trim() !== currentUser.username) {
      formData.append('username', data.username.trim());
    }
    if (data.email !== undefined && data.email !== currentUser.email) { 
        formData.append('email', data.email || ''); 
    }
    if (data.newPassword && data.confirmNewPassword && data.newPassword === data.confirmNewPassword) {
        formData.append('password', data.newPassword);
    }

    Object.entries(data).forEach(([key, value]) => {
      const fieldsToSkip = ['profile_picture', 'username', 'email', 'currentPassword', 'newPassword', 'confirmNewPassword'];
      if (fieldsToSkip.includes(key) || value === undefined) {
        return;
      }
      
      if (Array.isArray(value)) {
        value.forEach(item => formData.append(key, item));
      } else if (value === null) {
        formData.append(key, '');
      } else if (typeof value === 'boolean') {
        formData.append(key, String(value));
      } else {
        formData.append(key, String(value));
      }
    });

    if (selectedProfilePicture) {
      formData.append('profile_picture', selectedProfilePicture);
    }
    
    try {
      const updatedUserResponse = await api.patch<User>(`/users/${currentUser.id}/profile/`, formData, true); 
      setCurrentUser(updatedUserResponse);
      
      toast({ title: "Profile Updated", description: "Your profile information has been successfully updated." });
      
      let newProfilePicUrl = null;
      if (updatedUserResponse.role === 'Student' && updatedUserResponse.student_profile?.profile_picture_url) {
        newProfilePicUrl = updatedUserResponse.student_profile.profile_picture_url;
      } else if (updatedUserResponse.role === 'Teacher' && updatedUserResponse.teacher_profile?.profile_picture_url) {
        newProfilePicUrl = updatedUserResponse.teacher_profile.profile_picture_url;
      } else if (updatedUserResponse.role === 'Parent' && updatedUserResponse.parent_profile?.profile_picture_url) {
        newProfilePicUrl = updatedUserResponse.parent_profile.profile_picture_url;
      }
      if (newProfilePicUrl) {
        setPreviewProfilePicture(newProfilePicUrl);
      }
      setSelectedProfilePicture(null); 

    } catch (error: any) {
        let errorMessage = "Could not update profile.";
        if (error.response && error.response.data) {
            const errorData = error.response.data;
             if (typeof errorData === 'object' && errorData !== null) {
                errorMessage = Object.entries(errorData).map(([key, value]) => {
                    const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    return `${fieldName}: ${(Array.isArray(value) ? value.join(', ') : String(value))}`;
                }).join('; ');
            } else if (errorData.detail) {
                errorMessage = errorData.detail;
            } else {
                errorMessage = JSON.stringify(errorData);
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
      toast({ title: "Update Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleLogout = () => { logout(); }; 

  if (isPageLoading || isLoadingAuth) {
    return <div className="max-w-3xl mx-auto space-y-8 p-4"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /><Skeleton className="h-48 w-full rounded-xl" /></div>;
  }
  if (!currentUser) {
    return <div className="max-w-3xl mx-auto text-center py-10"><p>Please log in to view your profile.</p><Button onClick={() => window.location.href = '/login'} className="mt-4">Login</Button></div>;
  }

  const cardTitleName = form.watch('full_name') || (currentUser.role === 'Student' ? currentUser.student_profile?.full_name : currentUser.role === 'Teacher' ? currentUser.teacher_profile?.full_name : currentUser.role === 'Parent' ? currentUser.parent_profile?.full_name : null) || currentUser.username;
  const defaultAvatarText = (cardTitleName || 'U').charAt(0).toUpperCase();
  const avatarSrc = previewProfilePicture || `https://placehold.co/150x150.png?text=${defaultAvatarText}`;
  const isStudentEnrolled = !!currentUser?.student_profile?.enrolled_class;
  
  const getNextEnrollmentDate = () => {
    if (!isStudentEnrolled) {
        return null;
    }
    const today = new Date();
    const currentYear = today.getFullYear();
    // The cutoff date is June 5th of the current year.
    const cutoffDate = new Date(currentYear, 5, 5); // Month is 0-indexed, so 5 is June.

    if (today < cutoffDate) {
        // If today is before June 5th, the next enrollment is this year's June 5th.
        return cutoffDate;
    } else {
        // If today is on or after June 5th, the next enrollment is next year's June 5th.
        return new Date(currentYear + 1, 5, 5);
    }
  };

  const nextEnrollmentDate = getNextEnrollmentDate();
  const enrollmentChangeIsLocked = isStudentEnrolled && nextEnrollmentDate && new Date() < nextEnrollmentDate;

  return (
    <div className="max-w-3xl mx-auto space-y-10 p-4 md:p-6 my-8">
      <header className="text-center">
        <UserCircle className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold">My Profile</h1>
        <p className="text-lg text-muted-foreground mt-2">Manage your account settings and personal details.</p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="shadow-xl rounded-xl overflow-hidden">
            <CardHeader className="p-6 bg-card">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group">
                    <Avatar className="h-28 w-28 border-4 border-primary shadow-md">
                    <AvatarImage src={avatarSrc} alt={currentUser.username} data-ai-hint="profile person"/>
                    <AvatarFallback className="text-3xl">{defaultAvatarText}</AvatarFallback>
                    </Avatar>
                    <label htmlFor="profile-picture-upload" 
                           className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full cursor-pointer">
                        <Upload size={32} />
                    </label>
                    <Input 
                        id="profile-picture-upload" 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                    />
                </div>
                <div className="text-center sm:text-left">
                  <CardTitle className="text-2xl">{cardTitleName}</CardTitle>
                  <div className="mt-1 space-y-0.5">
                    <CardDescription className="flex items-center justify-center sm:justify-start gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> {form.watch('email') || currentUser.email}</CardDescription>
                    <CardDescription className="flex items-center justify-center sm:justify-start gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> Role: <span className="capitalize font-medium text-primary">{currentUser.role}</span></CardDescription>
                    {currentUser.role === 'Admin' && currentUser.is_school_admin && currentUser.administered_school?.name && (
                         <CardDescription className="flex items-center justify-center sm:justify-start gap-2"><Building className="h-4 w-4 text-muted-foreground" /> Admin for: <span className="font-medium">{currentUser.administered_school.name}</span></CardDescription>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-6 space-y-8">
              <section>
                <h3 className="text-xl font-semibold mb-4 flex items-center"><Edit3 className="mr-2 h-5 w-5 text-accent" /> Basic Information</h3>
                <div className="space-y-4">
                  <FormField control={form.control} name="username" render={({ field }) => (<FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </section>
              
              {currentUser.role === 'Student' && (
                <section>
                  <Separator className="my-6"/>
                  <h3 className="text-xl font-semibold mb-4 flex items-center"><BookUser className="mr-2 h-5 w-5 text-accent" /> Student Details</h3>
                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField control={form.control} name="full_name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="nickname" render={({ field }) => (<FormItem><FormLabel>Nickname</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="school_id" render={({ field }) => (
                            <FormItem><FormLabel><SchoolIcon className="inline mr-1 h-4 w-4"/>School</FormLabel>
                                <Select onValueChange={(value) => { field.onChange(value); setSelectedSchoolId(value); form.setValue('enrolled_class_id', undefined); }} value={field.value ?? undefined} disabled={enrollmentChangeIsLocked}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger></FormControl>
                                <SelectContent>{schools.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>)} />
                        <FormItem><FormLabel>Enrolled Class</FormLabel>
                          {isStudentEnrolled ? (
                             <Alert variant="default" className="bg-blue-50 border-blue-200 dark:bg-blue-900/50 dark:border-blue-700">
                              <AlertCircle className="h-4 w-4 text-blue-500" />
                              <AlertTitle className="text-blue-700 dark:text-blue-300">
                                Currently Enrolled: {currentUser.student_profile?.enrolled_class_name || 'N/A'}
                              </AlertTitle>
                              <AlertDescription className="text-xs text-blue-600 dark:text-blue-400">
                                {enrollmentChangeIsLocked && nextEnrollmentDate ? `Next enrollment change available on ${format(nextEnrollmentDate, "MMMM d, yyyy")}.` : "You can now change your enrollment."}
                                 <br/>To change earlier, please contact your school administrator.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <FormField control={form.control} name="enrolled_class_id" render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={!selectedSchoolId || classes.length === 0}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger></FormControl>
                                  <SelectContent>{classes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                              </Select>
                            )} />
                          )}
                          <FormMessage />
                        </FormItem>
                        <FormField control={form.control} name="admission_number" render={({ field }) => (<FormItem><FormLabel>Admission Number</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="date_of_birth" render={({ field }) => (<FormItem><FormLabel><CalendarClock className="inline mr-1 h-4 w-4"/>Date of Birth</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="place_of_birth" render={({ field }) => (<FormItem><FormLabel>Place of Birth</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="preferred_language" render={({ field }) => (<FormItem><FormLabel><Languages className="inline mr-1 h-4 w-4"/>Preferred Language</FormLabel><FormControl><Input placeholder="e.g., en, es" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="father_name" render={({ field }) => (<FormItem><FormLabel>Father's Name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="mother_name" render={({ field }) => (<FormItem><FormLabel>Mother's Name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="parent_occupation" render={({ field }) => (<FormItem><FormLabel>Parent's Occupation</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="blood_group" render={({ field }) => (<FormItem><FormLabel><Droplets className="inline mr-1 h-4 w-4"/>Blood Group</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="parent_email_for_linking" render={({ field }) => (<FormItem><FormLabel>Parent's Email (for linking)</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="parent_mobile_for_linking" render={({ field }) => (<FormItem><FormLabel>Parent's Mobile (for linking)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField control={form.control} name="hobbies" render={({ field }) => (<FormItem className="mt-4"><FormLabel><Gamepad2 className="inline mr-1 h-4 w-4"/>Hobbies</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="favorite_sports" render={({ field }) => (<FormItem className="mt-4"><FormLabel><HeartPulse className="inline mr-1 h-4 w-4"/>Favorite Sports</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <FormField control={form.control} name="needs_assistant_teacher" render={({ field }) => (<FormItem className="flex items-center space-x-2 pt-2"><FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Needs Assistant Teacher</FormLabel><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="interested_in_gardening_farming" render={({ field }) => (<FormItem className="flex items-center space-x-2 pt-2"><FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal"><Leaf className="inline mr-1 h-4 w-4"/>Interested in Gardening/Farming</FormLabel><FormMessage /></FormItem>)} />
                    </div>
                </section>
              )}

              {currentUser.role === 'Teacher' && (
                 <section>
                  <Separator className="my-6"/>
                  <h3 className="text-xl font-semibold mb-4 flex items-center"><Star className="mr-2 h-5 w-5 text-accent" /> Teacher Details</h3>
                     <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField control={form.control} name="full_name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="school_id" render={({ field }) => (
                            <FormItem><FormLabel><SchoolIcon className="inline mr-1 h-4 w-4"/>School</FormLabel>
                                <Select onValueChange={(value) => { field.onChange(value); setSelectedSchoolId(value); form.setValue('assigned_classes_ids', []); }} value={field.value ?? undefined}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger></FormControl>
                                <SelectContent>{schools.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>)} />
                        <FormField control={form.control} name="mobile_number" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                     </div>
                     <FormField control={form.control} name="address" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Address</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                     
                     <FormItem className="mt-4"><FormLabel>Classes You Teach</FormLabel>
                        <div className="space-y-1 max-h-40 overflow-y-auto border p-2 rounded-md">
                        { Array.isArray(classes) && classes.length > 0 ? classes.map(cls => (
                          <FormField key={cls.id} control={form.control} name="assigned_classes_ids"
                              render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(String(cls.id))} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), String(cls.id)]) : field.onChange((field.value || []).filter(v => v !== String(cls.id)))}} /></FormControl><FormLabel className="font-normal">{cls.name}</FormLabel></FormItem>)}/>
                        )) : <p className="text-xs text-muted-foreground p-1">{selectedSchoolId ? "No classes found for this school." : "Select a school to see classes."}</p>}
                        </div>
                     </FormItem>

                     <FormItem className="mt-4"><FormLabel>Subjects You Specialize In</FormLabel>
                        <div className="space-y-1 max-h-40 overflow-y-auto border p-2 rounded-md">
                        { Array.isArray(subjects) && subjects.length > 0 ? subjects.map(sub => (
                          <FormField key={sub.id} control={form.control} name="subject_expertise_ids"
                              render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0"><FormControl><Checkbox checked={field.value?.includes(String(sub.id))} onCheckedChange={(checked) => {return checked ? field.onChange([...(field.value || []), String(sub.id)]) : field.onChange((field.value || []).filter(v => v !== String(sub.id)))}} /></FormControl><FormLabel className="font-normal">{sub.name} {sub.master_class_name ? `(${sub.master_class_name})` : ''}</FormLabel></FormItem>)}/>
                        )) : <p className="text-xs text-muted-foreground p-1">{selectedSchoolId ? "No subjects found for this school." : "Select a school to see subjects."}</p>}
                        </div>
                     </FormItem>

                     <FormField control={form.control} name="interested_in_tuition" render={({ field }) => (<FormItem className="flex items-center space-x-2 mt-4 pt-2"><FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Interested in Private Tuition</FormLabel><FormMessage /></FormItem>)} />
                  </section>
              )}

              {currentUser.role === 'Parent' && (
                <section>
                  <Separator className="my-6"/>
                  <h3 className="text-xl font-semibold mb-4 flex items-center"><Users2 className="mr-2 h-5 w-5 text-accent" /> Parent Details</h3>
                    <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                        <FormField control={form.control} name="full_name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="mobile_number" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField control={form.control} name="address" render={({ field }) => (<FormItem className="mt-4"><FormLabel>Address</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                  </section>
              )}

              <section>
                <Separator className="my-6"/>
                <h3 className="text-xl font-semibold mb-4 flex items-center"><Shield className="mr-2 h-5 w-5 text-accent" /> Security (Password Change)</h3>
                <p className="text-sm text-muted-foreground mb-4">To change your password, fill current and new password fields. Leave blank if not changing.</p>
                <div className="space-y-4">
                   <FormField control={form.control} name="currentPassword" render={({ field }) => (<FormItem><FormLabel>Current Password</FormLabel><FormControl><Input type="password" placeholder="Enter current password" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                   <FormField control={form.control} name="newPassword" render={({ field }) => (<FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" placeholder="Enter new password" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                   <FormField control={form.control} name="confirmNewPassword" render={({ field }) => (<FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input type="password" placeholder="Confirm new password" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </section>
            </CardContent>
            <CardFooter className="p-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
              <Button type="submit" disabled={isSubmitting} size="lg" className="w-full sm:w-auto">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4"/> }
                Update Profile
              </Button>
              <Button variant="destructive" onClick={handleLogout} disabled={isSubmitting} className="w-full sm:w-auto">
                <LogOut className="mr-2 h-5 w-5" /> Log Out
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
