import puppeteer from 'puppeteer';

export async function generatePdfFromUrl(url: string): Promise<Uint8Array> {
  const browser = await puppeteer.launch({ headless: true }); // Use true for headless mode
  const page = await browser.newPage();

  await page.goto(url, { waitUntil: 'networkidle0' }); // Load content from URL
  await page.emulateMediaType('print');

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true, // Honor CSS @page
    // No margin here if your CSS has it
  });

  await browser.close();
  return pdfBuffer;
}
