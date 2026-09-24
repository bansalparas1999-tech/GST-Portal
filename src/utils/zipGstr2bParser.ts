import JSZip from 'jszip';
import { InvoiceRecord } from '../types';
import { parseGstr2bJson } from './gstEngine';
import {
  extractInvoiceFY,
  extractInvoiceMonth,
  normalizePeriodToMMYYYY,
  formatMMYYYYLabel,
  mmyyyyToScore,
} from './periodUtils';

export interface ZipGstr2bFileSummary {
  fileName: string;
  fileSize: number;
  periodMMYYYY: string; // e.g. "022022"
  periodLabel: string; // e.g. "Feb 2022 (022022)"
  financialYear: string; // e.g. "FY 2021-22"
  recipientGstin?: string;
  invoiceCount: number;
  taxableValue: number;
  totalTax: number;
  records: InvoiceRecord[];
  status: 'SUCCESS' | 'EMPTY' | 'INVALID_JSON' | 'NOT_GSTR2B';
  errorMessage?: string;
}

export interface ZipGstr2bParseResult {
  zipFileName: string;
  zipFileSize: number;
  totalFilesFound: number;
  validJsonCount: number;
  totalInvoices: number;
  totalTaxableValue: number;
  totalTax: number;
  periodsDetected: string[]; // sorted MMYYYY list e.g. ["022022", "032022", ...]
  financialYearsDetected: string[];
  recipientGstinsDetected: string[];
  fileSummaries: ZipGstr2bFileSummary[];
  allRecords: InvoiceRecord[];
  warnings: string[];
}

/**
 * Extracts return period (6-digit MMYYYY) from filename or JSON content
 */
export function extractPeriodFromGstr2b(
  jsonData: any,
  fileName: string
): { periodMMYYYY: string; financialYear: string; recipientGstin?: string } {
  let periodMMYYYY = '';
  let recipientGstin = '';

  // 1. Try finding in JSON data (rtnprd or fp)
  if (jsonData && typeof jsonData === 'object') {
    const rawPeriod =
      jsonData.rtnprd ||
      jsonData.fp ||
      jsonData.data?.rtnprd ||
      jsonData.data?.fp ||
      jsonData.data?.docdata?.rtnprd ||
      jsonData.docdata?.rtnprd;

    if (rawPeriod) {
      periodMMYYYY = normalizePeriodToMMYYYY(String(rawPeriod));
    }

    recipientGstin =
      jsonData.gstin ||
      jsonData.data?.gstin ||
      jsonData.data?.docdata?.gstin ||
      jsonData.docdata?.gstin ||
      '';
  }

  // 2. If not found in JSON, search in filename
  // Standard GST portal pattern: returns_022022_GSTR2B_27AABCA1234F1Z8.json
  // or GSTR2B_022022.json or 022022.json
  if (!periodMMYYYY && fileName) {
    // Look for 6-digit MMYYYY (month 01-12 followed by 2017-2035)
    const match6 = fileName.match(/(0[1-9]|1[0-2])(20\d{2})/);
    if (match6) {
      periodMMYYYY = `${match6[1]}${match6[2]}`;
    } else {
      // Look for Month-Year like "Feb2022" or "Feb-2022"
      const monthNames = [
        'jan', 'feb', 'mar', 'apr', 'may', 'jun',
        'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
      ];
      const lower = fileName.toLowerCase();
      for (let i = 0; i < monthNames.length; i++) {
        const regex = new RegExp(`${monthNames[i]}[_\\s\\-]?(\\d{4})`, 'i');
        const match = lower.match(regex);
        if (match) {
          const m = i + 1;
          const mm = m < 10 ? `0${m}` : `${m}`;
          const y = match[1];
          periodMMYYYY = `${mm}${y}`;
          break;
        }
      }
    }
  }

  // 3. Determine Financial Year from periodMMYYYY
  let financialYear = '';
  if (periodMMYYYY && periodMMYYYY.length === 6) {
    const m = parseInt(periodMMYYYY.slice(0, 2), 10);
    const y = parseInt(periodMMYYYY.slice(2), 10);
    if (m >= 4) {
      const nextY = (y + 1) % 100;
      financialYear = `FY ${y}-${nextY < 10 ? '0' + nextY : nextY}`;
    } else {
      const prevY = y - 1;
      const curY = y % 100;
      financialYear = `FY ${prevY}-${curY < 10 ? '0' + curY : curY}`;
    }
  }

  return { periodMMYYYY, financialYear, recipientGstin };
}

/**
 * Checks if a file is a zip archive
 */
export function isZipFile(file: File): boolean {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    file.type === 'multipart/x-zip'
  );
}

/**
 * Parses a single JSON text/data object into GSTR-2B InvoiceRecords with period metadata
 */
export function parseSingleGstr2bJsonText(
  jsonText: string,
  fileName: string,
  fileSize: number = 0
): ZipGstr2bFileSummary {
  try {
    const parsedData = JSON.parse(jsonText);
    const { periodMMYYYY, financialYear, recipientGstin } = extractPeriodFromGstr2b(parsedData, fileName);

    const records = parseGstr2bJson(parsedData);

    // If records found, enrich them with the detected return period and FY
    const enrichedRecords: InvoiceRecord[] = records.map((rec) => {
      const detectedFY = extractInvoiceFY(rec.invoiceDate);
      const detectedM = extractInvoiceMonth(rec.invoiceDate);

      const m = periodMMYYYY ? periodMMYYYY.slice(0, 2) : detectedM;
      const fy = financialYear || detectedFY || 'FY 2024-25';

      return {
        ...rec,
        financialYear: fy,
        taxPeriod: periodMMYYYY || m || 'ALL',
        billToGstin: recipientGstin || rec.billToGstin,
      };
    });

    const taxableValue = enrichedRecords.reduce((sum, r) => sum + (r.taxableValue || 0), 0);
    const totalTax = enrichedRecords.reduce((sum, r) => sum + (r.totalTax || 0), 0);

    return {
      fileName,
      fileSize,
      periodMMYYYY,
      periodLabel: periodMMYYYY ? formatMMYYYYLabel(periodMMYYYY) : 'Unknown Period',
      financialYear,
      recipientGstin,
      invoiceCount: enrichedRecords.length,
      taxableValue,
      totalTax,
      records: enrichedRecords,
      status: enrichedRecords.length > 0 ? 'SUCCESS' : 'EMPTY',
    };
  } catch (err: any) {
    return {
      fileName,
      fileSize,
      periodMMYYYY: '',
      periodLabel: 'Invalid JSON',
      financialYear: '',
      invoiceCount: 0,
      taxableValue: 0,
      totalTax: 0,
      records: [],
      status: 'INVALID_JSON',
      errorMessage: err.message || 'Malformed JSON syntax',
    };
  }
}

/**
 * Recursively extracts and parses all GSTR-2B JSON files from a ZIP archive
 */
export async function parseGstr2bZipFile(
  zipFile: File | Blob | ArrayBuffer,
  fileName: string = 'gstr2b_archive.zip'
): Promise<ZipGstr2bParseResult> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);

  const fileSummaries: ZipGstr2bFileSummary[] = [];
  const warnings: string[] = [];
  const allRecordsMap = new Map<string, InvoiceRecord>();

  const entries = Object.keys(loadedZip.files);
  const jsonEntries: string[] = [];

  for (const entryPath of entries) {
    const entry = loadedZip.files[entryPath];
    // Ignore directories and macOS junk
    if (entry.dir) continue;
    if (entryPath.includes('__MACOSX') || entryPath.startsWith('._') || entryPath.includes('/._')) {
      continue;
    }

    const lower = entryPath.toLowerCase();
    if (lower.endsWith('.json')) {
      jsonEntries.push(entryPath);
    } else if (lower.endsWith('.zip')) {
      // Handle nested zip file
      try {
        const nestedBuffer = await entry.async('arraybuffer');
        const nestedResult = await parseGstr2bZipFile(nestedBuffer, entryPath);
        fileSummaries.push(...nestedResult.fileSummaries);
        nestedResult.allRecords.forEach((rec) => {
          const key = `${rec.gstin}_${rec.invoiceNumber}`.toLowerCase().replace(/[^a-z0-9]/g, '');
          allRecordsMap.set(key || rec.id, rec);
        });
      } catch (nestedErr: any) {
        warnings.push(`Could not unpack nested zip ${entryPath}: ${nestedErr.message}`);
      }
    }
  }

  // Parse each JSON file found in this zip
  for (const jsonPath of jsonEntries) {
    const entry = loadedZip.files[jsonPath];
    try {
      const text = await entry.async('text');
      const cleanFileName = jsonPath.split('/').pop() || jsonPath;
      const summary = parseSingleGstr2bJsonText(text, cleanFileName, text.length);
      fileSummaries.push(summary);

      if (summary.records.length > 0) {
        summary.records.forEach((rec) => {
          const key = `${rec.gstin}_${rec.invoiceNumber}`.toLowerCase().replace(/[^a-z0-9]/g, '');
          allRecordsMap.set(key || rec.id, rec);
        });
      } else if (summary.status === 'EMPTY') {
        warnings.push(`File ${cleanFileName} contains no B2B or CDNR invoices.`);
      }
    } catch (e: any) {
      fileSummaries.push({
        fileName: jsonPath,
        fileSize: 0,
        periodMMYYYY: '',
        periodLabel: 'Read Error',
        financialYear: '',
        invoiceCount: 0,
        taxableValue: 0,
        totalTax: 0,
        records: [],
        status: 'INVALID_JSON',
        errorMessage: e.message || 'Failed to read file from zip',
      });
    }
  }

  // Aggregate stats
  const allRecords = Array.from(allRecordsMap.values());
  const validJsonSummaries = fileSummaries.filter((f) => f.status === 'SUCCESS');

  const totalInvoices = allRecords.length;
  const totalTaxableValue = allRecords.reduce((sum, r) => sum + (r.taxableValue || 0), 0);
  const totalTax = allRecords.reduce((sum, r) => sum + (r.totalTax || 0), 0);

  // Extract unique periods detected and sort chronologically
  const periodsSet = new Set<string>();
  const fySet = new Set<string>();
  const gstinSet = new Set<string>();

  fileSummaries.forEach((s) => {
    if (s.periodMMYYYY) periodsSet.add(s.periodMMYYYY);
    if (s.financialYear) fySet.add(s.financialYear);
    if (s.recipientGstin) gstinSet.add(s.recipientGstin);
  });

  const sortedPeriods = Array.from(periodsSet).sort((a, b) => mmyyyyToScore(a) - mmyyyyToScore(b));
  const sortedFYs = Array.from(fySet).sort();
  const sortedGstins = Array.from(gstinSet).sort();

  return {
    zipFileName: fileName,
    zipFileSize: (zipFile as any).size || 0,
    totalFilesFound: fileSummaries.length,
    validJsonCount: validJsonSummaries.length,
    totalInvoices,
    totalTaxableValue,
    totalTax,
    periodsDetected: sortedPeriods,
    financialYearsDetected: sortedFYs,
    recipientGstinsDetected: sortedGstins,
    fileSummaries,
    allRecords,
    warnings,
  };
}

/**
 * Parses multiple GSTR-2B JSON files selected simultaneously
 */
export async function parseMultipleGstr2bJsonFiles(
  files: File[]
): Promise<ZipGstr2bParseResult> {
  const fileSummaries: ZipGstr2bFileSummary[] = [];
  const warnings: string[] = [];
  const allRecordsMap = new Map<string, InvoiceRecord>();

  for (const file of files) {
    if (isZipFile(file)) {
      const zipRes = await parseGstr2bZipFile(file, file.name);
      fileSummaries.push(...zipRes.fileSummaries);
      zipRes.allRecords.forEach((rec) => {
        const key = `${rec.gstin}_${rec.invoiceNumber}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        allRecordsMap.set(key || rec.id, rec);
      });
      warnings.push(...zipRes.warnings);
    } else {
      try {
        const text = await file.text();
        const summary = parseSingleGstr2bJsonText(text, file.name, file.size);
        fileSummaries.push(summary);

        if (summary.records.length > 0) {
          summary.records.forEach((rec) => {
            const key = `${rec.gstin}_${rec.invoiceNumber}`.toLowerCase().replace(/[^a-z0-9]/g, '');
            allRecordsMap.set(key || rec.id, rec);
          });
        }
      } catch (err: any) {
        fileSummaries.push({
          fileName: file.name,
          fileSize: file.size,
          periodMMYYYY: '',
          periodLabel: 'Read Error',
          financialYear: '',
          invoiceCount: 0,
          taxableValue: 0,
          totalTax: 0,
          records: [],
          status: 'INVALID_JSON',
          errorMessage: err.message,
        });
      }
    }
  }

  const allRecords = Array.from(allRecordsMap.values());
  const validJsonSummaries = fileSummaries.filter((f) => f.status === 'SUCCESS');

  const periodsSet = new Set<string>();
  const fySet = new Set<string>();
  const gstinSet = new Set<string>();

  fileSummaries.forEach((s) => {
    if (s.periodMMYYYY) periodsSet.add(s.periodMMYYYY);
    if (s.financialYear) fySet.add(s.financialYear);
    if (s.recipientGstin) gstinSet.add(s.recipientGstin);
  });

  const sortedPeriods = Array.from(periodsSet).sort((a, b) => mmyyyyToScore(a) - mmyyyyToScore(b));

  return {
    zipFileName: files.length === 1 ? files[0].name : `${files.length} GSTR-2B Files`,
    zipFileSize: files.reduce((s, f) => s + f.size, 0),
    totalFilesFound: fileSummaries.length,
    validJsonCount: validJsonSummaries.length,
    totalInvoices: allRecords.length,
    totalTaxableValue: allRecords.reduce((sum, r) => sum + (r.taxableValue || 0), 0),
    totalTax: allRecords.reduce((sum, r) => sum + (r.totalTax || 0), 0),
    periodsDetected: sortedPeriods,
    financialYearsDetected: Array.from(fySet).sort(),
    recipientGstinsDetected: Array.from(gstinSet).sort(),
    fileSummaries,
    allRecords,
    warnings,
  };
}

/**
 * Generates an in-memory sample ZIP file containing multiple monthly GSTR-2B JSONs
 * covering the period range 022022 to 022026 for instant testing.
 */
export async function generateSampleMultiPeriodGstr2bZip(): Promise<{ blob: Blob; fileName: string }> {
  const zip = new JSZip();

  const periods = [
    { mmyyyy: '022022', year: 2022, month: '02', fy: 'FY 2021-22' },
    { mmyyyy: '062022', year: 2022, month: '06', fy: 'FY 2022-23' },
    { mmyyyy: '112022', year: 2022, month: '11', fy: 'FY 2022-23' },
    { mmyyyy: '022023', year: 2023, month: '02', fy: 'FY 2022-23' },
    { mmyyyy: '072023', year: 2023, month: '07', fy: 'FY 2023-24' },
    { mmyyyy: '022024', year: 2024, month: '02', fy: 'FY 2023-24' },
    { mmyyyy: '082024', year: 2024, month: '08', fy: 'FY 2024-25' },
    { mmyyyy: '012025', year: 2025, month: '01', fy: 'FY 2024-25' },
    { mmyyyy: '082025', year: 2025, month: '08', fy: 'FY 2025-26' },
    { mmyyyy: '022026', year: 2026, month: '02', fy: 'FY 2025-26' },
  ];

  const vendorTemplates = [
    { gstin: '27AABCT3456D1Z2', name: 'Tata Consultancy & Cloud Services Ltd', state: '27' },
    { gstin: '07AAACA1234F1Z8', name: 'Apex Industrial Spares & Equipment', state: '07' },
    { gstin: '29AABCR9876C1Z1', name: 'Reliance Infotech & Logistics Corp', state: '29' },
    { gstin: '33AABCM4567P1Z9', name: 'Madras Chemical & Polymers Ltd', state: '33' },
    { gstin: '24AAACC7890Q1Z3', name: 'Gujarat Petrochem Energy Solutions', state: '24' },
  ];

  periods.forEach((p, pIdx) => {
    const b2bInvoices = vendorTemplates.map((v, vIdx) => {
      const invNum = `INV/${p.year}/${p.month}/${100 + vIdx + pIdx * 10}`;
      const day = ((vIdx * 5 + 3) % 25) + 1;
      const invDate = `${day < 10 ? '0' + day : day}-${p.month}-${p.year}`;
      const baseVal = 25000 + ((pIdx * 7 + vIdx * 13) % 40) * 1000;
      const rate = 18;
      const taxVal = baseVal;
      const isInter = v.state !== '27';
      const igst = isInter ? Math.round((taxVal * rate) / 100) : 0;
      const cgst = !isInter ? Math.round((taxVal * rate) / 200) : 0;
      const sgst = !isInter ? Math.round((taxVal * rate) / 200) : 0;
      const totalTax = igst + cgst + sgst;
      const invoiceVal = taxVal + totalTax;

      return {
        ctin: v.gstin,
        trdNm: v.name,
        inv: [
          {
            inum: invNum,
            idt: invDate,
            val: invoiceVal,
            pos: '27',
            rchrg: 'N',
            itcavl: 'Y',
            items: [
              {
                num: 1,
                itm_det: {
                  rt: rate,
                  txval: taxVal,
                  iamt: igst,
                  camt: cgst,
                  samt: sgst,
                  csamt: 0,
                },
              },
            ],
          },
        ],
      };
    });

    const jsonContent = {
      gstin: '27AABCA1234F1Z8',
      fp: p.mmyyyy,
      rtnprd: p.mmyyyy,
      version: 'GSTR2B_v1.0',
      data: {
        b2b: b2bInvoices,
        cdnr: [
          {
            ctin: vendorTemplates[0].gstin,
            trdNm: vendorTemplates[0].name,
            nt: [
              {
                nt_num: `CN/${p.year}/${p.month}/01`,
                nt_dt: `20-${p.month}-${p.year}`,
                ntty: 'C',
                val: 5900,
                pos: '27',
                rchrg: 'N',
                itcavl: 'Y',
                items: [
                  {
                    num: 1,
                    itm_det: {
                      rt: 18,
                      txval: 5000,
                      iamt: 0,
                      camt: 450,
                      samt: 450,
                      csamt: 0,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    };

    const fileName = `returns_${p.mmyyyy}_GSTR2B_27AABCA1234F1Z8.json`;
    zip.file(fileName, JSON.stringify(jsonContent, null, 2));
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, fileName: 'GSTR2B_MultiPeriod_022022_to_022026.zip' };
}
