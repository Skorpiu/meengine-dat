"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Car, Eye, EyeOff } from "lucide-react";

type InvitationPreview = {
  email: string;
  role: string;
  organizationName: string;
  expiresAt: string;
};

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token")?.trim() ?? "";

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  const loadPreview = useCallback(async () => {
    if (!token) {
      setLoadError(
        "Missing invitation token. Use the link from your driving school.",
      );
      setLoadingPreview(false);
      return;
    }

    setLoadingPreview(true);
    setLoadError("");

    try {
      const res = await fetch(
        `/api/invitations/accept?token=${encodeURIComponent(token)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setLoadError(data.error ?? "This invitation is not valid.");
        setPreview(null);
        return;
      }

      setPreview(data.invitation);
    } catch {
      setLoadError("Could not load invitation. Please try again.");
    } finally {
      setLoadingPreview(false);
    }
  }, [token]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          firstName,
          lastName,
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "Could not accept invitation.");
        return;
      }

      setSuccess(true);
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-driving-primary rounded-full p-4">
              <Car className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Accept invitation
            </h1>
            <p className="text-gray-600 mt-2">
              Complete your account for your driving school
            </p>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Invitation</CardTitle>
            <CardDescription>
              {loadingPreview
                ? "Loading invitation…"
                : preview
                  ? `Join ${preview.organizationName}`
                  : "Invitation details"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadError && (
              <Alert variant="destructive">
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            )}

            {success && (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Your account was created. Sign in with your email and
                    password.
                  </AlertDescription>
                </Alert>
                <Button asChild className="w-full">
                  <Link href="/auth/login">Go to login</Link>
                </Button>
              </div>
            )}

            {!success && preview && !loadError && (
              <>
                <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                  <p>
                    <span className="font-medium">Email:</span> {preview.email}
                  </p>
                  <p>
                    <span className="font-medium">Role:</span> {preview.role}
                  </p>
                  <p>
                    <span className="font-medium">Organization:</span>{" "}
                    {preview.organizationName}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {submitError && (
                    <Alert variant="destructive">
                      <AlertDescription>{submitError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? "Creating account…" : "Accept invitation"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-600">Loading invitation…</p>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
