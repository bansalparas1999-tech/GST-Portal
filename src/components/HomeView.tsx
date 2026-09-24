import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  UploadCloud,
  Play,
  ArrowRight,
  ShieldCheck,
  Building2,
  Sparkles,
  AlertTriangle,
  Scale,
  MailWarning,
  CheckCircle2,
  Users,
  Lock,
  Edit2,
  CreditCard,
  Clipboard,
  Database,
  Receipt,
  Globe,
  Key,
  Zap,
} from 'lucide-react';
import { UserProfile, Language } from '../types';
import { ImportTabType } from './UploadModal';
import { translations } from '../utils/translations';

interface HomeViewProps {
  language: Language;
  currentUser: UserProfile | null;
  companyGstin: string;
  onOpenClientSelector: () => void;
  onOpenGstPortalLogin?: () => void;
  onOpenGstIncognitoDriver?: () => void;
  onNavigate: (tab: string) => void;
  onOpenUpload: (tab?: ImportTabType) => void;
  onOpenAuth: () => void;
  totalInvoicesCount: number;
}

export const HomeView: React.FC<HomeViewProps> = ({
  language,
  currentUser,
  companyGstin,
  onOpenClientSelector,
  onOpenGstPortalLogin,
  onOpenGstIncognitoDriver,
  onNavigate,
  onOpenUpload,
  onOpenAuth,
  totalInvoicesCount,
}) => {
  const t = translations[language];
  const activeGstin = companyGstin || currentUser?.companyGstin || '27AABCA1234F1Z8';
  const activeCompanyName = currentUser?.companyName || 'Apex Advisory Practice';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1400px] mx-auto space-y-8 pb-16">
      {/* Hero Welcome Banner */}
      <section className="bg-white rounded-3xl border border-[#E0E4DE] p-6 sm:p-8 md:p-10 shadow-xs relative overflow-hidden">
        {/* Subtle decorative background graphic */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#EDF3EF]/60 pointer-events-none -z-0" />
        <div className="absolute right-32 -bottom-20 w-64 h-64 rounded-full bg-[#F7F8F6] pointer-events-none -z-0" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-[#EDF3EF] text-[#2D4A3E] border border-[#D5E2D9]">
              <ShieldCheck className="w-4 h-4 text-[#8DA173]" />
              <span>Statutory Section 16(2)(aa) & Rule 37A Compliant ITC Engine</span>
            </div>

            {currentUser && (
              <button
                type="button"
                onClick={onOpenClientSelector}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-[#2D4A3E] text-white hover:bg-[#1E362C] transition-all cursor-pointer shadow-xs"
              >
                <Building2 className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Client: {activeGstin}</span>
                <Edit2 className="w-3 h-3 text-[#8DA173] ml-1" />
              </button>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#1A2E25] tracking-tight leading-tight">
            {currentUser
              ? `Welcome back, ${currentUser.displayName || 'Tax Officer'}`
              : 'Enterprise GST Reconciliation & ITC Protection System'}
          </h1>

          <p className="text-sm md:text-base text-[#4A584E] leading-relaxed">
            Automate matching between your Internal Purchase Registers (Tally, SAP, ERP, or Scanned Invoices PDF) and 
            Government GSTR-2B / GSTR-1 filings. Detect invoice discrepancies, protect 100% of eligible Input Tax Credit, and dispatch legal vendor notices before statutory deadlines.
          </p>

          {/* Primary Call to Actions */}
          <div className="pt-3 flex flex-wrap items-center gap-3">
            {currentUser ? (
              <>
                <button
                  id="btn-home-upload-pdf"
                  onClick={() => onOpenUpload('pdf')}
                  className="px-5 sm:px-6 py-3 bg-[#2D4A3E] text-white rounded-xl text-xs md:text-sm font-bold hover:bg-[#1E362C] transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#8DA173]" />
                  <span>Scan Invoices (Merged PDF AI)</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <button
                  id="btn-home-upload-excel"
                  onClick={() => onOpenUpload('files')}
                  className="px-4 sm:px-5 py-3 bg-[#F1F3EE] hover:bg-[#E0E4DE] text-[#2D4A3E] border border-[#E0E4DE] rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#8DA173]" />
                  <span>Upload Excel / GSTR-2B</span>
                </button>

                <button
                  id="btn-home-upload-sales"
                  onClick={() => onOpenUpload('sales_import')}
                  className="px-4 sm:px-5 py-3 bg-[#F1F3EE] hover:bg-[#E0E4DE] text-[#2D4A3E] border border-[#E0E4DE] rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Receipt className="w-4 h-4 text-[#2D4A3E]" />
                  <span>Sales / GSTR-1</span>
                </button>

                <button
                  id="btn-home-upload-bank"
                  onClick={() => onOpenUpload('bank')}
                  className="px-4 sm:px-5 py-3 bg-[#EDF3EF] hover:bg-[#DCE7E0] text-[#2D4A3E] border border-[#D5E2D9] rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4 text-[#8DA173]" />
                  <span>Bank Statement</span>
                </button>

                <button
                  id="btn-home-templates"
                  onClick={() => onNavigate('templates')}
                  className="px-4 sm:px-5 py-3 bg-white hover:bg-[#F1F3EE] text-[#2D4A3E] border border-[#E0E4DE] rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#8DA173]" />
                  <span>Download Templates</span>
                </button>

                {onOpenGstIncognitoDriver && (
                  <button
                    id="btn-home-gst-incognito-driver"
                    onClick={onOpenGstIncognitoDriver}
                    className="px-4 sm:px-5 py-3 bg-linear-to-r from-[#1A2E25] via-[#243E32] to-[#2D4A3E] text-white hover:from-[#0F1F19] hover:to-[#1E362C] rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md border border-[#8DA173]/40"
                  >
                    <Zap className="w-4 h-4 text-[#8DA173] animate-pulse" />
                    <span>⚡ GST Portal Auto-Login (Incognito Auto-Type)</span>
                  </button>
                )}

                {onOpenGstPortalLogin && (
                  <button
                    id="btn-home-gst-portal-login"
                    onClick={onOpenGstPortalLogin}
                    className="px-4 sm:px-5 py-3 bg-[#EDF3EF] hover:bg-[#DCE7E0] text-[#2D4A3E] border border-[#D5E2D9] rounded-xl text-xs md:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Globe className="w-4 h-4 text-[#8DA173]" />
                    <span>GST Portal Vault & OCR</span>
                  </button>
                )}

                {totalInvoicesCount > 0 && (
                  <button
                    onClick={() => onNavigate('dashboard')}
                    className="px-4 sm:px-5 py-3 bg-[#8DA173] text-white rounded-xl text-xs md:text-sm font-bold hover:bg-[#7A8E61] transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    <span>View Reconciled Invoices ({totalInvoicesCount})</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={onOpenAuth}
                  className="px-6 py-3 bg-[#2D4A3E] text-white rounded-xl text-xs md:text-sm font-bold hover:bg-[#1E362C] transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Lock className="w-4 h-4 text-[#8DA173]" />
                  <span>Sign In to Unlock Portal & Features</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
                <button
                  onClick={onOpenAuth}
                  className="px-5 py-3 bg-white hover:bg-[#F7F8F6] text-[#2D4A3E] border border-[#E0E4DE] rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Create Account</span>
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* UNIFIED IMPORT OPTIONS GRID */}
      {currentUser && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#1A2E25]">
                Unified Data Import & Ingestion Hub
              </h2>
              <p className="text-xs text-[#738276] mt-0.5">
                Choose from all available import formats to feed invoices, return statements, and bank ledgers.
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#2D4A3E] bg-[#EDF3EF] px-3 py-1 rounded-full border border-[#D5E2D9]">
              All Formats Supported
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Tile 1: Scanned Invoices */}
            <div
              onClick={() => onOpenUpload('pdf')}
              className="bg-white p-5 rounded-2xl border border-[#E0E4DE] hover:border-[#8DA173] shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#EDF3EF] group-hover:bg-[#2D4A3E] group-hover:text-white transition-colors flex items-center justify-center text-[#8DA173]">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#8DA173] text-white">
                  AI OCR
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1A2E25] group-hover:text-[#2D4A3E]">
                  Scanned Invoices (Merged PDF)
                </h3>
                <p className="text-xs text-[#56655A] mt-1 leading-relaxed">
                  Upload multi-page PDFs or photos of vendor bills. Gemini AI extracts GSTIN, amounts, and dates automatically.
                </p>
              </div>
              <div className="text-xs font-bold text-[#8DA173] flex items-center gap-1 pt-1">
                <span>Launch OCR Parser</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tile 2: Excel / CSV / JSON (Purchase + GSTR-2B) */}
            <div
              onClick={() => onOpenUpload('files')}
              className="bg-white p-5 rounded-2xl border border-[#E0E4DE] hover:border-[#8DA173] shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#EDF3EF] group-hover:bg-[#2D4A3E] group-hover:text-white transition-colors flex items-center justify-center text-[#2D4A3E]">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EDF3EF] text-[#2D4A3E]">
                  Purchase
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1A2E25] group-hover:text-[#2D4A3E]">
                  Purchase Register & GSTR-2B
                </h3>
                <p className="text-xs text-[#56655A] mt-1 leading-relaxed">
                  Import Purchase Registers exported from Tally / ERP and official GSTR-2B JSON from the GST Portal.
                </p>
              </div>
              <div className="text-xs font-bold text-[#2D4A3E] flex items-center gap-1 pt-1">
                <span>Upload Files</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tile 3: Sales Register & GSTR-1 */}
            <div
              onClick={() => onOpenUpload('sales_import')}
              className="bg-white p-5 rounded-2xl border border-[#E0E4DE] hover:border-[#8DA173] shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#EDF3EF] group-hover:bg-[#2D4A3E] group-hover:text-white transition-colors flex items-center justify-center text-[#2D4A3E]">
                  <Receipt className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EDF3EF] text-[#2D4A3E]">
                  Sales & GSTR-1
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1A2E25] group-hover:text-[#2D4A3E]">
                  Sales Register & GSTR-1 Import
                </h3>
                <p className="text-xs text-[#56655A] mt-1 leading-relaxed">
                  Import your Outward Supplies Sales Register and GST Portal GSTR-1 filing for 2-way sales reconciliation.
                </p>
              </div>
              <div className="text-xs font-bold text-[#2D4A3E] flex items-center gap-1 pt-1">
                <span>Import Sales & GSTR-1</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tile 4: Bank Statement */}
            <div
              onClick={() => onOpenUpload('bank')}
              className="bg-white p-5 rounded-2xl border border-[#E0E4DE] hover:border-[#8DA173] shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#EDF3EF] group-hover:bg-[#2D4A3E] group-hover:text-white transition-colors flex items-center justify-center text-[#2D4A3E]">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2D4A3E] text-white">
                  Bank Ledger
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1A2E25] group-hover:text-[#2D4A3E]">
                  Bank Statement (PDF / CSV)
                </h3>
                <p className="text-xs text-[#56655A] mt-1 leading-relaxed">
                  Upload HDFC, ICICI, SBI, Axis passbooks to auto-tag transactions and build Balance Sheet & P&L statements.
                </p>
              </div>
              <div className="text-xs font-bold text-[#2D4A3E] flex items-center gap-1 pt-1">
                <span>Import Bank Passbook</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tile 5: Copy & Paste */}
            <div
              onClick={() => onOpenUpload('paste')}
              className="bg-white p-5 rounded-2xl border border-[#E0E4DE] hover:border-[#8DA173] shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#EDF3EF] group-hover:bg-[#2D4A3E] group-hover:text-white transition-colors flex items-center justify-center text-[#738276]">
                  <Clipboard className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F1F3EE] text-[#56655A]">
                  Direct Paste
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1A2E25] group-hover:text-[#2D4A3E]">
                  Copy & Paste Spreadsheet
                </h3>
                <p className="text-xs text-[#56655A] mt-1 leading-relaxed">
                  Paste rows directly from Google Sheets or Excel clipboard into Books or GSTR-2B.
                </p>
              </div>
              <div className="text-xs font-bold text-[#56655A] flex items-center gap-1 pt-1">
                <span>Open Paste Box</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tile 6: Excel & CSV Templates */}
            <div
              onClick={() => onNavigate('templates')}
              className="bg-white p-5 rounded-2xl border border-[#E0E4DE] hover:border-[#8DA173] shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#EDF3EF] group-hover:bg-[#2D4A3E] group-hover:text-white transition-colors flex items-center justify-center text-[#2D4A3E]">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#8DA173] text-white">
                  Templates
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1A2E25] group-hover:text-[#2D4A3E]">
                  CSV & Excel Templates Hub
                </h3>
                <p className="text-xs text-[#56655A] mt-1 leading-relaxed">
                  Download standard formatted templates for Purchase Register, Sales Register, Bank Statement, and Trial Balance.
                </p>
              </div>
              <div className="text-xs font-bold text-[#2D4A3E] flex items-center gap-1 pt-1">
                <span>View & Download Formats</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Tile 7: GST Status & PAN Verification */}
            <div
              id="tile-home-gst-verification"
              onClick={() => onNavigate('gst_verification')}
              className="bg-white p-5 rounded-2xl border border-[#E0E4DE] hover:border-[#8DA173] shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#EDF3EF] group-hover:bg-[#2D4A3E] group-hover:text-white transition-colors flex items-center justify-center text-[#2D4A3E]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#8DA173] text-white">
                  Bulk & Excel
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1A2E25] group-hover:text-[#2D4A3E]">
                  GST Status & PAN Verification
                </h3>
                <p className="text-xs text-[#56655A] mt-1 leading-relaxed">
                  Verify GSTIN status individually or in bulk, resolve PAN-to-GSTIN multi-branch networks, and export Excel reports.
                </p>
              </div>
              <div className="text-xs font-bold text-[#2D4A3E] flex items-center gap-1 pt-1">
                <span>Open Verification Tool</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FEATURE SPOTLIGHT: Scanned Invoices Merged PDF OCR */}
      <section className="bg-gradient-to-r from-[#FAFBF9] to-[#EDF3EF] rounded-3xl border border-[#D5E2D9] p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white text-[#2D4A3E] border border-[#D5E2D9]">
              <Sparkles className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>Multimodal Gemini 3.7 Flash Document Parser</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-[#1A2E25]">
              Upload Scanned Vendor Invoices in a Merged PDF
            </h2>
            <p className="text-xs md:text-sm text-[#56655A] leading-relaxed">
              No need to manually type hundreds of paper bills into Excel. Upload a single multi-page merged PDF of scanned supplier invoices. The AI vision engine accurately extracts supplier GSTINs, invoice numbers, dates, assessable taxable amounts, and IGST/CGST/SGST breakdowns directly into your Purchase Register template ready for automatic GSTR-2B matching.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#2D4A3E] pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#8DA173]" />
                Multi-page PDF extraction
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#8DA173]" />
                E-Invoice QR & HSN detection
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#8DA173]" />
                Instant GSTR-2B ITC verification
              </span>
            </div>
          </div>

          <div className="shrink-0 flex flex-col gap-2.5 w-full sm:w-auto">
            {currentUser ? (
              <button
                onClick={() => onOpenUpload('pdf')}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs md:text-sm font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <FileText className="w-4 h-4 text-[#8DA173]" />
                <span>Launch Scanned Invoices Extractor</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs md:text-sm font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Lock className="w-4 h-4 text-[#8DA173]" />
                <span>Sign In to Scan Invoices</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* INFOGRAPHIC: 4-Step End-to-End Reconciliation Pipeline */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#1A2E25]">
              How the GST Reconciliation Engine Works
            </h2>
            <p className="text-xs text-[#738276] mt-0.5">
              Architected to guarantee complete ITC preservation and automated supplier follow-up.
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#8DA173] bg-[#EDF3EF] px-3 py-1 rounded-full">
            Pipeline Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-3 relative hover:border-[#8DA173] transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#EDF3EF] text-[#2D4A3E] flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5 text-[#8DA173]" />
              </div>
              <span className="text-2xl font-extrabold text-[#E0E4DE] font-mono">01</span>
            </div>
            <h3 className="text-sm font-bold text-[#1A2E25]">Ingest & Normalize</h3>
            <p className="text-xs text-[#56655A] leading-relaxed">
              Import Purchase Register and GSTR-2B statements (Excel, CSV, JSON, PDF). Standardizes invoice formats, special characters, and GSTIN structures.
            </p>
            <div className="text-[11px] font-semibold text-[#8DA173] pt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Multi-format Parsing</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-3 relative hover:border-[#8DA173] transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#EDF3EF] text-[#2D4A3E] flex items-center justify-center font-bold">
                <Scale className="w-5 h-5 text-[#2D4A3E]" />
              </div>
              <span className="text-2xl font-extrabold text-[#E0E4DE] font-mono">02</span>
            </div>
            <h3 className="text-sm font-bold text-[#1A2E25]">Multi-Pass Fuzzy Match</h3>
            <p className="text-xs text-[#56655A] leading-relaxed">
              Applies exact matching, fuzzy OCR typo tolerance (0 vs O, 1 vs I), rounding tolerances, and PAN-level multi-GSTIN supplier linking.
            </p>
            <div className="text-[11px] font-semibold text-[#8DA173] pt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Configurable Tolerances</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-3 relative hover:border-[#8DA173] transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#FFF2F0] text-[#C75D4E] flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5 text-[#C75D4E]" />
              </div>
              <span className="text-2xl font-extrabold text-[#F5C2BC] font-mono">03</span>
            </div>
            <h3 className="text-sm font-bold text-[#1A2E25]">Discrepancy Audit</h3>
            <p className="text-xs text-[#56655A] leading-relaxed">
              Identifies missing invoices in GSTR-2B, tax amount differences, POS misallocations, and Section 17(5) blocked credits.
            </p>
            <div className="text-[11px] font-semibold text-[#C75D4E] pt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Full Audit Trace</span>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-6 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-3 relative hover:border-[#8DA173] transition-colors">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-[#FFF8EE] text-[#D9A14E] flex items-center justify-center font-bold">
                <MailWarning className="w-5 h-5 text-[#D9A14E]" />
              </div>
              <span className="text-2xl font-extrabold text-[#F5E6CC] font-mono">04</span>
            </div>
            <h3 className="text-sm font-bold text-[#1A2E25]">Statutory Notices</h3>
            <p className="text-xs text-[#56655A] leading-relaxed">
              Generate legal demand notices under Section 16 & Rule 37A. Dispatch formal emails and WhatsApp notices to defaulting suppliers with 1 click.
            </p>
            <div className="text-[11px] font-semibold text-[#D9A14E] pt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Admin Governed Templates</span>
            </div>
          </div>
        </div>
      </section>

      {/* INFOGRAPHIC: Key Value Pillars & Compliance Modules */}
      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#2D4A3E] text-[#8DA173] flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#1A2E25]">Section 16(2)(aa) Shield</h3>
          <p className="text-xs text-[#56655A] leading-relaxed">
            Prevents claiming un-reflected ITC. Automatically locks and flags invoices missing in GSTR-2B to protect your organization from interest and penalties under Section 50.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#8DA173] text-white flex items-center justify-center font-bold shadow-xs">
            <Scale className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#1A2E25]">Rule 37A 180-Day ITC Guard</h3>
          <p className="text-xs text-[#56655A] leading-relaxed">
            Identifies suppliers who have not filed GSTR-3B after uploading GSTR-1, enabling timely payment withholding and debit notes before mandatory year-end reversal.
          </p>
        </div>

        <div 
          onClick={() => onNavigate('accounting')}
          className="bg-white p-6 rounded-2xl border border-[#E0E4DE] hover:border-[#8DA173] cursor-pointer shadow-xs space-y-3 transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-[#EDF3EF] text-[#2D4A3E] group-hover:bg-[#2D4A3E] group-hover:text-white transition-colors flex items-center justify-center font-bold shadow-xs">
            <Scale className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-[#1A2E25] group-hover:text-[#2D4A3E] transition-colors">P&L, BS & Ledgers</h3>
            <ArrowRight className="w-4 h-4 text-[#8DA173] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-[#56655A] leading-relaxed">
            Upload Bank Statements and combine with Sales & Purchases to generate automated double-entry P&L, Balance Sheet, and Vendor/Customer Ledgers.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#D9A14E] text-white flex items-center justify-center font-bold shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#1A2E25]">AI Audit & CA Advisory</h3>
          <p className="text-xs text-[#56655A] leading-relaxed">
            In-depth AI analysis of high-risk vendors, place of supply (POS) errors, tax classification conflicts, and structured step-by-step resolution advice.
          </p>
        </div>
      </section>
    </div>
  );
};
