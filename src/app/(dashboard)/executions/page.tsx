"use client";

import { useEffect, useCallback, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  ClipboardList,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useExecutionStore } from "@/store/execution-store";
import type { Execution, ExecutionLog } from "@/types";

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
  in_progress: "bg-blue-900/50 text-blue-400 border-blue-800",
  completed: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
  failed: "bg-red-900/50 text-red-400 border-red-800",
  canceled: "bg-gray-700/50 text-gray-400 border-gray-600",
};

export default function ExecutionsPage() {
  const {
    executions,
    total,
    page,
    totalPages,
    search,
    isLoading,
    fetchExecutions,
    fetchExecutionById,
    setSearch,
    setPage,
  } = useExecutionStore();

  const [logsExec, setLogsExec] = useState<Execution | null>(null);

  const load = useCallback(() => {
    fetchExecutions();
  }, [fetchExecutions]);

  useEffect(() => {
    load();
  }, [load, page, search]);

  const openLogs = async (id: string) => {
    try {
      const exec = await fetchExecutionById(id);
      setLogsExec(exec);
    } catch {
      toast.error("Failed to load execution");
    }
  };

  const logs: ExecutionLog[] = (logsExec?.logs as ExecutionLog[]) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-400" /> Audit Log
          </h1>
          <p className="text-sm text-gray-400 mt-1">{total} total executions</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          className="border-gray-700 text-gray-300 hover:bg-gray-800"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by workflow or user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
        />
      </div>

      {/* Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-800 hover:bg-transparent">
                <TableHead className="text-gray-400">Execution ID</TableHead>
                <TableHead className="text-gray-400">Workflow</TableHead>
                <TableHead className="text-gray-400">Version</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Started By</TableHead>
                <TableHead className="text-gray-400">Start Time</TableHead>
                <TableHead className="text-gray-400">End Time</TableHead>
                <TableHead className="text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : executions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-12">
                    No executions found.
                  </TableCell>
                </TableRow>
              ) : (
                executions.map((ex) => (
                  <TableRow key={ex.id} className="border-gray-800 hover:bg-gray-800/50">
                    <TableCell className="font-mono text-xs text-indigo-400">
                      {ex.id.slice(0, 12)}…
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      <Link
                        href={`/workflows/${ex.workflow_id}/editor`}
                        className="hover:text-indigo-400 transition-colors"
                      >
                        {ex.workflow?.name ?? ex.workflow_id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">
                        v{ex.workflow_version}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`border text-xs ${statusStyles[ex.status] ?? ""}`}
                      >
                        {ex.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {ex.triggered_by ?? "—"}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {ex.started_at
                        ? new Date(ex.started_at).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {ex.ended_at
                        ? new Date(ex.ended_at).toLocaleString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-indigo-400 hover:text-indigo-300"
                        onClick={() => openLogs(ex.id)}
                      >
                        <Eye className="w-4 h-4" /> Logs
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-gray-700"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            ><ChevronLeft className="w-4 h-4" /></Button>
            <Button
              size="sm"
              variant="outline"
              className="border-gray-700"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            ><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Logs Dialog */}
      <Dialog open={!!logsExec} onOpenChange={() => setLogsExec(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execution Logs</DialogTitle>
          </DialogHeader>
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm">No logs for this execution.</p>
          ) : (
            <div className="space-y-3 mt-2">
              {logs.map((log, i) => (
                <div key={i} className="border border-gray-800 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{i + 1}. {log.step_name}</span>
                    <Badge className={log.status === "success" ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800" : "bg-red-900/50 text-red-400 border border-red-800"}>
                      {log.status}
                    </Badge>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Type: {log.step_type}</span>
                    <span>Duration: {Math.round(new Date(log.ended_at).getTime() - new Date(log.started_at).getTime())}ms</span>
                  </div>
                  {log.evaluated_rules.length > 0 && (
                    <div className="text-xs space-y-1">
                      {log.evaluated_rules.map((r) => (
                        <div key={r.rule_id} className="flex items-center gap-2 text-gray-400">
                          <span className={r.matched ? "text-emerald-400" : "text-gray-600"}>
                            {r.matched ? "✓" : "✗"}
                          </span>
                          <code className="text-indigo-300">{r.condition}</code>
                          <span className="text-gray-600">P{r.priority}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {log.error_message && (
                    <p className="text-red-400 text-xs">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
