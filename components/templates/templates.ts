import type { ResumeTemplate } from '../../types';

const resumePolishBase = `
      body {
        margin: 0;
        background: #eef2f7;
        color: var(--ink);
      }
      .resume-container {
        max-width: 1024px;
        min-height: 1120px;
        margin: 0 auto;
        padding: 54px;
        background: var(--paper);
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.14);
        color: var(--ink);
        font-family: var(--font);
        font-size: 13px;
        line-height: 1.5;
      }
      .resume-container.has-columns {
        display: block;
        padding: 0;
      }
      .resume-container.has-featured .resume-columns,
      .resume-container.has-columns:not(.has-featured) {
        display: grid !important;
        grid-template-columns: minmax(238px, 31%) minmax(0, 1fr);
        gap: 0;
      }
      .left-column,
      .right-column {
        width: auto;
        padding: 46px;
      }
      .left-column {
        background: var(--panel);
        border-right: 1px solid var(--rule);
      }
      .right-column {
        background: var(--paper);
      }
      .main-header {
        margin-bottom: 32px;
      }
      .resume-container.has-featured > .main-header {
        margin: 0;
        padding: 48px 52px 36px;
        background: var(--header-bg, var(--paper));
        border-bottom: 1px solid var(--rule);
      }
      .main-header h1 {
        margin: 0;
        color: var(--heading);
        font-size: 40px;
        font-weight: 800;
        line-height: 1.06;
        letter-spacing: 0;
      }
      .main-header h3 {
        margin: 9px 0 0;
        color: var(--accent);
        font-size: 15px;
        font-weight: 750;
        line-height: 1.35;
        letter-spacing: 0;
      }
      .contact-line {
        display: flex;
        flex-wrap: wrap;
        gap: 7px 15px;
        margin-top: 18px;
      }
      .contact-line p {
        margin: 0;
        color: var(--muted);
        font-size: 12px;
        font-weight: 650;
      }
      section {
        margin-bottom: 27px;
      }
      h2 {
        margin: 0 0 13px;
        color: var(--accent);
        font-size: 12px;
        font-weight: 850;
        line-height: 1.25;
        letter-spacing: 0;
        text-transform: uppercase;
      }
      p {
        margin: 0 0 10px;
        color: var(--body);
      }
      a {
        color: inherit;
        text-decoration: none;
      }
      ul {
        margin: 8px 0 0;
        padding-left: 18px;
      }
      li {
        margin-bottom: 7px;
        padding-left: 2px;
        color: var(--body);
      }
      li::marker {
        color: var(--accent);
      }
      strong {
        color: var(--heading);
        font-weight: 800;
      }
      .job,
      .education-item,
      .certifications-item {
        margin-bottom: 21px;
      }
      .job-header {
        margin-bottom: 8px;
      }
      .job-heading {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 18px;
      }
      .job-header h3,
      .education-item h3,
      .certifications-item h3 {
        margin: 0;
        color: var(--heading);
        font-size: 16px;
        font-weight: 820;
        line-height: 1.28;
      }
      .job-date {
        flex: none;
        color: var(--muted);
        font-size: 12px;
        font-weight: 760;
        white-space: nowrap;
      }
      .job-meta {
        margin-top: 3px;
        color: var(--muted);
        font-size: 12px;
        font-style: normal;
        font-weight: 700;
      }
      .education-item p,
      .certifications-item p {
        margin-top: 3px;
        color: var(--muted);
        font-size: 12px;
      }
      .contact-items {
        display: grid;
        gap: 8px;
      }
      .contact-item {
        margin: 0;
        color: var(--body);
        font-size: 12px;
        font-weight: 650;
        line-height: 1.45;
        overflow-wrap: anywhere;
      }
      .skill-groups {
        display: grid;
        gap: 15px;
      }
      .skill-group h3 {
        margin: 0 0 7px;
        color: var(--heading);
        font-size: 12px;
        font-weight: 820;
      }
      .skill-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .skill-list span {
        display: inline-flex;
        max-width: 100%;
        border: 1px solid var(--chip-border);
        background: var(--chip-bg);
        color: var(--chip-text);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 720;
        line-height: 1.25;
      }
      @media (max-width: 760px) {
        .resume-container,
        .resume-container.has-featured > .main-header {
          padding: 28px;
        }
        .resume-container.has-featured .resume-columns,
        .resume-container.has-columns:not(.has-featured) {
          grid-template-columns: 1fr;
        }
        .left-column,
        .right-column {
          padding: 28px;
        }
        .main-header h1 {
          font-size: 32px;
        }
        .job-heading {
          display: block;
        }
        .job-date {
          display: block;
          margin-top: 4px;
          white-space: normal;
        }
      }
`;

export const templates: ResumeTemplate[] = [
  {
    id: 'modern-tech',
    name: 'Modern Tech',
    thumbnailColor: '#111827',
    layout: {
      type: 'two-column',
      featured: ['Header'],
      primary: ['Professional Summary', 'Work Experience', 'Projects', 'Certifications'],
      secondary: ['Contact Information', 'Skills', 'Education', 'Languages'],
    },
    css: `
      body { background: #f8fafc; color: #171717; }
      .resume-container {
        max-width: 1024px;
        min-height: 1120px;
        margin: 0 auto;
        padding: 54px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.16);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        color: #171717;
        line-height: 1.58;
      }
      .resume-container.has-columns { display: block; }
      .resume-columns { display: grid !important; grid-template-columns: minmax(210px, 31%) minmax(0, 1fr); gap: 48px; }
      .left-column, .right-column { width: auto; padding: 0; }
      .main-header { border-left: 8px solid #111; padding-left: 28px; margin-bottom: 44px; }
      .main-header h1 { color: #111; font-size: 44px; line-height: 1.05; margin: 0 0 10px; font-weight: 800; letter-spacing: 0; }
      .main-header h3 { color: #525252; font-size: 17px; line-height: 1.4; margin: 0; font-weight: 700; text-transform: uppercase; letter-spacing: 0; }
      section { margin-bottom: 34px; }
      h2 {
        margin: 0 0 16px;
        padding-bottom: 7px;
        border-bottom: 1px solid #d4d4d4;
        color: #737373;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0;
        line-height: 1.3;
        text-transform: uppercase;
      }
      p { margin: 0 0 10px; color: #404040; font-size: 13px; }
      .right-column p, .right-column li { font-size: 13px; color: #404040; }
      .contact-items { gap: 9px; }
      .contact-item { color: #404040; font-size: 12px; line-height: 1.45; overflow-wrap: break-word; }
      .skills { margin-bottom: 34px; }
      .skill-groups { gap: 17px; }
      .skill-group h3 { margin: 0 0 8px; color: #171717; font-size: 12px; font-weight: 800; line-height: 1.3; }
      .skill-list { gap: 5px; }
      .skill-list span {
        border-radius: 4px;
        background: #f1f5f9;
        color: #404040;
        padding: 3px 7px;
        font-size: 11px;
        font-weight: 600;
        line-height: 1.35;
      }
      .job { margin-bottom: 32px; }
      .job-header { margin-bottom: 10px; }
      .job-heading { display: flex; justify-content: space-between; gap: 18px; align-items: baseline; }
      .job-header h3 { color: #171717; font-size: 17px; font-weight: 800; line-height: 1.25; }
      .job-date { color: #737373; font-size: 12px; font-weight: 800; white-space: nowrap; }
      .job-meta { margin-top: 4px; color: #404040; font-size: 13px; font-style: italic; font-weight: 700; }
      ul { margin: 0; padding-left: 18px; }
      li { margin-bottom: 8px; padding-left: 2px; }
      li::marker { color: #111; }
      strong { color: #171717; font-weight: 800; }
      .education-item h3, .certifications-item h3 { color: #171717; font-size: 13px; font-weight: 800; }
      .education-item p, .certifications-item p { color: #525252; font-size: 12px; }
      @media (max-width: 760px) {
        .resume-container { padding: 28px; border-radius: 0; }
        .resume-columns { grid-template-columns: 1fr; gap: 12px; }
        .main-header { padding-left: 18px; margin-bottom: 30px; }
        .main-header h1 { font-size: 34px; }
        .job-heading { display: block; }
        .job-date { display: block; margin-top: 4px; white-space: normal; }
      }
    `,
  },
  {
    id: 'elegant-coral',
    name: 'Elegant Coral',
    thumbnailColor: '#D76A58',
    layout: {
      type: 'two-column',
      featured: ['Header'],
      primary: ['Professional Summary', 'Work Experience', 'Projects', 'Certifications'],
      secondary: ['Contact Information', 'Education', 'Skills', 'Languages'],
    },
    css: `
${resumePolishBase}
      :root {
        --font: "Aptos", "Segoe UI", Arial, sans-serif;
        --paper: #ffffff;
        --panel: #fff5f2;
        --ink: #27313f;
        --heading: #18212f;
        --body: #3e4a58;
        --muted: #718094;
        --accent: #d35f4d;
        --rule: #f0cfc6;
        --chip-bg: #ffffff;
        --chip-border: #efc7bd;
        --chip-text: #7a3429;
        --header-bg: linear-gradient(135deg, #fff8f6 0%, #ffffff 58%, #edf5ff 100%);
      }
      .resume-container {
        border-top: 10px solid #d35f4d;
      }
      .resume-container.has-featured > .main-header {
        position: relative;
        padding-left: 62px;
      }
      .resume-container.has-featured > .main-header::before {
        content: "";
        position: absolute;
        left: 38px;
        top: 48px;
        bottom: 38px;
        width: 6px;
        border-radius: 4px;
        background: #d35f4d;
      }
      .main-header h1 {
        max-width: 680px;
        font-family: Georgia, "Times New Roman", serif;
        font-size: 45px;
        font-weight: 700;
      }
      .main-header h3 {
        color: #9f4a3c;
      }
      .left-column {
        padding: 42px 34px 46px 46px;
      }
      .right-column {
        padding: 42px 54px 46px 48px;
      }
      .left-column h2 {
        color: #9f4a3c;
        border-bottom: 1px solid #efc7bd;
        padding-bottom: 8px;
      }
      .right-column h2 {
        display: flex;
        align-items: center;
        gap: 10px;
        color: #d35f4d;
      }
      .right-column h2::after {
        content: "";
        height: 1px;
        flex: 1;
        background: #efd8d2;
      }
      .professional-summary {
        margin-bottom: 30px;
      }
      .professional-summary p {
        font-size: 14px;
        line-height: 1.62;
      }
      .job {
        padding-left: 18px;
        border-left: 2px solid #f0cfc6;
      }
      .job-heading h3 {
        font-size: 17px;
      }
      .skill-list span {
        border-radius: 999px;
      }
    `,
  },
  {
    id: 'classic-onyx',
    name: 'Classic Onyx',
    thumbnailColor: '#2F343B',
    layout: {
      type: 'single-column',
      order: ['Header', 'Professional Summary', 'Work Experience', 'Projects', 'Education', 'Skills', 'Certifications', 'Languages'],
    },
    css: `
${resumePolishBase}
      :root {
        --font: Georgia, "Times New Roman", serif;
        --paper: #ffffff;
        --panel: #f5f6f8;
        --ink: #25282d;
        --heading: #14171b;
        --body: #373b42;
        --muted: #68707a;
        --accent: #2f343b;
        --rule: #d5d9df;
        --chip-bg: #f5f6f8;
        --chip-border: #d9dde3;
        --chip-text: #2f343b;
      }
      .resume-container {
        padding: 56px 62px;
        border-top: 14px solid #2f343b;
      }
      .main-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(220px, 33%);
        gap: 24px;
        align-items: end;
        border-bottom: 2px solid #2f343b;
        padding-bottom: 22px;
        margin-bottom: 22px;
      }
      .main-header h1 {
        font-size: 42px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .main-header h3 {
        color: #4b5563;
        font-family: "Aptos", "Segoe UI", Arial, sans-serif;
        font-size: 14px;
      }
      .contact-line {
        grid-column: 2;
        grid-row: 1 / span 2;
        display: grid;
        gap: 5px;
        margin: 0;
        text-align: right;
      }
      .contact-line p,
      .contact-item {
        font-family: "Aptos", "Segoe UI", Arial, sans-serif;
        font-size: 11px;
      }
      .contact-info {
        display: none;
      }
      h2 {
        padding-bottom: 6px;
        border-bottom: 1px solid #2f343b;
        color: #2f343b;
        font-family: "Aptos", "Segoe UI", Arial, sans-serif;
      }
      p,
      li {
        font-size: 13px;
      }
      .professional-summary p {
        column-count: 2;
        column-gap: 30px;
      }
      .job {
        margin-bottom: 22px;
      }
      .job-heading h3 {
        font-size: 16px;
      }
      .job-meta,
      .job-date,
      .education-item p,
      .certifications-item p {
        font-family: "Aptos", "Segoe UI", Arial, sans-serif;
      }
      .skills .skill-groups {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px 22px;
      }
      .skill-list span {
        border-radius: 2px;
      }
      @media (max-width: 760px) {
        .main-header {
          grid-template-columns: 1fr;
        }
        .contact-line {
          grid-column: auto;
          grid-row: auto;
          text-align: left;
        }
        .professional-summary p {
          column-count: 1;
        }
        .skills .skill-groups {
          grid-template-columns: 1fr;
        }
      }
    `,
  },
  {
    id: 'modern-cobalt',
    name: 'Modern Cobalt',
    thumbnailColor: '#155EEF',
    layout: {
      type: 'two-column',
      featured: ['Header'],
      primary: ['Professional Summary', 'Work Experience', 'Projects', 'Certifications'],
      secondary: ['Skills', 'Education', 'Languages'],
    },
    css: `
${resumePolishBase}
      :root {
        --font: "Aptos", "Segoe UI", Arial, sans-serif;
        --paper: #ffffff;
        --panel: #f3f7ff;
        --ink: #172033;
        --heading: #0f172a;
        --body: #334155;
        --muted: #64748b;
        --accent: #155eef;
        --rule: #c8d8ff;
        --chip-bg: #ffffff;
        --chip-border: #b9cdfc;
        --chip-text: #16429d;
        --header-bg: #0f172a;
      }
      .resume-container {
        border-bottom: 10px solid #155eef;
      }
      .resume-container.has-featured > .main-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(260px, 34%);
        gap: 32px;
        align-items: end;
        color: #ffffff;
      }
      .resume-container.has-featured > .main-header h1 {
        color: #ffffff;
        font-size: 44px;
      }
      .resume-container.has-featured > .main-header h3 {
        color: #93c5fd;
      }
      .resume-container.has-featured > .main-header .contact-line {
        justify-content: flex-end;
        margin-top: 0;
        text-align: right;
      }
      .resume-container.has-featured > .main-header .contact-line p {
        color: #dbeafe;
      }
      .left-column {
        padding: 42px 34px 46px 42px;
        background: linear-gradient(180deg, #f3f7ff 0%, #ffffff 100%);
      }
      .right-column {
        padding: 42px 56px 46px 48px;
      }
      .left-column h2 {
        color: #16429d;
        border-bottom: 1px solid #c8d8ff;
        padding-bottom: 8px;
      }
      .right-column h2 {
        border-left: 5px solid #155eef;
        padding-left: 10px;
      }
      .professional-summary {
        padding: 18px 20px;
        border: 1px solid #d7e3ff;
        background: #f8fbff;
      }
      .professional-summary p {
        margin-bottom: 0;
        font-size: 14px;
      }
      .job {
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 20px;
      }
      .job:last-child {
        border-bottom: 0;
      }
      .skill-list span {
        border-radius: 999px;
      }
    `,
  },
  {
    id: 'techy-teal',
    name: 'Techy Teal',
    thumbnailColor: '#0F766E',
    layout: {
      type: 'two-column',
      featured: ['Header'],
      primary: ['Professional Summary', 'Work Experience', 'Projects', 'Certifications'],
      secondary: ['Skills', 'Education', 'Languages'],
    },
    css: `
${resumePolishBase}
      :root {
        --font: "Aptos", "Segoe UI", Arial, sans-serif;
        --paper: #ffffff;
        --panel: #102a2c;
        --ink: #122023;
        --heading: #0b1618;
        --body: #334446;
        --muted: #697a7d;
        --accent: #0f766e;
        --rule: #c7e4df;
        --chip-bg: #e7f7f4;
        --chip-border: #a9d9d1;
        --chip-text: #0f5f59;
        --header-bg: linear-gradient(135deg, #102a2c 0%, #123b40 58%, #0f766e 100%);
      }
      .resume-container {
        font-family: var(--font);
      }
      .resume-container.has-featured > .main-header {
        color: #ffffff;
        border-bottom: 0;
      }
      .resume-container.has-featured > .main-header h1 {
        color: #ffffff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-size: 42px;
      }
      .resume-container.has-featured > .main-header h3,
      .resume-container.has-featured > .main-header .contact-line p {
        color: #b7f4ec;
      }
      .left-column {
        color: #d7fbf6;
        background: #102a2c;
        border-right: 0;
      }
      .left-column h2,
      .left-column .skill-group h3,
      .left-column .education-item h3,
      .left-column .certifications-item h3 {
        color: #b7f4ec;
      }
      .left-column p,
      .left-column li,
      .left-column .contact-item,
      .left-column .education-item p,
      .left-column .certifications-item p {
        color: #d2e9e5;
      }
      .left-column h2 {
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(183, 244, 236, 0.28);
      }
      .right-column {
        padding-left: 54px;
      }
      .right-column h2 {
        color: #0f766e;
        padding-bottom: 8px;
        border-bottom: 2px solid #c7e4df;
      }
      .professional-summary {
        border-left: 6px solid #0f766e;
        padding-left: 18px;
      }
      .job-header h3 {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        font-size: 15px;
      }
      .skill-list span {
        background: rgba(183, 244, 236, 0.12);
        border-color: rgba(183, 244, 236, 0.26);
        color: #d7fbf6;
        border-radius: 3px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      }
      .left-column li::marker {
        color: #7dd3c7;
      }
    `,
  },
  {
    id: 'elegant-wine',
    name: 'Elegant Wine',
    thumbnailColor: '#8A1538',
    layout: {
      type: 'two-column',
      featured: ['Header'],
      primary: ['Professional Summary', 'Work Experience', 'Projects', 'Certifications'],
      secondary: ['Contact Information', 'Education', 'Skills', 'Languages'],
    },
    css: `
${resumePolishBase}
      :root {
        --font: "Iowan Old Style", Georgia, "Times New Roman", serif;
        --paper: #ffffff;
        --panel: #fbf4f6;
        --ink: #30252a;
        --heading: #21181c;
        --body: #493c42;
        --muted: #82737a;
        --accent: #8a1538;
        --rule: #e7c9d2;
        --chip-bg: #ffffff;
        --chip-border: #e2bdc8;
        --chip-text: #74203b;
        --header-bg: #ffffff;
      }
      .resume-container {
        border-left: 12px solid #8a1538;
      }
      .resume-container.has-featured > .main-header {
        padding: 52px 58px 34px;
        border-bottom: 1px solid #e7c9d2;
      }
      .main-header h1 {
        color: #8a1538;
        font-size: 47px;
        font-weight: 600;
      }
      .main-header h3 {
        color: #4f2b37;
        font-family: "Aptos", "Segoe UI", Arial, sans-serif;
      }
      .contact-line p {
        font-family: "Aptos", "Segoe UI", Arial, sans-serif;
      }
      .left-column {
        padding: 42px 34px 48px 46px;
      }
      .right-column {
        padding: 42px 58px 48px 48px;
      }
      h2,
      .job-date,
      .job-meta,
      .education-item p,
      .certifications-item p,
      .skill-group h3,
      .contact-item {
        font-family: "Aptos", "Segoe UI", Arial, sans-serif;
      }
      .right-column h2 {
        display: grid;
        grid-template-columns: 28px 1fr;
        align-items: center;
        gap: 10px;
      }
      .right-column h2::before {
        content: "";
        height: 2px;
        background: #8a1538;
      }
      .professional-summary p {
        font-size: 14px;
        line-height: 1.68;
      }
      .job {
        margin-bottom: 25px;
      }
      .job-heading h3 {
        font-size: 17px;
      }
      .skill-list span {
        border-radius: 999px;
      }
    `,
  },
  {
    id: 'minimalist-gray',
    name: 'Minimalist Gray',
    thumbnailColor: '#64748B',
    layout: {
      type: 'single-column',
      order: ['Header', 'Professional Summary', 'Work Experience', 'Projects', 'Education', 'Skills', 'Certifications', 'Languages'],
    },
    css: `
${resumePolishBase}
      :root {
        --font: "Aptos", "Segoe UI", Arial, sans-serif;
        --paper: #ffffff;
        --panel: #f6f8fa;
        --ink: #1f2937;
        --heading: #111827;
        --body: #374151;
        --muted: #6b7280;
        --accent: #475569;
        --rule: #d7dde5;
        --chip-bg: #f8fafc;
        --chip-border: #d7dde5;
        --chip-text: #334155;
      }
      .resume-container {
        padding: 50px 60px;
      }
      .main-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(230px, 34%);
        gap: 26px;
        align-items: start;
        padding-bottom: 22px;
        border-bottom: 1px solid #cbd5e1;
      }
      .main-header h1 {
        font-size: 39px;
        font-weight: 780;
      }
      .main-header h3 {
        color: #475569;
      }
      .contact-line {
        grid-column: 2;
        grid-row: 1 / span 2;
        display: grid;
        gap: 5px;
        margin: 0;
        text-align: right;
      }
      .contact-line p {
        font-size: 11px;
      }
      .contact-info {
        display: none;
      }
      h2 {
        color: #475569;
        display: grid;
        grid-template-columns: 115px 1fr;
        align-items: center;
        gap: 14px;
      }
      h2::after {
        content: "";
        height: 1px;
        background: #d7dde5;
      }
      .professional-summary p {
        max-width: 820px;
        font-size: 14px;
        line-height: 1.62;
      }
      .job {
        display: grid;
        grid-template-columns: minmax(150px, 23%) minmax(0, 1fr);
        gap: 22px;
        margin-bottom: 24px;
      }
      .job-header {
        margin: 0;
      }
      .job-heading {
        display: block;
      }
      .job-date {
        display: block;
        margin-top: 6px;
        white-space: normal;
      }
      .job-meta {
        margin-top: 5px;
      }
      .job ul {
        margin-top: 0;
      }
      .education,
      .skills,
      .certifications,
      .languages {
        display: grid;
        grid-template-columns: 115px minmax(0, 1fr);
        gap: 14px;
      }
      .education h2,
      .skills h2,
      .certifications h2,
      .languages h2 {
        display: block;
      }
      .skills .skill-groups {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      @media (max-width: 760px) {
        .main-header,
        .job,
        .education,
        .skills,
        .certifications,
        .languages {
          grid-template-columns: 1fr;
        }
        .contact-line {
          grid-column: auto;
          grid-row: auto;
          text-align: left;
        }
        .skills .skill-groups {
          grid-template-columns: 1fr;
        }
      }
    `,
  },
  {
    id: 'subtle-sage',
    name: 'Subtle Sage',
    thumbnailColor: '#557A5B',
    layout: {
      type: 'two-column',
      featured: ['Header'],
      primary: ['Professional Summary', 'Work Experience', 'Projects', 'Certifications'],
      secondary: ['Contact Information', 'Skills', 'Education', 'Languages'],
    },
    css: `
${resumePolishBase}
      :root {
        --font: "Aptos", "Segoe UI", Arial, sans-serif;
        --paper: #ffffff;
        --panel: #f2f7f3;
        --ink: #1f2a25;
        --heading: #17211d;
        --body: #3c4b43;
        --muted: #6d7c73;
        --accent: #557a5b;
        --rule: #cbdccb;
        --chip-bg: #ffffff;
        --chip-border: #cbdccb;
        --chip-text: #35543a;
        --header-bg: linear-gradient(90deg, #f2f7f3 0%, #ffffff 100%);
      }
      .resume-container {
        border-top: 8px solid #557a5b;
      }
      .main-header h1 {
        color: #17211d;
      }
      .main-header h3 {
        color: #557a5b;
      }
      .left-column {
        padding: 42px 34px 46px 44px;
      }
      .right-column {
        padding: 42px 56px 46px 48px;
      }
      .left-column h2 {
        padding-bottom: 8px;
        border-bottom: 1px solid #cbdccb;
      }
      .right-column h2 {
        display: inline-flex;
        padding: 6px 10px;
        background: #eef6ef;
        color: #35543a;
        border-radius: 4px;
      }
      .professional-summary {
        margin-bottom: 32px;
      }
      .professional-summary p {
        font-size: 14px;
        line-height: 1.65;
      }
      .job {
        position: relative;
        padding-left: 20px;
      }
      .job::before {
        content: "";
        position: absolute;
        left: 0;
        top: 4px;
        bottom: 4px;
        width: 3px;
        border-radius: 999px;
        background: #cbdccb;
      }
      .skill-list span {
        border-radius: 999px;
      }
    `,
  },
  {
    id: 'academic-blue',
    name: 'Academic Blue',
    thumbnailColor: '#1D4E89',
    layout: {
      type: 'single-column',
      order: ['Header', 'Professional Summary', 'Work Experience', 'Projects', 'Education', 'Certifications', 'Skills', 'Languages'],
    },
    css: `
${resumePolishBase}
      :root {
        --font: "Times New Roman", Times, serif;
        --paper: #ffffff;
        --panel: #f4f7fb;
        --ink: #1d2733;
        --heading: #101820;
        --body: #283644;
        --muted: #5d6b7c;
        --accent: #1d4e89;
        --rule: #cbd7e6;
        --chip-bg: #f5f8fc;
        --chip-border: #cbd7e6;
        --chip-text: #1d4e89;
      }
      .resume-container {
        padding: 52px 62px;
      }
      .main-header {
        text-align: center;
        margin-bottom: 20px;
        padding-bottom: 18px;
        border-bottom: 3px double #1d4e89;
      }
      .main-header h1 {
        color: #1d4e89;
        font-size: 38px;
        font-weight: 700;
      }
      .main-header h3 {
        color: #283644;
        font-size: 15px;
      }
      .contact-line {
        justify-content: center;
        margin-top: 14px;
      }
      .contact-line p,
      .contact-item {
        font-family: "Aptos", "Segoe UI", Arial, sans-serif;
        font-size: 11px;
      }
      .contact-info {
        display: none;
      }
      h2 {
        color: #1d4e89;
        font-family: "Aptos", "Segoe UI", Arial, sans-serif;
        padding-bottom: 6px;
        border-bottom: 1px solid #cbd7e6;
      }
      p,
      li {
        font-size: 13px;
      }
      .professional-summary p {
        font-size: 13.5px;
        line-height: 1.62;
      }
      .job,
      .education-item,
      .certifications-item {
        margin-bottom: 18px;
      }
      .job-header h3,
      .education-item h3,
      .certifications-item h3 {
        font-size: 15px;
      }
      .job-date,
      .job-meta,
      .education-item p,
      .certifications-item p,
      .skill-group h3,
      .skill-list span {
        font-family: "Aptos", "Segoe UI", Arial, sans-serif;
      }
      .skills .skill-groups {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .skill-list span {
        border-radius: 2px;
      }
      @media (max-width: 760px) {
        .skills .skill-groups {
          grid-template-columns: 1fr;
        }
      }
    `,
  },
  {
    id: 'warm-sandstone',
    name: 'Warm Sandstone',
    thumbnailColor: '#B26B38',
    layout: {
      type: 'two-column',
      featured: ['Header'],
      primary: ['Professional Summary', 'Work Experience', 'Projects', 'Certifications'],
      secondary: ['Skills', 'Education', 'Languages'],
    },
    css: `
${resumePolishBase}
      :root {
        --font: "Aptos", "Segoe UI", Arial, sans-serif;
        --paper: #ffffff;
        --panel: #f7f3ed;
        --ink: #282b30;
        --heading: #171a1f;
        --body: #3d4148;
        --muted: #74706a;
        --accent: #b26b38;
        --rule: #dfc7af;
        --chip-bg: #ffffff;
        --chip-border: #dfc7af;
        --chip-text: #714423;
        --header-bg: #232833;
      }
      .resume-container.has-featured > .main-header {
        color: #ffffff;
        border-bottom: 8px solid #b26b38;
      }
      .resume-container.has-featured > .main-header h1 {
        color: #ffffff;
        font-size: 43px;
      }
      .resume-container.has-featured > .main-header h3 {
        color: #f0c49a;
      }
      .resume-container.has-featured > .main-header .contact-line p {
        color: #d9dee7;
      }
      .left-column {
        padding: 42px 34px 46px 44px;
      }
      .right-column {
        padding: 42px 56px 46px 48px;
      }
      .left-column h2 {
        color: #714423;
        padding-bottom: 8px;
        border-bottom: 1px solid #dfc7af;
      }
      .right-column h2 {
        color: #232833;
        padding-bottom: 8px;
        border-bottom: 2px solid #b26b38;
      }
      .professional-summary {
        padding: 18px 20px;
        background: #f9f6f1;
        border: 1px solid #e8d8c8;
      }
      .professional-summary p {
        margin-bottom: 0;
        font-size: 14px;
      }
      .job-heading h3 {
        font-size: 17px;
      }
      .job-date {
        color: #714423;
      }
      .skill-list span {
        border-radius: 3px;
      }
    `,
  },
  {
    id: 'professional-navy',
    name: 'Professional Navy',
    thumbnailColor: '#163B63',
    layout: {
      type: 'two-column',
      featured: ['Header'],
      primary: ['Professional Summary', 'Work Experience', 'Projects', 'Certifications'],
      secondary: ['Skills', 'Education', 'Languages'],
    },
    css: `
${resumePolishBase}
      :root {
        --font: "Aptos", "Segoe UI", Arial, sans-serif;
        --paper: #ffffff;
        --panel: #f4f7fa;
        --ink: #182230;
        --heading: #101828;
        --body: #344054;
        --muted: #667085;
        --accent: #163b63;
        --rule: #cfd9e6;
        --chip-bg: #ffffff;
        --chip-border: #cfd9e6;
        --chip-text: #163b63;
        --header-bg: #163b63;
      }
      .resume-container {
        border-right: 10px solid #5aa0b5;
      }
      .resume-container.has-featured > .main-header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(260px, 34%);
        gap: 30px;
        align-items: end;
        color: #ffffff;
      }
      .resume-container.has-featured > .main-header h1 {
        color: #ffffff;
        font-size: 42px;
      }
      .resume-container.has-featured > .main-header h3 {
        color: #b9d9e6;
      }
      .resume-container.has-featured > .main-header .contact-line {
        justify-content: flex-end;
        margin-top: 0;
        text-align: right;
      }
      .resume-container.has-featured > .main-header .contact-line p {
        color: #e6eef5;
      }
      .left-column {
        background: #f4f7fa;
        padding: 42px 34px 46px 42px;
      }
      .right-column {
        padding: 42px 58px 46px 48px;
      }
      h2 {
        color: #163b63;
      }
      .left-column h2 {
        padding-bottom: 8px;
        border-bottom: 1px solid #cfd9e6;
      }
      .right-column h2 {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .right-column h2::after {
        content: "";
        flex: 1;
        height: 1px;
        background: #cfd9e6;
      }
      .professional-summary p {
        font-size: 14px;
        line-height: 1.62;
      }
      .job {
        margin-bottom: 25px;
      }
      .job-heading h3 {
        font-size: 17px;
      }
      .skill-list span {
        border-radius: 999px;
      }
    `,
  },
  {
    id: 'creative-coral',
    name: 'Creative Coral',
    thumbnailColor: '#F45D5D',
    layout: {
      type: 'two-column',
      featured: ['Header'],
      primary: ['Professional Summary', 'Work Experience', 'Projects', 'Certifications'],
      secondary: ['Skills', 'Education', 'Languages'],
    },
    css: `
${resumePolishBase}
      :root {
        --font: "Aptos", "Segoe UI", Arial, sans-serif;
        --paper: #ffffff;
        --panel: #22252d;
        --ink: #1f2630;
        --heading: #111827;
        --body: #374151;
        --muted: #707987;
        --accent: #f45d5d;
        --rule: #ffd3d3;
        --chip-bg: rgba(255, 255, 255, 0.08);
        --chip-border: rgba(255, 255, 255, 0.24);
        --chip-text: #ffffff;
        --header-bg: linear-gradient(135deg, #f45d5d 0%, #f97373 54%, #ffffff 54%, #ffffff 100%);
      }
      .resume-container.has-featured > .main-header {
        min-height: 190px;
        border-bottom: 0;
      }
      .resume-container.has-featured > .main-header h1 {
        max-width: 520px;
        color: #ffffff;
        font-size: 46px;
      }
      .resume-container.has-featured > .main-header h3 {
        color: #fff7f7;
      }
      .resume-container.has-featured > .main-header .contact-line {
        max-width: 500px;
      }
      .resume-container.has-featured > .main-header .contact-line p {
        color: #fff7f7;
      }
      .left-column {
        background: #22252d;
        border-right: 0;
        color: #ffffff;
      }
      .left-column h2,
      .left-column .skill-group h3,
      .left-column .education-item h3,
      .left-column .certifications-item h3 {
        color: #ffffff;
      }
      .left-column h2 {
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.18);
      }
      .left-column p,
      .left-column li,
      .left-column .contact-item,
      .left-column .education-item p,
      .left-column .certifications-item p {
        color: #dce1ea;
      }
      .left-column li::marker {
        color: #f45d5d;
      }
      .right-column {
        padding: 42px 58px 48px 50px;
      }
      .right-column h2 {
        color: #f45d5d;
        padding-bottom: 8px;
        border-bottom: 2px solid #ffd3d3;
      }
      .professional-summary {
        margin-bottom: 32px;
      }
      .professional-summary p {
        font-size: 14px;
        line-height: 1.62;
      }
      .job {
        padding: 18px 0 20px;
        border-bottom: 1px solid #eceff3;
      }
      .job:first-of-type {
        padding-top: 0;
      }
      .skill-list span {
        border-radius: 999px;
      }
    `,
  },
];
