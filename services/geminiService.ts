import type { ResumeReview, Suggestion, ResumeLayout } from '../types';

export const generateResume = async (rawText: string, layout: ResumeLayout): Promise<string> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'generate',
      rawText,
      layout,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to generate resume');
  }
  return response.text();
};

export const reviewResume = async (resumeHtml: string): Promise<ResumeReview> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'review',
      resumeHtml,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to review resume');
  }
  return response.json();
};

export const applySuggestion = async (resumeHtml: string, suggestion: Suggestion, userInput: string): Promise<string> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'apply',
      resumeHtml,
      suggestion,
      userInput,
    }),
  });
  if (!response.ok) {
    throw new Error('Failed to apply suggestion');
  }
  return response.text();
};
