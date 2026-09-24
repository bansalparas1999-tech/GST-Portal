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
