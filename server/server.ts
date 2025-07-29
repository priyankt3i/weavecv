import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors'; // Import cors middleware
import { generatePdfFromHtml } from './pdfGenerator.js'; // Add .js extension for ESM compatibility

const app = express();
const port = 3001; // Or any other port you prefer

// Configure CORS to allow requests from your frontend origin
app.use(cors({
  origin: 'http://localhost:5173' // Allow requests from Vite's development server
}));

app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for large HTML content

app.post('/generate-pdf', async (req, res) => {
  const { htmlContent } = req.body;

  if (!htmlContent) {
    return res.status(400).send('HTML content is required.');
  }

  try {
    const pdfBuffer = await generatePdfFromHtml(htmlContent);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=resume.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).send('Failed to generate PDF.');
  }
});

app.listen(port, () => {
  console.log(`PDF generation server listening at http://localhost:${port}`);
});
