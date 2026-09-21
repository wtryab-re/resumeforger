/**
 * Single source of truth for the Gemini models this app offers.
 * Imported by both the Express API (server.ts) and the model picker UI, so
 * renaming or adding a model is a one-line change in one file.
 */

export const GEMINI_MODEL_IDS = [
  "gemini-3.8-flash",
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-lite",
] as const;

export type GeminiModelId = (typeof GEMINI_MODEL_IDS)[number];

/** Default for generation endpoints (tailoring, cover letters, key test). */
export const DEFAULT_MODEL: GeminiModelId = "gemini-3.8-flash";

/** Cheap model retried once when the primary model is temporarily unavailable. */
export const FALLBACK_MODEL: GeminiModelId = "gemini-3.1-flash-lite";

/** Narrow an untrusted request value to a supported model id. */
export function resolveModel(model: unknown, fallback: GeminiModelId = DEFAULT_MODEL): GeminiModelId {
  return GEMINI_MODEL_IDS.includes(model as GeminiModelId) ? (model as GeminiModelId) : fallback;
}

export interface ModelOption {
  id: GeminiModelId;
  name: string;
  tag: string;
  badgeColor: string;
  description: string;
  isRecommended?: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    tag: "Standard • Fast",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    description: "Standard model. Fast, balanced, and accurate for resume and cover letter optimization.",
    isRecommended: true,
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    tag: "Deep Reasoning",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    description: "Advanced semantic alignment and executive nuance for complex career narratives.",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    tag: "Lite Model • Fallback",
    badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    description: "Lightweight, reliable model. Serves as the automatic fallback (retries once if other models fail).",
  },
];

export const FALLBACK_MODEL_NAME =
  AVAILABLE_MODELS.find((m) => m.id === FALLBACK_MODEL)?.name ?? FALLBACK_MODEL;
