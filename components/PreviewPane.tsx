import React, { useRef, useState } from 'react';
import { Icon } from './Icon';
import type { ResumeTemplate } from '../types';

interface PreviewPaneProps {
  html: string;
  onReview: () => void;
  isLoadingReview: boolean;
  isLoadingGeneration: boolean;
  templates: ResumeTemplate[];
  activeTemplate: ResumeTemplate;
  onSelectTemplate: (template: ResumeTemplate) => void;
  onSelectFont: (font: string) => void;
}

const fonts = ["Times New Roman", "Arial", "Calibri", "Cambria", "Georgia"];

export const PreviewPane: React.FC<PreviewPaneProps> = ({ html, onReview, isLoadingReview, isLoadingGeneration, templates, activeTemplate, onSelectTemplate, onSelectFont }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [isLoadingExport, setIsLoadingExport] = useState(false); // New state for export loading

  // Comment out the old handleDownloadPdf for now
  // const handleDownloadPdf = () => {
  //   const iframe = iframeRef.current;
  //   if (!iframe || !iframe.contentWindow) {
  //     alert("Could not find resume content to print.");
  //     return;
  //   }

  //   const contentWindow = iframe.contentWindow;

  //   const contentDocument = iframe.contentDocument;
  //   if (!contentDocument) {
  //     alert("Could not find resume content to print.");
  //     return;
  //   }

  //   const resumeContent = contentDocument.documentElement;

  //   // Scroll to top to ensure accurate rendering by html2canvas
  //   contentWindow.scrollTo(0, 0);

  //   // Get the actual width and height of the content
  //   const contentWidth = resumeContent.scrollWidth;
  //   const contentHeight = resumeContent.scrollHeight;

  //   // Add a small delay to ensure all styles are applied before PDF generation
  //   setTimeout(() => {
  //     html2pdf().from(resumeContent).set({
  //       margin: [5, 5, 5, 5], // Top, Left, Bottom, Right margins in mm
  //       filename: 'resume.pdf',
  //       image: { type: 'jpeg', quality: 0.98 },
  //       html2canvas: {
  //         scale: 8, // Increased scale for better fidelity
  //         useCORS: true,
  //         width: contentWidth, // Set html2canvas width to content's scrollWidth
  //         height: contentHeight, // Set html2canvas height to content's scrollHeight
  //         logging: true // Enable logging for debugging
  //       },
  //       jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  //       pagebreak: { mode: 'css' }
  //     }).save();
  //   }, 100); // 100ms delay
  // };

  const handleDownloadPdfServer = async () => {
    if (!html) {
      alert("No resume content to export.");
      return;
    }

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ htmlContent: html }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      console.log("PDF opened in new tab successfully via server.");
    } catch (error) {
      console.error("Error generating PDF via server:", error);
      alert("Failed to generate PDF via server. Check console for details.");
    }
  };

  const handleExport = async (type: 'pdf' | 'image' | 'code') => { // Made async to await export processes
    setShowExportDropdown(false); // Close dropdown after selection
    if (!html) {
      alert("No resume content to export.");
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentWindow || !iframe.contentDocument) {
      alert("Could not find resume content to export.");
      return;
    }

    const contentDocument = iframe.contentDocument;
    const resumeContent = contentDocument.documentElement;

    setIsLoadingExport(true); // Start loading indicator

    try {
      switch (type) {
        case 'pdf':
          await handleDownloadPdfServer(); // Await server-side PDF logic
          break;
        case 'image':
          // Logic for image export (JPEG)
          console.log("Attempting JPEG export...");
          try {
            const response = await fetch('/api/generate-jpeg', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ htmlContent: html }),
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'resume.jpeg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log("JPEG export initiated successfully.");
          } catch (error) {
            console.error("Error generating JPEG via server:", error);
            alert("Failed to generate JPEG via server. Check console for details.");
          }
          break;
        case 'code':
          // Logic for code export (HTML, CSS)
          const htmlContent = contentDocument.documentElement.outerHTML;
          const cssContent = Array.from(contentDocument.styleSheets)
            .map(sheet => {
              try {
                return Array.from(sheet.cssRules)
                  .map(rule => rule.cssText)
                  .join('\n');
              } catch (e) {
                console.warn("Could not read CSS rules from stylesheet:", e);
                return '';
              }
            })
            .filter(Boolean)
            .join('\n\n');

          const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
          const cssBlob = new Blob([cssContent], { type: 'text/css' });

          const htmlUrl = URL.createObjectURL(htmlBlob);
          const cssUrl = URL.createObjectURL(cssBlob);

          const aHtml = document.createElement('a');
          aHtml.href = htmlUrl;
          aHtml.download = 'resume.html';
          document.body.appendChild(aHtml);
          aHtml.click();
          document.body.removeChild(aHtml);
          URL.revokeObjectURL(htmlUrl);

          if (cssContent) {
            const aCss = document.createElement('a');
            aCss.href = cssUrl;
            aCss.download = 'resume.css';
            document.body.appendChild(aCss);
            aCss.click();
            document.body.removeChild(aCss);
            URL.revokeObjectURL(cssUrl);
          } else {
            alert("No external CSS found to export.");
          }
          break;
        default:
          break;
      }
    } catch (error) {
      console.error("Error during export:", error);
      alert("Failed to export. Check console for details.");
    } finally {
      setIsLoadingExport(false); // End loading indicator
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-700">2. Preview & Edit</h2>
        <div className="flex items-center gap-2">
            <button
                onClick={onReview}
                disabled={!html || isLoadingReview || isLoadingGeneration}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-500 text-white font-semibold rounded-lg shadow-sm hover:bg-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                {isLoadingReview ? (
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                ) : (
                    <Icon name="review" className="w-4 h-4" />
                )}
                <span>Review & Score</span>
            </button>
            <div className="relative">
              <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  disabled={!html || isLoadingGeneration || isLoadingExport} // Disable button during export
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-green-500 text-white font-semibold rounded-lg shadow-sm hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                  {isLoadingExport ? (
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                  ) : (
                    <Icon name="download" className="w-4 h-4" />
                  )}
                  <span>{isLoadingExport ? 'Exporting...' : 'Export'}</span>
                  {!isLoadingExport && <Icon name="chevron-down" className="w-3 h-3 ml-1" />}
              </button>
              {showExportDropdown && !isLoadingExport && ( // Hide dropdown during export
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <button
                    onClick={() => handleExport('pdf')}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    As Document (PDF)
                  </button>
                  <button
                    onClick={() => handleExport('image')}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    As Image (JPEG)
                  </button>
                  <button
                    onClick={() => handleExport('code')}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    As Code (HTML, CSS)
                  </button>
                </div>
              )}
            </div>
        </div>
      </div>
      {(html || isLoadingGeneration || isLoadingExport) && ( // Show loading state for export too
        <div className="px-4 py-3 border-b border-slate-200 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Select a Template:</h3>
            <div className="flex flex-wrap gap-2">
              {templates.map((template) => {
                const isActive = template.id === activeTemplate.id;
                return (
                  <button
                    key={template.id}
                    onClick={() => onSelectTemplate(template)}
                    disabled={isLoadingGeneration || isLoadingExport} // Disable during export
                    className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isActive 
                        ? 'bg-sky-500 text-white shadow' 
                        : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                    }`}
                    title={`Apply ${template.name} template`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-slate-300"
                      style={{ backgroundColor: template.thumbnailColor }}
                    ></span>
                    <span>{template.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-600 mb-2">Select a Font:</h3>
            <div className="flex flex-wrap gap-2">
              {fonts.map((font) => (
                <button
                  key={font}
                  onClick={() => onSelectFont(font)}
                  disabled={isLoadingGeneration || !html || isLoadingExport} // Disable during export
                  className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`Apply ${font} font`}
                  style={{ fontFamily: font }}
                >
                  <span>{font}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="flex-grow p-4 overflow-y-auto bg-slate-50">
        {isLoadingGeneration || isLoadingExport ? ( // Show loader for generation or export
          <div className="flex flex-col items-center justify-center h-full">
            <img src="/loader.gif" alt="Loading..." className="w-48 h-48" /> {/* Loader GIF */}
            <p className="mt-4 text-slate-500">{isLoadingGeneration ? 'Generating Resume...' : 'Exporting...'}</p>
          </div>
        ) : html ? (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            title="Resume Preview"
            sandbox=""
            referrerPolicy="no-referrer"
            className="w-full h-full bg-white border-0 rounded-md shadow-inner"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center text-slate-500">
            <p>Your generated resume will appear here.<br/>Click "Generate Formatted Resume" to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
};
