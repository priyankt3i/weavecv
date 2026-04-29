import { GoogleGenAI, Type } from "@google/genai";
import type { DraftRevisionDecision, DraftRevisionResult, ResumeReview, ResumeTemplate, Suggestion } from "../types";
import type { VercelRequest, VercelResponse } from "./_vercelTypes.js";
import { enforceRateLimit } from "./_rateLimit.js";

const model = "gemini-2.5-flash";
let ai: GoogleGenAI | null = null;
const missingGeminiKeyMessage = "GEMINI_API_KEY environment variable is not set.";

const getAi = () => {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error(missingGeminiKeyMessage);
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
};

const cleanupAiResponse = (responseText: string): string => {
  return responseText
    .trim()
    .replace(/^```(?:\w+)?\s*\n/, "")
    .replace(/\n```$/, "")
    .trim();
};

const MAX_RAW_TEXT = 20000;
const MAX_MARKDOWN = 50000;
const MAX_USER_INPUT = 4000;
const MAX_JOB_DESCRIPTION = 12000;
const MAX_TEMPLATE_HTML = 120000;
const IMPORTED_TEMPLATE_VERSION = 2;

const isNonEmptyString = (value: unknown, maxLen?: number): value is string => {
  return typeof value === "string" && value.trim().length > 0 && (!maxLen || value.length <= maxLen);
};

const isMissingGeminiKeyError = (error: unknown) => {
  return error instanceof Error && error.message === missingGeminiKeyMessage;
};

const isSuggestion = (value: unknown): value is Suggestion => {
  if (!value || typeof value !== "object") return false;
  const suggestion = value as Suggestion;
  return (
    typeof suggestion.id === "string" &&
    typeof suggestion.title === "string" &&
    typeof suggestion.description === "string"
  );
};

const isDraftRevisionDecision = (value: unknown): value is DraftRevisionDecision => {
  return value === "applied" || value === "needs_confirmation" || value === "blocked";
};

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "imported-template";
};

const sanitizeTemplateCss = (css: string): string => {
  return css
    .replace(/<\/?style[^>]*>/gi, "")
    .replace(/@import[^;]+;/gi, "")
    .replace(/url\([^)]*\)/gi, "none")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .trim();
};

const isTemplateLike = (value: unknown): value is Omit<ResumeTemplate, "id" | "source"> => {
  if (!value || typeof value !== "object") return false;
  const template = value as ResumeTemplate;
  if (typeof template.name !== "string" || typeof template.thumbnailColor !== "string" || typeof template.css !== "string") {
    return false;
  }
  if (!template.layout || typeof template.layout !== "object") return false;
  if (template.layout.type === "single-column") {
    return Array.isArray(template.layout.order);
  }
  if (template.layout.type === "two-column") {
    return Array.isArray(template.layout.primary) && Array.isArray(template.layout.secondary);
  }
  return false;
};

const monthIndexByName: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const getCurrentDateContext = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);

  const year = Number(parts.find((part) => part.type === "year")?.value || now.getFullYear());
  const month = Number(parts.find((part) => part.type === "month")?.value || now.getMonth() + 1);
  const day = Number(parts.find((part) => part.type === "day")?.value || now.getDate());
  const display = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now);

  return {
    year,
    month,
    day,
    display,
    iso: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
};

const parseMonthYearMentions = (value: string): { month: number; year: number }[] => {
  const mentions: { month: number; year: number }[] = [];
  const monthYearPattern =
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?[\s,]+((?:19|20)\d{2})\b/gi;
  const numericMonthYearPattern = /\b(0?[1-9]|1[0-2])\s*[/-]\s*((?:19|20)\d{2})\b/g;

  for (const match of value.matchAll(monthYearPattern)) {
    const month = monthIndexByName[match[1].toLowerCase().replace(/\.$/, "")];
    const year = Number(match[2]);
    if (month && Number.isFinite(year)) {
      mentions.push({ month, year });
    }
  }

  for (const match of value.matchAll(numericMonthYearPattern)) {
    const month = Number(match[1]);
    const year = Number(match[2]);
    if (month >= 1 && month <= 12 && Number.isFinite(year)) {
      mentions.push({ month, year });
    }
  }

  return mentions;
};

const isMonthYearAfterCurrent = (
  mention: { month: number; year: number },
  currentDate: { month: number; year: number }
): boolean => {
  return mention.year > currentDate.year || (mention.year === currentDate.year && mention.month > currentDate.month);
};

const isFalseFutureDateSuggestion = (
  suggestion: Suggestion,
  currentDate: { month: number; year: number }
): boolean => {
  const suggestionText = `${suggestion.title} ${suggestion.description} ${suggestion.originalText || ""}`;
  if (!/\bfuture\b|\bfuture-dated\b|\bfuture dated\b/i.test(suggestionText)) {
    return false;
  }

  const citedDateText = suggestion.originalText || suggestionText;
  const monthYearMentions = parseMonthYearMentions(citedDateText);
  if (monthYearMentions.length === 0) {
    return false;
  }

  return monthYearMentions.every((mention) => !isMonthYearAfterCurrent(mention, currentDate));
};

const removeFalseFutureDateSuggestions = (review: ResumeReview): ResumeReview => {
  const currentDate = getCurrentDateContext();
  return {
    ...review,
    suggestions: review.suggestions.filter((suggestion) => !isFalseFutureDateSuggestion(suggestion, currentDate)),
  };
};

export const generateResumeMarkdown = async (
  rawText: string,
  jobDescription?: string
): Promise<string> => {
  const systemInstruction = `You are an expert resume writer. Convert the user's raw resume notes into polished resume content in clean Markdown.

Return only Markdown. Do not return HTML. Do not wrap the result in code fences.

Use this structure exactly when information is available:

# Candidate Name
**Target Role**
Location | Email | Phone | LinkedIn | Portfolio

## Professional Summary
One concise paragraph focused on impact and fit.

## Skills
- Category: Skill, Skill, Skill

## Work Experience
### Company | Job Title | Dates
- Achievement bullet with concrete action, scope, tools, and measurable result.

## Projects
### Project Name | Context or Stack | Dates
- Achievement bullet with measurable outcome.

## Education
### School | Degree | Dates
- Optional detail.

## Certifications
- Certification, Issuer, Year

Rules:
- Preserve facts from the user's source. Do not invent employers, degrees, numbers, certifications, or dates.
- Improve wording, order, and clarity.
- If a job description is provided, tune the summary, skills, and bullets toward that role while staying truthful.
- Prefer ATS-friendly wording and common industry capitalization.
- Keep bullets concise and accomplishment-oriented.`;

  const contents = [
    "Raw resume notes:",
    rawText,
    jobDescription?.trim()
      ? `\nJob description to tune for:\n${jobDescription}`
      : "\nNo job description was provided.",
  ].join("\n\n");

  const response = await getAi().models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
    },
  });

  if (response.text === undefined) {
    console.error("AI response text is undefined for resume generation:", response);
    throw new Error("AI did not return text content for resume generation.");
  }

  return cleanupAiResponse(response.text);
};

export const reviewResumeMarkdown = async (resumeMarkdown: string): Promise<ResumeReview> => {
  const currentDate = getCurrentDateContext();
  const systemInstruction = `You are an expert ATS resume reviewer. Analyze the provided resume Markdown.

Return a JSON object that strictly follows the schema.

Current date for all date validation: ${currentDate.display} (${currentDate.iso}), America/New_York.

Review criteria:
1. Score from 0 to 100 for ATS compatibility and recruiter impact.
2. Specific actionable suggestions. Include originalText when the suggestion targets a precise phrase or bullet.
3. Detect spelling, grammar, capitalization, and technical-name formatting issues. For simple corrections, set isCorrection to true.
4. For suggestions needing user input, provide a placeholder with bracketed fields like [Your Number] or [Specific Outcome].
5. Focus on content quality, structure, keywords, measurable impact, and job-market clarity.

Date validation rules:
- A month/year is future-dated only if it is after ${currentDate.display}.
- Any month/year before or equal to ${currentDate.display} is in the past/current period and must not be flagged as future.
- "Present" means ongoing through ${currentDate.display}. A range like "Month YYYY - Present" is valid when the start month/year is not after the current month/year.
- Do not rely on your model training cutoff for today's date; use the current date above.`;

  const resumeReviewSchema = {
    type: Type.OBJECT,
    properties: {
      score: {
        type: Type.INTEGER,
        description: "The overall score of the resume from 0 to 100.",
      },
      suggestions: {
        type: Type.ARRAY,
        description: "A list of actionable suggestions for improving the resume.",
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "A unique kebab-case ID for the suggestion." },
            title: { type: Type.STRING, description: "A short, clear title for the suggestion." },
            description: { type: Type.STRING, description: "A detailed explanation of the problem." },
            originalText: { type: Type.STRING, description: "The specific resume text this suggestion applies to." },
            isCorrection: { type: Type.BOOLEAN, description: "True for simple corrections that do not need user input." },
            placeholder: { type: Type.STRING, description: "A user-fillable rewrite template when extra input is needed." },
          },
          required: ["id", "title", "description"],
        },
      },
    },
    required: ["score", "suggestions"],
  };

  const response = await getAi().models.generateContent({
    model,
    contents: `Please review this resume Markdown:\n\n${resumeMarkdown}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: resumeReviewSchema,
    },
  });

  try {
    if (response.text === undefined) {
      console.error("AI response text is undefined for resume review:", response);
      throw new Error("AI did not return text content for resume review.");
    }
    const parsedJson = JSON.parse(cleanupAiResponse(response.text));
    return removeFalseFutureDateSuggestions(parsedJson as ResumeReview);
  } catch (error) {
    console.error("Failed to parse JSON response from Gemini:", response.text);
    throw new Error("AI returned a response that was not valid JSON.");
  }
};

export const applySuggestionToMarkdown = async (
  resumeMarkdown: string,
  suggestion: Suggestion,
  userInput: string
): Promise<string> => {
  const systemInstruction = `You are an expert resume editor. Apply one suggestion to the provided resume Markdown.

Return only the full updated Markdown resume. Do not return HTML. Do not wrap the result in code fences.

Rules:
- Preserve the Markdown structure.
- Make the smallest useful edit that resolves the suggestion.
- Preserve truthful facts. Do not invent metrics or dates.
- If the user supplied new information, incorporate it naturally.
- Keep untouched sections stable.`;

  const contents = `
Original resume Markdown:
${resumeMarkdown}

Suggestion:
Title: ${suggestion.title}
Description: ${suggestion.description}
${suggestion.originalText ? `Original text: ${suggestion.originalText}` : ""}
${suggestion.isCorrection ? "This is a correction that should not need extra user input." : ""}

User input:
${userInput || "(none)"}
`;

  const response = await getAi().models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
    },
  });

  if (response.text === undefined) {
    console.error("AI response text is undefined for suggestion application:", response);
    throw new Error("AI did not return text content for suggestion application.");
  }

  return cleanupAiResponse(response.text);
};

export const reviseResumeMarkdown = async (
  resumeMarkdown: string,
  userRequest: string,
  forceApply: boolean
): Promise<DraftRevisionResult> => {
  const systemInstruction = `You are a senior resume editor and candid career companion. Help revise the user's resume Markdown while protecting professionalism, truthfulness, and recruiter impact.

Return only JSON. Do not wrap it in code fences.

Decision rules:
- Use "applied" when the request improves or reasonably changes the resume and can be done truthfully. Return the full updated Markdown in updatedMarkdown.
- Use "needs_confirmation" when the request is not clearly harmful but may weaken ATS performance, sound unprofessional, be too casual, become too long, overstate tone, remove important context, or otherwise make the resume less effective. Do not update Markdown. Explain the concern and ask whether the user still wants it.
- Use "blocked" when the request asks to invent or falsify credentials, employment, dates, metrics, awards, education, legal status, confidential information, discriminatory content, offensive content, or anything unethical. Do not update Markdown, even if forceApply is true.
- If forceApply is true, apply requests that were only professionalism or style concerns, while still preserving truthful facts and still blocking unethical or fabricated changes.

Editing rules:
- Return the full Markdown resume only when decision is "applied".
- Preserve the Markdown structure and stable section headings.
- Preserve truthful facts. Do not invent employers, dates, degrees, certifications, numbers, clearance, visa status, or tools.
- If the user asks for metrics but gives no numbers, use bracketed placeholders instead of inventing numbers.
- Keep content resume-appropriate, concise, recruiter-friendly, and ATS-friendly.
- Keep untouched sections stable.`;

  const response = await getAi().models.generateContent({
    model,
    contents: `
Current resume Markdown:
${resumeMarkdown}

User request:
${userRequest}

forceApply: ${forceApply ? "true" : "false"}
`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          decision: {
            type: Type.STRING,
            description: "One of applied, needs_confirmation, or blocked.",
          },
          message: {
            type: Type.STRING,
            description: "A concise response to the user.",
          },
          updatedMarkdown: {
            type: Type.STRING,
            description: "The full updated Markdown resume when decision is applied.",
          },
          concern: {
            type: Type.STRING,
            description: "The professional concern when decision is needs_confirmation or blocked.",
          },
        },
        required: ["decision", "message"],
      },
    },
  });

  if (response.text === undefined) {
    console.error("AI response text is undefined for draft revision:", response);
    throw new Error("AI did not return draft revision JSON.");
  }

  const parsed = JSON.parse(cleanupAiResponse(response.text)) as Partial<DraftRevisionResult>;
  if (!isDraftRevisionDecision(parsed.decision) || typeof parsed.message !== "string") {
    console.error("Invalid draft revision response:", parsed);
    throw new Error("AI returned an invalid draft revision response.");
  }

  const result: DraftRevisionResult = {
    decision: parsed.decision,
    message: parsed.message,
  };

  if (typeof parsed.concern === "string" && parsed.concern.trim()) {
    result.concern = parsed.concern.trim();
  }

  if (parsed.decision === "applied") {
    if (!isNonEmptyString(parsed.updatedMarkdown, MAX_MARKDOWN)) {
      console.error("Draft revision applied without valid Markdown:", parsed);
      throw new Error("AI did not return updated Markdown.");
    }
    result.updatedMarkdown = cleanupAiResponse(parsed.updatedMarkdown);
  }

  return result;
};

export const convertHtmlToTemplate = async (templateHtml: string): Promise<ResumeTemplate> => {
  const systemInstruction = `You convert pasted resume HTML/CSS into a reusable WeaveCV template configuration.

Return only JSON. Do not wrap it in code fences.

The returned object must have:
- name: short professional template name.
- thumbnailColor: a representative hex color from the design.
- layout: either:
  { "type": "single-column", "order": ["Header", "Contact Information", "Professional Summary", "Skills", "Work Experience", "Projects", "Education", "Certifications", "Languages"] }
  or
  { "type": "two-column", "featured": ["Header"], "primary": ["Professional Summary", "Work Experience", "Projects"], "secondary": ["Contact Information", "Skills", "Education", "Certifications", "Languages"] }
- css: CSS that styles these stable generated classes:
  .resume-container, .resume-container.has-columns, .resume-container.has-featured, .resume-columns, .left-column, .right-column, .main-header, .contact-info, .contact-items, .contact-item, .professional-summary, section, h1, h2, h3, p, ul, li, .job, .job-header, .job-heading, .job-date, .job-meta, .education-item, .certifications-item, .skills, .skill-groups, .skill-group, .skill-list

Rules:
- Do not include HTML in css.
- Do not use external assets, script tags, remote images, or @import.
- Translate Tailwind utility classes from the pasted HTML into plain CSS. Do not depend on Tailwind being present.
- If the pasted design has a full-width header above columns, use "featured": ["Header"] and put the sidebar sections in secondary.
- Keep contact information readable in narrow columns. Do not use large letter spacing or word-breaking for contact items.
- Skills may render as .skill-group and .skill-list chip groups when the Markdown contains "Category: item, item" bullets.
- Keep CSS scoped to the stable classes and common resume elements.
- Preserve the visual character of the pasted HTML, but make it robust for generated resume content.
- Prefer compact, print-friendly styling.`;

  const response = await getAi().models.generateContent({
    model,
    contents: `Convert this resume HTML/CSS into a reusable template:\n\n${templateHtml}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
    },
  });

  if (response.text === undefined) {
    console.error("AI response text is undefined for template import:", response);
    throw new Error("AI did not return template JSON.");
  }

  const parsed = JSON.parse(cleanupAiResponse(response.text));
  if (!isTemplateLike(parsed)) {
    console.error("Invalid imported template shape:", parsed);
    throw new Error("AI returned an invalid template format.");
  }

  const name = parsed.name.trim().slice(0, 60) || "Imported Template";
  return {
    id: `imported-${slugify(name)}-${Date.now()}`,
    name,
    thumbnailColor: /^#[0-9a-f]{6}$/i.test(parsed.thumbnailColor) ? parsed.thumbnailColor : "#334155",
    css: sanitizeTemplateCss(parsed.css),
    layout: parsed.layout,
    source: "imported",
    templateVersion: IMPORTED_TEMPLATE_VERSION,
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowed = await enforceRateLimit(req, res, { prefix: "gemini", limit: 10, window: "1 m" });
  if (!allowed) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body ?? {};
  const { action, rawText, jobDescription, resumeMarkdown, suggestion, userInput, templateHtml, forceApply } = body;

  try {
    switch (action) {
      case "generate": {
        if (
          !isNonEmptyString(rawText, MAX_RAW_TEXT) ||
          (jobDescription !== undefined && typeof jobDescription !== "string") ||
          (typeof jobDescription === "string" && jobDescription.length > MAX_JOB_DESCRIPTION)
        ) {
          return res.status(400).json({ error: "Invalid generate request." });
        }
        const markdown = await generateResumeMarkdown(rawText, jobDescription);
        return res.status(200).send(markdown);
      }
      case "review": {
        if (!isNonEmptyString(resumeMarkdown, MAX_MARKDOWN)) {
          return res.status(400).json({ error: "Invalid review request." });
        }
        const review = await reviewResumeMarkdown(resumeMarkdown);
        return res.status(200).json(review);
      }
      case "apply": {
        if (
          !isNonEmptyString(resumeMarkdown, MAX_MARKDOWN) ||
          !isSuggestion(suggestion) ||
          (userInput !== undefined && typeof userInput !== "string") ||
          (typeof userInput === "string" && userInput.length > MAX_USER_INPUT)
        ) {
          return res.status(400).json({ error: "Invalid apply request." });
        }
        const updatedMarkdown = await applySuggestionToMarkdown(resumeMarkdown, suggestion, userInput || "");
        return res.status(200).send(updatedMarkdown);
      }
      case "reviseDraft": {
        if (
          !isNonEmptyString(resumeMarkdown, MAX_MARKDOWN) ||
          !isNonEmptyString(userInput, MAX_USER_INPUT) ||
          (forceApply !== undefined && typeof forceApply !== "boolean")
        ) {
          return res.status(400).json({ error: "Invalid revise draft request." });
        }
        const revision = await reviseResumeMarkdown(resumeMarkdown, userInput, forceApply === true);
        return res.status(200).json(revision);
      }
      case "importTemplate": {
        if (!isNonEmptyString(templateHtml, MAX_TEMPLATE_HTML)) {
          return res.status(400).json({ error: "Invalid import template request." });
        }
        const template = await convertHtmlToTemplate(templateHtml);
        return res.status(200).json(template);
      }
      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    if (isMissingGeminiKeyError(error)) {
      return res.status(503).json({
        error: "Gemini is not configured. Add GEMINI_API_KEY to your local env and restart the dev server.",
      });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}
