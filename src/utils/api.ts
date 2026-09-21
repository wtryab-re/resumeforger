/**
 * Single client for the Gemini-backed endpoints.
 *
 * Every call needs the same three things — the user's decrypted key, a JSON
 * POST, and consistent error text — so they live here once instead of being
 * re-implemented in each component. The server already normalises model errors
 * into readable sentences (see simplifyModelError in server.ts), so the client
 * passes `error` straight through rather than re-matching on "429"/"quota".
 */

import { getDecryptedApiKey } from "./crypto";
import { DEFAULT_MODEL, type GeminiModelId } from "../data/models";
import type { CoverLetterData, AtsAnalysis, TailoredResume, TailoringChange } from "../types";

/** Thrown when the signed-in user has not saved a Gemini API key yet. */
export class MissingApiKeyError extends Error {
  constructor() {
    super("API key missing. Please enter and save your Gemini API key to continue.");
    this.name = "MissingApiKeyError";
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Network error reaching the AI service. Please check your connection.");
  }

  const json = await res.json().catch(() => ({} as any));

  if (!res.ok || !json?.success) {
    throw new Error(json?.error || `Request failed (status ${res.status}).`);
  }
  return json as T;
}

async function requireApiKey(userId?: string): Promise<string> {
  const apiKey = (await getDecryptedApiKey(userId)) || "";
  if (!apiKey.trim()) throw new MissingApiKeyError();
  return apiKey;
}

export async function testApiKey(apiKey: string): Promise<{ model: string; reply?: string }> {
  return postJson<{ model: string; reply?: string }>("/api/gemini/test-key", { apiKey });
}

export interface TailorResumeInput {
  resumeText: string;
  jobDescription: string;
  roleTitle: string;
  companyName: string;
  tone?: string;
  model?: GeminiModelId;
  resumeTemplate?: unknown;
}

export interface TailorResumeResult {
  tailoredResume?: TailoredResume;
  atsAnalysis?: AtsAnalysis;
  tailoringChanges?: TailoringChange[];
}

export async function tailorResume(
  userId: string | undefined,
  input: TailorResumeInput
): Promise<TailorResumeResult> {
  const apiKey = await requireApiKey(userId);
  const json = await postJson<{ data: TailorResumeResult }>("/api/gemini/tailor-resume", {
    ...input,
    model: input.model || DEFAULT_MODEL,
    apiKey,
  });
  return json.data;
}

export interface CoverLetterInput {
  resumeText: string;
  jobDescription: string;
  roleTitle: string;
  companyName: string;
  applicantName?: string;
  tone?: string;
  model?: GeminiModelId;
}

export async function generateCoverLetter(
  userId: string | undefined,
  input: CoverLetterInput
): Promise<CoverLetterData> {
  const apiKey = await requireApiKey(userId);
  const json = await postJson<{ data: CoverLetterData }>("/api/gemini/generate-cover-letter", {
    ...input,
    model: input.model || DEFAULT_MODEL,
    apiKey,
  });
  return json.data;
}
