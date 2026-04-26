import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  defaultPdfSettings,
  exportPdfRenderRecord,
  renderPaginatedHtml,
  type PdfRenderSettings,
  type PdfRenderRecord,
} from "../services/pdfStudioRenderer";

export type PaginatedResumePreviewHandle = {
  exportPdf: (filename: string) => Promise<void>;
};

type PaginatedResumePreviewProps = {
  html: string;
  settings?: PdfRenderSettings;
  title?: string;
};

type PreviewState = {
  status: string;
  isRendering: boolean;
  renderRecord: PdfRenderRecord | null;
  error: string | null;
};

export const PaginatedResumePreview = forwardRef<PaginatedResumePreviewHandle, PaginatedResumePreviewProps>(
  ({ html, settings = defaultPdfSettings, title = "resume" }, ref) => {
    const frameRef = useRef<HTMLIFrameElement>(null);
    const renderTokenRef = useRef(0);
    const renderPromiseRef = useRef<Promise<PdfRenderRecord> | null>(null);
    const [previewState, setPreviewState] = useState<PreviewState>({
      status: html ? "Preparing preview..." : "Create a resume draft to preview it.",
      isRendering: false,
      renderRecord: null,
      error: null,
    });

    const renderNow = useCallback(async () => {
      if (!html.trim()) {
        throw new Error("Create a resume draft before rendering.");
      }

      const frame = frameRef.current;
      if (!frame) {
        throw new Error("Preview frame is not ready.");
      }

      const token = renderTokenRef.current + 1;
      renderTokenRef.current = token;
      setPreviewState((prev) => ({
        ...prev,
        status: "Rendering document...",
        isRendering: true,
        error: null,
      }));

      const promise = renderPaginatedHtml({
        frame,
        html,
        settings,
        onStatus: (status) => {
          if (renderTokenRef.current !== token) return;
          setPreviewState((prev) => ({ ...prev, status }));
        },
      });
      renderPromiseRef.current = promise;

      try {
        const renderRecord = await promise;
        if (renderTokenRef.current === token) {
          renderPromiseRef.current = null;
          setPreviewState({
            status: `Rendered ${renderRecord.pages.length} page${renderRecord.pages.length === 1 ? "" : "s"}.`,
            isRendering: false,
            renderRecord,
            error: null,
          });
        }
        return renderRecord;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Preview render failed.";
        if (renderTokenRef.current === token) {
          renderPromiseRef.current = null;
          setPreviewState({
            status: message,
            isRendering: false,
            renderRecord: null,
            error: message,
          });
        }
        throw error;
      }
    }, [html, settings]);

    const getLatestRender = useCallback(async () => {
      if (previewState.renderRecord && !previewState.isRendering) {
        return previewState.renderRecord;
      }
      if (renderPromiseRef.current) {
        return renderPromiseRef.current;
      }
      return renderNow();
    }, [previewState.renderRecord, previewState.isRendering, renderNow]);

    useImperativeHandle(
      ref,
      () => ({
        exportPdf: async (filename: string) => {
          const renderRecord = await getLatestRender();
          exportPdfRenderRecord(renderRecord, filename || title);
        },
      }),
      [getLatestRender, title]
    );

    useEffect(() => {
      if (!html.trim()) {
        setPreviewState({
          status: "Create a resume draft to preview it.",
          isRendering: false,
          renderRecord: null,
          error: null,
        });
        return;
      }

      setPreviewState((prev) => ({
        ...prev,
        status: "Preparing preview...",
        isRendering: true,
        renderRecord: null,
        error: null,
      }));

      const timeoutId = window.setTimeout(() => {
        renderNow().catch((error) => console.error("Failed to render paginated preview:", error));
      }, 120);

      return () => window.clearTimeout(timeoutId);
    }, [html, renderNow]);

    const { renderRecord, isRendering, status, error } = previewState;
    const paperWidth = renderRecord ? renderRecord.metrics.paperWidthPx * renderRecord.settings.previewZoom : 0;

    return (
      <div className="relative min-h-[62vh] overflow-hidden rounded-md border border-slate-200 bg-slate-950" aria-busy={isRendering}>
        <div
          className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-300"
          role="status"
          aria-live="polite"
        >
          <span>{status}</span>
          {renderRecord && (
            <span>
              {renderRecord.settings.paperLabel ?? "Custom"} · {renderRecord.pages.length} page{renderRecord.pages.length === 1 ? "" : "s"} · Fit{" "}
              {Math.round(renderRecord.metrics.fitScale * 100)}%
            </span>
          )}
        </div>

        <div className="h-[calc(100%-45px)] min-h-[62vh] overflow-auto bg-slate-900 p-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {!error && !renderRecord && (
            <div className="flex min-h-[54vh] items-center justify-center text-sm font-semibold text-slate-300">
              {isRendering ? "Rendering paginated preview..." : "No preview yet."}
            </div>
          )}

          {renderRecord && (
            <div className="flex flex-col items-center gap-6">
              {renderRecord.pages.map((page) => (
                <article key={page.index} className="w-full max-w-fit">
                  <div className="mb-2 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Page {page.index}
                  </div>
                  <div className="max-w-full rounded-md bg-slate-800 p-3 shadow-2xl ring-1 ring-white/10">
                    <img
                      src={page.imageUrl}
                      alt={`Resume page ${page.index}`}
                      className="block max-w-full rounded-sm bg-white shadow-lg"
                      style={{ width: paperWidth, height: "auto" }}
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div aria-hidden="true" className="pointer-events-none fixed left-[-200vw] top-0 h-0 w-0 overflow-hidden opacity-0">
          <iframe ref={frameRef} title="Hidden resume renderer" className="border-0 bg-white" />
        </div>
      </div>
    );
  }
);

PaginatedResumePreview.displayName = "PaginatedResumePreview";
