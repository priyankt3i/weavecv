import type { DraftRevisionResult, ResumeReview, ResumeTemplate, Suggestion } from '../types';

const aiHeaders: HeadersInit = {
    "Content-Type": "application/json",
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

export const generateResume = async (rawText: string, jobDescription: string, ownerId?: string | null): Promise<string> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: aiHeaders,
    body: JSON.stringify({
      action: 'generate',
      ownerId,
      rawText,
      jobDescription,
    }),
  });
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, 'Failed to generate resume'));
  }
  return response.text();
};

export const reviewResume = async (resumeMarkdown: string, ownerId?: string | null): Promise<ResumeReview> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: aiHeaders,
    body: JSON.stringify({
      action: 'review',
      ownerId,
      resumeMarkdown,
    }),
  });
  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response, 'Failed to review resume'));
  }
  return response.json();
};

export const applySuggestion = async (
  resumeMarkdown: string,
  suggestion: Suggestion,
  userInput: string,
  ownerId?: string | null
): Promise<string> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: aiHeaders,
    body: JSON.stringify({
      action: 'apply',
      ownerId,
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

export const importResumeTemplate = async (templateHtml: string, ownerId?: string | null): Promise<ResumeTemplate> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: aiHeaders,
    body: JSON.stringify({
      action: 'importTemplate',
      ownerId,
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
  forceApply = false,
  ownerId?: string | null
): Promise<DraftRevisionResult> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: aiHeaders,
    body: JSON.stringify({
      action: 'reviseDraft',
      ownerId,
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
