import { create } from "zustand";
import type { Execution, PaginatedResponse } from "@/types";

interface ExecutionStore {
  executions: Execution[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  search: string;
  isLoading: boolean;
  error: string | null;
  currentExecution: Execution | null;

  setSearch: (s: string) => void;
  setPage: (p: number) => void;
  fetchExecutions: () => Promise<void>;
  fetchExecutionById: (id: string) => Promise<Execution>;
  startExecution: (
    workflowId: string,
    data: Record<string, unknown>,
    triggeredBy?: string
  ) => Promise<Execution>;
  cancelExecution: (id: string) => Promise<void>;
  retryExecution: (id: string) => Promise<void>;
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  executions: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  search: "",
  isLoading: false,
  error: null,
  currentExecution: null,

  setSearch: (search) => set({ search, page: 1 }),
  setPage: (page) => set({ page }),

  fetchExecutions: async () => {
    const { page, limit, search } = get();
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/executions?${params}`);
      if (!res.ok) throw new Error("Failed to fetch executions");
      const data: PaginatedResponse<Execution> = await res.json();
      set({
        executions: data.data,
        total: data.total,
        totalPages: data.totalPages,
        isLoading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  fetchExecutionById: async (id) => {
    const res = await fetch(`/api/executions/${id}`);
    if (!res.ok) throw new Error("Execution not found");
    const exec: Execution = await res.json();
    set({ currentExecution: exec });
    return exec;
  },

  startExecution: async (workflowId, data, triggeredBy) => {
    const res = await fetch(`/api/workflows/${workflowId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data, triggered_by: triggeredBy }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to start execution");
    }
    const exec: Execution = await res.json();
    set({ currentExecution: exec });
    return exec;
  },

  cancelExecution: async (id) => {
    const res = await fetch(`/api/executions/${id}/cancel`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to cancel execution");
    const exec: Execution = await res.json();
    set({ currentExecution: exec });
    get().fetchExecutions();
  },

  retryExecution: async (id) => {
    const res = await fetch(`/api/executions/${id}/retry`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to retry execution");
    const exec: Execution = await res.json();
    set({ currentExecution: exec });
    get().fetchExecutions();
  },
}));
