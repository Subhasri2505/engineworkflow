import { z } from "zod";

// ─── Workflow ─────────────────────────────────────────────────────────────────

export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  is_active: z.boolean().optional().default(true),
  input_schema: z.record(z.string(), z.any()).optional().default({}),
  start_step_id: z.string().uuid().optional().nullable(),
});

export const updateWorkflowSchema = createWorkflowSchema.partial();

// ─── Step ─────────────────────────────────────────────────────────────────────

export const createStepSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  step_type: z.enum(["task", "approval", "notification"]),
  order: z.number().int().min(0).optional().default(0),
  metadata: z.record(z.string(), z.any()).optional().default({}),
});

export const updateStepSchema = createStepSchema.partial();

// ─── Rule ─────────────────────────────────────────────────────────────────────

export const createRuleSchema = z.object({
  condition: z.string().min(1, "Condition is required"),
  next_step_id: z.string().uuid().optional().nullable(),
  priority: z.number().int().min(0).optional().default(0),
});

export const updateRuleSchema = createRuleSchema.partial();

// ─── Execution ────────────────────────────────────────────────────────────────

export const startExecutionSchema = z.object({
  data: z.record(z.string(), z.any()).optional().default({}),
  triggered_by: z.string().optional(),
});

// ─── Query params ─────────────────────────────────────────────────────────────

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().optional(),
});
