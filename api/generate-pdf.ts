import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRateLimit } from './_rateLimit.js';
import { sanitizeHtml } from './_sanitize.js';

const MAX_HTML = 400000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { htmlContent } = req.body;

  const allowed = await enforceRateLimit(req, res, { prefix: "generate-pdf", limit: 5, window: "1 m" });
  if (!allowed) return;

  if (typeof htmlContent !== 'string' || htmlContent.trim().length === 0 || htmlContent.length > MAX_HTML) {
    return res.status(400).send('Valid HTML content is required.');
  }

  const safeHtml = sanitizeHtml(htmlContent);
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(safeHtml, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.emulateMediaType('print');

    // Add a small delay to ensure all rendering is complete
    await new Promise(resolve => setTimeout(resolve, 100));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=resume.pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Failed to generate PDF.');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
