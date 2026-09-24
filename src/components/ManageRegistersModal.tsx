import React, { useState, useMemo } from 'react';
import {
  X,
  Trash2,
  Database,
  Calendar,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  UploadCloud,
  Sparkles,
  Download,
  Info,
  Archive,
} from 'lucide-react';
import { InvoiceRecord, UserProfile, Language } from '../types';
import { extractRecordPeriodMMYYYY, formatMMYYYYLabel } from '../utils/periodUtils';

interface ManageRegistersModalProps {
  isOpen: boolean;
  onClose: () => void;
  booksData: InvoiceRecord[];
  gstr2bData: InvoiceRecord[];
  currentUser: UserProfile | null;
  companyGstin: string;
  onDeleteSingular: (id: string, source: 'books' | 'gstr2b') => void;
  onDeleteBatch: (ids: string[], source: 'books' | 'gstr2b') => void;
  onClearAll: (target: 'books' | 'gstr2b' | 'both') => void;
  onOpenUpload?: (tab?: any) => void;
  onLoadMultiPeriodSample?: () => void;
  language?: Language;
}

export const ManageRegistersModal: React.FC<ManageRegistersModalProps> = ({
  isOpen,
  onClose,
  booksData,
  gstr2bData,
  currentUser,
  companyGstin,
  onDeleteSingular,
  onDeleteBatch,
  onClearAll,
  onOpenUpload,
  onLoadMultiPeriodSample,
  language = 'en',
}) => {
  const [activeTab, setActiveTab] = useState<'books' | 'gstr2b'>('books');
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  const currentRecords = activeTab === 'books' ? (booksData || []) : (gstr2bData || []);

  // Extract unique periods available in this register
  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    currentRecords.forEach((r) => {
      const p = extractRecordPeriodMMYYYY(r);
      if (p) set.add(p);
    });
    return Array.from(set).sort();
  }, [currentRecords]);

  // Filter records
  const filteredRecords = useMemo(() => {
    return currentRecords.filter((rec) => {
      // Period filter
      if (periodFilter !== 'ALL') {
        const p = extractRecordPeriodMMYYYY(rec);
        if (p !== periodFilter) return false;
      }

      // Search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const vendor = (rec.vendorName || '').toLowerCase();
      const gstin = (rec.gstin || '').toLowerCase();
      const inv = (rec.invoiceNumber || '').toLowerCase();
      return vendor.includes(q) || gstin.includes(q) || inv.includes(q);
    });
  }, [currentRecords, periodFilter, searchQuery]);

  const formatRupee = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const totalTaxable = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (r.taxableValue || 0), 0);
  }, [filteredRecords]);

  const totalTax = useMemo(() => {
    return filteredRecords.reduce((sum, r) => sum + (r.totalTax || 0), 0);
  }, [filteredRecords]);

  if (!isOpen) return null;

  // Handle single deletion
  const handleDeleteSingularClick = (id: string, invNum: string) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Invoice ${invNum}?`,
      description: `Are you sure you want to permanently delete Invoice ${invNum} from your ${
        activeTab === 'books' ? 'Purchase Register (Books)' : 'GSTR-2B'
      }? This record will be permanently deleted.`,
      confirmText: 'Yes, Delete Invoice',
      onConfirm: () => {
        onDeleteSingular(id, activeTab);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setConfirmDialog(null);
      },
    });
  };

  // Handle bulk deletion
  const handleDeleteSelectedClick = () => {
    if (selectedIds.size === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: `Delete ${selectedIds.size} Selected Invoices?`,
      description: `Are you sure you want to permanently delete ${selectedIds.size} selected invoices from your ${
        activeTab === 'books' ? 'Purchase Register (Books)' : 'GSTR-2B'
      }?`,
      confirmText: `Yes, Delete ${selectedIds.size} Invoices`,
      onConfirm: () => {
        onDeleteBatch(Array.from(selectedIds), activeTab);
        setSelectedIds(new Set());
        setConfirmDialog(null);
      },
    });
  };

  // Handle clear entire register
  const handleClearCurrentRegisterClick = () => {
    const name = activeTab === 'books' ? 'Purchase Register (Books)' : 'GSTR-2B Portal Records';
    setConfirmDialog({
      isOpen: true,
      title: `Clear Entire ${name}?`,
      description: `CRITICAL ACTION: Are you sure you want to permanently delete ALL ${currentRecords.length} records from ${name}? This action cannot be undone.`,
      confirmText: `Yes, Clear All ${currentRecords.length} Records`,
      onConfirm: () => {
        onClearAll(activeTab);
        setSelectedIds(new Set());
        setConfirmDialog(null);
      },
    });
  };

  const handleClearBothRegistersClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Permanently Wipe Both Registers?',
      description: `CRITICAL WARNING: This will permanently delete ALL ${booksData.length} Purchase Register invoices AND ALL ${gstr2bData.length} GSTR-2B invoices for this User ID. All records will be wiped.`,
      confirmText: `Yes, Wipe Both Registers (${booksData.length + gstr2bData.length} Invoices)`,
      onConfirm: () => {
        onClearAll('both');
        setSelectedIds(new Set());
        setConfirmDialog(null);
      },
    });
  };

  return (
    <div
      id="manage-registers-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
    >
      <div
        id="manage-registers-card"
        className="bg-white w-full max-w-5xl rounded-2xl border border-[#E0E4DE] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
      >
        {/* Header */}
        <div className="bg-[#2D4A3E] text-white p-5 flex items-center justify-between border-b border-[#233B31] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8DA173] text-white flex items-center justify-center font-bold shadow-xs">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  User ID Register Storage & Deletion Manager
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8DA173]/25 border border-[#8DA173]/40 text-[#D3E4D6] font-semibold">
                  Permanent Cloud Storage
                </span>
              </div>
              <p className="text-xs text-[#D3DCD6] mt-0.5">
                Invoices imported under your User ID stay permanently preserved. Delete records singularly or at once.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#D3DCD6] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Session Metadata Banner */}
        <div className="bg-[#EDF3EF] px-5 py-2.5 border-b border-[#D5E2D9] flex flex-wrap items-center justify-between gap-3 text-xs text-[#2D4A3E] shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-[#56655A]">Persistent User ID:</span>{' '}
              <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#D5E2D9] text-[#1A2E25]">
                {currentUser?.uid || 'user-default-session'}
              </span>
            </div>
            <div>
              <span className="text-[#56655A]">Account:</span>{' '}
              <span className="font-semibold">{currentUser?.email || currentUser?.displayName || 'Active User'}</span>
            </div>
            <div>
              <span className="text-[#56655A]">GSTIN:</span>{' '}
              <span className="font-mono font-bold">{companyGstin}</span>
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
                <span>Load Sample Data (022022 - 022026)</span>
              </button>
            )}
            {onOpenUpload && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenUpload('zip_2b');
                  }}
                  className="px-2.5 py-1 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Archive className="w-3 h-3 text-[#8DA173]" />
                  <span>+ Upload GSTR-2B ZIP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenUpload('files');
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-[#F7F8F6] border border-[#D5E2D9] text-[#2D4A3E] rounded text-[11px] font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <UploadCloud className="w-3 h-3 text-[#8DA173]" />
                  <span>+ Import Files / Books</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="p-4 bg-[#FAFBF9] border-b border-[#E0E4DE] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('books');
                setSelectedIds(new Set());
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'books'
                  ? 'bg-[#2D4A3E] text-white shadow-xs'
                  : 'bg-white border border-[#E0E4DE] text-[#56655A] hover:bg-[#F2F5F3]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Purchase Register (Internal Books)</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'books' ? 'bg-white/20 text-white' : 'bg-[#EDF3EF] text-[#2D4A3E]'
                }`}
              >
                {booksData.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('gstr2b');
                setSelectedIds(new Set());
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'gstr2b'
                  ? 'bg-[#2D4A3E] text-white shadow-xs'
                  : 'bg-white border border-[#E0E4DE] text-[#56655A] hover:bg-[#F2F5F3]'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>GSTR-2B Statement (GST Portal)</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'gstr2b' ? 'bg-white/20 text-white' : 'bg-[#EDF3EF] text-[#2D4A3E]'
                }`}
              >
                {gstr2bData.length}
              </span>
            </button>
          </div>

          {/* Destructive Actions at once */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleDeleteSelectedClick}
                className="px-3 py-1.5 bg-[#FFF2F0] hover:bg-[#FFEAE6] border border-[#FFCCC7] text-[#C75D4E] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            )}

            {currentRecords.length > 0 && (
              <button
                type="button"
                onClick={handleClearCurrentRegisterClick}
                className="px-3 py-1.5 bg-white hover:bg-[#FFF2F0] border border-[#E0E4DE] hover:border-[#FFCCC7] text-[#C75D4E] rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All {activeTab === 'books' ? 'Books' : 'GSTR-2B'} at Once</span>
              </button>
            )}

            {(booksData.length > 0 || gstr2bData.length > 0) && (
              <button
                type="button"
                onClick={handleClearBothRegistersClick}
                title="Wipe both registers completely"
                className="px-2.5 py-1.5 bg-[#FFF2F0] hover:bg-[#FFEAE6] border border-[#FFCCC7] text-[#A8071A] rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Clear All Registers (Both)</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-white border-b border-[#E0E4DE] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#738276] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vendor, GSTIN, invoice..."
                className="pl-8 pr-3 py-1.5 text-xs border border-[#D5E2D9] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8DA173] w-64 bg-[#FDFDFC]"
              />
            </div>

            {availablePeriods.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[#56655A] font-medium">Period (MMYYYY):</span>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-[#D5E2D9] rounded-lg bg-[#FAFBF9] text-[#2D4A3E] font-mono font-semibold"
                >
                  <option value="ALL">All Periods ({availablePeriods.length} cycles)</option>
                  {availablePeriods.map((p) => (
                    <option key={p} value={p}>
                      {formatMMYYYYLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="text-xs text-[#56655A] flex items-center gap-3">
            <span>
              Showing <strong>{filteredRecords.length}</strong> of {currentRecords.length} records
            </span>
            <span>•</span>
            <span>
              Taxable: <strong>{formatRupee(totalTaxable)}</strong>
            </span>
            <span>•</span>
            <span>
              Total Tax: <strong className="text-[#2D4A3E]">{formatRupee(totalTax)}</strong>
            </span>
          </div>
        </div>

        {/* Invoices List Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredRecords.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#EDF3EF] text-[#2D4A3E] flex items-center justify-center mx-auto">
                <Database className="w-6 h-6 text-[#8DA173]" />
              </div>
              <h3 className="text-sm font-bold text-[#1A2E25]">No Invoices in this Register</h3>
              <p className="text-xs text-[#738276] max-w-md mx-auto">
                {currentRecords.length === 0
                  ? `Your ${activeTab === 'books' ? 'Purchase Register' : 'GSTR-2B'} is currently empty. Invoices imported here stay permanently under your User ID.`
                  : 'No invoices match your current search or period filter.'}
              </p>
              {currentRecords.length === 0 && onLoadMultiPeriodSample && (
                <button
                  type="button"
                  onClick={onLoadMultiPeriodSample}
                  className="px-4 py-2 bg-[#2D4A3E] hover:bg-[#1A2E25] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#8DA173]" />
                  <span>Load Sample Datasets (022022 to 022026)</span>
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#FAFBF9] text-[#2D4A3E] font-bold border-b border-[#E0E4DE] sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={
                        filteredRecords.length > 0 &&
                        filteredRecords.every((r) => selectedIds.has(r.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      className="rounded accent-[#2D4A3E]"
                    />
                  </th>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Invoice Number</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Supplier GSTIN & Name</th>
                  <th className="py-2.5 px-3 text-right">Taxable Value</th>
                  <th className="py-2.5 px-3 text-right">IGST</th>
                  <th className="py-2.5 px-3 text-right">CGST + SGST</th>
                  <th className="py-2.5 px-3 text-right">Total Tax</th>
                  <th className="py-2.5 px-3 text-right">Invoice Value</th>
                  <th className="py-2.5 px-3 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2EF]">
                {filteredRecords.map((rec) => {
                  const isSelected = selectedIds.has(rec.id);
                  const period = extractRecordPeriodMMYYYY(rec);
                  return (
                    <tr
                      key={rec.id}
                      className={`hover:bg-[#F9FAF8] transition-colors ${
                        isSelected ? 'bg-[#EDF3EF]/40' : ''
                      }`}
                    >
                      <td className="py-2 px-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const next = new Set(selectedIds);
                            if (e.target.checked) next.add(rec.id);
                            else next.delete(rec.id);
                            setSelectedIds(next);
                          }}
                          className="rounded accent-[#2D4A3E]"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-mono font-bold text-[11px] bg-[#EDF3EF] text-[#2D4A3E] px-2 py-0.5 rounded border border-[#D5E2D9]">
                          {period || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-[#1A2E25]">
                        {rec.invoiceNumber}
                      </td>
                      <td className="py-2 px-3 text-[#56655A]">{rec.invoiceDate}</td>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-[#1A2E25]">{rec.vendorName}</div>
                        <div className="text-[10px] font-mono text-[#738276]">{rec.gstin}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {formatRupee(rec.taxableValue)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#56655A]">
                        {rec.igst ? formatRupee(rec.igst) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-[#56655A]">
                        {rec.cgst || rec.sgst ? formatRupee((rec.cgst || 0) + (rec.sgst || 0)) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#2D4A3E]">
                        {formatRupee(rec.totalTax)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {formatRupee(rec.invoiceValue)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          title="Delete this invoice singularly"
                          onClick={() => handleDeleteSingularClick(rec.id, rec.invoiceNumber)}
                          className="p-1.5 text-[#738276] hover:text-[#C75D4E] hover:bg-[#FFF2F0] rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F7F8F6] border-t border-[#E0E4DE] flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-[#56655A] flex items-center gap-1.5">
            <Info className="w-4 h-4 text-[#8DA173] shrink-0" />
            <span>
              Invoices deleted here are permanently removed from both cloud Firestore and local session.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#2D4A3E] hover:bg-[#1A2E25] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* In-Modal Confirmation Dialog (Bypasses iframe window.confirm restrictions) */}
        {confirmDialog && confirmDialog.isOpen && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#FFCCC7] shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-[#A8071A]">
                <div className="w-10 h-10 rounded-xl bg-[#FFF2F0] border border-[#FFCCC7] flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-[#C75D4E]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1A2E25]">
                    {confirmDialog.title}
                  </h3>
                  <span className="text-[11px] text-[#A8071A] font-semibold">
                    Permanent Deletion Action
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#56655A] leading-relaxed bg-[#FFF2F0]/50 p-3 rounded-xl border border-[#FFEAE6]">
                {confirmDialog.description}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 bg-white hover:bg-[#F7F8F6] border border-[#D5E2D9] text-[#2D4A3E] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 bg-[#A8071A] hover:bg-[#820014] text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{confirmDialog.confirmText}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
