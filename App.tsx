import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useResume, type WorkflowStep } from "./hooks/useResume";
import { ReviewPane } from "./components/ReviewPane";
import { SuggestionModal } from "./components/SuggestionModal";
import { Icon } from "./components/Icon";
import { PaginatedResumePreview, type PaginatedResumePreviewHandle } from "./components/PaginatedResumePreview";
import type { DraftChatMessage, ResumeTemplate } from "./types";
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
      return (
        <button
          key={template.id}
          onClick={() => onSelectTemplate(template)}
          className={`group grid min-h-[92px] grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-md border p-3 text-left transition ${
            isActive
              ? "border-sky-500 bg-white ring-2 ring-sky-100"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <span className="relative h-[64px] overflow-hidden rounded border border-slate-200 bg-white shadow-sm">
            <span className="absolute left-0 top-0 h-full w-2" style={{ backgroundColor: template.thumbnailColor }} />
            <span className="absolute left-4 right-3 top-3 h-2 rounded-sm bg-slate-800/80" />
            <span className="absolute left-4 right-5 top-7 h-1 rounded-sm bg-slate-300" />
            <span className="absolute left-4 right-7 top-10 h-1 rounded-sm bg-slate-300" />
            {isTwoColumn ? (
              <>
                <span className="absolute bottom-3 left-4 h-6 w-5 rounded-sm bg-slate-200" />
                <span className="absolute bottom-3 left-12 right-3 h-6 rounded-sm bg-slate-100" />
              </>
            ) : (
              <span className="absolute bottom-3 left-4 right-3 h-6 rounded-sm bg-slate-100" />
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

export default function App() {
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
  const paginatedPreviewRef = useRef<PaginatedResumePreviewHandle>(null);
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
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">WeaveCV</h1>
            </div>
            <button
              onClick={resetResume}
              className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 lg:hidden"
            >
              Start Over
            </button>
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

          <button
            onClick={resetResume}
            className="hidden rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 lg:block"
          >
            Start Over
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-5">
        {activeStep === "create" && (
          <section className="grid min-h-[calc(100vh-132px)] grid-cols-1 gap-4 lg:grid-cols-[minmax(280px,420px)_1fr]">
            <div className="flex min-h-0 flex-col gap-4">
              <div className="flex min-h-[42vh] flex-col rounded-md border border-slate-200 bg-white">
                <div className="border-b border-slate-200 p-4">
                  <h2 className="text-base font-bold text-slate-800">Resume Text</h2>
                </div>
                <textarea
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  placeholder="Paste your resume notes here..."
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
                disabled={isLoadingGeneration}
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
