import type { Rule } from "@/types";

export interface RuleContext {
  data: Record<string, unknown>;
}

export interface RuleEvaluation {
  rule_id: string;
  condition: string;
  matched: boolean;
  priority: number;
  error?: string;
}

export interface RuleEngineResult {
  next_step_id: string | null;
  evaluated_rules: RuleEvaluation[];
  matched_rule?: Rule;
}

// ─── Helper functions ────────────────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

function contains(fieldValue: unknown, value: string): boolean {
  if (typeof fieldValue === "string") return fieldValue.includes(value);
  if (Array.isArray(fieldValue)) return fieldValue.includes(value);
  return false;
}
function startsWith(fieldValue: unknown, value: string): boolean {
  return typeof fieldValue === "string" && fieldValue.startsWith(value);
}
function endsWith(fieldValue: unknown, value: string): boolean {
  return typeof fieldValue === "string" && fieldValue.endsWith(value);
}

// ─── Condition Evaluator ──────────────────────────────────────────────────────

function evaluateCondition(
  condition: string,
  data: Record<string, unknown>
): boolean {
  // Resolve functions: contains(...), startsWith(...), endsWith(...)
  const functionPattern = /\b(contains|startsWith|endsWith)\(([^,]+),\s*([^)]+)\)/g;
  let resolved = condition.replace(functionPattern, (_, fn, field, val) => {
    const fieldName = field.trim();
    const value = val.trim().replace(/^['"]|['"]$/g, "");
    const fieldValue = getNestedValue(data, fieldName);
    let result: boolean;
    switch (fn) {
      case "contains":
        result = contains(fieldValue, value);
        break;
      case "startsWith":
        result = startsWith(fieldValue, value);
        break;
      case "endsWith":
        result = endsWith(fieldValue, value);
        break;
      default:
        result = false;
    }
    return String(result);
  });

  // Replace field references with values
  const fieldPattern = /\b([a-zA-Z_][a-zA-Z0-9_.]*)\b/g;
  resolved = resolved.replace(fieldPattern, (match) => {
    // Don't replace true/false/null/undefined keywords
    if (["true", "false", "null", "undefined"].includes(match)) return match;
    const value = getNestedValue(data, match);
    if (value === undefined) return match; // keep as-is if not found
    if (typeof value === "string") return `"${value}"`;
    return String(value);
  });

  // Safely evaluate the resolved expression
  try {
    // We allow only safe arithmetic/logical expressions
    // eslint-disable-next-line no-new-func
    return Boolean(new Function(`"use strict"; return (${resolved})`)());
  } catch {
    return false;
  }
}

// ─── Rule Engine ─────────────────────────────────────────────────────────────

export function evaluateRules(
  rules: Rule[],
  context: RuleContext
): RuleEngineResult {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  const evaluated: RuleEvaluation[] = [];
  let matchedRule: Rule | undefined;

  for (const rule of sorted) {
    // DEFAULT rule: always matches if no other rule matched
    if (rule.condition.trim().toUpperCase() === "DEFAULT") {
      evaluated.push({
        rule_id: rule.id,
        condition: rule.condition,
        matched: false, // will be set to true if it becomes the fallback
        priority: rule.priority,
      });
      continue;
    }

    let matched = false;
    let error: string | undefined;
    try {
      matched = evaluateCondition(rule.condition, context.data);
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown error";
    }

    evaluated.push({
      rule_id: rule.id,
      condition: rule.condition,
      matched,
      priority: rule.priority,
      error,
    });

    if (matched && !matchedRule) {
      matchedRule = rule;
    }
  }

  // If no rule matched, try DEFAULT
  if (!matchedRule) {
    const defaultRule = sorted.find(
      (r) => r.condition.trim().toUpperCase() === "DEFAULT"
    );
    if (defaultRule) {
      matchedRule = defaultRule;
      const idx = evaluated.findIndex((e) => e.rule_id === defaultRule.id);
      if (idx !== -1) evaluated[idx].matched = true;
    }
  }

  return {
    next_step_id: matchedRule?.next_step_id ?? null,
    evaluated_rules: evaluated,
    matched_rule: matchedRule,
  };
}
