"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  Save,
  Settings,
  ListChecks,
  GripVertical,
  GitGraph,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useWorkflowStore } from "@/store/workflow-store";
import { useStepStore } from "@/store/step-store";
import { WorkflowMap } from "@/components/workflow-map";
import type { Step } from "@/types";

const stepTypeColors: Record<string, string> = {
  approval: "bg-amber-900/50 text-amber-400 border-amber-800",
  notification: "bg-blue-900/50 text-blue-400 border-blue-800",
  task: "bg-violet-900/50 text-violet-400 border-violet-800",
};

export default function WorkflowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;

  const { selectedWorkflow, fetchWorkflowById, updateWorkflow } = useWorkflowStore();
  const { steps, fetchSteps, createStep, updateStep, deleteStep } = useStepStore();

  const [workflowName, setWorkflowName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [inputSchema, setInputSchema] = useState("{}");
  const [schemaError, setSchemaError] = useState("");
  const [saving, setSaving] = useState(false);

  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [stepForm, setStepForm] = useState({
    name: "",
    step_type: "task" as "task" | "approval" | "notification",
    order: 0,
    metadata: "{}",
  });
  const [deleteStepTarget, setDeleteStepTarget] = useState<Step | null>(null);

  const load = useCallback(async () => {
    const wf = await fetchWorkflowById(workflowId);
    setWorkflowName(wf.name);
    setIsActive(wf.is_active);
    setInputSchema(JSON.stringify(wf.input_schema ?? {}, null, 2));
    await fetchSteps(workflowId);
  }, [workflowId, fetchWorkflowById, fetchSteps]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveWorkflow = async () => {
    setSaving(true);
    try {
      let parsedSchema: Record<string, unknown> = {};
      try {
        parsedSchema = JSON.parse(inputSchema);
        setSchemaError("");
      } catch {
        setSchemaError("Invalid JSON");
        setSaving(false);
        return;
      }
      await updateWorkflow(workflowId, {
        name: workflowName,
        is_active: isActive,
        input_schema: parsedSchema,
        start_step_id: steps[0]?.id ?? null,
      });
      toast.success("Workflow saved");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const openCreateStep = () => {
    setEditingStep(null);
    setStepForm({ name: "", step_type: "task", order: steps.length, metadata: "{}" });
    setStepDialogOpen(true);
  };
  const openEditStep = (step: Step) => {
    setEditingStep(step);
    setStepForm({
      name: step.name,
      step_type: step.step_type as "task" | "approval" | "notification",
      order: step.order,
      metadata: JSON.stringify(step.metadata ?? {}, null, 2),
    });
    setStepDialogOpen(true);
  };

  const handleSaveStep = async () => {
    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(stepForm.metadata);
    } catch {
      toast.error("Invalid metadata JSON");
      return;
    }

    try {
      if (editingStep) {
        await updateStep(editingStep.id, { ...stepForm, metadata: meta });
        toast.success("Step updated");
      } else {
        await createStep(workflowId, { ...stepForm, metadata: meta });
        toast.success("Step created");
      }
      setStepDialogOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDeleteStep = async () => {
    if (!deleteStepTarget) return;
    try {
      await deleteStep(deleteStepTarget.id, workflowId);
      toast.success("Step deleted");
      setDeleteStepTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/workflows")}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Workflow Editor</h1>
          <p className="text-sm text-gray-400">
            ID: <code className="text-indigo-400">{workflowId}</code>
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="settings" className="data-[state=active]:bg-indigo-600">
            <Settings className="w-4 h-4 mr-2" /> Settings
          </TabsTrigger>
          <TabsTrigger value="steps" className="data-[state=active]:bg-indigo-600">
            <ListChecks className="w-4 h-4 mr-2" /> Steps ({steps.length})
          </TabsTrigger>
          <TabsTrigger value="map" className="data-[state=active]:bg-indigo-600">
            <GitGraph className="w-4 h-4 mr-2" /> Visual Map
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Workflow Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-gray-300">Name</Label>
                <Input
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-gray-300">Status</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsActive(!isActive)}
                  className={
                    isActive
                      ? "border-emerald-700 text-emerald-400 bg-emerald-900/20"
                      : "border-gray-700 text-gray-400"
                  }
                >
                  {isActive ? "Active" : "Inactive"}
                </Button>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-300">Input Schema (JSON)</Label>
                <Textarea
                  value={inputSchema}
                  onChange={(e) => setInputSchema(e.target.value)}
                  rows={8}
                  className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                  placeholder='{"amount": "number", "department": "string"}'
                />
                {schemaError && (
                  <p className="text-red-400 text-xs">{schemaError}</p>
                )}
                <p className="text-xs text-gray-500">
                  Define the expected input fields and their types.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveWorkflow}
                  disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Workflow"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steps Tab */}
        <TabsContent value="steps" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">
              Steps are executed in order. Drag to reorder (coming soon).
            </p>
            <Button
              onClick={openCreateStep}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Step
            </Button>
          </div>

          {steps.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="py-12 text-center text-gray-500">
                No steps. Add a step to start building your workflow.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <Card key={step.id} className="bg-gray-900 border-gray-800">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-700 text-xs font-bold text-gray-300">
                        {idx + 1}
                      </div>
                      <GripVertical className="w-4 h-4 text-gray-600" />
                      <div className="flex-1">
                        <p className="font-medium text-white">{step.name}</p>
                        <p className="text-xs text-gray-500">ID: {step.id}</p>
                      </div>
                      <Badge
                        className={`border text-xs ${stepTypeColors[step.step_type]}`}
                      >
                        {step.step_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/steps/${step.id}/rules`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                          "text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/30"
                        )}
                      >
                        Rules
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white"
                        onClick={() => openEditStep(step)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => setDeleteStepTarget(step)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="map" className="mt-6">
          <WorkflowMap steps={steps} workflowId={workflowId} />
        </TabsContent>
      </Tabs>

      {/* Step Dialog */}
      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>{editingStep ? "Edit Step" : "Add Step"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-gray-300">Name</Label>
              <Input
                value={stepForm.name}
                onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="e.g. Manager Approval"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Type</Label>
              <Select
                value={stepForm.step_type}
                onValueChange={(v) =>
                  setStepForm({
                    ...stepForm,
                    step_type: v as "task" | "approval" | "notification",
                  })
                }
              >
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="approval">Approval</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Order</Label>
              <Input
                type="number"
                value={stepForm.order}
                onChange={(e) =>
                  setStepForm({ ...stepForm, order: Number(e.target.value) })
                }
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Metadata (JSON)</Label>
              <Textarea
                value={stepForm.metadata}
                onChange={(e) => setStepForm({ ...stepForm, metadata: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
                rows={4}
                placeholder="{}"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setStepDialogOpen(false)}
              className="text-gray-400"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveStep} className="bg-indigo-600 hover:bg-indigo-700">
              {editingStep ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Step Dialog */}
      <Dialog open={!!deleteStepTarget} onOpenChange={() => setDeleteStepTarget(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Step</DialogTitle>
          </DialogHeader>
          <p className="text-gray-400 text-sm">
            Delete <span className="font-semibold text-white">{deleteStepTarget?.name}</span>? All
            associated rules will also be removed.
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteStepTarget(null)}
              className="text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteStep}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
