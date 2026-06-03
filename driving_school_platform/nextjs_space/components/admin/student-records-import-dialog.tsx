"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";
import type { ImportDryRunRowFinding } from "@/lib/import-export/import-export-contracts";
import {
  fetchStudentRecordsImportDryRun,
  inferStudentRecordsImportFormat,
  type StudentRecordsImportDryRunReport,
} from "@/lib/students/student-records-import-client";

type StudentRecordsImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatFindingLabel(finding: ImportDryRunRowFinding): string {
  const field = finding.field ? `${finding.field}: ` : "";
  return `Row ${finding.rowNumber} — ${field}${finding.message}`;
}

function FindingsList({
  title,
  findings,
  variant,
}: {
  title: string;
  findings: ImportDryRunRowFinding[];
  variant: "destructive" | "default";
}) {
  if (findings.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <ul className="text-sm space-y-1 max-h-40 overflow-y-auto rounded-md border p-3 bg-gray-50">
        {findings.map((finding, index) => (
          <li
            key={`${finding.rowNumber}-${finding.code}-${finding.field ?? "file"}-${index}`}
            className={
              variant === "destructive" ? "text-red-700" : "text-amber-800"
            }
          >
            {formatFindingLabel(finding)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewTable({
  report,
}: {
  report: StudentRecordsImportDryRunReport;
}) {
  if (report.preview.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-900">Valid rows preview</h4>
      <div className="rounded-md border overflow-x-auto max-h-64 overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Row</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Enrollment</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.preview.map((row) => (
              <TableRow key={row.rowNumber}>
                <TableCell>{row.rowNumber}</TableCell>
                <TableCell className="font-mono">
                  {row.normalized.schoolStudentId}
                </TableCell>
                <TableCell>
                  {[row.normalized.firstName, row.normalized.lastName]
                    .filter(Boolean)
                    .join(" ")}
                </TableCell>
                <TableCell>
                  {[row.normalized.phoneNumber, row.normalized.email]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </TableCell>
                <TableCell>{row.normalized.enrollmentDate ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function StudentRecordsImportDialog({
  open,
  onOpenChange,
}: StudentRecordsImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [report, setReport] = useState<StudentRecordsImportDryRunReport | null>(
    null,
  );

  const resetState = () => {
    setSelectedFile(null);
    setReport(null);
    setPreviewLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetState();
    }
    onOpenChange(nextOpen);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setReport(null);
  };

  const handlePreview = async () => {
    if (!selectedFile) {
      toast.error("Choose a CSV or JSON file first.");
      return;
    }

    const format = inferStudentRecordsImportFormat(selectedFile.name);
    if (!format) {
      toast.error("Unsupported file type. Use .csv or .json.");
      return;
    }

    setPreviewLoading(true);
    setReport(null);

    try {
      const content = await selectedFile.text();
      const result = await fetchStudentRecordsImportDryRun(format, content);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setReport(result.report);

      if (result.report.totalRows === 0 && result.report.errors.length > 0) {
        toast.error("Could not parse the file. Review the errors below.");
      } else if (result.report.validRows === 0) {
        toast.error("No valid rows found.");
      } else {
        toast.success(
          `Preview ready: ${result.report.validRows} valid row(s), ${result.report.invalidRows} invalid.`,
        );
      }
    } catch {
      toast.error("Import preview failed.");
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import student records (preview)</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file to validate rows before import. This
            preview does not create or change records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              Preview only — no fichas are created until a separate apply step
              is available.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="student-import-file">Import file</Label>
            <Input
              id="student-import-file"
              ref={fileInputRef}
              type="file"
              accept=".csv,.json,text/csv,application/json"
              onChange={handleFileChange}
              disabled={previewLoading}
            />
            {selectedFile ? (
              <p className="text-xs text-gray-500">
                Selected: {selectedFile.name}
              </p>
            ) : (
              <p className="text-xs text-gray-500">
                Use the same columns as student export/import templates (CSV
                semicolon-separated).
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={!selectedFile || previewLoading}
            onClick={() => void handlePreview()}
          >
            <Upload className="h-4 w-4 mr-2" />
            {previewLoading ? "Running preview…" : "Run preview"}
          </Button>

          {report ? (
            <div className="space-y-4 pt-2 border-t">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Total rows</p>
                  <p className="font-semibold">{report.totalRows}</p>
                </div>
                <div>
                  <p className="text-gray-500">Valid</p>
                  <p className="font-semibold text-green-700">
                    {report.validRows}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Invalid</p>
                  <p className="font-semibold text-red-700">
                    {report.invalidRows}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Warnings</p>
                  <p className="font-semibold">{report.warnings.length}</p>
                </div>
              </div>

              <FindingsList
                title="Errors"
                findings={report.errors}
                variant="destructive"
              />
              <FindingsList
                title="Warnings"
                findings={report.warnings}
                variant="default"
              />
              <PreviewTable report={report} />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
