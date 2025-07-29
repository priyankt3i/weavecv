import puppeteer from 'puppeteer';
import { readFileSync } from 'fs';
import path from 'path';

async function generatePDF() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const filePath = path.resolve(__dirname, 'resume.html');
  const htmlContent = readFileSync(filePath, 'utf-8');

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.emulateMediaType('print');

  await page.pdf({
    path: 'resume.pdf',
    format: 'A4',
    printBackground: true,
    margin: {
      top: '1in',
      bottom: '1in',
      left: '1in',
      right: '1in',
    },
  });

  await browser.close();
  console.log('✅ PDF generated successfully as Kumar_Priyank_Resume.pdf');
}

generatePDF().catch(console.error);
