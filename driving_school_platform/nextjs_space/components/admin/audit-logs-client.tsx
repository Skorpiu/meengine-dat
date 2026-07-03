"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, RefreshCw, ScrollText } from "lucide-react";
import {
  fetchAuditLogList,
  type AuditLogListFilters,
  type AuditLogListItem,
} from "@/lib/audit/audit-log-list-client";
import {
  formatAuditLogActorLabel,
  formatAuditLogDateTime,
  formatAuditLogMetadataSummary,
  formatAuditLogNullable,
} from "@/lib/audit/audit-log-list-ui-utils";

const EMPTY_FILTERS: AuditLogListFilters = {
  action: "",
  entityType: "",
  entityId: "",
  actorUserId: "",
  targetUserId: "",
  requestId: "",
  dateFrom: "",
  dateTo: "",
};

type FilterFormState = {
  action: string;
  entityType: string;
  entityId: string;
  actorUserId: string;
  targetUserId: string;
  requestId: string;
  dateFrom: string;
  dateTo: string;
};

function toFilterFormState(filters: AuditLogListFilters): FilterFormState {
  return {
    action: filters.action ?? "",
    entityType: filters.entityType ?? "",
    entityId: filters.entityId ?? "",
    actorUserId: filters.actorUserId ?? "",
    targetUserId: filters.targetUserId ?? "",
    requestId: filters.requestId ?? "",
    dateFrom: filters.dateFrom ?? "",
    dateTo: filters.dateTo ?? "",
  };
}

function toAppliedFilters(form: FilterFormState): AuditLogListFilters {
  return {
    action: form.action.trim() || undefined,
    entityType: form.entityType.trim() || undefined,
    entityId: form.entityId.trim() || undefined,
    actorUserId: form.actorUserId.trim() || undefined,
    targetUserId: form.targetUserId.trim() || undefined,
    requestId: form.requestId.trim() || undefined,
    dateFrom: form.dateFrom.trim() || undefined,
    dateTo: form.dateTo.trim() || undefined,
  };
}

export function AuditLogsClient() {
  const [items, setItems] = useState<AuditLogListItem[]>([]);
  const [filterForm, setFilterForm] = useState<FilterFormState>(
    toFilterFormState(EMPTY_FILTERS),
  );
  const [appliedFilters, setAppliedFilters] = useState<AuditLogListFilters>({});
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [listLimit, setListLimit] = useState(50);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [filterError, setFilterError] = useState("");

  const loadAuditLogs = useCallback(
    async (options?: {
      cursor?: string;
      append?: boolean;
      filters?: AuditLogListFilters;
    }) => {
      const filters = options?.filters ?? appliedFilters;
      const isAppend = options?.append === true;

      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError("");
        setFilterError("");
      }

      const result = await fetchAuditLogList({
        cursor: options?.cursor,
        filters,
      });

      if (isAppend) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }

      if (!result.ok) {
        const message = result.message;
        if (result.status === 400 && !isAppend) {
          setFilterError(message);
          setItems([]);
          setNextCursor(null);
          return;
        }
        if (!isAppend) {
          setError(message);
          setItems([]);
          setNextCursor(null);
        }
        return;
      }

      setListLimit(result.data.limit);
      setNextCursor(result.data.nextCursor);
      setItems((current) =>
        isAppend ? [...current, ...result.data.items] : result.data.items,
      );
    },
    [appliedFilters],
  );

  useEffect(() => {
    void loadAuditLogs({ filters: appliedFilters });
  }, [appliedFilters, loadAuditLogs]);

  const handleApplyFilters = () => {
    setAppliedFilters(toAppliedFilters(filterForm));
  };

  const handleClearFilters = () => {
    setFilterForm(toFilterFormState(EMPTY_FILTERS));
    setAppliedFilters({});
  };

  const handleRefresh = () => {
    void loadAuditLogs({ filters: appliedFilters });
  };

  const hasActiveFilters = Object.values(appliedFilters).some(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Narrow the audit log list. Invalid date ranges return a validation
            error from the API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="audit-filter-action">Action</Label>
              <Input
                id="audit-filter-action"
                value={filterForm.action}
                onChange={(event) =>
                  setFilterForm((current) => ({
                    ...current,
                    action: event.target.value,
                  }))
                }
                placeholder="lesson.create"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-filter-entity-type">Entity type</Label>
              <Input
                id="audit-filter-entity-type"
                value={filterForm.entityType}
                onChange={(event) =>
                  setFilterForm((current) => ({
                    ...current,
                    entityType: event.target.value,
                  }))
                }
                placeholder="Lesson"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-filter-entity-id">Entity ID</Label>
              <Input
                id="audit-filter-entity-id"
                value={filterForm.entityId}
                onChange={(event) =>
                  setFilterForm((current) => ({
                    ...current,
                    entityId: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-filter-actor-user-id">Actor user ID</Label>
              <Input
                id="audit-filter-actor-user-id"
                value={filterForm.actorUserId}
                onChange={(event) =>
                  setFilterForm((current) => ({
                    ...current,
                    actorUserId: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-filter-target-user-id">
                Target user ID
              </Label>
              <Input
                id="audit-filter-target-user-id"
                value={filterForm.targetUserId}
                onChange={(event) =>
                  setFilterForm((current) => ({
                    ...current,
                    targetUserId: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-filter-request-id">Request ID</Label>
              <Input
                id="audit-filter-request-id"
                value={filterForm.requestId}
                onChange={(event) =>
                  setFilterForm((current) => ({
                    ...current,
                    requestId: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-filter-date-from">Date from</Label>
              <Input
                id="audit-filter-date-from"
                type="date"
                value={filterForm.dateFrom}
                onChange={(event) =>
                  setFilterForm((current) => ({
                    ...current,
                    dateFrom: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audit-filter-date-to">Date to</Label>
              <Input
                id="audit-filter-date-to"
                type="date"
                value={filterForm.dateTo}
                onChange={(event) =>
                  setFilterForm((current) => ({
                    ...current,
                    dateTo: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleApplyFilters}>
              Apply filters
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClearFilters}
            >
              Clear filters
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleRefresh}
              disabled={loading || loadingMore}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {filterError ? (
            <Alert variant="destructive">
              <AlertTitle>Invalid filters</AlertTitle>
              <AlertDescription>{filterError}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit events</CardTitle>
          <CardDescription>
            Read-only tenant audit history. Operational identifiers only; names
            are not resolved from entity IDs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading audit logs…
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to load audit logs</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {hasActiveFilters
                ? "No audit events match the current filters."
                : "No audit events recorded yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Target user</TableHead>
                    <TableHead>Request ID</TableHead>
                    <TableHead>Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatAuditLogDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.action}
                      </TableCell>
                      <TableCell>{item.entityType}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatAuditLogNullable(item.entityId)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatAuditLogActorLabel(item)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatAuditLogNullable(item.targetUserId)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatAuditLogNullable(item.requestId)}
                      </TableCell>
                      <TableCell
                        className="max-w-xs text-xs text-muted-foreground break-all"
                        title={formatAuditLogMetadataSummary(
                          item.metadata,
                          500,
                        )}
                      >
                        {formatAuditLogMetadataSummary(item.metadata)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {nextCursor ? (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={loadingMore}
                onClick={() =>
                  loadAuditLogs({
                    cursor: nextCursor,
                    append: true,
                    filters: appliedFilters,
                  })
                }
              >
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}

          {!loading && items.length > 0 ? (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Showing {items.length} event{items.length === 1 ? "" : "s"}
              {hasActiveFilters ? " (filters active)" : ""}. Up to {listLimit}{" "}
              per page.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
