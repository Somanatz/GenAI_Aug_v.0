// src/app/parent/settings/page.tsx
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, UserCircle, Users, Palette } from "lucide-react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from '@/context/ThemeContext'; // Import useTheme


export default function ParentSettingsPage() {
  const { theme, setTheme } = useTheme(); // Use the theme context

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="text-center py-8">
        <Settings className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold">Parent Settings</h1>
        <p className="text-lg text-muted-foreground mt-2">Manage your account, notifications, and linked children.</p>
      </header>

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="mr-2 text-accent" /> Notification Preferences</CardTitle>
          <CardDescription>Control how you receive updates about your children's progress and school announcements.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="email-updates" className="font-medium">Email Updates</Label>
              <p className="text-sm text-muted-foreground">Receive weekly progress summaries and important alerts via email.</p>
            </div>
            <Switch id="email-updates" defaultChecked />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="app-notifications" className="font-medium">In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">Get real-time alerts within the GenAI-Campus platform.</p>
            </div>
            <Switch id="app-notifications" defaultChecked />
          </div>
          <div className="space-y-2">
            <Label>Notify me immediately for:</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="notify-grades" defaultChecked/>
                <Label htmlFor="notify-grades">New Grades/Report Cards</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="notify-teacher-msg" defaultChecked/>
                <Label htmlFor="notify-teacher-msg">Messages from Teachers</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="notify-attendance"/>
                <Label htmlFor="notify-attendance">Attendance Issues</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="notify-urgent-school"/>
                <Label htmlFor="notify-urgent-school">Urgent School Announcements</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><Users className="mr-2 text-accent" /> Child Management</CardTitle>
          <CardDescription>View and manage children linked to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild className="w-full">
            <Link href="/parent/children">Go to My Children Page</Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Here you can add new children or modify settings for existing linked profiles.</p>
        </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><UserCircle className="mr-2 text-accent" /> Account Settings</CardTitle>
          <CardDescription>Manage your personal account details and security.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild className="w-full">
            <Link href="/profile">Go to My Profile (Edit Name, Email, Password)</Link>
          </Button>
        </CardContent>
      </Card>

       <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 text-accent" /> Appearance</CardTitle>
          <CardDescription>Customize the look and feel of your dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div>
            <Label htmlFor="theme-select-parent">Theme</Label>
            <Select value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
              <SelectTrigger id="theme-select-parent">
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
