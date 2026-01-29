import { GoogleGenAI, Type } from "@google/genai";
import type { ResumeReview, Suggestion, ResumeLayout } from '../types';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRateLimit } from "./_rateLimit";
import { sanitizeHtml } from "./_sanitize";

const model = 'gemini-2.5-flash';
let ai: GoogleGenAI | null = null;

const getAi = () => {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return ai;
};

/**
 * Cleans up the AI's response by removing markdown code fences.
 * @param responseText The raw text from the AI response.
 * @returns The cleaned text, free of code fences.
 */
const cleanupAiResponse = (responseText: string): string => {
  // Regex to find ```html, ```json, or just ``` at the start and ``` at the end.
  const cleanedText = responseText.trim().replace(/^```(?:\w+)?\s*\n/, '').replace(/\n```$/, '').trim();
  return cleanedText;
};

const MAX_RAW_TEXT = 20000;
const MAX_HTML = 400000;
const MAX_USER_INPUT = 4000;

const isNonEmptyString = (value: unknown, maxLen?: number): value is string => {
  return typeof value === 'string' && value.trim().length > 0 && (!maxLen || value.length <= maxLen);
};

const isStringArray = (value: unknown): value is string[] => {
  return Array.isArray(value) && value.length > 0 && value.every(item => typeof item === 'string');
};

const isResumeLayout = (value: unknown): value is ResumeLayout => {
  if (!value || typeof value !== 'object') return false;
  const layout = value as ResumeLayout;
  if (layout.type !== 'single-column' && layout.type !== 'two-column') return false;
  if (layout.type === 'single-column') {
    return isStringArray(layout.order);
  }
  return isStringArray(layout.primary) && isStringArray(layout.secondary);
};

const isSuggestion = (value: unknown): value is Suggestion => {
  if (!value || typeof value !== 'object') return false;
  const suggestion = value as Suggestion;
  return (
    typeof suggestion.id === 'string' &&
    typeof suggestion.title === 'string' &&
    typeof suggestion.description === 'string'
  );
};

export const generateResume = async (rawText: string, layout: ResumeLayout): Promise<string> => {
  const systemInstruction = `You are an expert resume creator and HTML generator. Your task is to convert raw text into a single, self-contained, professional HTML document that is both beautiful on screen and perfectly formatted for printing as a PDF.

**Your Instructions:**
1.  **Follow the Layout Exactly:** You will be given a JSON \`Layout Configuration\`. You MUST adhere to this configuration without deviation.
    *   If the layout configuration's \`type\` is \`two-column\`, you MUST add the class \`"has-columns"\` to the \`resume-container\` div (e.g., \`<div class="resume-container has-columns">\`).
2.  **HTML Structure:**
    *   If \`layout.type\` is \`two-column\`, you MUST generate a container with \`<div class="left-column">\` and \`<div class="right-column">\`. Sections from \`layout.primary\` go right, and \`layout.secondary\` go left, in order.
    *   If \`layout.type\` is \`single-column\`, you MUST NOT use column divs. All sections MUST be direct children of the main container, in the order specified by \`layout.order\`.
3.  **Content Formatting:**
    *   Begin bullet points in 'Work Experience' and 'Projects' with strong action verbs.
    *   Use numbers and metrics to quantify achievements where possible.
    *   Maintain consistent formatting for dates, titles, and names.
4.  **Technical HTML & CSS Rules:**
    *   The output MUST be a complete HTML document, starting with \`<!DOCTYPE html>\`.
    *   **Google Fonts:** Include Google Fonts using a \`<link>\` tag in the \`<head>\` (e.g., \`<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&family=Prata&display=swap" rel="stylesheet">\`). DO NOT use \`@import\` within the \`<style>\` tag for Google Fonts.
    *   ALL other CSS MUST be placed within a single \`<style id="resume-style">\` tag in the \`<head>\`. This ID is critical.
    *   Inside the style tag, structure the CSS in this exact order:
        1. The "Crucial Default CSS" for screen display.
        2. A placeholder comment: \`/* TEMPLATE_STYLES_HERE */\`
        3. The "Crucial Print CSS" for PDF generation.

**Crucial Default CSS (for screen display):**
\`\`\`css
body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
.resume-container { display: flex; max-width: 1000px; margin: 20px auto; background-color: #fff; box-shadow: 0 0 15px rgba(0,0,0,0.1); min-height: 95vh; }
.left-column { width: 35%; padding: 30px; box-sizing: border-box; }
.right-column { width: 65%; padding: 30px; box-sizing: border-box; }
.profile-pic { width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin: 0 auto 20px; display: block; }
.main-header { text-align: left; margin-bottom: 30px; }
.main-header h1 { font-size: 2.8em; margin-bottom: 0; color: #111; }
.main-header h3 { font-size: 1.2em; color: #555; margin-top: 5px; font-weight: normal; }
section { margin-bottom: 25px; }
h2 { font-size: 1.4em; color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-top: 0; margin-bottom: 20px; }
.contact-info p, .education-item p, .certifications-item p { margin: 5px 0; }
.job { margin-bottom: 20px; }
.job-header { margin-bottom: 5px; }
.job-header h3 { font-weight: bold; font-size: 1.1em; }
.job-header p { font-style: italic; color: #444; }
.job ul, .skills ul { list-style-type: disc; padding-left: 20px; margin-top: 5px; }
body:not(:has(.left-column)) .resume-container { display: block; padding: 40px; }
\`\`\`

/* TEMPLATE_STYLES_HERE */

**Crucial Print CSS (MUST be included for PDF generation):**
\`\`\`css
@media print {
  @page {
    size: A4;
    margin: 2.54cm; /* 1 inch */
  }

  html, body {
    width: 100%;
    height: auto;
    background: #fff !important;
    color: #000 !important;
    font-size: 10pt;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .resume-container {
    max-width: 100% !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    border: none !important;
    background: #fff !important;
    display: block; /* Default to block for print flow */
  }

  /* Retain flex for two-column layouts in print */
  .resume-container.has-columns {
    display: flex !important;
    flex-direction: row !important;
    /* Ensure columns take up full width */
    width: 100% !important;
  }

  .left-column {
    width: 35% !important; /* Force width for print */
    padding: 0 !important;
    background: transparent !important; /* Ensure no background color bleeds */
    box-sizing: border-box; /* Ensure padding is included in width */
    flex-shrink: 0; /* Prevent shrinking */
  }

  .right-column {
    width: 65% !important; /* Force width for print */
    padding-left: 20px !important; /* Maintain some spacing */
    background: transparent !important;
    box-sizing: border-box; /* Ensure padding is included in width */
  }
  
  section, .job, .education-item {
    page-break-inside: avoid;
  }

  h1, h2, h3 {
    page-break-after: avoid;
    page-break-inside: avoid;
  }
  
  ul {
    page-break-inside: avoid;
    list-style-type: disc !important; /* Ensure bullet points are visible */
    padding-left: 20px !important; /* Ensure consistent padding for bullets */
  }
  li::before {
    content: none !important; /* Disable custom bullet points in print */
  }

  /* Make links visible when printed */
  a {
    color: #000 !important;
    text-decoration: none !important; /* Resumes often don't underline links in print */
  }
}
\`\`\`

Your final output must ONLY be the raw HTML string, starting with \`<!DOCTYPE html>\`. Do not add any explanatory text.`;

  const contents = `
    Please format the following resume content into a self-contained HTML document.

    **Resume Text:**
    ${rawText}

    **Layout Configuration (MUST be followed exactly):**
    \`\`\`json
    ${JSON.stringify(layout, null, 2)}
    \`\`\`
  `;

  const response = await getAi().models.generateContent({
    model: model,
    contents: contents,
    config: {
      systemInstruction,
    },
  });

  const responseText = response.text; // Access .text as a property
  if (responseText === undefined) {
    console.error("AI response text is undefined for generateResume:", response);
    throw new Error("AI did not return text content for resume generation.");
  }
  return cleanupAiResponse(responseText!); // Use non-null assertion
};

export const reviewResume = async (resumeHtml: string): Promise<ResumeReview> => {
  const systemInstruction = `You are an expert ATS resume reviewer. Analyze the provided resume HTML.
  Your task is to provide a score and a list of actionable suggestions.

  **Review Criteria:**
  1.  **Score:** Provide a score from 0 to 100 for ATS compatibility and overall impact.
  2.  **Actionable Suggestions:** Give a list of specific, actionable suggestions. For each, provide a clear title and a detailed description of WHAT the user needs to provide to fix it.
  3.  **Contextual Analysis:** If a suggestion applies to a specific piece of text, include that original text.
  4.  **Spelling, Grammar, and Formatting Check:**
      *   Perform a comprehensive spelling and grammar check.
      *   **CRITICAL:** Be context-aware. Based on the candidate's professional role and skills mentioned, you MUST correctly identify technical terms, frameworks, and product names (e.g., nodejs, react, mongodb, jira, gcp, aws, postgresql).
      *   **DO NOT** flag these as simple misspellings.
      *   **INSTEAD**, create a suggestion to correct their capitalization or formatting to the industry-standard form (e.g., 'nodejs' -> 'Node.js', 'react' -> 'React', 'Postgresql' -> 'PostgreSQL', 'aws' -> 'AWS').
      *   For these formatting corrections, set the \`isCorrection\` flag to \`true\`. The user will not need to provide input for these.
  5.  **Dynamic Placeholders:** For suggestions requiring user input (\`isCorrection\` is false), provide a helpful \`placeholder\` string. This placeholder should be a template of the improved text with placeholders like '[Your Number]' or '[Specific Outcome]' for the user to fill in. This guides the user and reduces typing. Example: If the original text is "Led the development of a new customer-facing analytics dashboard", the placeholder could be "Led the development of a new customer-facing analytics dashboard, resulting in a [Your Number]% increase in user engagement."

  You MUST respond with a JSON object that strictly follows the provided schema. Do not output any text outside the JSON object.`;

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
            id: { type: Type.STRING, description: "A unique kebab-case ID for the suggestion (e.g., 'quantify-achievements-1')." },
            title: { type: Type.STRING, description: "A short, clear title for the suggestion (e.g., 'Quantify Achievements')." },
            description: { type: Type.STRING, description: "A detailed explanation of the problem and what information the user needs to provide to fix it." },
            originalText: { type: Type.STRING, description: "The specific text from the resume that this suggestion applies to, if any." },
            isCorrection: { type: Type.BOOLEAN, description: "Set to true if this is a simple spelling/grammar/formatting correction that doesn't require user input to resolve." },
            placeholder: { type: Type.STRING, description: "A template string with bracketed sections like '[Your Number]' for the user to fill in. Only provide this for suggestions that are not simple corrections." }
          },
          required: ["id", "title", "description"],
        }
      }
    },
    required: ["score", "suggestions"],
  };

  const response = await getAi().models.generateContent({
    model: model,
    contents: `Please review the following resume's text content (ignore the HTML tags, focus on the text):\n\n${resumeHtml}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: resumeReviewSchema,
    },
  });

  try {
    const responseText = response.text;
    if (responseText === undefined) {
        console.error("AI response text is undefined for applySuggestion:", response);
        throw new Error("AI did not return text content for suggestion application.");
    }
    const jsonText = cleanupAiResponse(responseText);
    const parsedJson = JSON.parse(jsonText);
    return parsedJson as ResumeReview;
  } catch (e) {
    console.error("Failed to parse JSON response from Gemini:", response.text);
    throw new Error("AI returned a response that was not valid JSON.");
  }
};

export const applySuggestion = async (resumeHtml: string, suggestion: Suggestion, userInput: string): Promise<string> => {
    const systemInstruction = `You are an expert HTML editor specializing in resumes. Your task is to apply a specific change to a given HTML document and return the full, modified document. You must follow these rules with extreme care to avoid breaking the resume's structure.

**Core Rules:**
1.  **Return Full HTML:** You MUST return the complete, valid HTML of the entire document, starting with \`<!DOCTYPE html>\`. Do not return fragments or just the changed section.
2.  **Maintain Validity:** The returned HTML MUST be well-formed. Every tag must be correctly opened, closed, and nested. The overall structure (e.g., \`<div class="resume-container">\`, \`<section id="...">\`) must be preserved.
3.  **Preserve Styling:** Do not alter the \`<style id="resume-style">\` block. The changes should be to the content within the \`<body>\` only.
4.  **Surgical Edits:** Locate the *exact* HTML element(s) related to the \`Original Text to Change\` and modify *only* what is necessary. Do not rewrite unrelated sections of the resume.

**Special Instructions for Complex Changes:**
- **Merging Job Entries:** If the suggestion involves merging two job entries, you must carefully locate the two separate \`<div class="job">\` containers. Combine their content into a *single* \`<div class="job">\` container, ensuring the final result is a single, valid job block.
- **Quantifying Achievements:** When adding metrics or numbers to a \`<ul>\` list item, find the correct \`<li>\` and rewrite its text. Do not add new \`<li>\` elements unless explicitly required.
- **Spelling/Formatting Corrections:** For simple corrections (like 'nodejs' to 'Node.js'), perform a targeted find-and-replace on the text content within the relevant tags. Be careful not to alter tags themselves.

**Your Goal:**
The user's resume preview breaks if you provide invalid HTML. Your primary goal is precision and validity. Apply the user's requested change while ensuring the final HTML document is perfectly structured.`;

    const contents = `
    **Original Resume HTML:**
    \`\`\`html
    ${resumeHtml}
    \`\`\`

    **Suggestion to Apply:**
    Title: ${suggestion.title}
    Description: ${suggestion.description}
    ${suggestion.originalText ? `Original Text to Change: ${suggestion.originalText}` : ''}

    **User's New Information to Incorporate (if any):**
    "${userInput}"

    Please provide the full, updated resume HTML with this change applied. Remember to follow all editing rules to ensure the HTML is valid.
    `;

    const response = await getAi().models.generateContent({
        model: model,
        contents: contents,
        config: {
            systemInstruction,
        }
    });

    const responseText = response.text; // Access .text as a property
    if (responseText === undefined) {
        console.error("AI response text is undefined for applySuggestion:", response);
        throw new Error("AI did not return text content for suggestion application.");
    }
    return cleanupAiResponse(responseText!); // Use non-null assertion
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowed = await enforceRateLimit(req, res, { prefix: "gemini", limit: 10, window: "1 m" });
  if (!allowed) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body ?? {};
  const { action, rawText, layout, resumeHtml, suggestion, userInput } = body;

  try {
    switch (action) {
      case 'generate': {
        if (!isNonEmptyString(rawText, MAX_RAW_TEXT) || !isResumeLayout(layout)) {
          return res.status(400).json({ error: 'Invalid generate request.' });
        }
        const generatedHtml = await generateResume(rawText, layout);
        const safeHtml = sanitizeHtml(generatedHtml);
        return res.status(200).send(safeHtml);
      }
      case 'review': {
        if (!isNonEmptyString(resumeHtml, MAX_HTML)) {
          return res.status(400).json({ error: 'Invalid review request.' });
        }
        const safeHtml = sanitizeHtml(resumeHtml);
        const review = await reviewResume(safeHtml);
        return res.status(200).json(review);
      }
      case 'apply': {
        if (
          !isNonEmptyString(resumeHtml, MAX_HTML) ||
          !isSuggestion(suggestion) ||
          (userInput !== undefined && typeof userInput !== 'string') ||
          (typeof userInput === 'string' && userInput.length > MAX_USER_INPUT)
        ) {
          return res.status(400).json({ error: 'Invalid apply request.' });
        }
        const safeHtml = sanitizeHtml(resumeHtml);
        const appliedHtml = await applySuggestion(safeHtml, suggestion, userInput || '');
        const safeAppliedHtml = sanitizeHtml(appliedHtml);
        return res.status(200).send(safeAppliedHtml);
      }
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
