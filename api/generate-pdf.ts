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
