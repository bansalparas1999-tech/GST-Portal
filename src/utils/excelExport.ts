import * as XLSX from 'xlsx';
import {
  ProfitAndLossReport,
  BalanceSheetReport,
  TrialBalanceRow,
  PartyLedgerAccount,
  BankTransaction,
} from '../types';

export interface CompanyExportHeader {
  companyName: string;
  companyGstin: string;
  period: string;
  generatedDate?: string;
}

/**
 * Format currency number cleanly for Excel export
 */
const fmt = (num: number | undefined | null): number => {
  if (num === undefined || num === null || isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * 1. Export Profit & Loss Account to Excel (.xlsx)
 */
export function exportProfitAndLossToExcel(
  pnl: ProfitAndLossReport,
  header: CompanyExportHeader
) {
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED / NOT SPECIFIED'}`],
    [`STATEMENT OF PROFIT AND LOSS (TRADING & P&L A/C) - PERIOD: ${header.period}`],
    [`Generated On: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    ['PARTICULARS', 'SCHEDULE REF', 'AMOUNT (INR)', 'PERCENTAGE (%) OF REVENUE'],
    ['----------------------------------------------------', '------------', '----------------', '----------------------'],
    ['I. REVENUE FROM OPERATIONS (TRADING CREDIT)', '', '', ''],
    ['   Gross Taxable Sales / Turnover', 'Note 1', fmt(pnl.salesRevenue), '100.00%'],
    ['   Other Operating Incomes', 'Note 2', fmt(pnl.otherOperatingIncome), ''],
    ['   Add: Closing Stock of Inventory', 'Note 3', fmt(pnl.closingStock), ''],
    ['   TOTAL TRADING REVENUE (A)', '', fmt(pnl.totalTradingRevenue), '100.00%'],
    [],
    ['II. COST OF GOODS SOLD (COGS) & DIRECT COSTS', '', '', ''],
    ['   Opening Stock of Inventory', 'Note 4', fmt(pnl.openingStock), ''],
    ['   Add: Taxable Purchases (Direct Materials)', 'Note 5', fmt(pnl.grossPurchases), ''],
    ['   Add: Direct Handling, Freight & Wages', 'Note 6', fmt(pnl.directExpenses), ''],
    ['   Less: Closing Stock of Inventory', 'Note 7', fmt(pnl.closingStock), ''],
    ['   TOTAL COST OF GOODS SOLD (COGS) (B)', '', fmt(pnl.totalCostOfGoodsSold), fmt(pnl.salesRevenue > 0 ? (pnl.totalCostOfGoodsSold / pnl.salesRevenue) * 100 : 0) + '%'],
    [],
    ['III. GROSS PROFIT (A - B)', '', fmt(pnl.grossProfit), `${pnl.grossProfitMarginPercent}%`],
    [],
    ['IV. INDIRECT INCOMES', '', '', ''],
    ['   Interest & Other Financial Incomes', 'Note 8', fmt(pnl.indirectIncomes.interestIncome), ''],
    ['   Discounts Received & Other Sundry Incomes', 'Note 9', fmt(pnl.indirectIncomes.discountReceived + pnl.indirectIncomes.otherIncome), ''],
    ['   TOTAL INDIRECT INCOMES (C)', '', fmt(pnl.indirectIncomes.total), ''],
    [],
    ['V. OPERATING, ADMINISTRATIVE & INDIRECT EXPENSES', '', '', ''],
    ['   Salaries, Wages & Employee Benefits', 'Note 10', fmt(pnl.indirectExpenses.salariesAndWages), ''],
    ['   Office & Premises Rent', 'Note 11', fmt(pnl.indirectExpenses.rentAndOffice), ''],
    ['   Power, Utilities & Telecom Expenses', 'Note 12', fmt(pnl.indirectExpenses.utilitiesAndPower), ''],
    ['   Legal, Professional & Audit Fees', 'Note 13', fmt(pnl.indirectExpenses.professionalAndLegal), ''],
    ['   Software, Tech & IT Subscriptions', 'Note 14', fmt(pnl.indirectExpenses.softwareAndTech), ''],
    ['   General & Office Administrative Overheads', 'Note 15', fmt(pnl.indirectExpenses.generalAdministrative), ''],
    ['   Bank Charges & Finance Costs', 'Note 16', fmt(pnl.indirectExpenses.bankAndFinanceCharges), ''],
    ['   Depreciation & Amortization on Fixed Assets', 'Note 17', fmt(pnl.indirectExpenses.depreciation), ''],
    ['   TOTAL INDIRECT OPERATING EXPENSES (D)', '', fmt(pnl.indirectExpenses.total), fmt(pnl.salesRevenue > 0 ? (pnl.indirectExpenses.total / pnl.salesRevenue) * 100 : 0) + '%'],
    [],
    ['VI. OPERATING PROFIT / EBITDA (III + C - D + Finance + Depr)', '', fmt(pnl.operatingProfitEbitda), ''],
    [],
    ['VII. NET PROFIT BEFORE TAX (PBT) (III + C - D)', '', fmt(pnl.netProfitBeforeTax), fmt(pnl.salesRevenue > 0 ? (pnl.netProfitBeforeTax / pnl.salesRevenue) * 100 : 0) + '%'],
    ['   Less: Estimated Provision for Income Tax (25%)', 'Provision', fmt(pnl.taxProvisionEstimated), ''],
    ['VIII. NET PROFIT AFTER TAX (PAT) TRANSFERRED TO CAPITAL', '', fmt(pnl.netProfitAfterTax), `${pnl.netProfitMarginPercent}%`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 54 }, { wch: 16 }, { wch: 22 }, { wch: 26 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Profit & Loss');
  const fileName = `Profit_and_Loss_${(header.companyName || 'Company').replace(/\s+/g, '_')}_${header.period}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 2. Export Balance Sheet to Excel (.xlsx)
 */
export function exportBalanceSheetToExcel(
  bs: BalanceSheetReport,
  header: CompanyExportHeader
) {
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED / NOT SPECIFIED'}`],
    [`BALANCE SHEET (SCHEDULE III FORMAT) - AS AT: ${bs.asOnDate}`],
    [`Period: ${header.period} | Audit Status: ${bs.isBalanced ? 'BALANCED' : 'VARIANCE DETECTED'}`],
    [`Generated On: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    ['PARTICULARS', 'NOTE NO.', 'AMOUNT (INR)', 'SUB-TOTAL (INR)'],
    ['====================================================', '========', '================', '================'],
    ['I. EQUITY AND LIABILITIES (SOURCES OF FUNDS)', '', '', ''],
    ['1. SHAREHOLDERS\' / PROPRIETOR\'S FUNDS', '', '', ''],
    ['   (a) Proprietor Capital / Share Capital', '1', fmt(bs.equityAndLiabilities.shareholdersFunds.proprietorCapital), ''],
    ['   (b) Add: Current Period Net Profit (PAT)', '2', fmt(bs.equityAndLiabilities.shareholdersFunds.currentPeriodProfit), ''],
    ['   (c) Reserves & Retained Surplus', '3', fmt(bs.equityAndLiabilities.shareholdersFunds.retainedEarningsAndReserves), ''],
    ['   (d) Less: Personal Drawings / Partner Withdrawals', '4', -fmt(bs.equityAndLiabilities.shareholdersFunds.lessDrawings), fmt(bs.equityAndLiabilities.shareholdersFunds.totalCapital)],
    [],
    ['2. NON-CURRENT LIABILITIES', '', '', ''],
    ['   (a) Secured Bank Term Loans', '5', fmt(bs.equityAndLiabilities.nonCurrentLiabilities.securedBankLoans), ''],
    ['   (b) Unsecured Loans & Other Borrowings', '6', fmt(bs.equityAndLiabilities.nonCurrentLiabilities.unsecuredLoans), fmt(bs.equityAndLiabilities.nonCurrentLiabilities.totalNonCurrentLiabilities)],
    [],
    ['3. CURRENT LIABILITIES & PROVISIONS', '', '', ''],
    ['   (a) Sundry Creditors / Trade Payables (Vendors)', '7', fmt(bs.equityAndLiabilities.currentLiabilities.sundryCreditorsTradePayables), ''],
    ['   (b) Statutory Net GST Output Tax Payable', '8', fmt(bs.equityAndLiabilities.currentLiabilities.netGstOutputPayable), ''],
    ['   (c) TDS & Other Statutory Dues', '9', fmt(bs.equityAndLiabilities.currentLiabilities.tdsAndStatutoryDues), ''],
    ['   (d) Other Current Liabilities & Accruals', '10', fmt(bs.equityAndLiabilities.currentLiabilities.otherCurrentLiabilities), fmt(bs.equityAndLiabilities.currentLiabilities.totalCurrentLiabilities)],
    [],
    ['TOTAL EQUITY AND LIABILITIES', '', '', fmt(bs.equityAndLiabilities.totalLiabilities)],
    ['====================================================', '========', '================', '================'],
    [],
    ['II. ASSETS (APPLICATION OF FUNDS)', '', '', ''],
    ['1. NON-CURRENT ASSETS (FIXED ASSETS)', '', '', ''],
    ['   (a) Tangible Fixed Assets (Gross Block)', '11', fmt(bs.assets.nonCurrentAssets.tangibleFixedAssets), ''],
    ['   (b) Less: Accumulated Depreciation', '12', -fmt(bs.assets.nonCurrentAssets.lessDepreciation), fmt(bs.assets.nonCurrentAssets.netFixedAssets)],
    [],
    ['2. CURRENT ASSETS, LOANS & ADVANCES', '', '', ''],
    ['   (a) Inventories / Closing Stock-in-Trade', '13', fmt(bs.assets.currentAssets.closingInventories), ''],
    ['   (b) Sundry Debtors / Trade Receivables (Customers)', '14', fmt(bs.assets.currentAssets.sundryDebtorsTradeReceivables), ''],
    ['   (c) Cash & Bank Balances (HDFC/ICICI)', '15', fmt(bs.assets.currentAssets.cashAndBankBalances), ''],
    ['   (d) GST Input Tax Credit (ITC Asset Carried Forward)', '16', fmt(bs.assets.currentAssets.netGstItcReceivable), ''],
    ['   (e) Prepaid Expenses & Security Deposits', '17', fmt(bs.assets.currentAssets.prepaidAndAdvances), fmt(bs.assets.currentAssets.totalCurrentAssets)],
    [],
    ['TOTAL ASSETS', '', '', fmt(bs.assets.totalAssets)],
    ['====================================================', '========', '================', '================'],
    [],
    ['STATUTORY RATIOS & COMPLIANCE MEMORANDUM', '', '', ''],
    ['Net Working Capital (Current Assets - Current Liabilities)', '', fmt(bs.workingCapital), ''],
    ['Current Ratio (Current Assets / Current Liabilities)', '', `${bs.currentRatio} : 1`, 'Ideal: 1.5 - 2.0 : 1'],
    ['Debt to Equity Ratio (Total Borrowings / Total Equity)', '', `${bs.debtEquityRatio}`, 'Ideal: < 2.0'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 54 }, { wch: 14 }, { wch: 22 }, { wch: 22 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Balance Sheet');
  const fileName = `Balance_Sheet_${(header.companyName || 'Company').replace(/\s+/g, '_')}_${header.period}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 3. Export All Vendor General Ledgers (GLs) to Excel (.xlsx)
 */
export function exportAllVendorGLsToExcel(
  vendorLedgers: PartyLedgerAccount[],
  header: CompanyExportHeader
) {
  const wb = XLSX.utils.book_new();

  // Tab 1: Vendor Summary Master List
  const summaryRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED / NOT SPECIFIED'}`],
    [`ALL VENDOR GENERAL LEDGERS (SUNDRY CREDITORS) - MASTER SUMMARY REPORT`],
    [`Period: ${header.period} | Generated: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    [
      'SR NO.',
      'VENDOR / SUPPLIER NAME',
      'VENDOR GSTIN',
      'OPENING BALANCE (INR)',
      'TOTAL PURCHASES (CREDIT) (INR)',
      'TOTAL PAYMENTS (DEBIT) (INR)',
      'NET CLOSING OUTSTANDING (INR)',
      'BALANCE TYPE',
      'STATUS',
      'INVOICES COUNT',
      'PAYMENTS COUNT',
    ],
  ];

  let totalPurchasesAll = 0;
  let totalPaymentsAll = 0;
  let totalOutstandingAll = 0;

  vendorLedgers.forEach((v, index) => {
    totalPurchasesAll += v.totalCredit;
    totalPaymentsAll += v.totalDebit;
    totalOutstandingAll += v.closingBalance;

    summaryRows.push([
      index + 1,
      v.partyName,
      v.partyGstin || 'Unregistered Vendor',
      fmt(v.openingBalance),
      fmt(v.totalCredit),
      fmt(v.totalDebit),
      fmt(v.closingBalance),
      v.closingType,
      v.closingBalance > 0 ? 'PAYABLE (CR)' : v.closingBalance < 0 ? 'ADVANCE PAID (DR)' : 'NIL / SETTLED',
      v.invoicesCount,
      v.paymentsCount,
    ]);
  });

  summaryRows.push([]);
  summaryRows.push([
    'TOTAL',
    `TOTAL VENDORS: ${vendorLedgers.length}`,
    '',
    '',
    fmt(totalPurchasesAll),
    fmt(totalPaymentsAll),
    fmt(totalOutstandingAll),
    'CR NET',
    '',
    '',
    '',
  ]);

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs['!cols'] = [
    { wch: 8 },
    { wch: 34 },
    { wch: 18 },
    { wch: 22 },
    { wch: 28 },
    { wch: 28 },
    { wch: 28 },
    { wch: 16 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Vendor GL Summary');

  // Tab 2: Consolidated Itemized Transaction Register for ALL Vendors
  const allEntriesRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`ALL VENDOR DETAILED GENERAL LEDGER TRANSACTIONS (ITEMIZED CHRONOLOGICAL REGISTER)`],
    [`Period: ${header.period} | Generated: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    [
      'VENDOR NAME',
      'VENDOR GSTIN',
      'DATE',
      'VOUCHER TYPE',
      'VOUCHER / INVOICE NO',
      'PARTICULARS / NARRATION',
      'DEBIT (PAYMENT) (INR)',
      'CREDIT (BILL/PURCHASE) (INR)',
      'RUNNING BALANCE (INR)',
      'DR / CR',
    ],
  ];

  vendorLedgers.forEach((vendor) => {
    // Opening balance row
    allEntriesRows.push([
      vendor.partyName,
      vendor.partyGstin || 'URP',
      '-',
      'OPENING',
      'B/F',
      'Opening Balance Brought Forward',
      0,
      0,
      fmt(vendor.openingBalance),
      vendor.openingType,
    ]);

    vendor.entries.forEach((entry) => {
      allEntriesRows.push([
        vendor.partyName,
        vendor.partyGstin || 'URP',
        entry.date,
        entry.voucherType,
        entry.voucherNo,
        entry.particulars,
        fmt(entry.debit),
        fmt(entry.credit),
        fmt(entry.runningBalance),
        entry.balanceType,
      ]);
    });

    // Divider
    allEntriesRows.push([
      `Subtotal: ${vendor.partyName}`,
      vendor.partyGstin || '',
      '',
      '',
      '',
      `Net Closing Balance:`,
      fmt(vendor.totalDebit),
      fmt(vendor.totalCredit),
      fmt(vendor.closingBalance),
      vendor.closingType,
    ]);
    allEntriesRows.push([]);
  });

  const detailedWs = XLSX.utils.aoa_to_sheet(allEntriesRows);
  detailedWs['!cols'] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 42 },
    { wch: 22 },
    { wch: 26 },
    { wch: 22 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, detailedWs, 'All Vendor GLs Itemized');

  const fileName = `All_Vendor_GLs_${(header.companyName || 'Company').replace(/\s+/g, '_')}_${header.period}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 4. Export Single Vendor GL to Excel (.xlsx)
 */
export function exportSingleVendorGLToExcel(
  vendor: PartyLedgerAccount,
  header: CompanyExportHeader
) {
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED'}`],
    [`VENDOR GENERAL LEDGER: ${vendor.partyName.toUpperCase()}`],
    [`Vendor GSTIN: ${vendor.partyGstin || 'Unregistered / URP'} | Period: ${header.period}`],
    [`Generated On: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    ['DATE', 'VOUCHER TYPE', 'VOUCHER / INVOICE NO.', 'PARTICULARS', 'DEBIT (PAYMENT) (INR)', 'CREDIT (BILL) (INR)', 'RUNNING BALANCE (INR)', 'DR/CR'],
    ['----------', '--------------', '--------------------', '----------------------------------------', '------------------', '-----------------', '---------------------', '-----'],
    ['-', 'OPENING', 'B/F', 'Opening Balance Brought Forward', 0, 0, fmt(vendor.openingBalance), vendor.openingType],
  ];

  vendor.entries.forEach((e) => {
    rows.push([
      e.date,
      e.voucherType,
      e.voucherNo,
      e.particulars,
      fmt(e.debit),
      fmt(e.credit),
      fmt(e.runningBalance),
      e.balanceType,
    ]);
  });

  rows.push(['----------', '--------------', '--------------------', '----------------------------------------', '------------------', '-----------------', '---------------------', '-----']);
  rows.push([
    'TOTALS',
    '',
    `Total Entries: ${vendor.entries.length}`,
    `Purchases: ₹${fmt(vendor.totalCredit).toLocaleString('en-IN')} | Paid: ₹${fmt(vendor.totalDebit).toLocaleString('en-IN')}`,
    fmt(vendor.totalDebit),
    fmt(vendor.totalCredit),
    fmt(vendor.closingBalance),
    vendor.closingType,
  ]);
  rows.push([]);
  rows.push([
    'CLOSING BALANCE:',
    '',
    '',
    `${vendor.partyName} (Net Outstanding Balance)`,
    '',
    '',
    fmt(vendor.closingBalance),
    vendor.closingType,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 42 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 10 },
  ];

  const safePartyName = (vendor.partyName || 'Vendor').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  XLSX.utils.book_append_sheet(wb, ws, `GL_${safePartyName}`);
  const fileName = `Vendor_GL_${safePartyName}_${header.period}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 5. Export All Customer General Ledgers (GLs) to Excel (.xlsx)
 */
export function exportAllCustomerGLsToExcel(
  customerLedgers: PartyLedgerAccount[],
  header: CompanyExportHeader
) {
  const wb = XLSX.utils.book_new();

  // Summary Sheet
  const summaryRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED'}`],
    [`CUSTOMER GENERAL LEDGERS (SUNDRY DEBTORS) - SUMMARY REPORT`],
    [`Period: ${header.period} | Generated: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    [
      'SR NO.',
      'CUSTOMER / CLIENT NAME',
      'CUSTOMER GSTIN',
      'OPENING BALANCE (INR)',
      'TOTAL SALES INVOICED (DEBIT) (INR)',
      'TOTAL PAYMENTS RECEIVED (CREDIT) (INR)',
      'NET RECEIVABLE BALANCE (INR)',
      'BALANCE TYPE',
      'STATUS',
      'INVOICES COUNT',
      'RECEIPTS COUNT',
    ],
  ];

  let totalSalesAll = 0;
  let totalReceiptsAll = 0;
  let totalReceivableAll = 0;

  customerLedgers.forEach((c, idx) => {
    totalSalesAll += c.totalDebit;
    totalReceiptsAll += c.totalCredit;
    totalReceivableAll += c.closingBalance;

    summaryRows.push([
      idx + 1,
      c.partyName,
      c.partyGstin || 'URP / Consumer',
      fmt(c.openingBalance),
      fmt(c.totalDebit),
      fmt(c.totalCredit),
      fmt(c.closingBalance),
      c.closingType,
      c.closingBalance > 0 ? 'RECEIVABLE (DR)' : c.closingBalance < 0 ? 'ADVANCE RECEIVED (CR)' : 'SETTLED',
      c.invoicesCount,
      c.paymentsCount,
    ]);
  });

  summaryRows.push([]);
  summaryRows.push([
    'TOTAL',
    `TOTAL CUSTOMERS: ${customerLedgers.length}`,
    '',
    '',
    fmt(totalSalesAll),
    fmt(totalReceiptsAll),
    fmt(totalReceivableAll),
    'DR NET',
    '',
    '',
    '',
  ]);

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWs['!cols'] = [
    { wch: 8 },
    { wch: 34 },
    { wch: 18 },
    { wch: 22 },
    { wch: 28 },
    { wch: 28 },
    { wch: 28 },
    { wch: 16 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Customer GL Summary');

  // Detailed Transactions
  const detailedRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`ALL CUSTOMER DETAILED GENERAL LEDGER TRANSACTIONS (ITEMIZED)`],
    [`Period: ${header.period} | Generated: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    [
      'CUSTOMER NAME',
      'CUSTOMER GSTIN',
      'DATE',
      'VOUCHER TYPE',
      'INVOICE / RECEIPT NO',
      'PARTICULARS',
      'DEBIT (SALES) (INR)',
      'CREDIT (RECEIPT) (INR)',
      'RUNNING BALANCE (INR)',
      'DR / CR',
    ],
  ];

  customerLedgers.forEach((cust) => {
    detailedRows.push([
      cust.partyName,
      cust.partyGstin || 'URP',
      '-',
      'OPENING',
      'B/F',
      'Opening Balance Brought Forward',
      0,
      0,
      fmt(cust.openingBalance),
      cust.openingType,
    ]);

    cust.entries.forEach((e) => {
      detailedRows.push([
        cust.partyName,
        cust.partyGstin || 'URP',
        e.date,
        e.voucherType,
        e.voucherNo,
        e.particulars,
        fmt(e.debit),
        fmt(e.credit),
        fmt(e.runningBalance),
        e.balanceType,
      ]);
    });

    detailedRows.push([
      `Subtotal: ${cust.partyName}`,
      cust.partyGstin || '',
      '',
      '',
      '',
      'Net Closing Receivable:',
      fmt(cust.totalDebit),
      fmt(cust.totalCredit),
      fmt(cust.closingBalance),
      cust.closingType,
    ]);
    detailedRows.push([]);
  });

  const detailedWs = XLSX.utils.aoa_to_sheet(detailedRows);
  detailedWs['!cols'] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 42 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, detailedWs, 'All Customer GLs Detailed');

  const fileName = `All_Customer_GLs_${(header.companyName || 'Company').replace(/\s+/g, '_')}_${header.period}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 6. Export Single Customer GL to Excel (.xlsx)
 */
export function exportSingleCustomerGLToExcel(
  customer: PartyLedgerAccount,
  header: CompanyExportHeader
) {
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED'}`],
    [`CUSTOMER GENERAL LEDGER: ${customer.partyName.toUpperCase()}`],
    [`Customer GSTIN: ${customer.partyGstin || 'URP'} | Period: ${header.period}`],
    [`Generated On: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    ['DATE', 'VOUCHER TYPE', 'INVOICE / RECEIPT NO.', 'PARTICULARS', 'DEBIT (SALES) (INR)', 'CREDIT (RECEIPT) (INR)', 'RUNNING BALANCE (INR)', 'DR/CR'],
    ['----------', '--------------', '--------------------', '----------------------------------------', '------------------', '-------------------', '---------------------', '-----'],
    ['-', 'OPENING', 'B/F', 'Opening Balance Brought Forward', 0, 0, fmt(customer.openingBalance), customer.openingType],
  ];

  customer.entries.forEach((e) => {
    rows.push([
      e.date,
      e.voucherType,
      e.voucherNo,
      e.particulars,
      fmt(e.debit),
      fmt(e.credit),
      fmt(e.runningBalance),
      e.balanceType,
    ]);
  });

  rows.push(['----------', '--------------', '--------------------', '----------------------------------------', '------------------', '-------------------', '---------------------', '-----']);
  rows.push([
    'TOTALS',
    '',
    `Total Entries: ${customer.entries.length}`,
    `Sales: ₹${fmt(customer.totalDebit).toLocaleString('en-IN')} | Receipts: ₹${fmt(customer.totalCredit).toLocaleString('en-IN')}`,
    fmt(customer.totalDebit),
    fmt(customer.totalCredit),
    fmt(customer.closingBalance),
    customer.closingType,
  ]);
  rows.push([]);
  rows.push([
    'CLOSING BALANCE:',
    '',
    '',
    `${customer.partyName} (Net Receivable Amount)`,
    '',
    '',
    fmt(customer.closingBalance),
    customer.closingType,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    { wch: 42 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 10 },
  ];

  const safePartyName = (customer.partyName || 'Customer').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25);
  XLSX.utils.book_append_sheet(wb, ws, `GL_${safePartyName}`);
  const fileName = `Customer_GL_${safePartyName}_${header.period}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 7. Export Trial Balance to Excel (.xlsx)
 */
export function exportTrialBalanceToExcel(
  tb: TrialBalanceRow[],
  header: CompanyExportHeader
) {
  const wb = XLSX.utils.book_new();

  const rows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED'}`],
    [`TRIAL BALANCE AS AT PERIOD: ${header.period}`],
    [`Generated On: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    ['A/C CODE', 'ACCOUNT HEAD / PARTICULARS', 'GROUP CLASSIFICATION', 'DEBIT AMOUNT (INR)', 'CREDIT AMOUNT (INR)'],
    ['--------', '----------------------------------------------------', '-------------------------', '------------------', '-------------------'],
  ];

  let totalDebit = 0;
  let totalCredit = 0;

  tb.forEach((row) => {
    totalDebit += row.debit;
    totalCredit += row.credit;

    rows.push([
      row.accountCode,
      row.accountName,
      row.accountGroup,
      fmt(row.debit),
      fmt(row.credit),
    ]);
  });

  rows.push(['--------', '----------------------------------------------------', '-------------------------', '------------------', '-------------------']);
  rows.push([
    'TOTAL',
    'GRAND TOTAL OF TRIAL BALANCE',
    Math.abs(totalDebit - totalCredit) < 1 ? 'BALANCED MATCH' : 'DISCREPANCY DETECTED',
    fmt(totalDebit),
    fmt(totalCredit),
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 44 }, { wch: 28 }, { wch: 22 }, { wch: 22 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
  const fileName = `Trial_Balance_${(header.companyName || 'Company').replace(/\s+/g, '_')}_${header.period}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 8. Master Complete Financial Statements & Ledgers Workbook (.xlsx)
 * Contains:
 *  1. P&L Account
 *  2. Balance Sheet
 *  3. Trial Balance
 *  4. Vendor GL Summary
 *  5. Customer GL Summary
 *  6. All Vendor Detailed GLs
 *  7. All Customer Detailed GLs
 *  8. Bank Statement / Cash Register
 */
export function exportMasterFinancialPackToExcel(
  pnl: ProfitAndLossReport,
  bs: BalanceSheetReport,
  tb: TrialBalanceRow[],
  vendorLedgers: PartyLedgerAccount[],
  customerLedgers: PartyLedgerAccount[],
  bankTransactions: BankTransaction[],
  header: CompanyExportHeader
) {
  const wb = XLSX.utils.book_new();

  // 1. Profit & Loss Sheet
  const pnlRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED'}`],
    [`STATEMENT OF PROFIT AND LOSS - PERIOD: ${header.period}`],
    [],
    ['PARTICULARS', 'SCHEDULE REF', 'AMOUNT (INR)', 'PERCENTAGE (%)'],
    ['I. REVENUE FROM OPERATIONS', '', '', ''],
    ['   Gross Taxable Sales / Turnover', 'Note 1', fmt(pnl.salesRevenue), '100.00%'],
    ['   Other Operating Incomes', 'Note 2', fmt(pnl.otherOperatingIncome), ''],
    ['   Closing Stock of Inventory', 'Note 3', fmt(pnl.closingStock), ''],
    ['   TOTAL TRADING REVENUE (A)', '', fmt(pnl.totalTradingRevenue), '100.00%'],
    [],
    ['II. COST OF GOODS SOLD (COGS)', '', '', ''],
    ['   Opening Stock', 'Note 4', fmt(pnl.openingStock), ''],
    ['   Add: Taxable Purchases', 'Note 5', fmt(pnl.grossPurchases), ''],
    ['   Add: Direct Production & Wages', 'Note 6', fmt(pnl.directExpenses), ''],
    ['   Less: Closing Stock', 'Note 7', fmt(pnl.closingStock), ''],
    ['   TOTAL COST OF GOODS SOLD (B)', '', fmt(pnl.totalCostOfGoodsSold), ''],
    [],
    ['III. GROSS PROFIT (A - B)', '', fmt(pnl.grossProfit), `${pnl.grossProfitMarginPercent}%`],
    [],
    ['IV. INDIRECT OPERATING EXPENSES', '', '', ''],
    ['   Salaries & Employee Benefits', 'Note 8', fmt(pnl.indirectExpenses.salariesAndWages), ''],
    ['   Rent & Premises', 'Note 9', fmt(pnl.indirectExpenses.rentAndOffice), ''],
    ['   Utilities & Power', 'Note 10', fmt(pnl.indirectExpenses.utilitiesAndPower), ''],
    ['   Legal, Professional & Tech', 'Note 11', fmt(pnl.indirectExpenses.professionalAndLegal + pnl.indirectExpenses.softwareAndTech), ''],
    ['   Bank Charges & Finance Costs', 'Note 12', fmt(pnl.indirectExpenses.bankAndFinanceCharges), ''],
    ['   Depreciation & Amortization', 'Note 13', fmt(pnl.indirectExpenses.depreciation), ''],
    ['   General & Admin Overheads', 'Note 14', fmt(pnl.indirectExpenses.generalAdministrative), ''],
    ['   TOTAL INDIRECT EXPENSES (C)', '', fmt(pnl.indirectExpenses.total), ''],
    [],
    ['V. OPERATING PROFIT / EBITDA', '', fmt(pnl.operatingProfitEbitda), ''],
    ['VI. NET PROFIT BEFORE TAX (PBT)', '', fmt(pnl.netProfitBeforeTax), ''],
    ['   Provision for Income Tax (25%)', '', fmt(pnl.taxProvisionEstimated), ''],
    ['VII. NET PROFIT AFTER TAX (PAT)', '', fmt(pnl.netProfitAfterTax), `${pnl.netProfitMarginPercent}%`],
  ];
  const pnlWs = XLSX.utils.aoa_to_sheet(pnlRows);
  pnlWs['!cols'] = [{ wch: 46 }, { wch: 16 }, { wch: 22 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, pnlWs, 'Profit & Loss');

  // 2. Balance Sheet
  const bsRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED'}`],
    [`BALANCE SHEET (SCHEDULE III) - AS AT: ${bs.asOnDate}`],
    [],
    ['EQUITY AND LIABILITIES', 'NOTE NO.', 'AMOUNT (INR)', 'SUBTOTAL (INR)'],
    ['1. SHAREHOLDERS\' / PROPRIETOR\'S FUNDS', '', '', ''],
    ['   Proprietor Capital', '1', fmt(bs.equityAndLiabilities.shareholdersFunds.proprietorCapital), ''],
    ['   Current Period Profit (PAT)', '2', fmt(bs.equityAndLiabilities.shareholdersFunds.currentPeriodProfit), ''],
    ['   Reserves & Surplus', '3', fmt(bs.equityAndLiabilities.shareholdersFunds.retainedEarningsAndReserves), ''],
    ['   Less: Personal Drawings', '4', -fmt(bs.equityAndLiabilities.shareholdersFunds.lessDrawings), fmt(bs.equityAndLiabilities.shareholdersFunds.totalCapital)],
    ['2. NON-CURRENT LIABILITIES', '', '', ''],
    ['   Secured Bank Term Loans', '5', fmt(bs.equityAndLiabilities.nonCurrentLiabilities.securedBankLoans), ''],
    ['   Unsecured Borrowings', '6', fmt(bs.equityAndLiabilities.nonCurrentLiabilities.unsecuredLoans), fmt(bs.equityAndLiabilities.nonCurrentLiabilities.totalNonCurrentLiabilities)],
    ['3. CURRENT LIABILITIES', '', '', ''],
    ['   Trade Payables / Sundry Creditors (Vendors)', '7', fmt(bs.equityAndLiabilities.currentLiabilities.sundryCreditorsTradePayables), ''],
    ['   GST Output Tax Liability (Net)', '8', fmt(bs.equityAndLiabilities.currentLiabilities.netGstOutputPayable), ''],
    ['   TDS & Statutory Dues', '9', fmt(bs.equityAndLiabilities.currentLiabilities.tdsAndStatutoryDues), ''],
    ['   Other Current Liabilities', '10', fmt(bs.equityAndLiabilities.currentLiabilities.otherCurrentLiabilities), fmt(bs.equityAndLiabilities.currentLiabilities.totalCurrentLiabilities)],
    ['TOTAL EQUITY AND LIABILITIES', '', '', fmt(bs.equityAndLiabilities.totalLiabilities)],
    [],
    ['ASSETS', 'NOTE NO.', 'AMOUNT (INR)', 'SUBTOTAL (INR)'],
    ['1. NON-CURRENT ASSETS (FIXED ASSETS)', '', '', ''],
    ['   Gross Tangible Fixed Assets', '11', fmt(bs.assets.nonCurrentAssets.tangibleFixedAssets), ''],
    ['   Less: Accumulated Depreciation', '12', -fmt(bs.assets.nonCurrentAssets.lessDepreciation), fmt(bs.assets.nonCurrentAssets.netFixedAssets)],
    ['2. CURRENT ASSETS', '', '', ''],
    ['   Inventories / Closing Stock', '13', fmt(bs.assets.currentAssets.closingInventories), ''],
    ['   Trade Receivables / Sundry Debtors (Customers)', '14', fmt(bs.assets.currentAssets.sundryDebtorsTradeReceivables), ''],
    ['   Cash & Bank Balances (HDFC/ICICI)', '15', fmt(bs.assets.currentAssets.cashAndBankBalances), ''],
    ['   GST Input Tax Credit (ITC Asset)', '16', fmt(bs.assets.currentAssets.netGstItcReceivable), ''],
    ['   Prepaid Expenses & Advances', '17', fmt(bs.assets.currentAssets.prepaidAndAdvances), fmt(bs.assets.currentAssets.totalCurrentAssets)],
    ['TOTAL ASSETS', '', '', fmt(bs.assets.totalAssets)],
  ];
  const bsWs = XLSX.utils.aoa_to_sheet(bsRows);
  bsWs['!cols'] = [{ wch: 48 }, { wch: 14 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, bsWs, 'Balance Sheet');

  // 3. Trial Balance Sheet
  const tbRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`TRIAL BALANCE AS AT: ${header.period}`],
    [],
    ['A/C CODE', 'ACCOUNT HEAD', 'GROUP', 'DEBIT AMOUNT (INR)', 'CREDIT AMOUNT (INR)'],
  ];
  let totDr = 0;
  let totCr = 0;
  tb.forEach((t) => {
    totDr += t.debit;
    totCr += t.credit;
    tbRows.push([t.accountCode, t.accountName, t.accountGroup, fmt(t.debit), fmt(t.credit)]);
  });
  tbRows.push(['', 'TOTAL', '', fmt(totDr), fmt(totCr)]);
  const tbWs = XLSX.utils.aoa_to_sheet(tbRows);
  tbWs['!cols'] = [{ wch: 12 }, { wch: 42 }, { wch: 24 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, tbWs, 'Trial Balance');

  // 4. Vendor Summary
  const vSummaryRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`VENDOR GENERAL LEDGERS (SUNDRY CREDITORS) SUMMARY`],
    [],
    ['SR NO.', 'VENDOR NAME', 'GSTIN', 'OPENING (INR)', 'PURCHASES (CR) (INR)', 'PAYMENTS (DR) (INR)', 'NET OUTSTANDING (INR)', 'TYPE'],
  ];
  vendorLedgers.forEach((v, i) => {
    vSummaryRows.push([i + 1, v.partyName, v.partyGstin || 'URP', fmt(v.openingBalance), fmt(v.totalCredit), fmt(v.totalDebit), fmt(v.closingBalance), v.closingType]);
  });
  const vSumWs = XLSX.utils.aoa_to_sheet(vSummaryRows);
  vSumWs['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, vSumWs, 'Vendor Summary');

  // 5. Customer Summary
  const cSummaryRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`CUSTOMER GENERAL LEDGERS (SUNDRY DEBTORS) SUMMARY`],
    [],
    ['SR NO.', 'CUSTOMER NAME', 'GSTIN', 'OPENING (INR)', 'SALES (DR) (INR)', 'RECEIPTS (CR) (INR)', 'NET RECEIVABLE (INR)', 'TYPE'],
  ];
  customerLedgers.forEach((c, i) => {
    cSummaryRows.push([i + 1, c.partyName, c.partyGstin || 'URP', fmt(c.openingBalance), fmt(c.totalDebit), fmt(c.totalCredit), fmt(c.closingBalance), c.closingType]);
  });
  const cSumWs = XLSX.utils.aoa_to_sheet(cSummaryRows);
  cSumWs['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, cSumWs, 'Customer Summary');

  // 6. Bank Book / Statements
  const bankRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`BANK STATEMENT & CASH TRANSACTIONS`],
    [],
    ['DATE', 'REF NO', 'NARRATION', 'CATEGORY', 'TAGGED PARTY', 'WITHDRAWAL (DR) (INR)', 'DEPOSIT (CR) (INR)', 'RUNNING BALANCE (INR)'],
  ];
  bankTransactions.forEach((b) => {
    bankRows.push([
      b.date,
      b.referenceNo || '-',
      b.narration,
      b.category,
      b.partyName || '-',
      fmt(b.withdrawal),
      fmt(b.deposit),
      fmt(b.balance),
    ]);
  });
  const bankWs = XLSX.utils.aoa_to_sheet(bankRows);
  bankWs['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 42 }, { wch: 20 }, { wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, bankWs, 'Bank Book');

  const fileName = `Financial_Statements_and_Ledgers_Pack_${(header.companyName || 'Company').replace(/\s+/g, '_')}_${header.period}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * 9. Export Comprehensive Entrywise Bank Statement Analysis to Excel (.xlsx)
 */
export function exportBankStatementAnalysisToExcel(
  bankTransactions: BankTransaction[],
  header: CompanyExportHeader,
  options?: {
    bankName?: string;
    accountNumber?: string;
    filterCategory?: string;
    searchTerm?: string;
  }
) {
  const wb = XLSX.utils.book_new();

  // Calculate high-level metrics
  const totalEntries = bankTransactions.length;
  const totalWithdrawals = bankTransactions.reduce((sum, t) => sum + (t.withdrawal || 0), 0);
  const totalDeposits = bankTransactions.reduce((sum, t) => sum + (t.deposit || 0), 0);
  const netCashFlow = totalDeposits - totalWithdrawals;

  // Sort chronologically if possible
  const sortedTxns = [...bankTransactions].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const firstTxn = sortedTxns[0];
  const lastTxn = sortedTxns[sortedTxns.length - 1];

  const openingBalance = firstTxn ? (firstTxn.balance - (firstTxn.deposit || 0) + (firstTxn.withdrawal || 0)) : 0;
  const closingBalance = lastTxn ? lastTxn.balance : 0;

  // -------------------------------------------------------------
  // Sheet 1: Entrywise Bank Analysis (Primary Full Transaction Journal)
  // -------------------------------------------------------------
  const entryRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED / NOT SPECIFIED'}`],
    [`ENTRYWISE BANK STATEMENT ANALYSIS & STATUTORY CASH JOURNAL`],
    [`Period: ${header.period} | Bank: ${options?.bankName || 'Commercial Bank Account'} | A/c No: ${options?.accountNumber || 'Primary Operational'}`],
    [`Generated On: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    ['EXECUTIVE CASH SUMMARY MEMORANDUM', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['Total Transactions', totalEntries, 'Total Deposits (Cr)', fmt(totalDeposits), 'Total Withdrawals (Dr)', fmt(totalWithdrawals), 'Net Cash Movement', fmt(netCashFlow), 'Opening Bal', fmt(openingBalance), 'Closing Bal', fmt(closingBalance), ''],
    [],
    [
      'SR NO.',
      'TXN DATE',
      'REF / CHQ / UTR NO.',
      'NARRATION / PARTICULARS',
      'COUNTERPARTY / BENEFICIARY',
      'ACCOUNTING CATEGORY',
      'VOUCHER TYPE',
      'WITHDRAWAL (DR) (INR)',
      'DEPOSIT (CR) (INR)',
      'RUNNING BALANCE (INR)',
      'BAL TYPE',
      'STATUTORY & TAX CLASSIFICATION',
      'AUDIT / TAG STATUS'
    ],
    [
      '======',
      '==========',
      '====================',
      '====================================================',
      '================================',
      '========================',
      '==============',
      '=====================',
      '=====================',
      '=====================',
      '========',
      '====================================',
      '=================='
    ]
  ];

  sortedTxns.forEach((t, idx) => {
    // Determine voucher type
    let voucherType = 'BANK PAYMENT';
    if (t.deposit > 0) voucherType = 'BANK RECEIPT';
    if (t.category === 'GST_TAX_PAYMENT' || t.category === 'TDS_PAYMENT') voucherType = 'STATUTORY PAYMENT';
    if (t.category === 'DIRECTOR_DRAWINGS' || t.category === 'CAPITAL_INTRODUCED') voucherType = 'CAPITAL / CONTRA';

    // Derive tax classification note
    let taxNote = 'Operating Business Entry';
    if (t.category === 'CUSTOMER_RECEIPT') taxNote = 'GST Outward Sales Collection (B2B/B2C)';
    else if (t.category === 'VENDOR_PAYMENT') taxNote = 'GST Inward ITC Vendor Settlement';
    else if (t.category === 'GST_TAX_PAYMENT') taxNote = 'Statutory GST PMT-06 / GSTR-3B Tax Challan';
    else if (t.category === 'TDS_PAYMENT') taxNote = 'Direct Tax Challan ITNS-281 (TDS Deductions)';
    else if (t.category === 'SALARY_EXPENSE') taxNote = 'Payroll & Staff Remuneration (Sec 192)';
    else if (t.category === 'RENT_EXPENSE') taxNote = 'Office Premises Rent (Sec 194-I TDS)';
    else if (t.category === 'BANK_CHARGES') taxNote = 'Bank Service Charges & GST on Bank Fee';
    else if (t.category === 'UTILITY_EXPENSE') taxNote = 'Electricity, Telecom & Power Dues';
    else if (t.category === 'DIRECTOR_DRAWINGS') taxNote = 'Proprietor Drawings / Partner Capital';

    const balType = t.balance >= 0 ? 'Cr' : 'Dr';

    entryRows.push([
      idx + 1,
      t.date,
      t.referenceNo || '—',
      t.narration,
      t.partyName || '—',
      t.category.replace(/_/g, ' '),
      voucherType,
      fmt(t.withdrawal),
      fmt(t.deposit),
      fmt(t.balance),
      balType,
      taxNote,
      t.isAutoTagged ? 'AI Auto-Tagged' : 'Manual Entry'
    ]);
  });

  // Summary Row
  entryRows.push([]);
  entryRows.push([
    '',
    'TOTALS',
    '',
    `Total of ${totalEntries} Bank Entries`,
    '',
    '',
    '',
    fmt(totalWithdrawals),
    fmt(totalDeposits),
    fmt(closingBalance),
    'Closing Bal',
    '',
    ''
  ]);

  const entryWs = XLSX.utils.aoa_to_sheet(entryRows);
  entryWs['!cols'] = [
    { wch: 8 },  // Sr No
    { wch: 14 }, // Date
    { wch: 22 }, // Ref No
    { wch: 54 }, // Narration
    { wch: 32 }, // Counterparty
    { wch: 26 }, // Category
    { wch: 18 }, // Voucher Type
    { wch: 22 }, // Withdrawal
    { wch: 22 }, // Deposit
    { wch: 22 }, // Balance
    { wch: 10 }, // Bal Type
    { wch: 42 }, // Tax Note
    { wch: 18 }, // Tag Status
  ];
  XLSX.utils.book_append_sheet(wb, entryWs, 'Entrywise Bank Analysis');

  // -------------------------------------------------------------
  // Sheet 2: Category Breakdown & Cash Flow
  // -------------------------------------------------------------
  const categoryMap: Record<string, { count: number; dr: number; cr: number }> = {};
  bankTransactions.forEach((t) => {
    const cat = t.category || 'OTHER_EXPENSE';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { count: 0, dr: 0, cr: 0 };
    }
    categoryMap[cat].count += 1;
    categoryMap[cat].dr += t.withdrawal || 0;
    categoryMap[cat].cr += t.deposit || 0;
  });

  const catRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED'}`],
    [`BANK STATEMENT CATEGORY-WISE SUMMARY & CASH FLOW BREAKDOWN`],
    [`Period: ${header.period} | Generated: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    [
      'SR NO.',
      'LEDGER CATEGORY / HEAD',
      'TXN COUNT',
      'TOTAL WITHDRAWALS (DR) (INR)',
      'TOTAL DEPOSITS (CR) (INR)',
      'NET CASH MOVEMENT (INR)',
      '% OF TOTAL WITHDRAWALS',
      '% OF TOTAL DEPOSITS',
      'ACCOUNTING CLASSIFICATION'
    ],
    [
      '======',
      '==============================',
      '===========',
      '============================',
      '============================',
      '========================',
      '======================',
      '===================',
      '==========================='
    ]
  ];

  let catIdx = 1;
  Object.entries(categoryMap).forEach(([cat, stat]) => {
    const net = stat.cr - stat.dr;
    const pctDr = totalWithdrawals > 0 ? (stat.dr / totalWithdrawals) * 100 : 0;
    const pctCr = totalDeposits > 0 ? (stat.cr / totalDeposits) * 100 : 0;

    let classification = 'Indirect Operating Expense';
    if (cat === 'CUSTOMER_RECEIPT') classification = 'Operating Revenue Inflow';
    else if (cat === 'VENDOR_PAYMENT') classification = 'Direct Cost / Supplier Settlement';
    else if (cat === 'GST_TAX_PAYMENT' || cat === 'TDS_PAYMENT') classification = 'Statutory Tax Outflow';
    else if (cat === 'DIRECTOR_DRAWINGS' || cat === 'CAPITAL_INTRODUCED') classification = 'Capital / Equity Movement';
    else if (cat === 'LOAN_TRANSACTION') classification = 'Financing Cash Flow';

    catRows.push([
      catIdx++,
      cat.replace(/_/g, ' '),
      stat.count,
      fmt(stat.dr),
      fmt(stat.cr),
      fmt(net),
      fmt(pctDr) + '%',
      fmt(pctCr) + '%',
      classification
    ]);
  });

  catRows.push([]);
  catRows.push([
    '',
    'TOTALS',
    totalEntries,
    fmt(totalWithdrawals),
    fmt(totalDeposits),
    fmt(netCashFlow),
    '100.00%',
    '100.00%',
    ''
  ]);

  const catWs = XLSX.utils.aoa_to_sheet(catRows);
  catWs['!cols'] = [
    { wch: 8 },  // Sr No
    { wch: 32 }, // Category
    { wch: 14 }, // Txn Count
    { wch: 28 }, // Total Dr
    { wch: 28 }, // Total Cr
    { wch: 26 }, // Net Flow
    { wch: 24 }, // % of Dr
    { wch: 20 }, // % of Cr
    { wch: 30 }, // Classification
  ];
  XLSX.utils.book_append_sheet(wb, catWs, 'Category Breakdown');

  // -------------------------------------------------------------
  // Sheet 3: Monthly Inflow-Outflow Statement
  // -------------------------------------------------------------
  const monthMap: Record<string, { count: number; dr: number; cr: number; lastBal: number }> = {};
  sortedTxns.forEach((t) => {
    const ym = (t.date && t.date.length >= 7) ? t.date.slice(0, 7) : 'Unknown';
    if (!monthMap[ym]) {
      monthMap[ym] = { count: 0, dr: 0, cr: 0, lastBal: t.balance };
    }
    monthMap[ym].count += 1;
    monthMap[ym].dr += t.withdrawal || 0;
    monthMap[ym].cr += t.deposit || 0;
    monthMap[ym].lastBal = t.balance;
  });

  const monthRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED'}`],
    [`MONTHLY CASH FLOW & INFLOW-OUTFLOW SUMMARY`],
    [`Period: ${header.period} | Generated: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    [
      'SR NO.',
      'CALENDAR MONTH',
      'TRANSACTIONS',
      'TOTAL DEPOSITS (INFLOWS) (INR)',
      'TOTAL WITHDRAWALS (OUTFLOWS) (INR)',
      'NET MONTHLY CASH FLOW (INR)',
      'MONTH-END CLOSING BALANCE (INR)'
    ],
    [
      '======',
      '=================',
      '============',
      '==============================',
      '==================================',
      '============================',
      '==============================='
    ]
  ];

  let mIdx = 1;
  Object.keys(monthMap).sort().forEach((ym) => {
    const stat = monthMap[ym];
    const net = stat.cr - stat.dr;
    monthRows.push([
      mIdx++,
      ym,
      stat.count,
      fmt(stat.cr),
      fmt(stat.dr),
      fmt(net),
      fmt(stat.lastBal)
    ]);
  });

  monthRows.push([]);
  monthRows.push([
    '',
    'ANNUAL TOTAL',
    totalEntries,
    fmt(totalDeposits),
    fmt(totalWithdrawals),
    fmt(netCashFlow),
    fmt(closingBalance)
  ]);

  const monthWs = XLSX.utils.aoa_to_sheet(monthRows);
  monthWs['!cols'] = [
    { wch: 8 },  // Sr No
    { wch: 18 }, // Month
    { wch: 14 }, // Txns
    { wch: 30 }, // Inflows
    { wch: 34 }, // Outflows
    { wch: 28 }, // Net
    { wch: 32 }, // Closing Bal
  ];
  XLSX.utils.book_append_sheet(wb, monthWs, 'Monthly Cash Flow');

  // -------------------------------------------------------------
  // Sheet 4: Counterparty Settlement Analysis
  // -------------------------------------------------------------
  const partyMap: Record<string, { count: number; dr: number; cr: number; category: string }> = {};
  bankTransactions.forEach((t) => {
    const p = t.partyName || 'Unspecified Counterparty';
    if (!partyMap[p]) {
      partyMap[p] = { count: 0, dr: 0, cr: 0, category: t.category };
    }
    partyMap[p].count += 1;
    partyMap[p].dr += t.withdrawal || 0;
    partyMap[p].cr += t.deposit || 0;
  });

  const partyRows: (string | number)[][] = [
    [header.companyName.toUpperCase()],
    [`GSTIN: ${header.companyGstin || 'UNREGISTERED'}`],
    [`MAJOR COUNTERPARTIES & BENEFICIARY SETTLEMENTS`],
    [`Period: ${header.period} | Generated: ${header.generatedDate || new Date().toLocaleString('en-IN')}`],
    [],
    [
      'SR NO.',
      'COUNTERPARTY / BENEFICIARY NAME',
      'PRIMARY CATEGORY',
      'TRANSACTIONS',
      'TOTAL PAYMENTS (DR) (INR)',
      'TOTAL RECEIPTS (CR) (INR)',
      'NET SETTLEMENT (INR)'
    ],
    [
      '======',
      '================================',
      '========================',
      '============',
      '==========================',
      '==========================',
      '====================='
    ]
  ];

  let pIdx = 1;
  // Sort parties by highest transaction volume (dr + cr)
  Object.entries(partyMap)
    .sort((a, b) => (b[1].dr + b[1].cr) - (a[1].dr + a[1].cr))
    .forEach(([party, stat]) => {
      const net = stat.cr - stat.dr;
      partyRows.push([
        pIdx++,
        party,
        stat.category.replace(/_/g, ' '),
        stat.count,
        fmt(stat.dr),
        fmt(stat.cr),
        fmt(net)
      ]);
    });

  const partyWs = XLSX.utils.aoa_to_sheet(partyRows);
  partyWs['!cols'] = [
    { wch: 8 },  // Sr No
    { wch: 36 }, // Party Name
    { wch: 26 }, // Category
    { wch: 14 }, // Txns
    { wch: 28 }, // Payments
    { wch: 28 }, // Receipts
    { wch: 24 }, // Net
  ];
  XLSX.utils.book_append_sheet(wb, partyWs, 'Major Counterparties');

  // Trigger File Download
  const fileName = `Bank_Statement_Entrywise_Analysis_${(header.companyName || 'Company').replace(/\s+/g, '_')}_${header.period}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
