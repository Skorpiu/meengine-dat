/**
 * Feature Flags Management Client Component
 * Interface for managing feature flags and A/B testing
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
import { Slider } from '@/components/ui/slider';
import { Flag, Plus, Edit, Trash2, Search, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FeatureFlag {
  id: string;
  flagKey: string;
  flagName: string;
  description?: string;
  isEnabled: boolean;
  enabledForRoles: string[];
  enabledForUsers: string[];
  rolloutPercent: number;
  environment: string;
  category?: string;
  tags: string[];
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function FeatureFlagsClient() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [formData, setFormData] = useState<{
    flagKey: string;
    flagName: string;
    description: string;
    isEnabled: boolean;
    enabledForRoles: string[];
    rolloutPercent: number;
    environment: string;
    category: string;
    tags: string[];
    expiresAt: string;
  }>({
    flagKey: '',
    flagName: '',
    description: '',
    isEnabled: false,
    enabledForRoles: [],
    rolloutPercent: 0,
    environment: 'production',
    category: '',
    tags: [],
    expiresAt: '',
  });

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/feature-flags');
      
      if (!response.ok) throw new Error('Failed to fetch flags');
      
      const data = await response.json();
      setFlags(data.flags || []);
    } catch (error) {
      console.error('Error fetching flags:', error);
      toast.error('Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          expiresAt: formData.expiresAt || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create flag');
      }

      toast.success('Feature flag created successfully');
      setShowDialog(false);
      resetForm();
      fetchFlags();
    } catch (error: any) {
      console.error('Error creating flag:', error);
      toast.error(error.message);
    }
  };

  const handleUpdate = async () => {
    if (!editingFlag) return;

    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          flagKey: editingFlag.flagKey,
          expiresAt: formData.expiresAt || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update flag');
      }

      toast.success('Feature flag updated successfully');
      setShowDialog(false);
      setEditingFlag(null);
      resetForm();
      fetchFlags();
    } catch (error: any) {
      console.error('Error updating flag:', error);
      toast.error(error.message);
    }
  };

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flagKey: flag.flagKey,
          isEnabled: !flag.isEnabled,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle flag');
      }

      toast.success(`Feature flag ${!flag.isEnabled ? 'enabled' : 'disabled'}`);
      fetchFlags();
    } catch (error: any) {
      console.error('Error toggling flag:', error);
      toast.error(error.message);
    }
  };

  const handleDelete = async (flagKey: string) => {
    if (!confirm('Are you sure you want to delete this feature flag?')) return;

    try {
      const response = await fetch(`/api/admin/feature-flags?key=${flagKey}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete flag');
      }

      toast.success('Feature flag deleted successfully');
      fetchFlags();
    } catch (error: any) {
      console.error('Error deleting flag:', error);
      toast.error(error.message);
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingFlag(null);
    setShowDialog(true);
  };

  const openEditDialog = (flag: FeatureFlag) => {
    setEditingFlag(flag);
    setFormData({
      flagKey: flag.flagKey,
      flagName: flag.flagName,
      description: flag.description || '',
      isEnabled: flag.isEnabled,
      enabledForRoles: flag.enabledForRoles,
      rolloutPercent: flag.rolloutPercent,
      environment: flag.environment,
      category: flag.category || '',
      tags: flag.tags,
      expiresAt: flag.expiresAt ? flag.expiresAt.split('T')[0] : '',
    });
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      flagKey: '',
      flagName: '',
      description: '',
      isEnabled: false,
      enabledForRoles: [],
      rolloutPercent: 0,
      environment: 'production',
      category: '',
      tags: [],
      expiresAt: '',
    });
  };

  const categories = Array.from(
    new Set(flags.map(f => f.category).filter(Boolean))
  ).sort();

  const filteredFlags = flags.filter(flag => {
    const matchesSearch = !searchQuery || 
      flag.flagKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.flagName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || flag.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
              placeholder="Search feature flags..."
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
          <Button variant="outline" size="icon" onClick={fetchFlags}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Feature Flag
          </Button>
        </div>
      </div>

      {/* Feature Flags Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5" />
            Feature Flags
          </CardTitle>
          <CardDescription>
            {filteredFlags.length} flag{filteredFlags.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>Rollout</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Targeting</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFlags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggle(flag)}
                      className={flag.isEnabled ? 'text-green-600' : 'text-gray-400'}
                    >
                      {flag.isEnabled ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{flag.flagName}</div>
                      <div className="text-xs text-gray-500 font-mono">{flag.flagKey}</div>
                      {flag.description && (
                        <div className="text-xs text-gray-600 mt-1">{flag.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">{flag.rolloutPercent}%</div>
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{ width: `${flag.rolloutPercent}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{flag.environment}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {flag.enabledForRoles.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {flag.enabledForRoles.length} role{flag.enabledForRoles.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {flag.enabledForUsers.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {flag.enabledForUsers.length} user{flag.enabledForUsers.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {flag.enabledForRoles.length === 0 && flag.enabledForUsers.length === 0 && (
                        <span className="text-xs text-gray-500">All users</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {flag.expiresAt ? (
                      <span className="text-xs">
                        {new Date(flag.expiresAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Never</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(flag)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(flag.flagKey)}
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

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingFlag ? 'Edit Feature Flag' : 'Create New Feature Flag'}
            </DialogTitle>
            <DialogDescription>
              {editingFlag ? 'Update feature flag configuration' : 'Add a new feature flag'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flagKey">Flag Key *</Label>
              <Input
                id="flagKey"
                placeholder="e.g., enable_new_dashboard"
                value={formData.flagKey}
                onChange={(e) => setFormData({ ...formData, flagKey: e.target.value })}
                disabled={!!editingFlag}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="flagName">Flag Name *</Label>
              <Input
                id="flagName"
                placeholder="e.g., Enable New Dashboard"
                value={formData.flagName}
                onChange={(e) => setFormData({ ...formData, flagName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe this feature flag"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="environment">Environment</Label>
                <Select
                  value={formData.environment}
                  onValueChange={(value) => setFormData({ ...formData, environment: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., ui, api, experimental"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rolloutPercent">
                Rollout Percentage: {formData.rolloutPercent}%
              </Label>
              <Slider
                id="rolloutPercent"
                min={0}
                max={100}
                step={5}
                value={[formData.rolloutPercent]}
                onValueChange={(value) => setFormData({ ...formData, rolloutPercent: value[0] })}
              />
              <p className="text-xs text-gray-500">
                Percentage of users who will see this feature
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isEnabled"
                checked={formData.isEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
              />
              <Label htmlFor="isEnabled" className="cursor-pointer">
                Enable this feature flag
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={editingFlag ? handleUpdate : handleCreate}>
              {editingFlag ? 'Update Flag' : 'Create Flag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
