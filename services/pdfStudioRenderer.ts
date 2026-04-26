export type PdfMarginsMm = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type PdfRenderSettings = {
  layoutWidthPx: number;
  paperWidthMm: number;
  paperHeightMm: number;
  orientation: "portrait" | "landscape";
  paperLabel?: string;
  marginsMm: PdfMarginsMm;
  previewZoom: number;
};

export type PdfPage = {
  index: number;
  imageUrl: string;
  sourceStartPx: number;
  sourceHeightPx: number;
};

export type PdfRenderRecord = {
  title: string;
  pages: PdfPage[];
  settings: PdfRenderSettings;
  metrics: {
    sourceWidthPx: number;
    sourceHeightPx: number;
    fitScale: number;
    paperWidthPx: number;
    paperHeightPx: number;
  };
};

declare global {
  interface Window {
    html2canvas?: (
      element: HTMLElement,
      options: {
        backgroundColor?: string;
        height?: number;
        width?: number;
        x?: number;
        y?: number;
        scale?: number;
        logging?: boolean;
        useCORS?: boolean;
        allowTaint?: boolean;
        windowWidth?: number;
        windowHeight?: number;
      }
    ) => Promise<HTMLCanvasElement>;
    jspdf?: {
      jsPDF: new (options: {
        orientation: "portrait" | "landscape";
        unit: "mm";
        format: [number, number];
        compress?: boolean;
      }) => {
        addPage: (format: [number, number], orientation: "portrait" | "landscape") => void;
        addImage: (
          imageData: string,
          format: "JPEG" | "PNG",
          x: number,
          y: number,
          width: number,
          height: number,
          alias?: string,
          compression?: "FAST" | "MEDIUM" | "SLOW"
        ) => void;
        save: (filename: string) => void;
      };
    };
  }
}

export const defaultPdfSettings: PdfRenderSettings = {
  layoutWidthPx: 1024,
  paperWidthMm: 210,
  paperHeightMm: 297,
  orientation: "portrait",
  paperLabel: "A4",
  marginsMm: {
    top: 7,
    right: 5,
    bottom: 8,
    left: 5,
  },
  previewZoom: 0.72,
};

export const paperSizePresets = [
  { id: "a4", label: "A4", widthMm: 210, heightMm: 297 },
  { id: "letter", label: "Letter", widthMm: 215.9, heightMm: 279.4 },
  { id: "legal", label: "Legal", widthMm: 215.9, heightMm: 355.6 },
  { id: "a5", label: "A5", widthMm: 148, heightMm: 210 },
] as const;

export const layoutWidthPresets = [
  { label: "Compact 800px", value: 800 },
  { label: "Resume 1024px", value: 1024 },
  { label: "Desktop 1280px", value: 1280 },
  { label: "Wide 1440px", value: 1440 },
] as const;

export type PaperSizePresetId = (typeof paperSizePresets)[number]["id"];

const mmToPx = (mm: number): number => (mm * 96) / 25.4;

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()));

const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

const sanitizeFileName = (value: string): string => {
  return value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-");
};

export const slugifyFileName = (value: string): string => {
  return sanitizeFileName(value.toLowerCase()).replace(/^-+|-+$/g, "") || "resume";
};

const waitForFrameLoad = (frame: HTMLIFrameElement): Promise<void> => {
  return new Promise((resolve, reject) => {
    const handleLoad = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error("Frame failed to load."));
    };

    const cleanup = () => {
      frame.removeEventListener("load", handleLoad);
      frame.removeEventListener("error", handleError);
    };

    frame.addEventListener("load", handleLoad, { once: true });
    frame.addEventListener("error", handleError, { once: true });
  });
};

const getDocumentDimensions = (doc: Document) => {
  const body = doc.body;
  const html = doc.documentElement;

  return {
    widthPx: Math.ceil(Math.max(body.scrollWidth, html.scrollWidth, body.offsetWidth, html.clientWidth)),
    heightPx: Math.ceil(Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight, html.clientHeight)),
  };
};

const waitForDomSettled = (doc: Document, quietWindowMs = 350, timeoutMs = 3000): Promise<void> => {
  return new Promise((resolve) => {
    let settled = false;
    let quietTimer: number | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (quietTimer) window.clearTimeout(quietTimer);
      observer.disconnect();
      resolve();
    };

    const scheduleQuietPeriod = () => {
      if (quietTimer) window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(finish, quietWindowMs);
    };

    const observer = new MutationObserver(scheduleQuietPeriod);
    observer.observe(doc.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: false,
    });

    scheduleQuietPeriod();
    window.setTimeout(finish, timeoutMs);
  });
};

const waitForLayout = async (frame: HTMLIFrameElement): Promise<void> => {
  await nextFrame();
  await nextFrame();

  const doc = frame.contentDocument;
  if (!doc) {
    throw new Error("The preview frame did not initialize.");
  }

  if (doc.fonts && typeof doc.fonts.ready?.then === "function") {
    await Promise.race([doc.fonts.ready, sleep(2500)]);
  }

  const pendingImages = Array.from(doc.images || []).filter((image) => !image.complete);
  if (pendingImages.length) {
    await Promise.race([
      Promise.all(
        pendingImages.map(
          (image) =>
            new Promise<void>((resolve) => {
              image.addEventListener("load", () => resolve(), { once: true });
              image.addEventListener("error", () => resolve(), { once: true });
            })
        )
      ),
      sleep(3000),
    ]);
  }

  await waitForDomSettled(doc);

  let previousHeight = 0;
  let previousWidth = 0;
  let stableCycles = 0;

  for (let index = 0; index < 18; index += 1) {
    await sleep(120);
    const { widthPx, heightPx } = getDocumentDimensions(doc);
    if (Math.abs(widthPx - previousWidth) < 2 && Math.abs(heightPx - previousHeight) < 2) {
      stableCycles += 1;
    } else {
      stableCycles = 0;
    }

    previousWidth = widthPx;
    previousHeight = heightPx;

    if (stableCycles >= 3) return;
  }
};

const renderIntoFrame = async ({
  frame,
  documentHtml,
  viewportWidth,
}: {
  frame: HTMLIFrameElement;
  documentHtml: string;
  viewportWidth: number;
}) => {
  const loadPromise = waitForFrameLoad(frame);
  frame.style.width = `${viewportWidth}px`;
  frame.style.height = "1400px";
  frame.srcdoc = documentHtml;
  await loadPromise;
  await waitForLayout(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    throw new Error("The preview frame did not initialize.");
  }

  const dimensions = getDocumentDimensions(doc);
  frame.style.width = `${viewportWidth}px`;
  frame.style.height = `${Math.max(dimensions.heightPx, 1200)}px`;
  await nextFrame();

  return {
    title: doc.title || "resume",
    widthPx: dimensions.widthPx,
    heightPx: dimensions.heightPx,
  };
};

const isFullViewportShell = (rect: DOMRect, viewportWidthPx: number): boolean => {
  return rect.width >= viewportWidthPx * 0.97 && rect.left <= 2 && rect.right >= viewportWidthPx - 2;
};

const hasVisiblePaint = (colorValue: string): boolean => {
  if (!colorValue || colorValue === "transparent") return false;
  return !/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(colorValue);
};

const findPrimaryContentRoot = (doc: Document, dimensions: { widthPx: number; heightPx: number }): HTMLElement | null => {
  const body = doc.body;
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_ELEMENT);
  let bestNode: HTMLElement | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!(node instanceof doc.defaultView!.HTMLElement)) continue;
    if (node === body || node === doc.documentElement) continue;

    const style = doc.defaultView!.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || style.position === "fixed") continue;

    const rect = node.getBoundingClientRect();
    if (rect.width < 240 || rect.height < 240) continue;
    if (isFullViewportShell(rect, dimensions.widthPx)) continue;

    const widthRatio = rect.width / Math.max(dimensions.widthPx, 1);
    const centeredness = 1 - Math.min(Math.abs(rect.left + rect.width / 2 - dimensions.widthPx / 2) / (dimensions.widthPx / 2), 1);
    const hasPaint =
      hasVisiblePaint(style.backgroundColor) ||
      hasVisiblePaint(style.borderTopColor) ||
      hasVisiblePaint(style.borderRightColor) ||
      style.boxShadow !== "none";
    const score =
      rect.width * rect.height +
      (widthRatio >= 0.55 && widthRatio <= 0.92 ? 240000 : 0) +
      (hasPaint ? 180000 : 0) +
      centeredness * 160000;

    if (score > bestScore) {
      bestScore = score;
      bestNode = node;
    }
  }

  return bestNode;
};

const getElementBounds = (element: HTMLElement, dimensions: { widthPx: number; heightPx: number }) => {
  const rect = element.getBoundingClientRect();
  return {
    leftPx: clamp(rect.left, 0, dimensions.widthPx),
    topPx: clamp(rect.top, 0, dimensions.heightPx),
    widthPx: clamp(rect.width, 1, dimensions.widthPx),
    heightPx: clamp(rect.height, 1, dimensions.heightPx),
  };
};

const getContentBounds = (doc: Document, dimensions: { widthPx: number; heightPx: number }) => {
  const preferredRoot = doc.querySelector<HTMLElement>(".resume-container") ?? findPrimaryContentRoot(doc, dimensions);
  return getElementBounds(preferredRoot ?? doc.body, dimensions);
};

const collectBreakCandidates = (
  doc: Document,
  contentBounds: { topPx: number; heightPx: number }
): { topPx: number; forced: boolean }[] => {
  const candidates: { topPx: number; forced: boolean }[] = [];
  const seen = new Set<string>();
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!(node instanceof doc.defaultView!.HTMLElement)) continue;

    const style = doc.defaultView!.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || style.position === "fixed") continue;

    const rect = node.getBoundingClientRect();
    if (rect.height < 14) continue;

    const tag = node.tagName.toLowerCase();
    const display = style.display;
    const isCandidate =
      display === "block" ||
      display === "flex" ||
      display === "grid" ||
      display === "table" ||
      display === "list-item" ||
      /^(article|aside|blockquote|div|figure|footer|header|li|main|ol|p|section|table|tr|ul|h1|h2|h3|h4|h5|h6)$/.test(tag);

    if (!isCandidate) continue;

    const topPx = clamp(rect.top - contentBounds.topPx, 0, contentBounds.heightPx);
    const forced = /page|always|left|right/.test(style.breakBefore) || /always/.test(style.pageBreakBefore || "");
    const key = `${Math.round(topPx)}`;
    if (!seen.has(key)) {
      seen.add(key);
      candidates.push({ topPx, forced });
    }
  }

  candidates.push({ topPx: contentBounds.heightPx, forced: false });
  candidates.sort((a, b) => a.topPx - b.topPx);
  return candidates;
};

const paginateDocument = (
  doc: Document,
  contentBounds: { topPx: number; heightPx: number },
  pageHeightPx: number
): { startPx: number; heightPx: number }[] => {
  const totalHeightPx = contentBounds.heightPx;
  const candidates = collectBreakCandidates(doc, contentBounds);
  const segments: { startPx: number; heightPx: number }[] = [];
  let cursor = 0;
  const minFill = pageHeightPx * 0.58;
  const maxBacktrack = pageHeightPx * 0.26;

  while (cursor < totalHeightPx - 2) {
    const remaining = totalHeightPx - cursor;
    if (remaining <= pageHeightPx) {
      segments.push({ startPx: cursor, heightPx: remaining });
      break;
    }

    const forcedBreak = candidates.find((candidate) => candidate.forced && candidate.topPx > cursor + 18);
    if (forcedBreak && forcedBreak.topPx < cursor + pageHeightPx) {
      segments.push({ startPx: cursor, heightPx: Math.max(forcedBreak.topPx - cursor, 1) });
      cursor = forcedBreak.topPx;
      continue;
    }

    const ideal = cursor + pageHeightPx;
    const viable = candidates
      .filter((candidate) => candidate.topPx > cursor + minFill && candidate.topPx < ideal)
      .sort((a, b) => a.topPx - b.topPx);

    let breakAt = viable.length ? viable[viable.length - 1].topPx : ideal;
    if (viable.length && ideal - breakAt > maxBacktrack) {
      breakAt = ideal;
    }
    if (breakAt <= cursor + 24) {
      breakAt = ideal;
    }

    segments.push({ startPx: cursor, heightPx: breakAt - cursor });
    cursor = breakAt;
  }

  return segments;
};

const capturePageImage = async ({
  doc,
  dimensions,
  contentBounds,
  segment,
  settings,
  fitScale,
  paperWidthPx,
  paperHeightPx,
  contentWidthPx,
  marginTopPx,
  marginLeftPx,
}: {
  doc: Document;
  dimensions: { heightPx: number };
  contentBounds: { leftPx: number; topPx: number; widthPx: number };
  segment: { startPx: number; heightPx: number };
  settings: PdfRenderSettings;
  fitScale: number;
  paperWidthPx: number;
  paperHeightPx: number;
  contentWidthPx: number;
  marginTopPx: number;
  marginLeftPx: number;
}): Promise<string> => {
  if (!window.html2canvas) {
    throw new Error("html2canvas is not available. Check public/vendor files.");
  }

  const captureScale = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
  const sourceCanvas = await window.html2canvas(doc.documentElement, {
    backgroundColor: "#ffffff",
    height: Math.ceil(segment.heightPx),
    width: Math.ceil(contentBounds.widthPx),
    x: Math.floor(contentBounds.leftPx),
    y: Math.floor(contentBounds.topPx + segment.startPx),
    scale: captureScale,
    logging: false,
    useCORS: true,
    allowTaint: true,
    windowWidth: settings.layoutWidthPx,
    windowHeight: Math.max(Math.ceil(dimensions.heightPx), 1000),
  });

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = Math.round(paperWidthPx * captureScale);
  outputCanvas.height = Math.round(paperHeightPx * captureScale);

  const ctx = outputCanvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create PDF page canvas.");
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

  const scaledHeight = segment.heightPx * fitScale * captureScale;
  const scaledContentWidth = contentBounds.widthPx * fitScale * captureScale;
  const horizontalSlackPx = Math.max(contentWidthPx - contentBounds.widthPx * fitScale, 0);
  const leftPaddingPx = marginLeftPx + horizontalSlackPx / 2;

  ctx.drawImage(
    sourceCanvas,
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
    Math.round(leftPaddingPx * captureScale),
    Math.round(marginTopPx * captureScale),
    Math.round(scaledContentWidth),
    Math.round(scaledHeight)
  );

  return outputCanvas.toDataURL("image/jpeg", 0.96);
};

export const renderPaginatedHtml = async ({
  frame,
  html,
  settings = defaultPdfSettings,
  onStatus,
}: {
  frame: HTMLIFrameElement;
  html: string;
  settings?: PdfRenderSettings;
  onStatus?: (status: string) => void;
}): Promise<PdfRenderRecord> => {
  onStatus?.("Rendering document...");
  const frameResult = await renderIntoFrame({
    frame,
    documentHtml: html,
    viewportWidth: settings.layoutWidthPx,
  });

  const doc = frame.contentDocument;
  if (!doc) {
    throw new Error("The preview frame did not initialize.");
  }

  const dimensions = getDocumentDimensions(doc);
  const contentBounds = getContentBounds(doc, dimensions);
  const paperWidthPx = mmToPx(settings.paperWidthMm);
  const paperHeightPx = mmToPx(settings.paperHeightMm);
  const marginTopPx = mmToPx(settings.marginsMm.top);
  const marginRightPx = mmToPx(settings.marginsMm.right);
  const marginBottomPx = mmToPx(settings.marginsMm.bottom);
  const marginLeftPx = mmToPx(settings.marginsMm.left);
  const contentWidthPx = Math.max(paperWidthPx - marginLeftPx - marginRightPx, 1);
  const contentHeightPx = Math.max(paperHeightPx - marginTopPx - marginBottomPx, 1);
  const fitScale = Math.min(1, contentWidthPx / Math.max(contentBounds.widthPx, 1));
  const sourcePageHeightPx = contentHeightPx / fitScale;
  const segments = paginateDocument(doc, contentBounds, sourcePageHeightPx);
  const pages: PdfPage[] = [];

  for (let index = 0; index < segments.length; index += 1) {
    onStatus?.(`Capturing page ${index + 1} of ${segments.length}...`);
    const segment = segments[index];
    const imageUrl = await capturePageImage({
      doc,
      dimensions,
      contentBounds,
      segment,
      settings,
      fitScale,
      paperWidthPx,
      paperHeightPx,
      contentWidthPx,
      marginTopPx,
      marginLeftPx,
    });
    pages.push({
      index: index + 1,
      imageUrl,
      sourceStartPx: segment.startPx,
      sourceHeightPx: segment.heightPx,
    });
  }

  return {
    title: frameResult.title,
    pages,
    settings,
    metrics: {
      sourceWidthPx: contentBounds.widthPx,
      sourceHeightPx: contentBounds.heightPx,
      fitScale,
      paperWidthPx,
      paperHeightPx,
    },
  };
};

export const exportPdfRenderRecord = (renderRecord: PdfRenderRecord, filename: string): void => {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    throw new Error("jsPDF is not available. Check public/vendor files.");
  }

  const { paperWidthMm, paperHeightMm, orientation } = renderRecord.settings;
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: [paperWidthMm, paperHeightMm],
    compress: true,
  });

  renderRecord.pages.forEach((page, index) => {
    if (index > 0) {
      pdf.addPage([paperWidthMm, paperHeightMm], orientation);
    }
    pdf.addImage(page.imageUrl, "JPEG", 0, 0, paperWidthMm, paperHeightMm, undefined, "FAST");
  });

  pdf.save(`${slugifyFileName(filename)}.pdf`);
};
