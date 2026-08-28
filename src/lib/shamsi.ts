import { toJalaali, toGregorian, jalaaliMonthLength } from 'jalaali-js';

export const AFGHAN_MONTHS = {
  en: [
    'Hamal', 'Sawar', 'Jawza', 'Saratan', 'Asad', 'Sunbula',
    'Mizan', 'Aqrab', 'Qaws', 'Jadi', 'Dalwa', 'Hoot'
  ],
  ps: [
    'وری', 'غوایی', 'غبرګولی', 'چنګاښ', 'زمریا', 'وږی',
    'تله', 'لړم', 'لیندۍ', 'مرغومی', 'سلواغه', 'کبا'
  ],
  dr: [
    'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
    'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'
  ]
};

export interface ShamsiDate {
  jy: number; // Jalali Year (e.g., 1403, 1405)
  jm: number; // Jalali Month (1-12)
  jd: number; // Jalali Day (1-31)
}

/**
 * Converts a Gregorian Date, ISO string, or timestamp into a Solar Hijri (Shamsi) date object.
 */
export function gregorianToShamsi(dateInput?: Date | string | number | null): ShamsiDate {
  let d: Date;
  if (!dateInput) {
    d = new Date();
  } else if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    d = new Date(dateInput);
  } else {
    d = dateInput;
  }

  if (isNaN(d.getTime())) {
    d = new Date();
  }

  const gy = d.getFullYear();
  const gm = d.getMonth() + 1;
  const gd = d.getDate();

  const j = toJalaali(gy, gm, gd);
  return { jy: j.jy, jm: j.jm, jd: j.jd };
}

/**
 * Converts a Solar Hijri (Shamsi) date to a Gregorian Date object.
 */
export function shamsiToGregorian(jy: number, jm: number, jd: number): Date {
  const safeJy = Math.max(1300, Math.min(1500, jy || 1403));
  const safeJm = Math.max(1, Math.min(12, jm || 1));
  const safeJd = Math.max(1, Math.min(31, jd || 1));

  const g = toGregorian(safeJy, safeJm, safeJd);
  return new Date(g.gy, g.gm - 1, g.gd, 12, 0, 0); // Noon to avoid timezone boundary shifts
}

/**
 * Converts a Solar Hijri (Shamsi) date to a YYYY-MM-DD Gregorian string.
 */
export function shamsiToGregorianStr(jy: number, jm: number, jd: number): string {
  const gDate = shamsiToGregorian(jy, jm, jd);
  const yyyy = gDate.getFullYear();
  const mm = String(gDate.getMonth() + 1).padStart(2, '0');
  const dd = String(gDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formats a Gregorian date / string / Shamsi object into a Solar Hijri string.
 * Format types:
 * - 'YYYY/MM/DD': "1405/05/11"
 * - 'YYYY-MM-DD': "1405-05-11"
 * - 'full': "11 Asad 1405" or "۱۱ زمریا ۱۴۰۵" or "۱۱ اسد ۱۴۰۵"
 * - 'short': "11 Asad"
 */
export function formatShamsi(
  dateInput: Date | string | number | ShamsiDate | null | undefined,
  formatType: 'YYYY/MM/DD' | 'YYYY-MM-DD' | 'full' | 'short' = 'YYYY/MM/DD',
  lang: 'en' | 'ps' | 'dr' = 'en'
): string {
  if (!dateInput) return '';

  let shamsi: ShamsiDate;
  if (typeof dateInput === 'object' && 'jy' in dateInput && 'jm' in dateInput && 'jd' in dateInput) {
    shamsi = dateInput as ShamsiDate;
  } else {
    shamsi = gregorianToShamsi(dateInput as Date | string | number);
  }

  const { jy, jm, jd } = shamsi;
  const monthName = (AFGHAN_MONTHS[lang] || AFGHAN_MONTHS.en)[jm - 1] || AFGHAN_MONTHS.en[jm - 1];

  const jyStr = String(jy);
  const jmStr = String(jm).padStart(2, '0');
  const jdStr = String(jd).padStart(2, '0');

  if (formatType === 'YYYY/MM/DD') {
    return `${jyStr}/${jmStr}/${jdStr}`;
  } else if (formatType === 'YYYY-MM-DD') {
    return `${jyStr}-${jmStr}-${jdStr}`;
  } else if (formatType === 'short') {
    return `${jd} ${monthName}`;
  } else {
    // 'full'
    return `${jd} ${monthName} ${jy}`;
  }
}

/**
 * Parses a string formatted as "YYYY/MM/DD" or "YYYY-MM-DD" in Shamsi.
 */
export function parseShamsiStr(shamsiStr: string): ShamsiDate | null {
  if (!shamsiStr) return null;
  const cleaned = shamsiStr.trim().replace(/\//g, '-');
  const parts = cleaned.split('-');
  if (parts.length === 3) {
    const jy = parseInt(parts[0], 10);
    const jm = parseInt(parts[1], 10);
    const jd = parseInt(parts[2], 10);
    if (!isNaN(jy) && !isNaN(jm) && !isNaN(jd)) {
      return { jy, jm, jd };
    }
  }
  return null;
}

/**
 * Get current today in Shamsi
 */
export function getTodayShamsi(): ShamsiDate & { shamsiStr: string; gregStr: string } {
  const now = new Date();
  const shamsi = gregorianToShamsi(now);
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const gregStr = `${yyyy}-${mm}-${dd}`;
  const shamsiStr = formatShamsi(shamsi, 'YYYY/MM/DD');

  return { ...shamsi, shamsiStr, gregStr };
}

/**
 * Get start of current week in Shamsi (Saturday is start of week in Afghanistan)
 */
export function getShamsiStartOfWeek(date: Date = new Date()): string {
  // Saturday in AFG is day 6 in JS Date (0=Sun, 1=Mon, ..., 6=Sat)
  const d = new Date(date);
  const day = d.getDay(); // 0 is Sunday, 6 is Saturday
  // Distance back to Saturday: if day is 6, diff is 0; if 0 (Sun), diff is 1; if 1 (Mon), diff is 2, etc.
  const diff = (day + 1) % 7;
  d.setDate(d.getDate() - diff);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Get start of current Shamsi month (1st day of month in Shamsi)
 */
export function getShamsiStartOfMonth(date: Date = new Date()): string {
  const shamsi = gregorianToShamsi(date);
  return shamsiToGregorianStr(shamsi.jy, shamsi.jm, 1);
}

/**
 * Get start of current Shamsi year (1st Hamal)
 */
export function getShamsiStartOfYear(date: Date = new Date()): string {
  const shamsi = gregorianToShamsi(date);
  return shamsiToGregorianStr(shamsi.jy, 1, 1);
}

/**
 * Get number of days in a given Shamsi month
 */
export function getShamsiMonthDays(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm);
}

/**
 * Normalizes any date string (Shamsi or Gregorian, ISO or YYYY/MM/DD) to YYYY-MM-DD Gregorian string
 */
export function normalizeDateToGregorian(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim().split('T')[0];
  if (!clean) return '';

  // Check if Shamsi (starts with 13xx or 14xx)
  if (clean.startsWith('13') || clean.startsWith('14')) {
    const parsed = parseShamsiStr(clean);
    if (parsed) {
      return shamsiToGregorianStr(parsed.jy, parsed.jm, parsed.jd);
    }
  }

  // Handle YYYY-MM-DD or YYYY/MM/DD
  const normalized = clean.replace(/\//g, '-');
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const yyyy = match[1];
    const mm = match[2].padStart(2, '0');
    const dd = match[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Fallback Date object parsing
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return clean;
}

/**
 * Checks if a given item date falls within startStr and endStr (supports both Shamsi and Gregorian inputs)
 */
export function isDateInRange(itemDateStr?: string, startStr?: string, endStr?: string): boolean {
  if (!itemDateStr) return false;
  const itemGreg = normalizeDateToGregorian(itemDateStr);
  if (!itemGreg) return false;

  const startGreg = normalizeDateToGregorian(startStr);
  const endGreg = normalizeDateToGregorian(endStr);

  if (startGreg && itemGreg < startGreg) return false;
  if (endGreg && itemGreg > endGreg) return false;
  return true;
}

/**
 * Formats a date into both Solar Hijri (Shamsi) and Gregorian date formats.
 * Returns { shamsi, gregorian, combined }
 */
export function formatDualDate(
  dateInput: Date | string | number | null | undefined,
  lang: 'en' | 'ps' | 'dr' = 'en'
): { shamsi: string; gregorian: string; combined: string } {
  if (!dateInput) return { shamsi: '', gregorian: '', combined: '' };
  let d: Date;
  if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    d = new Date(dateInput);
  } else {
    d = dateInput;
  }
  if (isNaN(d.getTime())) return { shamsi: '', gregorian: '', combined: '' };

  const shamsiStr = formatShamsi(d, 'YYYY/MM/DD', lang);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const gregStr = `${yyyy}-${mm}-${dd}`;

  return {
    shamsi: shamsiStr,
    gregorian: gregStr,
    combined: `${shamsiStr} (${gregStr})`
  };
}
