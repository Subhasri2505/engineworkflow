import { create } from "zustand";
import type { Workflow, PaginatedResponse } from "@/types";

interface WorkflowStore {
  workflows: Workflow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  search: string;
  isLoading: boolean;
  error: string | null;
  selectedWorkflow: Workflow | null;

  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  setSelectedWorkflow: (workflow: Workflow | null) => void;
  fetchWorkflows: () => Promise<void>;
  createWorkflow: (data: Partial<Workflow>) => Promise<Workflow>;
  updateWorkflow: (id: string, data: Partial<Workflow>) => Promise<Workflow>;
  deleteWorkflow: (id: string) => Promise<void>;
  fetchWorkflowById: (id: string) => Promise<Workflow>;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflows: [],
  total: 0,
  page: 1,
  limit: 10,
  totalPages: 1,
  search: "",
  isLoading: false,
  error: null,
  selectedWorkflow: null,

  setSearch: (search) => set({ search, page: 1 }),
  setPage: (page) => set({ page }),
  setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),

  fetchWorkflows: async () => {
    const { page, limit, search } = get();
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/workflows?${params}`);
      if (!res.ok) throw new Error("Failed to fetch workflows");
      const data: PaginatedResponse<Workflow> = await res.json();
      set({
        workflows: data.data,
        total: data.total,
        totalPages: data.totalPages,
        isLoading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  createWorkflow: async (data) => {
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create workflow");
    }
    const workflow: Workflow = await res.json();
    get().fetchWorkflows();
    return workflow;
  },

  updateWorkflow: async (id, data) => {
    const res = await fetch(`/api/workflows/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update workflow");
    }
    const workflow: Workflow = await res.json();
    get().fetchWorkflows();
    return workflow;
  },

  deleteWorkflow: async (id) => {
    const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete workflow");
    get().fetchWorkflows();
  },

  fetchWorkflowById: async (id) => {
    const res = await fetch(`/api/workflows/${id}`);
    if (!res.ok) throw new Error("Workflow not found");
    const workflow: Workflow = await res.json();
    set({ selectedWorkflow: workflow });
    return workflow;
  },
}));
