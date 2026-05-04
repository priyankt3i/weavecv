import type { ResumeTemplate } from "../types";

export type ResumeTypographySettings = {
  sectionHeaderFontSizePx: number;
  bodyLineHeight: number;
  paragraphSpacingPx: number;
};

type MarkdownLine =
  | { kind: "heading"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "paragraph"; text: string };

type ParsedSection = {
  title: string;
  lines: MarkdownLine[];
};

type ParsedResume = {
  name: string;
  title: string;
  contact: string[];
  sections: ParsedSection[];
};

const sectionAliases: Record<string, string[]> = {
  header: ["header", "candidate"],
  contactinformation: ["contact", "contactinformation"],
  professionalsummary: ["summary", "professionalsummary", "profile"],
  workexperience: ["experience", "workexperience", "professionalexperience", "employment"],
  projects: ["projects", "projectexperience"],
  education: ["education"],
  skills: ["skills", "technicalskills", "coreskills"],
  certifications: ["certifications", "certificates"],
  languages: ["languages"],
};

const printStyles = `
@media print {
  @page {
    size: A4;
    margin: 1.4cm;
  }

  html, body {
    width: 100%;
    background: #fff !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .resume-container {
    box-shadow: none !important;
    margin: 0 auto !important;
  }

  section, .job, .education-item, .certifications-item {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
`;

const baseStyles = `
* { box-sizing: border-box; }
html, body { min-height: 100%; }
body { margin: 0; background: #f8fafc; }
.resume-container { max-width: 900px; min-height: 1120px; margin: 0 auto; background: #fff; padding: 44px; color: #1f2937; font-family: Arial, sans-serif; line-height: 1.55; }
.resume-container.has-columns { display: flex; gap: 0; padding: 0; }
.resume-container.has-featured { display: block; }
.resume-container.has-featured .resume-columns { display: flex; }
.left-column, .right-column { padding: 38px; }
.left-column { width: 35%; }
.right-column { width: 65%; }
.main-header { margin-bottom: 24px; }
.main-header h1 { margin: 0; font-size: 34px; line-height: 1.1; }
.main-header h3 { margin: 6px 0 0; font-size: 16px; font-weight: 500; }
.main-header p, .contact-info p { margin: 5px 0; }
.contact-line { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 10px; }
.contact-line p { margin: 0; }
.contact-items { display: grid; gap: 7px; }
.contact-item { overflow-wrap: break-word; }
section { margin-bottom: 24px; }
h2 { margin: 0 0 12px; font-size: 17px; }
p { margin: 0 0 10px; }
ul { margin: 8px 0 0; padding-left: 20px; }
li { margin-bottom: 6px; }
.job, .education-item, .certifications-item { margin-bottom: 16px; }
.job-header { margin-bottom: 6px; }
.job-heading { display: flex; justify-content: space-between; gap: 16px; align-items: baseline; }
.job-date { flex: none; font-size: 0.9em; }
.job-meta { font-style: italic; }
.job-header h3, .education-item h3, .certifications-item h3 { margin: 0; font-size: 15px; }
.job-header p, .education-item p, .certifications-item p { margin: 2px 0 0; }
.skill-groups { display: grid; gap: 12px; }
.skill-group h3 { margin: 0 0 6px; font-size: 0.95em; }
.skill-list { display: flex; flex-wrap: wrap; gap: 5px; }
.skill-list span { display: inline-flex; max-width: 100%; overflow-wrap: anywhere; }
.skill-lines { display: block; margin: 0; padding-left: 18px; }
.skill-lines li { display: list-item; margin-bottom: 8px; padding-left: 2px; }
`;

const normalizeKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const stripMarkdownMarks = (value: string): string => value.replace(/^\*\*|\*\*$/g, "").trim();

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const clampNumber = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const formatCssNumber = (value: number): string => Number(value.toFixed(2)).toString();

export const getResumeTypographyOverrideStyles = (settings: ResumeTypographySettings): string => {
  const sectionHeaderFontSizePx = clampNumber(settings.sectionHeaderFontSizePx, 9, 24);
  const bodyLineHeight = clampNumber(settings.bodyLineHeight, 1.15, 1.85);
  const paragraphSpacingPx = clampNumber(settings.paragraphSpacingPx, 0, 20);
  const listItemSpacingPx = Math.max(paragraphSpacingPx - 2, 0);

  return `
      .resume-container {
        line-height: ${formatCssNumber(bodyLineHeight)} !important;
      }
      .resume-container h2 {
        font-size: ${formatCssNumber(sectionHeaderFontSizePx)}px !important;
      }
      .resume-container p,
      .resume-container li {
        line-height: ${formatCssNumber(bodyLineHeight)} !important;
      }
      .resume-container section p {
        margin-bottom: ${formatCssNumber(paragraphSpacingPx)}px !important;
      }
      .resume-container section p:last-child {
        margin-bottom: 0 !important;
      }
      .resume-container li {
        margin-bottom: ${formatCssNumber(listItemSpacingPx)}px !important;
      }
`;
};

export const injectResumeTypographyStyles = (html: string, settings: ResumeTypographySettings): string => {
  const overrideStyle = `<style id="resume-typography-overrides">\n${getResumeTypographyOverrideStyles(settings)}</style>`;
  return html.includes("</head>") ? html.replace("</head>", `${overrideStyle}\n  </head>`) : `${html}\n${overrideStyle}`;
};

const formatInline = (value: string): string => {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
};

const splitContact = (line: string): string[] => {
  return line
    .split(/\s+\|\s+|\s+•\s+|\s+·\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const parseResumeMarkdown = (markdown: string): ParsedResume => {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const parsed: ParsedResume = {
    name: "Your Name",
    title: "",
    contact: [],
    sections: [],
  };
  let currentSection: ParsedSection | null = null;
  let hasSeenSection = false;

  const pushLine = (line: MarkdownLine) => {
    if (!currentSection) {
      currentSection = { title: "Professional Summary", lines: [] };
      parsed.sections.push(currentSection);
    }
    currentSection.lines.push(line);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const h1 = line.match(/^#\s+(.+)$/);
    if (h1 && !hasSeenSection) {
      parsed.name = stripMarkdownMarks(h1[1]);
      continue;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      hasSeenSection = true;
      currentSection = { title: stripMarkdownMarks(h2[1]), lines: [] };
      parsed.sections.push(currentSection);
      continue;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      pushLine({ kind: "heading", text: stripMarkdownMarks(h3[1]) });
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      pushLine({ kind: "bullet", text: bullet[1].trim() });
      continue;
    }

    if (!hasSeenSection) {
      if (!parsed.title && line.startsWith("**") && line.endsWith("**")) {
        parsed.title = stripMarkdownMarks(line);
      } else {
        parsed.contact.push(...splitContact(stripMarkdownMarks(line)));
      }
      continue;
    }

    pushLine({ kind: "paragraph", text: line });
  }

  return parsed;
};

const findSection = (resume: ParsedResume, title: string): ParsedSection | null => {
  const requestedKey = normalizeKey(title);
  const aliases = sectionAliases[requestedKey] ?? [requestedKey];
  return resume.sections.find((section) => aliases.includes(normalizeKey(section.title))) ?? null;
};

const groupEntries = (lines: MarkdownLine[]) => {
  const entries: { heading: string; lines: MarkdownLine[] }[] = [];
  let current: { heading: string; lines: MarkdownLine[] } | null = null;

  for (const line of lines) {
    if (line.kind === "heading") {
      current = { heading: line.text, lines: [] };
      entries.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      current = { heading: "", lines: [line] };
      entries.push(current);
    }
  }

  return entries;
};

const renderLineGroup = (lines: MarkdownLine[]): string => {
  const chunks: string[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    chunks.push(`<ul>${bulletBuffer.map((item) => `<li>${formatInline(item)}</li>`).join("")}</ul>`);
    bulletBuffer = [];
  };

  for (const line of lines) {
    if (line.kind === "bullet") {
      bulletBuffer.push(line.text);
      continue;
    }
    flushBullets();
    if (line.kind === "paragraph") {
      chunks.push(`<p>${formatInline(line.text)}</p>`);
    }
  }
  flushBullets();

  return chunks.join("");
};

const renderHeadingParts = (heading: string): string => {
  const parts = heading.split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return `<div class="job-heading"><h3>${formatInline(parts[1])}</h3><span class="job-date">${formatInline(parts.slice(2).join(" | "))}</span></div><p class="job-meta">${formatInline(parts[0])}</p>`;
  }
  if (parts.length === 2) {
    return `<div class="job-heading"><h3>${formatInline(parts[0])}</h3><span class="job-date">${formatInline(parts[1])}</span></div>`;
  }
  return heading ? `<h3>${formatInline(heading)}</h3>` : "";
};

const renderEntries = (section: ParsedSection, className: string): string => {
  return groupEntries(section.lines)
    .map((entry) => {
      if (!entry.heading) {
        return `<div class="${className}">${renderLineGroup(entry.lines)}</div>`;
      }

      const header =
        className === "job"
          ? `<div class="job-header">${renderHeadingParts(entry.heading)}</div>`
          : renderHeadingParts(entry.heading);
      return `<div class="${className}">${header}${renderLineGroup(entry.lines)}</div>`;
    })
    .join("");
};

const renderPlainSkills = (section: ParsedSection): string => {
  const skillItems: string[] = [];
  const fallbackLines: MarkdownLine[] = [];

  for (const line of section.lines) {
    const text = line.text.trim();
    const match = text.match(/^([^:]{2,60}):\s*(.+)$/);
    if ((line.kind === "bullet" || line.kind === "paragraph") && match) {
      skillItems.push(`<li><strong>${formatInline(stripMarkdownMarks(match[1]))}:</strong> ${formatInline(match[2])}</li>`);
    } else {
      fallbackLines.push(line);
    }
  }

  const skills = skillItems.length > 0 ? `<ul class="skill-lines">${skillItems.join("")}</ul>` : "";
  const fallback = fallbackLines.length > 0 ? renderLineGroup(fallbackLines) : "";
  return `<section class="skills ats-skills"><h2>${escapeHtml(section.title)}</h2>${skills}${fallback}</section>`;
};

const renderSkills = (section: ParsedSection, atsPlain = false): string => {
  if (atsPlain) {
    return renderPlainSkills(section);
  }

  const groups: string[] = [];
  const fallbackLines: MarkdownLine[] = [];

  for (const line of section.lines) {
    const text = line.text.trim();
    const match = text.match(/^([^:]{2,60}):\s*(.+)$/);
    if (line.kind === "bullet" && match) {
      const skills = match[2]
        .split(/,\s*/)
        .map((skill) => skill.trim())
        .filter(Boolean);
      groups.push(`
        <div class="skill-group">
          <h3>${formatInline(match[1])}</h3>
          <div class="skill-list">${skills.map((skill) => `<span>${formatInline(skill)}</span>`).join("")}</div>
        </div>
      `);
    } else {
      fallbackLines.push(line);
    }
  }

  const fallback = fallbackLines.length > 0 ? renderLineGroup(fallbackLines) : "";
  return `<section class="skills"><h2>${escapeHtml(section.title)}</h2>${groups.length > 0 ? `<div class="skill-groups">${groups.join("")}</div>` : ""}${fallback}</section>`;
};

const renderSection = (section: ParsedSection, atsPlain = false): string => {
  const key = normalizeKey(section.title);
  const title = escapeHtml(section.title);

  if (["workexperience", "experience", "professionalexperience", "projects"].includes(key)) {
    return `<section class="work-experience"><h2>${title}</h2>${renderEntries(section, "job")}</section>`;
  }

  if (["professionalsummary", "summary", "profile"].includes(key)) {
    return `<section class="professional-summary"><h2>${title}</h2>${renderLineGroup(section.lines)}</section>`;
  }

  if (key === "education") {
    return `<section class="education"><h2>${title}</h2>${renderEntries(section, "education-item")}</section>`;
  }

  if (key === "certifications") {
    return `<section class="certifications"><h2>${title}</h2>${renderEntries(section, "certifications-item")}</section>`;
  }

  if (["skills", "technicalskills", "coreskills"].includes(key)) {
    return renderSkills(section, atsPlain);
  }

  if (["contact", "contactinformation"].includes(key)) {
    return `<section class="contact-info"><h2>${title}</h2>${renderLineGroup(section.lines)}</section>`;
  }

  return `<section class="${key || "resume-section"}"><h2>${title}</h2>${renderLineGroup(section.lines)}</section>`;
};

const renderHeader = (resume: ParsedResume, includeContact: boolean): string => {
  const contact = resume.contact.map((item) => `<p>${formatInline(item)}</p>`).join("");
  return `
    <header class="main-header">
      <h1>${formatInline(resume.name)}</h1>
      ${resume.title ? `<h3>${formatInline(resume.title)}</h3>` : ""}
      ${includeContact && contact ? `<div class="contact-line">${contact}</div>` : ""}
    </header>
  `;
};

const renderContactSection = (resume: ParsedResume): string => {
  if (resume.contact.length === 0) return "";
  return `<section class="contact-info"><h2>Contact Information</h2><div class="contact-items">${resume.contact
    .map((item) => `<p class="contact-item">${formatInline(item)}</p>`)
    .join("")}</div></section>`;
};

const renderNamedBlock = (resume: ParsedResume, name: string, includeHeaderContact: boolean, atsPlain = false): string => {
  if (normalizeKey(name) === "header") return renderHeader(resume, includeHeaderContact);
  if (normalizeKey(name) === "contactinformation") return renderContactSection(resume);
  const section = findSection(resume, name);
  return section ? renderSection(section, atsPlain) : "";
};

const renderTemplateBody = (resume: ParsedResume, template: ResumeTemplate): string => {
  const layoutNames = [
    ...(template.layout.featured ?? []),
    ...(template.layout.order ?? []),
    ...(template.layout.primary ?? []),
    ...(template.layout.secondary ?? []),
  ];
  const includeHeaderContact = !layoutNames.some((name) => normalizeKey(name) === "contactinformation");
  const atsPlain = template.atsCompliant === true;

  if (template.layout.type === "two-column") {
    const featured = (template.layout.featured ?? []).map((name) => renderNamedBlock(resume, name, includeHeaderContact, atsPlain)).join("");
    const left = (template.layout.secondary ?? []).map((name) => renderNamedBlock(resume, name, includeHeaderContact, atsPlain)).join("");
    const right = (template.layout.primary ?? []).map((name) => renderNamedBlock(resume, name, includeHeaderContact, atsPlain)).join("");
    if (featured) {
      return `<main class="resume-container has-columns has-featured${atsPlain ? " ats-compliant" : ""}">${featured}<div class="resume-columns"><aside class="left-column">${left}</aside><div class="right-column">${right}</div></div></main>`;
    }
    return `<main class="resume-container has-columns${atsPlain ? " ats-compliant" : ""}"><aside class="left-column">${left}</aside><div class="right-column">${right}</div></main>`;
  }

  const sections = (template.layout.order ?? []).map((name) => renderNamedBlock(resume, name, includeHeaderContact, atsPlain)).join("");
  return `<main class="resume-container${atsPlain ? " ats-compliant" : ""}">${sections}</main>`;
};

export const renderResumeHtml = (markdown: string, template: ResumeTemplate): string => {
  const resume = parseResumeMarkdown(markdown);
  const body = renderTemplateBody(resume, template);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(resume.name)} Resume</title>
    <style id="resume-style">
${baseStyles}
${template.css}
${printStyles}
    </style>
  </head>
  <body>
    ${body}
  </body>
</html>`;
};
