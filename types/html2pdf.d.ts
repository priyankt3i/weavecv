declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type: string; quality: number };
    html2canvas?: { scale?: number; useCORS?: boolean; width?: number; height?: number; x?: number; y?: number; logging?: boolean };
    jsPDF?: { unit?: string; format?: string | number[]; orientation?: string };
    pagebreak?: { mode?: string | string[] };
  }

  interface Html2Pdf {
    from: (element: HTMLElement) => Html2Pdf;
    set: (options: Html2PdfOptions) => Html2Pdf;
    save: () => Promise<void>; // html2pdf.js save() returns a Promise
    output: (type: 'blob' | 'datauristring' | 'dataurlnewwindow' | 'arraybuffer' | 'base64' | 'datauri') => Promise<any>; // Add output method
  }

  function html2pdf(): Html2Pdf;

  export default html2pdf;
}
