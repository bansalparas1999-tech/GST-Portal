import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Download,
  UploadCloud,
  Play,
  Calendar,
  Building2,
  RefreshCw,
  User as UserIcon,
  Clock,
  ArrowRightLeft,
  ChevronDown,
  Edit2,
  FileText,
  FileSpreadsheet,
  CreditCard,
  Clipboard,
  Scale,
  Database,
  Layers,
  Globe,
  Check,
  Zap,
  Sliders,
  Archive,
  Menu,
  MoreVertical,
  Wrench,
} from 'lucide-react';
import { Language, UserProfile, PanEntity, PanGstinBranch } from '../types';
import { checkExtensionActive, triggerExtensionLogin } from '../utils/gstExtensionBridge';
import { ImportTabType } from './UploadModal';
import { translations } from '../utils/translations';
import { FINANCIAL_YEARS, GST_MONTHS, getMonthLabel } from '../utils/periodUtils';

interface HeaderProps {
  language: Language;
  selectedPeriod: string;
  setSelectedPeriod: (p: string) => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  onOpenUpload: (tab?: ImportTabType) => void;
  onRunMatch: () => void;
  onExport: () => void;
  onOpenAiAudit: () => void;
  onOpenProfile: () => void;
  onOpenAuth: () => void;
  onOpenClientSelector?: () => void;
  onOpenGstPortalLogin?: () => void;
  onOpenGstIncognitoDriver?: (gstin?: string, branch?: PanGstinBranch, entity?: PanEntity) => void;
  onOpenManualRecon?: () => void;
  onOpenManageRegisters?: () => void;
  onOpenMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
  booksCount?: number;
  gstr2bCount?: number;
  companyGstin: string;
  activePan?: string;
  activePanEntity?: PanEntity | null;
  activeGstinFilter?: string; // 'ALL' or specific GSTIN
  onSelectGstinFilter?: (gstin: string) => void;
  isMatching: boolean;
  activeTabTitle: string;
  currentUser: UserProfile | null;
}

export { FINANCIAL_YEARS };

export const Header: React.FC<HeaderProps> = ({
  language,
  selectedPeriod,
  setSelectedPeriod,
  selectedMonth,
  setSelectedMonth,
  onOpenUpload,
  onRunMatch,
  onExport,
  onOpenAiAudit,
  onOpenProfile,
  onOpenAuth,
  onOpenClientSelector,
  onOpenGstPortalLogin,
  onOpenGstIncognitoDriver,
  onOpenManualRecon,
  onOpenManageRegisters,
  onOpenMobileSidebar,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  booksCount = 0,
  gstr2bCount = 0,
  companyGstin,
  activePan = 'AABCA1234F',
  activePanEntity,
  activeGstinFilter = 'ALL',
  onSelectGstinFilter,
  isMatching,
  activeTabTitle,
  currentUser,
}) => {
  const t = translations[language];
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  const activeCompanyName = activePanEntity?.legalName || currentUser?.companyName || 'Apex Audit & Taxation Advisory LLP';
  const displayPan = activePan || activePanEntity?.pan || companyGstin?.slice(2, 12) || 'AABCA1234F';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
        setIsImportMenuOpen(false);
      }
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setIsBranchDropdownOpen(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setIsToolsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectImport = (tab: ImportTabType) => {
    setIsImportMenuOpen(false);
    onOpenUpload(tab);
  };

  const branches = activePanEntity?.branches || [];

  const selectedGstinList: string[] = React.useMemo(() => {
    if (!activeGstinFilter || activeGstinFilter === 'ALL') {
      return branches.map((b) => b.gstin);
    }
    return activeGstinFilter.split(',').map((g) => g.trim().toUpperCase()).filter(Boolean);
  }, [activeGstinFilter, branches]);

  const isAllSelected = activeGstinFilter === 'ALL' || (branches.length > 0 && selectedGstinList.length === branches.length);
  const currentBranch = branches.length === 1 ? branches[0] : branches.find((b) => b.gstin === activeGstinFilter);

  const handleToggleGstin = (gstin: string, e?: React.MouseEvent | React.ChangeEvent) => {
    if (e) e.stopPropagation();
    if (!onSelectGstinFilter) return;

    const allGstins = branches.map((b) => b.gstin);
    if (isAllSelected) {
      // Unchecking this GSTIN leaves the remaining ones selected
      const remaining = allGstins.filter((g) => g !== gstin);
      if (remaining.length === 0) {
        onSelectGstinFilter('ALL');
      } else {
        onSelectGstinFilter(remaining.join(','));
      }
    } else {
      if (selectedGstinList.includes(gstin)) {
        // Uncheck
        const remaining = selectedGstinList.filter((g) => g !== gstin);
        if (remaining.length === 0) {
          onSelectGstinFilter('ALL');
        } else {
          onSelectGstinFilter(remaining.join(','));
        }
      } else {
        // Check
        const updated = [...selectedGstinList, gstin];
        if (updated.length === allGstins.length) {
          onSelectGstinFilter('ALL');
        } else {
          onSelectGstinFilter(updated.join(','));
        }
      }
    }
  };

  const handleSelectOnly = (gstin: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectGstinFilter) onSelectGstinFilter(gstin);
  };

  const handleSelectAllBranches = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onSelectGstinFilter) onSelectGstinFilter('ALL');
  };

  const handleDeselectAllBranches = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (onSelectGstinFilter && branches.length > 0) {
      // Default to first branch if deselecting all
      onSelectGstinFilter(branches[0].gstin);
    }
  };

  return (
    <header
      id="main-header"
      className="min-h-16 py-2 bg-white border-b border-[#E0E4DE] flex items-center justify-between px-3 sm:px-6 shrink-0 shadow-xs z-20 gap-2"
    >
      {/* Title & Context */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Menu Toggle */}
        {onOpenMobileSidebar && (
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-1.5 rounded-lg text-[#56655A] hover:bg-[#EDF3EF] hover:text-[#1A2E25] transition-colors cursor-pointer shrink-0"
            title="Open Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Desktop Sidebar Toggle */}
        {onToggleSidebarCollapse && (
          <button
            type="button"
            onClick={onToggleSidebarCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-[#738276] hover:bg-[#EDF3EF] hover:text-[#1A2E25] transition-colors cursor-pointer shrink-0"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-[#1A2E25] tracking-tight truncate leading-tight">
              {activeTabTitle}
            </h2>
            {currentUser && (
              <span className="hidden xl:inline-flex items-center gap-1.5 text-xs text-[#56655A] font-medium">
                <span className="text-[#8DA173]">/</span>
                <span className="font-mono text-[#2D4A3E] font-semibold">{selectedPeriod}</span>
                <span className="text-[#8DA173]">·</span>
                <span>{getMonthLabel(selectedMonth)}</span>
              </span>
            )}
          </div>

          {/* Subtitle / Financial Year & Month / Entity */}
          {currentUser ? (
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs text-[#738276] mt-0.5">
              {/* Financial Year Selector */}
              <span className="flex items-center gap-1 text-[11px]">
                <Calendar className="w-3 h-3 text-[#8DA173]" />
              <span className="text-[11px] font-semibold text-[#56655A]">FY:</span>
              <select
                id="period-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-[#F1F3EE] border border-[#E0E4DE] text-xs font-bold text-[#2D4A3E] hover:text-[#1A2E25] px-2 py-0.5 rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
              >
                {FINANCIAL_YEARS.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </span>

            <span>•</span>

            {/* Return Period (Month) Selector */}
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#8DA173]" />
              <span className="text-[11px] font-semibold text-[#56655A]">Tax Period:</span>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-[#F1F3EE] border border-[#E0E4DE] text-xs font-bold text-[#2D4A3E] hover:text-[#1A2E25] px-2 py-0.5 rounded-md cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
              >
                {GST_MONTHS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.key === 'ALL' ? 'All Months (Full FY)' : `${m.label} (${m.quarter})`}
                  </option>
                ))}
              </select>
            </span>

            <span>•</span>

              {/* Active PAN Entity with Multi-Branch Dropdown Switcher */}
            <div className="relative" ref={branchDropdownRef}>
              <button
                id="btn-active-entity-switcher"
                type="button"
                onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                className="flex items-center gap-1.5 text-[11px] bg-[#EDF3EF] hover:bg-[#E2ECE5] px-2.5 py-0.5 rounded-md border border-[#D5E2D9] transition-colors cursor-pointer text-left"
              >
                <Building2 className="w-3.5 h-3.5 text-[#8DA173] shrink-0" />
                <span className="font-semibold text-[#1A2E25] truncate max-w-[130px] sm:max-w-[190px]">
                  {activeCompanyName}
                </span>
                <span className="font-mono font-bold text-[#2D4A3E]">
                  PAN: {displayPan}
                </span>
                <span className="text-[10px] bg-[#2D4A3E] text-white px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                  {branches.length === 0 ? (
                    <span>PAN Only (0 GSTINs)</span>
                  ) : isAllSelected ? (
                    <span>All GSTINs ({branches.length})</span>
                  ) : selectedGstinList.length === 1 ? (
                    <span>
                      {currentBranch
                        ? `${currentBranch.stateCode}-${currentBranch.stateName.slice(0, 8)}`
                        : `${selectedGstinList[0].slice(0, 2)}-Branch`}
                    </span>
                  ) : (
                    <span>{selectedGstinList.length} GSTINs Selected</span>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </span>
              </button>

              {/* Branch Selector Dropdown Menu */}
              {isBranchDropdownOpen && (
                <div className="absolute left-0 mt-1.5 w-88 sm:w-96 bg-white rounded-xl border border-[#E0E4DE] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-[#F1F3EE] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#738276] block">
                        PAN Entity Branches ({displayPan})
                      </span>
                      <span className="text-[11px] font-bold text-[#2D4A3E]">
                        {isAllSelected
                          ? `All ${branches.length} Branches Active`
                          : `${selectedGstinList.length} of ${branches.length} GSTIN(s) Selected`}
                      </span>
                    </div>

                    {branches.length > 0 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={handleSelectAllBranches}
                          className="px-2 py-0.5 text-[10px] font-bold bg-[#EDF3EF] hover:bg-[#D5E2D9] text-[#2D4A3E] rounded transition-colors cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllBranches}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-[#D5E2D9] hover:bg-[#F7F8F6] text-[#56655A] rounded transition-colors cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {branches.length === 0 ? (
                    <div className="p-3 text-center space-y-2">
                      <div className="text-xs font-semibold text-[#56655A]">
                        No active GSTIN branches registered under this PAN.
                      </div>
                      <p className="text-[10px] text-[#738276]">
                        Currently operating in PAN-only / Non-GST (URP) mode.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsBranchDropdownOpen(false);
                          if (onOpenClientSelector) onOpenClientSelector();
                        }}
                        className="w-full py-1.5 bg-[#2D4A3E] text-white text-xs font-bold rounded-lg hover:bg-[#1E362C] transition-colors cursor-pointer"
                      >
                        + Add State GSTIN Branch
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* All GSTINs Consolidated Option with Checkbox */}
                      <div
                        onClick={handleSelectAllBranches}
                        className={`px-3 py-2 text-left text-xs font-semibold hover:bg-[#EDF3EF] flex items-center justify-between transition-colors cursor-pointer border-b border-[#F1F3EE] ${
                          isAllSelected ? 'bg-[#EDF3EF]/70 text-[#2D4A3E] font-bold' : 'text-[#1A2E25]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            onChange={handleSelectAllBranches}
                            className="w-4 h-4 text-[#2D4A3E] rounded border-[#8DA173] focus:ring-2 focus:ring-[#8DA173] cursor-pointer accent-[#2D4A3E]"
                          />
                          <Globe className="w-4 h-4 text-[#8DA173] shrink-0" />
                          <div>
                            <div className="font-bold">🌐 All GSTINs (Consolidated Entity Level)</div>
                            <div className="text-[10px] text-[#738276]">Combined audit across all {branches.length} branches</div>
                          </div>
                        </div>
                        {isAllSelected && <Check className="w-4 h-4 text-[#2D4A3E] shrink-0" />}
                      </div>

                      {/* Individual Branches List with Checkbox in Front of Each GSTIN */}
                      <div className="max-h-56 overflow-y-auto divide-y divide-[#F1F3EE]">
                        {branches.map((b) => {
                          const isSelected = selectedGstinList.includes(b.gstin);
                          return (
                            <div
                              key={b.gstin}
                              onClick={(e) => handleToggleGstin(b.gstin, e)}
                              className={`px-3 py-2 text-left text-xs hover:bg-[#EDF3EF] flex items-center justify-between transition-colors cursor-pointer select-none ${
                                isSelected ? 'bg-[#F7FAF8] text-[#1A2E25]' : 'opacity-65 hover:opacity-100'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                {/* Checkbox in Front of GSTIN */}
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => handleToggleGstin(b.gstin, e)}
                                  className="w-4 h-4 text-[#2D4A3E] rounded border-[#8DA173] focus:ring-2 focus:ring-[#8DA173] cursor-pointer shrink-0 accent-[#2D4A3E]"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold text-[11px] text-[#2D4A3E]">{b.gstin}</span>
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#EDF3EF] font-bold text-[#2D4A3E]">
                                      {b.stateCode}-{b.stateName}
                                    </span>
                                    {b.isPrincipal && (
                                      <span className="text-[8px] px-1 py-0.2 rounded bg-[#2D4A3E] text-white font-bold uppercase">
                                        HQ
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-[#738276] truncate mt-0.5">
                                    {b.tradeName || b.legalName}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => handleSelectOnly(b.gstin, e)}
                                  className="px-2 py-0.5 text-[10px] font-bold text-[#2D4A3E] hover:bg-[#D5E2D9] rounded border border-[#D5E2D9] transition-colors cursor-pointer"
                                  title="Select only this GSTIN"
                                >
                                  Only
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div className="border-t border-[#F1F3EE] pt-1 mt-1 space-y-0.5">
                    {onOpenGstIncognitoDriver && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsBranchDropdownOpen(false);
                          const activeBranch = branches.find(b => b.gstin === activeGstinFilter) || branches[0] || null;
                          const targetG = activeGstinFilter !== 'ALL' ? activeGstinFilter : companyGstin;
                          if (checkExtensionActive()) {
                            triggerExtensionLogin(targetG, activeBranch?.portalUsername, activeBranch?.portalPassword);
                          } else {
                            onOpenGstIncognitoDriver(targetG, activeBranch, activePanEntity);
                          }
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs font-bold text-white bg-[#1A2E25] hover:bg-[#2D4A3E] rounded-lg flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Zap className="w-3.5 h-3.5 text-[#8DA173] animate-pulse" />
                          <span>⚡ GST Incognito Auto-Login</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.2 bg-[#8DA173] text-white rounded font-bold">
                          Auto-Type
                        </span>
                      </button>
                    )}

                    {onOpenGstPortalLogin && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsBranchDropdownOpen(false);
                          onOpenGstPortalLogin();
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs font-bold text-[#2D4A3E] hover:bg-[#EDF3EF] flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-[#8DA173]" />
                          <span>GST Portal Manual Vault & OCR...</span>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.2 bg-[#8DA173] text-white rounded font-bold">
                          Gov Portal
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsBranchDropdownOpen(false);
                        if (onOpenClientSelector) onOpenClientSelector();
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs font-bold text-[#2D4A3E] hover:bg-[#EDF3EF] flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#8DA173]" />
                      <span>Manage Entity, Import Excel or Switch PAN...</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-[#738276] mt-0.5">
            <span>Statutory GST Input Tax Credit (ITC) Reconciliation & Section 16(2)(aa) Governance</span>
          </div>
        )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {currentUser ? (
          <>
            {/* Unified Import Button with Options Dropdown */}
            <div className="relative" ref={importMenuRef}>
              <div className="flex items-center rounded-lg border border-[#D5E2D9] bg-[#F1F3EE] hover:bg-[#E6EAE2] transition-colors overflow-hidden">
                <button
                  id="btn-import-header-main"
                  type="button"
                  onClick={() => handleSelectImport('pdf')}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[#2D4A3E] font-semibold text-xs cursor-pointer hover:text-[#1A2E25]"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-[#2D4A3E]" />
                  <span className="hidden sm:inline">{t.importFiles}</span>
                  <span className="sm:hidden">Import</span>
                </button>
                <button
                  id="btn-import-header-dropdown"
                  type="button"
                  onClick={() => setIsImportMenuOpen(!isImportMenuOpen)}
                  aria-label="Import Options"
                  className="px-1 py-1.5 border-l border-[#D5E2D9] text-[#2D4A3E] hover:bg-[#D5E2D9] transition-colors cursor-pointer"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>

              {/* Import Options Dropdown Menu */}
              {isImportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl border border-[#E0E4DE] shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 border-b border-[#F1F3EE] text-[10px] font-bold uppercase tracking-wider text-[#738276]">
                    Choose Import Source
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectImport('pdf')}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-[#1A2E25] hover:bg-[#EDF3EF] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#EDF3EF] flex items-center justify-center text-[#8DA173]">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold">Scanned Invoices (AI OCR)</div>
                      <div className="text-[10px] text-[#738276]">Multi-page PDF & paper bills</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectImport('zip_2b')}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-[#1A2E25] hover:bg-[#EDF3EF] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#2D4A3E] flex items-center justify-center text-[#8DA173]">
                      <Archive className="w-3.5 h-3.5 text-[#8DA173]" />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>Bulk GSTR-2B ZIP Archive</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#8DA173] text-white font-bold">
                          Multi-Period
                        </span>
                      </div>
                      <div className="text-[10px] text-[#738276]">Upload ZIP with multiple 2B JSONs</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectImport('files')}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-[#1A2E25] hover:bg-[#EDF3EF] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#EDF3EF] flex items-center justify-center text-[#2D4A3E]">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold">Purchase Register & GSTR-2B</div>
                      <div className="text-[10px] text-[#738276]">Books register & portal GSTR-2B</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectImport('sales_import')}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-[#1A2E25] hover:bg-[#EDF3EF] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#EDF3EF] flex items-center justify-center text-[#2D4A3E]">
                      <Clipboard className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold">Sales Register & GSTR-1</div>
                      <div className="text-[10px] text-[#738276]">Outward supplies & debtor ledgers</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectImport('bank')}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-[#1A2E25] hover:bg-[#EDF3EF] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#EDF3EF] flex items-center justify-center text-[#2D4A3E]">
                      <CreditCard className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold">Bank Statement & Transactions</div>
                      <div className="text-[10px] text-[#738276]">Automated payment categorization</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectImport('paste')}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-[#1A2E25] hover:bg-[#EDF3EF] flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#EDF3EF] flex items-center justify-center text-[#56655A]">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold">Quick Paste / Raw Text</div>
                      <div className="text-[10px] text-[#738276]">Paste CSV, TSV or JSON data</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Run Match Button (Primary Green) */}
            <button
              id="btn-run-match"
              type="button"
              onClick={onRunMatch}
              disabled={isMatching}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-semibold text-xs transition-all shadow-xs cursor-pointer ${
                isMatching
                  ? 'bg-[#3D5C4F] cursor-wait'
                  : 'bg-[#2D4A3E] hover:bg-[#1E362C] active:scale-98'
              }`}
            >
              {isMatching ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#8DA173]" />
                  <span className="hidden sm:inline">Matching...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current text-[#8DA173]" />
                  <span>{t.runMatch}</span>
                </>
              )}
            </button>

            {/* Quick Tools Dropdown Menu (Consolidates secondary tools to prevent horizontal overflow on standard screen resolutions) */}
            <div className="relative" ref={toolsMenuRef}>
              <button
                id="btn-tools-dropdown"
                type="button"
                onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#D5E2D9] bg-white hover:bg-[#F2F5F3] text-[#2D4A3E] font-semibold text-xs transition-colors cursor-pointer shadow-2xs"
                title="Reconciliation Tools & Export"
              >
                <Wrench className="w-3.5 h-3.5 text-[#5C7243]" />
                <span className="hidden md:inline">Tools</span>
                <ChevronDown className="w-3 h-3 text-[#738276]" />
              </button>

              {isToolsMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-xl border border-[#E0E4DE] shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 border-b border-[#F1F3EE] text-[10px] font-bold uppercase tracking-wider text-[#738276]">
                    Recon & Export Tools
                  </div>

                  {onOpenManualRecon && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenManualRecon();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-[#1A2E25] hover:bg-[#EDF3EF] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Sliders className="w-3.5 h-3.5 text-[#8DA173]" />
                        <span>Manual Period Recon</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#2D4A3E] text-white rounded font-mono font-bold">
                        022022-26
                      </span>
                    </button>
                  )}

                  {onOpenManageRegisters && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenManageRegisters();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-[#1A2E25] hover:bg-[#EDF3EF] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-[#5C7243]" />
                        <span>Stored Registers</span>
                      </div>
                      <span className="text-[9px] font-mono bg-[#EDF3EF] px-1 py-0.2 rounded text-[#2D4A3E] font-bold">
                        B:{booksCount} | 2B:{gstr2bCount}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      onOpenAiAudit();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-[#1A2E25] hover:bg-[#EDF3EF] flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#D9A14E]" />
                      <span>AI Audit Report</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 bg-[#D9A14E] text-white rounded font-bold">
                      Smart
                    </span>
                  </button>

                  {onOpenGstPortalLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsToolsMenuOpen(false);
                        onOpenGstPortalLogin();
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold text-[#1A2E25] hover:bg-[#EDF3EF] flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-[#8DA173]" />
                        <span>GST Portal Login</span>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#8DA173] text-white rounded font-bold">
                        Captcha
                      </span>
                    </button>
                  )}

                  <div className="border-t border-[#F1F3EE] my-1" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsToolsMenuOpen(false);
                      onExport();
                    }}
                    className="w-full px-3 py-2 text-left text-xs font-semibold text-[#2D4A3E] hover:bg-[#EDF3EF] flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-3.5 h-3.5 text-[#2D4A3E]" />
                      <span>Export Reconciliation (CSV)</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Profile Avatar / Trigger */}
            <button
              id="btn-profile-trigger"
              type="button"
              onClick={onOpenProfile}
              title="View Profile & Settings"
              className="w-8 h-8 rounded-xl bg-[#2D4A3E] text-white flex items-center justify-center font-bold text-xs hover:bg-[#1E362C] transition-all shadow-xs cursor-pointer shrink-0"
            >
              {currentUser.displayName ? (
                currentUser.displayName.slice(0, 2).toUpperCase()
              ) : (
                <UserIcon className="w-4 h-4 text-[#8DA173]" />
              )}
            </button>
          </>
        ) : (
          <button
            id="btn-login-trigger"
            type="button"
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#2D4A3E] text-white font-bold text-xs hover:bg-[#1E362C] transition-all shadow-xs cursor-pointer"
          >
            <UserIcon className="w-3.5 h-3.5 text-[#8DA173]" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
