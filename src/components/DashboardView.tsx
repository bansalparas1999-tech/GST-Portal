import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  HelpCircle,
  TrendingDown,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Mail,
  Eye,
  Info,
  Calendar,
  Layers,
  BarChart3,
} from 'lucide-react';
import { ReconSummary, ReconItem, Language } from '../types';
import { translations } from '../utils/translations';
import { MonthlyPeriodBar } from './MonthlyPeriodBar';
import { getMonthlyBreakdown, getMonthLabel, MonthlyStats } from '../utils/periodUtils';

interface DashboardViewProps {
  summary: ReconSummary;
  items: ReconItem[];
  language: Language;
  selectedFY?: string;
  selectedMonth?: string;
  onSelectMonth?: (month: string) => void;
  onSelectFilter: (status: string) => void;
  onViewItem: (item: ReconItem) => void;
  onOpenNotice: (item: ReconItem) => void;
  onOpenAiAudit: () => void;
  onOpenUpload: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  items,
  language,
  selectedFY = 'FY 2024-25',
  selectedMonth = 'ALL',
  onSelectMonth = (_month: string) => {},
  onSelectFilter,
  onViewItem,
  onOpenNotice,
  onOpenAiAudit,
  onOpenUpload,
}) => {
  const t = translations[language];

  const formatRupee = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const monthlyStats: MonthlyStats[] = getMonthlyBreakdown(items, selectedFY, selectedMonth);

  const mismatches = items.filter(
    (i) =>
      i.matchStatus === 'MISSING_IN_2B' ||
      i.matchStatus === 'VALUE_MISMATCH' ||
      i.matchStatus === 'HEAD_MISMATCH' ||
      i.matchStatus === 'FUZZY_MATCH' ||
      i.matchStatus === 'FUZZY_GSTIN_MATCH' ||
      i.matchStatus === 'PARTIAL_MATCH' ||
      i.matchStatus === 'SIGNIFICANT_DISCREPANCY'
  );

  const netEligibleItc = summary.matchedTax + summary.fuzzyMatchedTax + summary.partialMatchTax;
  const matchPercentage =
    summary.totalBookRecords > 0
      ? Math.round(
          ((summary.matchedCount + summary.fuzzyMatchedCount + summary.partialMatchCount) /
            summary.totalBookRecords) *
            100
        )
      : 0;

  return (
    <div id="dashboard-view-container" className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1440px] mx-auto pb-16">
      {/* Month & Financial Year Interactive Strip */}
      <MonthlyPeriodBar
        selectedFY={selectedFY}
        selectedMonth={selectedMonth}
        onSelectMonth={onSelectMonth}
        monthlyStats={monthlyStats}
        language={language}
        totalPeriodInvoices={items.length}
      />

      {/* Risk Alert Banner under Sec 16(2)(aa) */}
      {summary.missingIn2bCount > 0 && (
        <div className="bg-[#FFF8EE] border border-[#D9A14E]/40 rounded-xl p-4 flex items-start justify-between shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#D9A14E]/15 rounded-lg text-[#D9A14E] shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1A2E25]">
                {language === 'hi' ? 'ITC जोखिम चेतावनी (CGST धारा 16(2)(aa))' : 'ITC Compliance Risk Warning — CGST Section 16(2)(aa)'}
              </h4>
              <p className="text-xs text-[#738276] mt-0.5">
                {language === 'hi'
                  ? `आपकी बुक्स में ₹${formatRupee(summary.missingIn2bTax)} का ITC दर्ज है जो सप्लायर्स द्वारा GSTR-1 में अपलोड नहीं किया गया। GSTR-3B में इसे क्लेम करने पर 18% ब्याज सहित रिकवरी नोटिस आ सकता है।`
                  : `You have ₹${formatRupee(summary.missingIn2bTax)} of Input Tax Credit in Books which is NOT reflected in GSTR-2B. Claiming this in GSTR-3B invites recovery notices with 18% interest.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              id="btn-notify-all-vendors"
              onClick={onOpenAiAudit}
              className="px-3 py-1.5 bg-[#2D4A3E] text-white rounded-lg text-xs font-semibold hover:bg-[#233B31] transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>{language === 'hi' ? 'AI ऑडिट विश्लेषण' : 'CA Risk Audit'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Top 3 Core Metrics Grid (Natural Tones with Accent Bars) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Fully Matched */}
        <div
          id="card-fully-matched"
          onClick={() => onSelectFilter('EXACT_MATCH')}
          className="bg-white p-5 rounded-xl border border-[#E0E4DE] shadow-xs hover:border-[#8DA173] hover:shadow-sm transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="flex justify-between items-start">
            <p className="text-[#738276] text-xs font-semibold uppercase tracking-wider">
              {t.fullyMatchedTitle}
            </p>
            <div className="w-6 h-6 rounded-full bg-[#EBF2E4] text-[#8DA173] flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-2 text-[#2D4A3E]">
            {formatRupee(summary.matchedTax)}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="bg-[#EBF2E4] text-[#2D4A3E] px-2.5 py-0.5 rounded font-bold">
              {summary.matchedCount} Invoices Matched
            </span>
            <span className="text-[#738276] font-medium">
              Taxable: {formatRupee(summary.matchedTaxable)}
            </span>
          </div>
        </div>

        {/* 2. Amount / Tax Mismatched */}
        <div
          id="card-amount-mismatch"
          onClick={() => onSelectFilter('VALUE_MISMATCH')}
          className="bg-white p-5 rounded-xl border border-[#E0E4DE] shadow-xs hover:border-[#D9A14E] hover:shadow-sm transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 h-full w-1.5 bg-[#D9A14E]"></div>
          <div className="flex justify-between items-start">
            <p className="text-[#738276] text-xs font-semibold uppercase tracking-wider">
              {t.taxMismatchedTitle}
            </p>
            <div className="w-6 h-6 rounded-full bg-[#FFF8EE] text-[#D9A14E] flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-2 text-[#D9A14E]">
            {formatRupee(summary.mismatchTaxDiff + summary.significantDiscrepancyTaxDiff)}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="bg-[#FFF8EE] text-[#D9A14E] px-2.5 py-0.5 rounded font-bold">
              {summary.mismatchCount + summary.significantDiscrepancyCount} Value Variances
            </span>
            <span className="text-[#738276] font-medium">
              Rate / POS / Rounding
            </span>
          </div>
        </div>

        {/* 3. Missing in GSTR-2B (In Books Only - High Risk) */}
        <div
          id="card-missing-2b"
          onClick={() => onSelectFilter('MISSING_IN_2B')}
          className="bg-white p-5 rounded-xl border border-[#E0E4DE] shadow-xs hover:border-[#C75D4E] hover:shadow-sm transition-all cursor-pointer relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 h-full w-1.5 bg-[#C75D4E]"></div>
          <div className="flex justify-between items-start">
            <p className="text-[#738276] text-xs font-semibold uppercase tracking-wider">
              {t.missingIn2bTitle} (Sec 16(2)(aa) Risk)
            </p>
            <div className="w-6 h-6 rounded-full bg-[#FCF0EE] text-[#C75D4E] flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-3xl font-bold mt-2 text-[#C75D4E]">
            {formatRupee(summary.missingIn2bTax)}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="bg-[#FCF0EE] text-[#C75D4E] px-2.5 py-0.5 rounded font-bold">
              {summary.missingIn2bCount} Invoices Missing in 2B
            </span>
            <span className="text-[#738276] font-medium">
              Taxable: {formatRupee(summary.missingIn2bTaxable)}
            </span>
          </div>
        </div>
      </section>

      {/* Secondary Metrics Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Missing in Books (Unclaimed) */}
        <div
          onClick={() => onSelectFilter('MISSING_IN_BOOKS')}
          className="bg-white p-4 rounded-xl border border-[#E0E4DE] shadow-xs cursor-pointer hover:border-[#2D5A88] transition-all"
        >
          <div className="flex items-center justify-between text-xs text-[#738276]">
            <span>Missing in Books (Unclaimed)</span>
            <FileQuestion className="w-4 h-4 text-[#2D5A88]" />
          </div>
          <p className="text-xl font-bold text-[#2D5A88] mt-1">
            {formatRupee(summary.missingInBooksTax)}
          </p>
          <p className="text-[11px] text-[#738276] mt-1">
            {summary.missingInBooksCount} Invoices in 2B only
          </p>
        </div>

        {/* Fuzzy Matched */}
        <div
          onClick={() => onSelectFilter('FUZZY_MATCH')}
          className="bg-white p-4 rounded-xl border border-[#E0E4DE] shadow-xs cursor-pointer hover:border-[#8DA173] transition-all"
        >
          <div className="flex items-center justify-between text-xs text-[#738276]">
            <span>Fuzzy Auto-Matched</span>
            <Sparkles className="w-4 h-4 text-[#8DA173]" />
          </div>
          <p className="text-xl font-bold text-[#2D4A3E] mt-1">
            {formatRupee(summary.fuzzyMatchedTax)}
          </p>
          <p className="text-[11px] text-[#738276] mt-1">
            {summary.fuzzyMatchedCount + summary.fuzzyGstinCount} Resolved by Rules
          </p>
        </div>

        {/* Partial & Rounding Matched */}
        <div
          onClick={() => onSelectFilter('PARTIAL_MATCH')}
          className="bg-white p-4 rounded-xl border border-[#E0E4DE] shadow-xs cursor-pointer hover:border-[#8DA173] transition-all"
        >
          <div className="flex items-center justify-between text-xs text-[#738276]">
            <span>Partial / Rounding Matched</span>
            <CheckCircle2 className="w-4 h-4 text-[#5C7243]" />
          </div>
          <p className="text-xl font-bold text-[#5C7243] mt-1">
            {formatRupee(summary.partialMatchTax)}
          </p>
          <p className="text-[11px] text-[#738276] mt-1">
            {summary.partialMatchCount} within tolerance
          </p>
        </div>

        {/* Section 17(5) Ineligible */}
        <div
          onClick={() => onSelectFilter('INELIGIBLE_ITC')}
          className="bg-white p-4 rounded-xl border border-[#E0E4DE] shadow-xs cursor-pointer hover:border-[#738276] transition-all"
        >
          <div className="flex items-center justify-between text-xs text-[#738276]">
            <span>Ineligible ITC (Sec 17(5))</span>
            <Info className="w-4 h-4 text-[#738276]" />
          </div>
          <p className="text-xl font-bold text-[#738276] mt-1">
            {formatRupee(summary.ineligibleTax)}
          </p>
          <p className="text-[11px] text-[#738276] mt-1">
            {summary.ineligibleCount} Blocked Credits
          </p>
        </div>
      </section>

      {/* Month-Wise GST Input Tax Credit Trend & Distribution Table */}
      <div className="bg-white rounded-2xl border border-[#E0E4DE] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#F1F3EE] flex items-center justify-between bg-[#FDFDFC]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#EDF3EF] rounded-lg text-[#2D4A3E]">
              <BarChart3 className="w-4 h-4 text-[#8DA173]" />
            </div>
            <div>
              <h3 className="font-bold text-[#2D4A3E] text-sm">
                {language === 'hi' ? 'मासिक ITC विश्लेषण एवं फाइलिंग स्थिति' : 'Fiscal Month-by-Month Reconciliation Breakdown'}
              </h3>
              <p className="text-xs text-[#738276]">
                Comparison across all 12 fiscal months of {selectedFY} (April to March)
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold text-[#8DA173] bg-[#EBF2E4] px-2.5 py-1 rounded-md">
            Active: {getMonthLabel(selectedMonth)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#F7F8F6] text-[#738276] uppercase text-[10px] tracking-wider font-semibold border-b border-[#E0E4DE]">
              <tr>
                <th className="px-5 py-3">Tax Period / Month</th>
                <th className="px-5 py-3 text-center">Total Invoices</th>
                <th className="px-5 py-3 text-center">Books Count</th>
                <th className="px-5 py-3 text-center">GSTR-2B Count</th>
                <th className="px-5 py-3 text-center">Matched Invoices</th>
                <th className="px-5 py-3 text-right">Eligible Tax (ITC)</th>
                <th className="px-5 py-3 text-right">ITC At Risk (Missing 2B)</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F3EE]">
              {monthlyStats.map((st) => {
                const isSelected = selectedMonth === st.monthKey;
                return (
                  <tr
                    key={st.monthKey}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-[#EDF3EF]/60 font-semibold'
                        : 'hover:bg-[#FAFBF9]'
                    }`}
                  >
                    <td className="px-5 py-3 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 text-[10px] font-mono bg-[#E8ECE6] text-[#2D4A3E] rounded font-bold">
                        {st.quarter}
                      </span>
                      <span className="text-xs font-bold text-[#1A2E25]">
                        {st.monthLabel}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] bg-[#2D4A3E] text-white px-1.5 py-0.2 rounded font-bold">
                          Selected
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center font-mono">{st.totalInvoices}</td>
                    <td className="px-5 py-3 text-center font-mono">{st.booksCount}</td>
                    <td className="px-5 py-3 text-center font-mono">{st.gstr2bCount}</td>
                    <td className="px-5 py-3 text-center font-mono text-[#2D4A3E] font-bold">
                      {st.matchedCount}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-[#2D4A3E] font-semibold">
                      {formatRupee(st.matchedTax)}
                    </td>
                    <td className="px-5 py-3 text-right font-mono font-semibold">
                      {st.itcAtRisk > 0 ? (
                        <span className="text-[#C75D4E]">{formatRupee(st.itcAtRisk)}</span>
                      ) : (
                        <span className="text-[#738276]">₹0</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => onSelectMonth(st.monthKey)}
                        className="px-2.5 py-1 text-[11px] font-bold bg-[#F1F3EE] hover:bg-[#2D4A3E] hover:text-white rounded-md transition-all text-[#2D4A3E]"
                      >
                        Filter Month
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reconciliation Progress Meter */}
      <div className="bg-white p-6 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[#1A2E25] text-sm">
              Input Tax Credit (ITC) Compliance & Reconciliation Progress
            </h3>
            <p className="text-xs text-[#738276] mt-0.5">
              {matchPercentage}% of Book Invoices successfully reconciled with GSTR-2B.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-[#2D4A3E]">{matchPercentage}%</span>
            <span className="text-xs text-[#738276] ml-1">Overall Match</span>
          </div>
        </div>

        {/* Multi-Segment Stacked Progress Bar */}
        <div className="space-y-2">
          <div className="h-3 w-full bg-[#EBF2E4] rounded-full overflow-hidden flex">
            {/* Matched */}
            <div
              className="bg-[#2D4A3E] transition-all"
              style={{
                width: `${
                  summary.totalBookRecords > 0
                    ? (summary.matchedCount / summary.totalBookRecords) * 100
                    : 0
                }%`,
              }}
              title="Exact Matched"
            ></div>
            {/* Fuzzy / Partial */}
            <div
              className="bg-[#8DA173] transition-all"
              style={{
                width: `${
                  summary.totalBookRecords > 0
                    ? ((summary.fuzzyMatchedCount + summary.partialMatchCount) /
                        summary.totalBookRecords) *
                      100
                    : 0
                }%`,
              }}
              title="Fuzzy / Partial"
            ></div>
            {/* Mismatch */}
            <div
              className="bg-[#D9A14E] transition-all"
              style={{
                width: `${
                  summary.totalBookRecords > 0
                    ? (summary.mismatchCount / summary.totalBookRecords) * 100
                    : 0
                }%`,
              }}
              title="Mismatch"
            ></div>
            {/* Missing in 2B */}
            <div
              className="bg-[#C75D4E] transition-all"
              style={{
                width: `${
                  summary.totalBookRecords > 0
                    ? (summary.missingIn2bCount / summary.totalBookRecords) * 100
                    : 0
                }%`,
              }}
              title="Missing in 2B"
            ></div>
          </div>
        </div>
      </div>

      {/* Discrepancy & Action Required Stream */}
      <div className="bg-white rounded-2xl border border-[#E0E4DE] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#F1F3EE] flex items-center justify-between bg-[#FDFDFC]">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-[#2D4A3E] text-sm">
              {language === 'hi' ? 'कार्रवाई योग्य विसंगतियाँ (Actionable Discrepancies)' : 'Discrepancies Requiring Follow-up'}
            </h3>
            <span className="text-xs bg-[#FFF8EE] text-[#D9A14E] px-2 py-0.5 rounded font-bold border border-[#D9A14E]/30">
              {mismatches.length} Items
            </span>
          </div>
          <button
            onClick={() => onSelectFilter('MISSING_IN_2B')}
            className="text-xs font-semibold text-[#8DA173] hover:text-[#7A8E61] flex items-center gap-1"
          >
            <span>{language === 'hi' ? 'सभी देखें' : 'View Full Table'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F7F8F6] text-[#738276] text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 font-semibold">{t.invDate}</th>
                <th className="px-6 py-3 font-semibold">{t.invNumber}</th>
                <th className="px-6 py-3 font-semibold">{t.supplierGstin}</th>
                <th className="px-6 py-3 font-semibold">{t.booksAmount}</th>
                <th className="px-6 py-3 font-semibold">{t.gstr2bAmount}</th>
                <th className="px-6 py-3 font-semibold">{t.matchStatus}</th>
                <th className="px-6 py-3 font-semibold text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[#F1F3EE]">
              {mismatches.slice(0, 5).map((item) => {
                const isMiss2B = item.matchStatus === 'MISSING_IN_2B';
                const isMissBooks = item.matchStatus === 'MISSING_IN_BOOKS';
                const isMismatch = item.matchStatus === 'VALUE_MISMATCH' || item.matchStatus === 'HEAD_MISMATCH';
                const isFuzzy = item.matchStatus === 'FUZZY_MATCH';

                return (
                  <tr key={item.id} className="hover:bg-[#FDFDFC] transition-colors">
                    <td className="px-6 py-4 text-xs font-mono text-[#738276]">
                      {item.booksRecord?.invoiceDate || item.gstr2bRecord?.invoiceDate || '—'}
                    </td>
                    <td className="px-6 py-4 font-mono font-medium text-xs text-[#2D362E]">
                      {item.invoiceNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-xs text-[#2D362E] truncate max-w-[200px]">
                        {item.vendorName}
                      </div>
                      <div className="text-[10px] text-[#738276] font-mono">
                        {item.gstin}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {item.booksRecord ? (
                        <div>
                          <div className="font-semibold text-[#2D362E]">
                            {formatRupee(item.booksRecord.invoiceValue)}
                          </div>
                          <div className="text-[10px] text-[#738276]">
                            Tax: {formatRupee(item.booksRecord.totalTax)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#C75D4E] font-medium">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {item.gstr2bRecord ? (
                        <div>
                          <div
                            className={`font-semibold ${
                              isMismatch ? 'text-[#D9A14E]' : 'text-[#2D362E]'
                            }`}
                          >
                            {formatRupee(item.gstr2bRecord.invoiceValue)}
                          </div>
                          <div className="text-[10px] text-[#738276]">
                            Tax: {formatRupee(item.gstr2bRecord.totalTax)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#C75D4E] font-medium">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {isMiss2B && (
                        <span className="px-2.5 py-1 bg-[#FCF0EE] text-[#C75D4E] text-[10px] font-bold rounded uppercase tracking-wide">
                          Missing in 2B
                        </span>
                      )}
                      {isMissBooks && (
                        <span className="px-2.5 py-1 bg-[#EDF3F8] text-[#2D5A88] text-[10px] font-bold rounded uppercase tracking-wide">
                          Missing in Books
                        </span>
                      )}
                      {isMismatch && (
                        <span className="px-2.5 py-1 bg-[#FFF8EE] text-[#D9A14E] text-[10px] font-bold rounded uppercase tracking-wide">
                          {item.matchStatus === 'HEAD_MISMATCH' ? 'Head Mismatch' : 'Amount Diff'}
                        </span>
                      )}
                      {isFuzzy && (
                        <span className="px-2.5 py-1 bg-[#EBF2E4] text-[#2D4A3E] text-[10px] font-bold rounded uppercase tracking-wide">
                          Fuzzy Matched
                        </span>
                      )}
                      {item.matchStatus === 'FUZZY_GSTIN_MATCH' && (
                        <span className="px-2.5 py-1 bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-bold rounded uppercase tracking-wide">
                          Fuzzy GSTIN
                        </span>
                      )}
                      {item.matchStatus === 'PARTIAL_MATCH' && (
                        <span className="px-2.5 py-1 bg-[#F2F6ED] text-[#5C7243] text-[10px] font-bold rounded uppercase tracking-wide">
                          Partial / Rounding
                        </span>
                      )}
                      {item.matchStatus === 'SIGNIFICANT_DISCREPANCY' && (
                        <span className="px-2.5 py-1 bg-[#FFF2F0] text-[#C75D4E] text-[10px] font-bold rounded uppercase tracking-wide">
                          Significant Diff
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`btn-view-${item.id}`}
                          onClick={() => onViewItem(item)}
                          className="p-1.5 text-[#738276] hover:text-[#2D4A3E] hover:bg-[#F1F3EE] rounded transition-colors"
                          title="Side-by-Side Comparison"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(isMiss2B || isMismatch) && (
                          <button
                            id={`btn-notify-${item.id}`}
                            onClick={() => onOpenNotice(item)}
                            className="p-1.5 text-[#D9A14E] hover:text-white hover:bg-[#D9A14E] rounded transition-colors"
                            title="Generate Supplier Notice"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
