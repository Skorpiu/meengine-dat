

/**
 * License Management Page
 * 
 * Admin interface for managing premium features and license keys
 */

'use client';

import { useState } from 'react';
import { useLicense } from '@/hooks/use-license';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Key, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Navbar } from '@/components/navigation/navbar';

export default function LicenseManagementPage() {
  const { license, features, isLoading, toggleFeature, activateLicense } = useLicense();
  const { toast } = useToast();
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [togglingFeature, setTogglingFeature] = useState<string | null>(null);

  // Handle license key activation
  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a license key',
        variant: 'destructive',
      });
      return;
    }

    setActivating(true);

    try {
      const result = await activateLicense(licenseKey);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message || 'License activated successfully',
        });
        setLicenseKey('');
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to activate license',
          variant: 'destructive',
        });
      }
    } finally {
      setActivating(false);
    }
  };

  // Handle feature toggle
  const handleToggleFeature = async (featureKey: string, currentlyEnabled: boolean) => {
    setTogglingFeature(featureKey);

    try {
      const result = await toggleFeature(featureKey, !currentlyEnabled);

      if (result.success) {
        toast({
          title: 'Success',
          description: `Feature ${!currentlyEnabled ? 'enabled' : 'disabled'} successfully`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to update feature',
          variant: 'destructive',
        });
      }
    } finally {
      setTogglingFeature(null);
    }
  };

  if (isLoading) {
    return (
      <>
        <Navbar currentPage="license" />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </>
    );
  }

  // premium features
  const premiumFeatures = features.filter((f: any) => f.category === 'PREMIUM');
  const enabledCount = premiumFeatures.filter((f: any) => f.isEnabled).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="license" />
      
      <div className="container mx-auto py-8 space-y-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div>
          <h1 className="text-3xl font-bold">License Management</h1>
          <p className="text-muted-foreground">
            Manage premium features and activate license keys
          </p>
        </div>

        {/* Organization Info */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Organization Name</Label>
                <p className="font-medium">{license?.organizationName || 'Not Set'}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Subscription Tier</Label>
                <Badge variant={license?.subscriptionTier === 'PREMIUM' ? 'default' : 'secondary'}>
                  {license?.subscriptionTier || 'BASE'}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Active Premium Features</Label>
              <p className="font-medium">
                {enabledCount} / {premiumFeatures.length} features enabled
              </p>
            </div>
          </CardContent>
        </Card>

        {/* License Key Activation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Activate License Key
            </CardTitle>
            <CardDescription>
              Enter a license key to unlock premium features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter license key (e.g., LIC-XXXX-XXXX-XXXX)"
                  value={licenseKey}
                  onChange={(e: any) => setLicenseKey(e.target.value.toUpperCase())}
                  disabled={activating}
                />
              </div>
              <Button
                onClick={handleActivateLicense}
                disabled={activating || !licenseKey.trim()}
              >
                {activating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  'Activate'
                )}
              </Button>
            </div>
            <Alert>
              <AlertTitle>How to get a license key?</AlertTitle>
              <AlertDescription>
                Contact your sales representative or visit our website to purchase premium features.
                Each license key can unlock one or more features.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Premium Features */}
        <Card>
          <CardHeader>
            <CardTitle>Premium Features</CardTitle>
            <CardDescription>
              Toggle premium features on or off (requires manual activation by administrator)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {premiumFeatures.map((feature: any, index: number) => (
                <div key={feature.key}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{feature.icon}</span>
                        <h3 className="font-semibold">{feature.name}</h3>
                        {feature.isEnabled ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="mr-1 h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {togglingFeature === feature.key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Switch
                          checked={feature.isEnabled}
                          onCheckedChange={() => handleToggleFeature(feature.key, feature.isEnabled)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Feature Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {premiumFeatures.map((feature: any) => (
                <div
                  key={feature.key}
                  className={`p-4 border rounded-lg ${
                    feature.isEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{feature.icon}</span>
                    {feature.isEnabled ? (
                      <Unlock className="h-4 w-4 text-green-600" />
                    ) : (
                      <Lock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm font-medium">{feature.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
