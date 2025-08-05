// src/app/student/settings/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, UserCircle, Palette } from "lucide-react";
import Link from "next/link";
import { useTheme } from '@/context/ThemeContext'; // Import useTheme

export default function StudentSettingsPage() {
  const { theme, setTheme } = useTheme(); // Use the theme context

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="text-center py-8">
        <Settings className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold">Student Settings</h1>
        <p className="text-lg text-muted-foreground mt-2">Customize your learning experience and account preferences.</p>
      </header>

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="mr-2 text-accent" /> Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <Label htmlFor="email-lesson-updates" className="font-medium">New Lesson Notifications</Label>
            <Switch id="email-lesson-updates" defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <Label htmlFor="app-quiz-reminders" className="font-medium">Quiz Reminders</Label>
            <Switch id="app-quiz-reminders" />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><UserCircle className="mr-2 text-accent" /> Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild className="w-full">
            <Link href="/profile">Go to My Profile (Edit Name, Email, Password)</Link>
          </Button>
        </CardContent>
      </Card>

      <Separator />

       <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 text-accent" /> Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
           <div>
            <Label htmlFor="theme-select-student">Theme</Label>
            <Select value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
              <SelectTrigger id="theme-select-student">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System Default</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="text-center mt-8">
        <Button size="lg">Save All Settings</Button>
      </div>
    </div>
  );
}
