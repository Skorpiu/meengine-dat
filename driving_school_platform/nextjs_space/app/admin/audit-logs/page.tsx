import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/navigation/navbar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { AuditLogsClient } from "@/components/admin/audit-logs-client";

export const dynamic = "force-dynamic";

export default async function AdminAuditLogsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar currentPage="audit-logs" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Audit logs</h1>
            <p className="text-gray-600 mt-2">
              Read-only tenant audit history for school administration actions.
              This view does not resolve entity IDs into names or emails.
            </p>
          </div>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Internal / operator area</AlertTitle>
            <AlertDescription>
              This page is internal tooling and is not linked from the main
              school admin navigation. Access it directly at{" "}
              <span className="font-mono text-sm">/admin/audit-logs</span>. CSV
              export respects the active filters and privacy-minimal fields
              only. Platform-wide viewers are deferred.
            </AlertDescription>
          </Alert>
        </div>

        <AuditLogsClient />
      </div>
    </div>
  );
}
