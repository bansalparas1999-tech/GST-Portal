import {
  InvoiceRecord,
  ReconItem,
  ReconSummary,
  ToleranceConfig,
  CustomMatchingRule,
  MatchingPresetType,
  ManualMatchPair,
  DiscrepancyDetail,
  DiscrepancySeverity,
  DiscrepancyCategory,
  DataSourceType,
} from '../types';
import { isMeeshoData, parseMeeshoRecords } from './ecommerceParser';
import { determineGstRate } from './gstr1Engine';

// ==========================================
// DEFAULT BUILT-IN RULES & PRESETS
// ==========================================

export const DEFAULT_MATCHING_RULES: CustomMatchingRule[] = [
  {
    id: 'rule-exact-match',
    name: 'Exact Statutory Match (Sec 16(2)(aa))',
    description: 'Matches exact GSTIN, exact normalized invoice number, and tax amounts within paise rounding threshold (±₹2.00).',
    enabled: true,
    priority: 1,
    stage: 'exact',
    conditions: {
      gstinMatch: 'exact',
      invoiceMatch: 'normalized',
      amountMatch: 'absolute_tolerance',
      amountToleranceValue: 2.0,
      taxToleranceValue: 1.5,
      dateToleranceDays: 30,
      ignoreLeadingZeros: true,
      ignoreSpecialChars: true,
      ignoreCase: true,
      ignoreCommonPrefixes: true,
    },
    assignStatus: 'EXACT_MATCH',
    confidence: 100,
    isBuiltIn: true,
  },
  {
    id: 'rule-partial-amount',
    name: 'Partial Value Match (Minor Rounding Difference)',
    description: 'Accepts minor commercial rounding differences within user-defined threshold (e.g. up to ±₹10.00 or 1%).',
    enabled: true,
    priority: 2,
    stage: 'partial_amount',
    conditions: {
      gstinMatch: 'exact',
      invoiceMatch: 'normalized',
      amountMatch: 'absolute_tolerance',
      amountToleranceValue: 10.0,
      amountTolerancePercent: 1.0,
      taxToleranceValue: 5.0,
      dateToleranceDays: 45,
      ignoreLeadingZeros: true,
      ignoreSpecialChars: true,
      ignoreCase: true,
    },
    assignStatus: 'PARTIAL_MATCH',
    confidence: 95,
    isBuiltIn: true,
  },
  {
    id: 'rule-fuzzy-invoice',
    name: 'Fuzzy Invoice Number Match (Typos & Slashes)',
    description: 'Auto-resolves invoice number formatting differences like / vs -, INV- prefixes, and typographical errors (Levenshtein distance ≤ 2).',
    enabled: true,
    priority: 3,
    stage: 'fuzzy_invoice',
    conditions: {
      gstinMatch: 'exact',
      invoiceMatch: 'fuzzy',
      invoiceFuzzyMaxDistance: 2,
      amountMatch: 'absolute_tolerance',
      amountToleranceValue: 5.0,
      taxToleranceValue: 2.5,
      dateToleranceDays: 60,
      ignoreLeadingZeros: true,
      ignoreSpecialChars: true,
      ignoreCase: true,
      ignoreCommonPrefixes: true,
    },
    assignStatus: 'FUZZY_MATCH',
    confidence: 90,
    isBuiltIn: true,
  },
  {
    id: 'rule-fuzzy-gstin',
    name: 'Fuzzy GSTIN & Multi-State PAN Match',
    description: 'Detects OCR/data-entry typos in GSTIN (1 char distance or 0 vs O, 1 vs I) or matches entities sharing the same 10-digit PAN.',
    enabled: true,
    priority: 4,
    stage: 'fuzzy_gstin',
    conditions: {
      gstinMatch: 'fuzzy',
      gstinFuzzyMaxDistance: 1,
      invoiceMatch: 'normalized',
      amountMatch: 'absolute_tolerance',
      amountToleranceValue: 2.0,
      taxToleranceValue: 1.5,
      dateToleranceDays: 30,
      ignoreLeadingZeros: true,
      ignoreSpecialChars: true,
      ignoreCase: true,
    },
    assignStatus: 'FUZZY_GSTIN_MATCH',
    confidence: 85,
    isBuiltIn: true,
  },
  {
    id: 'rule-head-mismatch',
    name: 'Tax Head POS Cross-Match (IGST vs CGST+SGST)',
    description: 'Matches records where total tax aligns but Place of Supply (POS) was booked under wrong tax head (IGST booked as CGST/SGST).',
    enabled: true,
    priority: 5,
    stage: 'head_pos',
    conditions: {
      gstinMatch: 'exact',
      invoiceMatch: 'normalized',
      amountMatch: 'absolute_tolerance',
      amountToleranceValue: 5.0,
      taxToleranceValue: 2.0,
      allowHeadMismatch: true,
      dateToleranceDays: 45,
      ignoreLeadingZeros: true,
      ignoreSpecialChars: true,
      ignoreCase: true,
    },
    assignStatus: 'HEAD_MISMATCH',
    confidence: 80,
    isBuiltIn: true,
  },
  {
    id: 'rule-significant-discrepancy',
    name: 'Significant Value Discrepancy Flag',
    description: 'Flags invoices matching on GSTIN and Invoice Number but with large tax variance (> ₹500 or > 5%) for CA manual review.',
    enabled: true,
    priority: 6,
    stage: 'custom',
    conditions: {
      gstinMatch: 'exact',
      invoiceMatch: 'normalized',
      amountMatch: 'any',
      dateToleranceDays: 90,
      ignoreLeadingZeros: true,
      ignoreSpecialChars: true,
      ignoreCase: true,
    },
    assignStatus: 'SIGNIFICANT_DISCREPANCY',
    confidence: 70,
    isBuiltIn: true,
  },
];

export const DEFAULT_TOLERANCE: ToleranceConfig = {
  preset: 'BALANCED_CA',
  valueTolerance: 2.0,
  taxTolerance: 1.5,
  percentageTolerance: 1.0,
  dateToleranceDays: 30,
  significantDiscrepancyThreshold: 500.0,
  ignoreLeadingZeros: true,
  ignoreSpecialChars: true,
  ignoreCase: true,
  ignoreCommonPrefixes: true,
  autoFuzzyMatch: true,
  allowGstinFuzzy: true,
  gstinFuzzyMaxDistance: 1,
  allowPanMatching: true,
  allowTaxHeadCrossMatch: true,
  rules: DEFAULT_MATCHING_RULES,
  manualPairs: [],
};

// Preset Configurations generator
export function getPresetToleranceConfig(preset: MatchingPresetType): ToleranceConfig {
  switch (preset) {
    case 'STRICT_STATUTORY':
      return {
        ...DEFAULT_TOLERANCE,
        preset: 'STRICT_STATUTORY',
        valueTolerance: 0.5,
        taxTolerance: 0.5,
        percentageTolerance: 0.1,
        dateToleranceDays: 15,
        significantDiscrepancyThreshold: 100.0,
        autoFuzzyMatch: false,
        allowGstinFuzzy: false,
        allowPanMatching: false,
        allowTaxHeadCrossMatch: false,
        rules: DEFAULT_MATCHING_RULES.map((r) => ({
          ...r,
          enabled: r.id === 'rule-exact-match',
        })),
      };

    case 'LENIENT_ROUNDING':
      return {
        ...DEFAULT_TOLERANCE,
        preset: 'LENIENT_ROUNDING',
        valueTolerance: 10.0,
        taxTolerance: 5.0,
        percentageTolerance: 2.0,
        dateToleranceDays: 60,
        significantDiscrepancyThreshold: 1000.0,
        autoFuzzyMatch: true,
        allowGstinFuzzy: true,
        gstinFuzzyMaxDistance: 2,
        allowPanMatching: true,
        allowTaxHeadCrossMatch: true,
        rules: DEFAULT_MATCHING_RULES.map((r) => ({
          ...r,
          enabled: true,
        })),
      };

    case 'AGGRESSIVE_FUZZY':
      return {
        ...DEFAULT_TOLERANCE,
        preset: 'AGGRESSIVE_FUZZY',
        valueTolerance: 20.0,
        taxTolerance: 10.0,
        percentageTolerance: 3.0,
        dateToleranceDays: 90,
        significantDiscrepancyThreshold: 2000.0,
        autoFuzzyMatch: true,
        allowGstinFuzzy: true,
        gstinFuzzyMaxDistance: 2,
        allowPanMatching: true,
        allowTaxHeadCrossMatch: true,
        rules: DEFAULT_MATCHING_RULES.map((r) => ({
          ...r,
          enabled: true,
          conditions: {
            ...r.conditions,
            invoiceFuzzyMaxDistance: 3,
            gstinFuzzyMaxDistance: 2,
          },
        })),
      };

    case 'BALANCED_CA':
    default:
      return {
        ...DEFAULT_TOLERANCE,
        preset: 'BALANCED_CA',
      };
  }
}

// ==========================================
// STRING & GSTIN HELPER UTILITIES
// ==========================================

// Extract 10-digit PAN from 15-digit GSTIN (characters 3 to 12)
export function extractPanFromGstin(gstin: string): string {
  if (!gstin) return '';
  const clean = gstin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length >= 12) {
    return clean.substring(2, 12);
  }
  return clean;
}

// Clean and normalize GSTIN (handling common OCR/typing substitutions like 0 vs O, 1 vs I)
export function normalizeGstin(gstin: string): string {
  if (!gstin) return '';
  return gstin.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

// Standardize invoice numbers (strip non-alphanumeric, leading zeros, common prefixes like INV-, BILL-)
export function normalizeInvoiceNumber(
  invNo: string,
  options?: {
    ignoreCase?: boolean;
    ignoreSpecialChars?: boolean;
    ignoreLeadingZeros?: boolean;
    ignoreCommonPrefixes?: boolean;
  }
): string {
  if (!invNo) return '';
  let str = String(invNo).trim();

  const ignoreCase = options?.ignoreCase ?? true;
  const ignoreSpecial = options?.ignoreSpecialChars ?? true;
  const ignoreZeros = options?.ignoreLeadingZeros ?? true;
  const ignorePrefix = options?.ignoreCommonPrefixes ?? true;

  if (ignoreCase) {
    str = str.toUpperCase();
  }

  if (ignorePrefix) {
    // Strip common prefixes: INV/, BILL-, TAX-INV-, GST/, DOC#
    str = str.replace(/^(INV|BILL|TAX|GST|DOC|INVOICE|TAXINV|TI|SRV)[-/_#:\s]*/i, '');
    // Strip financial year patterns like 2024-25/ or 24-25/ if at start
    str = str.replace(/^(\d{2,4}[-/]\d{2,4})[-/_#:\s]*/, '');
  }

  if (ignoreSpecial) {
    // Remove slashes, dashes, spaces, hashes, dots, etc.
    str = str.replace(/[^A-Za-z0-9]/g, '');
  }

  if (ignoreZeros) {
    // Remove leading zeros
    str = str.replace(/^0+/, '');
  }

  return str;
}

// Levenshtein distance for fuzzy matching
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix: number[][] = [];
  for (let i = 0; i <= bn; ++i) matrix[i] = [i];
  for (let i = 0; i <= an; ++i) matrix[0][i] = i;
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion / deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

// Check if GSTINs match exactly, by PAN, or fuzzy distance
export function isGstinFuzzyMatch(
  g1: string,
  g2: string,
  maxDistance: number = 1,
  allowPanMatch: boolean = true
): { matched: boolean; type: 'exact' | 'pan' | 'fuzzy' | 'none'; confidence: number } {
  const norm1 = normalizeGstin(g1);
  const norm2 = normalizeGstin(g2);

  if (!norm1 || !norm2) return { matched: false, type: 'none', confidence: 0 };

  // 1. Exact GSTIN match
  if (norm1 === norm2) {
    return { matched: true, type: 'exact', confidence: 100 };
  }

  // 2. PAN-level match (same company across different state codes or branches)
  if (allowPanMatch) {
    const pan1 = extractPanFromGstin(norm1);
    const pan2 = extractPanFromGstin(norm2);
    if (pan1.length === 10 && pan1 === pan2) {
      return { matched: true, type: 'pan', confidence: 90 };
    }
  }

  // 3. OCR / Typo substitution distance
  // Replace frequent optical confusion chars for comparison
  const opt1 = norm1.replace(/O/g, '0').replace(/I/g, '1').replace(/Z/g, '2');
  const opt2 = norm2.replace(/O/g, '0').replace(/I/g, '1').replace(/Z/g, '2');
  if (opt1 === opt2) {
    return { matched: true, type: 'fuzzy', confidence: 88 };
  }

  const dist = levenshteinDistance(norm1, norm2);
  if (dist <= maxDistance && norm1.length >= 14 && norm2.length >= 14) {
    return { matched: true, type: 'fuzzy', confidence: Math.max(70, 90 - dist * 10) };
  }

  return { matched: false, type: 'none', confidence: 0 };
}

// Check if Invoice numbers match (Exact, Normalized, Contains, or Levenshtein)
export function isInvoiceNumberMatch(
  inv1: string,
  inv2: string,
  conditions: CustomMatchingRule['conditions']
): { matched: boolean; type: 'exact' | 'normalized' | 'fuzzy' | 'contains' | 'none'; confidence: number } {
  const raw1 = (inv1 || '').trim().toUpperCase();
  const raw2 = (inv2 || '').trim().toUpperCase();

  if (!raw1 || !raw2) return { matched: false, type: 'none', confidence: 0 };

  if (raw1 === raw2) {
    return { matched: true, type: 'exact', confidence: 100 };
  }

  const clean1 = normalizeInvoiceNumber(inv1, {
    ignoreCase: conditions.ignoreCase,
    ignoreSpecialChars: conditions.ignoreSpecialChars,
    ignoreLeadingZeros: conditions.ignoreLeadingZeros,
    ignoreCommonPrefixes: conditions.ignoreCommonPrefixes,
  });

  const clean2 = normalizeInvoiceNumber(inv2, {
    ignoreCase: conditions.ignoreCase,
    ignoreSpecialChars: conditions.ignoreSpecialChars,
    ignoreLeadingZeros: conditions.ignoreLeadingZeros,
    ignoreCommonPrefixes: conditions.ignoreCommonPrefixes,
  });

  if (clean1 === clean2 && clean1.length > 0) {
    return { matched: true, type: 'normalized', confidence: 98 };
  }

  // Contains or Substring match
  if (
    clean1.length >= 3 &&
    clean2.length >= 3 &&
    (clean1.includes(clean2) || clean2.includes(clean1))
  ) {
    return { matched: true, type: 'contains', confidence: 85 };
  }

  // Fuzzy match with Levenshtein distance
  if (conditions.invoiceMatch === 'fuzzy' || conditions.invoiceFuzzyMaxDistance) {
    const maxDist = conditions.invoiceFuzzyMaxDistance || 2;
    const dist = levenshteinDistance(clean1, clean2);
    if (dist <= maxDist && Math.max(clean1.length, clean2.length) >= 3) {
      return {
        matched: true,
        type: 'fuzzy',
        confidence: Math.max(65, 95 - dist * 12),
      };
    }
  }

  return { matched: false, type: 'none', confidence: 0 };
}

// Parse date string into YYYY-MM-DD
export function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  const yyyymmdd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (yyyymmdd) {
    const year = yyyymmdd[1];
    const month = yyyymmdd[2].padStart(2, '0');
    const day = yyyymmdd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // DD-MMM-YYYY (e.g. 15-Oct-2024)
  const months: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const ddmmmyyyy = trimmed.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{4})$/i);
  if (ddmmmyyyy) {
    const day = ddmmmyyyy[1].padStart(2, '0');
    const month = months[ddmmmyyyy[2].toLowerCase()] || '01';
    const year = ddmmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

// Check difference in days between two dates
export function getDaysDifference(d1: string, d2: string): number {
  if (!d1 || !d2) return 9999;
  const date1 = new Date(parseDate(d1)).getTime();
  const date2 = new Date(parseDate(d2)).getTime();
  if (isNaN(date1) || isNaN(date2)) return 9999;
  return Math.abs(Math.round((date1 - date2) / (1000 * 60 * 60 * 24)));
}

// ==========================================
// ADVANCED RECONCILIATION ENGINE CORE
// ==========================================

export function reconcileGstData(
  books: InvoiceRecord[],
  gstr2b: InvoiceRecord[],
  tolerance: ToleranceConfig = DEFAULT_TOLERANCE
): { items: ReconItem[]; summary: ReconSummary } {
  const reconItems: ReconItem[] = [];
  const matchedGstr2bIds = new Set<string>();
  const matchedBookIds = new Set<string>();

  // Ensure active rules are sorted by priority
  const activeRules = [...(tolerance.rules || DEFAULT_MATCHING_RULES)]
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  // ----------------------------------------------------
  // STEP 0: PROCESS MANUAL MATCH PAIRS (User forced overrides)
  // ----------------------------------------------------
  if (tolerance.manualPairs && tolerance.manualPairs.length > 0) {
    for (const pair of tolerance.manualPairs) {
      const book = books.find((b) => b.id === pair.bookId);
      const g2b = gstr2b.find((g) => g.id === pair.gstr2bId);

      if (book && g2b && !matchedBookIds.has(book.id) && !matchedGstr2bIds.has(g2b.id)) {
        matchedBookIds.add(book.id);
        matchedGstr2bIds.add(g2b.id);

        const taxableDiff = Math.round((book.taxableValue - g2b.taxableValue) * 100) / 100;
        const taxDiff = Math.round((book.totalTax - g2b.totalTax) * 100) / 100;
        const totalDiff = Math.round((book.invoiceValue - g2b.invoiceValue) * 100) / 100;

        reconItems.push({
          id: `recon-manual-${book.id}-${g2b.id}`,
          gstin: book.gstin,
          vendorName: book.vendorName || g2b.vendorName,
          invoiceNumber: `${book.invoiceNumber} 🔗 ${g2b.invoiceNumber}`,
          matchStatus: 'MANUAL_MATCH',
          matchConfidence: 100,
          matchedRuleId: 'manual',
          matchedRuleName: 'User Manual Pair',
          booksRecord: book,
          gstr2bRecord: g2b,
          actionTaken: 'manually_matched',
          discrepancy: {
            taxableDiff,
            taxDiff,
            totalDiff,
            igstDiff: Math.round((book.igst - g2b.igst) * 100) / 100,
            cgstDiff: Math.round((book.cgst - g2b.cgst) * 100) / 100,
            sgstDiff: Math.round((book.sgst - g2b.sgst) * 100) / 100,
            percentageDiff: book.invoiceValue > 0 ? (totalDiff / book.invoiceValue) * 100 : 0,
            mismatchedFields: taxableDiff !== 0 || taxDiff !== 0 ? ['Manually linked with amount difference'] : [],
            severity: Math.abs(taxDiff) > 100 ? 'MEDIUM' : 'LOW',
            category: 'ROUNDING_DIFFERENCE',
            suggestedAction: 'Manual linkage confirmed by tax accountant.',
            statutoryReference: 'Rule 36(4)',
          },
        });
      }
    }
  }

  // ----------------------------------------------------
  // STEP 1: ITERATE THROUGH CUSTOM RULES IN PRIORITY ORDER
  // ----------------------------------------------------
  for (const rule of activeRules) {
    const { conditions } = rule;

    for (const book of books) {
      if (matchedBookIds.has(book.id)) continue;

      for (const g2b of gstr2b) {
        if (matchedGstr2bIds.has(g2b.id)) continue;

        // 1. Test GSTIN Match Condition
        let gstinMatchResult: { matched: boolean; type: string; confidence: number };
        if (conditions.gstinMatch === 'exact') {
          const isExact = normalizeGstin(book.gstin) === normalizeGstin(g2b.gstin);
          gstinMatchResult = { matched: isExact, type: 'exact', confidence: isExact ? 100 : 0 };
        } else if (conditions.gstinMatch === 'pan_only') {
          const pan1 = extractPanFromGstin(book.gstin);
          const pan2 = extractPanFromGstin(g2b.gstin);
          const isPan = pan1.length === 10 && pan1 === pan2;
          gstinMatchResult = { matched: isPan, type: 'pan', confidence: isPan ? 90 : 0 };
        } else if (conditions.gstinMatch === 'fuzzy') {
          gstinMatchResult = isGstinFuzzyMatch(
            book.gstin,
            g2b.gstin,
            conditions.gstinFuzzyMaxDistance || tolerance.gstinFuzzyMaxDistance || 1,
            tolerance.allowPanMatching
          );
        } else {
          gstinMatchResult = { matched: true, type: 'any', confidence: 80 };
        }

        if (!gstinMatchResult.matched) continue;

        // 2. Test Invoice Number Match Condition
        let invMatchResult: { matched: boolean; type: string; confidence: number };
        if (conditions.invoiceMatch === 'any') {
          invMatchResult = { matched: true, type: 'any', confidence: 75 };
        } else {
          invMatchResult = isInvoiceNumberMatch(
            book.invoiceNumber,
            g2b.invoiceNumber,
            conditions
          );
        }

        if (!invMatchResult.matched) continue;

        // 3. Test Date Tolerance Condition
        const dateDays = getDaysDifference(book.invoiceDate, g2b.invoiceDate);
        const maxDays = conditions.dateToleranceDays ?? tolerance.dateToleranceDays ?? 30;
        if (dateDays > maxDays) continue;

        // 4. Test Amount & Tax Tolerance Conditions
        const taxableDiff = Math.abs(book.taxableValue - g2b.taxableValue);
        const taxDiff = Math.abs(book.totalTax - g2b.totalTax);
        const totalDiff = Math.abs(book.invoiceValue - g2b.invoiceValue);
        const igstDiff = Math.abs(book.igst - g2b.igst);
        const cgstDiff = Math.abs(book.cgst - g2b.cgst);
        const sgstDiff = Math.abs(book.sgst - g2b.sgst);

        const valTolerance = conditions.amountToleranceValue ?? tolerance.valueTolerance ?? 2.0;
        const taxTolerance = conditions.taxToleranceValue ?? tolerance.taxTolerance ?? 1.5;
        const pctTolerance = conditions.amountTolerancePercent ?? tolerance.percentageTolerance ?? 1.0;
        const percentDiff = book.invoiceValue > 0 ? (totalDiff / book.invoiceValue) * 100 : 0;

        const isTaxableClose = taxableDiff <= valTolerance;
        const isTaxClose = taxDiff <= taxTolerance;
        const isPercentClose = percentDiff <= pctTolerance;
        const isAmountWithinTolerance =
          conditions.amountMatch === 'any' ||
          (isTaxableClose && isTaxClose) ||
          (conditions.amountMatch === 'percentage_tolerance' && isPercentClose);

        // Check Tax Head Mismatch (IGST vs CGST+SGST cross-match)
        const isHeadCrossMismatch =
          (igstDiff > taxTolerance && book.igst > 0 && g2b.cgst > 0) ||
          (cgstDiff > taxTolerance && book.cgst > 0 && g2b.igst > 0);

        // Determine if this rule applies
        let ruleApplies = false;
        let finalStatus: typeof rule.assignStatus = rule.assignStatus;

        if (rule.stage === 'exact') {
          if (isTaxableClose && isTaxClose && !isHeadCrossMismatch && gstinMatchResult.type === 'exact') {
            ruleApplies = true;
            finalStatus = 'EXACT_MATCH';
          }
        } else if (rule.stage === 'partial_amount') {
          if (isAmountWithinTolerance && !isHeadCrossMismatch) {
            ruleApplies = true;
            finalStatus = 'PARTIAL_MATCH';
          }
        } else if (rule.stage === 'fuzzy_invoice') {
          if (invMatchResult.type === 'fuzzy' || invMatchResult.type === 'contains' || invMatchResult.type === 'normalized') {
            if (isTaxClose && isTaxableClose) {
              ruleApplies = true;
              finalStatus = 'FUZZY_MATCH';
            }
          }
        } else if (rule.stage === 'fuzzy_gstin') {
          if (gstinMatchResult.type === 'fuzzy' || gstinMatchResult.type === 'pan') {
            if (isTaxClose && isTaxableClose) {
              ruleApplies = true;
              finalStatus = 'FUZZY_GSTIN_MATCH';
            }
          }
        } else if (rule.stage === 'head_pos') {
          if (isHeadCrossMismatch && Math.abs(book.totalTax - g2b.totalTax) <= taxTolerance) {
            ruleApplies = true;
            finalStatus = 'HEAD_MISMATCH';
          }
        } else if (rule.stage === 'custom') {
          // Significant Discrepancy or Custom Fallback
          const sigThreshold = tolerance.significantDiscrepancyThreshold || 500;
          if (taxDiff > sigThreshold || taxableDiff > sigThreshold * 2) {
            ruleApplies = true;
            finalStatus = 'SIGNIFICANT_DISCREPANCY';
          } else {
            ruleApplies = true;
            finalStatus = rule.assignStatus || 'VALUE_MISMATCH';
          }
        }

        if (ruleApplies) {
          matchedBookIds.add(book.id);
          matchedGstr2bIds.add(g2b.id);

          const mismatchedFields: string[] = [];
          let severity: DiscrepancySeverity = 'NONE';
          let category: DiscrepancyCategory = 'EXACT';
          let suggestedAction = '100% Eligible ITC. Safe to claim in GSTR-3B Table 4(A)(5).';
          let statutoryReference = 'Section 16(2)(aa) CGST Act';

          if (finalStatus === 'PARTIAL_MATCH') {
            mismatchedFields.push(`Minor Amount Difference: ₹${totalDiff.toFixed(2)} (${percentDiff.toFixed(2)}%)`);
            severity = 'LOW';
            category = 'ROUNDING_DIFFERENCE';
            suggestedAction = 'Commercial rounding difference. Post round-off entry in accounting software.';
            statutoryReference = 'Section 170 (Rounding off of tax)';
          } else if (finalStatus === 'FUZZY_MATCH') {
            mismatchedFields.push(`Invoice No Typo / Format ('${book.invoiceNumber}' vs '${g2b.invoiceNumber}')`);
            severity = 'LOW';
            category = 'INVOICE_TYPO';
            suggestedAction = 'Typo detected in invoice number. Verify invoice copy and update books reference.';
            statutoryReference = 'Rule 36(2) GST Invoice particulars';
          } else if (finalStatus === 'FUZZY_GSTIN_MATCH') {
            mismatchedFields.push(
              gstinMatchResult.type === 'pan'
                ? `Entity PAN matched (${extractPanFromGstin(book.gstin)}) but different State GSTIN ('${book.gstin}' vs '${g2b.gstin}')`
                : `GSTIN Typo detected ('${book.gstin}' vs '${g2b.gstin}')`
            );
            severity = 'MEDIUM';
            category = 'GSTIN_TYPO';
            suggestedAction = 'Confirm supplier billing entity state and rectify GSTIN in Purchase Ledger.';
            statutoryReference = 'Section 25 (Distinct Persons / GSTIN registration)';
          } else if (finalStatus === 'HEAD_MISMATCH') {
            mismatchedFields.push(`Tax Head Mismatch (IGST: ₹${book.igst} vs CGST+SGST: ₹${g2b.cgst}+₹${g2b.sgst}) - Place of Supply divergence`);
            severity = 'MEDIUM';
            category = 'HEAD_POS_MISMATCH';
            suggestedAction = 'Place of Supply (POS) error. Request supplier to file Table 9A amendment in GSTR-1.';
            statutoryReference = 'Section 12/13 IGST Act & Section 77 CGST Act';
          } else if (finalStatus === 'SIGNIFICANT_DISCREPANCY' || finalStatus === 'VALUE_MISMATCH') {
            if (!isTaxableClose) mismatchedFields.push(`Significant Taxable Difference: ₹${taxableDiff.toFixed(2)}`);
            if (!isTaxClose) mismatchedFields.push(`Significant Tax Difference: ₹${taxDiff.toFixed(2)}`);
            severity = 'HIGH';
            category = 'SIGNIFICANT_AMOUNT';
            suggestedAction = 'Material value discrepancy. Hold supplier payment for difference or issue Debit Note.';
            statutoryReference = 'Section 34 (Credit & Debit Notes) & Section 16(2)(c)';
          }

          if (dateDays > 15) {
            mismatchedFields.push(`Date gap: ${dateDays} days difference`);
          }

          const combinedConfidence = Math.round(
            (rule.confidence * 0.5) + (gstinMatchResult.confidence * 0.25) + (invMatchResult.confidence * 0.25)
          );

          reconItems.push({
            id: `recon-${rule.id}-${book.id}-${g2b.id}`,
            gstin: book.gstin,
            vendorName: book.vendorName || g2b.vendorName,
            invoiceNumber:
              book.invoiceNumber === g2b.invoiceNumber
                ? book.invoiceNumber
                : `${book.invoiceNumber} ≈ ${g2b.invoiceNumber}`,
            matchStatus: finalStatus,
            matchConfidence: combinedConfidence,
            matchedRuleId: rule.id,
            matchedRuleName: rule.name,
            booksRecord: book,
            gstr2bRecord: g2b,
            discrepancy: {
              taxableDiff: Math.round((book.taxableValue - g2b.taxableValue) * 100) / 100,
              taxDiff: Math.round((book.totalTax - g2b.totalTax) * 100) / 100,
              totalDiff: Math.round((book.invoiceValue - g2b.invoiceValue) * 100) / 100,
              igstDiff: Math.round((book.igst - g2b.igst) * 100) / 100,
              cgstDiff: Math.round((book.cgst - g2b.cgst) * 100) / 100,
              sgstDiff: Math.round((book.sgst - g2b.sgst) * 100) / 100,
              percentageDiff: Math.round(percentDiff * 100) / 100,
              mismatchedFields,
              severity,
              category,
              suggestedAction,
              statutoryReference,
            },
          });
          break; // Matched this book record to g2b, proceed to next book record
        }
      }
    }
  }

  // ----------------------------------------------------
  // STEP 2: REMAINING BOOKS RECORDS (Missing in GSTR-2B or GSTR-1)
  // ----------------------------------------------------
  const isSalesRecon =
    (books.length > 0 && books[0].source === 'sales') ||
    (gstr2b.length > 0 && gstr2b[0].source === 'gstr1');

  for (const book of books) {
    if (!matchedBookIds.has(book.id)) {
      const isHighValue = book.totalTax >= 5000;
      const severity: DiscrepancySeverity = isHighValue ? 'HIGH' : 'MEDIUM';

      reconItems.push({
        id: `recon-miss-2b-${book.id}`,
        gstin: book.gstin,
        vendorName: book.vendorName,
        invoiceNumber: book.invoiceNumber,
        matchStatus: 'MISSING_IN_2B',
        matchConfidence: 0,
        matchedRuleName: isSalesRecon ? 'Dataset Gap: In Sales Register Only' : 'Dataset Gap: In Books Only',
        booksRecord: book,
        gstr2bRecord: undefined,
        discrepancy: {
          taxableDiff: book.taxableValue,
          taxDiff: book.totalTax,
          totalDiff: book.invoiceValue,
          igstDiff: book.igst,
          cgstDiff: book.cgst,
          sgstDiff: book.sgst,
          percentageDiff: 100,
          mismatchedFields: [
            isSalesRecon
              ? 'Outward supply recorded in Sales Register but NOT reported in GSTR-1 return'
              : 'Supplier has NOT uploaded invoice in GSTR-1 / not auto-drafted in GSTR-2B',
          ],
          severity,
          category: 'MISSING_IN_2B',
          suggestedAction: isSalesRecon
            ? `Report outward supply in GSTR-1 (Table 4A for B2B or Table 7 for B2CS) to avoid Section 50(1) interest and enable buyer ITC.`
            : `CRITICAL: Do NOT claim in GSTR-3B under Sec 16(2)(aa). Send formal notice to ${book.vendorName} to file GSTR-1.`,
          statutoryReference: isSalesRecon
            ? 'Section 37 & Rule 59 (GSTR-1 Outward Supplies Reporting)'
            : 'Section 16(2)(aa) & Rule 37A (ITC reversal for non-payment)',
        },
      });
    }
  }

  // ----------------------------------------------------
  // STEP 3: REMAINING GSTR-2B / GSTR-1 RECORDS (Missing in Books or Ineligible)
  // ----------------------------------------------------
  for (const g2b of gstr2b) {
    if (!matchedGstr2bIds.has(g2b.id)) {
      const isIneligible = !isSalesRecon && (g2b.itcAvailable === false || (g2b.itcReason && g2b.itcReason.length > 0));

      reconItems.push({
        id: `recon-miss-books-${g2b.id}`,
        gstin: g2b.gstin,
        vendorName: g2b.vendorName,
        invoiceNumber: g2b.invoiceNumber,
        matchStatus: isIneligible ? 'INELIGIBLE_ITC' : 'MISSING_IN_BOOKS',
        matchConfidence: 0,
        matchedRuleName: isSalesRecon
          ? 'Dataset Gap: In GSTR-1 Return Only'
          : isIneligible
          ? 'Blocked Credit Sec 17(5)'
          : 'Dataset Gap: In 2B Only',
        booksRecord: undefined,
        gstr2bRecord: g2b,
        discrepancy: {
          taxableDiff: -g2b.taxableValue,
          taxDiff: -g2b.totalTax,
          totalDiff: -g2b.invoiceValue,
          igstDiff: -g2b.igst,
          cgstDiff: -g2b.cgst,
          sgstDiff: -g2b.sgst,
          percentageDiff: 100,
          mismatchedFields: isSalesRecon
            ? ['Invoice reported in GSTR-1 return, but not recorded in internal Sales Register']
            : isIneligible
            ? [`Ineligible ITC under Sec 17(5) / Rule 38: ${g2b.itcReason || 'Blocked Credit'}`]
            : ['Supplier filed in GSTR-1, but invoice not booked in Purchase Register'],
          severity: isIneligible ? 'MEDIUM' : 'LOW',
          category: isIneligible ? 'INELIGIBLE_17_5' : 'MISSING_IN_BOOKS',
          suggestedAction: isSalesRecon
            ? 'Verify outward invoice against billing software. Reconcile turnover with sales accounts.'
            : isIneligible
            ? 'Blocked credit under Sec 17(5). Reverse in GSTR-3B Table 4(B)(1).'
            : 'Unclaimed ITC opportunity. Verify goods/service receipt and record voucher in Tally/ERP.',
          statutoryReference: isSalesRecon
            ? 'Section 35(1) & GST Accounts Rules (Turnover Reconciliation)'
            : isIneligible
            ? 'Section 17(5) Apportionment & Blocked Credits'
            : 'Section 16(4) Claim Deadline',
        },
      });
    }
  }

  // ----------------------------------------------------
  // STEP 4: AGGREGATE COMPREHENSIVE RECONCILIATION SUMMARY
  // ----------------------------------------------------
  const summary: ReconSummary = {
    totalBookRecords: books.length,
    totalGstr2bRecords: gstr2b.length,
    totalBookTaxable: books.reduce((acc, b) => acc + b.taxableValue, 0),
    totalGstr2bTaxable: gstr2b.reduce((acc, g) => acc + g.taxableValue, 0),
    totalBookTax: books.reduce((acc, b) => acc + b.totalTax, 0),
    totalGstr2bTax: gstr2b.reduce((acc, g) => acc + g.totalTax, 0),

    // Exact Matched
    matchedCount: reconItems.filter((i) => i.matchStatus === 'EXACT_MATCH').length,
    matchedTaxable: reconItems
      .filter((i) => i.matchStatus === 'EXACT_MATCH')
      .reduce((acc, i) => acc + (i.booksRecord?.taxableValue || 0), 0),
    matchedTax: reconItems
      .filter((i) => i.matchStatus === 'EXACT_MATCH')
      .reduce((acc, i) => acc + (i.booksRecord?.totalTax || 0), 0),

    // Partial / Rounding Matched
    partialMatchCount: reconItems.filter((i) => i.matchStatus === 'PARTIAL_MATCH').length,
    partialMatchTaxable: reconItems
      .filter((i) => i.matchStatus === 'PARTIAL_MATCH')
      .reduce((acc, i) => acc + (i.booksRecord?.taxableValue || 0), 0),
    partialMatchTax: reconItems
      .filter((i) => i.matchStatus === 'PARTIAL_MATCH')
      .reduce((acc, i) => acc + (i.booksRecord?.totalTax || 0), 0),
    partialMatchDiff: reconItems
      .filter((i) => i.matchStatus === 'PARTIAL_MATCH')
      .reduce((acc, i) => acc + Math.abs(i.discrepancy?.totalDiff || 0), 0),

    // Fuzzy Matched (Invoice)
    fuzzyMatchedCount: reconItems.filter((i) => i.matchStatus === 'FUZZY_MATCH').length,
    fuzzyMatchedTax: reconItems
      .filter((i) => i.matchStatus === 'FUZZY_MATCH')
      .reduce((acc, i) => acc + (i.booksRecord?.totalTax || 0), 0),

    // Fuzzy Matched (GSTIN / PAN)
    fuzzyGstinCount: reconItems.filter((i) => i.matchStatus === 'FUZZY_GSTIN_MATCH').length,
    fuzzyGstinTax: reconItems
      .filter((i) => i.matchStatus === 'FUZZY_GSTIN_MATCH')
      .reduce((acc, i) => acc + (i.booksRecord?.totalTax || 0), 0),

    // Significant Discrepancies
    significantDiscrepancyCount: reconItems.filter((i) => i.matchStatus === 'SIGNIFICANT_DISCREPANCY').length,
    significantDiscrepancyTaxDiff: reconItems
      .filter((i) => i.matchStatus === 'SIGNIFICANT_DISCREPANCY')
      .reduce((acc, i) => acc + Math.abs(i.discrepancy?.taxDiff || 0), 0),

    // Value / Head Mismatch
    mismatchCount: reconItems.filter(
      (i) => i.matchStatus === 'VALUE_MISMATCH' || i.matchStatus === 'HEAD_MISMATCH'
    ).length,
    mismatchTaxDiff: reconItems
      .filter((i) => i.matchStatus === 'VALUE_MISMATCH' || i.matchStatus === 'HEAD_MISMATCH')
      .reduce((acc, i) => acc + Math.abs(i.discrepancy?.taxDiff || 0), 0),

    // Missing in GSTR-2B (Risk)
    missingIn2bCount: reconItems.filter((i) => i.matchStatus === 'MISSING_IN_2B').length,
    missingIn2bTaxable: reconItems
      .filter((i) => i.matchStatus === 'MISSING_IN_2B')
      .reduce((acc, i) => acc + (i.booksRecord?.taxableValue || 0), 0),
    missingIn2bTax: reconItems
      .filter((i) => i.matchStatus === 'MISSING_IN_2B')
      .reduce((acc, i) => acc + (i.booksRecord?.totalTax || 0), 0),

    // Missing in Books (Unclaimed)
    missingInBooksCount: reconItems.filter((i) => i.matchStatus === 'MISSING_IN_BOOKS').length,
    missingInBooksTaxable: reconItems
      .filter((i) => i.matchStatus === 'MISSING_IN_BOOKS')
      .reduce((acc, i) => acc + (i.gstr2bRecord?.taxableValue || 0), 0),
    missingInBooksTax: reconItems
      .filter((i) => i.matchStatus === 'MISSING_IN_BOOKS')
      .reduce((acc, i) => acc + (i.gstr2bRecord?.totalTax || 0), 0),

    // Ineligible ITC
    ineligibleCount: reconItems.filter((i) => i.matchStatus === 'INELIGIBLE_ITC').length,
    ineligibleTax: reconItems
      .filter((i) => i.matchStatus === 'INELIGIBLE_ITC')
      .reduce((acc, i) => acc + (i.gstr2bRecord?.totalTax || 0), 0),

    // Risk counts
    highRiskCount: reconItems.filter((i) => i.discrepancy?.severity === 'HIGH').length,
    mediumRiskCount: reconItems.filter((i) => i.discrepancy?.severity === 'MEDIUM').length,
    lowRiskCount: reconItems.filter((i) => i.discrepancy?.severity === 'LOW').length,
  };

  return { items: reconItems, summary };
}

// Convert JSON downloaded directly from GST Portal (GSTR-2B json format)
export function parseGstr2bJson(jsonData: any): InvoiceRecord[] {
  const records: InvoiceRecord[] = [];
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    const b2bList = data.b2b || data.data?.b2b || (Array.isArray(data) ? data : []);

    for (const b2bItem of b2bList) {
      const ctin = b2bItem.ctin || b2bItem.gstin || '';
      const vendorName = b2bItem.trdNm || b2bItem.tradeName || b2bItem.lglNm || ctin;
      const invList = b2bItem.inv || [];

      for (const inv of invList) {
        const inum = String(inv.inum || inv.invoiceNumber || '');
        const idt = inv.idt || inv.invoiceDate || '';
        const val = Number(inv.val || inv.invoiceValue || 0);
        const pos = inv.pos || '';
        const rchrg = inv.rchrg === 'Y';

        let txval = 0;
        let igst = 0;
        let cgst = 0;
        let sgst = 0;
        let cess = 0;

        if (Array.isArray(inv.items)) {
          for (const item of inv.items) {
            const itmdet = item.itm_det || item;
            txval += Number(itmdet.txval || 0);
            igst += Number(itmdet.iamt || 0);
            cgst += Number(itmdet.camt || 0);
            sgst += Number(itmdet.samt || 0);
            cess += Number(itmdet.csamt || 0);
          }
        } else {
          txval = Number(inv.taxableValue || val * 0.85);
          igst = Number(inv.igst || 0);
          cgst = Number(inv.cgst || 0);
          sgst = Number(inv.sgst || 0);
          cess = Number(inv.cess || 0);
        }

        const totalTax = igst + cgst + sgst + cess;
        const itcAvailable = inv.itcavl !== 'N';

        records.push({
          id: `g2b-${ctin}-${inum}-${Math.random().toString(36).substring(2, 7)}`,
          source: 'gstr2b',
          gstin: ctin,
          vendorName,
          invoiceNumber: inum,
          rawInvoiceNumber: inum,
          invoiceDate: parseDate(idt),
          invoiceValue: val || txval + totalTax,
          taxableValue: txval,
          igst,
          cgst,
          sgst,
          cess,
          totalTax,
          placeOfSupply: pos,
          reverseCharge: rchrg,
          itcAvailable,
          itcReason: inv.rsn || '',
        });
      }
    }
  } catch (e) {
    console.error('Failed to parse GSTR-2B JSON:', e);
  }
  return records;
}

// Convert JSON downloaded directly from GST Portal (GSTR-1 json format)
export function parseGstr1Json(jsonData: any): InvoiceRecord[] {
  const records: InvoiceRecord[] = [];
  try {
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
    
    // 1. Table 4A, 4B, 6B, 6C - B2B Invoices
    const b2bList = data.b2b || data.data?.b2b || (Array.isArray(data) ? data : []);
    for (const b2bItem of b2bList) {
      const ctin = b2bItem.ctin || b2bItem.gstin || '';
      const customerName = b2bItem.trdNm || b2bItem.tradeName || b2bItem.lglNm || ctin || 'B2B Customer';
      const invList = b2bItem.inv || [];

      for (const inv of invList) {
        const inum = String(inv.inum || inv.invoiceNumber || '');
        const idt = inv.idt || inv.invoiceDate || '';
        const val = Number(inv.val || inv.invoiceValue || 0);
        const pos = inv.pos || '';
        const rchrg = inv.rchrg === 'Y';

        let txval = 0;
        let igst = 0;
        let cgst = 0;
        let sgst = 0;
        let cess = 0;

        if (Array.isArray(inv.items)) {
          for (const item of inv.items) {
            const itmdet = item.itm_det || item;
            txval += Number(itmdet.txval || 0);
            igst += Number(itmdet.iamt || 0);
            cgst += Number(itmdet.camt || 0);
            sgst += Number(itmdet.samt || 0);
            cess += Number(itmdet.csamt || 0);
          }
        } else {
          txval = Number(inv.taxableValue || val * 0.85);
          igst = Number(inv.igst || 0);
          cgst = Number(inv.cgst || 0);
          sgst = Number(inv.sgst || 0);
          cess = Number(inv.cess || 0);
        }

        const totalTax = igst + cgst + sgst + cess;

        records.push({
          id: `g1-b2b-${ctin}-${inum}-${Math.random().toString(36).substring(2, 7)}`,
          source: 'gstr1',
          gstin: ctin,
          vendorName: customerName,
          invoiceNumber: inum,
          rawInvoiceNumber: inum,
          invoiceDate: parseDate(idt),
          invoiceValue: val || txval + totalTax,
          taxableValue: txval,
          igst,
          cgst,
          sgst,
          cess,
          totalTax,
          placeOfSupply: pos,
          reverseCharge: rchrg,
          invoiceType: 'B2B',
          itcAvailable: true,
        });
      }
    }

    // 2. Table 5 - B2CL (Large Invoices to Unregistered > 2.5L / 1L Inter-State)
    const b2clList = data.b2cl || data.data?.b2cl || [];
    for (const b2clItem of b2clList) {
      const pos = b2clItem.pos || '';
      const invList = b2clItem.inv || [];
      for (const inv of invList) {
        const inum = String(inv.inum || inv.invoiceNumber || '');
        const idt = inv.idt || inv.invoiceDate || '';
        const val = Number(inv.val || 0);
        let txval = 0;
        let igst = 0;
        let cess = 0;

        if (Array.isArray(inv.items)) {
          for (const item of inv.items) {
            const itmdet = item.itm_det || item;
            txval += Number(itmdet.txval || 0);
            igst += Number(itmdet.iamt || 0);
            cess += Number(itmdet.csamt || 0);
          }
        } else {
          txval = Number(inv.taxableValue || val * 0.85);
          igst = Number(inv.igst || 0);
        }

        records.push({
          id: `g1-b2cl-${inum}-${Math.random().toString(36).substring(2, 7)}`,
          source: 'gstr1',
          gstin: 'URP',
          vendorName: `B2CL Consumer (${pos})`,
          invoiceNumber: inum,
          rawInvoiceNumber: inum,
          invoiceDate: parseDate(idt),
          invoiceValue: val || txval + igst + cess,
          taxableValue: txval,
          igst,
          cgst: 0,
          sgst: 0,
          cess,
          totalTax: igst + cess,
          placeOfSupply: pos,
          invoiceType: 'B2CL',
          itcAvailable: true,
        });
      }
    }

    // 3. Table 7 - B2CS (Small Invoices to Unregistered)
    const b2csList = data.b2cs || data.data?.b2cs || [];
    for (const b2csItem of b2csList) {
      const pos = b2csItem.pos || '';
      const txval = Number(b2csItem.txval || 0);
      const iamt = Number(b2csItem.iamt || 0);
      const camt = Number(b2csItem.camt || 0);
      const samt = Number(b2csItem.samt || 0);
      const csamt = Number(b2csItem.csamt || 0);
      const totalTax = iamt + camt + samt + csamt;

      records.push({
        id: `g1-b2cs-${pos}-${Math.random().toString(36).substring(2, 7)}`,
        source: 'gstr1',
        gstin: 'URP',
        vendorName: `B2CS Retail Consumers (${pos})`,
        invoiceNumber: `B2CS/${pos}/${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        rawInvoiceNumber: `B2CS/${pos}`,
        invoiceDate: new Date().toISOString().slice(0, 10),
        invoiceValue: txval + totalTax,
        taxableValue: txval,
        igst: iamt,
        cgst: camt,
        sgst: samt,
        cess: csamt,
        totalTax,
        placeOfSupply: pos,
        invoiceType: 'B2CS',
        itcAvailable: true,
      });
    }
  } catch (e) {
    console.error('Failed to parse GSTR-1 JSON:', e);
  }
  return records;
}

// Convert CSV or TSV parsed rows to Invoice records
export function parseCsvData(
  rows: Record<string, string>[],
  source: DataSourceType
): InvoiceRecord[] {
  if (rows.length > 0 && isMeeshoData(Object.keys(rows[0]))) {
    return parseMeeshoRecords(rows).records;
  }

  return rows.map((row, idx) => {
    const findCol = (keywords: string[]): string => {
      const keys = Object.keys(row);
      for (const k of keys) {
        const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const kw of keywords) {
          if (clean.includes(kw.toLowerCase().replace(/[^a-z0-9]/g, ''))) {
            return row[k] || '';
          }
        }
      }
      return '';
    };

    // Specific party extraction based on document source
    let partyGstin = '';
    let partyName = '';
    let customerGstin = '';
    let vendorGstin = '';

    if (source === 'sales' || source === 'gstr1') {
      // For sales: customer is recipient; vendor is the user entity
      partyGstin = findCol(['customergstin', 'buyergstin', 'recipientgstin', 'clientgstin', 'gstinofrecipient', 'receivergstin', 'gstin']);
      partyName = findCol(['customername', 'buyername', 'clientname', 'partyname', 'receivername', 'customer', 'buyer', 'party', 'tradename', 'name', 'trdnm']);
      vendorGstin = findCol(['vendorgstin', 'suppliergstin', 'sellergstin', 'usergstin', 'ownergstin', 'mygstin', 'userentity']);
    } else {
      // For purchases: supplier is vendor; customer is the user entity
      partyGstin = findCol(['suppliergstin', 'vendorgstin', 'gstinofsupplier', 'ctin', 'suppliergstn', 'sellergstin', 'partygstin', 'gstin']);
      partyName = findCol(['suppliertradename', 'suppliername', 'vendorname', 'sellername', 'partyname', 'tradename', 'vendor', 'supplier', 'name', 'trdnm']);
      customerGstin = findCol(['customergstin', 'recipientgstin', 'buyergstin', 'billtogstin', 'usergstin', 'ownergstin', 'mygstin', 'userentity']);
    }
    
    const invoiceNumber = findCol([
      'invoiceno',
      'invoice_number',
      'inv_no',
      'bill_no',
      'billno',
      'inum',
      'voucherno',
      'doc_no',
      'reference_no',
    ]);
    
    const invoiceDate = findCol([
      'invoicedate',
      'invoice_date',
      'inv_date',
      'date',
      'bill_date',
      'idt',
      'voucherdate',
      'doc_date',
    ]);

    const pos = findCol(['placeofsupply', 'pos', 'state_code', 'state', 'destination_state']);
    const invoiceType = findCol(['invoicetype', 'inv_type', 'type', 'supply_type', 'doc_type']);

    const hsnCode = findCol(['hsn', 'hsn_code', 'hsn_sc', 'sac', 'sac_code', 'hsncode', 'item_hsn']);
    const rateRaw = findCol(['gstrate', 'gst_rate', 'rate', 'taxrate', 'tax_rate', 'rt']);
    const uqc = findCol(['uqc', 'unit', 'unit_of_measurement', 'uom']) || 'PCS';
    const numClean = (val: string) => {
      if (!val) return 0;
      const cleaned = String(val).replace(/[^\d.-]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const quantity = numClean(findCol(['quantity', 'qty', 'total_quantity', 'units']));
    const ecommerceGstin = findCol(['ecommercegstin', 'e-commerce gstin', 'etin', 'ecommerce_gstin', 'ecom_gstin', 'operator_gstin']);
    const ecommerceType = findCol(['ecommercetype', 'e-commerce type', 'typ']);

    const taxableValue = numClean(findCol(['taxablevalue', 'taxable_amt', 'taxable', 'txval', 'base_amount', 'assessable_val', 'net_amt']));
    const igst = numClean(findCol(['igst', 'integrated_tax', 'iamt', 'igst_amount']));
    const cgst = numClean(findCol(['cgst', 'central_tax', 'camt', 'cgst_amount']));
    const sgst = numClean(findCol(['sgst', 'state_tax', 'samt', 'utgst', 'sgst_amount']));
    const cess = numClean(findCol(['cess', 'csamt', 'cess_amount']));
    const totalTaxRaw = numClean(findCol(['totaltax', 'total_tax', 'tax_amount', 'gst_amount']));
    const invoiceValueRaw = numClean(findCol(['invoicevalue', 'invoice_amt', 'total_value', 'grand_total', 'val', 'net_amount', 'bill_amount']));

    const computedTax = igst + cgst + sgst + cess;
    const totalTax = totalTaxRaw > 0 ? totalTaxRaw : computedTax;
    const invoiceValue = invoiceValueRaw > 0 ? invoiceValueRaw : taxableValue + totalTax;

    const gstRate = determineGstRate(taxableValue, totalTax, rateRaw);

    const defaultParty = source === 'sales' || source === 'gstr1' ? `Customer ${idx + 1}` : `Vendor ${idx + 1}`;
    const cleanPartyGstin = (partyGstin || (source === 'sales' || source === 'gstr1' ? 'URP' : '')).toUpperCase().trim();
    const cleanCustomerGstin = customerGstin ? customerGstin.toUpperCase().trim() : '';
    const cleanVendorGstin = vendorGstin ? vendorGstin.toUpperCase().trim() : '';

    return {
      id: `${source}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      source,
      gstin: cleanPartyGstin,
      vendorName: partyName.trim() || cleanPartyGstin || defaultParty,
      invoiceNumber: invoiceNumber.trim() || `INV-${idx + 1}`,
      rawInvoiceNumber: invoiceNumber.trim() || `INV-${idx + 1}`,
      invoiceDate: parseDate(invoiceDate) || new Date().toISOString().slice(0, 10),
      taxableValue: Math.round(taxableValue * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      cess: Math.round(cess * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      invoiceValue: Math.round(invoiceValue * 100) / 100,
      placeOfSupply: pos || '',
      invoiceType: invoiceType || 'B2B',
      itcAvailable: true,
      billToGstin: cleanCustomerGstin || undefined,
      vendorGstin: cleanVendorGstin || undefined,
      hsnCode: hsnCode ? hsnCode.trim() : undefined,
      gstRate: gstRate > 0 ? gstRate : undefined,
      uqc: uqc ? uqc.toUpperCase().trim() : undefined,
      quantity: quantity > 0 ? quantity : undefined,
      ecommerceGstin: ecommerceGstin ? ecommerceGstin.trim().toUpperCase() : undefined,
      ecommerceType: ecommerceType && (ecommerceType.trim().toUpperCase() === 'E' || ecommerceType.trim().toUpperCase() === 'OE')
        ? (ecommerceType.trim().toUpperCase() as 'E' | 'OE')
        : undefined,
    };
  });
}
