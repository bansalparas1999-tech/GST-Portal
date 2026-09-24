import { InvoiceRecord, ReconItem } from '../types';

export interface MonthConfig {
  key: string; // '04', '05', ... '03', 'ALL'
  label: string; // 'April', 'May', ...
  short: string; // 'Apr', 'May', ...
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Annual';
  order: number; // 0 to 12
}

export const FINANCIAL_YEARS = [
  'FY 2026-27',
  'FY 2025-26',
  'FY 2024-25',
  'FY 2023-24',
  'FY 2022-23',
  'FY 2021-22',
  'FY 2020-21',
  'FY 2019-20',
  'FY 2018-19',
  'FY 2017-18',
];

// Indian GST Fiscal Year Order: April (04) to March (03)
export const GST_MONTHS: MonthConfig[] = [
  { key: 'ALL', label: 'All Months (Full FY)', short: 'Full FY', quarter: 'Annual', order: 0 },
  { key: '04', label: 'April', short: 'Apr', quarter: 'Q1', order: 1 },
  { key: '05', label: 'May', short: 'May', quarter: 'Q1', order: 2 },
  { key: '06', label: 'June', short: 'Jun', quarter: 'Q1', order: 3 },
  { key: '07', label: 'July', short: 'Jul', quarter: 'Q2', order: 4 },
  { key: '08', label: 'August', short: 'Aug', quarter: 'Q2', order: 5 },
  { key: '09', label: 'September', short: 'Sep', quarter: 'Q2', order: 6 },
  { key: '10', label: 'October', short: 'Oct', quarter: 'Q3', order: 7 },
  { key: '11', label: 'November', short: 'Nov', quarter: 'Q3', order: 8 },
  { key: '12', label: 'December', short: 'Dec', quarter: 'Q3', order: 9 },
  { key: '01', label: 'January', short: 'Jan', quarter: 'Q4', order: 10 },
  { key: '02', label: 'February', short: 'Feb', quarter: 'Q4', order: 11 },
  { key: '03', label: 'March', short: 'Mar', quarter: 'Q4', order: 12 },
];

/**
 * Parses date string (YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY) and extracts two-digit month (01-12)
 */
export function extractInvoiceMonth(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parts = clean.split('-');
    return parts[1] || '';
  }
  
  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(clean)) {
    const separator = clean.includes('/') ? '/' : '-';
    const parts = clean.split(separator);
    const m = parseInt(parts[1], 10);
    if (!isNaN(m) && m >= 1 && m <= 12) {
      return m < 10 ? `0${m}` : `${m}`;
    }
  }

  // Month names like "Oct", "October"
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const lower = clean.toLowerCase();
  for (let i = 0; i < months.length; i++) {
    if (lower.includes(months[i])) {
      const m = i + 1;
      return m < 10 ? `0${m}` : `${m}`;
    }
  }

  return '';
}

/**
 * Calculates GST Financial Year string (e.g. 'FY 2024-25') based on date
 */
export function extractInvoiceFY(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  let year = 0;
  let month = 0;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const parts = clean.split('-');
    year = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
  } else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(clean)) {
    const sep = clean.includes('/') ? '/' : '-';
    const parts = clean.split(sep);
    month = parseInt(parts[1], 10);
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    year = y;
  }

  if (year >= 2015 && month >= 1 && month <= 12) {
    if (month >= 4) {
      // e.g. Oct 2024 -> FY 2024-25
      const nextY = (year + 1) % 100;
      return `FY ${year}-${nextY < 10 ? '0' + nextY : nextY}`;
    } else {
      // e.g. Feb 2025 -> FY 2024-25
      const prevY = year - 1;
      const curY = year % 100;
      return `FY ${prevY}-${curY < 10 ? '0' + curY : curY}`;
    }
  }

  return '';
}

export function getMonthLabel(key: string): string {
  const m = GST_MONTHS.find((item) => item.key === key);
  return m ? m.label : key;
}

export function getMonthShort(key: string): string {
  const m = GST_MONTHS.find((item) => item.key === key);
  return m ? m.short : key;
}

/**
 * Normalizes any date or period string to 6-digit MMYYYY (e.g. '022022', '2022-02', '14/02/2022' -> '022022')
 */
export function normalizePeriodToMMYYYY(val?: string): string {
  if (!val) return '';
  const clean = val.trim();

  // Already 6-digit MMYYYY
  if (/^\d{6}$/.test(clean)) {
    const m = parseInt(clean.slice(0, 2), 10);
    const y = parseInt(clean.slice(2), 10);
    if (m >= 1 && m <= 12 && y >= 2015 && y <= 2035) {
      return clean;
    }
  }

  // YYYY-MM or YYYY-MM-DD
  if (/^\d{4}-\d{2}/.test(clean)) {
    const parts = clean.split('-');
    const y = parts[0];
    const m = parts[1];
    return `${m}${y}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(clean)) {
    const sep = clean.includes('/') ? '/' : '-';
    const parts = clean.split(sep);
    const m = parseInt(parts[1], 10);
    const y = parts[2];
    const mm = m < 10 ? `0${m}` : `${m}`;
    return `${mm}${y}`;
  }

  // Month-Year like "02/2022" or "02-2022"
  if (/^\d{1,2}[/-]\d{4}$/.test(clean)) {
    const sep = clean.includes('/') ? '/' : '-';
    const parts = clean.split(sep);
    const m = parseInt(parts[0], 10);
    const y = parts[1];
    const mm = m < 10 ? `0${m}` : `${m}`;
    return `${mm}${y}`;
  }

  return '';
}

/**
 * Computes a numeric comparison score for MMYYYY (year * 100 + month, e.g. '022022' -> 202202)
 */
export function mmyyyyToScore(mmyyyy?: string): number {
  if (!mmyyyy) return 0;
  const normalized = normalizePeriodToMMYYYY(mmyyyy);
  if (normalized.length === 6) {
    const m = parseInt(normalized.slice(0, 2), 10);
    const y = parseInt(normalized.slice(2), 10);
    return y * 100 + m;
  }
  return 0;
}

/**
 * Converts numeric score (e.g. 202202) back to MMYYYY ('022022')
 */
export function scoreToMMYYYY(score: number): string {
  if (!score || score < 201501) return '';
  const y = Math.floor(score / 100);
  const m = score % 100;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${mm}${y}`;
}

/**
 * Formats MMYYYY into a friendly human-readable label (e.g. '022022' -> 'Feb 2022 (022022)')
 */
export function formatMMYYYYLabel(mmyyyy?: string): string {
  if (!mmyyyy) return 'All Periods';
  const normalized = normalizePeriodToMMYYYY(mmyyyy);
  if (normalized.length !== 6) return mmyyyy;
  const m = normalized.slice(0, 2);
  const y = normalized.slice(2);
  const monthName = getMonthShort(m);
  return `${monthName} ${y} (${normalized})`;
}

/**
 * Extracts 6-digit MMYYYY period from an InvoiceRecord
 */
export function extractRecordPeriodMMYYYY(rec: InvoiceRecord): string {
  if (rec.taxPeriod) {
    const fromTaxPeriod = normalizePeriodToMMYYYY(rec.taxPeriod);
    if (fromTaxPeriod) return fromTaxPeriod;
  }
  if (rec.invoiceDate) {
    const fromDate = normalizePeriodToMMYYYY(rec.invoiceDate);
    if (fromDate) return fromDate;
  }
  return '';
}

/**
 * Checks if a period (or invoice record) falls in the range [fromMMYYYY, toMMYYYY]
 */
export function isPeriodInMMYYYYRange(
  recordPeriodOrRecord: string | InvoiceRecord,
  fromMMYYYY?: string,
  toMMYYYY?: string
): boolean {
  const period =
    typeof recordPeriodOrRecord === 'string'
      ? normalizePeriodToMMYYYY(recordPeriodOrRecord)
      : extractRecordPeriodMMYYYY(recordPeriodOrRecord);

  if (!period) return true; // If no date/period is provided, keep to prevent data loss

  const recordScore = mmyyyyToScore(period);
  const fromScore = fromMMYYYY ? mmyyyyToScore(fromMMYYYY) : 0;
  const toScore = toMMYYYY ? mmyyyyToScore(toMMYYYY) : 999999;

  if (fromScore > 0 && recordScore < fromScore) return false;
  if (toScore > 0 && recordScore > toScore) return false;

  return true;
}

/**
 * Filters invoices by a manual MMYYYY period range (e.g. '022022' to '022026')
 */
export function filterRecordsByPeriodRange(
  records: InvoiceRecord[],
  fromMMYYYY?: string,
  toMMYYYY?: string
): InvoiceRecord[] {
  if (!records || records.length === 0) return [];
  if (!fromMMYYYY && !toMMYYYY) return records;

  return records.filter((rec) => isPeriodInMMYYYYRange(rec, fromMMYYYY, toMMYYYY));
}

export interface PeriodOption {
  code: string; // e.g. '022022'
  label: string; // e.g. 'Feb 2022 (022022)'
  month: number;
  year: number;
  fy: string;
}

/**
 * Generates an ordered list of all GST filing periods between start and end (e.g. '022022' to '022026')
 */
export function generatePeriodOptions(
  startMMYYYY: string = '022022',
  endMMYYYY: string = '022026'
): PeriodOption[] {
  const startScore = mmyyyyToScore(startMMYYYY) || 202202;
  const endScore = mmyyyyToScore(endMMYYYY) || 202602;

  const minScore = Math.min(startScore, endScore);
  const maxScore = Math.max(startScore, endScore);

  const startYear = Math.floor(minScore / 100);
  const startMonth = minScore % 100;
  const endYear = Math.floor(maxScore / 100);
  const endMonth = maxScore % 100;

  const options: PeriodOption[] = [];

  let curY = startYear;
  let curM = startMonth;

  while (curY < endYear || (curY === endYear && curM <= endMonth)) {
    const mm = curM < 10 ? `0${curM}` : `${curM}`;
    const code = `${mm}${curY}`;
    const monthName = getMonthShort(mm);
    const fy = curM >= 4 ? `FY ${curY}-${String(curY + 1).slice(-2)}` : `FY ${curY - 1}-${String(curY).slice(-2)}`;

    options.push({
      code,
      label: `${monthName} ${curY} (${code})`,
      month: curM,
      year: curY,
      fy,
    });

    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }

  return options;
}

/**
 * Common pre-set period ranges for quick 1-click selection
 */
export const PERIOD_PRESETS = [
  {
    id: 'user-prompt-range',
    name: 'Feb 2022 to Feb 2026 (022022 - 022026)',
    from: '022022',
    to: '022026',
    description: 'Statutory 4-Year Full Multi-Cycle Audit as requested',
  },
  {
    id: 'fy-24-25',
    name: 'FY 2024-25 (042024 - 032025)',
    from: '042024',
    to: '032025',
    description: 'Current Assessment Financial Year',
  },
  {
    id: 'fy-23-24',
    name: 'FY 2023-24 (042023 - 032024)',
    from: '042023',
    to: '032024',
    description: 'Previous Assessment Financial Year',
  },
  {
    id: 'fy-22-23',
    name: 'FY 2022-23 (042022 - 032023)',
    from: '042022',
    to: '032023',
    description: 'Historical Audit Year',
  },
  {
    id: 'last-12-months',
    name: 'Last 12 Filing Months (032025 - 022026)',
    from: '032025',
    to: '022026',
    description: 'Trailing 1-Year Cycle',
  },
  {
    id: 'all-time',
    name: 'All Historical Periods (072017 - 032027)',
    from: '072017',
    to: '032027',
    description: 'Complete GST regime inception to date',
  },
];

/**
 * Filters invoices by Financial Year and Month
 */
export function filterInvoicesByPeriod(
  records: InvoiceRecord[],
  selectedFY: string,
  selectedMonth: string
): InvoiceRecord[] {
  if (!records || records.length === 0) return [];
  
  return records.filter((rec) => {
    // If invoice explicitly has financialYear property, check match
    if (rec.financialYear && rec.financialYear !== selectedFY) {
      return false;
    } else if (!rec.financialYear && rec.invoiceDate) {
      const derivedFY = extractInvoiceFY(rec.invoiceDate);
      if (derivedFY && derivedFY !== selectedFY) {
        return false;
      }
    }

    // Month filtering
    if (selectedMonth !== 'ALL') {
      if (rec.taxPeriod) {
        // e.g. '10' or '2024-10'
        if (!rec.taxPeriod.endsWith(selectedMonth)) {
          return false;
        }
      } else if (rec.invoiceDate) {
        const derivedM = extractInvoiceMonth(rec.invoiceDate);
        if (derivedM && derivedM !== selectedMonth) {
          return false;
        }
      }
    }

    return true;
  });
}

export interface MonthlyStats {
  monthKey: string;
  monthLabel: string;
  monthShort: string;
  quarter: string;
  totalInvoices: number;
  booksCount: number;
  gstr2bCount: number;
  matchedCount: number;
  missing2bCount: number;
  mismatchCount: number;
  itcAtRisk: number;
  matchedTax: number;
  isCurrent: boolean;
}

/**
 * Generates month-wise breakdown summary for all 12 fiscal months of a given FY
 */
export function getMonthlyBreakdown(
  items: ReconItem[],
  selectedFY: string,
  currentMonth: string
): MonthlyStats[] {
  const statsList: MonthlyStats[] = [];

  for (const m of GST_MONTHS) {
    if (m.key === 'ALL') continue;

    const monthItems = items.filter((item) => {
      const date = item.booksRecord?.invoiceDate || item.gstr2bRecord?.invoiceDate;
      const recM =
        item.booksRecord?.taxPeriod ||
        item.gstr2bRecord?.taxPeriod ||
        extractInvoiceMonth(date);
      return recM === m.key || (recM && recM.endsWith(m.key));
    });

    const booksCount = monthItems.filter((i) => i.booksRecord).length;
    const gstr2bCount = monthItems.filter((i) => i.gstr2bRecord).length;
    const matchedCount = monthItems.filter((i) => i.matchStatus === 'EXACT_MATCH').length;
    const missing2bCount = monthItems.filter((i) => i.matchStatus === 'MISSING_IN_2B').length;
    const mismatchCount = monthItems.filter(
      (i) => i.matchStatus === 'VALUE_MISMATCH' || i.matchStatus === 'HEAD_MISMATCH' || i.matchStatus === 'SIGNIFICANT_DISCREPANCY'
    ).length;
    const itcAtRisk = monthItems
      .filter((i) => i.matchStatus === 'MISSING_IN_2B')
      .reduce((acc, i) => acc + (i.booksRecord?.totalTax || 0), 0);
    const matchedTax = monthItems
      .filter((i) => i.matchStatus === 'EXACT_MATCH')
      .reduce((acc, i) => acc + (i.booksRecord?.totalTax || i.gstr2bRecord?.totalTax || 0), 0);

    statsList.push({
      monthKey: m.key,
      monthLabel: m.label,
      monthShort: m.short,
      quarter: m.quarter,
      totalInvoices: monthItems.length,
      booksCount,
      gstr2bCount,
      matchedCount,
      missing2bCount,
      mismatchCount,
      itcAtRisk,
      matchedTax,
      isCurrent: currentMonth === m.key,
    });
  }

  return statsList;
}
