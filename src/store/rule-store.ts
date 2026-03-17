import { create } from "zustand";
import type { Rule } from "@/types";

interface RuleStore {
  rules: Rule[];
  isLoading: boolean;
  error: string | null;

  fetchRules: (stepId: string) => Promise<void>;
  createRule: (stepId: string, data: Partial<Rule>) => Promise<Rule>;
  updateRule: (id: string, data: Partial<Rule>) => Promise<Rule>;
  deleteRule: (id: string) => Promise<void>;
  reorderRules: (rules: Rule[]) => Promise<void>;
}

export const useRuleStore = create<RuleStore>((set, get) => ({
  rules: [],
  isLoading: false,
  error: null,

  fetchRules: async (stepId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/steps/${stepId}/rules`);
      if (!res.ok) throw new Error("Failed to fetch rules");
      const data: Rule[] = await res.json();
      set({ rules: data, isLoading: false });
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false });
    }
  },

  createRule: async (stepId, data) => {
    const res = await fetch(`/api/steps/${stepId}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create rule");
    }
    const rule: Rule = await res.json();
    get().fetchRules(stepId);
    return rule;
  },

  updateRule: async (id, data) => {
    const res = await fetch(`/api/rules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update rule");
    const rule: Rule = await res.json();
    set((state) => ({
      rules: state.rules.map((r) => (r.id === id ? rule : r)),
    }));
    return rule;
  },

  deleteRule: async (id) => {
    const res = await fetch(`/api/rules/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete rule");
    set((state) => ({ rules: state.rules.filter((r) => r.id !== id) }));
  },

  reorderRules: async (rules) => {
    set({ rules });
    // Persist new priorities
    await Promise.all(
      rules.map((rule, index) =>
        fetch(`/api/rules/${rule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority: index }),
        })
      )
    );
  },
}));
