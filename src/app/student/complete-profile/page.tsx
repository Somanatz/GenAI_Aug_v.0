
// src/app/student/complete-profile/page.tsx
'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Loader2, UserCheck, Upload, School as SchoolIcon, CalendarClock, Droplets, HeartPulse, Gamepad2, Leaf, AlertCircle } from 'lucide-react';
import type { SchoolClass, School as SchoolInterface, User } from '@/interfaces';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const studentProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  school_id: z.string().min(1, "School selection is required"),
  enrolled_class_id: z.string().min(1, "Class selection is required"),
  admission_number: z.string().min(1, 'Admission number is required'),
  nickname: z.string().optional(),
  preferred_language: z.string().optional(),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  place_of_birth: z.string().optional(),
  date_of_birth: z.string().refine((date) => !date || !isNaN(Date.parse(date)), { message: "Invalid date" }).optional().or(z.literal('')),
  blood_group: z.string().optional(),
  needs_assistant_teacher: z.boolean().default(false).optional(),
  parent_email_for_linking: z.string().email({message: "Invalid parent email"}).optional().or(z.literal('')),
  parent_mobile_for_linking: z.string().optional(),
  parent_occupation: z.string().optional(),
  hobbies: z.string().optional(),
  favorite_sports: z.string().optional(),
  interested_in_gardening_farming: z.boolean().default(false).optional(),
  profile_picture: z.any().optional(),
});

type StudentProfileFormValues = z.infer<typeof studentProfileSchema>;

export default function CompleteStudentProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, isLoadingAuth, setCurrentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schools, setSchools] = useState<SchoolInterface[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string | undefined>(undefined);
  const [previewProfilePicture, setPreviewProfilePicture] = useState<string | null>(null);
  const [selectedProfilePictureFile, setSelectedProfilePictureFile] = useState<File | null>(null);

  const form = useForm<StudentProfileFormValues>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      full_name: '',
      preferred_language: 'en',
      needs_assistant_teacher: false,
      interested_in_gardening_farming: false,
      date_of_birth: '',
      nickname: '',
      father_name: '',
      mother_name: '',
      place_of_birth: '',
      blood_group: '',
      parent_email_for_linking: '',
      parent_mobile_for_linking: '',
      parent_occupation: '',
      hobbies: '',
      favorite_sports: '',
      admission_number: '',
      school_id: undefined,
      enrolled_class_id: undefined,
    },
  });

 useEffect(() => {
    if (!isLoadingAuth) {
      if (!currentUser) {
        router.push('/login');
      } else if (currentUser.role !== 'Student') {
        router.push('/');
      }
    }
  }, [isLoadingAuth, currentUser, router]);

  useEffect(() => {
    if (currentUser) {
        api.get<SchoolInterface[] | {results: SchoolInterface[]}>('/schools/').then(res => {
          const data = Array.isArray(res) ? res : res.results || [];
          setSchools(data);
        }).catch(err => toast({ title: "Error", description: "Could not load schools.", variant: "destructive"}));
    }
  }, [currentUser, toast]);

  useEffect(() => {
    if (currentUser?.student_profile) {
        const sp = currentUser.student_profile;
        form.reset({
            full_name: sp.full_name || '',
            school_id: sp.school ? String(sp.school) : undefined,
            enrolled_class_id: sp.enrolled_class ? String(sp.enrolled_class) : undefined,
            admission_number: sp.admission_number || '',
            nickname: sp.nickname || '',
            preferred_language: sp.preferred_language || 'en',
            father_name: sp.father_name || '',
            mother_name: sp.mother_name || '',
            place_of_birth: sp.place_of_birth || '',
            date_of_birth: sp.date_of_birth ? sp.date_of_birth.split('T')[0] : '',
            blood_group: sp.blood_group || '',
            needs_assistant_teacher: sp.needs_assistant_teacher || false,
            parent_email_for_linking: sp.parent_email_for_linking || '',
            parent_mobile_for_linking: sp.parent_mobile_for_linking || '',
            parent_occupation: sp.parent_occupation || '',
            hobbies: sp.hobbies || '',
            favorite_sports: sp.favorite_sports || '',
            interested_in_gardening_farming: sp.interested_in_gardening_farming || false,
        });
        if (sp.school) setSelectedSchoolId(String(sp.school));
        if (sp.profile_picture_url) setPreviewProfilePicture(sp.profile_picture_url);
    }
  }, [currentUser, form]);


  useEffect(() => {
    const fetchClassesForSchool = async (schoolIdValue: string) => {
        if (!schoolIdValue) {
            setClasses([]);
            form.setValue("enrolled_class_id", undefined);
            return;
        }
        try {
            // Use the new school-classes endpoint
            const classResponse = await api.get<SchoolClass[] | { results: SchoolClass[] }>(`/school-classes/?school=${schoolIdValue}&page_size=100`);
            const classData = Array.isArray(classResponse) ? classResponse : classResponse.results || [];
            setClasses(classData);
        } catch (error) {
            toast({ title: "Error", description: "Could not load classes for the selected school.", variant: "destructive" });
            setClasses([]);
        }
    };
    if (selectedSchoolId) {
        fetchClassesForSchool(selectedSchoolId);
    } else {
        setClasses([]);
        if (form.getValues("enrolled_class_id")) {
          form.setValue("enrolled_class_id", undefined);
        }
    }
  }, [selectedSchoolId, toast, form]);

  const handleProfilePictureChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedProfilePictureFile(file);
      setPreviewProfilePicture(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: StudentProfileFormValues) => {
    if (!currentUser || currentUser.role !== 'Student') return;
    setIsSubmitting(true);

    const formData = new FormData();
    
    // Add profile_completed flag
    formData.append('profile_completed', 'true'); 

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'profile_picture' || value === undefined) {
        return;
      }
      if (value === null) {
        formData.append(key, '');
      } else if (typeof value === 'boolean') {
        formData.append(key, String(value));
      } else {
        formData.append(key, String(value));
      }
    });

    if (selectedProfilePictureFile) {
      formData.append('profile_picture', selectedProfilePictureFile);
    }

    try {
      const updatedUserResponse = await api.patch<User>(`/users/${currentUser.id}/profile/`, formData, true);
      setCurrentUser(updatedUserResponse); 
      
      toast({ title: "Profile Updated!", description: "Your student profile has been successfully updated." });
      router.push('/student'); // Redirect to student dashboard
    } catch (error: any) {
      let errorMessage = "Could not update profile.";
        if (error.response && error.response.data) {
            const errorData = error.response.data;
             if (typeof errorData === 'object' && errorData !== null) {
                errorMessage = Object.entries(errorData).map(([k, v]) => `${k}: ${(Array.isArray(v) ? v.join(', ') : String(v))}`).join('; ');
            } else { errorMessage = String(errorData); }
        } else if (error.message) { errorMessage = error.message; }
      toast({ title: "Profile Update Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAuth || (!isLoadingAuth && !currentUser)) {
     return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  const defaultAvatarText = (currentUser?.username || 'S').charAt(0).toUpperCase();
  const isClassEnrolled = !!currentUser?.student_profile?.enrolled_class;

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted p-4 py-8">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Student Profile Information</CardTitle>
          <CardDescription className="text-center">{isClassEnrolled ? 'Update your student details.' : 'Complete your profile to enroll in a class and access your dashboard.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="flex flex-col items-center space-y-3 mb-6">
                <Avatar className="h-24 w-24 border-2 border-primary">
                  <AvatarImage src={previewProfilePicture || `https://placehold.co/150x150.png?text=${defaultAvatarText}`} alt={currentUser?.username} data-ai-hint="profile student"/>
                  <AvatarFallback>{defaultAvatarText}</AvatarFallback>
                </Avatar>
                <FormField control={form.control} name="profile_picture" render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="profile-picture-upload-student" className="cursor-pointer inline-flex items-center gap-2 text-sm text-primary hover:underline">
                      <Upload size={16}/> Change Profile Picture
                    </FormLabel>
                    <FormControl><Input id="profile-picture-upload-student" type="file" className="hidden" accept="image/*" onChange={handleProfilePictureChange} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="full_name" render={({ field }) => (
                <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="nickname" render={({ field }) => (
                <FormItem><FormLabel>Nickname (Optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="school_id" render={({ field }) => (
                    <FormItem>
                        <FormLabel><SchoolIcon className="inline mr-1 h-4 w-4"/>School</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); setSelectedSchoolId(value); form.setValue('enrolled_class_id', undefined); }} value={field.value ?? undefined}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select your school" /></SelectTrigger></FormControl>
                            <SelectContent>{ Array.isArray(schools) && schools.map(school => <SelectItem key={school.id} value={String(school.id)}>{school.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="enrolled_class_id" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Class to Enroll In</FormLabel>
                        {isClassEnrolled && (
                          <Alert variant="default" className="bg-blue-50 border-blue-200">
                            <AlertCircle className="h-4 w-4 text-blue-500" />
                            <AlertTitle>Already Enrolled</AlertTitle>
                            <AlertDescription className="text-xs">
                              You are already enrolled in a class. To change it, please contact your school administrator.
                            </AlertDescription>
                          </Alert>
                        )}
                        <Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={!selectedSchoolId || classes.length === 0 || isClassEnrolled}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select your class" /></SelectTrigger></FormControl>
                            <SelectContent>{Array.isArray(classes) && classes.map(cls => <SelectItem key={cls.id} value={String(cls.id)}>{cls.name}</SelectItem>)}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="admission_number" render={({ field }) => (
                <FormItem><FormLabel>Admission Number</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="date_of_birth" render={({ field }) => (
                    <FormItem><FormLabel><CalendarClock className="inline mr-1 h-4 w-4"/>Date of Birth (Optional)</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="place_of_birth" render={({ field }) => (
                    <FormItem><FormLabel>Place of Birth (Optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="father_name" render={({ field }) => (
                    <FormItem><FormLabel>Father's Name (Optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="mother_name" render={({ field }) => (
                    <FormItem><FormLabel>Mother's Name (Optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
               <FormField control={form.control} name="parent_occupation" render={({ field }) => (
                <FormItem><FormLabel>Parent's Occupation (Optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="parent_email_for_linking" render={({ field }) => (
                    <FormItem><FormLabel>Parent's Email for Linking (Optional)</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                 )} />
                 <FormField control={form.control} name="parent_mobile_for_linking" render={({ field }) => (
                    <FormItem><FormLabel>Parent's Mobile for Linking (Optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                 )} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="preferred_language" render={({ field }) => (
                    <FormItem><FormLabel>Preferred Language (e.g., en, es)</FormLabel><FormControl><Input {...field} value={field.value ?? "en"} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="blood_group" render={({ field }) => (
                    <FormItem><FormLabel><Droplets className="inline mr-1 h-4 w-4"/>Blood Group (Optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="hobbies" render={({ field }) => (
                <FormItem><FormLabel><Gamepad2 className="inline mr-1 h-4 w-4"/>Hobbies (Optional)</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="favorite_sports" render={({ field }) => (
                <FormItem><FormLabel><HeartPulse className="inline mr-1 h-4 w-4"/>Favorite Sports (Optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField control={form.control} name="needs_assistant_teacher" render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 pt-6">
                        <FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} id="needs_assistant_teacher" /></FormControl>
                        <FormLabel htmlFor="needs_assistant_teacher" className="cursor-pointer">Needs Assistant Teacher (Optional)</FormLabel>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="interested_in_gardening_farming" render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 pt-6">
                        <FormControl><Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} id="interested_in_gardening_farming"/></FormControl>
                        <FormLabel htmlFor="interested_in_gardening_farming" className="cursor-pointer"><Leaf className="inline mr-1 h-4 w-4"/>Interested in Gardening/Farming (Optional)</FormLabel>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
                {isClassEnrolled ? 'Save Profile' : 'Complete Profile & Enroll'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
