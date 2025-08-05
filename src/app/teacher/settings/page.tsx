// src/app/teacher/settings/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, UserCircle, Palette } from "lucide-react"; // Removed BookOpen
import Link from "next/link";
import { useTheme } from '@/context/ThemeContext'; // Import useTheme

export default function TeacherSettingsPage() {
  const { theme, setTheme } = useTheme(); // Use the theme context

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="text-center py-8">
        <Settings className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold">Teacher Settings</h1>
        <p className="text-lg text-muted-foreground mt-2">Customize your teaching environment and preferences.</p>
      </header>

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="mr-2 text-accent" /> Notification Preferences</CardTitle>
          <CardDescription>Manage how you receive notifications from the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive updates via email for new submissions, messages, etc.</p>
            </div>
            <Switch id="email-notifications" defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="push-notifications" className="font-medium">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">Get real-time alerts on your browser/app.</p>
            </div>
            <Switch id="push-notifications" />
          </div>
          <div className="space-y-2">
            <Label>Notify me for:</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="notify-submissions" defaultChecked/>
                <Label htmlFor="notify-submissions">New Assignment Submissions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="notify-messages" defaultChecked/>
                <Label htmlFor="notify-messages">New Messages from Students/Parents</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="notify-forum"/>
                <Label htmlFor="notify-forum">Forum Activity in My Classes</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><UserCircle className="mr-2 text-accent" /> Account Settings</CardTitle>
          <CardDescription>Manage your personal account details and security.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" asChild className="w-full">
            <Link href="/profile">Go to My Profile (Edit Name, Email, Password)</Link>
          </Button>
          <div>
            <Label htmlFor="default-class">Default Class for New Content</Label>
            <Select>
              <SelectTrigger id="default-class">
                <SelectValue placeholder="Select a default class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="class5a">Class 5A</SelectItem>
                <SelectItem value="class5b">Class 5B</SelectItem>
                <SelectItem value="class4">Class 4</SelectItem>
                <SelectItem value="none">None (Ask each time)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Separator />

       <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 text-accent" /> Appearance</CardTitle>
          <CardDescription>Customize the look and feel of your dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div>
            <Label htmlFor="theme-select-teacher">Theme</Label>
            <Select value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
              <SelectTrigger id="theme-select-teacher">
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
