export interface Suggestion {
  id: string;
  title: string;
  description: string;
  originalText?: string;
  isCorrection?: boolean;
  status: 'pending' | 'applied' | 'discarded';
  placeholder?: string;
}

export interface ResumeReview {
  score: number;
  suggestions: Suggestion[];
}

export type DraftRevisionDecision = 'applied' | 'needs_confirmation' | 'blocked';

export interface DraftRevisionResult {
  decision: DraftRevisionDecision;
  message: string;
  updatedMarkdown?: string;
  concern?: string;
}

export interface DraftChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tone?: 'normal' | 'caution' | 'blocked';
}

export type ResumeLayoutType = 'single-column' | 'two-column';

export interface ResumeLayout {
    type: ResumeLayoutType;
    // Optional full-width blocks rendered above column layouts.
    featured?: string[];
    // For single-column, a simple array defining the order
    order?: string[];
    // For two-column, arrays for each column
    primary?: string[]; // Main content, e.g., right column
    secondary?: string[]; // Sidebar content, e.g., left column
}

export interface ResumeTemplate {
  id: string;
  name: string;
  thumbnailColor: string;
  css: string;
  layout: ResumeLayout;
  source?: 'built-in' | 'imported';
  templateVersion?: number;
}
