import React, { useState, useMemo } from 'react';
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
  title,
  isSalesRecon = false,
}) => {
  const t = translations[language];
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilterStatus);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'diff'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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

  return (
    <div id="recon-table-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px] mx-auto pb-16">
      {/* Monthly Period Management Bar */}
      <MonthlyPeriodBar
        selectedFY={selectedFY}
        selectedMonth={selectedMonth}
        onSelectMonth={onSelectMonth}
        monthlyStats={monthlyStats}
        language={language}
        totalPeriodInvoices={items.length}
      />

      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-[#1A2E25] tracking-tight">{title}</h3>
          <p className="text-xs text-[#738276] mt-0.5">
            {language === 'hi'
              ? 'प्रत्येक इनवॉइस का विस्तृत मिलान, विसंगति विश्लेषण और सप्लायर फॉलोअप'
              : 'Detailed invoice level reconciliation, discrepancy audit trail, and legal compliance checks.'}
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#738276] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="recon-search-input"
              type="text"
              placeholder="Search Vendor, GSTIN, Invoice No..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-white border border-[#E0E4DE] pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8DA173] w-64 shadow-xs text-[#2D362E]"
            />
          </div>

          {selectedIds.size > 0 && (
            <button
              id="btn-bulk-vendor-notice"
              onClick={() => onBulkNotice(selectedItemsList)}
              className="px-3.5 py-2 bg-[#D9A14E] text-white rounded-lg text-xs font-bold hover:bg-[#C28C3D] transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Bulk Notice ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[#E0E4DE]">
        {statusTabs.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-filter-${tab.id}`}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-[#2D4A3E] text-white shadow-xs'
                  : 'bg-white text-[#738276] hover:bg-[#F1F3EE] hover:text-[#2D4A3E] border border-[#E0E4DE]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-[#8DA173] text-white' : 'bg-[#F1F3EE] text-[#738276]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Table Card (Natural Tones) */}
      <div className="bg-white rounded-2xl border border-[#E0E4DE] shadow-xs overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F7F8F6] text-[#738276] text-[11px] uppercase tracking-wider border-b border-[#E0E4DE]">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <button onClick={toggleSelectAll} className="text-[#738276] hover:text-[#2D4A3E]">
                    {selectedIds.size > 0 && selectedIds.size === filteredItems.length ? (
                      <CheckSquare className="w-4 h-4 text-[#8DA173]" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th
                  className="px-4 py-3 font-semibold cursor-pointer hover:text-[#2D4A3E]"
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
                <th className="px-5 py-3 font-semibold">{t.invNumber}</th>
                <th className="px-6 py-3 font-semibold">{isSalesRecon ? 'Customer / Buyer GSTIN' : t.supplierGstin}</th>
                <th className="px-5 py-3 font-semibold">{isSalesRecon ? 'Sales Register' : t.booksAmount}</th>
                <th className="px-5 py-3 font-semibold">{isSalesRecon ? 'GSTR-1 Return' : t.gstr2bAmount}</th>
                <th
                  className="px-5 py-3 font-semibold cursor-pointer hover:text-[#2D4A3E]"
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
                <th className="px-5 py-3 font-semibold">{t.matchStatus}</th>
                <th className="px-5 py-3 font-semibold text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#F1F3EE]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#738276]">
                    <p className="text-sm font-medium">No invoices match the selected filter.</p>
                    <p className="text-xs text-[#738276] mt-1">
                      Try clearing search terms or selecting another status tab.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isExact = item.matchStatus === 'EXACT_MATCH';
                  const isFuzzy = item.matchStatus === 'FUZZY_MATCH';
                  const isValDiff = item.matchStatus === 'VALUE_MISMATCH';
                  const isHeadDiff = item.matchStatus === 'HEAD_MISMATCH';
                  const isMiss2B = item.matchStatus === 'MISSING_IN_2B';
                  const isMissBooks = item.matchStatus === 'MISSING_IN_BOOKS';
                  const isIneligible = item.matchStatus === 'INELIGIBLE_ITC';

                  const date = item.booksRecord?.invoiceDate || item.gstr2bRecord?.invoiceDate || '—';

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-[#FDFDFC] transition-colors ${
                        isSelected ? 'bg-[#F1F5EE]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => toggleSelectItem(item.id)}
                          className="text-[#738276] hover:text-[#2D4A3E]"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#8DA173]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3.5 font-mono text-[#738276] whitespace-nowrap">
                        {date}
                      </td>

                      {/* Invoice Number */}
                      <td className="px-5 py-3.5 font-mono font-medium text-[#2D362E]">
                        <div>{item.invoiceNumber}</div>
                        {isFuzzy && (
                          <div className="text-[10px] text-[#8DA173] font-sans">
                            Books: {item.booksRecord?.invoiceNumber} | 2B: {item.gstr2bRecord?.invoiceNumber}
                          </div>
                        )}
                      </td>

                      {/* Vendor & GSTIN */}
                      <td className="px-6 py-3.5">
                        <div className="font-semibold text-[#2D362E] truncate max-w-[220px]">
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
                      <td className="px-5 py-3.5">
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
                      <td className="px-5 py-3.5">
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
                      <td className="px-5 py-3.5 font-mono text-[11px]">
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
                      <td className="px-5 py-3.5">
                        {isExact && (
                          <span style={{ height: '32.6458px' }} className="px-2.5 py-0.8 bg-[#EBF2E4] text-[#2D4A3E] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#8DA173]" />
                            Exact Match
                          </span>
                        )}
                        {item.matchStatus === 'FUZZY_GSTIN_MATCH' && (
                          <span style={{ height: '32.6458px' }} className="px-2.5 py-0.8 bg-[#EEF2FF] text-[#4F46E5] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#4F46E5]" />
                            Fuzzy GSTIN ({item.matchConfidence}%)
                          </span>
                        )}
                        {item.matchStatus === 'PARTIAL_MATCH' && (
                          <span style={{ height: '32.6458px' }} className="px-2.5 py-0.8 bg-[#F2F6ED] text-[#5C7243] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#5C7243]" />
                            Partial Match ({item.matchConfidence}%)
                          </span>
                        )}
                        {item.matchStatus === 'SIGNIFICANT_DISCREPANCY' && (
                          <span style={{ height: '32.6458px' }} className="px-2.5 py-0.8 bg-[#FFF2F0] text-[#C75D4E] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#C75D4E]" />
                            Significant Discrepancy
                          </span>
                        )}
                        {isValDiff && (
                          <span style={{ height: '32.6458px' }} className="px-2.5 py-0.8 bg-[#FFF8EE] text-[#D9A14E] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#D9A14E]" />
                            Value Diff
                          </span>
                        )}
                        {isHeadDiff && (
                          <span style={{ height: '32.6458px' }} className="px-2.5 py-0.8 bg-[#FFF8EE] text-[#D9A14E] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#D9A14E]" />
                            Head Mismatch
                          </span>
                        )}
                        {isMiss2B && (
                          <span style={{ height: '32.6458px' }} className="px-2.5 py-0.8 bg-[#FCF0EE] text-[#C75D4E] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <TrendingDown className="w-3 h-3 text-[#C75D4E]" />
                            {isSalesRecon ? 'Missing in GSTR-1' : 'Missing in 2B'}
                          </span>
                        )}
                        {isMissBooks && (
                          <span style={{ height: '32.6458px' }} className="px-2.5 py-0.8 bg-[#EDF3F8] text-[#2D5A88] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <FileQuestion className="w-3 h-3 text-[#2D5A88]" />
                            {isSalesRecon ? 'Missing in Sales Register' : 'Missing in Books'}
                          </span>
                        )}
                        {isIneligible && (
                          <span style={{ height: '32.6458px' }} className="px-2.5 py-0.8 bg-[#F7F2EE] text-[#8E6E53] text-[10px] font-bold rounded uppercase tracking-wide inline-flex items-center gap-1">
                            <HelpCircle className="w-3 h-3 text-[#8E6E53]" />
                            Ineligible ITC
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            id={`btn-tbl-view-${item.id}`}
                            onClick={() => onViewItem(item)}
                            className="p-1.5 text-[#738276] hover:text-[#2D4A3E] hover:bg-[#F1F3EE] rounded transition-colors"
                            title="Inspect & Compare"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {(isMiss2B || isValDiff || isHeadDiff) && (
                            <button
                              id={`btn-tbl-notify-${item.id}`}
                              onClick={() => onOpenNotice(item)}
                              className="p-1.5 text-[#D9A14E] hover:text-white hover:bg-[#D9A14E] rounded transition-colors"
                              title={isSalesRecon ? 'Generate GSTR-1 Notice' : 'Generate Notice to Vendor'}
                            >
                              <Mail className="w-3.5 h-3.5" />
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

        {/* Footer Summary */}
        <div className="p-4 border-t border-[#E0E4DE] bg-[#FDFDFC] flex items-center justify-between text-xs text-[#738276]">
          <span>
            Showing <strong className="text-[#2D362E]">{filteredItems.length}</strong> of{' '}
            {items.length} records
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px]">
              Tolerances: Value ±₹2.00 | Tax ±₹1.50
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
