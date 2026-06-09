/**
 * School-facing plan and licensed modules (read-only).
 * Operator activation and entitlement changes use internal/ops paths.
 */

"use client";

import { useLicense } from "@/hooks/use-license";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Lock,
  Unlock,
  Info,
} from "lucide-react";
import { Navbar } from "@/components/navigation/navbar";

export default function LicenseManagementPage() {
  const { license, features, isLoading } = useLicense();

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

  const premiumFeatures = features.filter((f) => f.category === "PREMIUM");
  const enabledCount = premiumFeatures.filter((f) => f.isEnabled).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="license" />

      <div className="container mx-auto py-8 space-y-8 px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold">Plan & features</h1>
            <p className="text-muted-foreground">
              View your school&apos;s current plan and which modules are active.
            </p>
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Plan changes are managed by your provider</AlertTitle>
            <AlertDescription>
              Module access and plan upgrades are configured by your software
              provider. To add or change modules, contact your provider or
              support team.
            </AlertDescription>
          </Alert>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organization Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">
                  Organization Name
                </Label>
                <p className="font-medium">
                  {license?.organizationName || "Not Set"}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">
                  Subscription Tier
                </Label>
                <Badge
                  variant={
                    license?.subscriptionTier === "PREMIUM"
                      ? "default"
                      : "secondary"
                  }
                >
                  {license?.subscriptionTier || "BASE"}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">
                Active Premium Features
              </Label>
              <p className="font-medium">
                {enabledCount} / {premiumFeatures.length} features enabled
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modules & features</CardTitle>
            <CardDescription>
              Licensed modules included in your plan. Status reflects what is
              currently active for your school.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-4">
              {premiumFeatures.map((feature, index) => (
                <div key={feature.key}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-2xl">{feature.icon}</span>
                        <h3 className="font-semibold">{feature.name}</h3>
                        {feature.isEnabled ? (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800"
                          >
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
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                    <div className="shrink-0 pt-1">
                      {feature.isEnabled ? (
                        <Unlock className="h-5 w-5 text-green-600" />
                      ) : (
                        <Lock className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {premiumFeatures.map((feature) => (
                <div
                  key={`summary-${feature.key}`}
                  className={`p-4 border rounded-lg ${
                    feature.isEnabled
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200"
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
                  <p className="text-xs text-muted-foreground mt-1">
                    {feature.isEnabled ? "Active" : "Inactive"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
