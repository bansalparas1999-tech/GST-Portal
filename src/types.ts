export type DataSourceType = 'books' | 'gstr2b' | 'sales' | 'gstr1';

export type ReconMatchStatus =
  | 'EXACT_MATCH'
  | 'PARTIAL_MATCH'
  | 'FUZZY_MATCH'
  | 'FUZZY_GSTIN_MATCH'
  | 'VALUE_MISMATCH'
  | 'HEAD_MISMATCH'
  | 'SIGNIFICANT_DISCREPANCY'
  | 'MISSING_IN_2B'
  | 'MISSING_IN_BOOKS'
  | 'INELIGIBLE_ITC'
  | 'MANUAL_MATCH';

export type DiscrepancySeverity = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type DiscrepancyCategory =
  | 'MISSING_IN_2B'
  | 'MISSING_IN_BOOKS'
  | 'SIGNIFICANT_AMOUNT'
  | 'HEAD_POS_MISMATCH'
  | 'INVOICE_TYPO'
  | 'GSTIN_TYPO'
  | 'ROUNDING_DIFFERENCE'
  | 'DATE_WINDOW'
  | 'INELIGIBLE_17_5'
  | 'EXACT';

export type MatchingPresetType =
  | 'STRICT_STATUTORY'
  | 'BALANCED_CA'
  | 'LENIENT_ROUNDING'
  | 'AGGRESSIVE_FUZZY'
  | 'CUSTOM';

export interface CustomMatchingRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  stage:
    | 'exact'
    | 'partial_amount'
    | 'fuzzy_invoice'
    | 'fuzzy_gstin'
    | 'pan_match'
    | 'date_window'
    | 'head_pos'
    | 'custom';
  conditions: {
    gstinMatch: 'exact' | 'fuzzy' | 'pan_only' | 'any';
    gstinFuzzyMaxDistance?: number; // 1 or 2 characters
    invoiceMatch: 'exact' | 'normalized' | 'fuzzy' | 'contains' | 'any';
    invoiceFuzzyMaxDistance?: number; // 1 - 4
    amountMatch: 'exact' | 'absolute_tolerance' | 'percentage_tolerance' | 'any';
    amountToleranceValue?: number; // e.g. ₹2.00, ₹10.00
    amountTolerancePercent?: number; // e.g. 0.5%, 1%
    taxToleranceValue?: number; // e.g. ₹1.50
    dateToleranceDays?: number; // e.g. 30 days
    allowHeadMismatch?: boolean; // IGST vs CGST+SGST cross-match
    ignoreLeadingZeros?: boolean;
    ignoreSpecialChars?: boolean;
    ignoreCase?: boolean;
    ignoreCommonPrefixes?: boolean; // strip INV-, BILL-, etc.
  };
  assignStatus: ReconMatchStatus;
  confidence: number; // 0 - 100%
  isBuiltIn?: boolean;
}

export interface InvoiceRecord {
  id: string;
  source: DataSourceType;
  gstin: string;
  vendorName: string;
  invoiceNumber: string;
  rawInvoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD or DD/MM/YYYY
  invoiceType?: string; // B2B, CDNR, DE, SEZWP, SEZWOP
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalTax: number;
  invoiceValue: number;
  placeOfSupply?: string;
  reverseCharge?: boolean;
  itcAvailable?: boolean;
  itcReason?: string; // e.g. "Rule 38", "Section 17(5)"
  financialYear?: string; // e.g. "FY 2024-25"
  taxPeriod?: string; // e.g. "10" (October) or "2024-10"
  pageNumber?: number | string;
  confidence?: number;
  isHandwritten?: boolean;
  formatType?: string; // e.g. "Handwritten Bill Book", "Computerized ERP", "Thermal POS Receipt", "Transport Bilty / LR", "Jobwork Challan"
  handwrittenFields?: string[]; // e.g. ["Invoice Number", "Taxable Value", "Date"]
  itemsSummary?: string;
  // GST Compliance & Multi-GSTIN Verification
  billToGstin?: string; // Buyer / Recipient / Billed-To GSTIN on invoice (Customer GSTIN for purchases)
  billToName?: string; // Buyer / Recipient Billed-To Name
  vendorGstin?: string; // Seller / Vendor GSTIN on invoice (User GSTIN for sales)
  pan?: string; // 10-character PAN extracted or linked
  isGstInvoice?: boolean; // True if statutory GST Tax Invoice, false if non-GST / quotation / estimate
  gstComplianceStatus?: 'VALID_GST_INVOICE' | 'BILL_TO_MISMATCH' | 'NON_GST_DOCUMENT' | 'MISSING_BILL_TO';
  gstComplianceNote?: string;
  // HSN & GSTR-1 Specific Fields
  hsnCode?: string;
  gstRate?: number; // e.g. 18, 5, 12, 3, 0
  uqc?: string; // e.g. "PCS", "BOX", "NOS", "KGS"
  quantity?: number;
  ecommerceGstin?: string; // e-commerce operator GSTIN (e.g. Amazon '07AAICA3918J1CV')
  ecommerceType?: 'E' | 'OE'; // 'E' for through e-commerce operator, 'OE' for other
  notes?: string;
}

export interface HsnSummaryItem {
  id: string;
  num?: number;
  hsn_sc: string; // HSN / SAC code
  desc?: string; // Description
  uqc: string; // Unit quantity code (e.g. PCS, BOX, NOS, KGS)
  qty: number; // Total quantity
  rt: number; // Tax Rate (%) e.g. 18, 5, 12, 3
  totval: number; // Total invoice value
  txval: number; // Taxable value
  iamt: number; // Integrated Tax
  camt: number; // Central Tax
  samt: number; // State/UT Tax
  csamt: number; // Cess
}

export interface B2csSummaryItem {
  id: string;
  sply_ty: 'INTER' | 'INTRA';
  pos: string; // 2-digit code e.g. "09"
  posName: string; // e.g. "Uttar Pradesh"
  typ: 'OE' | 'E'; // Other than E-commerce or Through E-commerce
  etin?: string; // E-Commerce Operator GSTIN (mandatory if typ is 'E')
  rt: number; // Tax Rate (%) e.g. 18
  txval: number; // Taxable turnover
  iamt: number; // Integrated Tax
  camt: number; // Central Tax
  samt: number; // State / UT Tax
  csamt: number; // Cess
  totval?: number; // Total value (Taxable + Tax)
}

export type Gstr1FilingFrequency = 'MONTHLY' | 'QUARTERLY';

export interface Gstr1QuarterlyJsonPayload {
  gstin: string;
  fp: string; // e.g. "032026"
  version: 'GST3.1.6';
  hash: string;
  b2cs?: {
    sply_ty: 'INTER' | 'INTRA';
    rt: number;
    typ: string; // 'OE' | 'E'
    pos: string; // 2-digit code e.g. "35", "07"
    txval: number;
    iamt?: number;
    camt?: number;
    samt?: number;
    csamt: number;
  }[];
  hsn?: {
    hsn_b2c: {
      num: number;
      hsn_sc: string;
      uqc: string;
      qty: number;
      rt: number;
      txval: number;
      iamt: number;
      samt: number;
      camt: number;
      csamt: number;
    }[];
  };
  supeco?: {
    clttx: {
      etin: string;
      suppval: number;
      igst: number;
      cgst: number;
      sgst: number;
      cess: number;
      flag: 'N';
    }[];
  };
  doc_issue?: {
    doc_det: {
      doc_num: number;
      doc_typ: string;
      docs: {
        num: number;
        from: string;
        to: string;
        totnum: number;
        cancel: number;
        net_issue: number;
      }[];
    }[];
  };
}

export interface Gstr1JsonPayload {
  gstin: string;
  fp: string; // MMYYYY e.g. "012025" or "102024" or "032026"
  version: string;
  hash: string;
  b2b?: {
    ctin: string;
    inv: {
      inum: string;
      idt: string; // DD-MM-YYYY
      val: number;
      pos: string;
      rchrg: 'Y' | 'N';
      inv_typ: 'R' | 'DE' | 'SEZWP' | 'SEZWOP';
      itms: {
        num: number;
        itm_det: {
          txval: number;
          rt: number;
          iamt?: number;
          camt?: number;
          samt?: number;
          csamt?: number;
        };
      }[];
    }[];
  }[];
  b2cs?: {
    sply_ty: 'INTER' | 'INTRA';
    pos: string;
    typ: 'OE' | 'E' | string;
    etin?: string;
    rt: number;
    txval: number;
    iamt?: number;
    camt?: number;
    samt?: number;
    csamt?: number;
  }[];
  doc_issue?: {
    doc_det: {
      doc_num: number;
      doc_typ: string;
      docs: {
        num: number;
        to?: string;
        from?: string;
        totnum: number;
        cancel: number;
        net_issue: number;
      }[];
    }[];
  };
  hsn?: {
    data?: {
      num: number;
      hsn_sc: string;
      desc?: string;
      uqc: string;
      qty: number;
      rt: number;
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    }[];
    hsn_b2c?: {
      num: number;
      hsn_sc: string;
      uqc: string;
      qty: number;
      rt: number;
      txval: number;
      iamt: number;
      samt: number;
      camt: number;
      csamt: number;
    }[];
  };
  supeco?: {
    clttx: {
      etin: string;
      suppval: number;
      igst: number;
      cgst: number;
      sgst: number;
      cess: number;
      flag: 'N';
    }[];
  };
}

export interface PanGstinBranch {
  gstin: string;
  stateCode: string;
  stateName: string;
  tradeName?: string;
  legalName?: string;
  isPrincipal?: boolean;
  registrationType?: 'Regular' | 'SEZ Unit' | 'Composition' | 'ISD';
  status?: 'ACTIVE' | 'INACTIVE';
  // GST Portal Authentication & Vault
  portalUsername?: string; // GST Portal Login User ID
  portalPassword?: string; // GST Portal Login Password
  authorizedSignatory?: string;
  returnFilingFrequency?: 'MONTHLY' | 'QRMP_QUARTERLY';
  lastSyncedAt?: string;
  notes?: string;
}

export interface PanEntity {
  pan: string;
  legalName: string;
  tradeName?: string;
  constitution: string; // Company, Firm, Proprietorship, etc.
  branches: PanGstinBranch[];
  primaryGstin?: string;
  lastUsedAt?: string;
  defaultPortalUsername?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface DiscrepancyDetail {
  taxableDiff: number;
  taxDiff: number;
  totalDiff: number;
  igstDiff: number;
  cgstDiff: number;
  sgstDiff: number;
  percentageDiff?: number;
  mismatchedFields: string[];
  severity: DiscrepancySeverity;
  category: DiscrepancyCategory;
  suggestedAction: string;
  statutoryReference?: string;
}

export interface ManualMatchPair {
  bookId: string;
  gstr2bId: string;
  timestamp: string;
  notes?: string;
}

export interface ReconItem {
  id: string;
  gstin: string;
  vendorName: string;
  invoiceNumber: string;
  matchStatus: ReconMatchStatus;
  matchConfidence: number; // 0 - 100%
  matchedRuleId?: string;
  matchedRuleName?: string;
  booksRecord?: InvoiceRecord;
  gstr2bRecord?: InvoiceRecord;
  discrepancy?: DiscrepancyDetail;
  notes?: string;
  actionTaken?: 'notice_generated' | 'manually_matched' | 'marked_eligible' | 'marked_blocked' | 'accepted_rounding' | 'none';
  selected?: boolean;
}

export interface ReconSummary {
  totalBookRecords: number;
  totalGstr2bRecords: number;
  totalBookTaxable: number;
  totalGstr2bTaxable: number;
  totalBookTax: number;
  totalGstr2bTax: number;
  
  // Exact Matched
  matchedCount: number;
  matchedTaxable: number;
  matchedTax: number;

  // Partial / Rounding Matched
  partialMatchCount: number;
  partialMatchTaxable: number;
  partialMatchTax: number;
  partialMatchDiff: number;
  
  // Fuzzy matched (Invoice Number)
  fuzzyMatchedCount: number;
  fuzzyMatchedTax: number;

  // Fuzzy matched (GSTIN / PAN)
  fuzzyGstinCount: number;
  fuzzyGstinTax: number;

  // Significant Discrepancies
  significantDiscrepancyCount: number;
  significantDiscrepancyTaxDiff: number;

  // Value/Head Mismatch
  mismatchCount: number;
  mismatchTaxDiff: number;

  // Missing in GSTR-2B (Risk - In Books only)
  missingIn2bCount: number;
  missingIn2bTaxable: number;
  missingIn2bTax: number; // ITC at Risk

  // Missing in Books (Unclaimed - In 2B only)
  missingInBooksCount: number;
  missingInBooksTaxable: number;
  missingInBooksTax: number; // Potential Unclaimed ITC

  // Ineligible ITC (Sec 17(5))
  ineligibleCount: number;
  ineligibleTax: number;

  // High Risk Count
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
}

export interface ToleranceConfig {
  preset: MatchingPresetType;
  valueTolerance: number; // e.g. 2.00
  taxTolerance: number; // e.g. 1.00
  percentageTolerance: number; // e.g. 1.0 (%)
  dateToleranceDays: number; // e.g. 30
  significantDiscrepancyThreshold: number; // e.g. 1000.00 or tax diff > 500
  ignoreLeadingZeros: boolean;
  ignoreSpecialChars: boolean;
  ignoreCase: boolean;
  ignoreCommonPrefixes: boolean;
  autoFuzzyMatch: boolean;
  allowGstinFuzzy: boolean;
  gstinFuzzyMaxDistance: number;
  allowPanMatching: boolean;
  allowTaxHeadCrossMatch: boolean;
  rules: CustomMatchingRule[];
  manualPairs: ManualMatchPair[];
}

export interface ColumnMapping {
  gstin: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  taxableValue: string;
  igst: string;
  cgst: string;
  sgst: string;
  cess?: string;
  totalTax?: string;
  invoiceValue?: string;
  placeOfSupply?: string;
}

export type Language = 'en' | 'hi';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'suspended';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  companyName: string;
  companyGstin: string;
  state?: string;
  phone?: string;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string;
  totalInvoicesProcessed?: number;
  totalTaxProcessed?: number;
  customPreferences?: {
    defaultPreset?: MatchingPresetType;
    autoSendEmail?: boolean;
    noticeFooter?: string;
  };
}

export type TemplateCategory =
  | 'STATUTORY_DEMAND'
  | 'RULE_37A_WARNING'
  | 'FRIENDLY_REMINDER'
  | 'VALUE_DISCREPANCY'
  | 'HEAD_MISMATCH'
  | 'YEAR_END_CLOSURE';

export interface GlobalNoticeTemplate {
  id: string;
  title: string;
  category: TemplateCategory;
  description: string;
  subject: string;
  body: string;
  isDefault?: boolean;
  createdBy: string;
  createdByEmail?: string;
  createdAt: string;
  updatedAt: string;
  applicableStatus?: ReconMatchStatus[];
  tags?: string[];
}

export interface NoticeDispatchLog {
  id: string;
  userId: string;
  vendorGstin: string;
  vendorName: string;
  invoiceNumber: string;
  templateId?: string;
  templateTitle?: string;
  recipientEmail: string;
  subject: string;
  sentAt: string;
  taxVariance: number;
  status: 'SENT' | 'DRAFT' | 'ACKNOWLEDGED';
}

export type NavigationTab =
  | 'dashboard'
  | 'recon_table'
  | 'discrepancy_report'
  | 'vendor_notices'
  | 'accounting'
  | 'admin_dashboard'
  | 'settings';

export type BankTransactionCategory =
  | 'CUSTOMER_RECEIPT'
  | 'VENDOR_PAYMENT'
  | 'SALARY_EXPENSE'
  | 'RENT_EXPENSE'
  | 'UTILITY_EXPENSE'
  | 'GST_TAX_PAYMENT'
  | 'TDS_PAYMENT'
  | 'BANK_CHARGES'
  | 'DIRECTOR_DRAWINGS'
  | 'CAPITAL_INTRODUCED'
  | 'LOAN_TRANSACTION'
  | 'OFFICE_EXPENSE'
  | 'OTHER_EXPENSE'
  | 'OTHER_INCOME';

export interface BankTransaction {
  id: string;
  date: string;
  narration: string;
  referenceNo?: string;
  withdrawal: number; // Debit (Money Out)
  deposit: number; // Credit (Money In)
  balance: number;
  category: BankTransactionCategory;
  partyName?: string;
  partyGstin?: string;
  matchedInvoiceNumber?: string;
  matchedInvoiceId?: string;
  confidence?: number;
  isAutoTagged?: boolean;
  notes?: string;
}

export interface SalesInvoiceRecord {
  id: string;
  gstin: string; // Customer GSTIN (or "URP" for unregistered)
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalTax: number;
  invoiceValue: number;
  placeOfSupply?: string;
  financialYear: string;
  taxPeriod: string;
  paymentStatus?: 'PAID' | 'PARTIALLY_PAID' | 'UNPAID';
  receivedAmount?: number;
  outstandingAmount?: number;
  notes?: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  voucherType: 'SALES' | 'PURCHASE' | 'BANK_PAYMENT' | 'BANK_RECEIPT' | 'JOURNAL' | 'CONTRA';
  voucherNo: string;
  particulars: string;
  debit: number;
  credit: number;
  runningBalance: number;
  balanceType: 'Dr' | 'Cr';
  referenceDoc?: string;
}

export interface PartyLedgerAccount {
  id: string;
  partyName: string;
  partyGstin?: string;
  partyType: 'VENDOR' | 'CUSTOMER';
  state?: string;
  pan?: string;
  openingBalance: number;
  openingType: 'Dr' | 'Cr';
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  closingType: 'Dr' | 'Cr';
  invoicesCount: number;
  paymentsCount: number;
  entries: LedgerEntry[];
  ageingDays?: number;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountGroup:
    | 'Sales Accounts'
    | 'Purchase Accounts'
    | 'Direct Expenses'
    | 'Indirect Expenses'
    | 'Indirect Incomes'
    | 'Duties & Taxes'
    | 'Sundry Debtors'
    | 'Sundry Creditors'
    | 'Bank Accounts'
    | 'Cash-in-Hand'
    | 'Fixed Assets'
    | 'Current Assets'
    | 'Current Liabilities'
    | 'Capital & Reserves'
    | 'Loans & Borrowings';
  debit: number;
  credit: number;
}

export interface ProfitAndLossReport {
  period: string;
  // Trading Account (Direct)
  salesRevenue: number;
  otherOperatingIncome: number;
  closingStock: number;
  totalTradingRevenue: number;

  openingStock: number;
  grossPurchases: number;
  directExpenses: number;
  totalCostOfGoodsSold: number;
  grossProfit: number;
  grossProfitMarginPercent: number;

  // Profit & Loss Account (Indirect)
  indirectIncomes: {
    interestIncome: number;
    discountReceived: number;
    otherIncome: number;
    total: number;
  };
  indirectExpenses: {
    salariesAndWages: number;
    rentAndOffice: number;
    utilitiesAndPower: number;
    bankAndFinanceCharges: number;
    professionalAndLegal: number;
    softwareAndTech: number;
    depreciation: number;
    generalAdministrative: number;
    total: number;
  };

  operatingProfitEbitda: number;
  netProfitBeforeTax: number;
  taxProvisionEstimated: number;
  netProfitAfterTax: number;
  netProfitMarginPercent: number;
}

export interface BalanceSheetReport {
  asOnDate: string;
  period: string;

  // Liabilities & Equity
  equityAndLiabilities: {
    shareholdersFunds: {
      proprietorCapital: number;
      retainedEarningsAndReserves: number;
      currentPeriodProfit: number;
      lessDrawings: number;
      totalCapital: number;
    };
    nonCurrentLiabilities: {
      securedBankLoans: number;
      unsecuredLoans: number;
      totalNonCurrentLiabilities: number;
    };
    currentLiabilities: {
      sundryCreditorsTradePayables: number;
      netGstOutputPayable: number;
      tdsAndStatutoryDues: number;
      otherCurrentLiabilities: number;
      totalCurrentLiabilities: number;
    };
    totalLiabilities: number;
  };

  // Assets
  assets: {
    nonCurrentAssets: {
      tangibleFixedAssets: number;
      lessDepreciation: number;
      netFixedAssets: number;
    };
    currentAssets: {
      closingInventories: number;
      sundryDebtorsTradeReceivables: number;
      cashAndBankBalances: number;
      netGstItcReceivable: number;
      prepaidAndAdvances: number;
      totalCurrentAssets: number;
    };
    totalAssets: number;
  };

  isBalanced: boolean;
  varianceDifference: number;
  workingCapital: number;
  currentRatio: number;
  debtEquityRatio: number;
}

export type ImportTabType =
  | 'pdf'
  | 'files'
  | 'sales_import'
  | 'hsn_import'
  | 'bank'
  | 'paste'
  | 'sales_sync'
  | 'sample';

// ==========================================
// GSTIN STATUS & PAN-TO-GSTIN VERIFICATION TYPES (SCHEMAS)
// ==========================================

/**
 * Schema 1: GSTIN Status Verification
 */
export interface GstinStatusVerification {
  gstin: string;
  stateCode?: string;
  stateName?: string;
  status?: string; // 'Active' | 'Cancelled' | 'Suspended' | 'Inactive' | 'Invalid Structure'
  validGstin: boolean;
  // Extended helper fields for business reports and display
  pan?: string;
  legalName?: string;
  tradeName?: string;
  taxpayerType?: string;
  constitution?: string;
  registrationDate?: string;
  address?: string;
  errorMessage?: string;
  verifiedAt?: string;
}

/**
 * Schema 2: PAN to GSTINs Result Item
 */
export interface PanGstinResItem {
  gstin: string;
  authStatus: string; // e.g. "Active", "Cancelled", "Suspended"
  stateCd: string; // 2-digit code e.g. "27"
  // Extended fields for rich Excel exports and UI display
  stateName?: string;
  tradeName?: string;
  legalName?: string;
  isPrincipal?: boolean;
  registrationDate?: string;
  taxpayerType?: string;
}

/**
 * Schema 2: Root PAN to GSTINs Payload
 */
export interface PanToGstinsResult {
  panNum: string;
  gstinResList: PanGstinResItem[];
  // Extended metadata
  legalName?: string;
  tradeName?: string;
  constitution?: string;
  totalGstins?: number;
  activeGstins?: number;
  cancelledGstins?: number;
  verifiedAt?: string;
}

export type GstVerificationSubTab =
  | 'gst_single'
  | 'gst_bulk'
  | 'pan_single'
  | 'pan_bulk';

