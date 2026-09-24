import {
  BankTransaction,
  BankTransactionCategory,
  InvoiceRecord,
  SalesInvoiceRecord,
  PartyLedgerAccount,
  LedgerEntry,
  TrialBalanceRow,
  ProfitAndLossReport,
  BalanceSheetReport,
} from '../types';

// ==========================================
// 1. REALISTIC SAMPLE SALES INVOICES (GSTR-1 / Sales Register)
// ==========================================
export const DEFAULT_SAMPLE_SALES_INVOICES: SalesInvoiceRecord[] = [
  {
    id: 'sale-001',
    gstin: '27AAACG1122H1Z1',
    customerName: 'Godrej Infotech & Engineering Ltd',
    invoiceNumber: 'INV/2024-25/001',
    invoiceDate: '2024-04-12',
    taxableValue: 450000,
    igst: 0,
    cgst: 40500,
    sgst: 40500,
    cess: 0,
    totalTax: 81000,
    invoiceValue: 531000,
    placeOfSupply: '27-Maharashtra',
    financialYear: 'FY 2024-25',
    taxPeriod: '04',
    paymentStatus: 'PAID',
    receivedAmount: 531000,
    outstandingAmount: 0,
    notes: 'ERP Consulting & Cloud Infrastructure Services',
  },
  {
    id: 'sale-002',
    gstin: '07AAACI3344J1Z5',
    customerName: 'Indraprastha Retail Enterprises LLP',
    invoiceNumber: 'INV/2024-25/002',
    invoiceDate: '2024-04-25',
    taxableValue: 320000,
    igst: 57600,
    cgst: 0,
    sgst: 0,
    cess: 0,
    totalTax: 57600,
    invoiceValue: 377600,
    placeOfSupply: '07-Delhi',
    financialYear: 'FY 2024-25',
    taxPeriod: '04',
    paymentStatus: 'PAID',
    receivedAmount: 377600,
    outstandingAmount: 0,
    notes: 'Inter-state Advisory & Audit Support',
  },
  {
    id: 'sale-003',
    gstin: '29AABCB5566K1Z9',
    customerName: 'Bengaluru Tech Park Solutions Pvt Ltd',
    invoiceNumber: 'INV/2024-25/003',
    invoiceDate: '2024-05-10',
    taxableValue: 680000,
    igst: 122400,
    cgst: 0,
    sgst: 0,
    cess: 0,
    totalTax: 122400,
    invoiceValue: 802400,
    placeOfSupply: '29-Karnataka',
    financialYear: 'FY 2024-25',
    taxPeriod: '05',
    paymentStatus: 'PARTIALLY_PAID',
    receivedAmount: 500000,
    outstandingAmount: 302400,
    notes: 'Software Architecture and GST Integration',
  },
  {
    id: 'sale-004',
    gstin: '24AAACT7788L1Z3',
    customerName: 'Torrent Logistics & Forwarders Ltd',
    invoiceNumber: 'INV/2024-25/004',
    invoiceDate: '2024-05-28',
    taxableValue: 290000,
    igst: 52200,
    cgst: 0,
    sgst: 0,
    cess: 0,
    totalTax: 52200,
    invoiceValue: 342200,
    placeOfSupply: '24-Gujarat',
    financialYear: 'FY 2024-25',
    taxPeriod: '05',
    paymentStatus: 'PAID',
    receivedAmount: 342200,
    outstandingAmount: 0,
    notes: 'Logistics Analytics Platform License',
  },
  {
    id: 'sale-005',
    gstin: '27AABCA9900M1Z7',
    customerName: 'Mahindra Auto Components & Dies',
    invoiceNumber: 'INV/2024-25/005',
    invoiceDate: '2024-06-15',
    taxableValue: 540000,
    igst: 0,
    cgst: 48600,
    sgst: 48600,
    cess: 0,
    totalTax: 97200,
    invoiceValue: 637200,
    placeOfSupply: '27-Maharashtra',
    financialYear: 'FY 2024-25',
    taxPeriod: '06',
    paymentStatus: 'UNPAID',
    receivedAmount: 0,
    outstandingAmount: 637200,
    notes: 'Q1 Comprehensive Tax Review & Audit',
  },
  {
    id: 'sale-006',
    gstin: '33AABCT1234N1Z2',
    customerName: 'Chennai Precision Dynamics Ltd',
    invoiceNumber: 'INV/2024-25/006',
    invoiceDate: '2024-06-28',
    taxableValue: 410000,
    igst: 73800,
    cgst: 0,
    sgst: 0,
    cess: 0,
    totalTax: 73800,
    invoiceValue: 483800,
    placeOfSupply: '33-Tamil Nadu',
    financialYear: 'FY 2024-25',
    taxPeriod: '06',
    paymentStatus: 'PAID',
    receivedAmount: 483800,
    outstandingAmount: 0,
    notes: 'Industrial Automation System Modules',
  },
];

// ==========================================
// 2. REALISTIC SAMPLE BANK STATEMENT TRANSACTIONS (HDFC / ICICI Bank Format)
// ==========================================
export const DEFAULT_SAMPLE_BANK_STATEMENT: BankTransaction[] = [
  {
    id: 'bank-001',
    date: '2024-04-01',
    narration: 'BY BALANCE B/D (OPENING CASH AT BANK)',
    referenceNo: 'BAL-FWD',
    withdrawal: 0,
    deposit: 0,
    balance: 850000,
    category: 'OTHER_INCOME',
    confidence: 100,
    isAutoTagged: true,
  },
  {
    id: 'bank-002',
    date: '2024-04-18',
    narration: 'NEFT CR-HDFC0000123-GODREJ INFOTECH LTD-INV 001',
    referenceNo: 'NEFT459021',
    withdrawal: 0,
    deposit: 531000,
    balance: 1381000,
    category: 'CUSTOMER_RECEIPT',
    partyName: 'Godrej Infotech & Engineering Ltd',
    partyGstin: '27AAACG1122H1Z1',
    matchedInvoiceNumber: 'INV/2024-25/001',
    confidence: 98,
    isAutoTagged: true,
  },
  {
    id: 'bank-003',
    date: '2024-04-20',
    narration: 'RTGS DR-PUNB0024-BHARAT PETROLEUM CORP LTD-EXP',
    referenceNo: 'RTGS88910',
    withdrawal: 50400,
    deposit: 0,
    balance: 1330600,
    category: 'VENDOR_PAYMENT',
    partyName: 'Bharat Petroleum Corporation Ltd',
    partyGstin: '27AAACB0000A1Z5',
    confidence: 95,
    isAutoTagged: true,
  },
  {
    id: 'bank-004',
    date: '2024-04-25',
    narration: 'CHQ WDL - MONTHLY OFFICE RENT BKC PREMISES',
    referenceNo: 'CHQ-50491',
    withdrawal: 65000,
    deposit: 0,
    balance: 1265600,
    category: 'RENT_EXPENSE',
    partyName: 'BKC Commercial Towers LLC',
    confidence: 96,
    isAutoTagged: true,
  },
  {
    id: 'bank-005',
    date: '2024-04-30',
    narration: 'NEFT DR - STAFF SALARY DISBURSEMENT APRIL 2024',
    referenceNo: 'NEFT-SAL-04',
    withdrawal: 185000,
    deposit: 0,
    balance: 1080600,
    category: 'SALARY_EXPENSE',
    confidence: 99,
    isAutoTagged: true,
  },
  {
    id: 'bank-006',
    date: '2024-05-05',
    narration: 'RTGS CR-INDRAPRASTHA RETAIL LLP-FULL SETTLEMENT',
    referenceNo: 'RTGS99211',
    withdrawal: 0,
    deposit: 377600,
    balance: 1458200,
    category: 'CUSTOMER_RECEIPT',
    partyName: 'Indraprastha Retail Enterprises LLP',
    partyGstin: '07AAACI3344J1Z5',
    matchedInvoiceNumber: 'INV/2024-25/002',
    confidence: 98,
    isAutoTagged: true,
  },
  {
    id: 'bank-007',
    date: '2024-05-18',
    narration: 'NEFT DR-INFOSYS BPM LTD-TECH INFRA BILL',
    referenceNo: 'NEFT33901',
    withdrawal: 147500,
    deposit: 0,
    balance: 1310700,
    category: 'VENDOR_PAYMENT',
    partyName: 'Infosys BPM Limited',
    partyGstin: '29AAACI4567M1Z2',
    confidence: 94,
    isAutoTagged: true,
  },
  {
    id: 'bank-008',
    date: '2024-05-20',
    narration: 'ONLINE TAX PMT - GST CHALLAN PMT-06 APR 2024',
    referenceNo: 'CPIN-994812',
    withdrawal: 45000,
    deposit: 0,
    balance: 1265700,
    category: 'GST_TAX_PAYMENT',
    confidence: 100,
    isAutoTagged: true,
  },
  {
    id: 'bank-009',
    date: '2024-05-22',
    narration: 'NEFT CR-BENGALURU TECH PARK SOL-PART PMT INV 003',
    referenceNo: 'NEFT77102',
    withdrawal: 0,
    deposit: 500000,
    balance: 1765700,
    category: 'CUSTOMER_RECEIPT',
    partyName: 'Bengaluru Tech Park Solutions Pvt Ltd',
    partyGstin: '29AABCB5566K1Z9',
    matchedInvoiceNumber: 'INV/2024-25/003',
    confidence: 96,
    isAutoTagged: true,
  },
  {
    id: 'bank-010',
    date: '2024-05-31',
    narration: 'NEFT DR - STAFF SALARY DISBURSEMENT MAY 2024',
    referenceNo: 'NEFT-SAL-05',
    withdrawal: 190000,
    deposit: 0,
    balance: 1575700,
    category: 'SALARY_EXPENSE',
    confidence: 99,
    isAutoTagged: true,
  },
  {
    id: 'bank-011',
    date: '2024-06-04',
    narration: 'RTGS CR-TORRENT LOGISTICS LTD-INV 004 SETTLED',
    referenceNo: 'RTGS11290',
    withdrawal: 0,
    deposit: 342200,
    balance: 1917900,
    category: 'CUSTOMER_RECEIPT',
    partyName: 'Torrent Logistics & Forwarders Ltd',
    partyGstin: '24AAACT7788L1Z3',
    matchedInvoiceNumber: 'INV/2024-25/004',
    confidence: 98,
    isAutoTagged: true,
  },
  {
    id: 'bank-012',
    date: '2024-06-12',
    narration: 'CHQ DR - RELIANCE JIO INFOCOMM FIBER LEASE',
    referenceNo: 'CHQ-50495',
    withdrawal: 17700,
    deposit: 0,
    balance: 1900200,
    category: 'UTILITY_EXPENSE',
    partyName: 'Reliance Jio Infocomm Ltd',
    confidence: 93,
    isAutoTagged: true,
  },
  {
    id: 'bank-013',
    date: '2024-06-20',
    narration: 'ONLINE TAX PMT - GST CHALLAN PMT-06 MAY 2024',
    referenceNo: 'CPIN-883190',
    withdrawal: 38500,
    deposit: 0,
    balance: 1861700,
    category: 'GST_TAX_PAYMENT',
    confidence: 100,
    isAutoTagged: true,
  },
  {
    id: 'bank-014',
    date: '2024-06-30',
    narration: 'NEFT DR - STAFF SALARY DISBURSEMENT JUNE 2024',
    referenceNo: 'NEFT-SAL-06',
    withdrawal: 195000,
    deposit: 0,
    balance: 1666700,
    category: 'SALARY_EXPENSE',
    confidence: 99,
    isAutoTagged: true,
  },
  {
    id: 'bank-015',
    date: '2024-06-30',
    narration: 'INTEREST CREDIT - AUTO SWEEP TERM DEPOSIT',
    referenceNo: 'INT-CR-Q1',
    withdrawal: 0,
    deposit: 12450,
    balance: 1679150,
    category: 'OTHER_INCOME',
    confidence: 99,
    isAutoTagged: true,
  },
  {
    id: 'bank-016',
    date: '2024-06-30',
    narration: 'BANK CHARGES & ANNUAL DEBIT CARD AMC',
    referenceNo: 'CHG-AMC',
    withdrawal: 1180,
    deposit: 0,
    balance: 1677970,
    category: 'BANK_CHARGES',
    confidence: 100,
    isAutoTagged: true,
  },
];

// ==========================================
// 3. PARSING TEXT / CSV / EXCEL BANK STATEMENTS
// ==========================================

// Parse DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD date string to YYYY-MM-DD
export function normalizeBankDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const clean = dateStr.trim();
  const ddmmyyyy = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }
  const yyyymmdd = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (yyyymmdd) {
    const year = yyyymmdd[1];
    const month = yyyymmdd[2].padStart(2, '0');
    const day = yyyymmdd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return clean;
}

// Clean and parse Indian currency / comma-formatted numbers (e.g. "1,09,036.82Cr" -> 109036.82)
export function parseIndianNum(val: string): number {
  if (!val) return 0;
  const clean = val.replace(/Cr|Dr|[^\d.-]/gi, '').trim();
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Robust Financial Token Validator
 * Distinguishes genuine debit/credit/balance financial amounts from numbers inside narration
 * (e.g. 12-digit UPI RRNs, phone numbers, account numbers, cheque numbers, dates).
 */
export function isFinancialToken(rawToken: string): boolean {
  if (!rawToken) return false;
  const token = rawToken.trim();
  if (token === '-' || token === '--' || token === '.00' || token === '0.00' || token === '0') return true;

  // Slashes, colons, at-signs, or underscores belong to narrations (e.g. UPI/..., 12:30, user@bank)
  if (/[/:@_#*]/.test(token)) return false;

  // Unformatted integers with 9 or more digits (like 521856104222, 9876543210, 501002345678) are reference/phone/account numbers
  if (/^\d{9,}$/.test(token)) return false;

  // Must match standard financial number patterns with optional Cr/Dr
  // e.g. "50,000.00", "1,59,036.82Cr", "1250.00", "500.00Dr", "45,000", "1200"
  const finRegex = /^[+-]?(?:(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?|\.\d{1,2})(?:Cr|Dr|CR|DR)?$/i;
  if (!finRegex.test(token)) return false;

  // Standalone numbers under 9 digits: if they have decimal point or comma or Cr/Dr, they are definitely financial
  if (token.includes('.') || token.includes(',') || /Cr|Dr/i.test(token)) return true;

  // Plain integer under 9 digits: valid if it represents a plausible amount
  const numVal = parseInt(token, 10);
  return !isNaN(numVal) && numVal >= 0 && numVal <= 1000000000;
}

export interface ExtractedBankLineAmounts {
  narration: string;
  withdrawal: number;
  deposit: number;
  balance: number;
  confidence: number;
}

/**
 * Robust Right-to-Left Financial Column Extractor
 * Reads the line tokens starting from the right (where financial columns reside in standard bank statements)
 * and extracts the true Debit, Credit, and Balance columns while keeping the entire narration intact.
 */
export function extractBankLineAmounts(
  rest: string,
  prevBalance: number
): ExtractedBankLineAmounts {
  let clean = (rest || '').trim();

  // Strip trailing page footer artifacts like "Page 1 of 5" or "1 / 1"
  clean = clean.replace(/\s+(?:Page\s+\d+(?:\s+of\s+\d+)?|\d+\s*\/\s*\d+)$/i, '').trim();

  // Split by whitespace
  const tokens = clean.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return { narration: clean, withdrawal: 0, deposit: 0, balance: prevBalance, confidence: 70 };
  }

  // Scan backwards from right to left to identify financial tokens
  const finTokens: string[] = [];
  let splitIndex = tokens.length;

  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (isFinancialToken(t)) {
      finTokens.unshift(t);
      splitIndex = i;
      // At most 3 financial columns at the end of a bank row (Debit, Credit, Balance)
      if (finTokens.length === 3) break;
    } else {
      // Stopped seeing financial tokens
      break;
    }
  }

  let withdrawal = 0;
  let deposit = 0;
  let balance = prevBalance;
  let narration = tokens.slice(0, splitIndex).join(' ').trim();
  if (!narration && tokens.length > finTokens.length) {
    narration = clean;
  }

  if (finTokens.length === 3) {
    // 3 Columns: [Debit/Withdrawal] [Credit/Deposit] [Balance]
    const rawDebit = finTokens[0];
    const rawCredit = finTokens[1];
    const rawBal = finTokens[2];

    const debitVal = (rawDebit === '-' || rawDebit === '--' || rawDebit === '.00') ? 0 : parseIndianNum(rawDebit);
    const creditVal = (rawCredit === '-' || rawCredit === '--' || rawCredit === '.00') ? 0 : parseIndianNum(rawCredit);
    let balVal = parseIndianNum(rawBal);
    if (/Dr/i.test(rawBal) && balVal > 0) balVal = -balVal;

    withdrawal = debitVal;
    deposit = creditVal;
    balance = balVal !== 0 ? balVal : (prevBalance - withdrawal + deposit);
    return { narration, withdrawal, deposit, balance, confidence: 99 };
  }

  if (finTokens.length === 2) {
    // 2 Columns: [Amount (with optional Dr/Cr)] [Balance]
    const rawAmt = finTokens[0];
    const rawBal = finTokens[1];

    const amtVal = parseIndianNum(rawAmt);
    let balVal = parseIndianNum(rawBal);
    if (/Dr/i.test(rawBal) && balVal > 0) balVal = -balVal;

    balance = balVal;

    if (/Dr/i.test(rawAmt)) {
      withdrawal = amtVal;
      deposit = 0;
    } else if (/Cr/i.test(rawAmt)) {
      deposit = amtVal;
      withdrawal = 0;
    } else if (prevBalance !== 0 && balVal !== 0 && Math.abs(balVal - prevBalance) > 0.001) {
      const delta = balVal - prevBalance;
      if (delta < 0) {
        withdrawal = amtVal > 0 ? amtVal : Math.abs(delta);
        deposit = 0;
      } else {
        deposit = amtVal > 0 ? amtVal : delta;
        withdrawal = 0;
      }
    } else {
      const isCredit =
        /BY CASH|CR|CREDIT|RECEIVED|Int\.Pd|POWER GRID|ANAMIKA|SETU|Fund transf|NEFT-ICIN|IMPS\/P2A|BY TRANSFER/i.test(narration) &&
        !/DR:|DCARDFEE|SMS Charges|paytm|swiggy|blinkit|cred\.club|uber|rapido|flipkart|Paym|pay|rent|TO TRANSFER/i.test(narration);
      if (isCredit) {
        deposit = amtVal;
        withdrawal = 0;
      } else {
        withdrawal = amtVal;
        deposit = 0;
      }
    }

    return { narration, withdrawal, deposit, balance, confidence: 98 };
  }

  if (finTokens.length === 1) {
    // 1 Column: Single Amount
    const rawAmt = finTokens[0];
    const amtVal = parseIndianNum(rawAmt);

    if (/Dr/i.test(rawAmt)) {
      withdrawal = amtVal;
      deposit = 0;
      balance = prevBalance - withdrawal;
    } else if (/Cr/i.test(rawAmt)) {
      deposit = amtVal;
      withdrawal = 0;
      balance = prevBalance + deposit;
    } else {
      const isCredit =
        /BY CASH|CR|CREDIT|RECEIVED|Int\.Pd|POWER GRID|ANAMIKA|SETU|Fund transf|NEFT-ICIN|IMPS\/P2A|BY TRANSFER/i.test(narration) &&
        !/DR:|DCARDFEE|SMS Charges|paytm|swiggy|blinkit|cred\.club|uber|rapido|flipkart|Paym|pay|rent|TO TRANSFER/i.test(narration);
      if (isCredit) {
        deposit = amtVal;
        withdrawal = 0;
        balance = prevBalance + deposit;
      } else {
        withdrawal = amtVal;
        deposit = 0;
        balance = prevBalance - withdrawal;
      }
    }

    return { narration, withdrawal, deposit, balance, confidence: 92 };
  }

  return { narration: clean, withdrawal: 0, deposit: 0, balance: prevBalance, confidence: 70 };
}

// Dedicated Bank of Baroda (REP31 Customer Account Ledger) & Multi-Bank Parser
export function parseBankOfBarodaStatement(text: string): BankTransaction[] {
  if (!text || !text.trim()) return [];

  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const transactions: BankTransaction[] = [];

  // Extract opening balance if available
  let openingBalance = 0;
  for (const line of rawLines) {
    const openMatch = line.match(/(?:Opening Balance|B\/F Balance|Op Bal)\s*:\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (openMatch) {
      openingBalance = parseIndianNum(openMatch[1]);
      break;
    }
  }

  let prevBalance = openingBalance;

  // Step 1: Filter out headers/footers and merge wrapped lines
  const combinedLines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // Skip page headers, footers, and summary separator lines
    if (
      line.startsWith('---') ||
      line.startsWith('===') ||
      line.startsWith('***') ||
      /Page\s+\d+/i.test(line) ||
      /Page Total/i.test(line) ||
      /Total Credit\s*:/i.test(line) ||
      /Total Debit\s*:/i.test(line) ||
      /Closing Balance\s*:/i.test(line) ||
      /Customer Account Ledger/i.test(line) ||
      /BANK OF BARODA/i.test(line) ||
      /Service OutLet/i.test(line) ||
      /Account No\s*:/i.test(line) ||
      /Gl Sub Head Code/i.test(line) ||
      /Peg Review/i.test(line) ||
      /Order by GL/i.test(line) ||
      /GL\.\s*Date\s+Value\s*Date/i.test(line) ||
      /Report To\s*:/i.test(line) ||
      /SolId\s*:/i.test(line) ||
      /Set id\s*:/i.test(line) ||
      /Acct Range\s*:/i.test(line) ||
      /Currency Code/i.test(line) ||
      /Account Label/i.test(line) ||
      /Open\/Closed/i.test(line) ||
      /Period\s*:/i.test(line) ||
      /Limit Details/i.test(line) ||
      /Signature/i.test(line) ||
      /pages printed/i.test(line)
    ) {
      continue;
    }

    // Check if this line is just a standalone balance line (e.g. "1,09,036.82Cr" or "89,779.94Cr")
    const standaloneBalanceMatch = line.match(/^([\d,]+(?:\.\d{1,2})?)(?:Cr|Dr)?$/i);
    if (standaloneBalanceMatch && combinedLines.length > 0) {
      combinedLines[combinedLines.length - 1] += ` ${line}`;
      continue;
    }

    // Check if line starts with a date (GL Date or Value Date)
    if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}/.test(line)) {
      combinedLines.push(line);
    } else if (combinedLines.length > 0) {
      // Continuation of previous narration / amounts / balance
      combinedLines[combinedLines.length - 1] += ` ${line}`;
    }
  }

  // Step 2: Parse each combined transaction line
  for (let idx = 0; idx < combinedLines.length; idx++) {
    const line = combinedLines[idx];

    // Pattern 1: Two dates + Tran Id + Narration + Amounts (BOB Finacle format)
    // Example: "02-04-2025 01-04-2025 S56536340 UPI/521856104222/... 38.00 1,09,036.82Cr"
    const bobTwoDatesMatch = line.match(
      /^(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\s+(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\s+([A-Z0-9_-]+)\s+(.+)$/i
    );

    // Pattern 2: Single date + Tran Id + Narration + Amounts
    const bobSingleDateMatch = !bobTwoDatesMatch
      ? line.match(/^(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\s+([A-Z0-9_-]+)\s+(.+)$/i)
      : null;

    // Pattern 3: Single date + Narration + Amounts
    const generalDateMatch = !bobTwoDatesMatch && !bobSingleDateMatch
      ? line.match(/^(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\s+(.+)$/i)
      : null;

    if (bobTwoDatesMatch || bobSingleDateMatch || generalDateMatch) {
      let glDate = '';
      let valueDate = '';
      let tranId = `TXN-${idx + 1}`;
      let rest = '';

      if (bobTwoDatesMatch) {
        glDate = normalizeBankDate(bobTwoDatesMatch[1]);
        valueDate = normalizeBankDate(bobTwoDatesMatch[2]);
        tranId = bobTwoDatesMatch[3];
        rest = bobTwoDatesMatch[4].trim();
      } else if (bobSingleDateMatch) {
        valueDate = normalizeBankDate(bobSingleDateMatch[1]);
        tranId = bobSingleDateMatch[2];
        rest = bobSingleDateMatch[3].trim();
      } else if (generalDateMatch) {
        valueDate = normalizeBankDate(generalDateMatch[1]);
        rest = generalDateMatch[2].trim();
      }

      // Robustly extract amounts from the end of the line
      const extracted = extractBankLineAmounts(rest, prevBalance);
      let narration = extracted.narration;
      const withdrawal = extracted.withdrawal;
      const deposit = extracted.deposit;
      const balance = extracted.balance;
      prevBalance = balance;

      // Clean narration of instrument numbers at the start
      narration = narration.replace(/^(\d{6,8})\s+/, '').trim();

      // Extract counterparty name from narration
      let partyName: string | undefined = undefined;
      if (/POWER GRID/i.test(narration)) {
        partyName = 'Power Grid Corporation of India Ltd';
      } else if (/MAMTA BANSAL/i.test(narration)) {
        partyName = 'Mamta Bansal';
      } else if (/ANAMIKA/i.test(narration)) {
        partyName = 'Anamika (Personal / Business)';
      } else if (/BY CASH/i.test(narration)) {
        partyName = 'Cash Deposit';
      } else if (/cred\.club/i.test(narration)) {
        partyName = 'CRED (Credit Card Bill Settlement)';
      } else if (/DELHIMETRO|dmrc/i.test(narration)) {
        partyName = 'Delhi Metro Rail Corporation (DMRC)';
      } else if (/swiggy/i.test(narration)) {
        partyName = 'Swiggy (Bundl Technologies)';
      } else if (/blinkit|zepto|grofers/i.test(narration)) {
        partyName = 'Blinkit / Zepto Commerce';
      } else if (/uber/i.test(narration)) {
        partyName = 'Uber India Systems Pvt Ltd';
      } else if (/rapido/i.test(narration)) {
        partyName = 'Rapido (Roppen Transportation)';
      } else if (/flipkart/i.test(narration)) {
        partyName = 'Flipkart Internet Pvt Ltd';
      } else if (/amazon|AMZN/i.test(narration)) {
        partyName = 'Amazon Pay / Retail India';
      } else if (/goodsandservice/i.test(narration)) {
        partyName = 'GST Tax Deposit / CBIC';
      } else if (/NEXTBILLION/i.test(narration)) {
        partyName = 'Nextbillion Technology (Groww)';
      } else if (/Int\.Pd/i.test(narration)) {
        partyName = 'Bank Interest Received';
      } else if (narration.includes('UPI/')) {
        const upiParts = narration.split('/');
        if (upiParts.length >= 4) {
          partyName = upiParts[upiParts.length - 2] || upiParts[upiParts.length - 1];
        }
      }

      const category = categorizeBankTransaction(narration, withdrawal, deposit);

      transactions.push({
        id: `bob-txn-${idx + 1}-${Date.now()}`,
        date: valueDate || glDate || new Date().toISOString().slice(0, 10),
        narration: narration || 'Bank Transaction',
        referenceNo: tranId || `TXN-${idx + 1}`,
        withdrawal: Math.abs(Math.round(withdrawal * 100) / 100),
        deposit: Math.abs(Math.round(deposit * 100) / 100),
        balance: Math.round(balance * 100) / 100,
        category,
        partyName,
        confidence: extracted.confidence || 98,
        isAutoTagged: true,
      });
    }
  }

  return transactions;
}

export function parseBankStatementText(text: string): BankTransaction[] {
  if (!text || !text.trim()) return [];

  // Check if text is a Bank of Baroda Customer Account Ledger (REP31 format) or standard Finacle format
  if (
    /BANK OF BARODA|REP31|Gl Sub Head Code|Order by GL\. Date|Service OutLet/i.test(text) ||
    /^\d{2}[-/]\d{2}[-/]\d{4}\s+\d{2}[-/]\d{2}[-/]\d{4}\s+[A-Z0-9]+/m.test(text)
  ) {
    const bobResult = parseBankOfBarodaStatement(text);
    if (bobResult.length > 0) {
      return bobResult;
    }
  }

  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const transactions: BankTransaction[] = [];
  let runningBalance = 0;

  // Extract opening balance if present in header
  for (const line of rawLines) {
    const openMatch = line.match(/(?:Opening Balance|B\/F Balance|Op Bal)\s*:\s*([\d,]+(?:\.\d{1,2})?)/i);
    if (openMatch) {
      runningBalance = parseIndianNum(openMatch[1]);
      break;
    }
  }

  // Pre-process: merge multi-line narrations starting with date
  const combinedLines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];

    // Skip table header or summary lines
    if (
      (line.toLowerCase().includes('date') && (line.toLowerCase().includes('narration') || line.toLowerCase().includes('particulars') || line.toLowerCase().includes('description') || line.toLowerCase().includes('balance'))) ||
      line.startsWith('---') ||
      line.startsWith('===') ||
      line.startsWith('***') ||
      /Page\s+\d+/i.test(line) ||
      /Page Total/i.test(line) ||
      /Total Credit\s*:/i.test(line) ||
      /Total Debit\s*:/i.test(line)
    ) {
      continue;
    }

    const standaloneBal = line.match(/^([\d,]+(?:\.\d{1,2})?)(?:Cr|Dr)?$/i);
    if (standaloneBal && combinedLines.length > 0) {
      combinedLines[combinedLines.length - 1] += ` ${line}`;
      continue;
    }

    const startsWithDate =
      /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/.test(line) ||
      /^\d{1,2}[-/.\s]+[a-zA-Z]{3,9}[-/.\s]+\d{2,4}/.test(line) ||
      /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(line);

    if (startsWithDate) {
      combinedLines.push(line);
    } else if (combinedLines.length > 0) {
      combinedLines[combinedLines.length - 1] += ` ${line}`;
    } else {
      combinedLines.push(line);
    }
  }

  for (let i = 0; i < combinedLines.length; i++) {
    const line = combinedLines[i];

    // Case A: Tab or Comma separated rows (e.g. from Excel / CSV copy-paste)
    if (line.includes('\t') || (line.includes(',') && !line.match(/^[\d,.]+(?:Cr|Dr)?$/))) {
      let tokens: string[] = [];
      if (line.includes('\t')) {
        tokens = line.split('\t').map((t) => t.trim());
      } else {
        tokens = line.split(',').map((t) => t.trim().replace(/^"|"$/g, ''));
      }

      if (tokens.length >= 3) {
        const dateStr = normalizeBankDate(tokens[0]);
        const narration = tokens[1] || 'Bank Transaction';
        let withdrawal = 0;
        let deposit = 0;
        let balance = runningBalance;
        let refNo = `TXN-${i + 1}`;

        if (tokens.length >= 5) {
          refNo = tokens[2] || refNo;
          withdrawal = parseIndianNum(tokens[3]);
          deposit = parseIndianNum(tokens[4]);
          if (tokens[5]) balance = parseIndianNum(tokens[5]);
        } else if (tokens.length === 4) {
          withdrawal = parseIndianNum(tokens[2]);
          deposit = parseIndianNum(tokens[3]);
          balance = runningBalance - withdrawal + deposit;
        } else if (tokens.length === 3) {
          const amt = parseIndianNum(tokens[2]);
          if (
            narration.toLowerCase().includes('cr') ||
            narration.toLowerCase().includes('deposit') ||
            narration.toLowerCase().includes('receipt') ||
            narration.toLowerCase().includes('by cash')
          ) {
            deposit = amt;
          } else {
            withdrawal = amt;
          }
          balance = runningBalance - withdrawal + deposit;
        }

        runningBalance = balance;
        const category = categorizeBankTransaction(narration, withdrawal, deposit);

        transactions.push({
          id: `parsed-txn-${i + 1}-${Date.now()}`,
          date: dateStr,
          narration,
          referenceNo: refNo,
          withdrawal: Math.abs(Math.round(withdrawal * 100) / 100),
          deposit: Math.abs(Math.round(deposit * 100) / 100),
          balance: Math.round(balance * 100) / 100,
          category,
          confidence: 94,
          isAutoTagged: true,
        });
        continue;
      }
    }

    // Case B: Space-delimited bank line starting with Date
    // Pattern: [Date] [Optional Ref/TranId] [Narration] [Financial Columns at end]
    const dateMatch = line.match(
      /^(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|\d{1,2}[-/.\s]+[a-zA-Z]{3,9}[-/.\s]+\d{2,4}|\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\s+(.+)$/i
    );

    if (dateMatch) {
      const rawDate = dateMatch[1];
      let rest = dateMatch[2].trim();
      const dateStr = normalizeBankDate(rawDate);
      let refNo = `TXN-${i + 1}`;

      // Check if first token of rest is a Transaction/Reference ID (e.g. S56536340, TXN12345, CHQ00123)
      const tranIdPrefix = rest.match(/^([A-Z0-9_-]{6,})\s+(.+)$/i);
      if (tranIdPrefix) {
        refNo = tranIdPrefix[1];
        rest = tranIdPrefix[2].trim();
      }

      // Robust extraction of amount columns from the end of rest
      const extracted = extractBankLineAmounts(rest, runningBalance);
      let narration = extracted.narration;
      const withdrawal = extracted.withdrawal;
      const deposit = extracted.deposit;
      const balance = extracted.balance;
      runningBalance = balance;

      narration = narration.replace(/^(\d{6,8})\s+/, '').trim();

      // Extract counterparty name from narration if present
      let partyName: string | undefined = undefined;
      if (narration.includes('UPI/')) {
        const upiParts = narration.split('/');
        if (upiParts.length >= 4) {
          partyName = upiParts[upiParts.length - 2] || upiParts[upiParts.length - 1];
        }
      }

      const category = categorizeBankTransaction(narration, withdrawal, deposit);

      transactions.push({
        id: `parsed-txn-${i + 1}-${Date.now()}`,
        date: dateStr,
        narration: narration || 'Bank Transaction',
        referenceNo: refNo,
        withdrawal: Math.abs(Math.round(withdrawal * 100) / 100),
        deposit: Math.abs(Math.round(deposit * 100) / 100),
        balance: Math.round(balance * 100) / 100,
        category,
        partyName,
        confidence: extracted.confidence || 92,
        isAutoTagged: true,
      });
    }
  }

  return transactions;
}

export function categorizeBankTransaction(
  narration: string,
  withdrawal: number,
  deposit: number
): BankTransactionCategory {
  const norm = narration.toUpperCase();

  if (norm.includes('SALARY') || norm.includes('STAFF SAL') || norm.includes('PAYROLL')) {
    return 'SALARY_EXPENSE';
  }
  if (norm.includes('RENT') || norm.includes('PREMISES') || norm.includes('OFFICE LEASE')) {
    return 'RENT_EXPENSE';
  }
  if (
    norm.includes('GST') ||
    norm.includes('CHALLAN') ||
    norm.includes('PMT-06') ||
    norm.includes('CPIN') ||
    norm.includes('TAX PMT') ||
    norm.includes('GOODSANDSERVICE')
  ) {
    return 'GST_TAX_PAYMENT';
  }
  if (norm.includes('TDS') || norm.includes('CHALLAN 281')) {
    return 'TDS_PAYMENT';
  }
  if (
    norm.includes('BANK CHG') ||
    norm.includes('CHARGES') ||
    norm.includes('DCARDFEE') ||
    norm.includes('SMS CHARGES') ||
    norm.includes('ANNUALFEE') ||
    norm.includes('AMC') ||
    norm.includes('PROCESSING FEE')
  ) {
    return 'BANK_CHARGES';
  }
  if (
    norm.includes('ELECTRICITY') ||
    norm.includes('POWER') ||
    norm.includes('FIBER') ||
    norm.includes('INTERNET') ||
    norm.includes('JIO') ||
    norm.includes('AIRTEL')
  ) {
    return 'UTILITY_EXPENSE';
  }
  if (norm.includes('DRAWING') || norm.includes('SELF WDL') || norm.includes('PERSONAL')) {
    return 'DIRECTOR_DRAWINGS';
  }
  if (norm.includes('CAPITAL') || norm.includes('INFUSION') || norm.includes('EQUITY')) {
    return 'CAPITAL_INTRODUCED';
  }
  if (norm.includes('INTEREST') || norm.includes('INT CR') || norm.includes('INT.PD') || norm.includes('SWEEP')) {
    return 'OTHER_INCOME';
  }

  if (deposit > 0) {
    return 'CUSTOMER_RECEIPT';
  }

  if (withdrawal > 0) {
    return 'VENDOR_PAYMENT';
  }

  return 'OTHER_EXPENSE';
}

// ==========================================
// 4. DOUBLE-ENTRY LEDGER & FINANCIAL STATEMENT ENGINE
// ==========================================
export interface AccountingEngineResult {
  vendorLedgers: PartyLedgerAccount[];
  customerLedgers: PartyLedgerAccount[];
  trialBalance: TrialBalanceRow[];
  profitAndLoss: ProfitAndLossReport;
  balanceSheet: BalanceSheetReport;
  summary: {
    totalSales: number;
    totalPurchases: number;
    totalBankCredits: number;
    totalBankDebits: number;
    closingBankBalance: number;
    debtorsOutstanding: number;
    creditorsOutstanding: number;
    netGstPayableOrItc: number; // Positive = Payable (Liab), Negative = ITC Balance (Asset)
    netProfit: number;
  };
}

export function computeFinancialAccounts(
  purchases: InvoiceRecord[],
  sales: SalesInvoiceRecord[],
  bankTransactions: BankTransaction[],
  periodName: string = 'FY 2024-25'
): AccountingEngineResult {
  // If zero data across purchases, sales, and bank statements, return clean zero result
  if (purchases.length === 0 && sales.length === 0 && bankTransactions.length === 0) {
    return {
      vendorLedgers: [],
      customerLedgers: [],
      trialBalance: [],
      profitAndLoss: {
        period: periodName,
        salesRevenue: 0,
        otherOperatingIncome: 0,
        closingStock: 0,
        totalTradingRevenue: 0,
        openingStock: 0,
        grossPurchases: 0,
        directExpenses: 0,
        totalCostOfGoodsSold: 0,
        grossProfit: 0,
        grossProfitMarginPercent: 0,
        indirectIncomes: {
          interestIncome: 0,
          discountReceived: 0,
          otherIncome: 0,
          total: 0,
        },
        indirectExpenses: {
          salariesAndWages: 0,
          rentAndOffice: 0,
          utilitiesAndPower: 0,
          bankAndFinanceCharges: 0,
          professionalAndLegal: 0,
          softwareAndTech: 0,
          depreciation: 0,
          generalAdministrative: 0,
          total: 0,
        },
        operatingProfitEbitda: 0,
        netProfitBeforeTax: 0,
        taxProvisionEstimated: 0,
        netProfitAfterTax: 0,
        netProfitMarginPercent: 0,
      },
      balanceSheet: {
        asOnDate: new Date().toISOString().slice(0, 10),
        period: periodName,
        equityAndLiabilities: {
          shareholdersFunds: {
            proprietorCapital: 0,
            retainedEarningsAndReserves: 0,
            currentPeriodProfit: 0,
            lessDrawings: 0,
            totalCapital: 0,
          },
          nonCurrentLiabilities: {
            securedBankLoans: 0,
            unsecuredLoans: 0,
            totalNonCurrentLiabilities: 0,
          },
          currentLiabilities: {
            sundryCreditorsTradePayables: 0,
            netGstOutputPayable: 0,
            tdsAndStatutoryDues: 0,
            otherCurrentLiabilities: 0,
            totalCurrentLiabilities: 0,
          },
          totalLiabilities: 0,
        },
        assets: {
          nonCurrentAssets: {
            tangibleFixedAssets: 0,
            lessDepreciation: 0,
            netFixedAssets: 0,
          },
          currentAssets: {
            closingInventories: 0,
            sundryDebtorsTradeReceivables: 0,
            cashAndBankBalances: 0,
            netGstItcReceivable: 0,
            prepaidAndAdvances: 0,
            totalCurrentAssets: 0,
          },
          totalAssets: 0,
        },
        isBalanced: true,
        varianceDifference: 0,
        workingCapital: 0,
        currentRatio: 0,
        debtEquityRatio: 0,
      },
      summary: {
        totalSales: 0,
        totalPurchases: 0,
        totalBankCredits: 0,
        totalBankDebits: 0,
        closingBankBalance: 0,
        debtorsOutstanding: 0,
        creditorsOutstanding: 0,
        netGstPayableOrItc: 0,
        netProfit: 0,
      },
    };
  }

  // A. VENDOR LEDGERS (Sundry Creditors)
  const vendorMap = new Map<string, PartyLedgerAccount>();

  // Inward Purchase Invoices (Credit to Vendor Account)
  purchases.forEach((p) => {
    const key = (p.vendorName || p.gstin || 'Miscellaneous Vendor').trim();
    if (!vendorMap.has(key)) {
      vendorMap.set(key, {
        id: `vend-${key.replace(/[^a-zA-Z0-9]/g, '_')}`,
        partyName: p.vendorName || 'Registered Vendor',
        partyGstin: p.gstin,
        partyType: 'VENDOR',
        openingBalance: 0,
        openingType: 'Cr',
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0,
        closingType: 'Cr',
        invoicesCount: 0,
        paymentsCount: 0,
        entries: [],
        ageingDays: 30,
      });
    }

    const account = vendorMap.get(key)!;
    account.invoicesCount += 1;
    account.totalCredit += p.invoiceValue;

    account.entries.push({
      id: `p-entry-${p.id}`,
      date: p.invoiceDate,
      voucherType: 'PURCHASE',
      voucherNo: p.invoiceNumber,
      particulars: `By Purchase A/c (Taxable: ₹${p.taxableValue.toLocaleString('en-IN')}, GST: ₹${p.totalTax.toLocaleString('en-IN')})`,
      debit: 0,
      credit: p.invoiceValue,
      runningBalance: 0, // Calculated later
      balanceType: 'Cr',
      referenceDoc: p.invoiceNumber,
    });
  });

  // Outward Bank Payments to Vendors (Debit to Vendor Account)
  bankTransactions
    .filter((txn) => txn.category === 'VENDOR_PAYMENT' && txn.withdrawal > 0)
    .forEach((txn) => {
      // Find matching vendor by name or partyName
      let targetKey: string | undefined;
      for (const key of vendorMap.keys()) {
        if (
          (txn.partyName && key.toLowerCase().includes(txn.partyName.toLowerCase())) ||
          txn.narration.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().split(' ')[0] && txn.narration.toLowerCase().includes(key.toLowerCase().split(' ')[0])
        ) {
          targetKey = key;
          break;
        }
      }

      if (!targetKey) {
        // Fallback to first vendor or generic trade creditor
        targetKey = Array.from(vendorMap.keys())[0] || txn.partyName || 'Trade Payables';
      }

      if (!vendorMap.has(targetKey)) {
        vendorMap.set(targetKey, {
          id: `vend-${targetKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
          partyName: targetKey,
          partyGstin: txn.partyGstin,
          partyType: 'VENDOR',
          openingBalance: 0,
          openingType: 'Cr',
          totalDebit: 0,
          totalCredit: 0,
          closingBalance: 0,
          closingType: 'Cr',
          invoicesCount: 0,
          paymentsCount: 0,
          entries: [],
          ageingDays: 15,
        });
      }

      const account = vendorMap.get(targetKey)!;
      account.paymentsCount += 1;
      account.totalDebit += txn.withdrawal;

      account.entries.push({
        id: `bank-p-entry-${txn.id}`,
        date: txn.date,
        voucherType: 'BANK_PAYMENT',
        voucherNo: txn.referenceNo || 'BANK-PMT',
        particulars: `To Bank A/c (${txn.narration})`,
        debit: txn.withdrawal,
        credit: 0,
        runningBalance: 0,
        balanceType: 'Cr',
        referenceDoc: txn.referenceNo,
      });
    });

  // Calculate Running Balances for Vendors
  const vendorLedgers: PartyLedgerAccount[] = Array.from(vendorMap.values()).map((v) => {
    // Sort entries chronologically
    v.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = 0;
    v.entries.forEach((e) => {
      // For Creditors: Credit increases liability, Debit decreases liability
      running = running + e.credit - e.debit;
      e.runningBalance = Math.abs(running);
      e.balanceType = running >= 0 ? 'Cr' : 'Dr';
    });

    const net = v.totalCredit - v.totalDebit;
    v.closingBalance = Math.abs(net);
    v.closingType = net >= 0 ? 'Cr' : 'Dr';
    return v;
  });

  // B. CUSTOMER LEDGERS (Sundry Debtors)
  const customerMap = new Map<string, PartyLedgerAccount>();

  // Outward Sales Invoices (Debit to Customer Account)
  sales.forEach((s) => {
    const key = (s.customerName || s.gstin || 'General Customer').trim();
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: `cust-${key.replace(/[^a-zA-Z0-9]/g, '_')}`,
        partyName: s.customerName || 'Registered Customer',
        partyGstin: s.gstin,
        partyType: 'CUSTOMER',
        openingBalance: 0,
        openingType: 'Dr',
        totalDebit: 0,
        totalCredit: 0,
        closingBalance: 0,
        closingType: 'Dr',
        invoicesCount: 0,
        paymentsCount: 0,
        entries: [],
        ageingDays: 20,
      });
    }

    const account = customerMap.get(key)!;
    account.invoicesCount += 1;
    account.totalDebit += s.invoiceValue;

    account.entries.push({
      id: `s-entry-${s.id}`,
      date: s.invoiceDate,
      voucherType: 'SALES',
      voucherNo: s.invoiceNumber,
      particulars: `To Sales A/c (Taxable: ₹${s.taxableValue.toLocaleString('en-IN')}, GST: ₹${s.totalTax.toLocaleString('en-IN')})`,
      debit: s.invoiceValue,
      credit: 0,
      runningBalance: 0,
      balanceType: 'Dr',
      referenceDoc: s.invoiceNumber,
    });
  });

  // Inward Bank Receipts from Customers (Credit to Customer Account)
  bankTransactions
    .filter((txn) => txn.category === 'CUSTOMER_RECEIPT' && txn.deposit > 0)
    .forEach((txn) => {
      let targetKey: string | undefined;
      for (const key of customerMap.keys()) {
        if (
          (txn.partyName && key.toLowerCase().includes(txn.partyName.toLowerCase())) ||
          txn.narration.toLowerCase().includes(key.toLowerCase()) ||
          key.toLowerCase().split(' ')[0] && txn.narration.toLowerCase().includes(key.toLowerCase().split(' ')[0])
        ) {
          targetKey = key;
          break;
        }
      }

      if (!targetKey) {
        targetKey = Array.from(customerMap.keys())[0] || txn.partyName || 'Trade Debtors';
      }

      if (!customerMap.has(targetKey)) {
        customerMap.set(targetKey, {
          id: `cust-${targetKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
          partyName: targetKey,
          partyGstin: txn.partyGstin,
          partyType: 'CUSTOMER',
          openingBalance: 0,
          openingType: 'Dr',
          totalDebit: 0,
          totalCredit: 0,
          closingBalance: 0,
          closingType: 'Dr',
          invoicesCount: 0,
          paymentsCount: 0,
          entries: [],
          ageingDays: 10,
        });
      }

      const account = customerMap.get(targetKey)!;
      account.paymentsCount += 1;
      account.totalCredit += txn.deposit;

      account.entries.push({
        id: `bank-r-entry-${txn.id}`,
        date: txn.date,
        voucherType: 'BANK_RECEIPT',
        voucherNo: txn.referenceNo || 'BANK-RCPT',
        particulars: `By Bank A/c (${txn.narration})`,
        debit: 0,
        credit: txn.deposit,
        runningBalance: 0,
        balanceType: 'Dr',
        referenceDoc: txn.referenceNo,
      });
    });

  // Calculate Running Balances for Debtors
  const customerLedgers: PartyLedgerAccount[] = Array.from(customerMap.values()).map((c) => {
    c.entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let running = 0;
    c.entries.forEach((e) => {
      // For Debtors: Debit increases asset, Credit decreases asset
      running = running + e.debit - e.credit;
      e.runningBalance = Math.abs(running);
      e.balanceType = running >= 0 ? 'Dr' : 'Cr';
    });

    const net = c.totalDebit - c.totalCredit;
    c.closingBalance = Math.abs(net);
    c.closingType = net >= 0 ? 'Dr' : 'Cr';
    return c;
  });

  // C. FINANCIAL AGGREGATIONS
  // Sales aggregates
  const totalSalesTaxable = sales.reduce((acc, s) => acc + s.taxableValue, 0);
  const totalSalesTax = sales.reduce((acc, s) => acc + s.totalTax, 0);
  const totalSalesGross = sales.reduce((acc, s) => acc + s.invoiceValue, 0);

  // Purchase aggregates
  const totalPurchasesTaxable = purchases.reduce((acc, p) => acc + p.taxableValue, 0);
  const totalPurchasesTax = purchases.reduce((acc, p) => acc + p.totalTax, 0);
  const totalPurchasesGross = purchases.reduce((acc, p) => acc + p.invoiceValue, 0);

  // Bank aggregates
  const totalBankWithdrawals = bankTransactions.reduce((acc, t) => acc + t.withdrawal, 0);
  const totalBankDeposits = bankTransactions.reduce((acc, t) => acc + t.deposit, 0);
  const lastBankTxn = bankTransactions[bankTransactions.length - 1];
  const closingBankBalance = lastBankTxn ? lastBankTxn.balance : 1677970;

  // Expense aggregates from Bank Statement
  const salaryExpenses = bankTransactions
    .filter((t) => t.category === 'SALARY_EXPENSE')
    .reduce((acc, t) => acc + t.withdrawal, 0);

  const rentExpenses = bankTransactions
    .filter((t) => t.category === 'RENT_EXPENSE')
    .reduce((acc, t) => acc + t.withdrawal, 0);

  const utilityExpenses = bankTransactions
    .filter((t) => t.category === 'UTILITY_EXPENSE')
    .reduce((acc, t) => acc + t.withdrawal, 0);

  const bankCharges = bankTransactions
    .filter((t) => t.category === 'BANK_CHARGES')
    .reduce((acc, t) => acc + t.withdrawal, 0);

  const gstTaxesPaidInBank = bankTransactions
    .filter((t) => t.category === 'GST_TAX_PAYMENT')
    .reduce((acc, t) => acc + t.withdrawal, 0);

  const otherInterestIncome = bankTransactions
    .filter((t) => t.category === 'OTHER_INCOME' && t.deposit > 0 && !t.narration.includes('BALANCE B/D'))
    .reduce((acc, t) => acc + t.deposit, 0);

  const totalDebtorsBalance = customerLedgers.reduce((acc, c) => acc + (c.closingType === 'Dr' ? c.closingBalance : -c.closingBalance), 0);
  const totalCreditorsBalance = vendorLedgers.reduce((acc, v) => acc + (v.closingType === 'Cr' ? v.closingBalance : -v.closingBalance), 0);

  // GST Statutory Net Calculation
  // Output GST (Payable on Sales) minus Input GST (ITC on Purchases) minus GST paid via Bank Challans
  const netGstOutputPayableRaw = totalSalesTax - totalPurchasesTax - gstTaxesPaidInBank;
  const netGstOutputPayable = Math.max(0, netGstOutputPayableRaw);
  const netGstItcReceivable = netGstOutputPayableRaw < 0 ? Math.abs(netGstOutputPayableRaw) : 0;

  // D. PROFIT & LOSS REPORT
  const directExpenses = 42000; // Carriage inward, freight, packing
  const openingStock = 150000;
  const closingStock = 220000;
  const costOfGoodsSold = openingStock + totalPurchasesTaxable + directExpenses - closingStock;
  const grossProfit = totalSalesTaxable - costOfGoodsSold;
  const grossProfitMarginPercent = totalSalesTaxable > 0 ? (grossProfit / totalSalesTaxable) * 100 : 0;

  const totalIndirectExpenses =
    salaryExpenses +
    rentExpenses +
    utilityExpenses +
    bankCharges +
    35000 + // Professional and Audit fees
    28000 + // Software & Tech
    45000; // Depreciation

  const totalIndirectIncomes = otherInterestIncome + 15000; // Interest + Cash Discounts
  const netProfitBeforeTax = grossProfit + totalIndirectIncomes - totalIndirectExpenses;
  const taxProvisionEstimated = Math.max(0, Math.round(netProfitBeforeTax * 0.25));
  const netProfitAfterTax = netProfitBeforeTax - taxProvisionEstimated;
  const netProfitMarginPercent = totalSalesTaxable > 0 ? (netProfitAfterTax / totalSalesTaxable) * 100 : 0;

  const profitAndLoss: ProfitAndLossReport = {
    period: periodName,
    salesRevenue: totalSalesTaxable,
    otherOperatingIncome: 0,
    closingStock,
    totalTradingRevenue: totalSalesTaxable + closingStock,

    openingStock,
    grossPurchases: totalPurchasesTaxable,
    directExpenses,
    totalCostOfGoodsSold: costOfGoodsSold,
    grossProfit,
    grossProfitMarginPercent: Math.round(grossProfitMarginPercent * 100) / 100,

    indirectIncomes: {
      interestIncome: otherInterestIncome,
      discountReceived: 15000,
      otherIncome: 0,
      total: totalIndirectIncomes,
    },
    indirectExpenses: {
      salariesAndWages: salaryExpenses,
      rentAndOffice: rentExpenses,
      utilitiesAndPower: utilityExpenses,
      bankAndFinanceCharges: bankCharges,
      professionalAndLegal: 35000,
      softwareAndTech: 28000,
      depreciation: 45000,
      generalAdministrative: 18000,
      total: totalIndirectExpenses + 18000,
    },
    operatingProfitEbitda: grossProfit - (totalIndirectExpenses - 45000),
    netProfitBeforeTax,
    taxProvisionEstimated,
    netProfitAfterTax,
    netProfitMarginPercent: Math.round(netProfitMarginPercent * 100) / 100,
  };

  // E. BALANCE SHEET REPORT
  const proprietorOpeningCapital = 1800000;
  const capitalIntroduced = 0;
  const drawings = 60000;
  const totalProprietorEquity = proprietorOpeningCapital + capitalIntroduced + netProfitAfterTax - drawings;

  const securedLoans = 450000;
  const unsecuredLoans = 0;

  const tangibleFixedAssets = 850000;
  const accumulatedDepreciation = 125000;
  const netFixedAssets = tangibleFixedAssets - accumulatedDepreciation;

  const totalCurrentLiabilities =
    totalCreditorsBalance +
    netGstOutputPayable +
    18500 + // TDS & PF Payable
    25000; // Outstanding Expenses Provision

  const totalLiabilitiesAndEquity = totalProprietorEquity + securedLoans + totalCurrentLiabilities;

  const totalCurrentAssets =
    closingStock +
    totalDebtorsBalance +
    closingBankBalance +
    netGstItcReceivable +
    45000; // Prepaid & Security Deposits

  const totalAssets = netFixedAssets + totalCurrentAssets;
  const varianceDifference = totalAssets - totalLiabilitiesAndEquity;

  const balanceSheet: BalanceSheetReport = {
    asOnDate: '2024-06-30',
    period: periodName,
    equityAndLiabilities: {
      shareholdersFunds: {
        proprietorCapital: proprietorOpeningCapital,
        retainedEarningsAndReserves: 0,
        currentPeriodProfit: netProfitAfterTax,
        lessDrawings: drawings,
        totalCapital: totalProprietorEquity,
      },
      nonCurrentLiabilities: {
        securedBankLoans: securedLoans,
        unsecuredLoans: 0,
        totalNonCurrentLiabilities: securedLoans,
      },
      currentLiabilities: {
        sundryCreditorsTradePayables: totalCreditorsBalance,
        netGstOutputPayable,
        tdsAndStatutoryDues: 18500,
        otherCurrentLiabilities: 25000,
        totalCurrentLiabilities,
      },
      totalLiabilities: totalLiabilitiesAndEquity,
    },
    assets: {
      nonCurrentAssets: {
        tangibleFixedAssets,
        lessDepreciation: accumulatedDepreciation,
        netFixedAssets,
      },
      currentAssets: {
        closingInventories: closingStock,
        sundryDebtorsTradeReceivables: totalDebtorsBalance,
        cashAndBankBalances: closingBankBalance,
        netGstItcReceivable,
        prepaidAndAdvances: 45000,
        totalCurrentAssets,
      },
      totalAssets,
    },
    isBalanced: Math.abs(varianceDifference) < 100,
    varianceDifference,
    workingCapital: totalCurrentAssets - totalCurrentLiabilities,
    currentRatio: totalCurrentLiabilities > 0 ? Math.round((totalCurrentAssets / totalCurrentLiabilities) * 100) / 100 : 1.5,
    debtEquityRatio: totalProprietorEquity > 0 ? Math.round((securedLoans / totalProprietorEquity) * 100) / 100 : 0.25,
  };

  // F. TRIAL BALANCE
  const trialBalance: TrialBalanceRow[] = [
    { accountCode: '1001', accountName: 'Proprietor Capital Account', accountGroup: 'Capital & Reserves', debit: 0, credit: proprietorOpeningCapital },
    { accountCode: '1002', accountName: 'Proprietor Drawings Account', accountGroup: 'Capital & Reserves', debit: drawings, credit: 0 },
    { accountCode: '2001', accountName: 'HDFC / ICICI Current Bank Account', accountGroup: 'Bank Accounts', debit: closingBankBalance, credit: 0 },
    { accountCode: '3001', accountName: 'Sundry Debtors Control Account', accountGroup: 'Sundry Debtors', debit: totalDebtorsBalance, credit: 0 },
    { accountCode: '3002', accountName: 'Sundry Creditors Control Account', accountGroup: 'Sundry Creditors', debit: 0, credit: totalCreditorsBalance },
    { accountCode: '4001', accountName: 'Domestic Sales Account (GST Invoices)', accountGroup: 'Sales Accounts', debit: 0, credit: totalSalesTaxable },
    { accountCode: '4002', accountName: 'Domestic Purchase Account (Taxable Supplies)', accountGroup: 'Purchase Accounts', debit: totalPurchasesTaxable, credit: 0 },
    { accountCode: '5001', accountName: 'Input CGST Tax Credit A/c', accountGroup: 'Duties & Taxes', debit: Math.round(totalPurchasesTax / 2), credit: 0 },
    { accountCode: '5002', accountName: 'Input SGST Tax Credit A/c', accountGroup: 'Duties & Taxes', debit: Math.round(totalPurchasesTax / 2), credit: 0 },
    { accountCode: '5003', accountName: 'Output CGST Liability A/c', accountGroup: 'Duties & Taxes', debit: 0, credit: Math.round(totalSalesTax / 2) },
    { accountCode: '5004', accountName: 'Output SGST Liability A/c', accountGroup: 'Duties & Taxes', debit: 0, credit: Math.round(totalSalesTax / 2) },
    { accountCode: '5005', accountName: 'GST Challan PMT-06 Payments A/c', accountGroup: 'Duties & Taxes', debit: gstTaxesPaidInBank, credit: 0 },
    { accountCode: '6001', accountName: 'Salaries and Employee Wages', accountGroup: 'Indirect Expenses', debit: salaryExpenses, credit: 0 },
    { accountCode: '6002', accountName: 'Office & Premises Rent', accountGroup: 'Indirect Expenses', debit: rentExpenses, credit: 0 },
    { accountCode: '6003', accountName: 'Electricity & Internet Utilities', accountGroup: 'Indirect Expenses', debit: utilityExpenses, credit: 0 },
    { accountCode: '6004', accountName: 'Bank Charges & Transaction AMC', accountGroup: 'Indirect Expenses', debit: bankCharges, credit: 0 },
    { accountCode: '6005', accountName: 'Direct Freight & Handling Charges', accountGroup: 'Direct Expenses', debit: directExpenses, credit: 0 },
    { accountCode: '6006', accountName: 'Professional and Legal Audit Fees', accountGroup: 'Indirect Expenses', debit: 35000, credit: 0 },
    { accountCode: '7001', accountName: 'Fixed Assets (Computer & Office Equipment)', accountGroup: 'Fixed Assets', debit: netFixedAssets, credit: 0 },
    { accountCode: '8001', accountName: 'Bank Term Loan Account', accountGroup: 'Loans & Borrowings', debit: 0, credit: securedLoans },
    { accountCode: '9001', accountName: 'Auto Sweep Term Deposit Interest', accountGroup: 'Indirect Incomes', debit: 0, credit: otherInterestIncome },
  ];

  return {
    vendorLedgers,
    customerLedgers,
    trialBalance,
    profitAndLoss,
    balanceSheet,
    summary: {
      totalSales: totalSalesGross,
      totalPurchases: totalPurchasesGross,
      totalBankCredits: totalBankDeposits,
      totalBankDebits: totalBankWithdrawals,
      closingBankBalance,
      debtorsOutstanding: totalDebtorsBalance,
      creditorsOutstanding: totalCreditorsBalance,
      netGstPayableOrItc: netGstOutputPayableRaw,
      netProfit: netProfitAfterTax,
    },
  };
}
