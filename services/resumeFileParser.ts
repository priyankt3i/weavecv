import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt"] as const;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const normalizeExtractedText = (text: string) => {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
};

const getExtension = (fileName: string) => {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
};

const extractPdfText = async (file: File) => {
  const data = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText) {
      pages.push(pageText);
    }
  }

  return pages.join("\n\n");
};

const extractDocxText = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

export const parseResumeFile = async (file: File) => {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Resume uploads must be 10 MB or smaller.");
  }

  const extension = getExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.includes(extension as (typeof SUPPORTED_EXTENSIONS)[number])) {
    throw new Error("Upload a PDF, DOCX, or TXT resume.");
  }

  const extractedText =
    extension === ".pdf"
      ? await extractPdfText(file)
      : extension === ".docx"
        ? await extractDocxText(file)
        : await file.text();

  const normalizedText = normalizeExtractedText(extractedText);
  if (!normalizedText) {
    throw new Error("No readable text was found in that file. Try a text-based PDF or paste the resume instead.");
  }

  return normalizedText;
};
