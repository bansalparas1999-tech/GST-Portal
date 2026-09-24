import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Mail,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  Sparkles,
  Filter,
  Search,
  ShieldAlert,
  FileCheck,
  Building,
  Check,
} from 'lucide-react';
import { ReconItem, ReconSummary, Language, ToleranceConfig } from '../types';
import { translations } from '../utils/translations';
import { MonthlyPeriodBar } from './MonthlyPeriodBar';
import { getMonthlyBreakdown } from '../utils/periodUtils';

interface DiscrepancyReportViewProps {
  items: ReconItem[];
  summary: ReconSummary;
  tolerance: ToleranceConfig;
  language: Language;
  selectedFY?: string;
  selectedMonth?: string;
  onSelectMonth?: (m: string) => void;
  onViewItem: (item: ReconItem) => void;
  onOpenNotice: (item: ReconItem) => void;
  onBulkNotice: (items: ReconItem[]) => void;
  onOpenAiAudit: () => void;
}

type GapCategory =
  | 'ALL_DISCREPANCIES'
  | 'MISSING_IN_2B'
  | 'MISSING_IN_BOOKS'
  | 'SIGNIFICANT_DISCREPANCY'
  | 'PARTIAL_MATCH'
  | 'FUZZY_MATCHES';

export const DiscrepancyReportView: React.FC<DiscrepancyReportViewProps> = ({
  items,
  summary,
  tolerance,
  language,
  selectedFY = 'FY 2024-25',
  selectedMonth = 'ALL',
  onSelectMonth = (_m: string) => {},
  onViewItem,
  onOpenNotice,
  onBulkNotice,
  onOpenAiAudit,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<GapCategory>('ALL_DISCREPANCIES');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const monthlyStats = getMonthlyBreakdown(items, selectedFY, selectedMonth);

  const formatRupee = (val?: number) => {
    if (val === undefined || isNaN(val)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Filter items according to the active gap tab and search query
  const filteredItems = useMemo(() => {
    let list = items.filter((item) => item.matchStatus !== 'EXACT_MATCH');

    if (selectedCategory === 'MISSING_IN_2B') {
      list = list.filter((i) => i.matchStatus === 'MISSING_IN_2B');
    } else if (selectedCategory === 'MISSING_IN_BOOKS') {
      list = list.filter(
        (i) => i.matchStatus === 'MISSING_IN_BOOKS' || i.matchStatus === 'INELIGIBLE_ITC'
      );
    } else if (selectedCategory === 'SIGNIFICANT_DISCREPANCY') {
      list = list.filter(
        (i) =>
          i.matchStatus === 'SIGNIFICANT_DISCREPANCY' ||
          i.matchStatus === 'VALUE_MISMATCH' ||
          i.matchStatus === 'HEAD_MISMATCH'
      );
    } else if (selectedCategory === 'PARTIAL_MATCH') {
      list = list.filter((i) => i.matchStatus === 'PARTIAL_MATCH');
    } else if (selectedCategory === 'FUZZY_MATCHES') {
      list = list.filter(
        (i) => i.matchStatus === 'FUZZY_MATCH' || i.matchStatus === 'FUZZY_GSTIN_MATCH'
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.vendorName.toLowerCase().includes(q) ||
          i.gstin.toLowerCase().includes(q) ||
          i.invoiceNumber.toLowerCase().includes(q)
      );
    }

    return list;
  }, [items, selectedCategory, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedItemIds.size === filteredItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItemIds(next);
  };

  const handleTriggerBulkNotice = () => {
    const selectedList = items.filter((i) => selectedItemIds.has(i.id));
    if (selectedList.length > 0) {
      onBulkNotice(selectedList);
    }
  };

  // Export discrepancy report
  const handleExportDiscrepancyReport = () => {
    const headers = [
      'Discrepancy Category',
      'Severity',
      'Invoice Number',
      'Supplier GSTIN',
      'Supplier Name',
      'Invoice Date',
      'Books Tax (ITC)',
      'GSTR-2B Tax (ITC)',
      'Tax Variance',
      'Percentage Variance',
      'Identified Root Cause',
      'Recommended Statutory Action',
    ];

    const rows = filteredItems.map((item) => [
      item.matchStatus,
      item.discrepancy?.severity || 'MEDIUM',
      `"${item.invoiceNumber}"`,
      `"${item.gstin}"`,
      `"${item.vendorName}"`,
      item.booksRecord?.invoiceDate || item.gstr2bRecord?.invoiceDate || '',
      item.booksRecord?.totalTax || 0,
      item.gstr2bRecord?.totalTax || 0,
      item.discrepancy?.taxDiff || 0,
      `${(item.discrepancy?.percentageDiff || 0).toFixed(1)}%`,
      `"${(item.discrepancy?.mismatchedFields || []).join('; ')}"`,
      `"${item.discrepancy?.suggestedAction || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `GST_Discrepancy_Audit_Report_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const missingIn2bItems = items.filter((i) => i.matchStatus === 'MISSING_IN_2B');
  const missingInBooksItems = items.filter((i) => i.matchStatus === 'MISSING_IN_BOOKS');
  const significantDiscrepancyItems = items.filter(
    (i) => i.matchStatus === 'SIGNIFICANT_DISCREPANCY' || i.matchStatus === 'VALUE_MISMATCH'
  );
  const partialMatchItems = items.filter((i) => i.matchStatus === 'PARTIAL_MATCH');
  const fuzzyItems = items.filter(
    (i) => i.matchStatus === 'FUZZY_MATCH' || i.matchStatus === 'FUZZY_GSTIN_MATCH'
  );

  return (
    <div className="w-full max-w-[1750px] mx-auto px-2 sm:px-4 lg:px-6 py-3 space-y-4 pb-12">
      {/* Period Selector Bar */}
      <MonthlyPeriodBar
        selectedFY={selectedFY}
        selectedMonth={selectedMonth}
        onSelectMonth={onSelectMonth}
        monthlyStats={monthlyStats}
        language={language}
        totalPeriodInvoices={items.length}
      />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E0E4DE] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFF8EE] border border-[#D9A14E]/30 flex items-center justify-center text-[#D9A14E]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-[#1A2E25]">
              {language === 'hi'
                ? 'डेटासेट अंतर एवं विसंगति विश्लेषण रिपोर्ट'
                : 'Dataset Gap & Discrepancy Audit Center'}
            </h2>
          </div>
          <p className="text-xs text-[#738276] mt-1">
            Comparative analysis of Purchase Books vs GSTR-2B under Section 16(2)(aa) & Rule 37A.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAiAudit}
            className="px-4 py-2 bg-[#2D4A3E] text-white rounded-xl text-xs font-bold hover:bg-[#1E362C] transition-all flex items-center gap-2 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#8DA173]" />
            <span>AI Risk Audit & Legal Opinion</span>
          </button>
          <button
            onClick={handleExportDiscrepancyReport}
            className="px-4 py-2 bg-white border border-[#E0E4DE] text-[#2D4A3E] rounded-xl text-xs font-bold hover:bg-[#F7F8F6] transition-all flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5 text-[#738276]" />
            <span>Export Audit Sheet</span>
          </button>
        </div>
      </div>

      {/* Dataset Overview Comparative Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Books Total */}
        <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#738276] uppercase tracking-wider">
              Purchase Books (Register)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-[#F7F8F6] text-[#2D4A3E]">
              {summary.totalBookRecords} Invoices
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold font-mono text-[#1A2E25]">
              {formatRupee(summary.totalBookTax)}
            </span>
            <span className="text-[11px] text-[#738276] block mt-0.5">
              Taxable: {formatRupee(summary.totalBookTaxable)}
            </span>
          </div>
        </div>

        {/* GSTR-2B Total */}
        <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#738276] uppercase tracking-wider">
              GSTR-2B (GST Portal)
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-[#F7F8F6] text-[#2D4A3E]">
              {summary.totalGstr2bRecords} Invoices
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold font-mono text-[#1A2E25]">
              {formatRupee(summary.totalGstr2bTax)}
            </span>
            <span className="text-[11px] text-[#738276] block mt-0.5">
              Taxable: {formatRupee(summary.totalGstr2bTaxable)}
            </span>
          </div>
        </div>

        {/* ITC at Risk (Missing in 2B) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs border-l-4 border-l-[#C75D4E]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#C75D4E] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>ITC at Risk (Missing 2B)</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-[#FFF2F0] text-[#C75D4E]">
              {summary.missingIn2bCount}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold font-mono text-[#C75D4E]">
              {formatRupee(summary.missingIn2bTax)}
            </span>
            <span className="text-[11px] text-[#738276] block mt-0.5">
              Blocked from GSTR-3B claim
            </span>
          </div>
        </div>

        {/* Potential Unclaimed ITC (Missing in Books) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs border-l-4 border-l-[#2D4A3E]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2D4A3E] uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Unclaimed ITC (In 2B)</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-mono font-bold bg-[#EDF3EF] text-[#2D4A3E]">
              {summary.missingInBooksCount}
            </span>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold font-mono text-[#2D4A3E]">
              {formatRupee(summary.missingInBooksTax)}
            </span>
            <span className="text-[11px] text-[#738276] block mt-0.5">
              Available to book & claim
            </span>
          </div>
        </div>
      </div>

      {/* Discrepancy Filter Pills & Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('ALL_DISCREPANCIES')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedCategory === 'ALL_DISCREPANCIES'
                  ? 'bg-[#2D4A3E] text-white shadow-xs'
                  : 'bg-[#F7F8F6] text-[#738276] hover:bg-[#E0E4DE]'
              }`}
            >
              <span>All Discrepancies</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 font-mono">
                {items.filter((i) => i.matchStatus !== 'EXACT_MATCH').length}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('MISSING_IN_2B')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedCategory === 'MISSING_IN_2B'
                  ? 'bg-[#C75D4E] text-white shadow-xs'
                  : 'bg-[#FFF2F0] text-[#C75D4E] hover:bg-[#FFE6E2]'
              }`}
            >
              <span>In Books Only (Missing 2B)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 font-mono">
                {missingIn2bItems.length}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('MISSING_IN_BOOKS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedCategory === 'MISSING_IN_BOOKS'
                  ? 'bg-[#2D4A3E] text-white shadow-xs'
                  : 'bg-[#EDF3EF] text-[#2D4A3E] hover:bg-[#DDE8E0]'
              }`}
            >
              <span>In 2B Only (Unclaimed)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 font-mono">
                {missingInBooksItems.length}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('SIGNIFICANT_DISCREPANCY')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedCategory === 'SIGNIFICANT_DISCREPANCY'
                  ? 'bg-[#D9A14E] text-white shadow-xs'
                  : 'bg-[#FFF8EE] text-[#D9A14E] hover:bg-[#FEEFD9]'
              }`}
            >
              <span>Value Discrepancies</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 font-mono">
                {significantDiscrepancyItems.length}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('PARTIAL_MATCH')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedCategory === 'PARTIAL_MATCH'
                  ? 'bg-[#8DA173] text-white shadow-xs'
                  : 'bg-[#F2F6ED] text-[#5C7243] hover:bg-[#E3ECD9]'
              }`}
            >
              <span>Partial / Rounding</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 font-mono">
                {partialMatchItems.length}
              </span>
            </button>

            <button
              onClick={() => setSelectedCategory('FUZZY_MATCHES')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                selectedCategory === 'FUZZY_MATCHES'
                  ? 'bg-[#6366F1] text-white shadow-xs'
                  : 'bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF]'
              }`}
            >
              <span>Fuzzy Typos (GSTIN/Inv)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 font-mono">
                {fuzzyItems.length}
              </span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-[#738276] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vendor, GSTIN, invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#F7F8F6] border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
            />
          </div>
        </div>

        {/* Bulk Action Strip if items selected */}
        {selectedItemIds.size > 0 && (
          <div className="flex items-center justify-between bg-[#F7F8F6] p-3 rounded-xl border border-[#E0E4DE] animate-in fade-in duration-150">
            <span className="text-xs font-bold text-[#2D4A3E]">
              {selectedItemIds.size} invoices selected for action
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTriggerBulkNotice}
                className="px-3.5 py-1.5 bg-[#C75D4E] text-white rounded-lg text-xs font-bold hover:bg-[#B34B3D] transition-colors flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Send Bulk Legal Notice (Sec 16)</span>
              </button>
              <button
                onClick={() => setSelectedItemIds(new Set())}
                className="px-3 py-1.5 bg-white border border-[#E0E4DE] text-xs font-semibold text-[#738276] rounded-lg hover:bg-[#E0E4DE]"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Comparative Discrepancy Table */}
      <div className="bg-white rounded-2xl border border-[#E0E4DE] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E0E4DE] text-[11px] text-[#738276] uppercase tracking-wider bg-[#F7F8F6]">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredItems.length > 0 &&
                      selectedItemIds.size === filteredItems.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded text-[#8DA173] focus:ring-[#8DA173]"
                  />
                </th>
                <th className="py-3 px-4 font-bold text-[#2D4A3E]">Discrepancy Category</th>
                <th className="py-3 px-4 font-bold text-[#2D4A3E]">Invoice & Supplier Details</th>
                <th className="py-3 px-4 font-bold text-right text-[#2D4A3E]">Books ITC</th>
                <th className="py-3 px-4 font-bold text-right text-[#2D4A3E]">GSTR-2B ITC</th>
                <th className="py-3 px-4 font-bold text-right text-[#2D4A3E]">Tax Gap (Variance)</th>
                <th className="py-3 px-4 font-bold text-[#2D4A3E]">Recommended Statutory Action</th>
                <th className="py-3 px-4 font-bold text-center text-[#2D4A3E]">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#F1F3EE]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#738276]">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-[#8DA173] mb-2" />
                    <p className="font-bold text-[#2D4A3E]">
                      No discrepancies found for the selected category!
                    </p>
                    <p className="text-[11px] mt-0.5">
                      All records in this view are 100% matched within active tolerances.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedItemIds.has(item.id);
                  const isMiss2B = item.matchStatus === 'MISSING_IN_2B';
                  const isMissBooks = item.matchStatus === 'MISSING_IN_BOOKS';
                  const isPartial = item.matchStatus === 'PARTIAL_MATCH';
                  const isFuzzy =
                    item.matchStatus === 'FUZZY_MATCH' || item.matchStatus === 'FUZZY_GSTIN_MATCH';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#FDFDFC] transition-colors ${
                        isSelected ? 'bg-[#F4F7F2]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                          className="rounded text-[#8DA173] focus:ring-[#8DA173]"
                        />
                      </td>

                      {/* Status & Severity */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isMiss2B
                                ? 'bg-[#FFF2F0] text-[#C75D4E]'
                                : isMissBooks
                                ? 'bg-[#EDF3EF] text-[#2D4A3E]'
                                : isPartial
                                ? 'bg-[#F2F6ED] text-[#5C7243]'
                                : isFuzzy
                                ? 'bg-[#EEF2FF] text-[#4F46E5]'
                                : 'bg-[#FFF8EE] text-[#D9A14E]'
                            }`}
                          >
                            {item.matchStatus.replace(/_/g, ' ')}
                          </span>
                          {item.discrepancy?.severity && (
                            <span
                              className={`block text-[10px] font-bold ${
                                item.discrepancy.severity === 'HIGH'
                                  ? 'text-[#C75D4E]'
                                  : item.discrepancy.severity === 'MEDIUM'
                                  ? 'text-[#D9A14E]'
                                  : 'text-[#8DA173]'
                              }`}
                            >
                              Severity: {item.discrepancy.severity}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vendor & Invoice Info */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#2D362E]">{item.vendorName}</div>
                        <div className="text-[11px] font-mono text-[#738276] flex items-center gap-2 mt-0.5">
                          <span>{item.gstin}</span>
                          <span>•</span>
                          <span className="font-bold text-[#2D4A3E]">{item.invoiceNumber}</span>
                        </div>
                        {item.discrepancy?.mismatchedFields &&
                          item.discrepancy.mismatchedFields.length > 0 && (
                            <div className="text-[10px] text-[#C75D4E] mt-1">
                              {item.discrepancy.mismatchedFields[0]}
                            </div>
                          )}
                      </td>

                      {/* Books ITC */}
                      <td className="py-3 px-4 text-right font-mono">
                        {item.booksRecord ? (
                          <>
                            <div className="font-bold text-[#2D362E]">
                              {formatRupee(item.booksRecord.totalTax)}
                            </div>
                            <div className="text-[10px] text-[#738276]">
                              Taxable: {formatRupee(item.booksRecord.taxableValue)}
                            </div>
                          </>
                        ) : (
                          <span className="text-[#C75D4E] italic font-semibold">Not in Books</span>
                        )}
                      </td>

                      {/* GSTR-2B ITC */}
                      <td className="py-3 px-4 text-right font-mono">
                        {item.gstr2bRecord ? (
                          <>
                            <div className="font-bold text-[#2D362E]">
                              {formatRupee(item.gstr2bRecord.totalTax)}
                            </div>
                            <div className="text-[10px] text-[#738276]">
                              Taxable: {formatRupee(item.gstr2bRecord.taxableValue)}
                            </div>
                          </>
                        ) : (
                          <span className="text-[#C75D4E] italic font-semibold">Not in 2B</span>
                        )}
                      </td>

                      {/* Tax Gap / Variance */}
                      <td className="py-3 px-4 text-right font-mono">
                        {item.discrepancy?.taxDiff !== undefined ? (
                          <div
                            className={`font-bold ${
                              Math.abs(item.discrepancy.taxDiff) > 100
                                ? 'text-[#C75D4E]'
                                : Math.abs(item.discrepancy.taxDiff) > 0
                                ? 'text-[#D9A14E]'
                                : 'text-[#8DA173]'
                            }`}
                          >
                            {item.discrepancy.taxDiff > 0 ? '+' : ''}
                            {formatRupee(item.discrepancy.taxDiff)}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Suggested Action & Legal Note */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="text-[11px] font-medium text-[#2D4A3E]">
                          {item.discrepancy?.suggestedAction || 'Review invoice particulars.'}
                        </div>
                        {item.discrepancy?.statutoryReference && (
                          <div className="text-[10px] text-[#738276] mt-0.5 italic">
                            Ref: {item.discrepancy.statutoryReference}
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onViewItem(item)}
                            title="Side-by-Side View"
                            className="p-1.5 text-[#738276] hover:text-[#2D4A3E] rounded-lg hover:bg-[#E0E4DE] transition-colors"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          {(isMiss2B || item.matchStatus === 'SIGNIFICANT_DISCREPANCY') && (
                            <button
                              onClick={() => onOpenNotice(item)}
                              title="Send Supplier Notice"
                              className="p-1.5 text-[#C75D4E] hover:text-white rounded-lg hover:bg-[#C75D4E] transition-colors"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
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
    </div>
  );
};
