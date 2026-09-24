import { InvoiceRecord, SalesInvoiceRecord } from '../types';
import { parseDate } from './gstEngine';

export interface MeeshoRow {
  month?: string;
  order_date?: string;
  identifier?: string;
  order_num?: string;
  sub_order_num?: string;
  quantity?: string | number;
  order_status?: string;
  manifesttime?: string;
  sup_name?: string;
  state?: string;
  pin?: string;
  reseller_state?: string;
  reseller_pin?: string;
  end_customer_state?: string;
  end_customer_pin?: string;
  gstin?: string;
  hsn_code?: string;
  gst_amount?: string | number;
  gst_rate?: string | number;
  meesho_price?: string | number;
  net_commission?: string | number;
  commission_gst?: string | number;
  adj?: string | number;
  shipping_charges_total?: string | number;
  gst?: string | number;
  taxable_shipping?: string | number;
  shipping_gst_18_percent?: string | number;
  meesho_price_plus_shipping_charges_total?: string | number;
  tcs_taxable_amount?: string | number;
  end_customer_state_new?: string;
  enrollment_no?: string;
  financial_year?: string;
  month_number?: string | number;
  supplier_id?: string | number;
  // Return report specific fields
  cancel_return_date?: string;
  penalty?: string | number;
}

export interface MeeshoSummary {
  totalRows: number;
  deliveredCount: number;
  deliveredTaxable: number;
  deliveredTax: number;
  shippedCount: number;
  shippedTaxable: number;
  shippedTax: number;
  returnCount: number;
  returnTaxable: number;
  returnTax: number;
  rtoCount: number;
  rtoTaxable: number;
  rtoTax: number;
  cancelledCount: number;
  cancelledTaxable: number;
  cancelledTax: number;
  netTaxableTurnover: number;
  netGstLiability: number;
  netIgst: number;
  netCgst: number;
  netSgst: number;
  uniqueStatesCount: number;
  supplierName: string;
  supplierGstin: string;
}

export const MEESHO_FORWARD_SALES_HEADERS: string[] = [
  'month',
  'order_date',
  'identifier',
  'order_num',
  'sub_order_num',
  'quantity',
  'order_status',
  'manifesttime',
  'sup_name',
  'state',
  'pin',
  'reseller_state',
  'reseller_pin',
  'end_customer_state',
  'end_customer_pin',
  'gstin',
  'hsn_code',
  'gst_amount',
  'gst_rate',
  'meesho_price',
  'net_commission',
  'commission_gst',
  'adj',
  'shipping_charges_total',
  'gst',
  'taxable_shipping',
  'shipping_gst_18_percent',
  'meesho_price_plus_shipping_charges_total',
  'tcs_taxable_amount',
  'end_customer_state_new',
  'enrollment_no',
  'financial_year',
  'month_number',
  'supplier_id',
];

export const MEESHO_RETURNS_HEADERS: string[] = [
  'month',
  'order_date',
  'identifier',
  'order_num',
  'sub_order_num',
  'order_status',
  'manifesttime',
  'sup_name',
  'state',
  'pin',
  'reseller_state',
  'reseller_pin',
  'gstin',
  'hsn_code',
  'gst_amount',
  'gst_rate',
  'end_customer_pin',
  'end_customer_state',
  'meesho_price',
  'net_commission',
  'commission_gst',
  'adj',
  'shipping_charges_total',
  'quantity',
  'penalty',
  'cancel_return_date',
  'gst',
  'taxable_shipping',
  'shipping_gst_18_percent',
  'meesho_price_plus_shipping_charges_total',
  'tcs_taxable_amount',
  'end_customer_state_new',
  'enrollment_no',
  'financial_year',
  'month_number',
  'supplier_id',
];

export const MEESHO_FORWARD_SAMPLE_DATA: (string | number)[][] = [
  [
    '2024-10-01',
    '2024-10-16',
    '5mcw9',
    '77833560212099776',
    '77833560212099776_1',
    1,
    'Delivered',
    '2024-10-16',
    'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED',
    'Delhi',
    '110035',
    'Delhi',
    '',
    'Delhi',
    '110088',
    '07AAECO2378J1Z6',
    '711719',
    5.56,
    3.0,
    191.0,
    0.0,
    0.0,
    62,
    0,
    1.03,
    42.72,
    7.69,
    173.0,
    167.96,
    'DELHI',
    '',
    '2024',
    10,
    1887707,
  ],
  [
    '2024-10-01',
    '2024-10-15',
    '5mcw9',
    '77665285825557312',
    '77665285825557312_1',
    1,
    'Delivered',
    '2024-10-16',
    'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED',
    'Delhi',
    '110035',
    'Delhi',
    '110094',
    'Delhi',
    '110094',
    '07AAECO2378J1Z6',
    '7117',
    9.06,
    3.0,
    311.0,
    0.0,
    0.0,
    62,
    0,
    1.03,
    29.13,
    5.24,
    279.0,
    270.87,
    'DELHI',
    '',
    '2024',
    10,
    1887707,
  ],
  [
    '2024-10-01',
    '2024-10-03',
    '5mcw9',
    '73354031635968516',
    '73354031635968516_1',
    1,
    'Delivered',
    '2024-10-04',
    'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED',
    'Delhi',
    '110035',
    'Chhattisgarh',
    '',
    'Chhattisgarh',
    '491228',
    '07AAECO2378J1Z6',
    '711719',
    5.8,
    3.0,
    199.0,
    0.0,
    0.0,
    62,
    0,
    1.03,
    60.19,
    10.83,
    199.0,
    193.2,
    'CHHATTISGARH',
    '',
    '2024',
    10,
    1887707,
  ],
  [
    '2024-10-01',
    '2024-10-19',
    '5mcw9',
    '79189893414900288',
    '79189893414900288_1',
    1,
    'Delivered',
    '2024-10-21',
    'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED',
    'Delhi',
    '110035',
    'Andhra Pradesh',
    '',
    'Andhra Pradesh',
    '518401',
    '07AAECO2378J1Z6',
    '7117',
    7.37,
    3.0,
    253.0,
    0.0,
    0.0,
    63,
    0,
    1.03,
    61.17,
    11.01,
    253.0,
    245.63,
    'ANDHRA PRADESH',
    '',
    '2024',
    10,
    1887707,
  ],
  [
    '2024-10-01',
    '2024-10-26',
    '5mcw9',
    '81592994449992576',
    '81592994449992576_1',
    1,
    'Shipped',
    '2024-10-26',
    'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED',
    'Delhi',
    '110035',
    'Madhya Pradesh',
    '',
    'Madhya Pradesh',
    '484665',
    '07AAECO2378J1Z6',
    '711719',
    4.66,
    3.0,
    160.0,
    0.0,
    0.0,
    64,
    0,
    1.03,
    62.14,
    11.18,
    160.0,
    155.34,
    'MADHYA PRADESH',
    '',
    '2024',
    10,
    1887707,
  ],
];

export const MEESHO_RETURNS_SAMPLE_DATA: (string | number)[][] = [
  [
    '2024-10-01',
    '2024-09-30',
    '5mcw9',
    '72278799210804096',
    '72278799210804096_1',
    'rto',
    '2024-09-30',
    'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED',
    'Delhi',
    '504273',
    'Telangana',
    '',
    '07AAECO2378J1Z6',
    '711719',
    7.37,
    3.0,
    '504273',
    'Telangana',
    253.0,
    0.0,
    0.0,
    61,
    0,
    1,
    0.0,
    '2024-10-08',
    1.03,
    59.22,
    10.66,
    253.0,
    245.63,
    'TELANGANA',
    '',
    '2024',
    10,
    1887707,
  ],
  [
    '2024-10-01',
    '2024-10-18',
    '5mcw9',
    '78779276904354496',
    '78779276904354496_1',
    'Return',
    '2024-10-19',
    'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED',
    'Delhi',
    '208004',
    'Uttar Pradesh',
    '200408',
    '07AAECO2378J1Z6',
    '711719',
    5.42,
    3.0,
    '208004',
    'Uttar Pradesh',
    186.0,
    0.0,
    0.0,
    62,
    0,
    1,
    0.0,
    '2024-10-24',
    1.03,
    52.43,
    9.44,
    178.0,
    172.82,
    'UTTAR PRADESH',
    '',
    '2024',
    10,
    1887707,
  ],
  [
    '2024-10-01',
    '2024-10-11',
    '5mcw9',
    '76245002316966080',
    '76245002316966080_1',
    'Return',
    '2024-10-12',
    'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED',
    'Delhi',
    '575015',
    'Karnataka',
    '575015',
    '07AAECO2378J1Z6',
    '7117',
    7.66,
    3.0,
    '575015',
    'Karnataka',
    263.0,
    0.0,
    0.0,
    64,
    0,
    1,
    0.0,
    '2024-10-20',
    1.03,
    43.69,
    7.86,
    244.0,
    236.89,
    'KARNATAKA',
    '',
    '2024',
    10,
    1887707,
  ],
  [
    '2024-10-01',
    '2024-10-07',
    '5mcw9',
    '74899561537104064',
    '74899561537104064_1',
    'Return',
    '2024-10-08',
    'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED',
    'Delhi',
    '812005',
    'Bihar',
    '',
    '07AAECO2378J1Z6',
    '7117',
    7.66,
    3.0,
    '812005',
    'Bihar',
    263.0,
    0.0,
    0.0,
    64,
    0,
    1,
    0.0,
    '2024-10-22',
    1.03,
    62.14,
    11.18,
    263.0,
    255.34,
    'BIHAR',
    '',
    '2024',
    10,
    1887707,
  ],
  [
    '2024-10-01',
    '2024-10-03',
    '5mcw9',
    '73360509155602624',
    '73360509155602624_1',
    'rto',
    '2024-10-04',
    'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED',
    'Delhi',
    '248198',
    'Uttarakhand',
    '248198',
    '07AAECO2378J1Z6',
    '711719',
    7.4,
    3.0,
    '248198',
    'Uttarakhand',
    254.0,
    0.0,
    0.0,
    62,
    0,
    1,
    0.0,
    '2024-10-08',
    1.03,
    48.54,
    8.74,
    242.0,
    234.95,
    'UTTARAKHAND',
    '',
    '2024',
    10,
    1887707,
  ],
];

/**
 * Detects if a dataset has Meesho structure
 */
export function isMeeshoData(keys: string[]): boolean {
  const normKeys = keys.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const hasSubOrder = normKeys.some((k) => k.includes('subordernum') || k.includes('ordernum'));
  const hasMeeshoPrice = normKeys.some((k) => k.includes('meeshoprice') || k.includes('tcstaxableamount'));
  const hasGstAmount = normKeys.some((k) => k.includes('gstamount') || k.includes('gstrate'));
  return hasSubOrder && (hasMeeshoPrice || hasGstAmount);
}

/**
 * Standardizes State Names & Extracts GST State Code
 */
export function getStandardStatePos(stateRaw: string): { stateCode: string; stateName: string } {
  const clean = (stateRaw || '').trim().toUpperCase();
  const stateMap: Record<string, string> = {
    DELHI: '07',
    'UTTAR PRADESH': '09',
    HARYANA: '06',
    PUNJAB: '03',
    RAJASTHAN: '08',
    BIHAR: '10',
    MAHARASHTRA: '27',
    KARNATAKA: '29',
    'ANDHRA PRADESH': '37',
    TELANGANA: '36',
    'MADHYA PRADESH': '23',
    'WEST BENGAL': '19',
    CHHATTISGARH: '22',
    UTTARAKHAND: '05',
    'JAMMU AND KASHMIR': '01',
    'JAMMU & KASHMIR': '01',
    GUJARAT: '24',
    'TAMIL NADU': '33',
    KERALA: '32',
    ODISHA: '21',
    ASSAM: '18',
    JHARKHAND: '20',
  };

  for (const [name, code] of Object.entries(stateMap)) {
    if (clean.includes(name) || name.includes(clean)) {
      return { stateCode: code, stateName: name };
    }
  }

  // If starts with 2 digits
  const numMatch = clean.match(/^(\d{2})/);
  if (numMatch) {
    return { stateCode: numMatch[1], stateName: clean.replace(/^\d{2}[-\s]*/, '') || clean };
  }

  return { stateCode: '99', stateName: clean || 'Other Territory' };
}

/**
 * Parses Meesho raw records into statutory InvoiceRecord array
 */
export function parseMeeshoRecords(rows: Record<string, any>[]): {
  records: InvoiceRecord[];
  summary: MeeshoSummary;
} {
  const records: InvoiceRecord[] = [];

  let deliveredCount = 0;
  let deliveredTaxable = 0;
  let deliveredTax = 0;

  let shippedCount = 0;
  let shippedTaxable = 0;
  let shippedTax = 0;

  let returnCount = 0;
  let returnTaxable = 0;
  let returnTax = 0;

  let rtoCount = 0;
  let rtoTaxable = 0;
  let rtoTax = 0;

  let cancelledCount = 0;
  let cancelledTaxable = 0;
  let cancelledTax = 0;

  let netIgst = 0;
  let netCgst = 0;
  let netSgst = 0;

  const uniqueStates = new Set<string>();
  let supName = '';
  let supGstin = '';

  rows.forEach((row, idx) => {
    // Find keys flexibly
    const getVal = (...keys: string[]): string => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '' && String(row[k]) !== 'null') {
          return String(row[k]).trim();
        }
      }
      return '';
    };

    const numVal = (...keys: string[]): number => {
      const v = getVal(...keys);
      if (!v) return 0;
      const parsed = parseFloat(v.replace(/[^\d.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };

    const orderNum = getVal('sub_order_num', 'order_num', 'orderNum', 'subOrderNum') || `MEESHO-${idx + 1}`;
    const orderStatusRaw = getVal('order_status', 'orderStatus', 'status').toLowerCase();
    const orderDate = parseDate(getVal('order_date', 'orderDate', 'manifesttime', 'month')) || new Date().toISOString().slice(0, 10);
    const cancelReturnDate = parseDate(getVal('cancel_return_date', 'cancelReturnDate'));
    
    // Status classification
    const isReturn = orderStatusRaw === 'return';
    const isRto = orderStatusRaw === 'rto';
    const isCancelled = orderStatusRaw === 'cancelled';
    const isDelivered = orderStatusRaw === 'delivered';
    const isShipped = orderStatusRaw === 'shipped';

    // Supplier Info
    const rowSupGstin = getVal('gstin', 'supplier_gstin').toUpperCase();
    const rowSupName = getVal('sup_name', 'supplier_name') || 'Meesho Seller Entity';
    const supState = getVal('state', 'supplier_state') || 'Delhi';

    if (rowSupGstin && !supGstin) supGstin = rowSupGstin;
    if (rowSupName && !supName) supName = rowSupName;

    // Customer / Destination State (POS)
    const endCustomerStateRaw = getVal('end_customer_state_new', 'end_customer_state', 'reseller_state') || supState;
    const { stateCode: posCode, stateName: posName } = getStandardStatePos(endCustomerStateRaw);
    uniqueStates.add(posName);

    // Financial Values
    // tcs_taxable_amount is assessable value
    const rawTaxable = numVal('tcs_taxable_amount', 'meesho_price');
    const rawGst = numVal('gst_amount', 'gst');
    const rawRate = numVal('gst_rate') || 3.0;
    const rawTotal = numVal('meesho_price_plus_shipping_charges_total') || (rawTaxable + rawGst);

    // Track aggregates by status
    if (isDelivered) {
      deliveredCount++;
      deliveredTaxable += rawTaxable;
      deliveredTax += rawGst;
    } else if (isShipped) {
      shippedCount++;
      shippedTaxable += rawTaxable;
      shippedTax += rawGst;
    } else if (isReturn) {
      returnCount++;
      returnTaxable += rawTaxable;
      returnTax += rawGst;
    } else if (isRto) {
      rtoCount++;
      rtoTaxable += rawTaxable;
      rtoTax += rawGst;
    } else if (isCancelled) {
      cancelledCount++;
      cancelledTaxable += rawTaxable;
      cancelledTax += rawGst;
    }

    // Determine if Intra or Inter-State
    // If supplier state matches customer state, it is intra-state (CGST + SGST)
    const supStateNorm = supState.trim().toLowerCase();
    const posNorm = posName.trim().toLowerCase();
    const isIntraState = supStateNorm.includes(posNorm) || posNorm.includes(supStateNorm);

    // Effective sign: Returns and RTOs are sales returns / credit notes (negative or CDNR)
    const isReversal = isReturn || isRto;
    const multiplier = isReversal ? -1 : 1;

    let rowIgst = 0;
    let rowCgst = 0;
    let rowSgst = 0;

    if (isIntraState) {
      rowCgst = Math.round((rawGst / 2) * 100) / 100;
      rowSgst = Math.round((rawGst - rowCgst) * 100) / 100;
    } else {
      rowIgst = rawGst;
    }

    if (!isCancelled) {
      netIgst += rowIgst * multiplier;
      netCgst += rowCgst * multiplier;
      netSgst += rowSgst * multiplier;
    }

    // Assign invoice type
    let invType = 'B2CS';
    if (isReversal) {
      invType = 'CDNR'; // Credit Note / Reversal
    } else if (isCancelled) {
      invType = 'CANCELLED';
    }

    const effectiveDate = (isReversal && cancelReturnDate) ? cancelReturnDate : orderDate;
    const posFormatted = `${posCode}-${posName}`;

    records.push({
      id: `meesho-${orderNum}-${idx}`,
      source: 'sales',
      gstin: 'URP', // Unregistered retail customer on Meesho
      vendorName: `Meesho Consumer (${posName})`,
      invoiceNumber: orderNum,
      rawInvoiceNumber: orderNum,
      invoiceDate: effectiveDate,
      taxableValue: Math.round(rawTaxable * multiplier * 100) / 100,
      igst: Math.round(rowIgst * multiplier * 100) / 100,
      cgst: Math.round(rowCgst * multiplier * 100) / 100,
      sgst: Math.round(rowSgst * multiplier * 100) / 100,
      cess: 0,
      totalTax: Math.round(rawGst * multiplier * 100) / 100,
      invoiceValue: Math.round(rawTotal * multiplier * 100) / 100,
      placeOfSupply: posFormatted,
      invoiceType: invType,
      itcAvailable: true,
      financialYear: getVal('financial_year') ? `FY ${getVal('financial_year')}` : 'FY 2024-25',
      taxPeriod: getVal('month_number') ? String(getVal('month_number')).padStart(2, '0') : '10',
      vendorGstin: rowSupGstin || supGstin,
      billToName: `Meesho Retail Buyer (${posName})`,
      billToGstin: 'URP',
      notes: `Meesho E-Commerce: Status=${getVal('order_status')} | HSN=${getVal('hsn_code')} | Rate=${rawRate}% | Operator=Fashnear Technologies`,
    });
  });

  const forwardTaxable = deliveredTaxable + shippedTaxable;
  const forwardTax = deliveredTax + shippedTax;
  const reversalTaxable = returnTaxable + rtoTaxable;
  const reversalTax = returnTax + rtoTax;

  const summary: MeeshoSummary = {
    totalRows: rows.length,
    deliveredCount,
    deliveredTaxable: Math.round(deliveredTaxable * 100) / 100,
    deliveredTax: Math.round(deliveredTax * 100) / 100,
    shippedCount,
    shippedTaxable: Math.round(shippedTaxable * 100) / 100,
    shippedTax: Math.round(shippedTax * 100) / 100,
    returnCount,
    returnTaxable: Math.round(returnTaxable * 100) / 100,
    returnTax: Math.round(returnTax * 100) / 100,
    rtoCount,
    rtoTaxable: Math.round(rtoTaxable * 100) / 100,
    rtoTax: Math.round(rtoTax * 100) / 100,
    cancelledCount,
    cancelledTaxable: Math.round(cancelledTaxable * 100) / 100,
    cancelledTax: Math.round(cancelledTax * 100) / 100,
    netTaxableTurnover: Math.round((forwardTaxable - reversalTaxable) * 100) / 100,
    netGstLiability: Math.round((forwardTax - reversalTax) * 100) / 100,
    netIgst: Math.round(netIgst * 100) / 100,
    netCgst: Math.round(netCgst * 100) / 100,
    netSgst: Math.round(netSgst * 100) / 100,
    uniqueStatesCount: uniqueStates.size,
    supplierName: supName || 'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED',
    supplierGstin: supGstin || '07AAECO2378J1Z6',
  };

  return { records, summary };
}

/**
 * Converts Meesho records to Accounting Sales Records
 */
export function convertMeeshoToSalesLedger(records: InvoiceRecord[]): SalesInvoiceRecord[] {
  return records.map((r, idx) => {
    const isCreditNote = r.taxableValue < 0 || r.invoiceType === 'CDNR';
    return {
      id: `meesho-sales-${idx}-${Date.now()}`,
      gstin: 'URP',
      customerName: r.billToName || `Meesho Retail Consumer (${r.placeOfSupply || 'All India'})`,
      invoiceNumber: r.invoiceNumber,
      invoiceDate: r.invoiceDate,
      taxableValue: r.taxableValue,
      igst: r.igst,
      cgst: r.cgst,
      sgst: r.sgst,
      cess: 0,
      totalTax: r.totalTax,
      invoiceValue: r.invoiceValue,
      placeOfSupply: r.placeOfSupply,
      financialYear: r.financialYear || 'FY 2024-25',
      taxPeriod: r.taxPeriod || '10',
      paymentStatus: 'PAID', // E-commerce payouts processed via Meesho payment cycle
      receivedAmount: isCreditNote ? 0 : r.invoiceValue,
      outstandingAmount: 0,
      notes: r.notes || 'Imported from Meesho E-Commerce GST Sales/Return Report',
    };
  });
}
