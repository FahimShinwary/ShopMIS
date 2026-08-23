import html2pdf from 'html2pdf.js';
import { formatShamsi } from './shamsi';

export interface PDFReportOptions {
  title: string;
  filename: string;
  contentHtml: string;
  isRTL?: boolean;
  autoPrint?: boolean;
}

export const getStandardPrintHtml = (
  contentHtml: string,
  title: string = 'Report',
  isRTL: boolean = false,
  autoPrint: boolean = false
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
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
          color: #0f172a;
          font-family: 'Vazirmatn', 'Noto Naskh Arabic', 'Noto Sans Arabic', 'Cairo', Tahoma, Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        ${isRTL ? `
        html, body, .pdf-container, table, th, td, h1, h2, h3, h4, p, div, span {
          direction: rtl !important;
          text-align: right !important;
          letter-spacing: normal !important;
          word-spacing: normal !important;
          font-feature-settings: "liga" 1, "calt" 1, "rlig" 1;
        }
        .header { text-align: center !important; }
        .footer { text-align: center !important; }
        ` : `
        .header { text-align: center; }
        .footer { text-align: center; }
        `}

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

        .header { 
          text-align: center; 
          margin-bottom: 24px; 
          border-bottom: 2px solid #1e293b; 
          padding-bottom: 16px; 
        }
        .header h1 { margin: 0 0 6px 0; color: #0f172a; font-size: 22px; font-weight: 800; }
        .header p { margin: 0; color: #64748b; font-size: 13px; font-weight: 600; }
        
        .summary-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); 
          gap: 12px; 
          margin-bottom: 20px; 
        }
        .summary-card { 
          border: 1px solid #e2e8f0; 
          background: #f8fafc;
          padding: 12px; 
          border-radius: 8px; 
          min-width: 0;
        }
        .summary-card h3 { margin: 0; font-size: 11px; font-weight: 700; color: #64748b; }
        .summary-card p { margin: 4px 0 0; font-size: 15px; font-weight: 800; color: #0f172a; line-height: 1.3; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { 
          border: 1px solid #cbd5e1; 
          padding: 8px 10px; 
          text-align: ${isRTL ? 'right' : 'left'}; 
          font-size: 11px; 
          line-height: 1.4; 
        }
        th { background: #f1f5f9; font-weight: 700; color: #1e293b; }
        
        .badge-income { color: #16a34a !important; font-weight: 700; }
        .badge-expense { color: #dc2626 !important; font-weight: 700; }
        
        .footer { 
          margin-top: 32px; 
          text-align: center; 
          font-size: 11px; 
          color: #64748b; 
          border-top: 1px solid #e2e8f0; 
          padding-top: 14px; 
        }

        @media print {
          .no-print { display: none !important; }
          html, body { 
            background: white !important; 
            padding: 0 !important; 
            margin: 0 !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .pdf-wrapper { padding: 0 !important; display: block !important; }
          .pdf-container { border: none !important; box-shadow: none !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
          @page { size: A4 portrait; margin: 10mm; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
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
        <div id="pdf-content" class="pdf-container">
          ${contentHtml}
        </div>
      </div>

      <script>
        window.onload = function() {
          if (${autoPrint ? 'true' : 'false'}) {
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function() {
                setTimeout(function() { window.print(); }, 200);
              });
            } else {
              setTimeout(function() { window.print(); }, 350);
            }
          }
        };
      </script>
    </body>
    </html>
  `;
};

/**
 * Print via a dedicated hidden iframe.
 * This triggers the browser's native Save as PDF / Print dialog directly with 0 lag,
 * vector text quality, zero canvas memory constraints, and no popup blocking issues.
 */
export function printViaIframe(contentHtml: string, title: string = 'Report', isRTL: boolean = false): void {
  // Remove any previously created print iframe
  const oldIframe = document.getElementById('print-service-iframe');
  if (oldIframe && document.body.contains(oldIframe)) {
    document.body.removeChild(oldIframe);
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'print-service-iframe';
  iframe.style.position = 'fixed';
  iframe.style.left = '-99999px';
  iframe.style.top = '-99999px';
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    console.error('Could not access iframe document');
    return;
  }

  const fullHtml = getStandardPrintHtml(contentHtml, title, isRTL, false);
  doc.open();
  doc.write(fullHtml);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn('Iframe print trigger:', err);
    }
  }, 300);
}

/**
 * Direct PDF Download.
 * If the dataset is large (many rows), using html2canvas can exceed max canvas dimensions and produce blank outputs.
 * In that case, we instantly trigger the native Save as PDF print engine for 100% vector accuracy and reliability.
 */
export async function downloadPDFDirectly(options: PDFReportOptions): Promise<void> {
  const { title, filename, contentHtml, isRTL = false } = options;
  const pdfFileName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Count table rows to detect if canvas limits will be exceeded
  const rowCount = (contentHtml.match(/<tr/gi) || []).length;

  // If table has > 35 rows, html2canvas will likely freeze or produce an empty canvas due to 16,384px height limit.
  // We use vector iframe print which instantly generates a multi-page PDF in 0.1s.
  if (rowCount > 35 || contentHtml.length > 15000) {
    console.log(`Large report detected (${rowCount} rows). Using high-fidelity vector PDF print engine.`);
    printViaIframe(contentHtml, title, isRTL);
    return;
  }

  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // ignore
    }
  }

  // Offscreen container: strictly positioned OFF-SCREEN so it NEVER covers the user's interface
  const container = document.createElement('div');
  container.id = 'temp-pdf-export-container';
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.padding = '32px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = isRTL ? 'rtl' : 'ltr';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-9999';

  container.innerHTML = `
    <style>
      * { box-sizing: border-box; }
      #temp-pdf-export-container {
        background-color: #ffffff !important;
        color: #0f172a !important;
        font-family: 'Vazirmatn', 'Noto Naskh Arabic', 'Noto Sans Arabic', 'Cairo', Tahoma, Arial, sans-serif !important;
      }
      #temp-pdf-export-container * {
        color: #0f172a !important;
        border-color: #cbd5e1 !important;
      }
      #temp-pdf-export-container h1, 
      #temp-pdf-export-container h2, 
      #temp-pdf-export-container h3, 
      #temp-pdf-export-container p, 
      #temp-pdf-export-container span, 
      #temp-pdf-export-container td, 
      #temp-pdf-export-container th {
        color: #0f172a !important;
        direction: ${isRTL ? 'rtl' : 'ltr'} !important;
        text-align: ${isRTL ? 'right' : 'left'} !important;
        font-family: 'Vazirmatn', 'Noto Naskh Arabic', 'Noto Sans Arabic', 'Cairo', Tahoma, Arial, sans-serif !important;
      }
      #temp-pdf-export-container .header { text-align: center !important; margin-bottom: 20px; border-bottom: 2px solid #1e293b; padding-bottom: 14px; }
      #temp-pdf-export-container .header h1 { margin: 0 0 4px 0; color: #0f172a !important; font-size: 20px; font-weight: 800; text-align: center !important; }
      #temp-pdf-export-container .header p { margin: 0; color: #475569 !important; font-size: 12px; font-weight: 600; text-align: center !important; }
      
      #temp-pdf-export-container .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin-bottom: 16px; }
      #temp-pdf-export-container .summary-card { border: 1px solid #e2e8f0 !important; background-color: #f8fafc !important; padding: 10px; border-radius: 6px; }
      #temp-pdf-export-container .summary-card h3 { margin: 0; font-size: 10px; font-weight: 700; color: #475569 !important; }
      #temp-pdf-export-container .summary-card p { margin: 3px 0 0; font-size: 14px; font-weight: 800; color: #0f172a !important; }

      #temp-pdf-export-container table { width: 100%; border-collapse: collapse; margin-top: 14px; background-color: #ffffff !important; }
      #temp-pdf-export-container th, 
      #temp-pdf-export-container td { border: 1px solid #cbd5e1 !important; padding: 7px 8px; font-size: 10px; word-wrap: break-word; line-height: 1.3; color: #0f172a !important; }
      #temp-pdf-export-container th { background-color: #f1f5f9 !important; font-weight: 700; color: #1e293b !important; }
      #temp-pdf-export-container .badge-income { color: #16a34a !important; font-weight: 700; }
      #temp-pdf-export-container .badge-expense { color: #dc2626 !important; font-weight: 700; }
      #temp-pdf-export-container .footer { margin-top: 24px; text-align: center !important; font-size: 10px; color: #475569 !important; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    </style>
    <div>
      ${contentHtml}
    </div>
  `;

  document.body.appendChild(container);

  try {
    const html2pdfFunc = (html2pdf as any).default || html2pdf || (window as any).html2pdf;
    if (html2pdfFunc) {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: pdfFileName,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 800
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdfFunc().set(opt).from(container).save();
    } else {
      printViaIframe(contentHtml, title, isRTL);
    }
  } catch (err) {
    console.error('Direct PDF export error, falling back to iframe print:', err);
    printViaIframe(contentHtml, title, isRTL);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}

export function exportToPDF(elementOrHtml: HTMLElement | string, filename: string, title: string = 'Report', isRTL: boolean = true) {
  const contentHtml = typeof elementOrHtml === 'string' ? elementOrHtml : elementOrHtml.outerHTML;
  downloadPDFDirectly({
    title,
    filename,
    contentHtml,
    isRTL
  });
}

export function openPrintablePDFWindow(options: PDFReportOptions) {
  const { title, contentHtml, isRTL = false, autoPrint = false } = options;
  
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow && !printWindow.closed) {
      const fullHtml = getStandardPrintHtml(contentHtml, title, isRTL, autoPrint);
      printWindow.document.write(fullHtml);
      printWindow.document.close();
      return;
    }
  } catch (e) {
    console.warn('window.open blocked, falling back to iframe print');
  }

  // Fallback to iframe printing if window.open is blocked by iframe or browser sandbox
  printViaIframe(contentHtml, title, isRTL);
}
