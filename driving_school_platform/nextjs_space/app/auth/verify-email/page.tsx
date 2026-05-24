"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Car } from "lucide-react";
import { LanguageSelector } from "@/components/language-selector";

type VerifyState = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token")?.trim() ?? "";
  const startedRef = useRef(false);

  const [state, setState] = useState<VerifyState>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (startedRef.current) {
      return;
    }
    startedRef.current = true;

    if (!token) {
      setState("error");
      setError("Missing verification token. Use the link from your email.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/auth/email-verification/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = (await res.json()) as {
          success?: boolean;
          message?: string;
          error?: string;
        };

        if (!res.ok) {
          setState("error");
          setError(data.error ?? "Could not verify email. Try again.");
          return;
        }

        setState("success");
      } catch {
        setState("error");
        setError("An unexpected error occurred. Please try again.");
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-driving-primary rounded-full p-4">
              <Car className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Driving School Academy
            </h1>
            <p className="text-gray-600 mt-2">Email verification</p>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              Verify your email
            </CardTitle>
            <CardDescription className="text-center">
              {state === "loading"
                ? "Confirming your email address..."
                : state === "success"
                  ? "Your email is verified."
                  : "Verification could not be completed."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state === "loading" && (
              <p className="text-center text-gray-600 text-sm">Please wait.</p>
            )}

            {state === "success" && (
              <>
                <Alert>
                  <AlertDescription>
                    Your email has been verified. You can sign in to your
                    account.
                  </AlertDescription>
                </Alert>
                <Button asChild className="w-full h-11 bg-driving-primary">
                  <Link href="/auth/login">Go to sign in</Link>
                </Button>
              </>
            )}

            {state === "error" && (
              <>
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button asChild variant="outline" className="w-full h-11">
                  <Link href="/auth/resend-verification">
                    Request a new verification email
                  </Link>
                </Button>
              </>
            )}

            <div className="text-center">
              <Link
                href="/auth/login"
                className="text-sm text-driving-primary hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
