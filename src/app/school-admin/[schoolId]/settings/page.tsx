// src/app/school-admin/[schoolId]/settings/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, Palette } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from '@/context/ThemeContext'; // Import useTheme

export default function SchoolAdminSettingsPage() {
  const params = useParams();
  const schoolId = params.schoolId;
  const { theme, setTheme } = useTheme(); // Use the theme context

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center">
        <Settings className="mr-3 text-primary" /> School Settings (ID: {schoolId})
      </h1>
      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle>School Configuration</CardTitle>
          <CardDescription>Manage general settings, academic years, and integration options for your school.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">School setting options will be available here.</p>
          {/* TODO: Form to update school details, manage academic terms, etc. */}
          <Button className="mt-4">Save School Settings</Button>
        </CardContent>
      </Card>

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 text-accent" /> Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the admin dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div>
            <Label htmlFor="theme-select-school-admin">Theme</Label>
            <Select value={theme} onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}>
              <SelectTrigger id="theme-select-school-admin">
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
    </div>
  );
}
