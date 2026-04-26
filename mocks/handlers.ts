import { http, HttpResponse } from 'msw';
import type { ResumeReview } from '../types';

const mockMarkdown = `# Alex Morgan
**Senior Software Engineer**
San Francisco, CA | alex.morgan@email.com | (555) 555-5555 | linkedin.com/in/alexmorgan

## Professional Summary
Senior Software Engineer who builds reliable, user-focused web applications across React, Node.js, and cloud platforms.

## Skills
- Languages: TypeScript, JavaScript, Python
- Frameworks: React, Node.js, Express
- Cloud: AWS, Docker, Kubernetes

## Work Experience
### Example Software | Senior Software Engineer | 2020 - Present
- Led a feature launch that improved conversion by 18%.
- Reduced page load time by 35% through performance optimizations.

## Education
### State University | B.S. in Computer Science | 2016
`;

const mockReview: ResumeReview = {
  score: 82,
  suggestions: [
    {
      id: 'quantify-impact-1',
      title: 'Quantify Impact',
      description: 'Add a concrete metric to highlight the impact of your project work.',
      originalText: 'Led a feature launch that improved conversion.',
      isCorrection: false,
      placeholder: 'Led a feature launch that improved conversion by [Your Number]%.',
      status: 'pending',
    },
    {
      id: 'format-tech-1',
      title: 'Format Technical Terms',
      description: 'Standardize capitalization for technical terms.',
      originalText: 'nodejs',
      isCorrection: true,
      status: 'pending',
    },
  ],
};

const textToBuffer = (text: string): ArrayBuffer => {
  return new TextEncoder().encode(text).buffer;
};

const mockPdfBuffer = () =>
  textToBuffer('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

const mockJpegBuffer = () =>
  textToBuffer('JFIF');

export const handlers = [
  http.post('/api/gemini', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';

    if (action === 'generate') {
      return HttpResponse.text(mockMarkdown, { headers: { 'Content-Type': 'text/markdown' } });
    }

    if (action === 'review') {
      return HttpResponse.json(mockReview);
    }

    if (action === 'apply') {
      const resumeMarkdown = typeof body.resumeMarkdown === 'string' ? body.resumeMarkdown : mockMarkdown;
      return HttpResponse.text(resumeMarkdown, { headers: { 'Content-Type': 'text/markdown' } });
    }

    if (action === 'reviseDraft') {
      const resumeMarkdown = typeof body.resumeMarkdown === 'string' ? body.resumeMarkdown : mockMarkdown;
      const userInput = typeof body.userInput === 'string' ? body.userInput : '';
      if (userInput.toLowerCase().includes('funny') && body.forceApply !== true) {
        return HttpResponse.json({
          decision: 'needs_confirmation',
          message: 'That may make the resume feel less professional. I can apply it if you still want that tone.',
          concern: 'Casual humor can reduce recruiter confidence for most roles.',
        });
      }

      return HttpResponse.json({
        decision: 'applied',
        message: 'I updated the Markdown draft.',
        updatedMarkdown: `${resumeMarkdown}\n\n<!-- Mock AI change: ${userInput || 'requested edit'} -->`,
      });
    }

    if (action === 'importTemplate') {
      return HttpResponse.json({
        id: `imported-mock-${Date.now()}`,
        name: 'Imported Preview',
        thumbnailColor: '#2563eb',
        source: 'imported',
        templateVersion: 2,
        layout: {
          type: 'single-column',
          order: ['Header', 'Contact Information', 'Professional Summary', 'Skills', 'Work Experience', 'Education'],
        },
        css: `
          body { font-family: Arial, sans-serif; color: #172033; background: #f8fafc; }
          .resume-container { max-width: 850px; padding: 44px; border-top: 6px solid #2563eb; }
          h1 { color: #1d4ed8; font-size: 2.4em; }
          h2 { color: #1d4ed8; border-bottom: 1px solid #bfdbfe; padding-bottom: 6px; }
          .job-header { display: flex; justify-content: space-between; gap: 16px; }
        `,
      });
    }

    return HttpResponse.json({ error: 'Invalid action' }, { status: 400 });
  }),
  http.post('/api/generate-pdf', () => {
    return HttpResponse.arrayBuffer(mockPdfBuffer(), {
      headers: { 'Content-Type': 'application/pdf' },
    });
  }),
  http.post('/api/generate-jpeg', () => {
    return HttpResponse.arrayBuffer(mockJpegBuffer(), {
      headers: { 'Content-Type': 'image/jpeg' },
    });
  }),
];
