import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Mail,
  CheckCircle2,
  AlertTriangle,
  FileQuestion,
  HelpCircle,
  TrendingDown,
  ArrowUpDown,
  Download,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  Sliders,
  Database,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlignJustify,
  List,
} from 'lucide-react';
import { ReconItem, ReconMatchStatus, Language } from '../types';
import { translations } from '../utils/translations';
import { MonthlyPeriodBar } from './MonthlyPeriodBar';
import { getMonthlyBreakdown } from '../utils/periodUtils';

interface ReconTableViewProps {
  items: ReconItem[];
  language: Language;
  initialFilterStatus?: string;
  selectedFY?: string;
  selectedMonth?: string;
  onSelectMonth?: (m: string) => void;
  onViewItem: (item: ReconItem) => void;
  onOpenNotice: (item: ReconItem) => void;
  onBulkNotice: (items: ReconItem[]) => void;
  onManualMatch: (item: ReconItem) => void;
  onOpenManualRecon?: () => void;
  onOpenManageRegisters?: () => void;
  onDeleteRecordSingular?: (id: string, source: 'books' | 'gstr2b') => void;
  onDeleteRecordsBatch?: (ids: string[], source: 'books' | 'gstr2b') => void;
  title: string;
  isSalesRecon?: boolean;
}

export const ReconTableView: React.FC<ReconTableViewProps> = ({
  items,
  language,
  initialFilterStatus = 'ALL',
  selectedFY = 'FY 2024-25',
  selectedMonth = 'ALL',
  onSelectMonth = (_m: string) => {},
  onViewItem,
  onOpenNotice,
  onBulkNotice,
  onManualMatch,
  onOpenManualRecon,
  onOpenManageRegisters,
  onDeleteRecordSingular,
  onDeleteRecordsBatch,
  title,
  isSalesRecon = false,
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilterStatus);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'diff'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState<number | 'ALL'>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDenseView, setIsDenseView] = useState(false);

  // Reset current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, items.length, selectedFY, selectedMonth]);

  const monthlyStats = getMonthlyBreakdown(items, selectedFY, selectedMonth);

  const formatRupee = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Status Filter Tabs
  const statusTabs = [
    { id: 'ALL', label: t.allStatuses, count: items.length },
    {
      id: 'EXACT_MATCH',
      label: t.exactMatch,
      count: items.filter((i) => i.matchStatus === 'EXACT_MATCH').length,
      color: 'text-[#2D4A3E]',
    },
    {
      id: 'FUZZY_MATCH',
      label: t.fuzzyMatch,
      count: items.filter((i) => i.matchStatus === 'FUZZY_MATCH' || i.matchStatus === 'FUZZY_GSTIN_MATCH').length,
      color: 'text-[#8DA173]',
    },
    {
      id: 'PARTIAL_MATCH',
      label: 'Partial Match',
      count: items.filter((i) => i.matchStatus === 'PARTIAL_MATCH').length,
      color: 'text-[#5C7243]',
    },
    {
      id: 'VALUE_MISMATCH',
      label: t.valueMismatch,
      count: items.filter((i) => i.matchStatus === 'VALUE_MISMATCH' || i.matchStatus === 'HEAD_MISMATCH' || i.matchStatus === 'SIGNIFICANT_DISCREPANCY').length,
      color: 'text-[#D9A14E]',
    },
    {
      id: 'MISSING_IN_2B',
      label: isSalesRecon ? 'Missing in GSTR-1' : t.missingIn2B,
      count: items.filter((i) => i.matchStatus === 'MISSING_IN_2B').length,
      color: 'text-[#C75D4E]',
    },
    {
      id: 'MISSING_IN_BOOKS',
      label: isSalesRecon ? 'Missing in Sales Register' : t.missingInBooks,
      count: items.filter((i) => i.matchStatus === 'MISSING_IN_BOOKS').length,
      color: 'text-[#2D5A88]',
    },
    ...(isSalesRecon
      ? []
      : [
          {
            id: 'INELIGIBLE_ITC',
            label: t.ineligibleItc,
            count: items.filter((i) => i.matchStatus === 'INELIGIBLE_ITC').length,
            color: 'text-[#8E6E53]',
          },
        ]),
  ];

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // Status Filter
        if (statusFilter === 'VALUE_MISMATCH') {
          if (
            item.matchStatus !== 'VALUE_MISMATCH' &&
            item.matchStatus !== 'HEAD_MISMATCH' &&
            item.matchStatus !== 'SIGNIFICANT_DISCREPANCY'
          )
            return false;
        } else if (statusFilter === 'FUZZY_MATCH') {
          if (item.matchStatus !== 'FUZZY_MATCH' && item.matchStatus !== 'FUZZY_GSTIN_MATCH')
            return false;
        } else if (statusFilter !== 'ALL' && item.matchStatus !== statusFilter) {
          return false;
        }

        // Search Query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const vendor = (item.vendorName || '').toLowerCase();
        const gstin = (item.gstin || '').toLowerCase();
        const inv = (item.invoiceNumber || '').toLowerCase();
        const notes = (item.notes || '').toLowerCase();
        return vendor.includes(q) || gstin.includes(q) || inv.includes(q) || notes.includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          const dateA = a.booksRecord?.invoiceDate || a.gstr2bRecord?.invoiceDate || '';
          const dateB = b.booksRecord?.invoiceDate || b.gstr2bRecord?.invoiceDate || '';
          return sortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
        }
        if (sortBy === 'amount') {
          const amtA = a.booksRecord?.invoiceValue || a.gstr2bRecord?.invoiceValue || 0;
          const amtB = b.booksRecord?.invoiceValue || b.gstr2bRecord?.invoiceValue || 0;
          return sortOrder === 'asc' ? amtA - amtB : amtB - amtA;
        }
        if (sortBy === 'diff') {
          const diffA = Math.abs(a.discrepancy?.totalDiff || 0);
          const diffB = Math.abs(b.discrepancy?.totalDiff || 0);
          return sortOrder === 'asc' ? diffA - diffB : diffB - diffA;
        }
        return 0;
      });
  }, [items, statusFilter, searchQuery, sortBy, sortOrder]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectedItemsList = filteredItems.filter((i) => selectedIds.has(i.id));

  // Pagination calculation
  const totalPages = pageSize === 'ALL' ? 1 : Math.max(1, Math.ceil(filteredItems.length / (typeof pageSize === 'number' ? pageSize : 25)));
  const displayItems = useMemo(() => {
    if (pageSize === 'ALL') return filteredItems;
    const size = typeof pageSize === 'number' ? pageSize : 25;
    const start = (currentPage - 1) * size;
    return filteredItems.slice(start, start + size);
  }, [filteredItems, currentPage, pageSize]);

  const startIndex = pageSize === 'ALL' ? 0 : (currentPage - 1) * (typeof pageSize === 'number' ? pageSize : 25);
  const endIndex = pageSize === 'ALL' ? filteredItems.length : Math.min(filteredItems.length, startIndex + (typeof pageSize === 'number' ? pageSize : 25));

  return (
    <div id="recon-table-view" className="w-full max-w-[1750px] mx-auto px-2 sm:px-4 lg:px-6 py-3 space-y-3 pb-12">
      {/* Monthly Period Management Bar */}
      <MonthlyPeriodBar
        selectedFY={selectedFY}
        selectedMonth={selectedMonth}
        onSelectMonth={onSelectMonth}
        monthlyStats={monthlyStats}
        language={language}
        totalPeriodInvoices={items.length}
      />

      {/* Sticky Filter & Search Control Toolbar */}
      <div className="sticky top-0 z-20 bg-[#F7F8F6]/95 backdrop-blur-xs pt-1 pb-2 space-y-2 border-b border-[#E0E4DE]">
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-[#1A2E25] tracking-tight">{title}</h3>
            <p className="text-xs text-[#738276]">
              {language === 'hi'
                ? 'प्रत्येक इनवॉइस का विस्तृत मिलान, विसंगति विश्लेषण और सप्लायर फॉलोअप'
                : 'Detailed invoice reconciliation, discrepancy audit trail, and legal compliance checks.'}
            </p>
          </div>

          {/* Search, Action Buttons & Density Toggle */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#738276] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="recon-search-input"
                type="text"
                placeholder="Search Vendor, GSTIN, Inv..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-white border border-[#E0E4DE] pl-8 pr-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8DA173] w-48 sm:w-56 shadow-2xs text-[#2D362E]"
              />
            </div>

            {/* Density Toggle (Comfortable vs Dense Ledger) */}
            <button
              type="button"
              id="btn-toggle-density"
              onClick={() => setIsDenseView(!isDenseView)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                isDenseView
                  ? 'bg-[#2D4A3E] text-white border-[#2D4A3E]'
                  : 'bg-white border-[#E0E4DE] text-[#56655A] hover:bg-[#F1F3EE]'
              }`}
              title={isDenseView ? 'Switch to Comfortable View' : 'Switch to Compact / Dense Ledger View'}
            >
              {isDenseView ? <AlignJustify className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isDenseView ? 'Dense' : 'Spacious'}</span>
            </button>

            {onOpenManualRecon && (
              <button
                id="btn-tbl-manual-recon"
                type="button"
                onClick={onOpenManualRecon}
                className="px-2.5 py-1.5 bg-[#2D4A3E] text-white rounded-lg text-xs font-bold hover:bg-[#1A2E25] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Run manual reconciliation with custom MMYYYY periods like 022022 to 022026"
              >
                <Sliders className="w-3.5 h-3.5 text-[#8DA173]" />
                <span className="hidden sm:inline">Manual Recon</span>
                <span className="text-[9px] px-1 rounded bg-[#8DA173] text-white font-mono font-bold">
                  022022-26
                </span>
              </button>
            )}

            {onOpenManageRegisters && (
              <button
                id="btn-tbl-manage-registers"
                type="button"
                onClick={onOpenManageRegisters}
                className="px-2.5 py-1.5 bg-white border border-[#E0E4DE] hover:bg-[#F2F5F3] text-[#2D4A3E] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Manage stored Purchase Register & GSTR-2B"
              >
                <Database className="w-3.5 h-3.5 text-[#5C7243]" />
                <span className="hidden md:inline">Registers</span>
              </button>
            )}

            {selectedIds.size > 0 && onDeleteRecordsBatch && (
              <button
                id="btn-bulk-delete-invoices"
                type="button"
                onClick={() => {
                  const booksIds: string[] = [];
                  const gstr2bIds: string[] = [];
                  selectedItemsList.forEach((item) => {
                    if (item.booksRecord?.id) booksIds.push(item.booksRecord.id);
                    if (item.gstr2bRecord?.id) gstr2bIds.push(item.gstr2bRecord.id);
                  });
                  const allIds = Array.from(new Set([...booksIds, ...gstr2bIds]));
                  if (allIds.length > 0) {
                    onDeleteRecordsBatch(allIds, isSalesRecon ? 'books' : 'both');
                    setSelectedIds(new Set());
                  }
                }}
                className="px-2.5 py-1.5 bg-[#FFF2F0] hover:bg-[#FFEAE6] border border-[#FFCCC7] text-[#C75D4E] rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedIds.size})</span>
              </button>
            )}

            {selectedIds.size > 0 && (
              <button
                id="btn-bulk-vendor-notice"
                onClick={() => onBulkNotice(selectedItemsList)}
                className="px-3 py-1.5 bg-[#D9A14E] text-white rounded-lg text-xs font-bold hover:bg-[#C28C3D] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Bulk Notice ({selectedIds.size})</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs Bar */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
          {statusTabs.map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-filter-${tab.id}`}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#2D4A3E] text-white shadow-xs font-bold'
                    : 'bg-white text-[#738276] hover:bg-[#F1F3EE] hover:text-[#2D4A3E] border border-[#E0E4DE]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-[#8DA173] text-white' : 'bg-[#F1F3EE] text-[#738276]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table Card (Natural Tones) */}
      <div className="bg-white rounded-xl border border-[#E0E4DE] shadow-2xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto max-h-[calc(100vh-250px)] min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-[#EDF1EA] text-[#425246] text-[11px] uppercase tracking-wider border-b border-[#D8DFD5] shadow-2xs">
              <tr>
                <th className="px-3 py-2.5 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-[#738276] hover:text-[#2D4A3E] cursor-pointer">
                    {selectedIds.size > 0 && selectedIds.size === filteredItems.length ? (
                      <CheckSquare className="w-4 h-4 text-[#8DA173]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th
                  className="px-3 py-2.5 font-bold cursor-pointer hover:text-[#2D4A3E]"
                  onClick={() => {
                    setSortBy('date');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>{t.invDate}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-2.5 font-bold">{t.invNumber}</th>
                <th className="px-4 py-2.5 font-bold">{isSalesRecon ? 'Customer / Buyer GSTIN' : t.supplierGstin}</th>
                <th className="px-4 py-2.5 font-bold">{isSalesRecon ? 'Sales Register' : t.booksAmount}</th>
                <th className="px-4 py-2.5 font-bold">{isSalesRecon ? 'GSTR-1 Return' : t.gstr2bAmount}</th>
                <th
                  className="px-4 py-2.5 font-bold cursor-pointer hover:text-[#2D4A3E]"
                  onClick={() => {
                    setSortBy('diff');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>{t.variance}</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-2.5 font-bold">{t.matchStatus}</th>
                <th className="px-4 py-2.5 font-bold text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#F1F3EE]">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#738276]">
                    <p className="text-sm font-medium">No invoices match the selected filter.</p>
                    <p className="text-xs text-[#738276] mt-1">
                      Try clearing search terms or selecting another status tab.
                    </p>
                  </td>
                </tr>
              ) : (
                displayItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isExact = item.matchStatus === 'EXACT_MATCH';
                  const isFuzzy = item.matchStatus === 'FUZZY_MATCH';
                  const isValDiff = item.matchStatus === 'VALUE_MISMATCH';
                  const isHeadDiff = item.matchStatus === 'HEAD_MISMATCH';
                  const isMiss2B = item.matchStatus === 'MISSING_IN_2B';
                  const isMissBooks = item.matchStatus === 'MISSING_IN_BOOKS';
                  const isIneligible = item.matchStatus === 'INELIGIBLE_ITC';

                  const date = item.booksRecord?.invoiceDate || item.gstr2bRecord?.invoiceDate || '—';
                  const rowPadding = isDenseView ? 'py-1.5' : 'py-3';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#FDFDFC] transition-colors ${
                        isSelected ? 'bg-[#F1F5EE]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className={`px-3 ${rowPadding} text-center`}>
                        <button
                          onClick={() => toggleSelectItem(item.id)}
                          className="text-[#738276] hover:text-[#2D4A3E] cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#8DA173]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className={`px-3 ${rowPadding} font-mono text-[#738276] whitespace-nowrap`}>
                        {date}
                      </td>

                      {/* Invoice Number */}
                      <td className={`px-4 ${rowPadding} font-mono font-medium text-[#2D362E]`}>
                        <div>{item.invoiceNumber}</div>
                        {isFuzzy && (
                          <div className="text-[10px] text-[#8DA173] font-sans">
                            Books: {item.booksRecord?.invoiceNumber} | 2B: {item.gstr2bRecord?.invoiceNumber}
                          </div>
                        )}
                      </td>

                      {/* Vendor & GSTIN */}
                      <td className={`px-4 ${rowPadding}`}>
                        <div className="font-semibold text-[#2D362E] truncate max-w-[200px] sm:max-w-[260px]">
                          {item.vendorName}
                        </div>
                        <div className="text-[10px] text-[#738276] font-mono flex items-center gap-1">
                          <span>{item.gstin}</span>
                          {item.booksRecord?.placeOfSupply && (
                            <span className="text-[9px] bg-[#F1F3EE] px-1 rounded">
                              {item.booksRecord.placeOfSupply.split('-')[1] || item.booksRecord.placeOfSupply}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Books Amount */}
                      <td className={`px-4 ${rowPadding}`}>
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
                          <span className="text-[#C75D4E] font-medium italic">Not in Books</span>
                        )}
                      </td>

                      {/* GSTR-2B Amount */}
                      <td className={`px-4 ${rowPadding}`}>
                        {item.gstr2bRecord ? (
                          <div>
                            <div
                              className={`font-semibold ${
                                isValDiff || isHeadDiff ? 'text-[#D9A14E]' : 'text-[#2D362E]'
                              }`}
                            >
                              {formatRupee(item.gstr2bRecord.invoiceValue)}
                            </div>
                            <div className="text-[10px] text-[#738276]">
                              Tax: {formatRupee(item.gstr2bRecord.totalTax)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#C75D4E] font-medium italic">Missing in 2B</span>
                        )}
                      </td>

                      {/* Variance */}
                      <td className={`px-4 ${rowPadding} font-mono text-[11px]`}>
                        {item.discrepancy?.totalDiff !== 0 && item.discrepancy?.totalDiff !== undefined ? (
                          <span
                            className={`font-semibold ${
                              isMiss2B || isMissBooks
                                ? 'text-[#C75D4E]'
                                : Math.abs(item.discrepancy.totalDiff) <= 2
                                ? 'text-[#8DA173]'
                                : 'text-[#D9A14E]'
                            }`}
                          >
                            {item.discrepancy.totalDiff > 0 ? '+' : ''}
                            {formatRupee(item.discrepancy.totalDiff)}
                          </span>
                        ) : (
                          <span className="text-[#8DA173] font-semibold">₹0.00</span>
                        )}
                      </td>

                      {/* Status Tag */}
                      <td className={`px-4 ${rowPadding}`}>
                        {isExact && (
                          <span className="px-2 py-0.5 bg-[#EBF2E4] text-[#2D4A3E] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#8DA173]" />
                            Exact Match
                          </span>
                        )}
                        {item.matchStatus === 'FUZZY_GSTIN_MATCH' && (
                          <span className="px-2 py-0.5 bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#4F46E5]" />
                            Fuzzy GSTIN ({item.matchConfidence}%)
                          </span>
                        )}
                        {item.matchStatus === 'PARTIAL_MATCH' && (
                          <span className="px-2 py-0.5 bg-[#F2F6ED] text-[#5C7243] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#5C7243]" />
                            Partial Match ({item.matchConfidence}%)
                          </span>
                        )}
                        {item.matchStatus === 'SIGNIFICANT_DISCREPANCY' && (
                          <span className="px-2 py-0.5 bg-[#FFF2F0] text-[#C75D4E] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#C75D4E]" />
                            Discrepancy
                          </span>
                        )}
                        {isValDiff && (
                          <span className="px-2 py-0.5 bg-[#FFF8EE] text-[#D9A14E] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#D9A14E]" />
                            Value Diff
                          </span>
                        )}
                        {isHeadDiff && (
                          <span className="px-2 py-0.5 bg-[#FFF8EE] text-[#D9A14E] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#D9A14E]" />
                            Head Diff
                          </span>
                        )}
                        {isMiss2B && (
                          <span className="px-2 py-0.5 bg-[#FCF0EE] text-[#C75D4E] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-[#C75D4E]" />
                            {isSalesRecon ? 'Missing in GSTR-1' : 'Missing in 2B'}
                          </span>
                        )}
                        {isMissBooks && (
                          <span className="px-2 py-0.5 bg-[#EDF3F8] text-[#2D5A88] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <FileQuestion className="w-3 h-3 text-[#2D5A88]" />
                            {isSalesRecon ? 'Missing in Sales' : 'Missing in Books'}
                          </span>
                        )}
                        {isIneligible && (
                          <span className="px-2 py-0.5 bg-[#F7F2EE] text-[#8E6E53] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <HelpCircle className="w-3 h-3 text-[#8E6E53]" />
                            Ineligible
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className={`px-4 ${rowPadding} text-right whitespace-nowrap`}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            id={`btn-tbl-view-${item.id}`}
                            onClick={() => onViewItem(item)}
                            className="p-1.5 text-[#738276] hover:text-[#2D4A3E] hover:bg-[#F1F3EE] rounded transition-colors cursor-pointer"
                            title="Inspect & Compare"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {(isMiss2B || isValDiff || isHeadDiff) && (
                            <button
                              id={`btn-tbl-notify-${item.id}`}
                              onClick={() => onOpenNotice(item)}
                              className="p-1.5 text-[#D9A14E] hover:text-white hover:bg-[#D9A14E] rounded transition-colors cursor-pointer"
                              title={isSalesRecon ? 'Generate GSTR-1 Notice' : 'Generate Notice to Vendor'}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {onDeleteRecordSingular && (
                            <button
                              id={`btn-tbl-delete-${item.id}`}
                              onClick={() => {
                                const booksId = item.booksRecord?.id;
                                const g2bId = item.gstr2bRecord?.id;
                                if (booksId && g2bId && onDeleteRecordsBatch) {
                                  onDeleteRecordsBatch([booksId, g2bId], isSalesRecon ? 'books' : 'both');
                                } else if (booksId) {
                                  onDeleteRecordSingular(booksId, 'books');
                                } else if (g2bId) {
                                  onDeleteRecordSingular(g2bId, 'gstr2b');
                                }
                              }}
                              className="p-1.5 text-[#738276] hover:text-[#C75D4E] hover:bg-[#FFF2F0] rounded transition-colors cursor-pointer"
                              title="Delete this record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

        {/* Footer Summary & Pagination Controls */}
        <div className="p-3 border-t border-[#E0E4DE] bg-[#FDFDFC] flex flex-wrap items-center justify-between gap-3 text-xs text-[#738276]">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-[#2D362E]">{filteredItems.length === 0 ? 0 : startIndex + 1}</strong>–
              <strong className="text-[#2D362E]">{endIndex}</strong> of{' '}
              <strong className="text-[#2D362E]">{filteredItems.length}</strong> filtered (Total {items.length})
            </span>

            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-1.5 border-l border-[#E0E4DE] pl-3">
              <span className="text-[11px] text-[#738276]">Rows per page:</span>
              <select
                id="recon-page-size-select"
                value={pageSize}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageSize(val === 'ALL' ? 'ALL' : Number(val));
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#E0E4DE] text-xs font-bold text-[#2D4A3E] px-2 py-0.5 rounded cursor-pointer focus:outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="ALL">All ({filteredItems.length})</option>
              </select>
            </div>
          </div>

          {/* Pagination Jump Buttons */}
          {pageSize !== 'ALL' && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1 rounded text-[#738276] hover:text-[#2D4A3E] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded text-[#738276] hover:text-[#2D4A3E] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 py-0.5 text-xs font-bold text-[#2D4A3E] bg-[#EDF3EF] rounded">
                Page {currentPage} of {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded text-[#738276] hover:text-[#2D4A3E] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1 rounded text-[#738276] hover:text-[#2D4A3E] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
