import { create } from "zustand";
import type { Step } from "@/types";

interface StepStore {
  steps: Step[];
  isLoading: boolean;
  error: string | null;

  fetchSteps: (workflowId: string) => Promise<void>;
  createStep: (workflowId: string, data: Partial<Step>) => Promise<Step>;
  updateStep: (id: string, data: Partial<Step>) => Promise<Step>;
  deleteStep: (id: string, workflowId: string) => Promise<void>;
}

export const useStepStore = create<StepStore>((set, get) => ({
  steps: [],
  isLoading: false,
  error: null,

  fetchSteps: async (workflowId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/workflows/${workflowId}/steps`);
      if (!res.ok) throw new Error("Failed to fetch steps");
      const data: Step[] = await res.json();
      set({ steps: data, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  createStep: async (workflowId, data) => {
    const res = await fetch(`/api/workflows/${workflowId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create step");
    }
    const step: Step = await res.json();
    get().fetchSteps(workflowId);
    return step;
  },

  updateStep: async (id, data) => {
    const res = await fetch(`/api/steps/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update step");
    const step: Step = await res.json();
    set((state) => ({
      steps: state.steps.map((s) => (s.id === id ? step : s)),
    }));
    return step;
  },

  deleteStep: async (id, workflowId) => {
    const res = await fetch(`/api/steps/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete step");
    get().fetchSteps(workflowId);
  },
}));
