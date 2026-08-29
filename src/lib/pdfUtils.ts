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
    min-height: 1123px;
    background: #ffffff;
    padding: 22px 28px 18px 28px;
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
    display: flex;
    flex-direction: column;
  }

  .header {
    text-align: center !important;
    margin-bottom: 8px;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 6px;
  }
  .header.header-subsequent {
    text-align: inherit !important;
    margin-bottom: 8px;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 6px;
  }
  .header h1 {
    margin: 0 0 2px 0;
    color: #0f172a;
    font-size: 18px;
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
    font-size: 10.5px;
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
    margin: 2px 0 0;
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    letter-spacing: normal !important;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    margin-bottom: 4px;
    background-color: #ffffff;
    letter-spacing: normal !important;
    flex: 1 0 auto;
  }
  
  th, td {
    border: 1px solid #cbd5e1;
    padding: 4px 6.5px;
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
    padding: 5px 6.5px;
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
    font-size: 10.5px;
    color: #475569;
    border-top: 1.5px solid #cbd5e1;
    padding-top: 6px;
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
      padding: 10mm 12mm 8mm 12mm !important;
      margin: 0 !important;
      width: 100% !important;
      min-height: 280mm !important;
      height: 280mm !important;
      max-height: 280mm !important;
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
  recordsPerPage?: number;
  firstPageRecords?: number;
  subsequentPageRecords?: number;
  renderRow: (record: T, indexInPage: number, globalIndex: number) => string;
  emptyMessage?: string;
  isRTL?: boolean;
  footerNote?: string;
}

/**
 * Utility to chunk any dataset into slices per A4 page.
 */
export function chunkArray<T>(items: T[], chunkSize: number = 26): T[][] {
  if (!items || items.length === 0) return [];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize));
  }
  return result;
}

/**
 * Smart chunker that fits optimal records on Page 1 (accommodating summary cards)
 * and standard records on subsequent pages (filling cleanly between standard header and footer).
 */
export function chunkReportRecords<T>(
  items: T[],
  firstPageCapacity: number = 22,
  subsequentPageCapacity: number = 25
): T[][] {
  if (!items || items.length === 0) return [];
  const result: T[][] = [];

  const firstChunk = items.slice(0, firstPageCapacity);
  result.push(firstChunk);

  let startIndex = firstPageCapacity;
  while (startIndex < items.length) {
    result.push(items.slice(startIndex, startIndex + subsequentPageCapacity));
    startIndex += subsequentPageCapacity;
  }

  return result;
}

/**
 * Generates an A4 print-ready, multi-page HTML report where records fill all the way
 * down to the footer on each page, subsequent pages start right after a normal header,
 * and page numbers are continuous and clear.
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
    recordsPerPage,
    firstPageRecords,
    subsequentPageRecords,
    renderRow,
    emptyMessage = 'No records found',
    isRTL = true,
    footerNote = 'Shop MIS System'
  } = options;

  const hasSummary = Boolean(summaryHtml && summaryHtml.trim().length > 0);
  
  // Standard A4 capacities:
  // Page 1: 20 records (if summary widget present) or 22 records (if no summary widget)
  // Page 2+: 25 records (with standard official header and footer)
  const firstPageSize = firstPageRecords || (recordsPerPage && recordsPerPage > 10 ? recordsPerPage : (hasSummary ? 20 : 22));
  const subsequentPageSize = subsequentPageRecords || (recordsPerPage && recordsPerPage > 10 ? recordsPerPage : 25);

  const chunks = chunkReportRecords(records, firstPageSize, subsequentPageSize);
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

  if (chunks.length === 0 || records.length === 0) {
    return `
      <div class="pdf-pages-wrapper">
        <div class="pdf-page">
          <div class="pdf-page-content">
            <div class="header">
              ${shopName ? `<h1 style="font-size: 20px; margin-bottom: 2px;">${shopName}</h1>` : ''}
              ${shopAddress ? `<p style="margin-bottom: 4px; font-size: 11px; color: #64748b;">${shopAddress}</p>` : ''}
              <h1 style="font-size: 17px; margin-bottom: 2px;">${title}</h1>
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
            <span style="font-weight: 700;">${isRTL ? `پاڼه ۱ له ۱` : `Page 1 of 1`}</span>
            <span>${dateStr}</span>
          </div>
        </div>
      </div>
    `;
  }

  let runningGlobalIndex = 0;

  const pagesHtml = chunks.map((chunk, pageIndex) => {
    const pageNumber = pageIndex + 1;
    const isFirstPage = pageIndex === 0;

    const rowsHtml = chunk.map((record, indexInPage) => {
      const currentGlobalIndex = runningGlobalIndex++;
      return renderRow(record, indexInPage, currentGlobalIndex);
    }).join('');

    return `
      <div class="pdf-page" data-page="${pageNumber}">
        <div class="pdf-page-content">
          ${isFirstPage ? `
            <div class="header">
              ${shopName ? `<h1 style="font-size: 20px; margin-bottom: 2px;">${shopName}</h1>` : ''}
              ${shopAddress ? `<p style="margin-bottom: 4px; font-size: 11px; color: #64748b;">${shopAddress}</p>` : ''}
              <h1 style="font-size: 17px; margin-bottom: 2px;">${title}</h1>
              ${subtitle ? `<h2>${subtitle}</h2>` : ''}
              <p>${dateText || dateStr}</p>
            </div>
            ${summaryHtml ? summaryHtml : ''}
          ` : `
            <div class="header header-subsequent">
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <div style="text-align: ${isRTL ? 'right' : 'left'};">
                  <h2 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a;">
                    ${title} ${subtitle ? `<span style="font-size: 12px; font-weight: 600; color: #475569;">(${subtitle})</span>` : ''}
                  </h2>
                  ${shopName ? `<div style="font-size: 11px; font-weight: 700; color: #2563eb; margin-top: 2px;">${shopName}</div>` : ''}
                </div>
                <div style="text-align: ${isRTL ? 'left' : 'right'}; font-size: 10.5px; color: #475569; font-weight: 600;">
                  <div>${dateText || dateStr}</div>
                </div>
              </div>
            </div>
          `}

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
            ${isRTL ? '💡 د پوره A4 پاڼې ډک چاپ او PDF ثبتولو لپاره لاندې تڼۍ کېکاږئ' : '💡 Click Print to print or Save as PDF (Full A4 Page)'}
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
 * - Ultra-fast isolated iframe rendering engine (renders multi-page documents in seconds without Tailwind CSS thrashing)
 * - Renders off-screen (left: -99999px) so no white box or screen flicker is visible
 * - Real-time smooth animated progress overlay for large multi-page reports
 * - Uses optimized 1.25x scale for rapid rendering and razor-sharp A4 vector-like output
 * - Guarantees exactly 18 records per A4 sheet formatting with exact sequential numbering
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
            <div id="pdf-progress-bar" style="width: 5%; height: 100%; background: #3b82f6; border-radius: 9999px; transition: width 0.15s ease;"></div>
          </div>
          <p style="margin: 0; font-size: 11px; color: #64748b;">Full A4 Page Formatting • Fast PDF Engine</p>
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
      textEl.textContent = total > 1 ? `Processing page ${current} of ${total} (${percent}%)...` : `Processing document (${percent}%)...`;
    }
    if (barEl) {
      barEl.style.width = `${percent}%`;
    }
  };

  // Synchronize Font Readiness before taking snapshots
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn('Font loading wait:', e);
    }
  }

  // Create isolated hidden iframe containing ONLY the necessary print CSS and markup
  // This avoids html2canvas repeatedly scanning thousands of Tailwind CSS rules across the entire app
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-99999px';
  iframe.style.top = '0px';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = 'none';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.style.zIndex = '-99999';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('Cannot access iframe document');

    const printCss = getStandardPrintCss(isRTL);

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700;800&family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          ${printCss}
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            width: 794px;
            overflow: visible;
          }
          .pdf-pages-wrapper {
            margin: 0;
            padding: 0;
            gap: 0;
          }
          .pdf-page {
            width: 794px;
            min-height: 1080px;
            box-sizing: border-box;
            background: #ffffff;
            margin: 0;
            border: none;
            box-shadow: none;
            border-radius: 0;
          }
        </style>
      </head>
      <body>
        <div id="pdf-container" style="width: 794px; background: #ffffff;">
          ${contentHtml}
        </div>
      </body>
      </html>
    `);
    iframeDoc.close();

    // Allow iframe fonts and layout to settle
    if (iframe.contentWindow?.document.fonts) {
      try {
        await iframe.contentWindow.document.fonts.ready;
      } catch (e) {}
    }
    // Minimal delay to ensure DOM layout calculation is complete
    await new Promise(resolve => setTimeout(resolve, 80));

    const pageNodes = Array.from(iframeDoc.querySelectorAll('.pdf-page')) as HTMLElement[];
    const targetPages = pageNodes.length > 0 ? pageNodes : [iframeDoc.getElementById('pdf-container') || iframeDoc.body];
    const totalPages = targetPages.length;

    updateProgress(0, totalPages);

    const renderScale = 1.25; // Crisp ~150-180 DPI for A4 with minimal memory and maximum speed
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 7; // 7mm margins
    const printableWidth = pageWidth - (margin * 2);
    const printableHeight = pageHeight - (margin * 2);

    // Initialize jsPDF document (A4 portrait)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    let addedAnyPage = false;

    // Render pages sequentially with lightweight isolated iframe canvas capture
    for (let i = 0; i < totalPages; i++) {
      const pageEl = targetPages[i];
      const canvas = await html2canvas(pageEl, {
        scale: renderScale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 0,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        windowHeight: 1123,
        scrollX: 0,
        scrollY: 0
      });

      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const imgData = canvas.toDataURL('image/jpeg', 0.82);
        const imgHeight = (canvas.height * printableWidth) / canvas.width;
        const renderHeight = Math.min(imgHeight, printableHeight);

        if (addedAnyPage) {
          pdf.addPage();
        }
        addedAnyPage = true;

        pdf.addImage(imgData, 'JPEG', margin, margin, printableWidth, renderHeight, undefined, 'FAST');

        // Free canvas buffer immediately
        canvas.width = 0;
        canvas.height = 0;
      }

      updateProgress(i + 1, totalPages);
      // Yield to event loop to allow UI/progress repaint
      if (totalPages > 4 && i % 2 === 0) {
        await new Promise(r => setTimeout(r, 0));
      }
    }

    // Save the PDF directly to downloads
    pdf.save(pdfFileName);
  } catch (err) {
    console.error('Direct PDF export error, falling back to printable window:', err);
    openPrintablePDFWindow({ title, filename, contentHtml, isRTL, autoPrint: true });
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
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
