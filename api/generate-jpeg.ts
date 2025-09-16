import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { htmlContent } = req.body;

  if (!htmlContent) {
    return res.status(400).send('HTML content is required.');
  }

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

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
