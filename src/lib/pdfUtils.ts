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

export const PASHTO_FONT_STACK = "'Cairo', 'Vazirmatn', 'Noto Naskh Arabic', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif";

/**
 * Standard Print and PDF CSS rules applied across all reports, columns, and printable documents.
 * Guarantees connected cursive Pashto/Dari ligatures, modern color compatibility (oklch/Tailwind v4),
 * and crystal-clear typography across Roznamcha, Kata, Customers, and Stock Book.
 */
export const getStandardPrintCss = (isRTL: boolean = true): string => `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700;800&family=Vazirmatn:wght@400;500;600;700;800&display=swap');

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    letter-spacing: normal !important;
    word-spacing: normal !important;
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
  .pdf-pages-wrapper,
  .pdf-page,
  table, 
  thead,
  tbody,
  tr,
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
  label,
  small,
  i {
    font-family: ${PASHTO_FONT_STACK} !important;
    letter-spacing: normal !important;
    word-spacing: normal !important;
    font-feature-settings: "liga" 1, "calt" 1, "rlig" 1, "mkmk" 1, "mark" 1, "kern" 1 !important;
    -webkit-font-smoothing: antialiased !important;
    -moz-osx-font-smoothing: grayscale !important;
    text-rendering: optimizeLegibility !important;
  }

  ${isRTL ? `
  .pdf-report-root, .pdf-container, .pdf-page, table, th, td, h1, h2, h3, h4, p, div, span {
    direction: rtl !important;
    text-align: right !important;
    unicode-bidi: plaintext;
  }
  .header { text-align: center !important; }
  .header h1, .header h2, .header p { text-align: center !important; }
  .footer { text-align: center !important; }
  .footer p { text-align: center !important; }
  ` : `
  .pdf-report-root, .pdf-container, .pdf-page, table, th, td, h1, h2, h3, h4, p, div, span {
    direction: ltr !important;
    text-align: left !important;
  }
  .header { text-align: center !important; }
  .header h1, .header h2, .header p { text-align: center !important; }
  .footer { text-align: center !important; }
  .footer p { text-align: center !important; }
  `}

  .pdf-pages-wrapper {
    display: flex;
    flex-direction: column;
    gap: 16px;
    align-items: center;
    width: 100%;
  }

  .pdf-page {
    width: 794px;
    min-height: 1080px;
    background: #ffffff;
    padding: 20px 26px 16px 26px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .pdf-page-content {
    flex: 1 0 auto;
    width: 100%;
  }

  .header {
    text-align: center !important;
    margin-bottom: 8px;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 6px;
  }
  .header h1 {
    margin: 0 0 2px 0;
    color: #0f172a;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.25;
    letter-spacing: normal !important;
  }
  .header h2 {
    margin: 2px 0;
    color: #1e293b;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: normal !important;
  }
  .header p {
    margin: 0;
    color: #475569;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: normal !important;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 6px;
    margin-bottom: 8px;
  }
  .summary-card {
    border: 1px solid #cbd5e1;
    background-color: #f8fafc;
    padding: 5px 8px;
    border-radius: 6px;
  }
  .summary-card h3 {
    margin: 0;
    font-size: 9px;
    font-weight: 700;
    color: #475569;
    letter-spacing: normal !important;
  }
  .summary-card p {
    margin: 1px 0 0;
    font-size: 11.5px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    letter-spacing: normal !important;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
    margin-bottom: 6px;
    background-color: #ffffff;
    letter-spacing: normal !important;
  }
  
  th, td {
    border: 1px solid #cbd5e1;
    padding: 4.5px 6.5px;
    font-size: 10px;
    line-height: 1.25;
    color: #0f172a;
    vertical-align: middle;
    text-align: ${isRTL ? 'right' : 'left'} !important;
    letter-spacing: normal !important;
    word-spacing: normal !important;
    word-break: break-word;
    unicode-bidi: plaintext;
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
    letter-spacing: normal !important;
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

  .footer, .pdf-page .footer {
    flex-shrink: 0;
    margin-top: 8px;
    text-align: center !important;
    font-size: 9.5px;
    color: #64748b;
    border-top: 1px solid #cbd5e1;
    padding-top: 5px;
    letter-spacing: normal !important;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  @media print {
    .no-print { display: none !important; }
    html, body {
      background: #ffffff !important;
      padding: 0 !important;
      margin: 0 !important;
      letter-spacing: normal !important;
    }
    .pdf-wrapper { padding: 0 !important; display: block !important; }
    .pdf-container { border: none !important; box-shadow: none !important; padding: 0 !important; width: 100% !important; max-width: 100% !important; }
    .pdf-pages-wrapper { gap: 0 !important; display: block !important; width: 100% !important; }
    .pdf-page {
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      padding: 8mm 10mm !important;
      margin: 0 !important;
      width: 100% !important;
      min-height: 277mm !important;
      height: 277mm !important;
      max-height: 277mm !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-sizing: border-box !important;
    }
    .pdf-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    @page { size: A4 portrait; margin: 0; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
`;

export interface ColumnDef {
  header: string;
  className?: string;
  style?: string;
}

export interface PaginatedReportOptions<T> {
  title: string;
  subtitle?: string;
  dateText?: string;
  shopName?: string;
  shopAddress?: string;
  summaryHtml?: string;
  columns: (ColumnDef | string)[];
  records: T[];
  recordsPerPage?: number; // 20 records per A4 page
  renderRow: (record: T, indexInPage: number, globalIndex: number) => string;
  emptyMessage?: string;
  isRTL?: boolean;
  footerNote?: string;
}

/**
 * Utility to chunk any dataset into slices of 20 records per A4 page.
 */
export function chunkArray<T>(items: T[], chunkSize: number = 20): T[][] {
  if (!items || items.length === 0) return [];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize));
  }
  return result;
}

/**
 * Generates an A4 print-ready, multi-page HTML report with exactly 20 records per page,
 * consistent header information, summary widgets on page 1, and official page numbers.
 */
export function createPaginatedReportHtml<T>(options: PaginatedReportOptions<T>): string {
  const {
    title,
    subtitle,
    dateText,
    shopName,
    shopAddress,
    summaryHtml,
    columns,
    records,
    recordsPerPage = 20,
    renderRow,
    emptyMessage = 'No records found',
    isRTL = true,
    footerNote = 'Shop MIS System'
  } = options;

  const pageSize = recordsPerPage || 20;
  const chunks = chunkArray(records, pageSize);
  const totalPages = Math.max(1, chunks.length);
  const now = new Date();
  const dateStr = `${formatShamsi(now, 'full')} | USA: ${now.toISOString().split('T')[0]}`;

  const normalizedCols: ColumnDef[] = columns.map(c => 
    typeof c === 'string' ? { header: c } : c
  );

  const tableHeaderHtml = `
    <thead>
      <tr>
        ${normalizedCols.map(c => `
          <th class="${c.className || ''}" style="${c.style || ''}">${c.header}</th>
        `).join('')}
      </tr>
    </thead>
  `;

  if (chunks.length === 0) {
    return `
      <div class="pdf-pages-wrapper">
        <div class="pdf-page">
          <div class="pdf-page-content">
            <div class="header">
              ${shopName ? `<h1 style="font-size: 22px; margin-bottom: 2px;">${shopName}</h1>` : ''}
              ${shopAddress ? `<p style="margin-bottom: 6px; font-size: 11px; color: #64748b;">${shopAddress}</p>` : ''}
              <h1>${title}</h1>
              ${subtitle ? `<h2>${subtitle}</h2>` : ''}
              <p>${dateText || dateStr}</p>
            </div>

            ${summaryHtml ? summaryHtml : ''}

            <table>
              ${tableHeaderHtml}
              <tbody>
                <tr>
                  <td colspan="${normalizedCols.length}" class="text-center" style="padding: 24px; color: #64748b; font-weight: bold;">
                    ${emptyMessage}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
            <span>${footerNote}</span>
            <span>${isRTL ? `پاڼه ۱ له ۱` : `Page 1 of 1`}</span>
            <span>${dateStr}</span>
          </div>
        </div>
      </div>
    `;
  }

  const pagesHtml = chunks.map((chunk, pageIndex) => {
    const pageNumber = pageIndex + 1;
    const isFirstPage = pageIndex === 0;

    const rowsHtml = chunk.map((record, indexInPage) => {
      const globalIndex = (pageIndex * pageSize) + indexInPage;
      return renderRow(record, indexInPage, globalIndex);
    }).join('');

    return `
      <div class="pdf-page" data-page="${pageNumber}">
        <div class="pdf-page-content">
          <div class="header">
            ${shopName && isFirstPage ? `<h1 style="font-size: 22px; margin-bottom: 2px;">${shopName}</h1>` : ''}
            ${shopAddress && isFirstPage ? `<p style="margin-bottom: 6px; font-size: 11px; color: #64748b;">${shopAddress}</p>` : ''}
            <h1>${title}</h1>
            ${subtitle ? `<h2>${subtitle}</h2>` : ''}
            <p>${dateText || dateStr}</p>
          </div>

          ${isFirstPage && summaryHtml ? summaryHtml : ''}

          <table>
            ${tableHeaderHtml}
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <span>${footerNote}</span>
          <span style="font-weight: 700;">${isRTL ? `پاڼه ${pageNumber} له ${totalPages}` : `Page ${pageNumber} of ${totalPages}`}</span>
          <span>${dateStr}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="pdf-pages-wrapper">
      ${pagesHtml}
    </div>
  `;
}

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
          background: #f1f5f9;
        }
        .pdf-container {
          background: transparent;
          padding: 0;
          border-radius: 0;
          border: none;
          box-shadow: none;
          width: 100%;
          max-width: 820px;
        }
      </style>
    </head>
    <body>
      <div class="action-bar no-print">
        <div>
          <div class="title">${title}</div>
          <div class="hint-text">
            ${isRTL ? '💡 د چاپ او 20 ریکارډه په هره A4 پاڼه کې ثبتولو لپاره لاندې تڼۍ کېکاږئ' : '💡 Click Print to print or Save as PDF (20 records per A4 page)'}
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
 * - Renders off-screen (left: -99999px) so no white box or screen overlay is visible
 * - Features an animated progress dialog for multi-page reports
 * - Yields asynchronously between pages to prevent browser freezing
 * - Uses optimized 1.5x scale for fast rendering and razor-sharp A4 output
 * - Guarantees 15 records per A4 sheet formatting
 */
export async function downloadPDFDirectly(options: PDFReportOptions): Promise<void> {
  const { title, filename, contentHtml, isRTL = true } = options;
  const pdfFileName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  // 1. Create a progress indicator overlay
  let progressOverlay: HTMLElement | null = null;
  const updateProgress = (current: number, total: number) => {
    if (!progressOverlay) {
      progressOverlay = document.createElement('div');
      progressOverlay.id = 'pdf-export-progress-overlay';
      progressOverlay.style.position = 'fixed';
      progressOverlay.style.inset = '0';
      progressOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.65)';
      progressOverlay.style.backdropFilter = 'blur(4px)';
      progressOverlay.style.zIndex = '999999';
      progressOverlay.style.display = 'flex';
      progressOverlay.style.alignItems = 'center';
      progressOverlay.style.justifyContent = 'center';
      progressOverlay.style.padding = '16px';
      progressOverlay.style.fontFamily = PASHTO_FONT_STACK;

      progressOverlay.innerHTML = `
        <div style="background: #1e293b; color: #ffffff; border: 1px solid #334155; border-radius: 16px; padding: 24px 28px; width: 100%; max-width: 420px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); text-align: center;">
          <div style="display: flex; justify-content: center; margin-bottom: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); display: flex; align-items: center; justify-content: center; color: #60a5fa;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1.5s linear infinite;">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
            </div>
          </div>
          <h3 style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #f8fafc;">${title || 'Generating PDF Report'}</h3>
          <p id="pdf-progress-text" style="margin: 0 0 16px; font-size: 13px; color: #94a3b8;">Preparing pages...</p>
          <div style="width: 100%; background: #334155; height: 8px; border-radius: 9999px; overflow: hidden; margin-bottom: 12px;">
            <div id="pdf-progress-bar" style="width: 5%; height: 100%; background: #3b82f6; border-radius: 9999px; transition: width 0.2s ease;"></div>
          </div>
          <p style="margin: 0; font-size: 11px; color: #64748b;">20 records per A4 sheet • Quick rendering</p>
        </div>
        <style>
          @keyframes spin { 100% { transform: rotate(360deg); } }
        </style>
      `;
      document.body.appendChild(progressOverlay);
    }

    const textEl = document.getElementById('pdf-progress-text');
    const barEl = document.getElementById('pdf-progress-bar');
    const percent = Math.min(100, Math.round((current / Math.max(1, total)) * 100));

    if (textEl) {
      textEl.textContent = total > 1 ? `Rendering page ${current} of ${total} (${percent}%)...` : `Rendering document (${percent}%)...`;
    }
    if (barEl) {
      barEl.style.width = `${percent}%`;
    }
  };

  // 2. Off-screen container (NEVER visible on screen to prevent visual artifacts/glitches)
  const container = document.createElement('div');
  container.id = 'temp-pdf-export-engine-container';
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0px';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.direction = isRTL ? 'rtl' : 'ltr';
  container.style.zIndex = '-99999';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'hidden';

  container.innerHTML = `
    <style>
      ${getStandardPrintCss(isRTL)}
    </style>
    <div class="pdf-report-root" style="background:#ffffff; width: 100%;">
      ${contentHtml}
    </div>
  `;

  document.body.appendChild(container);

  // Synchronize Font Readiness before taking canvas DOM snapshot
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn('Font loading wait:', e);
    }
  }

  // Allow quick layout and font rendering calculation
  await new Promise((resolve) => setTimeout(resolve, 60));

  try {
    const pageElements = Array.from(container.querySelectorAll('.pdf-page')) as HTMLElement[];
    const totalPages = Math.max(1, pageElements.length);
    updateProgress(0, totalPages);

    // 4. Initialize jsPDF (A4 portrait) with compression enabled
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 7; // 7mm margins
    const printableWidth = pageWidth - (margin * 2);
    const printableHeight = pageHeight - (margin * 2);

    // High-speed optimized rendering scale: 1.35 (Fast rendering while retaining crisp vector-quality text)
    const renderScale = 1.35;

    if (pageElements.length > 0) {
      // Fast page-by-page rendering for 20 records per A4 sheet
      for (let i = 0; i < pageElements.length; i++) {
        updateProgress(i + 1, totalPages);
        
        // Micro-yield to main thread for smooth progress bar updates
        await new Promise((r) => setTimeout(r, 4));

        const pageEl = pageElements[i];
        const canvas = await html2canvas(pageEl, {
          scale: renderScale,
          useCORS: true,
          allowTaint: true,
          logging: false,
          imageTimeout: 0,
          backgroundColor: '#ffffff'
        });

        if (!canvas || canvas.width === 0 || canvas.height === 0) {
          continue;
        }

        const imgData = canvas.toDataURL('image/jpeg', 0.82);
        const imgHeight = (canvas.height * printableWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }

        const renderHeight = Math.min(imgHeight, printableHeight);
        pdf.addImage(imgData, 'JPEG', margin, margin, printableWidth, renderHeight, undefined, 'FAST');
      }
    } else {
      // Fallback for single document / unpaginated HTML
      updateProgress(1, 1);
      await new Promise((r) => setTimeout(r, 4));

      const canvas = await html2canvas(container, {
        scale: renderScale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
        backgroundColor: '#ffffff'
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas snapshot failed');
      }

      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * printableWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 0.82);

      if (imgHeight <= printableHeight) {
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight, undefined, 'FAST');
      } else {
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
    }

    // 6. Save the PDF directly to the user's downloads
    pdf.save(pdfFileName);
  } catch (err) {
    console.error('Direct PDF export error, falling back to printable window:', err);
    openPrintablePDFWindow({ title, filename, contentHtml, isRTL, autoPrint: true });
  } finally {
    // Clean up temporary DOM container and progress overlay
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    if (progressOverlay && document.body.contains(progressOverlay)) {
      document.body.removeChild(progressOverlay);
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
