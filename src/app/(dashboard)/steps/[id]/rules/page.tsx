"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Edit2,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRuleStore } from "@/store/rule-store";
import type { Rule } from "@/types";

function validateCondition(condition: string): boolean {
  if (!condition.trim()) return false;
  if (condition.trim().toUpperCase() === "DEFAULT") return true;
  // Basic check: should contain a comparator or function
  return (
    condition.includes("==") ||
    condition.includes("!=") ||
    condition.includes(">=") ||
    condition.includes("<=") ||
    condition.includes(">") ||
    condition.includes("<") ||
    condition.includes("contains(") ||
    condition.includes("startsWith(") ||
    condition.includes("endsWith(") ||
    condition.toUpperCase() === "DEFAULT"
  );
}

export default function StepRulesPage() {
  const params = useParams();
  const router = useRouter();
  const stepId = params.id as string;
  const [stepName, setStepName] = useState("Step");
  const [nextStepId, setNextStepId] = useState("");
  const [conditionError, setConditionError] = useState("");

  const { rules, fetchRules, createRule, updateRule, deleteRule, reorderRules } =
    useRuleStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [ruleForm, setRuleForm] = useState({
    condition: "",
    next_step_id: "",
    priority: 0,
  });
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null);

  const load = useCallback(async () => {
    await fetchRules(stepId);
    // Try get step info from API
    const res = await fetch(`/api/steps/${stepId}/rules`);
    if (res.ok) {
      const rules: Rule[] = await res.json();
      if (rules.length > 0) setStepName("Step Rules");
    }
  }, [fetchRules, stepId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingRule(null);
    setRuleForm({ condition: "", next_step_id: "", priority: rules.length });
    setConditionError("");
    setDialogOpen(true);
  };
  const openEdit = (rule: Rule) => {
    setEditingRule(rule);
    setRuleForm({
      condition: rule.condition,
      next_step_id: rule.next_step_id ?? "",
      priority: rule.priority,
    });
    setConditionError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!validateCondition(ruleForm.condition)) {
      setConditionError(
        "Invalid condition. Must contain a comparison operator or be 'DEFAULT'."
      );
      return;
    }
    setConditionError("");
    try {
      const payload = {
        condition: ruleForm.condition,
        next_step_id: ruleForm.next_step_id || null,
        priority: ruleForm.priority,
      };
      if (editingRule) {
        await updateRule(editingRule.id, payload);
        toast.success("Rule updated");
      } else {
        await createRule(stepId, payload);
        toast.success("Rule created");
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRule(deleteTarget.id);
      toast.success("Rule deleted");
      setDeleteTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(rules);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    reorderRules(reordered.map((r, i) => ({ ...r, priority: i })));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-white">Rule Editor</h1>
          <p className="text-sm text-gray-400">
            Step ID: <code className="text-indigo-400">{stepId}</code>
          </p>
        </div>
      </div>

      {/* Syntax Guide */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
            <Info className="w-4 h-4" /> Condition Syntax Reference
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-400 space-y-1 font-mono">
          <p>Comparison: <span className="text-indigo-300">amount &gt; 5000</span></p>
          <p>Logical: <span className="text-indigo-300">amount &gt; 1000 &amp;&amp; department == &quot;Finance&quot;</span></p>
          <p>Functions: <span className="text-indigo-300">contains(department, &quot;HR&quot;)</span> · <span className="text-indigo-300">startsWith(name, &quot;A&quot;)</span></p>
          <p>Fallback: <span className="text-indigo-300">DEFAULT</span></p>
        </CardContent>
      </Card>

      {/* Rules Table */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-400">{rules.length} rules (drag to reorder)</p>
        <Button
          size="sm"
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4 mr-1" /> Add Rule
        </Button>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-0">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="rules">
              {(provided) => (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-transparent">
                      <TableHead className="w-8 text-gray-500"></TableHead>
                      <TableHead className="text-gray-400">Priority</TableHead>
                      <TableHead className="text-gray-400">Condition</TableHead>
                      <TableHead className="text-gray-400">Next Step ID</TableHead>
                      <TableHead className="text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody ref={provided.innerRef} {...provided.droppableProps}>
                    {rules.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-gray-500 py-10"
                        >
                          No rules. Add a rule to control step routing.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rules.map((rule, idx) => (
                        <Draggable key={rule.id} draggableId={rule.id} index={idx}>
                          {(prov) => (
                            <TableRow
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className="border-gray-800 hover:bg-gray-800/50"
                            >
                              <TableCell>
                                <span
                                  {...prov.dragHandleProps}
                                  className="cursor-grab text-gray-600 hover:text-gray-400"
                                >
                                  <GripVertical className="w-4 h-4" />
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="border-gray-600 text-gray-300"
                                >
                                  {rule.priority}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm text-indigo-300 max-w-xs truncate">
                                {rule.condition}
                              </TableCell>
                              <TableCell className="text-gray-400 text-xs font-mono truncate max-w-[160px]">
                                {rule.next_step_id || (
                                  <span className="text-gray-600">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-gray-400 hover:text-white"
                                    onClick={() => openEdit(rule)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={() => setDeleteTarget(rule)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </TableBody>
                </Table>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>

      {/* Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit Rule" : "Add Rule"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-gray-300">Condition</Label>
              <Input
                value={ruleForm.condition}
                onChange={(e) => {
                  setRuleForm({ ...ruleForm, condition: e.target.value });
                  setConditionError("");
                }}
                placeholder='amount > 5000 || department == "HR"'
                className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
              />
              {conditionError && (
                <p className="text-red-400 text-xs">{conditionError}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">
                Next Step ID{" "}
                <span className="text-gray-500 text-xs">(leave blank to end)</span>
              </Label>
              <Input
                value={ruleForm.next_step_id}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, next_step_id: e.target.value })
                }
                placeholder="UUID of next step"
                className="bg-gray-800 border-gray-700 text-white font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300">Priority</Label>
              <Input
                type="number"
                value={ruleForm.priority}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, priority: Number(e.target.value) })
                }
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              className="text-gray-400"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              {editingRule ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Delete Rule</DialogTitle>
          </DialogHeader>
          <p className="text-gray-400 text-sm">
            Delete rule with condition:{" "}
            <code className="text-indigo-400">{deleteTarget?.condition}</code>?
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              className="text-gray-400"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
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
