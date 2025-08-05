// src/components/shared/ContactSalesForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, School, User, Mail, MapPin, Mailbox } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';

const contactSalesSchema = z.object({
  schoolName: z.string().min(1, 'School name is required'),
  contactPerson: z.string().min(1, 'Contact person name is required'),
  email: z.string().email('Invalid email address'),
  schoolAddress: z.string().optional(),
  zipCode: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').optional(),
});

type ContactSalesFormValues = z.infer<typeof contactSalesSchema>;

export default function ContactSalesForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ContactSalesFormValues>({
    resolver: zodResolver(contactSalesSchema),
    defaultValues: {
      schoolName: '',
      contactPerson: '',
      email: '',
      schoolAddress: '',
      zipCode: '',
      message: '',
    },
  });

  const onSubmit = async (data: ContactSalesFormValues) => {
    setIsSubmitting(true);
    try {
      // The fourth parameter `false` indicates that authentication is not required for this endpoint.
      await api.post('/contact-sales/', data, false, false);
      toast({
        title: 'Inquiry Sent!',
        description: 'Thank you for your interest. Our team will contact you shortly.',
      });
      form.reset();
    } catch (error: any) {
        toast({
            title: 'Submission Failed',
            description: error.message || 'Could not send inquiry. Please try again later.',
            variant: 'destructive',
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 bg-card rounded-xl shadow-xl border border-border">
      <h3 className="text-2xl font-poppins font-semibold mb-3 text-primary flex items-center">
        <School className="mr-3 h-7 w-7" /> Interested in GenAI-Campus for Your School?
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        Fill out the form below, and our sales team will get in touch to discuss how we can tailor our platform to your needs.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="schoolName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><School className="mr-2 h-4 w-4 text-muted-foreground"/>School Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your School's Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center"><User className="mr-2 h-4 w-4 text-muted-foreground"/>Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="Full Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground"/>Email Address</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="your.email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="schoolAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><MapPin className="mr-2 h-4 w-4 text-muted-foreground"/>School Address (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="123 Education Lane, City, State" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="zipCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center"><Mailbox className="mr-2 h-4 w-4 text-muted-foreground"/>Zip Code (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 90210" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Tell us a bit about your school or any specific questions..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto text-base py-3 px-6">
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
            Send Inquiry
          </Button>
        </form>
      </Form>
    </div>
  );
}
