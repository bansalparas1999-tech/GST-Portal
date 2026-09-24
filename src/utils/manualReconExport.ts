import * as XLSX from 'xlsx';
import { ReconItem, ReconSummary } from '../types';
import { formatMMYYYYLabel } from './periodUtils';

export interface ManualReconExportOptions {
  companyName: string;
  companyGstin: string;
  userId: string;
  userName: string;
  booksPeriodFrom: string; // e.g. '022022'
  booksPeriodTo: string;   // e.g. '022026'
  gstr2bPeriodFrom: string; // e.g. '022022'
  gstr2bPeriodTo: string;   // e.g. '022026'
  toleranceRupees?: number;
  generatedAt?: string;
}

const fmt = (val: number | undefined | null): number => {
  if (val === undefined || val === null || isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
};

/**
 * Generates and downloads a multi-sheet statutory GST Reconciliation Excel report (.xlsx)
 */
export function exportManualReconciliationToExcel(
  items: ReconItem[],
  summary: ReconSummary,
  opts: ManualReconExportOptions
): void {
  const wb = XLSX.utils.book_new();
  const timestamp = opts.generatedAt || new Date().toLocaleString('en-IN');

  const booksRangeText = `${formatMMYYYYLabel(opts.booksPeriodFrom)} to ${formatMMYYYYLabel(opts.booksPeriodTo)}`;
  const gstr2bRangeText = `${formatMMYYYYLabel(opts.gstr2bPeriodFrom)} to ${formatMMYYYYLabel(opts.gstr2bPeriodTo)}`;

  // ----------------------------------------------------
  // SHEET 1: RECONCILIATION SUMMARY & EXECUTIVE METRICS
  // ----------------------------------------------------
  const summaryRows: (string | number)[][] = [
    ['CLEARMATCH GST - MANUAL RECONCILIATION AUDIT REPORT'],
    [`COMPANY / TAXPAYER: ${opts.companyName.toUpperCase()}`],
    [`GSTIN: ${opts.companyGstin || 'NOT SPECIFIED'}`],
    [`AUTHENTICATED USER ID: ${opts.userId} (${opts.userName})`],
    [`PURCHASE REGISTER AUDIT PERIOD: ${booksRangeText} [${opts.booksPeriodFrom} - ${opts.booksPeriodTo}]`],
    [`GSTR-2B PORTAL AUDIT PERIOD: ${gstr2bRangeText} [${opts.gstr2bPeriodFrom} - ${opts.gstr2bPeriodTo}]`],
    [`GENERATED ON: ${timestamp}`],
    [],
    ['KEY PERFORMANCE INDICATOR (KPI)', 'INVOICE COUNT', 'TAXABLE VALUE (INR)', 'TAX AMOUNT / ITC (INR)', 'STATUTORY OBSERVATION / LEGAL RISK'],
    ['------------------------------------------------', '-------------', '-------------------', '----------------------', '---------------------------------------------------'],
    [
      'Total Inward Purchase Register (Books)',
      summary.totalBookRecords,
      fmt(summary.totalBookTaxable),
      fmt(summary.totalBookTax),
      'Total purchases recorded in accounts for selected period',
    ],
    [
      'Total GSTR-2B Portal Records (Inward ITC)',
      summary.totalGstr2bRecords,
      fmt(summary.totalGstr2bTaxable),
      fmt(summary.totalGstr2bTax),
      'Total auto-drafted supplies reflected in GSTR-2B on GST Portal',
    ],
    [],
    [
      '1. Exact Matched Invoices (100% Concordance)',
      summary.matchedCount,
      fmt(summary.matchedTaxable),
      fmt(summary.matchedTax),
      'Eligible for 100% immediate ITC claim under Section 16(2)(aa)',
    ],
    [
      '2. Partial & Rounding Matched Invoices',
      summary.partialMatchCount,
      fmt(summary.partialMatchTaxable),
      fmt(summary.partialMatchTax),
      `Matched within acceptable statutory tolerance of +/- Rs. ${opts.toleranceRupees || 2.0}`,
    ],
    [
      '3. Fuzzy Matched (Typo / Prefix Difference)',
      summary.fuzzyMatchedCount,
      fmt(0),
      fmt(summary.fuzzyMatchedTax),
      'Invoice numbers matched with normalized formatting (leading zeros, slash/dash)',
    ],
    [
      '4. Value & Tax Rate Discrepancies',
      summary.mismatchCount,
      fmt(0),
      fmt(summary.mismatchTaxDiff),
      'Tax differential between Books and Portal (Credit/Debit note or Table 9A amendment needed)',
    ],
    [
      '5. MISSING IN GSTR-2B (ITC AT RISK)',
      summary.missingIn2bCount,
      fmt(summary.missingIn2bTaxable),
      fmt(summary.missingIn2bTax),
      'CRITICAL RISK: ITC blocked under Section 16(2)(aa). Suppliers must file GSTR-1 immediately',
    ],
    [
      '6. MISSING IN BOOKS (UNCLAIMED ITC)',
      summary.missingInBooksCount,
      fmt(summary.missingInBooksTaxable),
      fmt(summary.missingInBooksTax),
      'POTENTIAL BENEFIT: Supplies in GSTR-2B but omitted in ERP. Avail before Sec 16(4) cutoff',
    ],
    [
      '7. Ineligible ITC under Section 17(5)',
      summary.ineligibleCount,
      fmt(0),
      fmt(summary.ineligibleTax),
      'Blocked credits (motor vehicles, food/beverage, personal expenses) - reverse in 3B Table 4(B)',
    ],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 44 }, { wch: 16 }, { wch: 22 }, { wch: 26 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Recon Summary');

  // Helper for generating standard invoice sheet rows
  const getInvoiceRow = (item: ReconItem) => {
    const book = item.booksRecord;
    const g2b = item.gstr2bRecord;
    const disc = item.discrepancy;

    return [
      item.matchStatus,
      item.gstin,
      item.vendorName,
      book?.invoiceNumber || '-',
      g2b?.invoiceNumber || '-',
      book?.invoiceDate || '-',
      g2b?.invoiceDate || '-',
      book?.taxPeriod || '-',
      g2b?.taxPeriod || '-',
      fmt(book?.taxableValue),
      fmt(g2b?.taxableValue),
      fmt(disc?.taxableDiff),
      fmt(book?.totalTax),
      fmt(g2b?.totalTax),
      fmt(disc?.taxDiff),
      fmt(book?.igst),
      fmt(g2b?.igst),
      fmt(book?.cgst),
      fmt(g2b?.cgst),
      fmt(book?.sgst),
      fmt(g2b?.sgst),
      fmt(book?.invoiceValue),
      fmt(g2b?.invoiceValue),
      (disc?.mismatchedFields || []).join('; ') || 'None',
      disc?.suggestedAction || 'Review',
    ];
  };

  const invoiceHeaders = [
    'Match Status',
    'Supplier GSTIN',
    'Supplier Name',
    'Books Invoice No',
    '2B Invoice No',
    'Books Date',
    '2B Date',
    'Books Period',
    '2B Period',
    'Books Taxable (₹)',
    '2B Taxable (₹)',
    'Taxable Diff (₹)',
    'Books Total Tax (₹)',
    '2B Total Tax (₹)',
    'Tax Diff (₹)',
    'Books IGST (₹)',
    '2B IGST (₹)',
    'Books CGST (₹)',
    '2B CGST (₹)',
    'Books SGST (₹)',
    '2B SGST (₹)',
    'Books Total Value (₹)',
    '2B Total Value (₹)',
    'Mismatched Fields',
    'Statutory Action Recommendation',
  ];

  // ----------------------------------------------------
  // SHEET 2: EXACT MATCHES
  // ----------------------------------------------------
  const exactItems = items.filter((i) => i.matchStatus === 'EXACT_MATCH');
  const exactRows = [
    [`EXACT MATCHED INVOICES (100% ITC CLEARED) - COUNT: ${exactItems.length}`],
    [`Period Books: ${booksRangeText} | Period GSTR-2B: ${gstr2bRangeText}`],
    [],
    invoiceHeaders,
    ...exactItems.map(getInvoiceRow),
  ];
  const wsExact = XLSX.utils.aoa_to_sheet(exactRows);
  wsExact['!cols'] = invoiceHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsExact, 'Exact Matches');

  // ----------------------------------------------------
  // SHEET 3: VALUE & HEAD DISCREPANCIES
  // ----------------------------------------------------
  const discrepancyItems = items.filter(
    (i) =>
      i.matchStatus === 'VALUE_MISMATCH' ||
      i.matchStatus === 'HEAD_MISMATCH' ||
      i.matchStatus === 'SIGNIFICANT_DISCREPANCY' ||
      i.matchStatus === 'PARTIAL_MATCH'
  );
  const discrepancyRows = [
    [`VALUE & TAX RATE DISCREPANCIES - COUNT: ${discrepancyItems.length}`],
    [`Period Books: ${booksRangeText} | Period GSTR-2B: ${gstr2bRangeText}`],
    [],
    invoiceHeaders,
    ...discrepancyItems.map(getInvoiceRow),
  ];
  const wsDiscrepancies = XLSX.utils.aoa_to_sheet(discrepancyRows);
  wsDiscrepancies['!cols'] = invoiceHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsDiscrepancies, 'Discrepancies');

  // ----------------------------------------------------
  // SHEET 4: MISSING IN GSTR-2B (ITC AT RISK)
  // ----------------------------------------------------
  const missing2bItems = items.filter((i) => i.matchStatus === 'MISSING_IN_2B');
  const missing2bRows = [
    [`MISSING IN GSTR-2B (IN BOOKS ONLY - ITC AT RISK SEC 16(2)(aa)) - COUNT: ${missing2bItems.length}`],
    [`Period Books: ${booksRangeText} | Period GSTR-2B: ${gstr2bRangeText}`],
    [],
    invoiceHeaders,
    ...missing2bItems.map(getInvoiceRow),
  ];
  const wsMissing2b = XLSX.utils.aoa_to_sheet(missing2bRows);
  wsMissing2b['!cols'] = invoiceHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsMissing2b, 'Missing in 2B (At Risk)');

  // ----------------------------------------------------
  // SHEET 5: MISSING IN BOOKS (UNCLAIMED ITC)
  // ----------------------------------------------------
  const missingBooksItems = items.filter((i) => i.matchStatus === 'MISSING_IN_BOOKS');
  const missingBooksRows = [
    [`MISSING IN BOOKS (IN 2B ONLY - UNCLAIMED ITC) - COUNT: ${missingBooksItems.length}`],
    [`Period Books: ${booksRangeText} | Period GSTR-2B: ${gstr2bRangeText}`],
    [],
    invoiceHeaders,
    ...missingBooksItems.map(getInvoiceRow),
  ];
  const wsMissingBooks = XLSX.utils.aoa_to_sheet(missingBooksRows);
  wsMissingBooks['!cols'] = invoiceHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsMissingBooks, 'Missing in Books');

  // ----------------------------------------------------
  // SHEET 6: MASTER RECONCILED REGISTER (ALL INVOICES)
  // ----------------------------------------------------
  const masterRows = [
    [`MASTER RECONCILED REGISTER (ALL ${items.length} INVOICES)`],
    [`Period Books: ${booksRangeText} | Period GSTR-2B: ${gstr2bRangeText}`],
    [],
    invoiceHeaders,
    ...items.map(getInvoiceRow),
  ];
  const wsMaster = XLSX.utils.aoa_to_sheet(masterRows);
  wsMaster['!cols'] = invoiceHeaders.map(() => ({ wch: 18 }));
  XLSX.utils.book_append_sheet(wb, wsMaster, 'All Invoices');

  // Write Excel file
  const fileName = `Manual_Reconciliation_Report_${opts.gstr2bPeriodFrom}_to_${opts.gstr2bPeriodTo}_${Date.now()}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
