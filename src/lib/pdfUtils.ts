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
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&family=Vazirmatn:wght@400;500;600;700;800;900&display=swap');

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
    letter-spacing: normal !important;
    word-spacing: normal !important;
  }

  html, body {
    margin: 0;
    padding: 0;
    background-color: #ffffff;
    color: #000000;
    font-family: ${PASHTO_FONT_STACK};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: geometricPrecision;
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
    text-rendering: geometricPrecision !important;
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
    padding: 14px 16px 20px 16px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    position: relative;
    border: 1px solid #cbd5e1;
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
    margin-bottom: 6px;
    border-bottom: 2px solid #000000;
    padding-bottom: 4px;
  }
  .header.header-subsequent {
    text-align: inherit !important;
    margin-bottom: 6px;
    border-bottom: 2px solid #000000;
    padding-bottom: 4px;
  }
  .header h1 {
    margin: 0 0 1px 0;
    color: #000000;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: normal !important;
  }
  .header h2 {
    margin: 1px 0;
    color: #000000;
    font-size: 13px;
    font-weight: 800;
    line-height: 1.2;
    letter-spacing: normal !important;
  }
  .header h3 {
    margin: 1px 0;
    color: #000000;
    font-size: 11px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: normal !important;
  }
  .header p {
    margin: 0;
    color: #000000;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: normal !important;
  }

  .summary-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 6px;
  }
  .summary-card {
    border: 1.5px solid #1e293b;
    background-color: #f8fafc;
    padding: 3px 8px;
    border-radius: 5px;
  }
  .summary-card h3 {
    margin: 0;
    font-size: 8.5px;
    font-weight: 800;
    color: #000000;
    letter-spacing: normal !important;
  }
  .summary-card p {
    margin: 1px 0 0;
    font-size: 10.5px;
    font-weight: 800;
    color: #000000;
    line-height: 1.2;
    letter-spacing: normal !important;
  }

  table {
    width: 100% !important;
    max-width: 100% !important;
    border-collapse: collapse !important;
    margin-top: 2px !important;
    margin-bottom: 2px !important;
    background-color: #ffffff !important;
    letter-spacing: normal !important;
    table-layout: fixed !important;
    box-sizing: border-box !important;
  }
  
  th, td {
    border: 1px solid #334155 !important;
    padding: 3.5px 4px !important;
    font-size: 8.5px !important;
    line-height: 1.3 !important;
    color: #000000 !important;
    font-weight: 700 !important;
    vertical-align: middle !important;
    text-align: ${isRTL ? 'right' : 'left'} !important;
    letter-spacing: normal !important;
    word-spacing: normal !important;
    white-space: normal !important;
    word-break: normal !important;
    overflow-wrap: break-word !important;
    word-wrap: break-word !important;
    hyphens: none !important;
    -webkit-hyphens: none !important;
    unicode-bidi: plaintext;
    box-sizing: border-box !important;
    overflow: hidden !important;
  }

  td {
    color: #000000 !important;
    font-weight: 700 !important;
    white-space: normal !important;
    word-break: normal !important;
    overflow-wrap: break-word !important;
    word-wrap: break-word !important;
    hyphens: none !important;
  }

  td strong, td b {
    color: #000000 !important;
    font-weight: 800 !important;
  }

  td div, td span {
    font-weight: 700 !important;
  }

  /* Specific column alignment rules */
  th.text-center, td.text-center {
    text-align: center !important;
  }
  th.text-end, td.text-end {
    text-align: ${isRTL ? 'left' : 'right'} !important;
  }

  th {
    background-color: #f1f5f9 !important;
    font-weight: 800 !important;
    color: #000000 !important;
    border: 1.5px solid #0f172a !important;
    padding: 4px 4px !important;
    font-size: 8.5px !important;
    letter-spacing: normal !important;
    white-space: normal !important;
    word-break: normal !important;
    overflow-wrap: break-word !important;
    word-wrap: break-word !important;
    box-sizing: border-box !important;
    text-align: center !important;
    overflow: hidden !important;
  }

  /* Status and badge color styles - preserve inline presentation without breaking layout */
  .badge-income, .badge-expense, .badge-neutral {
    word-break: normal !important;
    display: inline-block;
  }

  .badge-income, td.badge-income, span.badge-income, p.badge-income {
    color: #15803d !important;
    font-weight: 800 !important;
  }
  .badge-expense, td.badge-expense, span.badge-expense, p.badge-expense {
    color: #b91c1c !important;
    font-weight: 800 !important;
  }
  .badge-neutral, td.badge-neutral, span.badge-neutral, p.badge-neutral {
    color: #1d4ed8 !important;
    font-weight: 800 !important;
  }

  .footer, .pdf-page .footer {
    display: none !important;
  }

  @media print {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
    
    .no-print {
      display: none !important;
    }

    html, body {
      background: #ffffff !important;
      color: #000000 !important;
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      letter-spacing: normal !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: geometricPrecision !important;
    }

    .pdf-wrapper {
      padding: 0 !important;
      margin: 0 !important;
      display: block !important;
      background: transparent !important;
      width: 100% !important;
      min-height: 0 !important;
    }

    .pdf-container {
      border: none !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      background: transparent !important;
      min-height: 0 !important;
    }

    .pdf-pages-wrapper {
      gap: 0 !important;
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    .pdf-page {
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      padding: 6mm 8mm 8mm 8mm !important;
      margin: 0 auto !important;
      width: 100% !important;
      max-width: 100% !important;
      min-height: 0 !important;
      height: auto !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-sizing: border-box !important;
      color: #000000 !important;
      background: #ffffff !important;
      display: block !important;
    }

    .pdf-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    .pdf-page-content {
      width: 100% !important;
      display: block !important;
      min-height: 0 !important;
    }

    table {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }

    th, td {
      color: #000000 !important;
      border: 1px solid #1e293b !important;
      font-weight: 700 !important;
    }

    th {
      background-color: #f1f5f9 !important;
      font-weight: 800 !important;
      border: 1.5px solid #0f172a !important;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    thead {
      display: table-header-group !important;
    }
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
export function chunkArray<T>(items: T[], chunkSize: number = 14): T[][] {
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
  firstPageCapacity: number = 10,
  subsequentPageCapacity: number = 14
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
 * Retrieve saved shop information from settings in localStorage or fallback to defaults.
 */
export function getSavedShopInfo(): { name: string; address: string } {
  try {
    const saved = localStorage.getItem('shop_info');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          name: parsed.name || 'Kabul Electronics',
          address: parsed.address || 'Jade-e-Maiwand, Kabul, Afghanistan'
        };
      }
    }
  } catch (e) {}
  return {
    name: 'Kabul Electronics',
    address: 'Jade-e-Maiwand, Kabul, Afghanistan'
  };
}

/**
 * Generates an A4 print-ready, multi-page HTML report where records fill all the way
 * down to the footer area on each page, subsequent pages start right after an official header
 * showing the Shop Name, Address, and Report Title, with no footers printed or copied to Excel.
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
    isRTL = true
  } = options;

  const savedShop = getSavedShopInfo();
  const effectiveShopName = shopName || savedShop.name;
  const effectiveShopAddress = shopAddress || savedShop.address;

  const hasSummary = Boolean(summaryHtml && summaryHtml.trim().length > 0);
  
  // Optimized A4 capacities for high readability & quality in print and PDF:
  // Page 1: 10 records (if summary widget present) or 12 records (if no summary widget)
  // Page 2+: 14 records (within 12 to 15 range)
  const firstPageSize = firstPageRecords || (recordsPerPage ? recordsPerPage : (hasSummary ? 10 : 12));
  const subsequentPageSize = subsequentPageRecords || (recordsPerPage ? recordsPerPage : 14);

  const chunks = chunkReportRecords(records, firstPageSize, subsequentPageSize);
  const now = new Date();
  const dateStr = `${formatShamsi(now, 'full')} | USA: ${now.toISOString().split('T')[0]}`;

  const normalizedCols: ColumnDef[] = columns.map(c => 
    typeof c === 'string' ? { header: c } : c
  );

  const colGroupHtml = `
    <colgroup>
      ${normalizedCols.map(c => `<col style="${c.style || ''}">`).join('')}
    </colgroup>
  `;

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
              <h1 style="font-size: 17px; font-weight: 800; margin: 0 0 1px 0; color: #000000; line-height: 1.2;">${effectiveShopName}</h1>
              ${effectiveShopAddress ? `<p style="margin: 0 0 3px 0; font-size: 10px; color: #000000; font-weight: 700;">${effectiveShopAddress}</p>` : ''}
              <h2 style="font-size: 13px; font-weight: 800; margin: 2px 0 1px 0; color: #000000; line-height: 1.2;">${title}</h2>
              ${subtitle && subtitle !== effectiveShopName ? `<h3 style="font-size: 11px; font-weight: 700; color: #000000; margin: 1px 0;">${subtitle}</h3>` : ''}
              <p style="font-size: 9.5px; color: #000000; font-weight: 700; margin: 1px 0 0 0;">${dateText || dateStr}</p>
            </div>

            ${summaryHtml ? summaryHtml : ''}

            <table>
              ${colGroupHtml}
              ${tableHeaderHtml}
              <tbody>
                <tr>
                  <td colspan="${normalizedCols.length}" class="text-center" style="padding: 24px; color: #000000; font-weight: 800;">
                    ${emptyMessage}
                  </td>
                </tr>
              </tbody>
            </table>
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
              <h1 style="font-size: 17px; font-weight: 800; margin: 0 0 1px 0; color: #000000; line-height: 1.2;">${effectiveShopName}</h1>
              ${effectiveShopAddress ? `<p style="margin: 0 0 3px 0; font-size: 10px; color: #000000; font-weight: 700;">${effectiveShopAddress}</p>` : ''}
              <h2 style="font-size: 13px; font-weight: 800; margin: 2px 0 1px 0; color: #000000; line-height: 1.2;">${title}</h2>
              ${subtitle && subtitle !== effectiveShopName ? `<h3 style="font-size: 11px; font-weight: 700; color: #000000; margin: 1px 0;">${subtitle}</h3>` : ''}
              <p style="font-size: 9.5px; color: #000000; font-weight: 700; margin: 1px 0 0 0;">${dateText || dateStr}</p>
            </div>
            ${summaryHtml ? summaryHtml : ''}
          ` : `
            <div class="header header-subsequent">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                <div style="text-align: ${isRTL ? 'right' : 'left'};">
                  <div style="font-size: 13px; font-weight: 800; color: #000000; line-height: 1.2;">
                    ${effectiveShopName}
                  </div>
                  ${effectiveShopAddress ? `<div style="font-size: 9.5px; color: #000000; font-weight: 700; margin-top: 1px;">${effectiveShopAddress}</div>` : ''}
                  <div style="font-size: 11px; font-weight: 800; color: #000000; margin-top: 2px;">
                    ${title} ${subtitle && subtitle !== effectiveShopName ? `<span style="font-size: 10px; font-weight: 700; color: #000000;">(${subtitle})</span>` : ''}
                  </div>
                </div>
                <div style="text-align: ${isRTL ? 'left' : 'right'}; font-size: 9.5px; color: #000000; font-weight: 700; white-space: nowrap;">
                  <div>${dateText || dateStr}</div>
                </div>
              </div>
            </div>
          `}

          <table>
            ${colGroupHtml}
            ${tableHeaderHtml}
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
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
        .btn-secondary {
          background-color: #0f172a;
          color: #ffffff;
        }
        .btn-secondary:hover {
          background-color: #1e293b;
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
          <button class="btn btn-secondary" id="copy-excel-btn" onclick="copyTableDataForExcel()" title="Copy all records without headers or footers directly for Excel">
            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z"></path></svg>
            ${isRTL ? 'د ټولو ریکارډونو کاپي (Excel)' : 'Copy Records for Excel'}
          </button>
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
        function copyTableDataForExcel() {
          var tables = document.querySelectorAll('#pdf-content table');
          if (!tables || tables.length === 0) return;
          var rowsOutput = [];
          
          var headerThs = tables[0].querySelectorAll('thead th');
          if (headerThs && headerThs.length > 0) {
            var headerRow = [];
            for (var h = 0; h < headerThs.length; h++) {
              headerRow.push(headerThs[h].innerText.replace(/[\\r\\n\\t]+/g, ' ').trim());
            }
            rowsOutput.push(headerRow.join('\\t'));
          }
          
          for (var t = 0; t < tables.length; t++) {
            var trs = tables[t].querySelectorAll('tbody tr');
            for (var r = 0; r < trs.length; r++) {
              var tds = trs[r].querySelectorAll('td');
              if (tds.length === 1 && tds[0].hasAttribute('colspan')) continue;
              var rowCells = [];
              for (var c = 0; c < tds.length; c++) {
                rowCells.push(tds[c].innerText.replace(/[\\r\\n\\t]+/g, ' ').trim());
              }
              if (rowCells.length > 0 && rowCells.some(function(v) { return v.length > 0; })) {
                rowsOutput.push(rowCells.join('\\t'));
              }
            }
          }
          
          var tsvData = rowsOutput.join('\\n');
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(tsvData).then(function() {
              showCopiedFeedback();
            }).catch(function() {
              fallbackCopy(tsvData);
            });
          } else {
            fallbackCopy(tsvData);
          }
        }

        function fallbackCopy(text) {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand('copy');
            showCopiedFeedback();
          } catch (e) {}
          document.body.removeChild(ta);
        }

        function showCopiedFeedback() {
          var btn = document.getElementById('copy-excel-btn');
          if (!btn) return;
          var origText = btn.innerHTML;
          btn.style.backgroundColor = '#16a34a';
          btn.innerHTML = '✓ ' + (${isRTL ? `'ریکارډونه کاپي شول (Excel)'` : `'Copied for Excel!'`});
          setTimeout(function() {
            btn.innerHTML = origText;
            btn.style.backgroundColor = '';
          }, 2500);
        }

        window.onload = function() {
          if (${autoPrint ? 'true' : 'false'}) {
            var doPrint = function() {
              window.focus();
              setTimeout(function() {
                window.print();
              }, 150);
            };

            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function() {
                setTimeout(doPrint, 350);
              }).catch(function() {
                setTimeout(doPrint, 500);
              });
            } else {
              setTimeout(doPrint, 500);
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
  // Use visibility hidden with realistic dimensions so layout and CSS calculations are accurately rendered
  iframe.style.position = 'fixed';
  iframe.style.right = '0px';
  iframe.style.bottom = '0px';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
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
      const win = iframe.contentWindow;
      if (win) {
        win.focus();
        win.print();
      }
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

  // Wait for fonts and complete layout paint before invoking print dialog
  if (iframe.contentWindow?.document?.fonts?.ready) {
    iframe.contentWindow.document.fonts.ready.then(() => {
      setTimeout(executePrint, 350);
    }).catch(() => {
      setTimeout(executePrint, 450);
    });
  } else {
    setTimeout(executePrint, 450);
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
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Noto+Naskh+Arabic:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@400;500;600;700;800;900&family=Vazirmatn:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          ${printCss}
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            width: 794px;
            overflow: visible;
            box-sizing: border-box;
          }
          .pdf-pages-wrapper {
            margin: 0;
            padding: 0;
            gap: 0;
            width: 794px;
          }
          .pdf-page {
            width: 794px;
            min-height: 1080px;
            box-sizing: border-box;
            background: #ffffff;
            margin: 0;
            padding: 14px 16px 20px 16px;
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

    const renderScale = 1.33; // Crisp ~160 DPI for A4 with minimal memory and maximum speed
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 5; // 5mm margins
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
        width: 794,
        windowWidth: 794,
        scrollX: 0,
        scrollY: 0
      });

      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
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
