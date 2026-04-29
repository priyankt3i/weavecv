import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";
import type { ResumeWorkflowStep } from "../types";

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ResumeRow = {
  id: string;
  owner_id: string;
  title: string;
  raw_text: string;
  tune_for_job: boolean;
  job_description: string;
  resume_markdown: string;
  active_step: ResumeWorkflowStep;
  active_template_id: string;
  imported_templates: Json;
  draft_chat_messages: Json;
  review: Json | null;
  render_settings: Json | null;
  file_name: string;
  created_at: string;
  updated_at: string;
};

export type ResumeInsert = {
  id?: string;
  title: string;
  raw_text?: string;
  tune_for_job?: boolean;
  job_description?: string;
  resume_markdown?: string;
  active_step?: ResumeWorkflowStep;
  active_template_id?: string;
  imported_templates?: Json;
  draft_chat_messages?: Json;
  review?: Json | null;
  render_settings?: Json | null;
  file_name?: string;
};

export type ResumeUpdate = Partial<ResumeInsert>;

export type Database = {
  public: {
    Tables: {
      resumes: {
        Row: ResumeRow;
        Insert: ResumeInsert;
        Update: ResumeUpdate;
      };
    };
  };
};

const authUrl = import.meta.env.VITE_NEON_AUTH_URL as string | undefined;
const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL as string | undefined;

export const neonConfig = {
  authUrl,
  dataApiUrl,
  isConfigured: Boolean(authUrl && dataApiUrl),
};

export const neonClient = neonConfig.isConfigured
  ? createClient<Database>({
      auth: {
        adapter: BetterAuthReactAdapter(),
        url: authUrl!,
      },
      dataApi: {
        url: dataApiUrl!,
      },
    })
  : null;
