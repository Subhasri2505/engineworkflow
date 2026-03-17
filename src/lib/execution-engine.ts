import { prisma } from "@/lib/prisma";
import { evaluateRules } from "@/lib/rule-engine";
import type { ExecutionLog } from "@/types";

const MAX_LOOP_ITERATIONS = 50;

export async function runWorkflow(executionId: string): Promise<void> {
  // Load the execution
  const execution = await prisma.execution.findUnique({
    where: { id: executionId },
  });
  if (!execution) throw new Error("Execution not found");

  // Load the workflow with all steps and rules
  const workflow = await prisma.workflow.findUnique({
    where: { id: execution.workflow_id },
    include: {
      steps: {
        include: { rules: { orderBy: { priority: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });
  if (!workflow) throw new Error("Workflow not found");
  if (!workflow.start_step_id) throw new Error("Workflow has no start step");

  // Mark in_progress
  await prisma.execution.update({
    where: { id: executionId },
    data: { status: "in_progress", started_at: new Date() },
  });

  const logs: ExecutionLog[] = (execution.logs as unknown as ExecutionLog[]) ?? [];
  let currentStepId: string | null = workflow.start_step_id;
  let iterations = 0;

  try {
    while (currentStepId && iterations < MAX_LOOP_ITERATIONS) {
      iterations++;

      // Cancel check
      const fresh = await prisma.execution.findUnique({
        where: { id: executionId },
      });
      if (fresh?.status === "canceled") return;

      const step = workflow.steps.find((s: any) => s.id === currentStepId);
      if (!step) throw new Error(`Step ${currentStepId} not found`);

      const stepStarted = new Date().toISOString();

      // Evaluate rules
      const ruleResult = evaluateRules(step.rules as any, {
        data: execution.data as Record<string, unknown>,
      });

      const log: ExecutionLog = {
        step_id: step.id,
        step_name: step.name,
        step_type: step.step_type as ExecutionLog["step_type"],
        evaluated_rules: ruleResult.evaluated_rules,
        selected_next_step: ruleResult.next_step_id,
        status: "success",
        started_at: stepStarted,
        ended_at: new Date().toISOString(),
      };

      logs.push(log);

      // Persist progress
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          current_step_id: step.id,
          logs: logs as object[],
        },
      });

      currentStepId = ruleResult.next_step_id;
    }

    if (iterations >= MAX_LOOP_ITERATIONS) {
      throw new Error(
        `Max loop iterations (${MAX_LOOP_ITERATIONS}) reached. Possible infinite loop.`
      );
    }

    // Mark completed
    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "completed",
        ended_at: new Date(),
        logs: logs as object[],
      },
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";

    logs.push({
      step_id: currentStepId ?? "unknown",
      step_name: "Error",
      step_type: "task",
      evaluated_rules: [],
      selected_next_step: null,
      status: "failed",
      error_message: errMsg,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
    });

    await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: "failed",
        ended_at: new Date(),
        logs: logs as object[],
      },
    });
  }
}
