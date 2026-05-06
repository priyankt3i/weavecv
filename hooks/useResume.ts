import { useState, useCallback, useEffect, useMemo } from "react";
import type { DraftChatMessage, ResumeReview, ResumeTemplate, ResumeWorkflowStep, Suggestion } from "../types";
import { generateResume, reviewResume, applySuggestion, importResumeTemplate, reviseResumeDraft } from "../services/geminiService";
import { renderResumeHtml } from "../services/resumeRenderer";
import { templates } from "../components/templates/templates";

export type WorkflowStep = ResumeWorkflowStep;
const IMPORTED_TEMPLATE_VERSION = 2;
const REVIEW_STORAGE_VERSION = 2;
type PendingDraftChange = {
  request: string;
};

const initialRawText = `John Doe
Senior Software Engineer
john.doe@email.com | (123) 456-7890 | linkedin.com/in/johndoe | San Francisco, CA

Summary:
Highly skilled Senior Software Engineer with over 10 years of experience in designing, developing, and deploying scalable web applications. Proficient in JavaScript, React, nodejs, and cloud technologies. Proven ability to lead projects and mentor junior developers.

Work Experience:
Tech Solutions Inc. - Senior Software Engineer (Jan 2018 - Present)
- Led the development of a new customer-facing analytics dashboard using React and D3.js, resulting in a 20% increase in user engagement.
- Architected and implemented a microservices-based backend with node.js and Docker, improving system scalability and reducing server costs by 30%.
- Mentored a team of 4 junior engineers, fostering a culture of collaboration and code quality.

Innovate Corp. - Software Engineer (Jun 2014 - Dec 2017)
- Developed and maintained features for a large-scale e-commerce platform using Angular and Java.
- Optimized database queries, reducing page load times by 40%.
- Collaborated with product managers to define project requirements and timelines.

Education:
University of California, Berkeley - M.S. in Computer Science (2012 - 2014)
University of California, Los Angeles - B.S. in Computer Science (2008 - 2012)

Skills:
Languages: JavaScript, TypeScript, Python, Java
Frameworks: React, Node.js, Express, Angular
Databases: Postgresql, MongoDB, Redis
Cloud/DevOps: AWS, Docker, Kubernetes, CI/CD
`;

const readImportedTemplates = (): ResumeTemplate[] => {
  const savedTemplates = sessionStorage.getItem("importedTemplates");
  if (!savedTemplates) return [];

  try {
    const parsed = JSON.parse(savedTemplates);
    return Array.isArray(parsed)
      ? parsed.filter((template): template is ResumeTemplate => template?.source === "imported" && template?.templateVersion === IMPORTED_TEMPLATE_VERSION)
      : [];
  } catch {
    return [];
  }
};

const getInitialTemplate = (importedTemplates: ResumeTemplate[]): ResumeTemplate => {
  const savedTemplateId = sessionStorage.getItem("activeTemplateId");
  return [...templates, ...importedTemplates].find((template) => template.id === savedTemplateId) ?? templates[0];
};

const readDraftChatMessages = (): DraftChatMessage[] => {
  const savedMessages = sessionStorage.getItem("draftChatMessages");
  if (!savedMessages) return [];

  try {
    const parsed = JSON.parse(savedMessages);
    return Array.isArray(parsed)
      ? parsed.filter((message): message is DraftChatMessage =>
          message &&
          typeof message.id === "string" &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string"
        )
      : [];
  } catch {
    return [];
  }
};

const makeChatMessage = (
  role: DraftChatMessage["role"],
  content: string,
  tone: DraftChatMessage["tone"] = "normal"
): DraftChatMessage => ({
  id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  content,
  tone,
});

const readStoredReview = (): ResumeReview | null => {
  const savedReview = sessionStorage.getItem("review");
  if (!savedReview) return null;

  try {
    const parsed = JSON.parse(savedReview);
    if (parsed?.version === REVIEW_STORAGE_VERSION && parsed.review) {
      return parsed.review as ResumeReview;
    }
    return null;
  } catch {
    return null;
  }
};

export const useResume = ({ ownerId = null }: { ownerId?: string | null } = {}) => {
  const [activeStep, setActiveStep] = useState<WorkflowStep>(() => {
    const savedStep = sessionStorage.getItem("activeStep") as WorkflowStep | null;
    return savedStep ?? "create";
  });
  const [rawText, setRawText] = useState<string>(() => sessionStorage.getItem("rawText") || initialRawText);
  const [tuneForJob, setTuneForJob] = useState<boolean>(() => sessionStorage.getItem("tuneForJob") === "true");
  const [jobDescription, setJobDescription] = useState<string>(() => sessionStorage.getItem("jobDescription") || "");
  const [resumeMarkdown, setResumeMarkdownState] = useState<string>(() => sessionStorage.getItem("resumeMarkdown") || "");
  const [review, setReview] = useState<ResumeReview | null>(readStoredReview);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState<boolean>(false);
  const [isLoadingReview, setIsLoadingReview] = useState<boolean>(false);
  const [isLoadingApply, setIsLoadingApply] = useState<boolean>(false);
  const [isLoadingDraftChange, setIsLoadingDraftChange] = useState<boolean>(false);
  const [isLoadingTemplateImport, setIsLoadingTemplateImport] = useState<boolean>(false);
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [draftChatMessages, setDraftChatMessages] = useState<DraftChatMessage[]>(readDraftChatMessages);
  const [pendingDraftChange, setPendingDraftChange] = useState<PendingDraftChange | null>(null);
  const [importedTemplates, setImportedTemplates] = useState<ResumeTemplate[]>(readImportedTemplates);
  const [activeTemplate, setActiveTemplate] = useState<ResumeTemplate>(() => getInitialTemplate(importedTemplates));
  const allTemplates = useMemo(() => [...templates, ...importedTemplates], [importedTemplates]);

  const resumeHtml = useMemo(
    () => (resumeMarkdown.trim() ? renderResumeHtml(resumeMarkdown, activeTemplate) : ""),
    [resumeMarkdown, activeTemplate]
  );

  useEffect(() => {
    sessionStorage.setItem("activeStep", activeStep);
  }, [activeStep]);

  useEffect(() => {
    sessionStorage.setItem("rawText", rawText);
  }, [rawText]);

  useEffect(() => {
    sessionStorage.setItem("tuneForJob", String(tuneForJob));
  }, [tuneForJob]);

  useEffect(() => {
    sessionStorage.setItem("jobDescription", jobDescription);
  }, [jobDescription]);

  useEffect(() => {
    sessionStorage.setItem("resumeMarkdown", resumeMarkdown);
  }, [resumeMarkdown]);

  useEffect(() => {
    sessionStorage.setItem("activeTemplateId", activeTemplate.id);
  }, [activeTemplate]);

  useEffect(() => {
    sessionStorage.setItem("importedTemplates", JSON.stringify(importedTemplates));
  }, [importedTemplates]);

  useEffect(() => {
    sessionStorage.setItem("draftChatMessages", JSON.stringify(draftChatMessages));
  }, [draftChatMessages]);

  useEffect(() => {
    if (review) {
      sessionStorage.setItem("review", JSON.stringify({ version: REVIEW_STORAGE_VERSION, review }));
    } else {
      sessionStorage.removeItem("review");
    }
  }, [review]);

  const updateResumeMarkdown = useCallback((markdown: string) => {
    setResumeMarkdownState(markdown);
    setReview(null);
  }, []);

  const handleGenerateResume = useCallback(async () => {
    if (!rawText.trim()) {
      alert("Please paste your resume text first.");
      return;
    }
    setIsLoadingGeneration(true);
    setReview(null);
    setPendingDraftChange(null);
    try {
      const generatedMarkdown = await generateResume(rawText, tuneForJob ? jobDescription : "", ownerId);
      setResumeMarkdownState(generatedMarkdown);
    } catch (error) {
      console.error("Error generating resume:", error);
      alert(error instanceof Error ? error.message : "Failed to generate resume. Please check the console for details.");
    } finally {
      setIsLoadingGeneration(false);
    }
  }, [rawText, tuneForJob, jobDescription, ownerId]);

  const handleRequestDraftChange = useCallback(async (request: string, forceApply = false) => {
    if (!resumeMarkdown.trim()) {
      alert("Create a Markdown draft before asking for changes.");
      return;
    }
    if (!request.trim()) return;

    setIsLoadingDraftChange(true);
    if (!forceApply) {
      setDraftChatMessages((prev) => [...prev, makeChatMessage("user", request.trim())]);
    }

    try {
      const result = await reviseResumeDraft(resumeMarkdown, request, forceApply, ownerId);
      const tone = result.decision === "blocked" ? "blocked" : result.decision === "needs_confirmation" ? "caution" : "normal";
      setDraftChatMessages((prev) => [...prev, makeChatMessage("assistant", result.message, tone)]);

      if (result.decision === "applied" && result.updatedMarkdown) {
        setResumeMarkdownState(result.updatedMarkdown);
        setReview(null);
        setPendingDraftChange(null);
      } else if (result.decision === "needs_confirmation") {
        setPendingDraftChange({ request });
      } else {
        setPendingDraftChange(null);
      }
    } catch (error) {
      console.error("Failed to revise draft:", error);
      setDraftChatMessages((prev) => [
        ...prev,
        makeChatMessage("assistant", "I could not update the draft right now. Please try again.", "blocked"),
      ]);
    } finally {
      setIsLoadingDraftChange(false);
    }
  }, [resumeMarkdown, ownerId]);

  const handleConfirmDraftChange = useCallback(async () => {
    if (!pendingDraftChange) return;
    const request = pendingDraftChange.request;
    setPendingDraftChange(null);
    setDraftChatMessages((prev) => [...prev, makeChatMessage("user", "Apply it anyway.")]);
    await handleRequestDraftChange(request, true);
  }, [pendingDraftChange, handleRequestDraftChange]);

  const handleCancelDraftChange = useCallback(() => {
    setPendingDraftChange(null);
    setDraftChatMessages((prev) => [...prev, makeChatMessage("assistant", "Kept the current draft unchanged.")]);
  }, []);

  const handleReviewResume = useCallback(async () => {
    if (!resumeMarkdown.trim()) {
      alert("Please create a resume draft before requesting a review.");
      return;
    }
    setIsLoadingReview(true);
    setReview(null);
    try {
      const reviewResult = await reviewResume(resumeMarkdown, ownerId);
      const suggestionsWithStatus = reviewResult.suggestions.map((suggestion) => ({
        ...suggestion,
        status: "pending" as const,
      }));
      setReview({ ...reviewResult, suggestions: suggestionsWithStatus });
    } catch (error) {
      console.error("Error reviewing resume:", error);
      alert("Failed to review resume. The AI might have returned an unexpected format. Please check the console for details.");
    } finally {
      setIsLoadingReview(false);
    }
  }, [resumeMarkdown, ownerId]);

  const handleSelectTemplate = useCallback((template: ResumeTemplate) => {
    setActiveTemplate(template);
  }, []);

  const handleImportTemplate = useCallback(async (templateHtml: string) => {
    if (!templateHtml.trim()) {
      alert("Paste a resume HTML file or HTML/CSS snippet first.");
      return;
    }

    setIsLoadingTemplateImport(true);
    try {
      const importedTemplate = await importResumeTemplate(templateHtml, ownerId);
      setImportedTemplates((prev) => [...prev, importedTemplate]);
      setActiveTemplate(importedTemplate);
    } catch (error) {
      console.error("Failed to import template:", error);
      alert("Failed to import that design. Try pasting a complete HTML resume with its style block.");
      throw error;
    } finally {
      setIsLoadingTemplateImport(false);
    }
  }, [ownerId]);

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    if (suggestion.status === "pending") {
      setActiveSuggestion(suggestion);
    }
  };

  const handleCloseSuggestionModal = () => {
    setActiveSuggestion(null);
  };

  const handleApplySuggestion = useCallback(async (userInput: string) => {
    if (!activeSuggestion || !resumeMarkdown) return;

    setIsLoadingApply(true);
    try {
      const updatedMarkdown = await applySuggestion(resumeMarkdown, activeSuggestion, userInput, ownerId);
      setResumeMarkdownState(updatedMarkdown);
      setReview((prev) => {
        if (!prev) return null;
        const newSuggestions = prev.suggestions.map((suggestion) =>
          suggestion.id === activeSuggestion.id ? { ...suggestion, status: "applied" as const } : suggestion
        );
        return { ...prev, suggestions: newSuggestions };
      });
      setActiveSuggestion(null);
    } catch (error) {
      console.error("Failed to apply suggestion:", error);
      alert("An error occurred while applying the change. Please check the console.");
    } finally {
      setIsLoadingApply(false);
    }
  }, [activeSuggestion, resumeMarkdown, ownerId]);

  const handleDiscardSuggestion = useCallback((suggestionId: string) => {
    setReview((prev) => {
      if (!prev) return null;
      const newSuggestions = prev.suggestions.map((suggestion) =>
        suggestion.id === suggestionId ? { ...suggestion, status: "discarded" as const } : suggestion
      );
      return { ...prev, suggestions: newSuggestions };
    });
  }, []);

  const resetResume = useCallback(() => {
    sessionStorage.clear();
    window.location.reload();
  }, []);

  return {
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
  };
};
