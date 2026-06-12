/**
 * Central model registry. The single source of truth for which models the app
 * exposes. To add a model later, add an entry here — nothing else needs to
 * change on the backend.
 *
 * IMPORTANT: `id` must be a Bedrock *inference profile* id (the `us.` prefixed
 * form), NOT the bare foundation-model id. Anthropic Claude 4.x models only
 * support on-demand invocation through an inference profile.
 *
 * All ids below were verified ACTIVE and invocable in account 559050234030
 * (region us-east-1).
 */

export type ModelKey = "haiku-4.5" | "sonnet-4.5" | "fable-5";

export type ModelInfo = {
  /** Human-readable label shown in the picker. */
  label: string;
  /** Bedrock inference-profile id passed to `bedrock(...)`. */
  id: string;
  /**
   * Optional warning surfaced in the UI. Used for Fable 5, which is a
   * "Covered Model" with mandatory 30-day data retention (no opt-out).
   */
  warning?: string;
};

export const MODELS: Record<ModelKey, ModelInfo> = {
  "haiku-4.5": {
    label: "Claude Haiku 4.5",
    id: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  },
  "sonnet-4.5": {
    label: "Claude Sonnet 4.5",
    id: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  },
  "fable-5": {
    label: "Claude Fable 5",
    id: "us.anthropic.claude-fable-5",
    warning: "30-day data retention (no opt-out)",
  },
};

export const DEFAULT_MODEL: ModelKey = "haiku-4.5";

/** Type guard: is the given string a known model key? */
export function isModelKey(value: unknown): value is ModelKey {
  return typeof value === "string" && value in MODELS;
}

/**
 * Resolve a (possibly untrusted) model key to its Bedrock id, falling back to
 * the default model for unknown/missing values. This guarantees the client can
 * never send an arbitrary string through to Bedrock.
 */
export function resolveModelId(key: unknown): string {
  return MODELS[isModelKey(key) ? key : DEFAULT_MODEL].id;
}

/** Ordered list for rendering the picker. */
export const MODEL_ORDER: ModelKey[] = ["haiku-4.5", "sonnet-4.5", "fable-5"];
