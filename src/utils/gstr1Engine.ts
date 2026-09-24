import {
  InvoiceRecord,
  HsnSummaryItem,
  B2csSummaryItem,
  Gstr1JsonPayload,
  Gstr1QuarterlyJsonPayload,
  Gstr1FilingFrequency,
} from '../types';
import { getStandardStatePos } from './ecommerceParser';

// Standard GST Rate Slabs in India
export const STANDARD_GST_RATES = [0, 0.1, 0.25, 1.5, 3, 5, 6, 12, 18, 28];

/**
 * Normalizes or determines GST rate from taxable value & total tax if missing
 */
export function determineGstRate(
  taxableValue: number,
  totalTax: number,
  providedRate?: number | string
): number {
  if (providedRate !== undefined && providedRate !== null && providedRate !== '') {
    const parsed = typeof providedRate === 'number' ? providedRate : parseFloat(String(providedRate).replace(/[^\d.-]/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      // If provided as decimal like 0.18 -> 18, 0.05 -> 5
      if (parsed > 0 && parsed <= 0.5) {
        return Math.round(parsed * 100 * 100) / 100;
      }
      return parsed;
    }
  }

  // Derive from taxable value & tax
  if (Math.abs(taxableValue) > 0.01 && Math.abs(totalTax) > 0.001) {
    const rawRate = (Math.abs(totalTax) / Math.abs(taxableValue)) * 100;
    // Find closest standard rate
    let closest = STANDARD_GST_RATES[0];
    let minDiff = Math.abs(rawRate - closest);
    for (const r of STANDARD_GST_RATES) {
      const diff = Math.abs(rawRate - r);
      if (diff < minDiff) {
        minDiff = diff;
        closest = r;
      }
    }
    // If difference is within 0.75%, snap to standard rate
    if (minDiff <= 0.75) {
      return closest;
    }
    return Math.round(rawRate * 100) / 100;
  }

  return 18; // Default statutory fallback rate
}

/**
 * Format Filing Period to MMYYYY e.g. (10, 2024) -> "102024"
 */
export function formatGstr1FilingPeriod(taxPeriod?: string, financialYear?: string): string {
  let mm = '01';
  let yyyy = '2025';

  if (taxPeriod) {
    const cleanMonth = taxPeriod.replace(/[^\d]/g, '');
    if (cleanMonth.length === 6) return cleanMonth; // e.g. "012025"
    if (cleanMonth.length === 1 || cleanMonth.length === 2) {
      mm = cleanMonth.padStart(2, '0');
    }
  }

  if (financialYear) {
    // FY 2024-25
    const match = financialYear.match(/(\d{4})/);
    if (match) {
      const startYear = parseInt(match[1], 10);
      // If month is Jan, Feb, Mar (01, 02, 03), it falls in the second calendar year
      const mNum = parseInt(mm, 10);
      if (mNum >= 1 && mNum <= 3) {
        yyyy = String(startYear + 1);
      } else {
        yyyy = String(startYear);
      }
    }
  }

  return `${mm}${yyyy}`;
}

/**
 * Derives financial quarter ('Q1'|'Q2'|'Q3'|'Q4') from month string or number
 */
export function getQuarterFromMonth(month: string): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  const m = month.toLowerCase().trim();
  if (
    m.includes('apr') ||
    m.includes('may') ||
    m.includes('jun') ||
    m === '04' ||
    m === '05' ||
    m === '06' ||
    m === '4' ||
    m === '5' ||
    m === '6'
  ) {
    return 'Q1';
  }
  if (
    m.includes('jul') ||
    m.includes('aug') ||
    m.includes('sep') ||
    m === '07' ||
    m === '08' ||
    m === '09' ||
    m === '7' ||
    m === '8' ||
    m === '9'
  ) {
    return 'Q2';
  }
  if (
    m.includes('oct') ||
    m.includes('nov') ||
    m.includes('dec') ||
    m === '10' ||
    m === '11' ||
    m === '12'
  ) {
    return 'Q3';
  }
  return 'Q4'; // Jan, Feb, Mar (01, 02, 03)
}

/**
 * Format Quarterly Filing Period to MMYYYY for QRMP filers:
 * Q1 (Apr-Jun) -> 06YYYY
 * Q2 (Jul-Sep) -> 09YYYY
 * Q3 (Oct-Dec) -> 12YYYY
 * Q4 (Jan-Mar) -> 03(YYYY+1) e.g. FY 2025-26 Q4 -> "032026"
 */
export function formatGstr1QuarterlyFilingPeriod(
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4',
  financialYear?: string
): string {
  let startYear = 2025;
  if (financialYear) {
    const match = financialYear.match(/(\d{4})/);
    if (match) {
      startYear = parseInt(match[1], 10);
    }
  }

  switch (quarter) {
    case 'Q1':
      return `06${startYear}`;
    case 'Q2':
      return `09${startYear}`;
    case 'Q3':
      return `12${startYear}`;
    case 'Q4':
      return `03${startYear + 1}`;
  }
}

// ==========================================
// AMAZON B2CS & HSN SAMPLES & PARSER
// ==========================================

export const AMAZON_B2CS_SAMPLE_CSV = `Summary For B2CS,,,,,,
,,,,Total Taxable Value,Total Cess,
,,,,"2,725.41",0.00,
Type,Place Of Supply,Applicable % of Tax Rate,Rate,Taxable Value,Cess Amount,E-Commerce GSTIN
E,09-Uttar Pradesh,,0.18,194.07,0,07AAICA3918J1CV
E,33-Tamil Nadu,,0.18,151.69,0,07AAICA3918J1CV
E,24-Gujarat,,0.18,532.21,0,07AAICA3918J1CV
E,18-Assam,,0.18,194.07,0,07AAICA3918J1CV
E,19-West Bengal,,0.18,641.53,0,07AAICA3918J1CV
E,03-Punjab,,0.18,253.39,0,07AAICA3918J1CV
E,29-Karnataka,,0.18,455.07,0,07AAICA3918J1CV
E,14-Manipur,,0.18,151.69,0,07AAICA3918J1CV
E,37-Andhra Pradesh,,0.18,0,0,07AAICA3918J1CV
E,06-Haryana,,0.18,151.69,0,07AAICA3918J1CV`;

export const AMAZON_HSN_SAMPLE_CSV = `Summary for HSN,,,,,,,,,,
No. of HSN,,,,,Total Value,Total Taxable Value,Total Integrated Tax,Total Central Tax,Total State/UT Tax,Total Cess
2,,,,,"3,216.00","2,725.41",490.59,0.00,0.00,0.00
HSN,Description,UQC,Total Quantity,Rate,Total Value,Taxable Value,Integrated Tax Amount,Central Tax Amount,State/UT Tax Amount,Cess Amount
7717,Fashion Jewellery,PCS,3,0.18,997,844.92,152.08,0,0,0
64059000,Footwear & Accessories,PCS,11,0.18,2219,1880.49,338.51,0,0,0`;

/**
 * Checks if raw text is Amazon B2CS Summary
 */
export function isAmazonB2csText(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('summary for b2cs') ||
    (lower.includes('place of supply') && lower.includes('e-commerce gstin') && lower.includes('rate'))
  );
}

/**
 * Checks if raw text is Amazon HSN Summary
 */
export function isAmazonHsnText(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('summary for hsn') ||
    (lower.includes('no. of hsn') && lower.includes('total taxable value')) ||
    (lower.includes('integrated tax') && lower.includes('central tax') && lower.includes('uqc'))
  );
}

/**
 * Parses Amazon Summary for B2CS CSV text or lines
 */
export function parseAmazonB2csSummary(
  csvText: string,
  supplierGstin: string = '07AAECO2378J1Z6',
  period?: { fy?: string; month?: string }
): { b2csItems: B2csSummaryItem[]; salesRecords: InvoiceRecord[] } {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const b2csItems: B2csSummaryItem[] = [];
  const salesRecords: InvoiceRecord[] = [];

  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
    const lowerParts = parts.map((p) => p.toLowerCase());
    if (
      lowerParts.includes('type') &&
      lowerParts.some((p) => p.includes('place of supply') || p.includes('pos')) &&
      lowerParts.includes('rate')
    ) {
      headerIndex = i;
      headers = lowerParts;
      break;
    }
  }

  if (headerIndex === -1) {
    // Fallback: standard CSV with headers on row 0
    headerIndex = 0;
    headers = lines[0].split(',').map((p) => p.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  }

  const getCol = (parts: string[], ...keywords: string[]): string => {
    for (const kw of keywords) {
      const idx = headers.findIndex((h) => h.includes(kw));
      if (idx !== -1 && parts[idx] !== undefined) {
        return parts[idx].trim().replace(/^["']|["']$/g, '');
      }
    }
    return '';
  };

  const supStateCode = supplierGstin.slice(0, 2);

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith(',,,') || line.toLowerCase().includes('total')) continue;

    // Handle quoted values containing commas
    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const parts: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      let val = match[1] || '';
      val = val.replace(/^"|"$/g, '').trim();
      parts.push(val);
      if (regex.lastIndex >= line.length) break;
    }

    if (parts.length < 3) continue;

    const typRaw = getCol(parts, 'type') || 'E';
    const posRaw = getCol(parts, 'place of supply', 'pos');
    if (!posRaw) continue;

    const { stateCode: posCode, stateName: posName } = getStandardStatePos(posRaw);
    const rateRaw = getCol(parts, 'rate');
    const taxableRaw = getCol(parts, 'taxable value', 'taxable');
    const cessRaw = getCol(parts, 'cess amount', 'cess');
    const etinRaw = getCol(parts, 'e-commerce gstin', 'etin') || '07AAICA3918J1CV';

    const rate = determineGstRate(100, 18, rateRaw);
    const txval = parseFloat(taxableRaw.replace(/[^\d.-]/g, '')) || 0;
    const csamt = parseFloat(cessRaw.replace(/[^\d.-]/g, '')) || 0;

    const isIntra = posCode === supStateCode;
    const sply_ty = isIntra ? 'INTRA' : 'INTER';

    const totalTax = Math.round(((txval * rate) / 100) * 100) / 100;
    let iamt = 0;
    let camt = 0;
    let samt = 0;

    if (isIntra) {
      camt = Math.round((totalTax / 2) * 100) / 100;
      samt = Math.round((totalTax - camt) * 100) / 100;
    } else {
      iamt = totalTax;
    }

    const item: B2csSummaryItem = {
      id: `b2cs-${posCode}-${rate}-${i}`,
      sply_ty,
      pos: posCode,
      posName,
      typ: typRaw.toUpperCase().includes('E') ? 'E' : 'OE',
      etin: etinRaw,
      rt: rate,
      txval,
      iamt,
      camt,
      samt,
      csamt,
      totval: Math.round((txval + totalTax + csamt) * 100) / 100,
    };
    b2csItems.push(item);

    // Also create InvoiceRecord for standard Sales Reconciliation
    const invNum = `AMZN-B2CS-${posCode}-${rate}%-${i}`;
    salesRecords.push({
      id: `amzn-sale-${i}-${Date.now()}`,
      source: 'sales',
      gstin: 'URP',
      vendorName: `Amazon Retail Consumer (${posName})`,
      invoiceNumber: invNum,
      rawInvoiceNumber: invNum,
      invoiceDate: new Date().toISOString().slice(0, 10),
      taxableValue: txval,
      igst: iamt,
      cgst: camt,
      sgst: samt,
      cess: csamt,
      totalTax,
      invoiceValue: txval + totalTax + csamt,
      placeOfSupply: `${posCode}-${posName}`,
      invoiceType: 'B2CS',
      itcAvailable: true,
      financialYear: period?.fy || 'FY 2024-25',
      taxPeriod: period?.month || '10',
      vendorGstin: supplierGstin,
      billToName: `Amazon Buyer (${posName})`,
      billToGstin: 'URP',
      gstRate: rate,
      ecommerceGstin: etinRaw,
      ecommerceType: 'E',
      notes: `Amazon E-Commerce B2CS Summary: POS=${posCode} | Rate=${rate}% | Operator=${etinRaw}`,
    });
  }

  return { b2csItems, salesRecords };
}

/**
 * Parses Amazon Summary for HSN CSV text
 */
export function parseAmazonHsnSummary(csvText: string): HsnSummaryItem[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: HsnSummaryItem[] = [];

  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
    const lowerParts = parts.map((p) => p.toLowerCase());
    if (lowerParts.includes('hsn') && (lowerParts.includes('uqc') || lowerParts.includes('rate'))) {
      headerIndex = i;
      headers = lowerParts;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = 0;
    headers = lines[0].split(',').map((p) => p.trim().toLowerCase().replace(/^["']|["']$/g, ''));
  }

  const getCol = (parts: string[], ...keywords: string[]): string => {
    for (const kw of keywords) {
      const idx = headers.findIndex((h) => h.includes(kw));
      if (idx !== -1 && parts[idx] !== undefined) {
        return parts[idx].trim().replace(/^["']|["']$/g, '');
      }
    }
    return '';
  };

  const getNum = (parts: string[], ...keywords: string[]): number => {
    const str = getCol(parts, ...keywords);
    if (!str) return 0;
    const parsed = parseFloat(str.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.startsWith(',,,') || line.toLowerCase().includes('total')) continue;

    const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
    const parts: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      let val = match[1] || '';
      val = val.replace(/^"|"$/g, '').trim();
      parts.push(val);
      if (regex.lastIndex >= line.length) break;
    }

    if (parts.length < 3) continue;

    const hsn = getCol(parts, 'hsn', 'hsn_sc', 'hsn code');
    if (!hsn) continue;

    const desc = getCol(parts, 'description', 'desc');
    const uqc = getCol(parts, 'uqc', 'unit') || 'PCS';
    const qty = getNum(parts, 'quantity', 'qty', 'total quantity');
    const rateRaw = getCol(parts, 'rate');
    const rate = determineGstRate(100, 18, rateRaw);
    const totval = getNum(parts, 'total value', 'totval');
    const txval = getNum(parts, 'taxable value', 'txval', 'taxable');
    const iamt = getNum(parts, 'integrated tax', 'iamt', 'igst');
    const camt = getNum(parts, 'central tax', 'camt', 'cgst');
    const samt = getNum(parts, 'state/ut tax', 'state tax', 'samt', 'sgst');
    const csamt = getNum(parts, 'cess', 'csamt');

    items.push({
      id: `hsn-${hsn}-${rate}-${i}`,
      num: items.length + 1,
      hsn_sc: hsn,
      desc,
      uqc: uqc.toUpperCase(),
      qty,
      rt: rate,
      totval: totval || txval + iamt + camt + samt + csamt,
      txval,
      iamt,
      camt,
      samt,
      csamt,
    });
  }

  return items;
}

/**
 * Aggregates B2CS Table 7 items from Invoice records
 */
export function generateB2csSummaryFromInvoices(
  invoices: InvoiceRecord[],
  supplierGstin: string = '07AAECO2378J1Z6'
): B2csSummaryItem[] {
  const supStateCode = supplierGstin.slice(0, 2);
  const grouped: Record<string, B2csSummaryItem> = {};

  invoices.forEach((inv) => {
    // Only B2C unregistered supplies or explicitly marked B2CS
    const isB2b = inv.gstin && inv.gstin !== 'URP' && inv.gstin.length === 15;
    if (isB2b && inv.invoiceType !== 'B2CS') return;

    const { stateCode: posCode, stateName: posName } = getStandardStatePos(inv.placeOfSupply || supStateCode);
    const rate = determineGstRate(inv.taxableValue, inv.totalTax, inv.gstRate);
    const typ: 'OE' | 'E' = inv.ecommerceType || (inv.ecommerceGstin || inv.notes?.toLowerCase().includes('meesho') || inv.notes?.toLowerCase().includes('amazon') ? 'E' : 'OE');
    const etin = inv.ecommerceGstin || (typ === 'E' ? (inv.notes?.toLowerCase().includes('amazon') ? '07AAICA3918J1CV' : '07AAECO2378J1Z6') : undefined);
    const isIntra = posCode === supStateCode;
    const sply_ty: 'INTER' | 'INTRA' = isIntra ? 'INTRA' : 'INTER';

    const groupKey = `${posCode}_${rate}_${typ}_${etin || ''}`;

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        id: `b2cs-${groupKey}`,
        sply_ty,
        pos: posCode,
        posName,
        typ,
        etin,
        rt: rate,
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
        totval: 0,
      };
    }

    grouped[groupKey].txval += inv.taxableValue;
    grouped[groupKey].iamt += inv.igst;
    grouped[groupKey].camt += inv.cgst;
    grouped[groupKey].samt += inv.sgst;
    grouped[groupKey].csamt += inv.cess || 0;
    grouped[groupKey].totval = (grouped[groupKey].totval || 0) + inv.invoiceValue;
  });

  return Object.values(grouped).map((item) => ({
    ...item,
    txval: Math.round(item.txval * 100) / 100,
    iamt: Math.round(item.iamt * 100) / 100,
    camt: Math.round(item.camt * 100) / 100,
    samt: Math.round(item.samt * 100) / 100,
    csamt: Math.round(item.csamt * 100) / 100,
    totval: Math.round((item.totval || 0) * 100) / 100,
  }));
}

/**
 * Aggregates HSN Table 12 items from Invoice records
 */
export function generateHsnSummaryFromInvoices(
  invoices: InvoiceRecord[]
): HsnSummaryItem[] {
  const grouped: Record<string, HsnSummaryItem> = {};

  invoices.forEach((inv) => {
    // Extract HSN code
    let hsn = inv.hsnCode;
    if (!hsn && inv.notes) {
      const match = inv.notes.match(/HSN=([a-zA-Z0-9]+)/i);
      if (match) hsn = match[1];
    }
    if (!hsn) {
      hsn = '999999'; // General / fallback goods code
    }

    const rate = determineGstRate(inv.taxableValue, inv.totalTax, inv.gstRate);
    const uqc = inv.uqc || 'PCS';
    const qty = inv.quantity || 1;
    const groupKey = `${hsn}_${rate}_${uqc}`;

    if (!grouped[groupKey]) {
      grouped[groupKey] = {
        id: `hsn-${groupKey}`,
        num: 0,
        hsn_sc: hsn,
        desc: inv.itemsSummary || 'Goods & Services Outward Supply',
        uqc,
        qty: 0,
        rt: rate,
        totval: 0,
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
      };
    }

    grouped[groupKey].qty += qty;
    grouped[groupKey].txval += inv.taxableValue;
    grouped[groupKey].iamt += inv.igst;
    grouped[groupKey].camt += inv.cgst;
    grouped[groupKey].samt += inv.sgst;
    grouped[groupKey].csamt += inv.cess || 0;
    grouped[groupKey].totval += inv.invoiceValue;
  });

  return Object.values(grouped).map((item, idx) => ({
    ...item,
    num: idx + 1,
    qty: Math.round(item.qty * 100) / 100,
    txval: Math.round(item.txval * 100) / 100,
    iamt: Math.round(item.iamt * 100) / 100,
    camt: Math.round(item.camt * 100) / 100,
    samt: Math.round(item.samt * 100) / 100,
    csamt: Math.round(item.csamt * 100) / 100,
    totval: Math.round(item.totval * 100) / 100,
  }));
}

/**
 * Generates Official GSTR-1 JSON matching GST Portal Schema
 */
export function generateGstr1Json(params: {
  taxpayerGstin: string;
  financialYear: string;
  taxPeriod: string;
  invoices: InvoiceRecord[];
  hsnItems?: HsnSummaryItem[];
  b2csItems?: B2csSummaryItem[];
}): Gstr1JsonPayload {
  const { taxpayerGstin, financialYear, taxPeriod, invoices, hsnItems, b2csItems } = params;
  const fp = formatGstr1FilingPeriod(taxPeriod, financialYear);

  // Group B2B by Recipient GSTIN
  const b2bMap: Record<string, any[]> = {};
  const b2bInvoices = invoices.filter((i) => i.gstin && i.gstin !== 'URP' && i.gstin.length === 15 && i.invoiceType !== 'B2CS');

  b2bInvoices.forEach((inv) => {
    const ctin = inv.gstin.toUpperCase();
    if (!b2bMap[ctin]) b2bMap[ctin] = [];

    const { stateCode: posCode } = getStandardStatePos(inv.placeOfSupply || ctin.slice(0, 2));
    const rate = determineGstRate(inv.taxableValue, inv.totalTax, inv.gstRate);

    // Format date as DD-MM-YYYY
    let idtFormatted = '01-01-2025';
    if (inv.invoiceDate) {
      const parts = inv.invoiceDate.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          idtFormatted = `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
        } else {
          idtFormatted = `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
        }
      }
    }

    const itemDet: any = {
      txval: Math.round(inv.taxableValue * 100) / 100,
      rt: rate,
      csamt: Math.round((inv.cess || 0) * 100) / 100,
    };

    if (inv.igst > 0) {
      itemDet.iamt = Math.round(inv.igst * 100) / 100;
    } else {
      itemDet.camt = Math.round(inv.cgst * 100) / 100;
      itemDet.samt = Math.round(inv.sgst * 100) / 100;
    }

    b2bMap[ctin].push({
      inum: inv.invoiceNumber,
      idt: idtFormatted,
      val: Math.round(inv.invoiceValue * 100) / 100,
      pos: posCode,
      rchrg: inv.reverseCharge ? 'Y' : 'N',
      inv_typ: 'R',
      itms: [
        {
          num: 1,
          itm_det: itemDet,
        },
      ],
    });
  });

  const b2bPayload = Object.entries(b2bMap).map(([ctin, invList]) => ({
    ctin,
    inv: invList,
  }));

  // Generate or use B2CS
  const finalB2cs = (b2csItems && b2csItems.length > 0)
    ? b2csItems
    : generateB2csSummaryFromInvoices(invoices, taxpayerGstin);

  const b2csPayload = finalB2cs.map((item) => {
    const entry: any = {
      sply_ty: item.sply_ty,
      pos: item.pos,
      typ: item.typ,
      rt: item.rt,
      txval: Math.round(item.txval * 100) / 100,
      csamt: Math.round(item.csamt * 100) / 100,
    };
    if (item.typ === 'E' && item.etin) {
      entry.etin = item.etin;
    }
    if (item.sply_ty === 'INTER') {
      entry.iamt = Math.round(item.iamt * 100) / 100;
    } else {
      entry.camt = Math.round(item.camt * 100) / 100;
      entry.samt = Math.round(item.samt * 100) / 100;
    }
    return entry;
  });

  // Generate or use HSN
  const finalHsn = (hsnItems && hsnItems.length > 0)
    ? hsnItems
    : generateHsnSummaryFromInvoices(invoices);

  const hsnPayload = {
    data: finalHsn.map((h, idx) => ({
      num: idx + 1,
      hsn_sc: h.hsn_sc,
      desc: h.desc || '',
      uqc: h.uqc || 'PCS',
      qty: Math.round(h.qty * 100) / 100,
      rt: h.rt,
      txval: Math.round(h.txval * 100) / 100,
      iamt: Math.round(h.iamt * 100) / 100,
      camt: Math.round(h.camt * 100) / 100,
      samt: Math.round(h.samt * 100) / 100,
      csamt: Math.round(h.csamt * 100) / 100,
    })),
  };

  // Document Issue (Table 13)
  const totalInvoicesCount = invoices.length;
  const docIssuePayload = {
    doc_det: [
      {
        doc_num: 1,
        doc_typ: 'Invoices for outward supply',
        docs: [
          {
            num: 1,
            to: invoices.length > 0 ? invoices[invoices.length - 1].invoiceNumber : '1',
            from: invoices.length > 0 ? invoices[0].invoiceNumber : '1',
            totnum: totalInvoicesCount,
            cancel: 0,
            net_issue: totalInvoicesCount,
          },
        ],
      },
    ],
  };

  const payload: Gstr1JsonPayload = {
    gstin: taxpayerGstin || '07CTZPG6455M1ZP',
    fp,
    version: 'GST3.2',
    hash: 'hash',
  };

  if (b2bPayload.length > 0) {
    payload.b2b = b2bPayload;
  }
  if (b2csPayload.length > 0) {
    payload.b2cs = b2csPayload;
  }
  if (docIssuePayload.doc_det[0].docs[0].totnum > 0) {
    payload.doc_issue = docIssuePayload;
  }
  if (hsnPayload.data.length > 0) {
    payload.hsn = hsnPayload;
  }

  return payload;
}

export interface DocSeriesConfig {
  num: number;
  from: string;
  to: string;
  totnum: number;
  cancel: number;
  net_issue: number;
}

/**
 * Generates Official Quarterly GSTR-1 JSON Schema (GST3.1.6)
 * specifically designed for Quarterly Filers (QRMP Scheme & E-Commerce Sellers).
 * Contains:
 * - b2cs: State-wise, Rate-wise consumer turnover (OE typ)
 * - hsn: { hsn_b2c: [ ... ] } itemized HSN breakdown
 * - supeco: { clttx: [ ... ] } aggregated supplies through E-Commerce Operator (Sec 52 TCS)
 * - doc_issue: Table 13 document details (doc_num 1: Invoices, doc_num 5: Credit Notes)
 */
export function generateGstr1QuarterlyJson(params: {
  taxpayerGstin: string;
  financialYear: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  invoices: InvoiceRecord[];
  hsnItems?: HsnSummaryItem[];
  b2csItems?: B2csSummaryItem[];
  ecommerceGstin?: string;
  customDocIssue?: {
    outwardDocs?: DocSeriesConfig[];
    creditNoteDocs?: DocSeriesConfig[];
  };
}): Gstr1QuarterlyJsonPayload {
  const {
    taxpayerGstin,
    financialYear,
    quarter,
    invoices,
    hsnItems,
    b2csItems,
    ecommerceGstin,
    customDocIssue,
  } = params;

  const fp = formatGstr1QuarterlyFilingPeriod(quarter, financialYear);

  // 1. Prepare B2CS items
  const sourceB2cs =
    b2csItems && b2csItems.length > 0
      ? b2csItems
      : generateB2csSummaryFromInvoices(invoices, taxpayerGstin);

  // Group B2CS by pos + rt + sply_ty to ensure clean aggregation
  const b2csGrouped: Record<
    string,
    {
      sply_ty: 'INTER' | 'INTRA';
      rt: number;
      typ: string;
      pos: string;
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }
  > = {};

  sourceB2cs.forEach((item) => {
    // Clean POS to 2-digit number (e.g. "07", "35")
    const cleanPos = item.pos.replace(/[^\d]/g, '').padStart(2, '0').slice(-2);
    const key = `${item.sply_ty}_${item.rt}_${cleanPos}`;

    if (!b2csGrouped[key]) {
      b2csGrouped[key] = {
        sply_ty: item.sply_ty,
        rt: item.rt,
        typ: 'OE',
        pos: cleanPos,
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
      };
    }

    b2csGrouped[key].txval += item.txval;
    b2csGrouped[key].iamt += item.iamt || 0;
    b2csGrouped[key].camt += item.camt || 0;
    b2csGrouped[key].samt += item.samt || 0;
    b2csGrouped[key].csamt += item.csamt || 0;
  });

  const b2csArray = Object.values(b2csGrouped).map((item) => {
    const txval = Math.round(item.txval * 100) / 100;
    const csamt = Math.round(item.csamt * 100) / 100;

    if (item.sply_ty === 'INTER') {
      return {
        sply_ty: 'INTER' as const,
        rt: item.rt,
        typ: item.typ,
        pos: item.pos,
        txval,
        iamt: Math.round(item.iamt * 100) / 100,
        csamt,
      };
    } else {
      return {
        sply_ty: 'INTRA' as const,
        rt: item.rt,
        typ: item.typ,
        pos: item.pos,
        txval,
        camt: Math.round(item.camt * 100) / 100,
        samt: Math.round(item.samt * 100) / 100,
        csamt,
      };
    }
  });

  // 2. Prepare HSN items -> under hsn_b2c
  const sourceHsn =
    hsnItems && hsnItems.length > 0
      ? hsnItems
      : generateHsnSummaryFromInvoices(invoices);

  const hsnB2cArray = sourceHsn.map((h, idx) => ({
    num: idx + 1,
    hsn_sc: String(h.hsn_sc || '999999').trim(),
    uqc: (h.uqc || 'PCS').toUpperCase(),
    qty: Math.round(h.qty * 100) / 100,
    rt: h.rt,
    txval: Math.round(h.txval * 100) / 100,
    iamt: Math.round(h.iamt * 100) / 100,
    samt: Math.round(h.samt * 100) / 100,
    camt: Math.round(h.camt * 100) / 100,
    csamt: Math.round((h.csamt || 0) * 100) / 100,
  }));

  // 3. Prepare SUPECO (Supplies made through E-Commerce Operator - Table 14 / Table 15)
  // Aggregate total turnover supplied through the ECO
  const totalSuppval = b2csArray.reduce((acc, curr) => acc + curr.txval, 0);
  const totalIgst = b2csArray.reduce((acc, curr) => acc + (curr.iamt || 0), 0);
  const totalCgst = b2csArray.reduce((acc, curr) => acc + (curr.camt || 0), 0);
  const totalSgst = b2csArray.reduce((acc, curr) => acc + (curr.samt || 0), 0);
  const totalCess = b2csArray.reduce((acc, curr) => acc + (curr.csamt || 0), 0);

  // Default ETIN: Meesho GSTIN '07AARCM9332R1CQ' or user-supplied
  const ecoEtin =
    ecommerceGstin ||
    sourceB2cs.find((i) => i.etin)?.etin ||
    '07AARCM9332R1CQ';

  const supecoPayload = {
    clttx: [
      {
        etin: ecoEtin.trim().toUpperCase(),
        suppval: Math.round(totalSuppval * 100) / 100,
        igst: Math.round(totalIgst * 100) / 100,
        cgst: Math.round(totalCgst * 100) / 100,
        sgst: Math.round(totalSgst * 100) / 100,
        cess: Math.round(totalCess * 100) / 100,
        flag: 'N' as const,
      },
    ],
  };

  // 4. Prepare DOC_ISSUE (Table 13)
  // Separate Outward Invoices (doc_num 1) and Credit Notes (doc_num 5)
  const outwardDocs: DocSeriesConfig[] = [];
  const creditNoteDocs: DocSeriesConfig[] = [];

  if (customDocIssue?.outwardDocs && customDocIssue.outwardDocs.length > 0) {
    outwardDocs.push(...customDocIssue.outwardDocs);
  } else {
    // Auto-derive from invoices
    const normalInvoices = invoices.filter(
      (inv) =>
        inv.taxableValue >= 0 &&
        inv.invoiceType !== 'CR' &&
        !inv.invoiceNumber.toLowerCase().includes('cr')
    );

    if (normalInvoices.length > 0) {
      // Sort to find ranges
      const sorted = [...normalInvoices].sort((a, b) =>
        a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, { numeric: true })
      );
      outwardDocs.push({
        num: 1,
        from: sorted[0].invoiceNumber,
        to: sorted[sorted.length - 1].invoiceNumber,
        totnum: sorted.length,
        cancel: 0,
        net_issue: sorted.length,
      });
    } else {
      // Fallback series based on b2cs count
      const estimatedCount = Math.max(b2csArray.length * 20, 100);
      outwardDocs.push({
        num: 1,
        from: 'emxmd263710',
        to: `emxmd${263710 + estimatedCount - 1}`,
        totnum: estimatedCount,
        cancel: 0,
        net_issue: estimatedCount,
      });
    }
  }

  if (customDocIssue?.creditNoteDocs && customDocIssue.creditNoteDocs.length > 0) {
    creditNoteDocs.push(...customDocIssue.creditNoteDocs);
  } else {
    // Auto-derive credit notes
    const creditInvoices = invoices.filter(
      (inv) =>
        inv.taxableValue < 0 ||
        inv.invoiceType === 'CR' ||
        inv.invoiceNumber.toLowerCase().includes('cr') ||
        inv.invoiceNumber.includes('C')
    );

    if (creditInvoices.length > 0) {
      const sorted = [...creditInvoices].sort((a, b) =>
        a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, { numeric: true })
      );
      creditNoteDocs.push({
        num: 1,
        from: sorted[0].invoiceNumber,
        to: sorted[sorted.length - 1].invoiceNumber,
        totnum: sorted.length,
        cancel: 0,
        net_issue: sorted.length,
      });
    } else {
      // Optional: include credit notes if there were negative returns in B2CS or HSN
      const hasNegativeItems =
        b2csArray.some((b) => b.txval < 0) || hsnB2cArray.some((h) => h.qty < 0 || h.txval < 0);
      if (hasNegativeItems) {
        creditNoteDocs.push({
          num: 1,
          from: 'emxmd26C1487',
          to: 'emxmd26C1610',
          totnum: 121,
          cancel: 0,
          net_issue: 121,
        });
      }
    }
  }

  const docDetList: any[] = [];
  if (outwardDocs.length > 0) {
    docDetList.push({
      doc_num: 1,
      doc_typ: 'Invoices for outward supply',
      docs: outwardDocs.map((d, i) => ({
        num: i + 1,
        from: d.from,
        to: d.to,
        totnum: d.totnum,
        cancel: d.cancel || 0,
        net_issue: d.net_issue || d.totnum - (d.cancel || 0),
      })),
    });
  }

  if (creditNoteDocs.length > 0) {
    docDetList.push({
      doc_num: 5,
      doc_typ: 'Credit Note',
      docs: creditNoteDocs.map((d, i) => ({
        num: i + 1,
        from: d.from,
        to: d.to,
        totnum: d.totnum,
        cancel: d.cancel || 0,
        net_issue: d.net_issue || d.totnum - (d.cancel || 0),
      })),
    });
  }

  const payload: Gstr1QuarterlyJsonPayload = {
    gstin: taxpayerGstin || '07AUVPK7442B1ZF',
    fp,
    version: 'GST3.1.6',
    hash: 'hash',
    b2cs: b2csArray,
    hsn: {
      hsn_b2c: hsnB2cArray,
    },
    supeco: supecoPayload,
    doc_issue: {
      doc_det: docDetList,
    },
  };

  return payload;
}

/**
 * Downloads generated GSTR-1 JSON directly to user's computer
 */
export function downloadGstr1JsonFile(
  payload: Gstr1JsonPayload | Gstr1QuarterlyJsonPayload,
  filename?: string
) {
  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `GSTR1_${payload.gstin}_${payload.fp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
