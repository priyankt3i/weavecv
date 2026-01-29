import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceRateLimit } from './_rateLimit';
import { sanitizeHtml } from './_sanitize';

const MAX_HTML = 400000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { htmlContent } = req.body;

  const allowed = await enforceRateLimit(req, res, { prefix: "generate-jpeg", limit: 5, window: "1 m" });
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

    const jpegBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 98,
      fullPage: true,
    });

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Disposition', 'attachment; filename=resume.jpeg');
    res.setHeader('Content-Length', jpegBuffer.length);
    res.send(jpegBuffer);
  } catch (error) {
    console.error('Error generating JPEG:', error);
    res.status(500).send('Failed to generate JPEG.');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
