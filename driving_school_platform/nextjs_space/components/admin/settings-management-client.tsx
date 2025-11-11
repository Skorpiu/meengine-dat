/**
 * Settings Management Client Component
 * Full CRUD interface for system settings
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Plus, Edit, Trash2, Search, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SystemSetting {
  id: string;
  settingKey: string;
  settingValue: string;
  settingType: 'STRING' | 'INTEGER' | 'BOOLEAN' | 'JSON' | 'DECIMAL';
  description?: string;
  category?: string;
  isPublic: boolean;
  parsedValue?: any;
  createdAt: string;
  updatedAt: string;
}

export function SettingsManagementClient() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingSetting, setEditingSetting] = useState<SystemSetting | null>(null);
  const [formData, setFormData] = useState<{
    settingKey: string;
    settingValue: string;
    settingType: 'STRING' | 'INTEGER' | 'BOOLEAN' | 'JSON' | 'DECIMAL';
    description: string;
    category: string;
    isPublic: boolean;
  }>({
    settingKey: '',
    settingValue: '',
    settingType: 'STRING',
    description: '',
    category: '',
    isPublic: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      
      if (!response.ok) throw new Error('Failed to fetch settings');
      
      const data = await response.json();
      setSettings(data.settings || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create setting');
      }

      toast.success('Setting created successfully');
      setShowDialog(false);
      resetForm();
      fetchSettings();
    } catch (error: any) {
      console.error('Error creating setting:', error);
      toast.error(error.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingSetting) return;

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          settingKey: editingSetting.settingKey,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update setting');
      }

      toast.success('Setting updated successfully');
      setShowDialog(false);
      setEditingSetting(null);
      resetForm();
      fetchSettings();
    } catch (error: any) {
      console.error('Error updating setting:', error);
      toast.error(error.message);
    }
  };

  const handleDelete = async (settingKey: string) => {
    if (!confirm('Are you sure you want to delete this setting?')) return;

    try {
      const response = await fetch(`/api/admin/settings?key=${settingKey}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete setting');
      }

      toast.success('Setting deleted successfully');
      fetchSettings();
    } catch (error: any) {
      console.error('Error deleting setting:', error);
      toast.error(error.message);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingSetting(null);
    setShowDialog(true);
  };

  const openEditDialog = (setting: SystemSetting) => {
    setEditingSetting(setting);
    setFormData({
      settingKey: setting.settingKey,
      settingValue: setting.settingValue,
      settingType: setting.settingType,
      description: setting.description || '',
      category: setting.category || '',
      isPublic: setting.isPublic,
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      settingKey: '',
      settingValue: '',
      settingType: 'STRING',
      description: '',
      category: '',
      isPublic: false,
    });
  };

  const categories = Array.from(
    new Set(settings.map(s => s.category).filter(Boolean))
  ).sort();

  const filteredSettings = settings.filter(setting => {
    const matchesSearch = !searchQuery || 
      setting.settingKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      setting.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || setting.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const settingsByCategory = filteredSettings.reduce((acc, setting) => {
    const category = setting.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat || 'Uncategorized'}>
                  {cat || 'Uncategorized'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchSettings}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Setting
          </Button>
        </div>
      </div>

      {/* Settings by Category */}
      <div className="space-y-6">
        {Object.entries(settingsByCategory).map(([category, categorySettings]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {category}
              </CardTitle>
              <CardDescription>
                {categorySettings.length} setting{categorySettings.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categorySettings.map((setting) => (
                    <TableRow key={setting.id}>
                      <TableCell className="font-mono text-sm">
                        {setting.settingKey}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                          {setting.settingValue}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{setting.settingType}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-gray-600">
                        {setting.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={setting.isPublic ? 'default' : 'secondary'}>
                          {setting.isPublic ? 'Public' : 'Private'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(setting)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(setting.settingKey)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSetting ? 'Edit Setting' : 'Create New Setting'}
            </DialogTitle>
            <DialogDescription>
              {editingSetting ? 'Update system setting configuration' : 'Add a new system setting'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="settingKey">Setting Key *</Label>
              <Input
                id="settingKey"
                placeholder="e.g., max_lesson_duration"
                value={formData.settingKey}
                onChange={(e) => setFormData({ ...formData, settingKey: e.target.value })}
                disabled={!!editingSetting}
              />
              <p className="text-xs text-gray-500">
                Lowercase letters, numbers, and underscores only
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="settingType">Type *</Label>
                <Select
                  value={formData.settingType}
                  onValueChange={(value: any) => setFormData({ ...formData, settingType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STRING">String</SelectItem>
                    <SelectItem value="INTEGER">Integer</SelectItem>
                    <SelectItem value="BOOLEAN">Boolean</SelectItem>
                    <SelectItem value="JSON">JSON</SelectItem>
                    <SelectItem value="DECIMAL">Decimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., general, lessons"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="settingValue">Value *</Label>
              <Textarea
                id="settingValue"
                placeholder="Enter setting value"
                value={formData.settingValue}
                onChange={(e) => setFormData({ ...formData, settingValue: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this setting controls"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
              />
              <Label htmlFor="isPublic" className="cursor-pointer">
                Make this setting publicly accessible (via API)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editingSetting ? handleUpdate : handleCreate}>
              {editingSetting ? 'Update Setting' : 'Create Setting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
