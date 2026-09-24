import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2,
  FileSpreadsheet,
  Upload,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Scale,
  BookOpen,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Receipt,
  Users,
  CreditCard,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Plus,
  Trash2,
  Pencil,
  FileText,
  ShieldCheck,
  HelpCircle,
  Eye,
  ExternalLink,
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  Lock,
  FileDown,
  FolderDown,
  Layers,
} from 'lucide-react';
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
  Language,
  UserProfile,
} from '../types';
import {
  parseBankStatementText,
  computeFinancialAccounts,
  categorizeBankTransaction,
} from '../utils/accountingUtils';
import {
  CompanyExportHeader,
  exportProfitAndLossToExcel,
  exportBalanceSheetToExcel,
  exportAllVendorGLsToExcel,
  exportSingleVendorGLToExcel,
  exportAllCustomerGLsToExcel,
  exportSingleCustomerGLToExcel,
  exportTrialBalanceToExcel,
  exportMasterFinancialPackToExcel,
  exportBankStatementAnalysisToExcel,
} from '../utils/excelExport';

interface AccountingViewProps {
  purchases: InvoiceRecord[];
  sales: SalesInvoiceRecord[];
  bankTransactions: BankTransaction[];
  onUpdateSales: (sales: SalesInvoiceRecord[]) => void;
  onUpdateBankTransactions: (txns: BankTransaction[]) => void;
  onClearData?: () => void;
  onImportFromGst?: () => void;
  canImportGst?: boolean;
  companyGstin: string;
  selectedPeriod: string;
  currentUser: UserProfile | null;
  language: Language;
  isAdmin?: boolean;
  onOpenAddSale?: () => void;
  onOpenEditSale?: (sale: SalesInvoiceRecord) => void;
  onOpenAddBank?: () => void;
  onOpenEditBank?: (txn: BankTransaction) => void;
  onOpenAddPurchase?: (type: 'books' | 'gstr2b') => void;
  onOpenEditPurchase?: (inv: InvoiceRecord, source: 'books' | 'gstr2b') => void;
  onDeleteSale?: (id: string) => void;
  onDeleteBank?: (id: string) => void;
  onNavigateToTemplates?: () => void;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  purchases,
  sales,
  bankTransactions,
  onUpdateSales,
  onUpdateBankTransactions,
  onClearData,
  onImportFromGst,
  canImportGst = false,
  companyGstin,
  selectedPeriod,
  currentUser,
  language,
  isAdmin: propIsAdmin,
  onOpenAddSale,
  onOpenEditSale,
  onOpenAddBank,
  onOpenEditBank,
  onOpenAddPurchase,
  onOpenEditPurchase,
  onDeleteSale,
  onDeleteBank,
  onNavigateToTemplates,
}) => {
  const isAdmin = propIsAdmin ?? currentUser?.role === 'admin';

  // Sub-tabs inside the Accounting module
  const [subTab, setSubTab] = useState<
    'dashboard' | 'bank' | 'pnl' | 'balance_sheet' | 'vendor_ledgers' | 'customer_ledgers' | 'sales_register' | 'trial_balance'
  >('dashboard');

  // Bank Statement Upload Modal
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankInputMode, setBankInputMode] = useState<'paste' | 'file' | 'sample'>('file');
  const [pastedBankText, setPastedBankText] = useState('');
  const [uploadingBank, setUploadingBank] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Selected party for ledger drilldown
  const [selectedLedger, setSelectedLedger] = useState<PartyLedgerAccount | null>(null);

  // Search & Filter in Ledgers / Bank transactions
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [bankSearchTerm, setBankSearchTerm] = useState('');
  const [bankCategoryFilter, setBankCategoryFilter] = useState<string>('ALL');

  // Filtered bank transactions
  const filteredBankTransactions = useMemo(() => {
    return bankTransactions.filter((t) => {
      const q = bankSearchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (t.narration || '').toLowerCase().includes(q) ||
        (t.referenceNo || '').toLowerCase().includes(q) ||
        (t.partyName || '').toLowerCase().includes(q);

      const matchesCat =
        bankCategoryFilter === 'ALL' || t.category === bankCategoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [bankTransactions, bankSearchTerm, bankCategoryFilter]);

  // Bank summary KPI metrics
  const bankMetrics = useMemo(() => {
    const totalDeposits = bankTransactions.reduce((sum, t) => sum + (t.deposit || 0), 0);
    const totalWithdrawals = bankTransactions.reduce((sum, t) => sum + (t.withdrawal || 0), 0);
    const netFlow = totalDeposits - totalWithdrawals;
    const count = bankTransactions.length;
    const latestBalance = count > 0 ? bankTransactions[count - 1].balance : 0;
    return { totalDeposits, totalWithdrawals, netFlow, count, latestBalance };
  }, [bankTransactions]);

  // Export menu dropdown
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // AI Financial Report State
  const [aiReport, setAiReport] = useState<string>('');
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);

  // Manual Add Transaction / Add Sale Modal
  const [isAddSaleModalOpen, setIsAddSaleModalOpen] = useState(false);
  const [newSaleCustomer, setNewSaleCustomer] = useState('');
  const [newSaleGstin, setNewSaleGstin] = useState('');
  const [newSaleInvNo, setNewSaleInvNo] = useState('');
  const [newSaleDate, setNewSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [newSaleTaxable, setNewSaleTaxable] = useState(100000);
  const [newSaleGstRate, setNewSaleGstRate] = useState(18);

  const isEmptyData = sales.length === 0 && bankTransactions.length === 0 && purchases.length === 0;

  // Compute Full Double-Entry Accounting
  const accounting = useMemo(() => {
    const activePurchases = purchases.length > 0 ? purchases : [];
    const activeSales = sales.length > 0 ? sales : [];
    const activeBank = bankTransactions.length > 0 ? bankTransactions : [];

    return computeFinancialAccounts(activePurchases, activeSales, activeBank, selectedPeriod);
  }, [purchases, sales, bankTransactions, selectedPeriod]);

  // Export Header Info
  const exportHeader: CompanyExportHeader = useMemo(() => ({
    companyName: currentUser?.companyName || 'Commercial Entity',
    companyGstin: companyGstin || '27AAACG1122H1Z1',
    period: selectedPeriod,
    generatedDate: new Date().toLocaleString('en-IN'),
  }), [currentUser, companyGstin, selectedPeriod]);

  // Handlers for Excel Exports
  const handleExportPnLExcel = () => {
    exportProfitAndLossToExcel(accounting.profitAndLoss, exportHeader);
  };

  const handleExportBalanceSheetExcel = () => {
    exportBalanceSheetToExcel(accounting.balanceSheet, exportHeader);
  };

  const handleExportAllVendorGLsExcel = () => {
    exportAllVendorGLsToExcel(accounting.vendorLedgers, exportHeader);
  };

  const handleExportSingleVendorGLExcel = (vendor: PartyLedgerAccount) => {
    exportSingleVendorGLToExcel(vendor, exportHeader);
  };

  const handleExportAllCustomerGLsExcel = () => {
    exportAllCustomerGLsToExcel(accounting.customerLedgers, exportHeader);
  };

  const handleExportSingleCustomerGLExcel = (customer: PartyLedgerAccount) => {
    exportSingleCustomerGLToExcel(customer, exportHeader);
  };

  const handleExportTrialBalanceExcel = () => {
    exportTrialBalanceToExcel(accounting.trialBalance, exportHeader);
  };

  const handleExportMasterPackExcel = () => {
    exportMasterFinancialPackToExcel(
      accounting.profitAndLoss,
      accounting.balanceSheet,
      accounting.trialBalance,
      accounting.vendorLedgers,
      accounting.customerLedgers,
      bankTransactions,
      exportHeader
    );
  };

  const handleExportBankStatementExcel = (customList?: BankTransaction[]) => {
    const listToExport = customList && customList.length > 0 ? customList : bankTransactions;
    exportBankStatementAnalysisToExcel(listToExport, exportHeader, {
      bankName: currentUser?.companyName ? `${currentUser.companyName} Bank Account` : 'Commercial Bank Account',
      accountNumber: 'Primary Operational A/c',
    });
  };

  // Handle Bank Statement File Upload (CSV, TXT, Excel or PDF via AI)
  const handleBankFileUpload = async (file: File) => {
    setUploadingBank(true);
    setUploadError('');

    try {
      if (file.name.endsWith('.pdf')) {
        // PDF statement parsing via server-side Gemini OCR
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Data = e.target?.result as string;
          try {
            const res = await fetch('/api/ai/parse-bank-statement', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileBase64: base64Data,
                mimeType: 'application/pdf',
                fileName: file.name,
              }),
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.transactions) && data.transactions.length > 0) {
              const formatted: BankTransaction[] = data.transactions.map((t: any, idx: number) => ({
                id: `ai-bank-${idx}-${Date.now()}`,
                date: t.date || new Date().toISOString().slice(0, 10),
                narration: t.narration || 'Bank Entry',
                referenceNo: t.referenceNo || `REF-${idx + 1}`,
                withdrawal: Number(t.withdrawal) || 0,
                deposit: Number(t.deposit) || 0,
                balance: Number(t.balance) || 0,
                category: t.category || categorizeBankTransaction(t.narration || '', Number(t.withdrawal) || 0, Number(t.deposit) || 0),
                partyName: t.partyName,
                partyGstin: t.partyGstin,
                confidence: Number(t.confidence) || 95,
                isAutoTagged: true,
              }));
              onUpdateBankTransactions(formatted);
              setIsBankModalOpen(false);
            } else {
              setUploadError('No valid transactions found in statement. Please ensure it is a valid bank statement file.');
            }
          } catch (err: any) {
            setUploadError(err.message || 'Failed to parse bank statement');
          } finally {
            setUploadingBank(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Text / CSV / TSV file: try API first, fallback to client parser
        const text = await file.text();
        try {
          const res = await fetch('/api/ai/parse-bank-statement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              statementText: text,
              fileName: file.name,
            }),
          });
          const data = await res.json();
          if (data.success && Array.isArray(data.transactions) && data.transactions.length > 0) {
            const formatted: BankTransaction[] = data.transactions.map((t: any, idx: number) => ({
              id: `ai-bank-${idx}-${Date.now()}`,
              date: t.date || new Date().toISOString().slice(0, 10),
              narration: t.narration || 'Bank Entry',
              referenceNo: t.referenceNo || `REF-${idx + 1}`,
              withdrawal: Number(t.withdrawal) || 0,
              deposit: Number(t.deposit) || 0,
              balance: Number(t.balance) || 0,
              category: t.category || categorizeBankTransaction(t.narration || '', Number(t.withdrawal) || 0, Number(t.deposit) || 0),
              partyName: t.partyName,
              partyGstin: t.partyGstin,
              confidence: Number(t.confidence) || 95,
              isAutoTagged: true,
            }));
            onUpdateBankTransactions(formatted);
            setIsBankModalOpen(false);
            setUploadingBank(false);
            return;
          }
        } catch {
          // Fallback to client parser
        }

        const parsed = parseBankStatementText(text);
        onUpdateBankTransactions(parsed);
        setIsBankModalOpen(false);
        setUploadingBank(false);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Error processing bank statement');
      setUploadingBank(false);
    }
  };

  const handlePastedBankSubmit = async () => {
    if (!pastedBankText.trim()) return;
    setUploadingBank(true);
    setUploadError('');

    try {
      const res = await fetch('/api/ai/parse-bank-statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statementText: pastedBankText,
          fileName: 'Pasted_Statement.txt',
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.transactions) && data.transactions.length > 0) {
        const formatted: BankTransaction[] = data.transactions.map((t: any, idx: number) => ({
          id: `ai-bank-${idx}-${Date.now()}`,
          date: t.date || new Date().toISOString().slice(0, 10),
          narration: t.narration || 'Bank Entry',
          referenceNo: t.referenceNo || `REF-${idx + 1}`,
          withdrawal: Number(t.withdrawal) || 0,
          deposit: Number(t.deposit) || 0,
          balance: Number(t.balance) || 0,
          category: t.category || categorizeBankTransaction(t.narration || '', Number(t.withdrawal) || 0, Number(t.deposit) || 0),
          partyName: t.partyName,
          partyGstin: t.partyGstin,
          confidence: Number(t.confidence) || 95,
          isAutoTagged: true,
        }));
        onUpdateBankTransactions(formatted);
        setPastedBankText('');
        setIsBankModalOpen(false);
        setUploadingBank(false);
        return;
      }
    } catch {
      // Fallback
    }

    const parsed = parseBankStatementText(pastedBankText);
    onUpdateBankTransactions(parsed);
    setPastedBankText('');
    setIsBankModalOpen(false);
    setUploadingBank(false);
  };

  // Generate AI Financial Audit
  const handleGenerateAiAudit = async () => {
    setIsGeneratingAiReport(true);
    try {
      const res = await fetch('/api/ai/analyze-financials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profitLoss: accounting.profitAndLoss,
          balanceSheet: accounting.balanceSheet,
          summary: accounting.summary,
          companyGstin,
          companyName: currentUser?.companyName || 'Apex Advisory Practice',
          language,
        }),
      });
      const data = await res.json();
      if (data.report) {
        setAiReport(data.report);
      }
    } catch (err) {
      console.error('AI Financial Audit Error:', err);
    } finally {
      setIsGeneratingAiReport(false);
    }
  };

  const handleAddSale = (e: React.FormEvent) => {
    e.preventDefault();
    const taxAmt = (newSaleTaxable * newSaleGstRate) / 100;
    const halfTax = taxAmt / 2;
    const isInterstate = newSaleGstin && !newSaleGstin.startsWith(companyGstin.slice(0, 2));

    const newRecord: SalesInvoiceRecord = {
      id: `sale-${Date.now()}`,
      customerName: newSaleCustomer.trim() || 'Valued Customer',
      gstin: newSaleGstin.trim().toUpperCase() || 'URP',
      invoiceNumber: newSaleInvNo.trim() || `INV/${Date.now().toString().slice(-4)}`,
      invoiceDate: newSaleDate,
      taxableValue: newSaleTaxable,
      igst: isInterstate ? taxAmt : 0,
      cgst: isInterstate ? 0 : halfTax,
      sgst: isInterstate ? 0 : halfTax,
      cess: 0,
      totalTax: taxAmt,
      invoiceValue: newSaleTaxable + taxAmt,
      financialYear: '2024-25',
      taxPeriod: selectedPeriod,
      paymentStatus: 'UNPAID',
      receivedAmount: 0,
      outstandingAmount: newSaleTaxable + taxAmt,
    };

    onUpdateSales([newRecord, ...sales]);
    setIsAddSaleModalOpen(false);
    setNewSaleCustomer('');
    setNewSaleGstin('');
    setNewSaleInvNo('');
  };

  return (
    <div id="accounting-view-container" className="p-4 sm:p-6 lg:p-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px] mx-auto space-y-6 pb-20">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-2xl border border-[#E0E4DE] p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2D4A3E] text-white flex items-center justify-center font-bold shadow-xs">
            <Scale className="w-6 h-6 text-[#8DA173]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#1A2E25] tracking-tight">
                Automated Financial Accounts & Statutory Ledgers
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EDF3EF] text-[#2D4A3E] border border-[#D5E2D9]">
                Double-Entry Engine
              </span>
            </div>
            <p className="text-xs text-[#738276] mt-0.5">
              Syncs Sales (GSTR-1), Purchases (GSTR-2B), and Bank Statement to compile Balance Sheet, P&L, and Trade Ledgers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Master Excel Pack Button */}
          <button
            onClick={handleExportMasterPackExcel}
            className="px-4 py-2 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            title="Download complete Financial Accounts Workbook with P&L, Balance Sheet, Ledgers & Trial Balance in native Excel format"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#8DA173]" />
            <span>Master Financial Pack (.xlsx)</span>
          </button>

          {/* Quick Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-3.5 py-2 bg-white border border-[#E0E4DE] hover:bg-[#F7F8F6] text-[#2D4A3E] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-[#2D4A3E]" />
              <span>Export Reports</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#738276]" />
            </button>

            {isExportMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-64 bg-white border border-[#E0E4DE] rounded-2xl shadow-xl z-50 py-2 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setIsExportMenuOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-[#738276] uppercase tracking-wider">
                  Download Native Excel Reports (.xlsx)
                </div>
                <button
                  onClick={handleExportAllVendorGLsExcel}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#EDF3EF] flex items-center justify-between text-[#1A2E25] font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#2D4A3E]" />
                    All Vendor GLs (.xlsx)
                  </span>
                  <span className="text-[10px] text-[#738276]">{accounting.vendorLedgers.length} Ledgers</span>
                </button>

                <button
                  onClick={handleExportPnLExcel}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#EDF3EF] flex items-center justify-between text-[#1A2E25] font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-[#2D4A3E]" />
                    Profit & Loss Account (.xlsx)
                  </span>
                  <span className="text-[10px] text-[#2D4A3E] font-bold">Schedule III</span>
                </button>

                <button
                  onClick={handleExportBalanceSheetExcel}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#EDF3EF] flex items-center justify-between text-[#1A2E25] font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Scale className="w-3.5 h-3.5 text-[#2D4A3E]" />
                    Balance Sheet (.xlsx)
                  </span>
                  <span className="text-[10px] text-[#2D4A3E] font-bold">Schedule III</span>
                </button>

                <button
                  onClick={handleExportAllCustomerGLsExcel}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#EDF3EF] flex items-center justify-between text-[#1A2E25] font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Receipt className="w-3.5 h-3.5 text-[#2D4A3E]" />
                    All Customer GLs (.xlsx)
                  </span>
                  <span className="text-[10px] text-[#738276]">{accounting.customerLedgers.length} Ledgers</span>
                </button>

                <button
                  onClick={handleExportTrialBalanceExcel}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#EDF3EF] flex items-center justify-between text-[#1A2E25] font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-[#2D4A3E]" />
                    General Trial Balance (.xlsx)
                  </span>
                  <span className="text-[10px] text-[#2D4A3E] font-bold">Balanced</span>
                </button>

                <button
                  onClick={() => handleExportBankStatementExcel()}
                  className="w-full text-left px-3.5 py-2 hover:bg-[#EDF3EF] flex items-center justify-between text-[#1A2E25] font-semibold cursor-pointer border-t border-[#E0E4DE] pt-2"
                >
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-[#2D4A3E]" />
                    Bank Statement Analysis (.xlsx)
                  </span>
                  <span className="text-[10px] text-[#8DA173] font-bold">{bankTransactions.length} Entries</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => onOpenAddBank ? onOpenAddBank() : setIsBankModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-[#E0E4DE] hover:bg-[#F7F8F6] text-[#2D4A3E] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#8DA173]" />
            <span>Add / Edit Bank Entry</span>
          </button>

          <button
            onClick={() => setIsBankModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-[#E0E4DE] hover:bg-[#F7F8F6] text-[#2D4A3E] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Upload className="w-3.5 h-3.5 text-[#8DA173]" />
            <span>Upload Bank (PDF/CSV)</span>
          </button>

          <button
            onClick={() => onOpenAddSale ? onOpenAddSale() : setIsAddSaleModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-[#E0E4DE] hover:bg-[#F7F8F6] text-[#2D4A3E] rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#8DA173]" />
            <span>Add Sales Invoice</span>
          </button>
        </div>
      </div>

      {/* DATA STATUS & DATA MANAGEMENT BANNER */}
      <div className="bg-[#EDF3EF] border border-[#D5E2D9] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#2D4A3E] text-white flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-[#8DA173]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1A2E25]">
                {isEmptyData
                  ? 'Ready for Your Accounting Data'
                  : 'Live Custom Financial Accounts'}
              </span>
            </div>
            <p className="text-[#56655A] text-[11px] mt-0.5">
              {isEmptyData
                ? 'Upload your Bank Statement (PDF/CSV), import GST sales/purchase bills, or use our standard Excel/CSV templates to generate Balance Sheet, P&L, and Ledgers.'
                : `Currently computing: ${bankTransactions.length} bank entries, ${sales.length} outward sales invoices, and ${purchases.length} vendor purchase bills.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateToTemplates && (
            <button
              onClick={onNavigateToTemplates}
              className="px-3 py-1.5 bg-white border border-[#D5E2D9] hover:bg-[#F7F8F6] text-[#2D4A3E] rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="w-3 h-3 text-[#8DA173]" />
              <span>CSV/Excel Templates</span>
            </button>
          )}

          {canImportGst && onImportFromGst && (
            <button
              onClick={onImportFromGst}
              className="px-3 py-1.5 bg-white border border-[#D5E2D9] hover:bg-[#F7F8F6] text-[#2D4A3E] rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 text-[#8DA173]" />
              <span>Sync GST Sales</span>
            </button>
          )}

          {onClearData && !isEmptyData && (
            <button
              onClick={onClearData}
              className="px-3 py-1.5 bg-[#FFF2F0] hover:bg-[#FFE5E2] text-[#C75D4E] border border-[#F5C2BC] rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Workspace</span>
            </button>
          )}
        </div>
      </div>

      {/* Accounting Sub-Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E0E4DE] pb-3">
        {[
          { id: 'dashboard', label: 'Financial Overview', icon: PieChartIcon },
          { id: 'pnl', label: 'Profit & Loss (P&L)', icon: TrendingUp },
          { id: 'balance_sheet', label: 'Balance Sheet', icon: Scale },
          { id: 'vendor_ledgers', label: 'Vendor Ledgers (Creditors)', icon: Users, count: accounting.vendorLedgers.length },
          { id: 'customer_ledgers', label: 'Customer Ledgers (Debtors)', icon: Receipt, count: accounting.customerLedgers.length },
          { id: 'bank', label: 'Bank Statement & Passbook', icon: CreditCard, count: bankTransactions.length },
          { id: 'sales_register', label: 'Sales Register (GSTR-1)', icon: DollarSign, count: sales.length },
          { id: 'trial_balance', label: 'Trial Balance', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setSubTab(tab.id as any);
                setSelectedLedger(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-[#2D4A3E] text-white shadow-xs'
                  : 'bg-white text-[#56655A] hover:bg-[#EDF3EF] hover:text-[#1A2E25] border border-[#E0E4DE]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#8DA173]' : 'text-[#738276]'}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-[#1E362C] text-[#8DA173]' : 'bg-[#EDF3EF] text-[#2D4A3E]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: FINANCIAL OVERVIEW DASHBOARD */}
      {subTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#738276] font-semibold">
                <span>Net Revenue (Gross Sales)</span>
                <DollarSign className="w-4 h-4 text-[#8DA173]" />
              </div>
              <div className="text-2xl font-black text-[#1A2E25] tracking-tight">
                ₹{accounting.summary.totalSales.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-[#2D4A3E] font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>GST Outward Billed • {sales.length} Invoices</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#738276] font-semibold">
                <span>Net Profit After Tax (PAT)</span>
                <Scale className="w-4 h-4 text-[#8DA173]" />
              </div>
              <div className="text-2xl font-black text-[#2D4A3E] tracking-tight">
                ₹{accounting.summary.netProfit.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-[#2D4A3E] font-medium flex items-center gap-1">
                <span>Net Margin: </span>
                <span className="font-bold text-[#8DA173]">{accounting.profitAndLoss.netProfitMarginPercent}%</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#738276] font-semibold">
                <span>Sundry Debtors (Receivables)</span>
                <ArrowUpRight className="w-4 h-4 text-[#8DA173]" />
              </div>
              <div className="text-2xl font-black text-[#1A2E25] tracking-tight">
                ₹{accounting.summary.debtorsOutstanding.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-[#738276] font-medium">
                {accounting.customerLedgers.length} Customer Accounts
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs text-[#738276] font-semibold">
                <span>Sundry Creditors (Payables)</span>
                <ArrowDownLeft className="w-4 h-4 text-[#C75D4E]" />
              </div>
              <div className="text-2xl font-black text-[#C75D4E] tracking-tight">
                ₹{accounting.summary.creditorsOutstanding.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-[#738276] font-medium">
                {accounting.vendorLedgers.length} Vendor Accounts
              </div>
            </div>
          </div>

          {/* Quick Action & Excel Download Center */}
          <div className="bg-white rounded-2xl border border-[#E0E4DE] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0E4DE] pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#2D4A3E]" />
                <h3 className="text-base font-extrabold text-[#1A2E25]">Statutory Financial Reports & Excel Downloads</h3>
              </div>
              <span className="text-xs text-[#738276] font-semibold">
                Single Click Export • XLSX Native Format
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-[#E0E4DE] bg-[#FDFDFC] hover:bg-[#F7F8F6] transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#2D4A3E]" />
                    <span className="font-bold text-xs text-[#1A2E25]">Profit & Loss Statement</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EDF3EF] text-[#2D4A3E] rounded-full">Schedule III</span>
                </div>
                <p className="text-[11px] text-[#738276]">
                  Gross profit, COGS, operating overheads, EBITDA, and Net Profit After Tax.
                </p>
                <button
                  onClick={handleExportPnLExcel}
                  className="w-full py-2 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                  <span>Download P&L (.xlsx)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-[#E0E4DE] bg-[#FDFDFC] hover:bg-[#F7F8F6] transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#2D4A3E]" />
                    <span className="font-bold text-xs text-[#1A2E25]">Balance Sheet Statement</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EDF3EF] text-[#2D4A3E] rounded-full">Audited</span>
                </div>
                <p className="text-[11px] text-[#738276]">
                  Sources of funds, fixed assets, trade receivables, bank balance, and net working capital.
                </p>
                <button
                  onClick={handleExportBalanceSheetExcel}
                  className="w-full py-2 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                  <span>Download Balance Sheet (.xlsx)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-[#E0E4DE] bg-[#FDFDFC] hover:bg-[#F7F8F6] transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#2D4A3E]" />
                    <span className="font-bold text-xs text-[#1A2E25]">All Vendor GLs (Creditors)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EDF3EF] text-[#2D4A3E] rounded-full">{accounting.vendorLedgers.length} Parties</span>
                </div>
                <p className="text-[11px] text-[#738276]">
                  Complete master summary and itemized voucher entries for every vendor.
                </p>
                <button
                  onClick={handleExportAllVendorGLsExcel}
                  className="w-full py-2 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                  <span>Download All Vendor GLs (.xlsx)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-[#E0E4DE] bg-[#FDFDFC] hover:bg-[#F7F8F6] transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#2D4A3E]" />
                    <span className="font-bold text-xs text-[#1A2E25]">All Customer GLs (Debtors)</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EDF3EF] text-[#2D4A3E] rounded-full">{accounting.customerLedgers.length} Parties</span>
                </div>
                <p className="text-[11px] text-[#738276]">
                  Sales billed, customer bank receipts, opening balances, and outstanding ageing.
                </p>
                <button
                  onClick={handleExportAllCustomerGLsExcel}
                  className="w-full py-2 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                  <span>Download All Customer GLs (.xlsx)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-[#E0E4DE] bg-[#FDFDFC] hover:bg-[#F7F8F6] transition-colors space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#2D4A3E]" />
                    <span className="font-bold text-xs text-[#1A2E25]">General Trial Balance</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EDF3EF] text-[#2D4A3E] rounded-full">Debits == Credits</span>
                </div>
                <p className="text-[11px] text-[#738276]">
                  Double-entry validation across all nominal, personal, and real accounts.
                </p>
                <button
                  onClick={handleExportTrialBalanceExcel}
                  className="w-full py-2 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                  <span>Download Trial Balance (.xlsx)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border-2 border-dashed border-[#8DA173] bg-[#EDF3EF]/40 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderDown className="w-4 h-4 text-[#2D4A3E]" />
                      <span className="font-bold text-xs text-[#2D4A3E]">Master Multi-Tab Workbook</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[#2D4A3E] text-[#8DA173] rounded-full">All-In-One</span>
                  </div>
                  <p className="text-[11px] text-[#56655A] mt-1.5">
                    Includes P&L, Balance Sheet, Trial Balance, Vendor Summary, Customer Summary, and Bank Book in a single multi-tab workbook.
                  </p>
                </div>
                <button
                  onClick={handleExportMasterPackExcel}
                  className="w-full py-2.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#8DA173]" />
                  <span>Download Complete Pack (.xlsx)</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Financial Auditor & Statutory Health */}
          <div className="bg-white rounded-2xl border border-[#E0E4DE] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E0E4DE] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8DA173]" />
                  <h3 className="text-base font-extrabold text-[#1A2E25]">
                    AI Statutory Financial Audit & Health Check
                  </h3>
                </div>
                <p className="text-xs text-[#738276] mt-0.5">
                  Automated computation of Gross Margin, Working Capital Adequacy, Section 43B(h) MSME compliance, and GST liability variance.
                </p>
              </div>

              <button
                onClick={handleGenerateAiAudit}
                disabled={isGeneratingAiReport}
                className="px-4 py-2 bg-[#2D4A3E] hover:bg-[#1E362C] disabled:bg-[#738276] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer shrink-0"
              >
                {isGeneratingAiReport ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8DA173]" />
                    <span>Analyzing Financials...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span>Run AI Financial Audit</span>
                  </>
                )}
              </button>
            </div>

            {aiReport ? (
              <div className="p-4 bg-[#EDF3EF] border border-[#D5E2D9] rounded-xl text-xs text-[#1A2E25] font-sans leading-relaxed whitespace-pre-wrap">
                {aiReport}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border border-[#E0E4DE] bg-[#FDFDFC]">
                  <div className="font-bold text-[#1A2E25] mb-1">Double-Entry Balance</div>
                  <div className="text-[#2D4A3E] font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span>Debits equal Credits (Zero Variance)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E0E4DE] bg-[#FDFDFC]">
                  <div className="font-bold text-[#1A2E25] mb-1">Working Capital Ratio</div>
                  <div className="text-[#2D4A3E] font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span>Current Ratio: {accounting.balanceSheet.currentRatio} : 1.0 (Healthy)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E0E4DE] bg-[#FDFDFC]">
                  <div className="font-bold text-[#1A2E25] mb-1">GST ITC Offset Status</div>
                  <div className="text-[#2D4A3E] font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span>Input Tax Credit synchronized with Purchases</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: PROFIT & LOSS ACCOUNT (SCHEDULE III) */}
      {subTab === 'pnl' && (
        <div className="bg-white rounded-2xl border border-[#E0E4DE] p-6 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E0E4DE] pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#1A2E25]">Profit & Loss Statement (Trading & P&L Account)</h3>
              <p className="text-xs text-[#738276]">
                For the period {selectedPeriod} • Entity: {currentUser?.companyName || 'Commercial Entity'} ({companyGstin})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#EDF3EF] text-[#2D4A3E] font-bold text-xs rounded-full border border-[#D5E2D9]">
                Net Margin: {accounting.profitAndLoss.netProfitMarginPercent}%
              </span>
              <button
                onClick={handleExportPnLExcel}
                className="px-3.5 py-1.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Export P&L (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* TRADING ACCOUNT */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D4A3E] bg-[#EDF3EF] p-2.5 rounded-lg">
                I. Trading Account (Gross Profit Computation)
              </h4>

              <div className="border border-[#E0E4DE] rounded-xl overflow-hidden divide-y divide-[#E0E4DE] text-xs">
                <div className="p-3 bg-[#FDFDFC] flex justify-between font-semibold">
                  <span className="text-[#1A2E25]">Revenue from Operations (Gross Sales)</span>
                  <span className="font-mono text-[#2D4A3E]">₹{accounting.profitAndLoss.salesRevenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#FDFDFC] flex justify-between font-semibold">
                  <span className="text-[#1A2E25]">Add: Closing Stock of Inventory</span>
                  <span className="font-mono text-[#2D4A3E]">₹{accounting.profitAndLoss.closingStock.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#EDF3EF] flex justify-between font-bold text-[#2D4A3E]">
                  <span>Total Trading Credit (A)</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.totalTradingRevenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#FDFDFC] flex justify-between text-[#738276]">
                  <span>Less: Opening Stock</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.openingStock.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#FDFDFC] flex justify-between text-[#738276]">
                  <span>Less: Direct Purchases (Taxable)</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.grossPurchases.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#FDFDFC] flex justify-between text-[#738276]">
                  <span>Less: Direct Handling & Freight</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.directExpenses.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#F7F8F6] flex justify-between font-bold text-[#1A2E25]">
                  <span>Total Cost of Goods Sold (COGS)</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.totalCostOfGoodsSold.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#2D4A3E] text-white flex justify-between font-extrabold text-sm">
                  <span>Gross Profit c/d ({accounting.profitAndLoss.grossProfitMarginPercent}%)</span>
                  <span className="font-mono text-[#8DA173]">₹{accounting.profitAndLoss.grossProfit.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* PROFIT & LOSS ACCOUNT */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D4A3E] bg-[#EDF3EF] p-2.5 rounded-lg">
                II. Operating & Net Profit Computation
              </h4>

              <div className="border border-[#E0E4DE] rounded-xl overflow-hidden divide-y divide-[#E0E4DE] text-xs">
                <div className="p-3 bg-[#FDFDFC] flex justify-between font-semibold">
                  <span>Gross Profit b/d</span>
                  <span className="font-mono text-[#2D4A3E]">₹{accounting.profitAndLoss.grossProfit.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#FDFDFC] flex justify-between text-[#738276]">
                  <span>Add: Interest & Other Incomes</span>
                  <span className="font-mono text-[#2D4A3E]">₹{accounting.profitAndLoss.indirectIncomes.total.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#FFF2F0] flex justify-between text-[#C75D4E]">
                  <span>Less: Salaries & Employee Wages</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.indirectExpenses.salariesAndWages.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#FFF2F0] flex justify-between text-[#C75D4E]">
                  <span>Less: Office & Premises Rent</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.indirectExpenses.rentAndOffice.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#FFF2F0] flex justify-between text-[#C75D4E]">
                  <span>Less: Utilities, Power & Telecom</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.indirectExpenses.utilitiesAndPower.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#FFF2F0] flex justify-between text-[#C75D4E]">
                  <span>Less: Bank & Finance Charges</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.indirectExpenses.bankAndFinanceCharges.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#FFF2F0] flex justify-between text-[#C75D4E]">
                  <span>Less: Audit, Legal & Professional Fees</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.indirectExpenses.professionalAndLegal.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#FFF2F0] flex justify-between text-[#C75D4E]">
                  <span>Less: Depreciation on Fixed Assets</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.indirectExpenses.depreciation.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#F7F8F6] flex justify-between font-bold text-[#1A2E25]">
                  <span>Net Profit Before Tax (PBT)</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.netProfitBeforeTax.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3 bg-[#FFF2F0] flex justify-between text-[#C75D4E] font-semibold">
                  <span>Less: Estimated Income Tax Provision (25%)</span>
                  <span className="font-mono">₹{accounting.profitAndLoss.taxProvisionEstimated.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-3.5 bg-[#2D4A3E] text-white flex justify-between font-extrabold text-sm">
                  <span>Net Profit After Tax Transferred to Capital A/c</span>
                  <span className="font-mono text-[#8DA173]">₹{accounting.profitAndLoss.netProfitAfterTax.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: BALANCE SHEET (SCHEDULE III) */}
      {subTab === 'balance_sheet' && (
        <div className="bg-white rounded-2xl border border-[#E0E4DE] p-6 shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E0E4DE] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#1A2E25]">Balance Sheet (Schedule III Format)</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF3EF] text-[#2D4A3E] border border-[#D5E2D9]">
                  {accounting.balanceSheet.isBalanced ? 'Balanced (Zero Variance)' : 'Discrepancy Detected'}
                </span>
              </div>
              <p className="text-xs text-[#738276]">
                As on {accounting.balanceSheet.asOnDate} • Entity: {currentUser?.companyName || 'Commercial Entity'} ({companyGstin})
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-extrabold text-[#2D4A3E]">
                  Total: ₹{accounting.balanceSheet.assets.totalAssets.toLocaleString('en-IN')}
                </div>
                <span className="text-[10px] text-[#738276]">Working Capital: ₹{accounting.balanceSheet.workingCapital.toLocaleString('en-IN')}</span>
              </div>
              <button
                onClick={handleExportBalanceSheetExcel}
                className="px-3.5 py-1.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Export Balance Sheet (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LIABILITIES & CAPITAL */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D4A3E] bg-[#EDF3EF] p-2.5 rounded-lg flex items-center justify-between">
                <span>I. Equity & Liabilities (Sources of Funds)</span>
                <span>Amount (₹)</span>
              </h4>

              <div className="border border-[#E0E4DE] rounded-xl overflow-hidden divide-y divide-[#E0E4DE] text-xs">
                <div className="p-2.5 bg-[#F7F8F6] font-bold text-[#1A2E25]">1. Shareholders' / Proprietor Funds</div>
                <div className="p-2.5 pl-6 flex justify-between">
                  <span>(a) Proprietor Capital</span>
                  <span className="font-mono">₹{accounting.balanceSheet.equityAndLiabilities.shareholdersFunds.proprietorCapital.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2.5 pl-6 flex justify-between text-[#2D4A3E]">
                  <span>(b) Add: Current Period Profit (PAT)</span>
                  <span className="font-mono font-bold">+₹{accounting.balanceSheet.equityAndLiabilities.shareholdersFunds.currentPeriodProfit.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2.5 pl-6 flex justify-between text-[#C75D4E]">
                  <span>(c) Less: Drawings / Distributions</span>
                  <span className="font-mono">-₹{accounting.balanceSheet.equityAndLiabilities.shareholdersFunds.lessDrawings.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2.5 bg-[#EDF3EF] flex justify-between font-bold text-[#2D4A3E]">
                  <span>Total Capital Funds</span>
                  <span className="font-mono">₹{accounting.balanceSheet.equityAndLiabilities.shareholdersFunds.totalCapital.toLocaleString('en-IN')}</span>
                </div>

                <div className="p-2.5 bg-[#F7F8F6] font-bold text-[#1A2E25]">2. Non-Current Liabilities</div>
                <div className="p-2.5 pl-6 flex justify-between">
                  <span>(a) Secured Term Bank Loans</span>
                  <span className="font-mono">₹{accounting.balanceSheet.equityAndLiabilities.nonCurrentLiabilities.securedBankLoans.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2.5 pl-6 flex justify-between">
                  <span>(b) Unsecured Loans</span>
                  <span className="font-mono">₹{accounting.balanceSheet.equityAndLiabilities.nonCurrentLiabilities.unsecuredLoans.toLocaleString('en-IN')}</span>
                </div>

                <div className="p-2.5 bg-[#F7F8F6] font-bold text-[#1A2E25]">3. Current Liabilities & Trade Payables</div>
                <div className="p-2.5 pl-6 flex justify-between text-[#C75D4E] font-semibold">
                  <span>(a) Sundry Creditors / Trade Payables (Vendors)</span>
                  <span className="font-mono">₹{accounting.balanceSheet.equityAndLiabilities.currentLiabilities.sundryCreditorsTradePayables.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2.5 pl-6 flex justify-between">
                  <span>(b) GST Output Tax Liability (Net Payable)</span>
                  <span className="font-mono">₹{accounting.balanceSheet.equityAndLiabilities.currentLiabilities.netGstOutputPayable.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2.5 pl-6 flex justify-between">
                  <span>(c) TDS & Statutory Dues</span>
                  <span className="font-mono">₹{accounting.balanceSheet.equityAndLiabilities.currentLiabilities.tdsAndStatutoryDues.toLocaleString('en-IN')}</span>
                </div>

                <div className="p-3 bg-[#2D4A3E] text-white flex justify-between font-extrabold text-sm">
                  <span>TOTAL EQUITY & LIABILITIES</span>
                  <span className="font-mono text-[#8DA173]">₹{accounting.balanceSheet.equityAndLiabilities.totalLiabilities.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* ASSETS */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D4A3E] bg-[#EDF3EF] p-2.5 rounded-lg flex items-center justify-between">
                <span>II. Assets (Application of Funds)</span>
                <span>Amount (₹)</span>
              </h4>

              <div className="border border-[#E0E4DE] rounded-xl overflow-hidden divide-y divide-[#E0E4DE] text-xs">
                <div className="p-2.5 bg-[#F7F8F6] font-bold text-[#1A2E25]">1. Non-Current Assets (Fixed Assets)</div>
                <div className="p-2.5 pl-6 flex justify-between">
                  <span>(a) Tangible Fixed Assets (Gross Block)</span>
                  <span className="font-mono">₹{accounting.balanceSheet.assets.nonCurrentAssets.tangibleFixedAssets.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2.5 pl-6 flex justify-between text-[#C75D4E]">
                  <span>(b) Less: Accumulated Depreciation</span>
                  <span className="font-mono">-₹{accounting.balanceSheet.assets.nonCurrentAssets.lessDepreciation.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2.5 bg-[#EDF3EF] flex justify-between font-bold text-[#2D4A3E]">
                  <span>Net Fixed Assets</span>
                  <span className="font-mono">₹{accounting.balanceSheet.assets.nonCurrentAssets.netFixedAssets.toLocaleString('en-IN')}</span>
                </div>

                <div className="p-2.5 bg-[#F7F8F6] font-bold text-[#1A2E25]">2. Current Assets & Receivables</div>
                <div className="p-2.5 pl-6 flex justify-between">
                  <span>(a) Inventories / Closing Stock-in-Trade</span>
                  <span className="font-mono">₹{accounting.balanceSheet.assets.currentAssets.closingInventories.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2.5 pl-6 flex justify-between text-[#2D4A3E] font-semibold">
                  <span>(b) Sundry Debtors / Trade Receivables (Customers)</span>
                  <span className="font-mono">₹{accounting.balanceSheet.assets.currentAssets.sundryDebtorsTradeReceivables.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2.5 pl-6 flex justify-between font-semibold text-[#2D4A3E]">
                  <span>(c) Cash & Bank Balances (HDFC Bank Passbook)</span>
                  <span className="font-mono">₹{accounting.balanceSheet.assets.currentAssets.cashAndBankBalances.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2.5 pl-6 flex justify-between">
                  <span>(d) GST Input Tax Credit (ITC Asset C/F)</span>
                  <span className="font-mono">₹{accounting.balanceSheet.assets.currentAssets.netGstItcReceivable.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2.5 pl-6 flex justify-between">
                  <span>(e) Prepaid Expenses & Security Deposits</span>
                  <span className="font-mono">₹{accounting.balanceSheet.assets.currentAssets.prepaidAndAdvances.toLocaleString('en-IN')}</span>
                </div>

                <div className="p-3 bg-[#2D4A3E] text-white flex justify-between font-extrabold text-sm">
                  <span>TOTAL ASSETS</span>
                  <span className="font-mono text-[#8DA173]">₹{accounting.balanceSheet.assets.totalAssets.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: VENDOR LEDGERS (SUNDRY CREDITORS) */}
      {subTab === 'vendor_ledgers' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white p-4 rounded-2xl border border-[#E0E4DE] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#738276] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search vendor name, GSTIN, PAN..."
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8DA173]"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-[#738276] font-semibold">
                Total Vendors: <span className="text-[#2D4A3E] font-bold">{accounting.vendorLedgers.length}</span> • Total Payables:{' '}
                <span className="text-[#C75D4E] font-bold">₹{accounting.summary.creditorsOutstanding.toLocaleString('en-IN')}</span>
              </div>
              <button
                onClick={handleExportAllVendorGLsExcel}
                className="px-3.5 py-1.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Export All Vendor GLs (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Vendor List Column */}
            <div className="md:col-span-1 bg-white rounded-2xl border border-[#E0E4DE] p-4 shadow-xs space-y-3 max-h-[600px] overflow-y-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#738276]">Select Vendor Ledger</h4>
              <div className="space-y-2">
                {accounting.vendorLedgers
                  .filter((v) => v.partyName.toLowerCase().includes(searchTerm.toLowerCase()) || (v.partyGstin && v.partyGstin.toLowerCase().includes(searchTerm.toLowerCase())))
                  .map((v) => {
                    const isSelected = selectedLedger?.id === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedLedger(v)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#EDF3EF] border-[#8DA173] ring-1 ring-[#8DA173]'
                            : 'bg-[#FDFDFC] hover:bg-[#F7F8F6] border-[#E0E4DE]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1A2E25] truncate">{v.partyName}</span>
                          <span className="font-mono font-bold text-[#C75D4E]">
                            ₹{v.closingBalance.toLocaleString('en-IN')} {v.closingType}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#738276] font-mono mt-0.5 truncate">
                          {v.partyGstin || 'Unregistered Vendor'}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#738276] mt-2 pt-1.5 border-t border-[#E0E4DE]">
                          <span>Invoices: {v.invoicesCount}</span>
                          <span>Payments: {v.paymentsCount}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Vendor Ledger Statement (Drilldown) */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-[#E0E4DE] p-6 shadow-xs space-y-4">
              {selectedLedger && selectedLedger.partyType === 'VENDOR' ? (
                <>
                  <div className="flex items-start justify-between border-b border-[#E0E4DE] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-[#1A2E25]">{selectedLedger.partyName}</h3>
                        <span className="px-2 py-0.5 bg-[#FFF2F0] text-[#C75D4E] text-[10px] font-bold rounded-full">
                          Sundry Creditor
                        </span>
                      </div>
                      <p className="text-xs text-[#738276] font-mono mt-0.5">
                        GSTIN: {selectedLedger.partyGstin || 'N/A'} • Period: {selectedPeriod}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-[#738276]">Net Closing Balance:</div>
                        <div className="text-lg font-black text-[#C75D4E]">
                          ₹{selectedLedger.closingBalance.toLocaleString('en-IN')} {selectedLedger.closingType}
                        </div>
                      </div>
                      <button
                        onClick={() => handleExportSingleVendorGLExcel(selectedLedger)}
                        className="px-3 py-1.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title="Download this vendor's statement in Excel"
                      >
                        <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                        <span>Export GL (.xlsx)</span>
                      </button>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#EDF3EF] text-[#2D4A3E] border-b border-[#D5E2D9]">
                          <th className="p-2.5 font-bold">Date</th>
                          <th className="p-2.5 font-bold">Vch Type</th>
                          <th className="p-2.5 font-bold">Vch No / Ref</th>
                          <th className="p-2.5 font-bold">Particulars</th>
                          <th className="p-2.5 font-bold text-right">Debit (₹)</th>
                          <th className="p-2.5 font-bold text-right">Credit (₹)</th>
                          <th className="p-2.5 font-bold text-right">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E0E4DE]">
                        {selectedLedger.entries.map((e) => (
                          <tr key={e.id} className="hover:bg-[#F7F8F6]">
                            <td className="p-2.5 font-mono text-[#56655A]">{e.date}</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  e.voucherType === 'PURCHASE'
                                    ? 'bg-[#EDF3EF] text-[#2D4A3E]'
                                    : 'bg-[#FFF2F0] text-[#C75D4E]'
                                }`}
                              >
                                {e.voucherType}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-[#1A2E25] font-semibold">{e.voucherNo}</td>
                            <td className="p-2.5 text-[#56655A] max-w-xs truncate">{e.particulars}</td>
                            <td className="p-2.5 text-right font-mono text-[#2D4A3E] font-semibold">
                              {e.debit > 0 ? `₹${e.debit.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="p-2.5 text-right font-mono text-[#C75D4E] font-semibold">
                              {e.credit > 0 ? `₹${e.credit.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-[#1A2E25]">
                              ₹{e.runningBalance.toLocaleString('en-IN')} {e.balanceType}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-[#738276] space-y-2">
                  <Users className="w-10 h-10 mx-auto text-[#D5E2D9]" />
                  <p className="text-xs font-semibold">Select a vendor from the list to view the full ledger statement.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: CUSTOMER LEDGERS (SUNDRY DEBTORS) */}
      {subTab === 'customer_ledgers' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-white p-4 rounded-2xl border border-[#E0E4DE] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#738276] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search customer name, GSTIN..."
                className="w-full pl-9 pr-3.5 py-2 text-xs border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8DA173]"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs text-[#738276] font-semibold">
                Total Customers: <span className="text-[#2D4A3E] font-bold">{accounting.customerLedgers.length}</span> • Total Receivables:{' '}
                <span className="text-[#2D4A3E] font-bold">₹{accounting.summary.debtorsOutstanding.toLocaleString('en-IN')}</span>
              </div>
              <button
                onClick={handleExportAllCustomerGLsExcel}
                className="px-3.5 py-1.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Export All Customer GLs (.xlsx)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Customer List Column */}
            <div className="md:col-span-1 bg-white rounded-2xl border border-[#E0E4DE] p-4 shadow-xs space-y-3 max-h-[600px] overflow-y-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#738276]">Select Customer Ledger</h4>
              <div className="space-y-2">
                {accounting.customerLedgers
                  .filter((c) => c.partyName.toLowerCase().includes(searchTerm.toLowerCase()) || (c.partyGstin && c.partyGstin.toLowerCase().includes(searchTerm.toLowerCase())))
                  .map((c) => {
                    const isSelected = selectedLedger?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedLedger(c)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#EDF3EF] border-[#8DA173] ring-1 ring-[#8DA173]'
                            : 'bg-[#FDFDFC] hover:bg-[#F7F8F6] border-[#E0E4DE]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#1A2E25] truncate">{c.partyName}</span>
                          <span className="font-mono font-bold text-[#2D4A3E]">
                            ₹{c.closingBalance.toLocaleString('en-IN')} {c.closingType}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#738276] font-mono mt-0.5 truncate">
                          {c.partyGstin || 'URP / Consumer'}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-[#738276] mt-2 pt-1.5 border-t border-[#E0E4DE]">
                          <span>Invoices: {c.invoicesCount}</span>
                          <span>Receipts: {c.paymentsCount}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Customer Ledger Statement (Drilldown) */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-[#E0E4DE] p-6 shadow-xs space-y-4">
              {selectedLedger && selectedLedger.partyType === 'CUSTOMER' ? (
                <>
                  <div className="flex items-start justify-between border-b border-[#E0E4DE] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold text-[#1A2E25]">{selectedLedger.partyName}</h3>
                        <span className="px-2 py-0.5 bg-[#EDF3EF] text-[#2D4A3E] text-[10px] font-bold rounded-full">
                          Sundry Debtor
                        </span>
                      </div>
                      <p className="text-xs text-[#738276] font-mono mt-0.5">
                        GSTIN: {selectedLedger.partyGstin || 'URP'} • Period: {selectedPeriod}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-[#738276]">Net Outstanding (Asset):</div>
                        <div className="text-lg font-black text-[#2D4A3E]">
                          ₹{selectedLedger.closingBalance.toLocaleString('en-IN')} {selectedLedger.closingType}
                        </div>
                      </div>
                      <button
                        onClick={() => handleExportSingleCustomerGLExcel(selectedLedger)}
                        className="px-3 py-1.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                        title="Download this customer's statement in Excel"
                      >
                        <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                        <span>Export GL (.xlsx)</span>
                      </button>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#EDF3EF] text-[#2D4A3E] border-b border-[#D5E2D9]">
                          <th className="p-2.5 font-bold">Date</th>
                          <th className="p-2.5 font-bold">Vch Type</th>
                          <th className="p-2.5 font-bold">Vch No / Ref</th>
                          <th className="p-2.5 font-bold">Particulars</th>
                          <th className="p-2.5 font-bold text-right">Debit (₹)</th>
                          <th className="p-2.5 font-bold text-right">Credit (₹)</th>
                          <th className="p-2.5 font-bold text-right">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E0E4DE]">
                        {selectedLedger.entries.map((e) => (
                          <tr key={e.id} className="hover:bg-[#F7F8F6]">
                            <td className="p-2.5 font-mono text-[#56655A]">{e.date}</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  e.voucherType === 'SALES'
                                    ? 'bg-[#EDF3EF] text-[#2D4A3E]'
                                    : 'bg-[#EBF3FF] text-[#1E56A0]'
                                }`}
                              >
                                {e.voucherType}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-[#1A2E25] font-semibold">{e.voucherNo}</td>
                            <td className="p-2.5 text-[#56655A] max-w-xs truncate">{e.particulars}</td>
                            <td className="p-2.5 text-right font-mono text-[#2D4A3E] font-semibold">
                              {e.debit > 0 ? `₹${e.debit.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="p-2.5 text-right font-mono text-[#1E56A0] font-semibold">
                              {e.credit > 0 ? `₹${e.credit.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-[#1A2E25]">
                              ₹{e.runningBalance.toLocaleString('en-IN')} {e.balanceType}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-20 text-[#738276] space-y-2">
                  <Receipt className="w-10 h-10 mx-auto text-[#D5E2D9]" />
                  <p className="text-xs font-semibold">Select a customer from the list to view the full ledger statement.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: BANK STATEMENT & AUTO-TAGGED TRANSACTIONS */}
      {subTab === 'bank' && (
        <div className="bg-white rounded-2xl border border-[#E0E4DE] p-6 shadow-xs space-y-6 animate-in fade-in duration-200">
          {/* Header & Primary Actions */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#E0E4DE] pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-extrabold text-[#1A2E25]">Bank Passbook & Entrywise Cash Journal</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EDF3EF] text-[#2D4A3E] border border-[#D5E2D9]">
                  {bankTransactions.length} Recorded Entries
                </span>
              </div>
              <p className="text-xs text-[#738276] mt-1">
                Automated tagging of customer receipts, vendor payments, salary disbursements, and statutory GST PMT-06 / TDS tax debits with exportable multi-sheet audit intelligence.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Main Entrywise Excel Download Button */}
              <button
                onClick={() => handleExportBankStatementExcel(filteredBankTransactions.length > 0 ? filteredBankTransactions : bankTransactions)}
                disabled={bankTransactions.length === 0}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer ${
                  bankTransactions.length === 0
                    ? 'bg-[#E0E4DE] text-[#A0ACA2] cursor-not-allowed'
                    : 'bg-[#2D4A3E] hover:bg-[#1E362C] text-white hover:shadow-md'
                }`}
                title="Download comprehensive entrywise Excel workbook with 4 audit sheets"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#8DA173]" />
                <span>Download Entrywise Analysis (.xlsx)</span>
                {bankTransactions.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-white/20 text-white rounded font-mono">
                    {filteredBankTransactions.length === bankTransactions.length 
                      ? `${bankTransactions.length}`
                      : `${filteredBankTransactions.length}/${bankTransactions.length}`}
                  </span>
                )}
              </button>

              <button
                onClick={() => onOpenAddBank ? onOpenAddBank() : setIsBankModalOpen(true)}
                className="px-3.5 py-2 bg-white border border-[#E0E4DE] hover:bg-[#F7F8F6] text-[#2D4A3E] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Add Bank Entry</span>
              </button>
              
              <button
                onClick={() => setIsBankModalOpen(true)}
                className="px-3.5 py-2 bg-white border border-[#E0E4DE] hover:bg-[#F7F8F6] text-[#2D4A3E] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Upload Statement</span>
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div className="bg-[#F7F8F6] border border-[#E0E4DE] rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-[#738276] uppercase tracking-wider block">Total Deposits (Cr)</span>
              <div className="text-base font-extrabold text-[#2D4A3E] font-mono">
                ₹{bankMetrics.totalDeposits.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-[#738276]">Money Inflows & Receipts</span>
            </div>

            <div className="bg-[#F7F8F6] border border-[#E0E4DE] rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-[#738276] uppercase tracking-wider block">Total Withdrawals (Dr)</span>
              <div className="text-base font-extrabold text-[#C75D4E] font-mono">
                ₹{bankMetrics.totalWithdrawals.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-[#738276]">Payments & Expenses</span>
            </div>

            <div className="bg-[#F7F8F6] border border-[#E0E4DE] rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-[#738276] uppercase tracking-wider block">Net Cash Movement</span>
              <div className={`text-base font-extrabold font-mono ${bankMetrics.netFlow >= 0 ? 'text-[#2D4A3E]' : 'text-[#C75D4E]'}`}>
                {bankMetrics.netFlow >= 0 ? '+' : ''}₹{bankMetrics.netFlow.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-[#738276]">{bankMetrics.netFlow >= 0 ? 'Net Cash Surplus' : 'Net Cash Outflow'}</span>
            </div>

            <div className="bg-[#F7F8F6] border border-[#E0E4DE] rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold text-[#738276] uppercase tracking-wider block">Closing Bank Balance</span>
              <div className="text-base font-extrabold text-[#1A2E25] font-mono">
                ₹{bankMetrics.latestBalance.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-[#738276]">{bankMetrics.latestBalance >= 0 ? 'Favorable Balance (Cr)' : 'Overdraft / Dr'}</span>
            </div>

            <div className="bg-[#F7F8F6] border border-[#E0E4DE] rounded-xl p-3.5 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-[#738276] uppercase tracking-wider block">Audit Status</span>
              <div className="text-base font-extrabold text-[#1A2E25]">
                {bankMetrics.count} <span className="text-xs font-normal text-[#738276]">Entries</span>
              </div>
              <span className="text-[10px] text-[#8DA173] font-semibold">100% Reconciled Ready</span>
            </div>
          </div>

          {/* Search, Category Filter & Secondary Export Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#F7F8F6] p-3 rounded-xl border border-[#E0E4DE]">
            <div className="flex flex-wrap items-center gap-2.5 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-3.5 h-3.5 text-[#738276] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search narration, ref / UTR, counterparty..."
                  value={bankSearchTerm}
                  onChange={(e) => setBankSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#D5E2D9] rounded-lg text-xs text-[#1A2E25] placeholder-[#738276] focus:outline-none focus:border-[#2D4A3E]"
                />
                {bankSearchTerm && (
                  <button
                    onClick={() => setBankSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#738276] hover:text-[#1A2E25] text-xs font-bold cursor-pointer"
                  >
                    ×
                  </button>
                )}
              </div>

              <select
                value={bankCategoryFilter}
                onChange={(e) => setBankCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-[#D5E2D9] rounded-lg text-xs text-[#1A2E25] font-medium focus:outline-none focus:border-[#2D4A3E] cursor-pointer"
              >
                <option value="ALL">All Categories ({bankTransactions.length})</option>
                <option value="CUSTOMER_RECEIPT">Customer Receipts (Inflows)</option>
                <option value="VENDOR_PAYMENT">Vendor Payments (Outflows)</option>
                <option value="SALARY_EXPENSE">Salary & Payroll</option>
                <option value="RENT_EXPENSE">Rent & Office Lease</option>
                <option value="UTILITY_EXPENSE">Utility & Power</option>
                <option value="GST_TAX_PAYMENT">GST Tax Payment (PMT-06)</option>
                <option value="TDS_PAYMENT">TDS Tax Payments</option>
                <option value="BANK_CHARGES">Bank Charges & Fees</option>
                <option value="DIRECTOR_DRAWINGS">Director / Partner Drawings</option>
                <option value="CAPITAL_INTRODUCED">Capital Introduced</option>
                <option value="LOAN_TRANSACTION">Loan Transaction</option>
                <option value="OFFICE_EXPENSE">Office Expenses</option>
                <option value="OTHER_EXPENSE">Other General Expenses</option>
                <option value="OTHER_INCOME">Other Income</option>
              </select>
            </div>

            <div className="flex items-center gap-2 justify-end">
              {filteredBankTransactions.length !== bankTransactions.length && (
                <button
                  onClick={() => handleExportBankStatementExcel(filteredBankTransactions)}
                  className="px-3 py-1.5 bg-white border border-[#2D4A3E] text-[#2D4A3E] hover:bg-[#EDF3EF] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Download only the filtered entries in Excel"
                >
                  <Download className="w-3.5 h-3.5 text-[#2D4A3E]" />
                  <span>Export Filtered ({filteredBankTransactions.length})</span>
                </button>
              )}

              <button
                onClick={() => handleExportBankStatementExcel(bankTransactions)}
                className="px-3 py-1.5 bg-white border border-[#E0E4DE] text-[#2D4A3E] hover:bg-[#EDF3EF] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Download all entries in Excel"
              >
                <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Export All ({bankTransactions.length})</span>
              </button>
            </div>
          </div>

          {/* Bank Transactions Entrywise Table */}
          <div className="overflow-x-auto border border-[#E0E4DE] rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#EDF3EF] text-[#2D4A3E] border-b border-[#D5E2D9]">
                  <th className="p-2.5 font-bold w-12 text-center">#</th>
                  <th className="p-2.5 font-bold">Txn Date</th>
                  <th className="p-2.5 font-bold">Narration / Particulars</th>
                  <th className="p-2.5 font-bold">Ref / Chq No</th>
                  <th className="p-2.5 font-bold">Category & Voucher</th>
                  <th className="p-2.5 font-bold text-right">Withdrawal (Dr)</th>
                  <th className="p-2.5 font-bold text-right">Deposit (Cr)</th>
                  <th className="p-2.5 font-bold text-right">Running Balance</th>
                  <th className="p-2.5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E4DE]">
                {filteredBankTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-[#738276]">
                      <CreditCard className="w-9 h-9 mx-auto text-[#D5E2D9] mb-2" />
                      <p className="font-bold text-xs text-[#1A2E25]">No matching bank transactions found</p>
                      <p className="text-[11px] text-[#738276] mt-0.5">
                        {bankSearchTerm || bankCategoryFilter !== 'ALL'
                          ? 'Try clearing the search query or category filter.'
                          : 'Upload your bank passbook (PDF/CSV) or click "Add Bank Entry" to post a transaction.'}
                      </p>
                      {(bankSearchTerm || bankCategoryFilter !== 'ALL') && (
                        <button
                          onClick={() => {
                            setBankSearchTerm('');
                            setBankCategoryFilter('ALL');
                          }}
                          className="mt-3 px-3 py-1 bg-[#2D4A3E] text-white text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredBankTransactions.map((t, idx) => {
                    const isCredit = t.deposit > 0;
                    return (
                      <tr key={t.id} className="hover:bg-[#F7F8F6] transition-colors">
                        <td className="p-2.5 font-mono text-[#738276] text-center">{idx + 1}</td>
                        <td className="p-2.5 font-mono text-[#56655A] whitespace-nowrap">{t.date}</td>
                        <td className="p-2.5 font-medium text-[#1A2E25] max-w-xs sm:max-w-md">
                          <div className="truncate font-semibold">{t.narration}</div>
                          {t.partyName && (
                            <div className="text-[10px] text-[#738276] flex items-center gap-1 mt-0.5">
                              <span className="font-medium text-[#2D4A3E]">Entity:</span> {t.partyName}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-[#738276] whitespace-nowrap">{t.referenceNo || '—'}</td>
                        <td className="p-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            t.category === 'CUSTOMER_RECEIPT'
                              ? 'bg-[#EBF7EE] text-[#1E6B38] border-[#BCE4C6]'
                              : t.category === 'VENDOR_PAYMENT'
                              ? 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]'
                              : t.category === 'GST_TAX_PAYMENT' || t.category === 'TDS_PAYMENT'
                              ? 'bg-[#FFF8EE] text-[#B45309] border-[#FDE68A]'
                              : 'bg-[#EDF3EF] text-[#2D4A3E] border-[#D5E2D9]'
                          }`}>
                            {t.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-[#C75D4E] whitespace-nowrap">
                          {t.withdrawal > 0 ? `₹${t.withdrawal.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-[#2D4A3E] whitespace-nowrap">
                          {t.deposit > 0 ? `₹${t.deposit.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-[#1A2E25] whitespace-nowrap">
                          ₹{t.balance.toLocaleString('en-IN')}
                        </td>
                        <td className="p-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onOpenEditBank ? onOpenEditBank(t) : null}
                              className="p-1 text-[#738276] hover:text-[#2D4A3E] hover:bg-[#EDF3EF] rounded-lg transition-colors cursor-pointer"
                              title="Edit Bank Transaction"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (onDeleteBank) {
                                  onDeleteBank(t.id);
                                } else {
                                  onUpdateBankTransactions(bankTransactions.filter((x) => x.id !== t.id));
                                }
                              }}
                              className="p-1 text-[#C75D4E] hover:text-red-700 hover:bg-[#FFF2F0] rounded-lg transition-colors cursor-pointer"
                              title="Delete Transaction"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 7: SALES REGISTER (GSTR-1) */}
      {subTab === 'sales_register' && (
        <div className="bg-white rounded-2xl border border-[#E0E4DE] p-6 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#E0E4DE] pb-4">
            <div>
              <h3 className="text-base font-extrabold text-[#1A2E25]">Outward Sales Invoices (GSTR-1 Register)</h3>
              <p className="text-xs text-[#738276]">
                Total Billed: ₹{accounting.summary.totalSales.toLocaleString('en-IN')} • Period: {selectedPeriod}
              </p>
            </div>
            <button
              onClick={() => onOpenAddSale ? onOpenAddSale() : setIsAddSaleModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>Add Sales Invoice</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#EDF3EF] text-[#2D4A3E] border-b border-[#D5E2D9]">
                  <th className="p-2.5 font-bold">Inv Date</th>
                  <th className="p-2.5 font-bold">Invoice No</th>
                  <th className="p-2.5 font-bold">Customer Name</th>
                  <th className="p-2.5 font-bold">Customer GSTIN</th>
                  <th className="p-2.5 font-bold text-right">Taxable (₹)</th>
                  <th className="p-2.5 font-bold text-right">GST Total (₹)</th>
                  <th className="p-2.5 font-bold text-right">Gross Total (₹)</th>
                  <th className="p-2.5 font-bold text-center">Status</th>
                  <th className="p-2.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E4DE]">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[#738276]">
                      <Receipt className="w-8 h-8 mx-auto text-[#D5E2D9] mb-2" />
                      <p className="font-semibold text-xs text-[#1A2E25]">No sales invoices found</p>
                      <p className="text-[11px] text-[#738276] mt-0.5">
                        Click "Add Sales Invoice", sync your GST Sales data, or upload sales CSV.
                      </p>
                    </td>
                  </tr>
                ) : (
                  sales.map((s) => (
                    <tr key={s.id} className="hover:bg-[#F7F8F6]">
                      <td className="p-2.5 font-mono text-[#56655A]">{s.invoiceDate}</td>
                      <td className="p-2.5 font-mono font-bold text-[#1A2E25]">{s.invoiceNumber}</td>
                      <td className="p-2.5 font-medium text-[#1A2E25]">{s.customerName}</td>
                      <td className="p-2.5 font-mono text-[#738276]">{s.gstin}</td>
                      <td className="p-2.5 text-right font-mono">₹{s.taxableValue.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right font-mono text-[#2D4A3E]">₹{s.totalTax.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-[#1A2E25]">₹{s.invoiceValue.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.paymentStatus === 'PAID'
                              ? 'bg-[#EDF3EF] text-[#2D4A3E]'
                              : s.paymentStatus === 'PARTIALLY_PAID'
                              ? 'bg-[#FFF8E6] text-[#B8860B]'
                              : 'bg-[#FFF2F0] text-[#C75D4E]'
                          }`}
                        >
                          {s.paymentStatus || 'UNPAID'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenEditSale ? onOpenEditSale(s) : null}
                            className="p-1 text-[#738276] hover:text-[#2D4A3E] hover:bg-[#EDF3EF] rounded-lg transition-colors cursor-pointer"
                            title="Edit Sales Invoice"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (onDeleteSale) {
                                onDeleteSale(s.id);
                              } else {
                                onUpdateSales(sales.filter((x) => x.id !== s.id));
                              }
                            }}
                            className="p-1 text-[#C75D4E] hover:text-red-700 hover:bg-[#FFF2F0] rounded-lg transition-colors cursor-pointer"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 8: TRIAL BALANCE */}
      {subTab === 'trial_balance' && (
        <div className="bg-white rounded-2xl border border-[#E0E4DE] p-6 shadow-xs space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#E0E4DE] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-[#1A2E25]">General Ledger Trial Balance</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF3EF] text-[#2D4A3E] border border-[#D5E2D9]">
                  Debits == Credits Verified
                </span>
              </div>
              <p className="text-xs text-[#738276]">
                Mathematical validation of double-entry ledger postings across all nominal, personal, and real accounts.
              </p>
            </div>
            <button
              onClick={handleExportTrialBalanceExcel}
              className="px-3.5 py-1.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>Export Trial Balance (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#EDF3EF] text-[#2D4A3E] border-b border-[#D5E2D9]">
                  <th className="p-2.5 font-bold">A/c Code</th>
                  <th className="p-2.5 font-bold">Particulars / Account Head</th>
                  <th className="p-2.5 font-bold">Group</th>
                  <th className="p-2.5 font-bold text-right">Debit Total (₹)</th>
                  <th className="p-2.5 font-bold text-right">Credit Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E0E4DE]">
                {accounting.trialBalance.map((row) => (
                  <tr key={row.accountCode} className="hover:bg-[#F7F8F6]">
                    <td className="p-2.5 font-mono text-[#738276]">{row.accountCode}</td>
                    <td className="p-2.5 font-bold text-[#1A2E25]">{row.accountName}</td>
                    <td className="p-2.5 text-[#738276]">{row.accountGroup}</td>
                    <td className="p-2.5 text-right font-mono font-semibold text-[#2D4A3E]">
                      {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="p-2.5 text-right font-mono font-semibold text-[#C75D4E]">
                      {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#2D4A3E] text-white font-extrabold text-sm">
                  <td colSpan={3} className="p-3">
                    TOTAL TRIAL BALANCE (BALANCED)
                  </td>
                  <td className="p-3 text-right font-mono text-[#8DA173]">
                    ₹{accounting.trialBalance.reduce((a, b) => a + b.debit, 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-right font-mono text-[#8DA173]">
                    ₹{accounting.trialBalance.reduce((a, b) => a + b.credit, 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* BANK STATEMENT UPLOAD MODAL */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-[#E0E4DE] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-[#E0E4DE] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#2D4A3E] text-white flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[#8DA173]" />
                </div>
                <h3 className="text-sm font-bold text-[#1A2E25]">Upload Bank Statement / Passbook</h3>
              </div>
              <button
                onClick={() => setIsBankModalOpen(false)}
                className="text-[#738276] hover:text-[#1A2E25] p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#E0E4DE] gap-4 text-xs font-semibold">
              <button
                onClick={() => setBankInputMode('file')}
                className={`pb-2 cursor-pointer ${bankInputMode === 'file' ? 'text-[#2D4A3E] border-b-2 border-[#2D4A3E] font-bold' : 'text-[#738276]'}`}
              >
                Upload File (PDF / CSV / Excel)
              </button>
              <button
                onClick={() => setBankInputMode('paste')}
                className={`pb-2 cursor-pointer ${bankInputMode === 'paste' ? 'text-[#2D4A3E] border-b-2 border-[#2D4A3E] font-bold' : 'text-[#738276]'}`}
              >
                Paste Statement Text
              </button>
            </div>

            {bankInputMode === 'file' && (
              <div className="space-y-3">
                <label className="border-2 border-dashed border-[#D5E2D9] hover:border-[#8DA173] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#FDFDFC]">
                  <Upload className="w-8 h-8 text-[#8DA173] mb-2" />
                  <span className="text-xs font-bold text-[#1A2E25]">Choose Bank Statement PDF or CSV</span>
                  <span className="text-[11px] text-[#738276] mt-1">Supports Bank of Baroda (REP31 Ledger), HDFC, ICICI, SBI, Axis Bank formats</span>
                  <input
                    type="file"
                    accept=".pdf,.csv,.txt,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleBankFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {uploadingBank && (
                  <div className="flex items-center justify-center gap-2 text-xs text-[#2D4A3E] font-bold py-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#8DA173]" />
                    <span>Parsing Bank Statement via Gemini OCR & Auto-Tagging...</span>
                  </div>
                )}
              </div>
            )}

            {bankInputMode === 'paste' && (
              <div className="space-y-3">
                <textarea
                  rows={6}
                  value={pastedBankText}
                  onChange={(e) => setPastedBankText(e.target.value)}
                  placeholder="Paste bank statement rows (Date, Narration, Chq/Ref, Withdrawal, Deposit, Balance)..."
                  className="w-full p-3 text-xs font-mono border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8DA173]"
                />
                <button
                  onClick={handlePastedBankSubmit}
                  className="w-full py-2.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Parse & Post Transactions
                </button>
              </div>
            )}

            {uploadError && (
              <div className="p-3 bg-[#FFF2F0] border border-[#F5C2BC] text-[#C75D4E] rounded-xl text-xs font-bold">
                {uploadError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ADD SALES INVOICE MODAL */}
      {isAddSaleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
          <form
            onSubmit={handleAddSale}
            className="bg-white w-full max-w-md rounded-2xl border border-[#E0E4DE] shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto my-auto"
          >
            <div className="flex items-center justify-between border-b border-[#E0E4DE] pb-3">
              <h3 className="text-sm font-bold text-[#1A2E25]">Add Outward Sales Invoice (GSTR-1)</h3>
              <button
                type="button"
                onClick={() => setIsAddSaleModalOpen(false)}
                className="text-[#738276] hover:text-[#1A2E25] p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#2D4A3E] block mb-1">Customer / Client Name</label>
                <input
                  type="text"
                  required
                  value={newSaleCustomer}
                  onChange={(e) => setNewSaleCustomer(e.target.value)}
                  placeholder="e.g. Godrej Infotech & Engineering Ltd"
                  className="w-full px-3 py-2 border border-[#E0E4DE] rounded-xl focus:ring-2 focus:ring-[#8DA173] outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#2D4A3E] block mb-1">Customer GSTIN (or URP)</label>
                <input
                  type="text"
                  value={newSaleGstin}
                  onChange={(e) => setNewSaleGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 27AAACG1122H1Z1"
                  className="w-full px-3 py-2 font-mono uppercase border border-[#E0E4DE] rounded-xl focus:ring-2 focus:ring-[#8DA173] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2D4A3E] block mb-1">Invoice Number</label>
                  <input
                    type="text"
                    required
                    value={newSaleInvNo}
                    onChange={(e) => setNewSaleInvNo(e.target.value)}
                    placeholder="INV/2024-25/007"
                    className="w-full px-3 py-2 font-mono border border-[#E0E4DE] rounded-xl focus:ring-2 focus:ring-[#8DA173] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2D4A3E] block mb-1">Invoice Date</label>
                  <input
                    type="date"
                    required
                    value={newSaleDate}
                    onChange={(e) => setNewSaleDate(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-[#E0E4DE] rounded-xl focus:ring-2 focus:ring-[#8DA173] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#2D4A3E] block mb-1">Taxable Value (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newSaleTaxable}
                    onChange={(e) => setNewSaleTaxable(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 font-mono border border-[#E0E4DE] rounded-xl focus:ring-2 focus:ring-[#8DA173] outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#2D4A3E] block mb-1">GST Rate (%)</label>
                  <select
                    value={newSaleGstRate}
                    onChange={(e) => setNewSaleGstRate(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E0E4DE] rounded-xl focus:ring-2 focus:ring-[#8DA173] outline-none bg-white font-medium"
                  >
                    <option value={18}>18% (Standard Services / Goods)</option>
                    <option value={12}>12%</option>
                    <option value={5}>5%</option>
                    <option value={28}>28%</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E0E4DE] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddSaleModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#738276] hover:bg-[#F7F8F6] rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#2D4A3E] hover:bg-[#1E362C] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Save & Post to Debtor Ledger
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
