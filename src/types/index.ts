export type StepType = "task" | "approval" | "notification";
export type ExecutionStatus = "pending" | "in_progress" | "completed" | "failed" | "canceled";

export interface Workflow {
  id: string;
  name: string;
  version: number;
  is_active: boolean;
  input_schema: any;
  start_step_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  steps?: Step[];
  executions?: Execution[];
  _count?: { steps: number; executions: number };
}

export interface Step {
  id: string;
  workflow_id: string;
  name: string;
  step_type: StepType;
  order: number;
  metadata: any;
  created_at: Date | string;
  updated_at: Date | string;
  rules?: Rule[];
}

export interface Rule {
  id: string;
  step_id: string;
  condition: string;
  next_step_id: string | null;
  priority: number;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ExecutionLog {
  step_id: string;
  step_name: string;
  step_type: StepType;
  evaluated_rules: Array<{
    rule_id: string;
    condition: string;
    matched: boolean;
    priority: number;
  }>;
  selected_next_step: string | null;
  status: "success" | "failed" | "skipped";
  approver_id?: string;
  error_message?: string;
  started_at: string;
  ended_at: string;
}

export interface Execution {
  id: string;
  workflow_id: string;
  workflow_version: number;
  status: ExecutionStatus;
  data: any;
  logs: ExecutionLog[];
  current_step_id: string | null;
  retries: number;
  triggered_by: string | null;
  started_at: Date | string | null;
  ended_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  workflow?: Workflow;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
