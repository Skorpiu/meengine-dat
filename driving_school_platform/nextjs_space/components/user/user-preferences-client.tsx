/**
 * User Preferences Client Component
 * Allows users to customize their experience
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Eye, 
  Palette, 
  Calendar, 
  Globe, 
  Accessibility, 
  Save,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UserPreferences {
  id: string;
  userId: string;
  theme: string;
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  lessonReminders: boolean;
  examReminders: boolean;
  paymentReminders: boolean;
  promotionalEmails: boolean;
  weeklyDigest: boolean;
  defaultDashboardView: string;
  showCompletedLessons: boolean;
  lessonDisplayCount: number;
  calendarView: string;
  startOfWeek: string;
  timeFormat: string;
  profileVisibility: string;
  showProgressToInstructors: boolean;
  allowContactFromInstructors: boolean;
  fontSize: string;
  highContrast: boolean;
  reducedMotion: boolean;
}

export function UserPreferencesClient() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/preferences');
      
      if (!response.ok) throw new Error('Failed to fetch preferences');
      
      const data = await response.json();
      setPreferences(data.preferences);
      setHasChanges(false);
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preferences');
      }

      toast.success('Preferences saved successfully');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load preferences</p>
        <Button onClick={fetchPreferences} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Button (Sticky) */}
      {hasChanges && (
        <div className="fixed bottom-8 right-8 z-50">
          <Button onClick={handleSave} disabled={saving} size="lg" className="shadow-lg">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}

      {/* Interface Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Interface & Appearance
          </CardTitle>
          <CardDescription>
            Customize how the platform looks and feels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={preferences.theme}
                onValueChange={(value) => updatePreference('theme', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="auto">Auto (System)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={preferences.language}
                onValueChange={(value) => updatePreference('language', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                  <SelectItem value="pt">🇵🇹 Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Control how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="emailNotifications">Email Notifications</Label>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <Switch
                id="emailNotifications"
                checked={preferences.emailNotifications}
                onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="pushNotifications">Push Notifications</Label>
                <p className="text-sm text-gray-500">Receive browser push notifications</p>
              </div>
              <Switch
                id="pushNotifications"
                checked={preferences.pushNotifications}
                onCheckedChange={(checked) => updatePreference('pushNotifications', checked)}
              />
            </div>

            <Separator />

            <div className="pl-6 space-y-4">
              <p className="text-sm font-medium text-gray-700">Notification Types</p>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="lessonReminders">Lesson Reminders</Label>
                <Switch
                  id="lessonReminders"
                  checked={preferences.lessonReminders}
                  onCheckedChange={(checked) => updatePreference('lessonReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="examReminders">Exam Reminders</Label>
                <Switch
                  id="examReminders"
                  checked={preferences.examReminders}
                  onCheckedChange={(checked) => updatePreference('examReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="paymentReminders">Payment Reminders</Label>
                <Switch
                  id="paymentReminders"
                  checked={preferences.paymentReminders}
                  onCheckedChange={(checked) => updatePreference('paymentReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="weeklyDigest">Weekly Digest</Label>
                <Switch
                  id="weeklyDigest"
                  checked={preferences.weeklyDigest}
                  onCheckedChange={(checked) => updatePreference('weeklyDigest', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="promotionalEmails">Promotional Emails</Label>
                <Switch
                  id="promotionalEmails"
                  checked={preferences.promotionalEmails}
                  onCheckedChange={(checked) => updatePreference('promotionalEmails', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Dashboard & Display
          </CardTitle>
          <CardDescription>
            Customize your dashboard experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="defaultDashboardView">Default Dashboard View</Label>
              <Select
                value={preferences.defaultDashboardView}
                onValueChange={(value) => updatePreference('defaultDashboardView', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="calendar">Calendar</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Lessons to Display: {preferences.lessonDisplayCount}</Label>
              <Slider
                min={3}
                max={20}
                step={1}
                value={[preferences.lessonDisplayCount]}
                onValueChange={(value) => updatePreference('lessonDisplayCount', value[0])}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showCompletedLessons">Show Completed Lessons</Label>
              <p className="text-sm text-gray-500">Display completed lessons on dashboard</p>
            </div>
            <Switch
              id="showCompletedLessons"
              checked={preferences.showCompletedLessons}
              onCheckedChange={(checked) => updatePreference('showCompletedLessons', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Calendar Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendar Settings
          </CardTitle>
          <CardDescription>
            Configure calendar display preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="calendarView">Default Calendar View</Label>
              <Select
                value={preferences.calendarView}
                onValueChange={(value) => updatePreference('calendarView', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startOfWeek">Week Starts On</Label>
              <Select
                value={preferences.startOfWeek}
                onValueChange={(value) => updatePreference('startOfWeek', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday">Monday</SelectItem>
                  <SelectItem value="sunday">Sunday</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeFormat">Time Format</Label>
              <Select
                value={preferences.timeFormat}
                onValueChange={(value) => updatePreference('timeFormat', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Privacy & Sharing
          </CardTitle>
          <CardDescription>
            Control your privacy and information sharing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profileVisibility">Profile Visibility</Label>
            <Select
              value={preferences.profileVisibility}
              onValueChange={(value) => updatePreference('profileVisibility', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public - Anyone can see</SelectItem>
                <SelectItem value="school">School Only - Only school members</SelectItem>
                <SelectItem value="private">Private - Hidden from others</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="showProgressToInstructors">Show Progress to Instructors</Label>
              <p className="text-sm text-gray-500">Allow instructors to see your learning progress</p>
            </div>
            <Switch
              id="showProgressToInstructors"
              checked={preferences.showProgressToInstructors}
              onCheckedChange={(checked) => updatePreference('showProgressToInstructors', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="allowContactFromInstructors">Allow Contact from Instructors</Label>
              <p className="text-sm text-gray-500">Instructors can send you direct messages</p>
            </div>
            <Switch
              id="allowContactFromInstructors"
              checked={preferences.allowContactFromInstructors}
              onCheckedChange={(checked) => updatePreference('allowContactFromInstructors', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Accessibility Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="w-5 h-5" />
            Accessibility
          </CardTitle>
          <CardDescription>
            Adjust accessibility settings for better usability
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fontSize">Font Size</Label>
            <Select
              value={preferences.fontSize}
              onValueChange={(value) => updatePreference('fontSize', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium (Default)</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="highContrast">High Contrast Mode</Label>
              <p className="text-sm text-gray-500">Increase contrast for better visibility</p>
            </div>
            <Switch
              id="highContrast"
              checked={preferences.highContrast}
              onCheckedChange={(checked) => updatePreference('highContrast', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reducedMotion">Reduced Motion</Label>
              <p className="text-sm text-gray-500">Minimize animations and transitions</p>
            </div>
            <Switch
              id="reducedMotion"
              checked={preferences.reducedMotion}
              onCheckedChange={(checked) => updatePreference('reducedMotion', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button (Bottom) */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || !hasChanges} size="lg">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}
