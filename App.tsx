import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent, type ReactNode } from "react";
import { AuthView, NeonAuthUIProvider, UserButton } from "@neondatabase/neon-js/auth/react/ui";
import { useResume, type WorkflowStep } from "./hooks/useResume";
import { ReviewPane } from "./components/ReviewPane";
import { SuggestionModal } from "./components/SuggestionModal";
import { Icon } from "./components/Icon";
import { PaginatedResumePreview, type PaginatedResumePreviewHandle } from "./components/PaginatedResumePreview";
import { neonClient, neonConfig } from "./lib/neonClient";
import { deleteSavedResume, getSavedResume, listSavedResumes, saveResume } from "./services/savedResumeService";
import { parseResumeFile } from "./services/resumeFileParser";
import type { DraftChatMessage, ResumeDraftSnapshot, ResumeTemplate, SavedResume, SavedResumeSummary } from "./types";
import {
  defaultPdfSettings,
  layoutWidthPresets,
  paperSizePresets,
  slugifyFileName,
  type PaperSizePresetId,
  type PdfMarginsMm,
  type PdfRenderSettings,
} from "./services/pdfStudioRenderer";

type StepConfig = {
  id: WorkflowStep;
  label: string;
};

const steps: StepConfig[] = [
  { id: "create", label: "Create" },
  { id: "review", label: "Review" },
  { id: "design", label: "Design" },
  { id: "download", label: "Download" },
];

const REVIEW_STORAGE_VERSION = 2;

type BrowserLocation = {
  pathname: string;
  search: string;
  hash: string;
};

type AuthLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

type AuthFeedbackVariant = "error" | "success" | "info";

type AuthFeedback = {
  variant: AuthFeedbackVariant;
  message: string;
};

type AuthToast = {
  variant?: string;
  message?: string;
};

const getBrowserLocation = (): BrowserLocation => {
  if (typeof window === "undefined") {
    return { pathname: "/", search: "", hash: "" };
  }

  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  };
};

const isSameOriginHref = (href: string) => {
  if (typeof window === "undefined") return false;
  return new URL(href, window.location.href).origin === window.location.origin;
};

const isAuthActionPath = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  return segments[0] === "auth" && ["callback", "sign-out"].includes(segments[segments.length - 1] || "");
};

const normalizeAuthMessage = (message: string) => {
  const normalized = message.trim().toLowerCase().replace(/\.$/, "");

  if (normalized === "invalid email or password") {
    return "The email or password is incorrect. Check your credentials and try again.";
  }
  if (normalized === "email not verified" || normalized === "email_not_verified") {
    return "Please verify your email address before signing in. Check your inbox for the verification link.";
  }
  if (normalized === "user already exists" || normalized === "user already exists use another email") {
    return "An account already exists for that email. Sign in instead, or use a different email.";
  }
  if (normalized === "invalid email") {
    return "Enter a valid email address.";
  }
  if (normalized === "password too short") {
    return "Use a longer password.";
  }
  if (normalized === "password too long") {
    return "Use a shorter password.";
  }
  if (normalized === "missing captcha response" || normalized === "captcha verification failed") {
    return "Complete the verification challenge and try again.";
  }
  if (normalized === "too many attempts" || normalized === "rate limit exceeded") {
    return "Too many attempts. Wait a minute, then try again.";
  }
  if (normalized === "request failed") {
    return "Authentication is temporarily unavailable. Please try again.";
  }

  return message;
};

const getAuthFeedbackVariant = (variant: string | undefined): AuthFeedbackVariant => {
  if (variant === "error") return "error";
  if (variant === "success") return "success";
  return "info";
};

const resumeSessionKeys = [
  "activeStep",
  "rawText",
  "tuneForJob",
  "jobDescription",
  "resumeMarkdown",
  "activeTemplateId",
  "importedTemplates",
  "draftChatMessages",
  "review",
  "pdfRenderSettings",
  "exportFileName",
  "designSidebarCollapsed",
];

const clearResumeSession = () => {
  resumeSessionKeys.forEach((key) => sessionStorage.removeItem(key));
};

const hydrateResumeSession = (resume: SavedResume) => {
  clearResumeSession();
  sessionStorage.setItem("activeStep", resume.activeStep);
  sessionStorage.setItem("rawText", resume.rawText);
  sessionStorage.setItem("tuneForJob", String(resume.tuneForJob));
  sessionStorage.setItem("jobDescription", resume.jobDescription);
  sessionStorage.setItem("resumeMarkdown", resume.resumeMarkdown);
  sessionStorage.setItem("activeTemplateId", resume.activeTemplateId);
  sessionStorage.setItem("importedTemplates", JSON.stringify(resume.importedTemplates));
  sessionStorage.setItem("draftChatMessages", JSON.stringify(resume.draftChatMessages));
  sessionStorage.setItem("exportFileName", resume.fileName);

  if (resume.review) {
    sessionStorage.setItem("review", JSON.stringify({ version: REVIEW_STORAGE_VERSION, review: resume.review }));
  }

  if (resume.renderSettings) {
    sessionStorage.setItem("pdfRenderSettings", JSON.stringify(resume.renderSettings));
  }
};

const inferResumeTitle = (snapshot: ResumeDraftSnapshot): string => {
  const markdownName = snapshot.resumeMarkdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "));
  const rawName = snapshot.rawText
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  const fallback = snapshot.fileName.trim();
  return markdownName?.replace(/^#+\s*/, "").trim() || rawName || fallback || "Untitled resume";
};

const formatUpdatedAt = (value: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

const canUseStep = (step: WorkflowStep, hasDraft: boolean): boolean => {
  if (step === "create") return true;
  return hasDraft;
};

type RenderSettingsState = {
  paperSizeId: PaperSizePresetId;
  layoutWidthPx: number;
  marginsMm: PdfMarginsMm;
};

const defaultRenderSettingsState: RenderSettingsState = {
  paperSizeId: "a4",
  layoutWidthPx: defaultPdfSettings.layoutWidthPx,
  marginsMm: defaultPdfSettings.marginsMm,
};

const clampNumber = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const readStoredRenderSettings = (): RenderSettingsState => {
  const saved = sessionStorage.getItem("pdfRenderSettings");
  if (!saved) return defaultRenderSettingsState;

  try {
    const parsed = JSON.parse(saved) as Partial<RenderSettingsState>;
    const paperSizeId: PaperSizePresetId =
      parsed.paperSizeId && paperSizePresets.some((preset) => preset.id === parsed.paperSizeId) ? parsed.paperSizeId : "a4";
    const layoutWidthPx =
      typeof parsed.layoutWidthPx === "number" && layoutWidthPresets.some((preset) => preset.value === parsed.layoutWidthPx)
        ? parsed.layoutWidthPx
        : defaultRenderSettingsState.layoutWidthPx;
    const margins = parsed.marginsMm ?? defaultRenderSettingsState.marginsMm;

    return {
      paperSizeId,
      layoutWidthPx,
      marginsMm: {
        top: clampNumber(Number(margins.top) || 0, 0, 40),
        right: clampNumber(Number(margins.right) || 0, 0, 40),
        bottom: clampNumber(Number(margins.bottom) || 0, 0, 40),
        left: clampNumber(Number(margins.left) || 0, 0, 40),
      },
    };
  } catch {
    return defaultRenderSettingsState;
  }
};

const toPdfSettings = (settings: RenderSettingsState): PdfRenderSettings => {
  const paper = paperSizePresets.find((preset) => preset.id === settings.paperSizeId) ?? paperSizePresets[0];
  return {
    ...defaultPdfSettings,
    paperLabel: paper.label,
    paperWidthMm: paper.widthMm,
    paperHeightMm: paper.heightMm,
    layoutWidthPx: settings.layoutWidthPx,
    marginsMm: settings.marginsMm,
  };
};

const Spinner = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center gap-2 text-sm font-semibold">
    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
    <span>{label}</span>
  </div>
);

const MarkdownEditor = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => (
  <textarea
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    spellCheck
    className="h-full min-h-[52vh] w-full resize-none rounded-md border border-slate-200 bg-white p-4 font-mono text-[13px] leading-6 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 sm:min-h-[58vh]"
  />
);

const TemplateGallery = ({
  templates,
  activeTemplate,
  onSelectTemplate,
}: {
  templates: ResumeTemplate[];
  activeTemplate: ResumeTemplate;
  onSelectTemplate: (template: ResumeTemplate) => void;
}) => (
  <div className="grid gap-2">
    {templates.map((template) => {
      const isActive = template.id === activeTemplate.id;
      const isTwoColumn = template.layout.type === "two-column";
      const hasFeaturedHeader = template.layout.featured?.includes("Header");
      const isAtsCompliant = template.atsCompliant;
      return (
        <button
          key={template.id}
          onClick={() => onSelectTemplate(template)}
          title={`Apply ${template.name} template`}
          aria-label={`Apply ${template.name} template`}
          className={`group grid min-h-[118px] grid-cols-[96px_minmax(0,1fr)] gap-3 rounded-md border p-3 text-left transition ${
            isActive
              ? "border-sky-500 bg-white ring-2 ring-sky-100"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <span className="relative h-[92px] overflow-hidden rounded border border-slate-200 bg-slate-100 shadow-sm" aria-hidden="true">
            <span className="absolute inset-x-3 bottom-2 top-2 rounded-sm bg-white shadow-sm" />
            {hasFeaturedHeader && (
              <span className="absolute left-3 right-3 top-2 h-4 rounded-t-sm" style={{ backgroundColor: template.thumbnailColor }} />
            )}
            {isAtsCompliant && (
              <span className="absolute right-1.5 top-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-black leading-none text-white shadow-sm ring-1 ring-white/70">
                ATS
              </span>
            )}
            <span
              className={`absolute left-5 top-5 h-2 rounded-sm ${hasFeaturedHeader ? "bg-white/95" : "bg-slate-800/85"}`}
              style={{ right: isTwoColumn ? "35px" : "20px" }}
            />
            <span
              className={`absolute left-5 top-9 h-1 rounded-sm ${hasFeaturedHeader ? "bg-white/70" : "bg-slate-300"}`}
              style={{ right: isTwoColumn ? "43px" : "30px" }}
            />
            {isTwoColumn ? (
              <>
                <span
                  className="absolute bottom-5 left-5 top-12 w-6 rounded-sm"
                  style={{ backgroundColor: template.thumbnailColor, opacity: 0.18 }}
                />
                <span className="absolute bottom-5 left-14 right-5 top-12 rounded-sm bg-slate-100" />
                <span className="absolute left-16 right-8 top-[58px] h-1 rounded-sm bg-slate-300" />
                <span className="absolute left-16 right-10 top-[66px] h-1 rounded-sm bg-slate-300" />
                <span className="absolute left-7 top-[58px] h-1 w-3 rounded-sm bg-slate-300" />
                <span className="absolute left-7 top-[66px] h-1 w-4 rounded-sm bg-slate-300" />
              </>
            ) : (
              <>
                <span className="absolute left-5 right-5 top-[52px] h-1 rounded-sm bg-slate-300" />
                <span className="absolute left-5 right-8 top-[60px] h-1 rounded-sm bg-slate-300" />
                <span className="absolute left-5 right-11 top-[70px] h-1 rounded-sm bg-slate-300" />
                <span className="absolute bottom-4 left-5 h-1 w-9 rounded-sm" style={{ backgroundColor: template.thumbnailColor }} />
              </>
            )}
          </span>
          <span className="flex min-w-0 flex-col justify-center">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-bold text-slate-900">{template.name}</span>
              {isActive && <span className="h-2 w-2 flex-none rounded-full bg-sky-500" />}
            </span>
            <span className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {isTwoColumn ? "Two column" : "Single column"}
              </span>
              {isAtsCompliant && (
                <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  ATS
                </span>
              )}
              {template.source === "imported" && (
                <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  Imported
                </span>
              )}
            </span>
          </span>
        </button>
      );
    })}
  </div>
);

const FieldLabel = ({ children }: { children: string }) => (
  <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{children}</span>
);

const RenderSettingsPanel = ({
  settings,
  onChange,
}: {
  settings: RenderSettingsState;
  onChange: (settings: RenderSettingsState) => void;
}) => {
  const updateMargin = (key: keyof PdfMarginsMm, value: string) => {
    const numericValue = clampNumber(Number(value), 0, 40);
    onChange({
      ...settings,
      marginsMm: {
        ...settings.marginsMm,
        [key]: Number.isFinite(numericValue) ? numericValue : 0,
      },
    });
  };

  return (
    <section className="rounded-md border border-slate-200 bg-white">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-base font-bold text-slate-900">Page Setup</h2>
      </div>
      <div className="grid gap-4 p-4">
        <label className="grid gap-1.5">
          <FieldLabel>Paper Size</FieldLabel>
          <select
            value={settings.paperSizeId}
            onChange={(event) => onChange({ ...settings, paperSizeId: event.target.value as PaperSizePresetId })}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            {paperSizePresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label} ({preset.widthMm} x {preset.heightMm} mm)
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5">
          <FieldLabel>Layout Width</FieldLabel>
          <select
            value={settings.layoutWidthPx}
            onChange={(event) => onChange({ ...settings, layoutWidthPx: Number(event.target.value) })}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            {layoutWidthPresets.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="grid gap-2">
          <legend className="mb-2">
            <FieldLabel>Page Margins</FieldLabel>
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {(["top", "right", "bottom", "left"] as const).map((key) => (
              <label key={key} className="grid gap-1.5">
                <span className="text-xs font-semibold capitalize text-slate-600">{key}</span>
                <div className="flex h-10 overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
                  <input
                    value={settings.marginsMm[key]}
                    onChange={(event) => updateMargin(key, event.target.value)}
                    type="number"
                    min={0}
                    max={40}
                    step={1}
                    className="min-w-0 flex-1 border-0 px-3 text-sm font-semibold text-slate-800 outline-none"
                  />
                  <span className="flex items-center border-l border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-500">
                    mm
                  </span>
                </div>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
};

const DraftChangeChat = ({
  messages,
  isLoading,
  disabled,
  hasPendingChange,
  onSend,
  onConfirm,
  onCancel,
}: {
  messages: DraftChatMessage[];
  isLoading: boolean;
  disabled: boolean;
  hasPendingChange: boolean;
  onSend: (request: string) => Promise<void>;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) => {
  const [request, setRequest] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextRequest = request.trim();
    if (!nextRequest || disabled || isLoading || hasPendingChange) return;
    setRequest("");
    await onSend(nextRequest);
  };

  return (
    <section className="border-t border-slate-200 bg-slate-50">
      <div className="grid gap-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">Ask AI to change</h3>
          {isLoading && <span className="text-xs font-semibold text-slate-500">Thinking...</span>}
        </div>

        {messages.length > 0 && (
          <div className="max-h-36 overflow-y-auto rounded-md border border-slate-200 bg-white p-2">
            <div className="grid gap-2">
              {messages.slice(-6).map((message) => (
                <div
                  key={message.id}
                  className={`rounded-md px-3 py-2 text-sm leading-5 ${
                    message.role === "user"
                      ? "ml-8 bg-sky-50 text-slate-800"
                      : message.tone === "blocked"
                        ? "mr-8 border border-red-200 bg-red-50 text-red-800"
                        : message.tone === "caution"
                          ? "mr-8 border border-amber-200 bg-amber-50 text-amber-900"
                          : "mr-8 bg-white text-slate-700"
                  }`}
                >
                  {message.content}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasPendingChange && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="rounded-md bg-amber-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-amber-300"
            >
              Apply Anyway
            </button>
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Keep Draft
            </button>
          </div>
        )}

        <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_96px]" onSubmit={handleSubmit}>
          <textarea
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            placeholder="Ask AI to change the Markdown draft..."
            disabled={disabled || isLoading || hasPendingChange}
            className="min-h-[74px] resize-none rounded-md border border-slate-300 bg-white p-3 text-sm leading-5 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          />
          <button
            type="submit"
            disabled={disabled || isLoading || hasPendingChange || !request.trim()}
            className="flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Icon name="sparkle" className="h-4 w-4" />
            Send
          </button>
        </form>
      </div>
    </section>
  );
};

const ImportTemplateModal = ({
  isOpen,
  isLoading,
  onClose,
  onImport,
}: {
  isOpen: boolean;
  isLoading: boolean;
  onClose: () => void;
  onImport: (templateHtml: string) => Promise<void>;
}) => {
  const [templateHtml, setTemplateHtml] = useState("");

  if (!isOpen) return null;

  const handleImport = async () => {
    try {
      await onImport(templateHtml);
      setTemplateHtml("");
      onClose();
    } catch {
      // The import handler already reports the error and keeps the modal open for edits.
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/50 p-0 sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-md bg-white shadow-2xl sm:rounded-md"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
          <h2 className="text-base font-bold text-slate-900">Import Style</h2>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            disabled={isLoading}
          >
            Close
          </button>
        </header>
        <main className="min-h-0 flex-1 p-4">
          <textarea
            value={templateHtml}
            onChange={(event) => setTemplateHtml(event.target.value)}
            placeholder="Paste HTML and CSS here..."
            className="h-[52vh] w-full resize-none rounded-md border border-slate-300 bg-slate-50 p-4 font-mono text-xs leading-5 text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </main>
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={isLoading || !templateHtml.trim()}
            className="rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
          >
            {isLoading ? "Importing..." : "Import Style"}
          </button>
        </footer>
      </div>
    </div>
  );
};

type ResumeEditorProps = {
  savedResumeId?: string | null;
  canSaveToCloud?: boolean;
  onBackToDashboard?: () => void;
  onSaveResume?: (snapshot: ResumeDraftSnapshot, title: string) => Promise<SavedResume>;
};

function ResumeEditor({
  savedResumeId = null,
  canSaveToCloud = false,
  onBackToDashboard,
  onSaveResume,
}: ResumeEditorProps) {
  const {
    activeStep,
    setActiveStep,
    rawText,
    setRawText,
    tuneForJob,
    setTuneForJob,
    jobDescription,
    setJobDescription,
    resumeMarkdown,
    updateResumeMarkdown,
    resumeHtml,
    review,
    isLoadingGeneration,
    isLoadingReview,
    isLoadingDraftChange,
    isLoadingTemplateImport,
    handleGenerateResume,
    draftChatMessages,
    pendingDraftChange,
    handleRequestDraftChange,
    handleConfirmDraftChange,
    handleCancelDraftChange,
    handleReviewResume,
    activeTemplate,
    allTemplates,
    handleSelectTemplate,
    handleImportTemplate,
    activeSuggestion,
    isLoadingApply,
    handleSelectSuggestion,
    handleCloseSuggestionModal,
    handleApplySuggestion,
    handleDiscardSuggestion,
    resetResume,
  } = useResume();

  const [isExporting, setIsExporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDesignSidebarCollapsed, setIsDesignSidebarCollapsed] = useState(
    () => sessionStorage.getItem("designSidebarCollapsed") === "true"
  );
  const [renderSettings, setRenderSettings] = useState<RenderSettingsState>(readStoredRenderSettings);
  const [fileName, setFileName] = useState(() => sessionStorage.getItem("exportFileName") || "resume");
  const [isSavingResume, setIsSavingResume] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isParsingResumeFile, setIsParsingResumeFile] = useState(false);
  const [resumeUploadMessage, setResumeUploadMessage] = useState("");
  const paginatedPreviewRef = useRef<PaginatedResumePreviewHandle>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);
  const hasDraft = resumeMarkdown.trim().length > 0;
  const pdfSettings = useMemo(() => toPdfSettings(renderSettings), [renderSettings]);

  useEffect(() => {
    sessionStorage.setItem("pdfRenderSettings", JSON.stringify(renderSettings));
  }, [renderSettings]);

  useEffect(() => {
    sessionStorage.setItem("exportFileName", fileName);
  }, [fileName]);

  useEffect(() => {
    sessionStorage.setItem("designSidebarCollapsed", String(isDesignSidebarCollapsed));
  }, [isDesignSidebarCollapsed]);

  const goToStep = (step: WorkflowStep) => {
    if (canUseStep(step, hasDraft)) {
      setActiveStep(step);
    }
  };

  const buildSnapshot = (): ResumeDraftSnapshot => ({
    rawText,
    tuneForJob,
    jobDescription,
    resumeMarkdown,
    activeStep,
    activeTemplateId: activeTemplate.id,
    importedTemplates: allTemplates.filter((template) => template.source === "imported"),
    draftChatMessages,
    review,
    renderSettings,
    fileName,
  });

  const saveCurrentResume = async () => {
    if (!onSaveResume) return null;

    const snapshot = buildSnapshot();
    return onSaveResume(snapshot, inferResumeTitle(snapshot));
  };

  const handleResumeFileChange = async (event: FormEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || isParsingResumeFile) return;

    setIsParsingResumeFile(true);
    setResumeUploadMessage(`Reading ${file.name}...`);
    try {
      const parsedText = await parseResumeFile(file);
      setRawText(parsedText);
      setResumeUploadMessage(`Loaded ${file.name}. Review the extracted text before creating the draft.`);
    } catch (error) {
      console.error("Error parsing resume file:", error);
      const message = error instanceof Error ? error.message : "Unable to read that resume file.";
      setResumeUploadMessage(message);
      alert(message);
    } finally {
      setIsParsingResumeFile(false);
    }
  };

  const handleSaveResume = async () => {
    if (!onSaveResume || isSavingResume) return;
    setIsSavingResume(true);
    setSaveMessage("");

    try {
      const saved = await saveCurrentResume();
      if (!saved) return;
      setSaveMessage(`Saved ${saved.title}`);
    } catch (error) {
      console.error("Failed to save resume:", error);
      setSaveMessage("Could not save. Check Neon Auth and Data API setup.");
    } finally {
      setIsSavingResume(false);
    }
  };

  const handleBackToDashboard = async () => {
    if (!onBackToDashboard || isSavingResume) return;

    if (!canSaveToCloud || !onSaveResume || !hasDraft) {
      onBackToDashboard();
      return;
    }

    setIsSavingResume(true);
    setSaveMessage("Saving draft...");

    try {
      const saved = await saveCurrentResume();
      if (saved) {
        setSaveMessage(`Saved ${saved.title}`);
        setIsSavingResume(false);
        onBackToDashboard();
      }
    } catch (error) {
      console.error("Failed to save resume before returning to dashboard:", error);
      setSaveMessage("Could not save. Stay here and try Save again.");
      setIsSavingResume(false);
    }
  };

  const exportResume = async (type: "pdf" | "code") => {
    if (!resumeHtml) {
      alert("Create a resume draft before exporting.");
      return;
    }

    const exportFileName = fileName.trim() || "resume";
    setIsExporting(true);
    try {
      if (type === "pdf") {
        if (!paginatedPreviewRef.current) throw new Error("Paginated preview is not ready yet.");
        await paginatedPreviewRef.current.exportPdf(exportFileName);
        return;
      }

      const blob = new Blob([resumeHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugifyFileName(exportFileName)}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error during export:", error);
      alert("Failed to export. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img src="/weave.png" alt="WeaveCV Logo" className="h-8 w-8" />
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">WeaveCV</h1>
                <p className="truncate text-xs font-semibold text-slate-500">
                  {savedResumeId ? "Saved resume" : canSaveToCloud ? "Unsaved cloud draft" : "Local draft"}
                </p>
              </div>
            </div>
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0" aria-label="Resume workflow">
            {steps.map((step, index) => {
              const isActive = activeStep === step.id;
              const isDisabled = !canUseStep(step.id, hasDraft);
              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  disabled={isDisabled}
                  className={`flex min-w-fit items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "border-sky-500 bg-sky-500 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                      isActive ? "bg-white text-sky-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {index + 1}
                  </span>
                  {step.label}
                </button>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            {saveMessage && <span className="text-xs font-semibold text-slate-500">{saveMessage}</span>}
            {onBackToDashboard && (
              <button
                onClick={handleBackToDashboard}
                disabled={isSavingResume}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingResume ? "Saving..." : "Dashboard"}
              </button>
            )}
            {onSaveResume && (
              <button
                onClick={handleSaveResume}
                disabled={!canSaveToCloud || isSavingResume}
                className="rounded-md bg-sky-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
              >
                {isSavingResume ? "Saving..." : "Save"}
              </button>
            )}
            <button
              onClick={resetResume}
              className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              Start Over
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5">
        {activeStep === "create" && (
          <section className="grid min-h-[calc(100vh-132px)] grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,420px)_1fr]">
            <div className="flex min-h-0 flex-col gap-4">
              <div className="flex min-h-[42vh] flex-col rounded-md border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">Resume Text</h2>
                    <p className="mt-1 text-xs text-slate-500">Paste text or upload a PDF, DOCX, or TXT resume.</p>
                  </div>
                  <input
                    ref={resumeFileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                    onChange={handleResumeFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => resumeFileInputRef.current?.click()}
                    disabled={isParsingResumeFile}
                    className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isParsingResumeFile ? (
                      <Spinner label="Reading" />
                    ) : (
                      <>
                        <Icon name="upload" className="h-4 w-4" />
                        Upload Resume
                      </>
                    )}
                  </button>
                </div>
                {resumeUploadMessage && (
                  <div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
                    {resumeUploadMessage}
                  </div>
                )}
                <textarea
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  placeholder="Paste your resume notes here or upload an existing resume."
                  className="min-h-0 flex-1 resize-none rounded-b-md border-0 bg-white p-4 text-sm leading-6 text-slate-800 outline-none focus:ring-2 focus:ring-inset focus:ring-sky-100"
                />
              </div>

              <div className="flex min-h-[28vh] flex-col rounded-md border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={tuneForJob}
                      onChange={(event) => setTuneForJob(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-base font-bold text-slate-800">Tune resume for a job</span>
                  </label>
                </div>
                <textarea
                  value={jobDescription}
                  onChange={(event) => setJobDescription(event.target.value)}
                  disabled={!tuneForJob}
                  placeholder={tuneForJob ? "Paste a target job description..." : "Enable tuning to paste a job description."}
                  className={`min-h-0 flex-1 resize-none rounded-b-md border-0 p-4 text-sm leading-6 outline-none focus:ring-2 focus:ring-inset focus:ring-sky-100 ${
                    tuneForJob
                      ? "bg-white text-slate-800"
                      : "cursor-not-allowed bg-slate-100 text-slate-400 placeholder:text-slate-400"
                  }`}
                />
              </div>

              <button
                onClick={handleGenerateResume}
                disabled={isLoadingGeneration || isParsingResumeFile}
                className="flex items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
              >
                {isLoadingGeneration ? (
                  <Spinner label="Creating Draft" />
                ) : (
                  <>
                    <Icon name="generate" className="h-5 w-5" />
                    Create Draft
                  </>
                )}
              </button>
            </div>

            <div className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                <h2 className="text-base font-bold text-slate-800">Markdown Draft</h2>
                <button
                  onClick={() => setActiveStep("review")}
                  disabled={!hasDraft}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Continue to Review
                </button>
              </div>
              <div className="min-h-0 flex-1 p-3">
                <MarkdownEditor
                  value={resumeMarkdown}
                  onChange={updateResumeMarkdown}
                  placeholder="Your AI-generated markdown resume will appear here."
                />
              </div>
              <DraftChangeChat
                messages={draftChatMessages}
                isLoading={isLoadingDraftChange}
                disabled={!hasDraft}
                hasPendingChange={!!pendingDraftChange}
                onSend={(request) => handleRequestDraftChange(request)}
                onConfirm={handleConfirmDraftChange}
                onCancel={handleCancelDraftChange}
              />
            </div>
          </section>
        )}

        {activeStep === "review" && (
          <section className="grid min-h-[calc(100vh-132px)] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-h-0 flex-col rounded-md border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                <h2 className="text-base font-bold text-slate-800">Content Editor</h2>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleReviewResume}
                    disabled={!hasDraft || isLoadingReview}
                    className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    {isLoadingReview ? (
                      <Spinner label="Reviewing" />
                    ) : (
                      <>
                        <Icon name="review" className="h-4 w-4" />
                        Run ATS Review
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveStep("design")}
                    disabled={!hasDraft}
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Continue to Design
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 p-3">
                <MarkdownEditor
                  value={resumeMarkdown}
                  onChange={updateResumeMarkdown}
                  placeholder="Edit the markdown content before review."
                />
              </div>
            </div>

            <div className="min-h-[54vh] xl:min-h-0">
              <ReviewPane
                review={review}
                isLoading={isLoadingReview}
                onSelectSuggestion={handleSelectSuggestion}
                onDiscardSuggestion={handleDiscardSuggestion}
              />
            </div>
          </section>
        )}

        {activeStep === "design" && (
          <section
            className="grid min-h-[calc(100vh-132px)] grid-cols-1 gap-4 transition-[grid-template-columns] xl:grid-cols-[var(--design-sidebar-width)_minmax(0,1fr)]"
            style={{ "--design-sidebar-width": isDesignSidebarCollapsed ? "72px" : "430px" } as CSSProperties}
          >
            <aside className="min-h-0">
              {isDesignSidebarCollapsed ? (
                <div className="flex min-h-[72px] items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-3 xl:min-h-full xl:flex-col xl:justify-start">
                  <button
                    onClick={() => setIsDesignSidebarCollapsed(false)}
                    title="Expand template gallery"
                    aria-label="Expand template gallery"
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                  >
                    <Icon name="expand" className="h-5 w-5" />
                  </button>
                  <div className="flex min-w-0 items-center gap-2 xl:flex-col">
                    <span className="h-8 w-8 flex-none rounded border border-slate-200" style={{ backgroundColor: activeTemplate.thumbnailColor }} />
                    <span className="truncate text-xs font-bold text-slate-700 xl:[writing-mode:vertical-rl] xl:[text-orientation:mixed]">
                      {activeTemplate.name}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-0 flex-col gap-4">
                  <div className="flex min-h-0 flex-1 flex-col rounded-md border border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-slate-900">Template Gallery</h2>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{allTemplates.length} styles</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsDesignSidebarCollapsed(true)}
                          title="Collapse template gallery"
                          aria-label="Collapse template gallery"
                          className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
                        >
                          <Icon name="collapse" className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setIsImportModalOpen(true)}
                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                        >
                          Import Style
                        </button>
                        <button
                          onClick={() => setActiveStep("download")}
                          disabled={!hasDraft}
                          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                    <div className="min-h-[220px] flex-1 overflow-y-auto p-3 xl:min-h-0">
                      <TemplateGallery templates={allTemplates} activeTemplate={activeTemplate} onSelectTemplate={handleSelectTemplate} />
                    </div>
                  </div>

                  <RenderSettingsPanel settings={renderSettings} onChange={setRenderSettings} />
                </div>
              )}
            </aside>

            <div className="min-h-0 rounded-md border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-slate-900">{activeTemplate.name}</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {activeTemplate.layout.type === "two-column" ? "Two column" : "Single column"}
                    {activeTemplate.atsCompliant ? " · ATS" : ""}
                    {activeTemplate.source === "imported" ? " · Imported" : ""}
                  </p>
                </div>
                <button
                  onClick={() => setActiveStep("download")}
                  disabled={!hasDraft}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Download
                </button>
              </div>
              <div className="p-3">
                <PaginatedResumePreview ref={paginatedPreviewRef} html={resumeHtml} settings={pdfSettings} title={activeTemplate.name} />
              </div>
            </div>
          </section>
        )}

        {activeStep === "download" && (
          <section className="grid min-h-[calc(100vh-132px)] grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <h2 className="mb-4 text-base font-bold text-slate-800">Export</h2>
              <label className="mb-4 grid gap-1.5">
                <FieldLabel>File Name</FieldLabel>
                <input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  placeholder="resume"
                  className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <div className="grid gap-2">
                <button
                  onClick={() => exportResume("pdf")}
                  disabled={!hasDraft || isExporting}
                  className="flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-300"
                >
                  <Icon name="download" className="h-5 w-5" />
                  PDF
                </button>
                <button
                  onClick={() => exportResume("code")}
                  disabled={!hasDraft || isExporting}
                  className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name="download" className="h-5 w-5" />
                  HTML
                </button>
              </div>
              {isExporting && <p className="mt-3 text-sm font-semibold text-slate-500">Exporting...</p>}
            </div>

            <div className="min-h-0 rounded-md border border-slate-200 bg-white p-3">
              <PaginatedResumePreview ref={paginatedPreviewRef} html={resumeHtml} settings={pdfSettings} title={activeTemplate.name} />
            </div>
          </section>
        )}
      </main>

      {activeSuggestion && (
        <SuggestionModal
          suggestion={activeSuggestion}
          isOpen={!!activeSuggestion}
          onClose={handleCloseSuggestionModal}
          onApply={handleApplySuggestion}
          isLoading={isLoadingApply}
        />
      )}
      <ImportTemplateModal
        isOpen={isImportModalOpen}
        isLoading={isLoadingTemplateImport}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportTemplate}
      />
    </div>
  );
}

const LoadingScreen = ({ label }: { label: string }) => (
  <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-700">
    <div className="rounded-md border border-slate-200 bg-white px-5 py-4 text-sm font-semibold shadow-sm">{label}</div>
  </div>
);

const SetupNotice = ({ onContinueLocal }: { onContinueLocal: () => void }) => (
  <div className="min-h-screen bg-slate-100 text-slate-900">
    <main className="mx-auto grid min-h-screen max-w-3xl place-items-center px-4 py-8">
      <section className="w-full rounded-md border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/weave.png" alt="WeaveCV Logo" className="h-9 w-9" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Finish Neon Auth Setup</h1>
            <p className="mt-1 text-sm font-semibold text-slate-500">The database is connected. Auth and Data API env vars are still missing.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          <p>
            Enable Neon Auth and the Neon Data API for the new <span className="font-bold">neon-rose-bridge</span> resource, then pull env
            vars again with <span className="font-mono font-bold">vercel env pull .env.local</span>.
          </p>
          <p className="font-mono text-xs">
            Required client env: VITE_NEON_AUTH_URL and VITE_NEON_DATA_API_URL
          </p>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onContinueLocal}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            Continue Locally
          </button>
        </div>
      </section>
    </main>
  </div>
);

const AuthFeedbackNotice = ({ feedback, onDismiss }: { feedback: AuthFeedback; onDismiss: () => void }) => {
  const isError = feedback.variant === "error";
  const isSuccess = feedback.variant === "success";
  const classes = isError
    ? "border-red-200 bg-red-50 text-red-800"
    : isSuccess
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-sky-200 bg-sky-50 text-sky-800";

  return (
    <div className={`mb-3 flex gap-3 rounded-md border p-3 text-sm font-semibold leading-5 ${classes}`} role="alert">
      <p className="min-w-0 flex-1">{feedback.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="h-fit rounded-sm px-1 text-current opacity-70 transition hover:bg-white/60 hover:opacity-100"
        aria-label="Dismiss authentication message"
      >
        x
      </button>
    </div>
  );
};

const AuthScreen = ({
  authFeedback,
  onClearAuthFeedback,
  onContinueLocal,
  pathname,
}: {
  authFeedback: AuthFeedback | null;
  onClearAuthFeedback: () => void;
  onContinueLocal: () => void;
  pathname: string;
}) => (
  <div className="min-h-screen bg-slate-100 text-slate-900">
    <main className="mx-auto grid min-h-screen max-w-5xl grid-cols-1 items-center gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="grid gap-4">
        <div className="flex items-center gap-3">
          <img src="/weave.png" alt="WeaveCV Logo" className="h-10 w-10" />
          <h1 className="text-2xl font-bold text-slate-900">WeaveCV</h1>
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-normal text-slate-950">Your resumes, saved in one place</h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">
            Sign in to keep drafts, imported styles, reviews, and export settings attached to your account.
          </p>
        </div>
        <button
          onClick={onContinueLocal}
          className="w-fit rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
        >
          Continue without saving
        </button>
      </section>
      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        {authFeedback && <AuthFeedbackNotice feedback={authFeedback} onDismiss={onClearAuthFeedback} />}
        <AuthView pathname={pathname} />
      </section>
    </main>
  </div>
);

type DashboardProps = {
  onNewResume: () => void;
  onOpenResume: (resume: SavedResume) => void;
};

const Dashboard = ({ onNewResume, onOpenResume }: DashboardProps) => {
  const [resumes, setResumes] = useState<SavedResumeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const refreshResumes = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      setResumes(await listSavedResumes());
    } catch (loadError) {
      console.error("Failed to load resumes:", loadError);
      setError("Could not load saved resumes. Check Neon Auth, Data API, and the resumes table policies.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshResumes();
  }, [refreshResumes]);

  const handleOpen = async (id: string) => {
    setOpeningId(id);
    setError("");
    try {
      onOpenResume(await getSavedResume(id));
    } catch (openError) {
      console.error("Failed to open resume:", openError);
      setError("Could not open that resume.");
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this resume?")) return;
    setError("");
    try {
      await deleteSavedResume(id);
      setResumes((current) => current.filter((resume) => resume.id !== id));
    } catch (deleteError) {
      console.error("Failed to delete resume:", deleteError);
      setError("Could not delete that resume.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/weave.png" alt="WeaveCV Logo" className="h-9 w-9" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-sm font-semibold text-slate-500">{resumes.length} saved resumes</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onNewResume}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-700"
            >
              New Resume
            </button>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-5">
        {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div>}

        {isLoading ? (
          <div className="rounded-md border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">Loading resumes...</div>
        ) : resumes.length === 0 ? (
          <section className="rounded-md border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900">No saved resumes yet</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Create your first draft, then use Save from the editor header to keep it here.
            </p>
            <button
              onClick={onNewResume}
              className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              Create Resume
            </button>
          </section>
        ) : (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {resumes.map((resume) => (
              <article key={resume.id} className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
                <div className="min-h-[88px]">
                  <h2 className="line-clamp-2 text-base font-bold text-slate-900">{resume.title}</h2>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Updated {formatUpdatedAt(resume.updatedAt)}
                  </p>
                  <p className="mt-2 truncate text-sm text-slate-600">{resume.fileName || "resume"}</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleOpen(resume.id)}
                    disabled={openingId === resume.id}
                    className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {openingId === resume.id ? "Opening..." : "Open"}
                  </button>
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-red-200 bg-white text-red-700 transition hover:bg-red-50"
                    aria-label={`Delete ${resume.title}`}
                    title="Delete resume"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
};

const AuthActionScreen = ({ pathname }: { pathname: string }) => (
  <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-700">
    <AuthView pathname={pathname} />
  </div>
);

const ConfiguredApp = ({
  authFeedback,
  onClearAuthFeedback,
  pathname,
}: {
  authFeedback: AuthFeedback | null;
  onClearAuthFeedback: () => void;
  pathname: string;
}) => {
  if (!neonClient) return null;

  const session = neonClient.auth.useSession();
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [view, setView] = useState<"dashboard" | "editor">("dashboard");
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState("dashboard");

  if (session.isPending) {
    return <LoadingScreen label="Checking account..." />;
  }

  if (isAuthActionPath(pathname)) {
    return <AuthActionScreen pathname={pathname} />;
  }

  if (!session.data && !isLocalMode) {
    return (
      <AuthScreen
        authFeedback={authFeedback}
        onClearAuthFeedback={onClearAuthFeedback}
        pathname={pathname}
        onContinueLocal={() => setIsLocalMode(true)}
      />
    );
  }

  if (isLocalMode) {
    return <ResumeEditor canSaveToCloud={false} />;
  }

  const handleNewResume = () => {
    clearResumeSession();
    setSelectedResumeId(null);
    setEditorKey(`new-${Date.now()}`);
    setView("editor");
  };

  const handleOpenResume = (resume: SavedResume) => {
    hydrateResumeSession(resume);
    setSelectedResumeId(resume.id);
    setEditorKey(resume.id);
    setView("editor");
  };

  const handleSave = async (snapshot: ResumeDraftSnapshot, title: string) => {
    const saved = await saveResume(snapshot, { id: selectedResumeId, title });
    setSelectedResumeId(saved.id);
    return saved;
  };

  if (view === "editor") {
    return (
      <ResumeEditor
        key={editorKey}
        savedResumeId={selectedResumeId}
        canSaveToCloud
        onBackToDashboard={() => setView("dashboard")}
        onSaveResume={handleSave}
      />
    );
  }

  return <Dashboard onNewResume={handleNewResume} onOpenResume={handleOpenResume} />;
};

export default function App() {
  const [continueLocal, setContinueLocal] = useState(false);
  const [authLocation, setAuthLocation] = useState(getBrowserLocation);
  const [authFeedback, setAuthFeedback] = useState<AuthFeedback | null>(null);
  const appOrigin = typeof window === "undefined" ? "" : window.location.origin;

  useEffect(() => {
    const syncLocation = () => setAuthLocation(getBrowserLocation());

    window.addEventListener("popstate", syncLocation);
    return () => window.removeEventListener("popstate", syncLocation);
  }, []);

  const updateAuthLocation = useCallback((href: string, mode: "push" | "replace") => {
    if (typeof window === "undefined") return;

    const url = new URL(href, window.location.href);

    if (url.origin !== window.location.origin) {
      window.location.href = href;
      return;
    }

    const nextPath = `${url.pathname}${url.search}${url.hash}`;
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (mode === "replace") {
      window.history.replaceState(null, "", nextPath);
    } else if (nextPath !== currentPath) {
      window.history.pushState(null, "", nextPath);
    }

    setAuthLocation({ pathname: url.pathname, search: url.search, hash: url.hash });
  }, []);

  const navigateAuth = useCallback((href: string) => updateAuthLocation(href, "push"), [updateAuthLocation]);
  const replaceAuth = useCallback((href: string) => updateAuthLocation(href, "replace"), [updateAuthLocation]);
  const clearAuthFeedback = useCallback(() => setAuthFeedback(null), []);
  const handleAuthToast = useCallback(({ variant, message }: AuthToast) => {
    if (!message) return;
    setAuthFeedback({
      variant: getAuthFeedbackVariant(variant),
      message: normalizeAuthMessage(message),
    });
  }, []);

  const AuthLink = useCallback(
    ({ href, className, children }: AuthLinkProps) => {
      const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          !isSameOriginHref(href)
        ) {
          return;
        }

        event.preventDefault();
        setAuthFeedback(null);
        navigateAuth(href);
      };

      return (
        <a href={href} className={className} onClick={handleClick}>
          {children}
        </a>
      );
    },
    [navigateAuth]
  );

  if (!neonConfig.isConfigured && !continueLocal) {
    return <SetupNotice onContinueLocal={() => setContinueLocal(true)} />;
  }

  if (!neonConfig.isConfigured) {
    return <ResumeEditor canSaveToCloud={false} />;
  }

  return (
    <NeonAuthUIProvider
      authClient={neonClient!.auth}
      navigate={navigateAuth}
      replace={replaceAuth}
      Link={AuthLink}
      redirectTo="/"
      baseURL={appOrigin}
      toast={handleAuthToast}
      localization={{
        INVALID_EMAIL: "Enter a valid email address.",
        INVALID_EMAIL_OR_PASSWORD: "The email or password is incorrect. Check your credentials and try again.",
        EMAIL_NOT_VERIFIED: "Please verify your email address before signing in. Check your inbox for the verification link.",
        USER_ALREADY_EXISTS: "An account already exists for that email. Sign in instead, or use a different email.",
        PASSWORD_TOO_SHORT: "Use a longer password.",
        PASSWORD_TOO_LONG: "Use a shorter password.",
        MISSING_RESPONSE: "Complete the verification challenge and try again.",
        VERIFICATION_FAILED: "Complete the verification challenge and try again.",
        TOO_MANY_ATTEMPTS: "Too many attempts. Wait a minute, then try again.",
        REQUEST_FAILED: "Authentication is temporarily unavailable. Please try again.",
        SIGN_UP_EMAIL: "Check your email for the verification link before signing in.",
      }}
    >
      <ConfiguredApp authFeedback={authFeedback} onClearAuthFeedback={clearAuthFeedback} pathname={authLocation.pathname} />
    </NeonAuthUIProvider>
  );
}
