"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Play, RefreshCw, ArrowLeft, CheckCircle2, Clock, XCircle, AlertCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useWorkflowStore } from "@/store/workflow-store";
import { useExecutionStore } from "@/store/execution-store";
import type { Execution, ExecutionLog } from "@/types";

const statusConfig: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  pending: { label: "Pending", icon: <Clock className="w-3 h-3 mr-1" />, className: "bg-yellow-900/50 text-yellow-400 border-yellow-800" },
  in_progress: { label: "In Progress", icon: <RefreshCw className="w-3 h-3 mr-1 animate-spin" />, className: "bg-blue-900/50 text-blue-400 border-blue-800" },
  completed: { label: "Completed", icon: <CheckCircle2 className="w-3 h-3 mr-1" />, className: "bg-emerald-900/50 text-emerald-400 border-emerald-800" },
  failed: { label: "Failed", icon: <XCircle className="w-3 h-3 mr-1" />, className: "bg-red-900/50 text-red-400 border-red-800" },
  canceled: { label: "Canceled", icon: <Ban className="w-3 h-3 mr-1" />, className: "bg-gray-700/50 text-gray-400 border-gray-600" },
};

export default function ExecutePage() {
  const params = useParams();
  const workflowId = params.id as string;

  const { fetchWorkflowById, selectedWorkflow } = useWorkflowStore();
  const { currentExecution, startExecution, fetchExecutionById, cancelExecution, retryExecution } = useExecutionStore();

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [triggeredBy, setTriggeredBy] = useState("user@example.com");
  const [running, setRunning] = useState(false);
  const [polling, setPolling] = useState(false);

  const load = useCallback(async () => {
    await fetchWorkflowById(workflowId);
  }, [workflowId, fetchWorkflowById]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll for execution updates when in progress/pending
  useEffect(() => {
    if (!currentExecution) return;
    if (!["pending", "in_progress"].includes(currentExecution.status)) return;

    const interval = setInterval(async () => {
      await fetchExecutionById(currentExecution.id);
    }, 2000);
    return () => clearInterval(interval);
  }, [currentExecution, fetchExecutionById]);

  const schema = selectedWorkflow?.input_schema ?? {};
  const schemaFields = Object.entries(schema);

  const handleExecute = async () => {
    setRunning(true);
    try {
      const data: Record<string, unknown> = {};
      for (const [key, type] of schemaFields) {
        const val = formData[key] ?? "";
        if (type === "number") data[key] = Number(val);
        else if (type === "boolean") data[key] = val === "true";
        else data[key] = val;
      }
      await startExecution(workflowId, data, triggeredBy);
      toast.success("Execution started!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const handleCancel = async () => {
    if (!currentExecution) return;
    try {
      await cancelExecution(currentExecution.id);
      toast.success("Execution canceled");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleRetry = async () => {
    if (!currentExecution) return;
    try {
      await retryExecution(currentExecution.id);
      toast.success("Retrying execution...");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const execution = currentExecution;
  const logs: ExecutionLog[] = (execution?.logs as ExecutionLog[]) ?? [];
  const status = execution?.status;
  const sc = status ? statusConfig[status] : null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/workflows" className="text-gray-400 hover:text-white flex items-center p-2 rounded hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Execute Workflow</h1>
          <p className="text-sm text-gray-400">{selectedWorkflow?.name}</p>
        </div>
      </div>

      {/* Input Form */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white text-base">Input Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {schemaFields.length === 0 ? (
            <p className="text-sm text-gray-500">No input schema defined. The workflow will execute with empty data.</p>
          ) : (
            schemaFields.map(([key, type]) => (
              <div key={key} className="space-y-1">
                <Label className="text-gray-300 capitalize">{key} <span className="text-gray-600 text-xs">({String(type)})</span></Label>
                <Input
                  type={type === "number" ? "number" : "text"}
                  value={formData[key] ?? ""}
                  onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                  placeholder={`Enter ${key}`}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            ))
          )}
          <div className="space-y-1">
            <Label className="text-gray-300">Triggered By</Label>
            <Input
              value={triggeredBy}
              onChange={(e) => setTriggeredBy(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <Button
            onClick={handleExecute}
            disabled={running || (!!execution && ["pending", "in_progress"].includes(execution.status))}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {running ? "Starting..." : "Start Execution"}
          </Button>
        </CardContent>
      </Card>

      {/* Execution Status */}
      {execution && (
        <>
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-white text-base">Execution Status</CardTitle>
                {sc && (
                  <Badge className={`border text-xs flex items-center ${sc.className}`}>{sc.icon}{sc.label}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-gray-400">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-gray-500">ID:</span> <code className="text-xs text-indigo-400">{execution.id.slice(0, 16)}…</code></div>
                <div><span className="text-gray-500">Version:</span> v{execution.workflow_version}</div>
                <div><span className="text-gray-500">Retries:</span> {execution.retries}</div>
                <div><span className="text-gray-500">Current Step:</span> <code className="text-xs text-indigo-400">{execution.current_step_id?.slice(0, 12) ?? "—"}</code></div>
              </div>
              <div className="flex gap-2 pt-2">
                {["pending", "in_progress"].includes(execution.status) && (
                  <Button variant="outline" size="sm" onClick={handleCancel} className="border-red-800 text-red-400 hover:bg-red-900/20">
                    <Ban className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                )}
                {execution.status === "failed" && (
                  <Button size="sm" onClick={handleRetry} className="bg-amber-700 hover:bg-amber-600">
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => fetchExecutionById(execution.id)} className="text-gray-400">
                  <RefreshCw className="w-3 h-3 mr-1" /> Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Logs */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-base">Execution Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <p className="text-sm text-gray-500">No logs yet...</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, i) => (
                    <div key={i} className="border border-gray-800 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-700 text-xs font-bold text-gray-300">{i + 1}</div>
                          <span className="font-medium text-white">{log.step_name}</span>
                          <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">{log.step_type}</Badge>
                        </div>
                        <Badge className={log.status === "success" ? "bg-emerald-900/50 text-emerald-400 border border-emerald-800" : "bg-red-900/50 text-red-400 border border-red-800"}>
                          {log.status}
                        </Badge>
                      </div>
                      {log.evaluated_rules.length > 0 && (
                        <div className="text-xs space-y-1 pl-8">
                          <p className="text-gray-500 font-medium">Rules evaluated:</p>
                          {log.evaluated_rules.map((r) => (
                            <div key={r.rule_id} className="flex items-center gap-2 text-gray-400">
                              {r.matched ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-gray-600" />}
                              <code className="text-indigo-300">{r.condition}</code>
                              <span className="text-gray-600">(P{r.priority})</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {log.selected_next_step && (
                        <div className="pl-8 text-xs text-gray-500">
                          → Next step: <code className="text-indigo-400">{log.selected_next_step.slice(0, 12)}…</code>
                        </div>
                      )}
                      {log.error_message && (
                        <div className="pl-8 text-xs text-red-400">{log.error_message}</div>
                      )}
                      <div className="pl-8 text-xs text-gray-600">
                        Duration: {Math.round((new Date(log.ended_at).getTime() - new Date(log.started_at).getTime()))}ms
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
