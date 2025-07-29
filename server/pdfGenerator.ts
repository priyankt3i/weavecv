import puppeteer from 'puppeteer';

export async function generatePdfFromHtml(htmlContent: string): Promise<Uint8Array> {
  const browser = await puppeteer.launch({ headless: true }); // Ensure headless mode for server
  const page = await browser.newPage();

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.emulateMediaType('print');

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: '10mm', // Using mm for consistency with frontend
      bottom: '10mm',
      left: '10mm',
      right: '10mm',
    },
  });

  await browser.close();
  return pdfBuffer;
}
