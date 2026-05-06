import type { DraftRevisionResult, ResumeReview, ResumeTemplate, Suggestion } from '../types';
import { neonClient } from "../lib/neonClient";

const getNeonJwt = () => {
  const auth = neonClient?.auth as { getJWTToken?: () => Promise<string | null> } | undefined;
  return auth?.getJWTToken?.();
};

const getAiHeaders = async (): Promise<HeadersInit> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  try {
    const token = await getNeonJwt();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // The server will return the correct auth/subscription error.
  }

  return headers;
};

const getApiErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      if (payload && typeof payload.error === "string") {
        return `${fallback}: ${payload.error}`;
      }
    } else {
      const text = await response.text();
      if (text.trim()) {
        return `${fallback}: ${text.trim()}`;
      }
    }
  } catch {
    // Keep the original fallback when the server response cannot be parsed.
  }

  return fallback;
};

export const generateResume = async (rawText: string, jobDescription: string): Promise<string> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: await getAiHeaders(),
    body: JSON.stringify({
      action: 'generate',
      rawText,
      jobDescription,
    }),
  });
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, 'Failed to generate resume'));
  }
  return response.text();
};

export const reviewResume = async (resumeMarkdown: string): Promise<ResumeReview> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: await getAiHeaders(),
    body: JSON.stringify({
      action: 'review',
      resumeMarkdown,
    }),
  });
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, 'Failed to review resume'));
  }
  return response.json();
};

export const applySuggestion = async (resumeMarkdown: string, suggestion: Suggestion, userInput: string): Promise<string> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: await getAiHeaders(),
    body: JSON.stringify({
      action: 'apply',
      resumeMarkdown,
      suggestion,
      userInput,
    }),
  });
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, 'Failed to apply suggestion'));
  }
  return response.text();
};

export const importResumeTemplate = async (templateHtml: string): Promise<ResumeTemplate> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: await getAiHeaders(),
    body: JSON.stringify({
      action: 'importTemplate',
      templateHtml,
    }),
  });
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, 'Failed to import template'));
  }
  return response.json();
};

export const reviseResumeDraft = async (
  resumeMarkdown: string,
  userRequest: string,
  forceApply = false
): Promise<DraftRevisionResult> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: await getAiHeaders(),
    body: JSON.stringify({
      action: 'reviseDraft',
      resumeMarkdown,
      userInput: userRequest,
      forceApply,
    }),
  });
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, 'Failed to revise resume draft'));
  }
  return response.json();
};
