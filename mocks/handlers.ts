import { http, HttpResponse } from 'msw';
import type { ResumeReview } from '../types';

const mockHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Mock Resume</title>
    <style id="resume-style">
      body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #222; margin: 0; padding: 0; }
      .resume-container { max-width: 900px; margin: 24px auto; background: #fff; padding: 32px; }
      h1 { margin: 0 0 4px; font-size: 28px; }
      h2 { margin: 20px 0 10px; font-size: 18px; border-bottom: 1px solid #eee; }
      ul { margin: 8px 0 0 18px; }
    </style>
  </head>
  <body>
    <div class="resume-container">
      <h1>Alex Morgan</h1>
      <div>Senior Software Engineer · alex.morgan@email.com · (555) 555-5555</div>
      <h2>Summary</h2>
      <p>Builder of reliable, user-focused web applications.</p>
      <h2>Experience</h2>
      <ul>
        <li>Led a feature launch that improved conversion by 18%.</li>
        <li>Reduced page load time by 35% via performance optimizations.</li>
      </ul>
    </div>
  </body>
</html>`;

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
    const body = await request.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'generate') {
      return HttpResponse.text(mockHtml, { headers: { 'Content-Type': 'text/html' } });
    }

    if (action === 'review') {
      return HttpResponse.json(mockReview);
    }

    if (action === 'apply') {
      const resumeHtml = typeof body?.resumeHtml === 'string' ? body.resumeHtml : mockHtml;
      return HttpResponse.text(resumeHtml, { headers: { 'Content-Type': 'text/html' } });
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
