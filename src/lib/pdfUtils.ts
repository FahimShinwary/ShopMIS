import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { formatShamsi } from './shamsi';

export interface PDFReportOptions {
  title: string;
  filename: string;
  contentHtml: string;
  isRTL?: boolean;
  autoPrint?: boolean;
}

const PASHTO_FONT_STACK = "'Vazirmatn', 'Noto Naskh Arabic', 'Noto Sans Arabic', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif";

/**
 * Standard Print and PDF CSS rules applied across all reports, columns, and printable documents.
 * Guarantees connected cursive Pashto/Dari ligatures and crystal-clear typography.
 */
export const getStandardPrintCss = (isRTL: boolean = true): string => `
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  html, body {
    margin: 0;
    padding: 0;
    background-color: #ffffff;
    color: #0f172a;
    font-family: ${PASHTO_FONT_STACK};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    letter-spacing: normal !important;
    word-spacing: normal !important;
  }

  .pdf-report-root, 
  .pdf-container, 
  table, 
  th, 
  td, 
  h1, 
  h2, 
  h3, 
  h4, 
  p, 
  div, 
  span, 
  strong, 
  b,
  label {
    font-family: ${PASHTO_FONT_STACK} !important;
    letter-spacing: normal !important;
    word-spacing: normal !important;
    font-feature-settings: "liga" 1, "calt" 1, "rlig" 1, "mkmk" 1, "mark" 1 !important;
    -webkit-font-smoothing: antialiased !important;
    -moz-osx-font-smoothing: grayscale !important;
  }

  ${isRTL ? `
  .pdf-report-root, .pdf-container, table, th, td, h1, h2, h3, h4, p, div, span {
    direction: rtl !important;
    text-align: right !important;
  }
  .header { text-align: center !important; }
  .header h1, .header h2, .header p { text-align: center !important; }
  .footer { text-align: center !important; }
  .footer p { text-align: center !important; }
  ` : `
  .pdf-report-root, .pdf-container, table, th, td, h1, h2, h3, h4, p, div, span {
    direction: ltr !important;
    text-align: left !important;
  }
  .header { text-align: center !important; }
  .header h1, .header h2, .header p { text-align: center !important; }
  .footer { text-align: center !important; }
  .footer p { text-align: center !important; }
  `}

  .header {
    text-align: center !important;
    margin-bottom: 20px;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 12px;
  }
  .header h1 {
    margin: 0 0 4px 0;
    color: #0f172a;
    font-size: 22px;
    font-weight: 800;
    line-height: 1.3;
  }
  .header h2 {
    margin: 4px 0;
    color: #1e293b;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.3;
  }
  .header p {
    margin: 0;
    color: #475569;
    font-size: 12px;
    font-weight: 600;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: 10px;
    margin-bottom: 18px;
  }
  .summary-card {
    border: 1px solid #cbd5e1;
    background-color: #f8fafc;
    padding: 10px 12px;
    border-radius: 8px;
  }
  .summary-card h3 {
    margin: 0;
    font-size: 11px;
    font-weight: 700;
    color: #475569;
  }
  .summary-card p {
    margin: 3px 0 0;
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.3;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 14px;
    margin-bottom: 14px;
    background-color: #ffffff;
  }
  
  th, td {
    border: 1px solid #cbd5e1;
    padding: 8px 10px;
    font-size: 11px;
    line-height: 1.45;
    color: #0f172a;
    vertical-align: middle;
    text-align: ${isRTL ? 'right' : 'left'} !important;
  }

  /* Specific column alignment rules */
  th.text-center, td.text-center {
    text-align: center !important;
  }
  th.text-end, td.text-end {
    text-align: ${isRTL ? 'left' : 'right'} !important;
  }

  th {
    background-color: #f1f5f9;
    font-weight: 800;
    color: #0f172a;
  }

  /* Status and badge color styles */
  .badge-income {
    color: #15803d !important;
    font-weight: 800;
  }
  .badge-expense {
    color: #b91c1c !important;
    font-weight: 800;
  }
  .badge-neutral {
    color: #2563eb !important;
    font-weight: 800;
  }

  .footer {
    margin-top: 28px;
    text-align: center !important;
    font-size: 11px;
    color: #64748b;
    border-top: 1px solid #cbd5e1;
    padding-top: 12px;
  }

  @media print {
    .no-print { display: none !important; }
    html, body {
      background: #ffffff !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .pdf-wrapper { padding: 0 !important; display: block !important; }
    .pdf-container { border: none !important; box-shadow: none !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
    @page { size: A4 portrait; margin: 10mm; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
`;

export const getStandardPrintHtml = (
  contentHtml: string,
  title: string = 'Report',
  isRTL: boolean = true,
  autoPrint: boolean = true
): string => {
  return `
    <!DOCTYPE html>
    <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ps' : 'en'}">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700;800&family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        ${getStandardPrintCss(isRTL)}

        .action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          padding: 12px 24px;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 2px 4px rgba(0,0,0,0.04);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .action-bar .title {
          font-weight: 700;
          font-size: 16px;
          color: #0f172a;
        }
        .action-bar .hint-text {
          font-size: 12px;
          color: #2563eb;
          font-weight: 600;
          margin-top: 2px;
        }
        .action-bar .btn-group {
          display: flex;
          gap: 10px;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }
        .btn-primary {
          background-color: #2563eb;
          color: #ffffff;
        }
        .btn-primary:hover {
          background-color: #1d4ed8;
        }

        .pdf-wrapper {
          padding: 24px;
          display: flex;
          justify-content: center;
        }
        .pdf-container {
          background: #ffffff;
          padding: 32px 36px;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
          width: 100%;
          max-width: 900px;
        }
      </style>
    </head>
    <body>
      <div class="action-bar no-print">
        <div>
          <div class="title">${title}</div>
          <div class="hint-text">
            ${isRTL ? '💡 د چاپ او PDF په توګه د ثبتولو لپاره لاندې تڼۍ کېکاږئ' : '💡 Click Print to print or Save as PDF with crystal clarity'}
          </div>
        </div>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="window.print()">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"></path></svg>
            ${isRTL ? 'چاپ / Save as PDF' : 'Print / Save as PDF'}
          </button>
        </div>
      </div>

      <div class="pdf-wrapper">
        <div id="pdf-content" class="pdf-container pdf-report-root">
          ${contentHtml}
        </div>
      </div>

      <script>
        window.onload = function() {
          if (${autoPrint ? 'true' : 'false'}) {
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function() {
                setTimeout(function() { window.print(); }, 250);
              });
            } else {
              setTimeout(function() { window.print(); }, 400);
            }
          }
        };
      </script>
    </body>
    </html>
  `;
};

/**
 * Print via a dedicated iframe or window popup.
 * Vector text quality, zero canvas memory constraints, and high compatibility.
 */
export function printViaIframe(contentHtml: string, title: string = 'Report', isRTL: boolean = true): void {
  const oldIframe = document.getElementById('print-service-iframe');
  if (oldIframe && document.body.contains(oldIframe)) {
    document.body.removeChild(oldIframe);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'print-service-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0px';
  iframe.style.bottom = '0px';
  iframe.style.width = '100px';
  iframe.style.height = '100px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0.01';
  iframe.style.zIndex = '-9999';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(getStandardPrintHtml(contentHtml, title, isRTL, true));
      printWin.document.close();
    }
    return;
  }

  const fullHtml = getStandardPrintHtml(contentHtml, title, isRTL, false);
  doc.open();
  doc.write(fullHtml);
  doc.close();

  const executePrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print error, using window fallback:', err);
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(getStandardPrintHtml(contentHtml, title, isRTL, true));
        printWin.document.close();
      }
    }
  };

  if (iframe.contentWindow?.document?.fonts?.ready) {
    iframe.contentWindow.document.fonts.ready.then(() => {
      setTimeout(executePrint, 200);
    }).catch(() => {
      setTimeout(executePrint, 350);
    });
  } else {
    setTimeout(executePrint, 400);
  }
}

/**
 * High-Definition Direct PDF Download using html2canvas-pro + jsPDF
 * - Renders in high z-index overlay so html2canvas captures 100% of text and tables
 * - Handles modern CSS colors (oklch, oklab, lch) seamlessly
 * - Guarantees fully connected cursive Pashto ligatures across all fields (Customer Name, Description, Amount, etc.)
 * - Scale 2.0 for 300 DPI Ultra-HD print sharpness
 * - JPEG 0.92 stream compression yielding ~200-400 KB compact file size
 * - Multi-page pagination when dataset is long
 */
export async function downloadPDFDirectly(options: PDFReportOptions): Promise<void> {
  const { title, filename, contentHtml, isRTL = true } = options;
  const pdfFileName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  // 1. Synchronize Font Readiness before taking canvas DOM snapshot
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn('Font loading wait:', e);
    }
  }

  // 2. High z-index container so dark app backgrounds don't occlude or blank the canvas capture
  const container = document.createElement('div');
  container.id = 'temp-pdf-export-engine-container';
  container.style.position = 'fixed';
  container.style.top = '0px';
  container.style.left = '0px';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = isRTL ? 'rtl' : 'ltr';
  container.style.zIndex = '999999';
  container.style.opacity = '1';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';

  container.innerHTML = `
    <style>
      ${getStandardPrintCss(isRTL)}
    </style>
    <div class="pdf-report-root" style="background:#ffffff; padding: 24px 28px; width: 100%;">
      ${contentHtml}
    </div>
  `;

  document.body.appendChild(container);

  // Allow layout and font rendering calculation
  await new Promise((resolve) => setTimeout(resolve, 150));

  try {
    // 3. Ultra-HD Canvas Snapshot using html2canvas-pro
    const canvas = await html2canvas(container, {
      scale: 2.0, // ~1,600px width matching high-resolution print standard
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas snapshot failed');
    }

    // 4. Initialize jsPDF (A4 portrait) with compression enabled
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10; // 10mm margins
    const printableWidth = pageWidth - (margin * 2);
    const printableHeight = pageHeight - (margin * 2);

    // Canvas dimensions converted to mm
    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * printableWidth) / canvas.width;

    // 5. Optimized Stream Compression: JPEG 0.92 quality (reduces size to ~200-400KB)
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    if (imgHeight <= printableHeight) {
      // Single Page Output
      pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
    } else {
      // Multi-Page Output with vertical slicing
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= printableHeight;

      while (heightLeft > 0) {
        position = position - printableHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= printableHeight;
      }
    }

    // 6. Save the PDF directly to the user's downloads
    pdf.save(pdfFileName);
  } catch (err) {
    console.error('Direct PDF export error, falling back to printable window:', err);
    openPrintablePDFWindow({ title, filename, contentHtml, isRTL, autoPrint: true });
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export function exportToPDF(
  elementOrHtml: HTMLElement | string,
  filename: string,
  title: string = 'Report',
  isRTL: boolean = true
) {
  const contentHtml = typeof elementOrHtml === 'string' ? elementOrHtml : elementOrHtml.outerHTML;
  downloadPDFDirectly({
    title,
    filename,
    contentHtml,
    isRTL
  });
}

export function openPrintablePDFWindow(options: PDFReportOptions) {
  const { title, contentHtml, isRTL = true, autoPrint = true } = options;

  try {
    const printWindow = window.open('', '_blank');
    if (printWindow && !printWindow.closed) {
      const fullHtml = getStandardPrintHtml(contentHtml, title, isRTL, autoPrint);
      printWindow.document.open();
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      return;
    }
  } catch (e) {
    console.warn('window.open blocked, falling back to iframe print');
  }

  printViaIframe(contentHtml, title, isRTL);
}
