// src/app/register-school/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { api } from '@/lib/api';
import Link from 'next/link';
import { SchoolIcon, PlusCircle, Loader2, UserCog, Lock, BookCopy, Library } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import Footer from '@/components/layout/Footer';
import type { Syllabus, Class as MasterClass } from '@/interfaces';


const schoolRegistrationSchema = z.object({
  name: z.string().min(3, 'School name must be at least 3 characters'),
  school_id_code: z.string().min(1, 'School ID code is required'),
  license_number: z.string().optional(),
  official_email: z.string().email('Invalid official email address'),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  principal_full_name: z.string().optional(),
  principal_contact_number: z.string().optional(),
  principal_email: z.string().email({ message: "Invalid principal email" }).optional().or(z.literal('')),
  
  syllabus_id: z.string().min(1, 'Please select a syllabus for your school'),
  selected_class_ids: z.array(z.string()).min(1, "Please select at least one class for your school"),

  admin_username: z.string().min(3, "Admin username must be at least 3 characters"),
  admin_email: z.string().email("Invalid admin email address"),
  admin_password: z.string().min(8, "Admin password must be at least 8 characters"),
  admin_confirm_password: z.string(),
}).refine(data => data.admin_password === data.admin_confirm_password, {
  message: "Admin passwords don't match",
  path: ["admin_confirm_password"],
});

type SchoolRegistrationFormValues = z.infer<typeof schoolRegistrationSchema>;

export default function RegisterSchoolPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [masterClasses, setMasterClasses] = useState<MasterClass[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(false);
  const { toast } = useToast();

  const form = useForm<SchoolRegistrationFormValues>({
    resolver: zodResolver(schoolRegistrationSchema),
    defaultValues: {
      name: '', school_id_code: '', license_number: '', official_email: '',
      phone_number: '', address: '', principal_full_name: '',
      principal_contact_number: '', principal_email: '',
      admin_username: '', admin_email: '', admin_password: '',
      admin_confirm_password: '',
      syllabus_id: undefined,
      selected_class_ids: [],
    },
  });
  
  const selectedSyllabusId = form.watch('syllabus_id');

  useEffect(() => {
    // Fetch all available syllabuses on component mount
    api.get<{results: Syllabus[]}>('/syllabuses/').then(response => {
        setSyllabuses(response.results || []);
    }).catch(err => toast({ title: "Error", description: "Could not load syllabuses.", variant: "destructive" }));
  }, [toast]);

  useEffect(() => {
    // When selectedSyllabusId changes, fetch the corresponding master classes
    if (selectedSyllabusId) {
      setIsLoadingClasses(true);
      api.get<{results: MasterClass[] }>(`/master-classes/?syllabus_id=${selectedSyllabusId}`)
        .then(response => {
            setMasterClasses(response.results || []);
        })
        .catch(err => toast({ title: "Error", description: "Could not load classes for the selected syllabus.", variant: "destructive" }))
        .finally(() => setIsLoadingClasses(false));
    } else {
      setMasterClasses([]); // Clear classes if no syllabus is selected
    }
    // Reset selected classes when syllabus changes
    form.setValue('selected_class_ids', []);
  }, [selectedSyllabusId, form, toast]);


  const onSubmit = async (data: SchoolRegistrationFormValues) => {
    setIsLoading(true);
    const { admin_confirm_password, ...payload } = data;
    try {
      const newSchool = await api.post('/schools/', payload);
      toast({
        title: "School Registration Successful!",
        description: `${newSchool.name} has been registered. The initial admin account (${payload.admin_username}) has been created. Please log in.`,
      });
      router.push('/login');
    } catch (error: any) {
      let errorMessage = "An unknown error occurred.";
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object' && errorData !== null) {
            errorMessage = Object.entries(errorData).map(([key, value]) => `${key}: ${(Array.isArray(value) ? value.join(', ') : String(value))}`).join('; ');
        } else if (errorData.detail) {
            errorMessage = errorData.detail;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        title: "School Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative flex items-center justify-center min-h-screen overflow-hidden p-4 py-12">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
          poster="https://placehold.co/1920x1080.png"
          data-ai-hint="educational abstract technology"
        >
          <source src="/videos/educational-bg.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="absolute top-0 left-0 w-full h-full bg-black/50 dark:bg-black/60 z-10 backdrop-blur-sm"></div>
        
        <div className="relative z-20 w-full max-w-2xl">
          <Card className="w-full shadow-xl bg-card/80 backdrop-blur-md border-border/50 animate-fade-in-up">
              <CardHeader className="text-center">
              <SchoolIcon className="mx-auto h-12 w-12 text-primary mb-4" />
              <CardTitle className="text-3xl font-bold">Register Your School</CardTitle>
              <CardDescription>Join GenAI-Campus and create an admin account for your institution.</CardDescription>
              </CardHeader>
              <CardContent>
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  <h3 className="text-lg font-semibold flex items-center"><SchoolIcon className="mr-2 h-5 w-5 text-accent"/> School Details</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>School Name</FormLabel><FormControl><Input placeholder="e.g., Oakwood Academy" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="school_id_code" render={({ field }) => (<FormItem><FormLabel>School ID Code</FormLabel><FormControl><Input placeholder="Unique school identifier" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={form.control} name="official_email" render={({ field }) => (<FormItem><FormLabel>Official School Email</FormLabel><FormControl><Input type="email" placeholder="e.g., admin@oakwoodacademy.edu" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="license_number" render={({ field }) => (<FormItem><FormLabel>School License Number (Optional)</FormLabel><FormControl><Input placeholder="For verification" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="phone_number" render={({ field }) => (<FormItem><FormLabel>School Phone Number (Optional)</FormLabel><FormControl><Input placeholder="e.g., +1-555-123-4567" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>School Address (Optional)</FormLabel><FormControl><Textarea placeholder="Full school address" {...field} /></FormControl><FormMessage /></FormItem>)} />

                  <Separator className="my-6" />
                  <h3 className="text-lg font-semibold flex items-center"><UserCog className="mr-2 h-5 w-5 text-accent"/> Principal's Information (Optional)</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="principal_full_name" render={({ field }) => (<FormItem><FormLabel>Principal's Full Name</FormLabel><FormControl><Input placeholder="e.g., Dr. Jane Smith" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="principal_contact_number" render={({ field }) => (<FormItem><FormLabel>Principal's Contact Number</FormLabel><FormControl><Input placeholder="e.g., +1-555-987-6543" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={form.control} name="principal_email" render={({ field }) => (<FormItem><FormLabel>Principal's Email</FormLabel><FormControl><Input type="email" placeholder="e.g., principal@oakwoodacademy.edu" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  
                  <Separator className="my-6" />
                  <h3 className="text-lg font-semibold flex items-center"><Library className="mr-2 h-5 w-5 text-accent"/> Curriculum & Classes</h3>
                  <FormField control={form.control} name="syllabus_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select School Syllabus</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Choose a syllabus" /></SelectTrigger></FormControl>
                          <SelectContent>{syllabuses.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  {selectedSyllabusId && (
                    <FormField control={form.control} name="selected_class_ids" render={() => (
                      <FormItem>
                        <FormLabel>Select Classes to Offer</FormLabel>
                        {isLoadingClasses ? (
                          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/> Loading classes...</div>
                        ) : masterClasses.length > 0 ? (
                            <div className="space-y-2 border rounded-md p-4">
                              {masterClasses.map((item) => (
                                <FormField key={item.id} control={form.control} name="selected_class_ids" render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(String(item.id))}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), String(item.id)])
                                            : field.onChange((field.value || []).filter((value) => value !== String(item.id)) )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">{item.name}</FormLabel>
                                  </FormItem>
                                )}/>
                              ))}
                            </div>
                        ) : <p className="text-sm text-muted-foreground">No classes available for this syllabus.</p>}
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}


                  <Separator className="my-6" />
                  <h3 className="text-lg font-semibold flex items-center"><Lock className="mr-2 h-5 w-5 text-accent"/> Initial School Admin Account</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="admin_username" render={({ field }) => (<FormItem><FormLabel>Admin Username</FormLabel><FormControl><Input placeholder="Choose an admin username" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="admin_email" render={({ field }) => (<FormItem><FormLabel>Admin Email</FormLabel><FormControl><Input type="email" placeholder="Admin's email address" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                      <FormField control={form.control} name="admin_password" render={({ field }) => (<FormItem><FormLabel>Admin Password</FormLabel><FormControl><Input type="password" placeholder="Create a strong password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="admin_confirm_password" render={({ field }) => (<FormItem><FormLabel>Confirm Admin Password</FormLabel><FormControl><Input type="password" placeholder="Confirm admin password" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>

                  <Button type="submit" className="w-full !mt-8" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                      {isLoading ? 'Registering School...' : 'Register School & Create Admin'}
                  </Button>
                  </form>
              </Form>
              </CardContent>
              <CardFooter className="flex justify-center">
              <p className="text-sm text-muted-foreground">
                  Already registered or need to login?{' '}
                  <Link href="/login" legacyBehavior>
                  <a className="font-medium text-primary hover:underline">Login</a>
                  </Link>
              </p>
              </CardFooter>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}
