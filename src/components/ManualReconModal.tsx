import React, { useState, useMemo } from 'react';
import {
  X,
  Play,
  Calendar,
  Download,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  Trash2,
  RefreshCw,
  Sliders,
  Filter,
  Search,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  ExternalLink,
  ChevronDown,
  Info,
  Archive,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  InvoiceRecord,
  ReconItem,
  ReconSummary,
  ToleranceConfig,
  UserProfile,
  Language,
} from '../types';
import {
  normalizePeriodToMMYYYY,
  formatMMYYYYLabel,
  mmyyyyToScore,
  filterRecordsByPeriodRange,
  generatePeriodOptions,
  PERIOD_PRESETS,
} from '../utils/periodUtils';
import { reconcileGstData, DEFAULT_TOLERANCE } from '../utils/gstEngine';
import { exportManualReconciliationToExcel } from '../utils/manualReconExport';
import { exportReconciliationToCsv } from '../utils/exportReport';

interface ManualReconModalProps {
  isOpen: boolean;
  onClose: () => void;
  booksData: InvoiceRecord[];
  gstr2bData: InvoiceRecord[];
  currentUser: UserProfile | null;
  companyGstin: string;
  tolerance?: ToleranceConfig;
  language?: Language;
  onDeleteInvoiceSingular?: (id: string, source: 'books' | 'gstr2b') => void;
  onDeleteInvoicesBatch?: (ids: string[], source: 'books' | 'gstr2b' | 'both') => void;
  onLoadMultiPeriodSample?: () => void;
  onOpenUpload?: (tab?: any) => void;
}

export const ManualReconModal: React.FC<ManualReconModalProps> = ({
  isOpen,
  onClose,
  booksData,
  gstr2bData,
  currentUser,
  companyGstin,
  tolerance = DEFAULT_TOLERANCE,
  language = 'en',
  onDeleteInvoiceSingular,
  onDeleteInvoicesBatch,
  onLoadMultiPeriodSample,
  onOpenUpload,
}) => {
  // GSTR-2B Period Range (Defaults to the user's explicit range: 022022 to 022026)
  const [gstr2bFrom, setGstr2bFrom] = useState<string>('022022');
  const [gstr2bTo, setGstr2bTo] = useState<string>('022026');

  // Purchase Register Period Range (Defaults in same manner: 022022 to 022026)
  const [booksFrom, setBooksFrom] = useState<string>('022022');
  const [booksTo, setBooksTo] = useState<string>('022026');

  // Sync toggle
  const [isPeriodsSynced, setIsPeriodsSynced] = useState<boolean>(true);

  // Reconciliation execution state
  const [hasRun, setHasRun] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [reconciledResult, setReconciledResult] = useState<{
    items: ReconItem[];
    summary: ReconSummary;
    executedAt: string;
    activeBooksFrom: string;
    activeBooksTo: string;
    active2bFrom: string;
    active2bTo: string;
  } | null>(null);

  // Table filtering and search
  const [activeFilterStatus, setActiveFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Available options
  const allPeriodOptions = useMemo(() => generatePeriodOptions('012020', '122026'), []);

  // Filtered records preview based on current input period ranges
  const previewFilteredBooks = useMemo(() => {
    return filterRecordsByPeriodRange(booksData, booksFrom, booksTo);
  }, [booksData, booksFrom, booksTo]);

  const previewFilteredGstr2b = useMemo(() => {
    return filterRecordsByPeriodRange(gstr2bData, gstr2bFrom, gstr2bTo);
  }, [gstr2bData, gstr2bFrom, gstr2bTo]);

  const previewBooksTax = useMemo(() => {
    return previewFilteredBooks.reduce((sum, r) => sum + (r.totalTax || 0), 0);
  }, [previewFilteredBooks]);

  const previewGstr2bTax = useMemo(() => {
    return previewFilteredGstr2b.reduce((sum, r) => sum + (r.totalTax || 0), 0);
  }, [previewFilteredGstr2b]);

  if (!isOpen) return null;

  // Sync handler
  const handleUpdate2bFrom = (val: string) => {
    setGstr2bFrom(val);
    if (isPeriodsSynced) setBooksFrom(val);
  };

  const handleUpdate2bTo = (val: string) => {
    setGstr2bTo(val);
    if (isPeriodsSynced) setBooksTo(val);
  };

  const handleApplyPreset = (presetFrom: string, presetTo: string) => {
    setGstr2bFrom(presetFrom);
    setGstr2bTo(presetTo);
    setBooksFrom(presetFrom);
    setBooksTo(presetTo);
  };

  // Run Manual Reconciliation
  const handleExecuteReconciliation = () => {
    setIsRunning(true);
    setTimeout(() => {
      const filteredBooks = filterRecordsByPeriodRange(booksData, booksFrom, booksTo);
      const filtered2b = filterRecordsByPeriodRange(gstr2bData, gstr2bFrom, gstr2bTo);

      const res = reconcileGstData(filteredBooks, filtered2b, tolerance);

      setReconciledResult({
        items: res.items,
        summary: res.summary,
        executedAt: new Date().toLocaleString('en-IN'),
        activeBooksFrom: booksFrom,
        activeBooksTo: booksTo,
        active2bFrom: gstr2bFrom,
        active2bTo: gstr2bTo,
      });

      setHasRun(true);
      setIsRunning(false);

      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#2D4A3E', '#8DA173', '#D9A14E'],
        });
      } catch (e) {
        // ignore
      }
    }, 450);
  };

  // Filter items in table
  const displayedItems = (reconciledResult?.items || []).filter((item) => {
    if (activeFilterStatus === 'EXACT_MATCH' && item.matchStatus !== 'EXACT_MATCH') return false;
    if (activeFilterStatus === 'MISSING_IN_2B' && item.matchStatus !== 'MISSING_IN_2B') return false;
    if (activeFilterStatus === 'MISSING_IN_BOOKS' && item.matchStatus !== 'MISSING_IN_BOOKS') return false;
    if (activeFilterStatus === 'VALUE_MISMATCH') {
      if (
        item.matchStatus !== 'VALUE_MISMATCH' &&
        item.matchStatus !== 'HEAD_MISMATCH' &&
        item.matchStatus !== 'SIGNIFICANT_DISCREPANCY'
      )
        return false;
    }
    if (activeFilterStatus === 'PARTIAL_MATCH') {
      if (item.matchStatus !== 'PARTIAL_MATCH' && item.matchStatus !== 'FUZZY_MATCH' && item.matchStatus !== 'FUZZY_GSTIN_MATCH')
        return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const vendor = (item.vendorName || '').toLowerCase();
    const gstin = (item.gstin || '').toLowerCase();
    const inv = (item.invoiceNumber || '').toLowerCase();
    return vendor.includes(q) || gstin.includes(q) || inv.includes(q);
  });

  // Download Reports
  const handleDownloadExcel = () => {
    if (!reconciledResult) return;
    exportManualReconciliationToExcel(reconciledResult.items, reconciledResult.summary, {
      companyName: currentUser?.companyName || 'Registered Taxpayer',
      companyGstin: companyGstin || currentUser?.companyGstin || '27AABCA1234F1Z8',
      userId: currentUser?.uid || 'user-default',
      userName: currentUser?.displayName || currentUser?.email || 'Tax Professional',
      booksPeriodFrom: reconciledResult.activeBooksFrom,
      booksPeriodTo: reconciledResult.activeBooksTo,
      gstr2bPeriodFrom: reconciledResult.active2bFrom,
      gstr2bPeriodTo: reconciledResult.active2bTo,
      toleranceRupees: tolerance.valueTolerance,
    });
  };

  const handleDownloadCsv = () => {
    if (!reconciledResult) return;
    const periodStr = `Books [${reconciledResult.activeBooksFrom} to ${reconciledResult.activeBooksTo}] vs 2B [${reconciledResult.active2bFrom} to ${reconciledResult.active2bTo}]`;
    exportReconciliationToCsv(
      reconciledResult.items,
      reconciledResult.summary,
      currentUser?.companyName || 'Taxpayer',
      periodStr
    );
  };

  // Singular deletion
  const handleDeleteSingular = (item: ReconItem) => {
    const booksId = item.booksRecord?.id;
    const g2bId = item.gstr2bRecord?.id;
    if (!booksId && !g2bId) return;

    if (booksId && g2bId && onDeleteInvoicesBatch) {
      onDeleteInvoicesBatch([booksId, g2bId], 'both');
    } else if (booksId && onDeleteInvoiceSingular) {
      onDeleteInvoiceSingular(booksId, 'books');
    } else if (g2bId && onDeleteInvoiceSingular) {
      onDeleteInvoiceSingular(g2bId, 'gstr2b');
    }

    // Remove from current view
    if (reconciledResult) {
      const nextItems = reconciledResult.items.filter((i) => i.id !== item.id);
      setReconciledResult({
        ...reconciledResult,
        items: nextItems,
      });
    }
  };

  // Batch deletion of selected
  const handleDeleteSelected = () => {
    if (selectedItemIds.size === 0) return;
    const selectedItems = (reconciledResult?.items || []).filter((i) => selectedItemIds.has(i.id));
    const idsToDelete: string[] = [];
    selectedItems.forEach((item) => {
      if (item.booksRecord?.id) idsToDelete.push(item.booksRecord.id);
      if (item.gstr2bRecord?.id) idsToDelete.push(item.gstr2bRecord.id);
    });

    if (idsToDelete.length > 0 && onDeleteInvoicesBatch) {
      onDeleteInvoicesBatch(idsToDelete, 'both');
    }
    if (reconciledResult) {
      const nextItems = reconciledResult.items.filter((i) => !selectedItemIds.has(i.id));
      setReconciledResult({
        ...reconciledResult,
        items: nextItems,
      });
    }
    setSelectedItemIds(new Set());
  };

  const formatRupee = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div
      id="manual-recon-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
    >
      <div
        id="manual-recon-card"
        className="bg-white w-full max-w-6xl rounded-2xl border border-[#E0E4DE] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[94vh]"
      >
        {/* Top Header */}
        <div className="bg-[#1A2E25] text-white p-5 flex items-center justify-between border-b border-[#2D4A3E] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8DA173] text-white flex items-center justify-center font-bold shadow-xs">
              <Sliders className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  Manual Period-Wise Reconciliation Studio
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8DA173]/25 border border-[#8DA173]/40 text-[#D3E4D6] font-semibold font-mono">
                  Custom MMYYYY Ranges
                </span>
              </div>
              <p className="text-xs text-[#D3DCD6] mt-0.5">
                Audit Purchase Register and GSTR-2B manually by selecting custom periods (e.g.{' '}
                <strong className="text-white">022022 to 022026</strong>). Results stay permanently stored under User ID.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D3DCD6] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Session & Entity Metadata Bar */}
        <div className="bg-[#EDF3EF] px-5 py-2.5 border-b border-[#D5E2D9] flex flex-wrap items-center justify-between gap-2 text-xs text-[#2D4A3E] shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 font-medium">
              <Database className="w-3.5 h-3.5 text-[#5C7243]" />
              <span>User ID:</span>
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#D5E2D9] text-[#1A2E25]">
                {currentUser?.uid || 'guest-session-active'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#56655A]">Taxpayer GSTIN:</span>
              <span className="font-mono font-bold">{companyGstin}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[#56655A]">Total Invoices Stored:</span>
              <span className="font-semibold text-[#1A2E25]">
                Books: {booksData.length} | GSTR-2B: {gstr2bData.length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {booksData.length === 0 && gstr2bData.length === 0 && onLoadMultiPeriodSample && (
              <button
                type="button"
                onClick={onLoadMultiPeriodSample}
                className="px-2.5 py-1 bg-[#D9A14E] hover:bg-[#C28C3D] text-white rounded text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Load Test Multi-Period Data (022022 - 022026)</span>
              </button>
            )}
            {onOpenUpload && (
              <button
                type="button"
                onClick={onOpenUpload}
                className="px-2.5 py-1 bg-white hover:bg-[#F7F8F6] border border-[#D5E2D9] text-[#2D4A3E] rounded text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <span>+ Import Invoices</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
          {/* PERIOD RANGE SELECTOR SECTION */}
          <div className="bg-[#FAFBF9] border border-[#E0E4DE] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-[#E0E4DE]">
              <div>
                <h3 className="text-sm font-bold text-[#1A2E25] flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#8DA173]" />
                  <span>Configure Manual Reconciliation Periods</span>
                </h3>
                <p className="text-xs text-[#738276] mt-0.5">
                  Select start and end periods in official 6-digit MMYYYY format (e.g. 022022 to 022026) or using the dropdowns.
                </p>
              </div>

              {/* Sync Toggle & Presets */}
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-1.5 text-xs text-[#2D4A3E] font-medium bg-white px-2.5 py-1 rounded-lg border border-[#D5E2D9] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPeriodsSynced}
                    onChange={(e) => {
                      setIsPeriodsSynced(e.target.checked);
                      if (e.target.checked) {
                        setBooksFrom(gstr2bFrom);
                        setBooksTo(gstr2bTo);
                      }
                    }}
                    className="accent-[#2D4A3E] rounded"
                  />
                  <span>Sync GSTR-2B & Books Periods</span>
                </label>
              </div>
            </div>

            {/* Quick Period Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-[#738276] uppercase tracking-wider block">
                Quick Selection Presets:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PERIOD_PRESETS.map((p) => {
                  const isSelected = gstr2bFrom === p.from && gstr2bTo === p.to;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleApplyPreset(p.from, p.to)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#2D4A3E] text-white border-[#2D4A3E] shadow-xs'
                          : 'bg-white text-[#56655A] border-[#D5E2D9] hover:bg-[#F2F5F3]'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Period Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              {/* 1. GSTR-2B Period Range */}
              <div className="bg-white border-2 border-[#D5E2D9] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8DA173]"></span>
                    <h4 className="text-xs font-bold text-[#1A2E25] uppercase tracking-wider">
                      GSTR-2B Filing Period Range
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#56655A] font-mono">Format: MMYYYY</span>
                    {onOpenUpload && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenUpload('zip_2b');
                        }}
                        className="px-2 py-0.5 bg-[#EDF3EF] hover:bg-[#D5E2D9] text-[#2D4A3E] rounded text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Upload ZIP containing multiple monthly GSTR-2B JSONs"
                      >
                        <Archive className="w-3 h-3 text-[#8DA173]" />
                        <span>Upload 2B ZIP</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#56655A] block mb-1">
                      From Period (e.g. 022022):
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={gstr2bFrom}
                      onChange={(e) => handleUpdate2bFrom(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="022022"
                      className="w-full text-xs font-mono font-bold px-3 py-2 border border-[#D5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8DA173] bg-[#FDFDFC]"
                    />
                    <select
                      value={gstr2bFrom}
                      onChange={(e) => handleUpdate2bFrom(e.target.value)}
                      className="w-full text-[11px] mt-1 p-1 border border-[#E0E4DE] rounded text-[#56655A] bg-[#FAFBF9]"
                    >
                      {allPeriodOptions.map((opt) => (
                        <option key={`2b-from-${opt.code}`} value={opt.code}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#56655A] block mb-1">
                      To Period (e.g. 022026):
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={gstr2bTo}
                      onChange={(e) => handleUpdate2bTo(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="022026"
                      className="w-full text-xs font-mono font-bold px-3 py-2 border border-[#D5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8DA173] bg-[#FDFDFC]"
                    />
                    <select
                      value={gstr2bTo}
                      onChange={(e) => handleUpdate2bTo(e.target.value)}
                      className="w-full text-[11px] mt-1 p-1 border border-[#E0E4DE] rounded text-[#56655A] bg-[#FAFBF9]"
                    >
                      {allPeriodOptions.map((opt) => (
                        <option key={`2b-to-${opt.code}`} value={opt.code}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Count Preview */}
                <div className="pt-2 border-t border-[#F0F2EF] flex items-center justify-between text-xs">
                  <span className="text-[#56655A]">GSTR-2B Invoices in this Range:</span>
                  <span className="font-bold text-[#2D4A3E]">
                    {previewFilteredGstr2b.length} records ({formatRupee(previewGstr2bTax)})
                  </span>
                </div>
              </div>

              {/* 2. Purchase Register Period Range */}
              <div className="bg-white border-2 border-[#D5E2D9] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2D4A3E]"></span>
                    <h4 className="text-xs font-bold text-[#1A2E25] uppercase tracking-wider">
                      Purchase Register (Books) Period Range
                    </h4>
                  </div>
                  <span className="text-[11px] text-[#56655A] font-mono">Format: MMYYYY</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#56655A] block mb-1">
                      From Period (e.g. 022022):
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={booksFrom}
                      disabled={isPeriodsSynced}
                      onChange={(e) => setBooksFrom(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="022022"
                      className="w-full text-xs font-mono font-bold px-3 py-2 border border-[#D5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8DA173] bg-[#FDFDFC] disabled:bg-[#F2F5F3] disabled:text-[#738276]"
                    />
                    <select
                      value={booksFrom}
                      disabled={isPeriodsSynced}
                      onChange={(e) => setBooksFrom(e.target.value)}
                      className="w-full text-[11px] mt-1 p-1 border border-[#E0E4DE] rounded text-[#56655A] bg-[#FAFBF9] disabled:opacity-60"
                    >
                      {allPeriodOptions.map((opt) => (
                        <option key={`books-from-${opt.code}`} value={opt.code}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#56655A] block mb-1">
                      To Period (e.g. 022026):
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={booksTo}
                      disabled={isPeriodsSynced}
                      onChange={(e) => setBooksTo(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="022026"
                      className="w-full text-xs font-mono font-bold px-3 py-2 border border-[#D5E2D9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8DA173] bg-[#FDFDFC] disabled:bg-[#F2F5F3] disabled:text-[#738276]"
                    />
                    <select
                      value={booksTo}
                      disabled={isPeriodsSynced}
                      onChange={(e) => setBooksTo(e.target.value)}
                      className="w-full text-[11px] mt-1 p-1 border border-[#E0E4DE] rounded text-[#56655A] bg-[#FAFBF9] disabled:opacity-60"
                    >
                      {allPeriodOptions.map((opt) => (
                        <option key={`books-to-${opt.code}`} value={opt.code}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Live Count Preview */}
                <div className="pt-2 border-t border-[#F0F2EF] flex items-center justify-between text-xs">
                  <span className="text-[#56655A]">Purchase Invoices in this Range:</span>
                  <span className="font-bold text-[#2D4A3E]">
                    {previewFilteredBooks.length} records ({formatRupee(previewBooksTax)})
                  </span>
                </div>
              </div>
            </div>

            {/* Run Reconciliation Action Button Bar */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[#56655A] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#8DA173] shrink-0" />
                <span>
                  Tolerance: Value ±₹{tolerance.valueTolerance}, Tax ±₹{tolerance.taxTolerance}. Fuzzy & PAN Matching Active.
                </span>
              </div>

              <button
                id="btn-run-manual-reconciliation"
                type="button"
                onClick={handleExecuteReconciliation}
                disabled={isRunning}
                className="px-6 py-2.5 bg-[#2D4A3E] hover:bg-[#1A2E25] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-4 h-4 text-[#8DA173] fill-current ${isRunning ? 'animate-spin' : ''}`} />
                <span>
                  {isRunning ? 'Reconciling Datasets...' : `Run Manual Reconciliation (${booksFrom} - ${booksTo})`}
                </span>
              </button>
            </div>
          </div>

          {/* RESULTS DISPLAY SECTION (WHEN HAS RUN) */}
          {hasRun && reconciledResult && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Result Header Banner */}
              <div className="bg-[#2D4A3E] text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#8DA173]" />
                    <h4 className="text-sm font-bold">
                      Reconciliation Results: {reconciledResult.activeBooksFrom} → {reconciledResult.activeBooksTo}
                    </h4>
                  </div>
                  <p className="text-xs text-[#D3DCD6] mt-0.5">
                    Executed on {reconciledResult.executedAt} • GSTR-2B: [{reconciledResult.active2bFrom} to {reconciledResult.active2bTo}] vs Books: [{reconciledResult.activeBooksFrom} to {reconciledResult.activeBooksTo}]
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadExcel}
                    className="px-3.5 py-1.5 bg-[#8DA173] hover:bg-[#7A8E61] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Download Excel Report (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCsv}
                    className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Total Books */}
                <div className="bg-white border border-[#E0E4DE] rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#738276] uppercase tracking-wider block">
                    Books Inward
                  </span>
                  <span className="text-lg font-bold text-[#1A2E25] mt-1 block">
                    {reconciledResult.summary.totalBookRecords}
                  </span>
                  <span className="text-[11px] text-[#56655A]">
                    {formatRupee(reconciledResult.summary.totalBookTax)}
                  </span>
                </div>

                {/* Total 2B */}
                <div className="bg-white border border-[#E0E4DE] rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#738276] uppercase tracking-wider block">
                    GSTR-2B Portal
                  </span>
                  <span className="text-lg font-bold text-[#1A2E25] mt-1 block">
                    {reconciledResult.summary.totalGstr2bRecords}
                  </span>
                  <span className="text-[11px] text-[#56655A]">
                    {formatRupee(reconciledResult.summary.totalGstr2bTax)}
                  </span>
                </div>

                {/* Exact Matches */}
                <div className="bg-[#EDF3EF] border border-[#D5E2D9] rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#2D4A3E] uppercase tracking-wider block">
                    Exact Matched
                  </span>
                  <span className="text-lg font-bold text-[#2D4A3E] mt-1 block">
                    {reconciledResult.summary.matchedCount}
                  </span>
                  <span className="text-[11px] text-[#5C7243] font-semibold">
                    {formatRupee(reconciledResult.summary.matchedTax)} ITC OK
                  </span>
                </div>

                {/* Discrepancies */}
                <div className="bg-[#FFF9E6] border border-[#FFE79A] rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#975A16] uppercase tracking-wider block">
                    Discrepancies
                  </span>
                  <span className="text-lg font-bold text-[#975A16] mt-1 block">
                    {reconciledResult.summary.mismatchCount + reconciledResult.summary.significantDiscrepancyCount}
                  </span>
                  <span className="text-[11px] text-[#B7791F]">
                    Diff: {formatRupee(reconciledResult.summary.mismatchTaxDiff)}
                  </span>
                </div>

                {/* Missing in 2B (At Risk) */}
                <div className="bg-[#FFF2F0] border border-[#FFCCC7] rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#C75D4E] uppercase tracking-wider block">
                    Missing in 2B
                  </span>
                  <span className="text-lg font-bold text-[#C75D4E] mt-1 block">
                    {reconciledResult.summary.missingIn2bCount}
                  </span>
                  <span className="text-[11px] text-[#A8071A] font-semibold">
                    {formatRupee(reconciledResult.summary.missingIn2bTax)} Risk
                  </span>
                </div>

                {/* Missing in Books */}
                <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-3 shadow-2xs">
                  <span className="text-[10px] font-bold text-[#1D4ED8] uppercase tracking-wider block">
                    Missing in Books
                  </span>
                  <span className="text-lg font-bold text-[#1D4ED8] mt-1 block">
                    {reconciledResult.summary.missingInBooksCount}
                  </span>
                  <span className="text-[11px] text-[#1E40AF]">
                    {formatRupee(reconciledResult.summary.missingInBooksTax)} Unclaimed
                  </span>
                </div>
              </div>

              {/* FILTER TABS & SEARCH BAR */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { id: 'ALL', label: 'All Invoices', count: reconciledResult.items.length },
                    { id: 'EXACT_MATCH', label: 'Exact Match', count: reconciledResult.summary.matchedCount },
                    { id: 'PARTIAL_MATCH', label: 'Partial/Fuzzy', count: reconciledResult.summary.partialMatchCount + reconciledResult.summary.fuzzyMatchedCount },
                    { id: 'VALUE_MISMATCH', label: 'Discrepancies', count: reconciledResult.summary.mismatchCount },
                    { id: 'MISSING_IN_2B', label: 'Missing in 2B (Risk)', count: reconciledResult.summary.missingIn2bCount },
                    { id: 'MISSING_IN_BOOKS', label: 'Missing in Books', count: reconciledResult.summary.missingInBooksCount },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFilterStatus(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeFilterStatus === tab.id
                          ? 'bg-[#2D4A3E] text-white shadow-2xs'
                          : 'bg-white border border-[#E0E4DE] text-[#56655A] hover:bg-[#F7F8F6]'
                      }`}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#738276] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search vendor, GSTIN, invoice..."
                      className="pl-8 pr-3 py-1.5 text-xs border border-[#D5E2D9] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8DA173] w-56 bg-white"
                    />
                  </div>

                  {selectedItemIds.size > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="px-3 py-1.5 bg-[#FFF2F0] hover:bg-[#FFEAE6] border border-[#FFCCC7] text-[#C75D4E] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected ({selectedItemIds.size})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* RECONCILED DATASET TABLE */}
              <div className="border border-[#E0E4DE] rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#FAFBF9] text-[#2D4A3E] font-bold border-b border-[#E0E4DE] sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-8">
                          <input
                            type="checkbox"
                            checked={
                              displayedItems.length > 0 &&
                              displayedItems.every((i) => selectedItemIds.has(i.id))
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedItemIds(new Set(displayedItems.map((i) => i.id)));
                              } else {
                                setSelectedItemIds(new Set());
                              }
                            }}
                            className="rounded accent-[#2D4A3E]"
                          />
                        </th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Supplier GSTIN & Name</th>
                        <th className="py-2.5 px-3">Books Invoice No & Date</th>
                        <th className="py-2.5 px-3">2B Invoice No & Date</th>
                        <th className="py-2.5 px-3 text-right">Books Taxable</th>
                        <th className="py-2.5 px-3 text-right">2B Taxable</th>
                        <th className="py-2.5 px-3 text-right">Tax Diff</th>
                        <th className="py-2.5 px-3">Discrepancy / Action</th>
                        <th className="py-2.5 px-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0F2EF]">
                      {displayedItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-xs text-[#738276]">
                            No reconciled invoices found matching the current search / status filter.
                          </td>
                        </tr>
                      ) : (
                        displayedItems.map((item) => {
                          const book = item.booksRecord;
                          const g2b = item.gstr2bRecord;
                          const disc = item.discrepancy;
                          const isSelected = selectedItemIds.has(item.id);

                          let badgeClass = 'bg-[#EDF3EF] text-[#2D4A3E] border-[#D5E2D9]';
                          let statusLabel = 'Exact Match';

                          if (item.matchStatus === 'MISSING_IN_2B') {
                            badgeClass = 'bg-[#FFF2F0] text-[#C75D4E] border-[#FFCCC7]';
                            statusLabel = 'Missing in 2B';
                          } else if (item.matchStatus === 'MISSING_IN_BOOKS') {
                            badgeClass = 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]';
                            statusLabel = 'Missing in Books';
                          } else if (item.matchStatus === 'VALUE_MISMATCH' || item.matchStatus === 'HEAD_MISMATCH') {
                            badgeClass = 'bg-[#FFF9E6] text-[#975A16] border-[#FFE79A]';
                            statusLabel = 'Value Mismatch';
                          } else if (item.matchStatus === 'PARTIAL_MATCH' || item.matchStatus === 'FUZZY_MATCH') {
                            badgeClass = 'bg-[#FAF4EB] text-[#8E6E53] border-[#EADAC5]';
                            statusLabel = 'Partial / Fuzzy';
                          }

                          return (
                            <tr
                              key={item.id}
                              className={`hover:bg-[#F9FAF8] transition-colors ${
                                isSelected ? 'bg-[#EDF3EF]/40' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const next = new Set(selectedItemIds);
                                    if (e.target.checked) next.add(item.id);
                                    else next.delete(item.id);
                                    setSelectedItemIds(next);
                                  }}
                                  className="rounded accent-[#2D4A3E]"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`}
                                >
                                  {statusLabel}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-[#1A2E25]">{item.vendorName || 'Supplier'}</div>
                                <div className="text-[10px] font-mono text-[#738276]">{item.gstin}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-mono font-semibold text-[#1A2E25]">
                                  {book?.invoiceNumber || '-'}
                                </div>
                                <div className="text-[10px] text-[#738276]">
                                  {book?.invoiceDate || ''}{' '}
                                  {book?.taxPeriod ? `(P: ${book.taxPeriod})` : ''}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-mono font-semibold text-[#1A2E25]">
                                  {g2b?.invoiceNumber || '-'}
                                </div>
                                <div className="text-[10px] text-[#738276]">
                                  {g2b?.invoiceDate || ''}{' '}
                                  {g2b?.taxPeriod ? `(P: ${g2b.taxPeriod})` : ''}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                {book?.taxableValue ? formatRupee(book.taxableValue) : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                {g2b?.taxableValue ? formatRupee(g2b.taxableValue) : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold">
                                {disc?.taxDiff ? (
                                  <span className="text-[#C75D4E]">{formatRupee(disc.taxDiff)}</span>
                                ) : (
                                  <span className="text-[#2D4A3E]">₹0</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-[11px] text-[#56655A] max-w-xs truncate">
                                {disc?.suggestedAction || 'Match confirmed for ITC availment.'}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  title="Delete this record permanently from user register"
                                  onClick={() => handleDeleteSingular(item)}
                                  className="p-1 text-[#738276] hover:text-[#C75D4E] hover:bg-[#FFF2F0] rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-[#FAFBF9] px-4 py-2 border-t border-[#E0E4DE] flex items-center justify-between text-[11px] text-[#56655A]">
                  <span>Showing {displayedItems.length} of {reconciledResult.items.length} reconciled invoices</span>
                  <span>Data permanently preserved under User ID: {currentUser?.uid || 'user-session'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F7F8F6] border-t border-[#E0E4DE] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#738276] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#8DA173]"></span>
            <span>All imported registers and manual reconciliation runs stay permanently in this user session.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#D5E2D9] bg-white hover:bg-[#F2F5F3] text-[#2D4A3E] rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
