// src/app/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { loginUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { LogIn, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/layout/Footer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login: authLogin, currentUser, isLoadingAuth } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isLoadingAuth && currentUser) {
      router.push('/');
    }
  }, [currentUser, isLoadingAuth, router]);

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    setLoginError(null);
    try {
      const loginResponse = await loginUser(data);
      if (loginResponse && loginResponse.token) {
        await authLogin(loginResponse.token);
        toast({
          title: "Login Successful",
          description: `Welcome back! Redirecting...`,
        });
        router.push('/');
      } else {
         setLoginError("Invalid username or password. Please try again.");
      }
    } catch (error: any) {
      if (error.message.includes("not active")) {
          setLoginError("Your account is not active. Please check your email for a verification link.");
      } else {
          setLoginError(error.message || "Invalid username or password. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAuth || (!isLoadingAuth && currentUser)) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <div className="relative flex flex-col md:flex-row items-center justify-center min-h-screen overflow-hidden p-4">
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

        <div className="relative z-20 flex flex-col md:flex-row w-full max-w-5xl xl:max-w-6xl mx-auto items-center md:space-x-10 lg:space-x-16">
          <div className="w-full md:w-2/5 flex-shrink-0 mb-12 md:mb-0 text-center md:text-left">
            <h1 className="text-5xl lg:text-6xl font-poppins font-extrabold text-primary-foreground [text-shadow:_3px_3px_8px_rgb(0_0_0_/_0.6)] animation-delay-100">
              GenAI-Campus
            </h1>
            <p className="text-xl lg:text-2xl text-primary-foreground/80 mt-4 [text-shadow:_2px_2px_6px_rgb(0_0_0_/_0.5)] animation-delay-300">
              Unlock Your Potential, One Step at a Time.
            </p>
          </div>

          <div className="w-full md:w-3/5 flex justify-center md:justify-start lg:justify-center">
            <Card className="w-full max-w-sm shadow-xl bg-card animate-slide-in-from-right animation-delay-200 p-2 rounded-xl">
              <CardHeader className="text-center pt-6 pb-4">
                <LogIn className="mx-auto h-10 w-10 text-primary mb-3" />
                <CardTitle className="text-3xl font-bold">Welcome Back!</CardTitle>
                <CardDescription>Log in to your GenAI-Campus account.</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {loginError && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Login Failed</AlertTitle>
                        <AlertDescription>{loginError}</AlertDescription>
                      </Alert>
                    )}
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Log In'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="flex flex-col items-center space-y-2 pt-4 pb-6">
                  <p className="text-sm text-muted-foreground">
                      {/* Forgot your password? <Link href="/forgot-password"><a className="text-primary hover:underline">Reset it here</a></Link> */}
                  </p>
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link href="/signup" legacyBehavior>
                    <a className="font-medium text-primary hover:underline">Sign up</a>
                  </Link>
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
