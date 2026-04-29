import { neonClient } from "../lib/neonClient";
import type { ResumeRow } from "../lib/neonClient";
import type { ResumeDraftSnapshot, SavedResume, SavedResumeSummary } from "../types";

const requireClient = () => {
  if (!neonClient) {
    throw new Error("Neon Auth and Data API are not configured.");
  }
  return neonClient;
};

const toSummary = (row: ResumeRow): SavedResumeSummary => ({
  id: row.id,
  title: row.title,
  updatedAt: row.updated_at,
  createdAt: row.created_at,
  activeTemplateId: row.active_template_id,
  fileName: row.file_name,
});

const toSavedResume = (row: ResumeRow): SavedResume => ({
  ...toSummary(row),
  rawText: row.raw_text,
  tuneForJob: row.tune_for_job,
  jobDescription: row.job_description,
  resumeMarkdown: row.resume_markdown,
  activeStep: row.active_step,
  activeTemplateId: row.active_template_id,
  importedTemplates: Array.isArray(row.imported_templates) ? (row.imported_templates as unknown as SavedResume["importedTemplates"]) : [],
  draftChatMessages: Array.isArray(row.draft_chat_messages) ? (row.draft_chat_messages as unknown as SavedResume["draftChatMessages"]) : [],
  review: row.review && typeof row.review === "object" && !Array.isArray(row.review) ? (row.review as unknown as SavedResume["review"]) : null,
  renderSettings: row.render_settings,
  fileName: row.file_name,
});

const snapshotToRow = (snapshot: ResumeDraftSnapshot, title: string) => ({
  title,
  raw_text: snapshot.rawText,
  tune_for_job: snapshot.tuneForJob,
  job_description: snapshot.jobDescription,
  resume_markdown: snapshot.resumeMarkdown,
  active_step: snapshot.activeStep,
  active_template_id: snapshot.activeTemplateId,
  imported_templates: snapshot.importedTemplates,
  draft_chat_messages: snapshot.draftChatMessages,
  review: snapshot.review,
  render_settings: snapshot.renderSettings,
  file_name: snapshot.fileName,
});

export const listSavedResumes = async (): Promise<SavedResumeSummary[]> => {
  const client = requireClient();
  const { data, error } = await client
    .from("resumes")
    .select("id,title,updated_at,created_at,active_template_id,file_name")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => toSummary(row as ResumeRow));
};

export const getSavedResume = async (id: string): Promise<SavedResume> => {
  const client = requireClient();
  const { data, error } = await client.from("resumes").select("*").eq("id", id).single();

  if (error) throw error;
  return toSavedResume(data as ResumeRow);
};

export const saveResume = async (
  snapshot: ResumeDraftSnapshot,
  options: { id?: string | null; title: string }
): Promise<SavedResume> => {
  const client = requireClient();
  const row = snapshotToRow(snapshot, options.title);

  if (options.id) {
    const { data, error } = await client
      .from("resumes")
      .update(row)
      .eq("id", options.id)
      .select("*")
      .single();

    if (error) throw error;
    return toSavedResume(data as ResumeRow);
  }

  const { data, error } = await client.from("resumes").insert(row).select("*").single();

  if (error) throw error;
  return toSavedResume(data as ResumeRow);
};

export const deleteSavedResume = async (id: string): Promise<void> => {
  const client = requireClient();
  const { error } = await client.from("resumes").delete().eq("id", id);

  if (error) throw error;
};
