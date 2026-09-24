import React, { useRef } from 'react';
import {
  Home,
  LayoutDashboard,
  FileSpreadsheet,
  TrendingUp,
  ShieldAlert,
  MailWarning,
  Layers,
  ShieldCheck,
  Scale,
  FileText,
  Sliders,
  Database,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/translations';

interface AppTabBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  counts: {
    missing2b: number;
    mismatches: number;
  };
  isSidebarCollapsed: boolean;
  onToggleSidebarCollapse: () => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
  onOpenManualRecon?: () => void;
  onOpenManageRegisters?: () => void;
}

export const AppTabBar: React.FC<AppTabBarProps> = ({
  activeTab,
  setActiveTab,
  language,
  counts,
  isSidebarCollapsed,
  onToggleSidebarCollapse,
  isFocusMode,
  onToggleFocusMode,
  onOpenManualRecon,
  onOpenManageRegisters,
}) => {
  const t = translations[language];
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const tabs = [
    {
      id: 'home',
      label: language === 'hi' ? 'होम' : 'Home',
      icon: Home,
    },
    {
      id: 'dashboard',
      label: language === 'hi' ? 'डैशबोर्ड' : 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'purchase_recon',
      label: language === 'hi' ? 'पर्चेज़ बनाम 2B' : 'Purchase Recon (2B)',
      icon: FileSpreadsheet,
      badge: counts.missing2b > 0 ? counts.missing2b : undefined,
      badgeColor: 'bg-[#C75D4E] text-white',
    },
    {
      id: 'sales_recon',
      label: language === 'hi' ? 'सेल्स बनाम GSTR-1' : 'Sales Recon (GSTR-1)',
      icon: TrendingUp,
    },
    {
      id: 'discrepancy_report',
      label: language === 'hi' ? 'विसंगति रिपोर्ट' : 'Gap & Discrepancies',
      icon: ShieldAlert,
      badge: counts.mismatches > 0 ? counts.mismatches : undefined,
      badgeColor: 'bg-[#C75D4E] text-white',
    },
    {
      id: 'vendor_notices',
      label: language === 'hi' ? 'ITC नोटिस' : 'Supplier ITC Notices',
      icon: MailWarning,
    },
    {
      id: 'gstr1_summary',
      label: language === 'hi' ? 'GSTR-1 व HSN' : 'GSTR-1 & HSN',
      icon: Layers,
    },
    {
      id: 'gst_verification',
      label: language === 'hi' ? 'GST सत्यापन' : 'GST Status & PAN',
      icon: ShieldCheck,
    },
    {
      id: 'gst_legal_bot',
      label: language === 'hi' ? 'GST लीगल AI' : 'GST Legal AI (Notice Drafter)',
      icon: Scale,
      badge: 'AI',
      badgeColor: 'bg-[#2D5A43] text-white',
    },
    {
      id: 'accounting',
      label: language === 'hi' ? 'खाते व P&L' : 'Accounts & Ledgers',
      icon: Scale,
    },
    {
      id: 'templates',
      label: language === 'hi' ? 'फॉर्मेट्स' : 'Templates',
      icon: FileText,
    },
  ];

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  return (
    <div
      id="app-tab-bar"
      className="bg-white border-b border-[#E0E4DE] px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs z-15 min-w-0 select-none transition-all duration-150"
    >
      {/* Tab Navigation List with Horizontal Scroll */}
      <div className="flex items-center min-w-0 flex-1 overflow-hidden relative">
        {/* Left Scroll Arrow */}
        <button
          type="button"
          onClick={scrollLeft}
          className="hidden sm:flex p-1 rounded hover:bg-[#EDF3EF] text-[#738276] hover:text-[#1A2E25] shrink-0 mr-1 cursor-pointer transition-colors"
          title="Scroll Left"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Scrollable Tabs */}
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth py-1.5 min-w-0"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-nav-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 relative ${
                  isActive
                    ? 'bg-[#2D4A3E] text-white shadow-xs font-bold'
                    : 'text-[#56655A] hover:bg-[#EDF3EF] hover:text-[#1A2E25]'
                }`}
                title={tab.label}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isActive ? 'text-[#8DA173]' : 'text-[#738276]'
                  }`}
                />
                <span>{tab.label}</span>

                {tab.badge !== undefined && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold leading-tight ${
                      isActive ? 'bg-[#8DA173] text-white' : tab.badgeColor
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Arrow */}
        <button
          type="button"
          onClick={scrollRight}
          className="hidden sm:flex p-1 rounded hover:bg-[#EDF3EF] text-[#738276] hover:text-[#1A2E25] shrink-0 ml-1 cursor-pointer transition-colors"
          title="Scroll Right"
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right Controls: Quick Tools & View Mode Toggle */}
      <div className="flex items-center gap-1.5 ml-2 sm:ml-4 shrink-0 border-l border-[#E0E4DE] pl-2 sm:pl-3">
        {onOpenManualRecon && (
          <button
            type="button"
            id="btn-tab-bar-manual-recon"
            onClick={onOpenManualRecon}
            className="hidden xl:flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#2D4A3E] bg-[#EDF3EF] hover:bg-[#D5E2D9] rounded-lg transition-colors cursor-pointer"
            title="Manual Period Recon (022022 to 022026)"
          >
            <Sliders className="w-3 h-3 text-[#8DA173]" />
            <span>Manual Recon</span>
            <span className="text-[9px] font-mono px-1 rounded bg-[#2D4A3E] text-white font-bold">
              022022-26
            </span>
          </button>
        )}

        {onOpenManageRegisters && (
          <button
            type="button"
            id="btn-tab-bar-registers"
            onClick={onOpenManageRegisters}
            className="hidden lg:flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#2D4A3E] bg-[#EDF3EF] hover:bg-[#D5E2D9] rounded-lg transition-colors cursor-pointer"
            title="Manage Stored Registers & Clear Records"
          >
            <Database className="w-3 h-3 text-[#5C7243]" />
            <span>Registers</span>
          </button>
        )}

        {/* Focus / View-Only Mode Toggle (Maximized Screen Resolution) */}
        <button
          type="button"
          id="btn-toggle-focus-mode"
          onClick={onToggleFocusMode}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
            isFocusMode
              ? 'bg-[#8DA173] text-white ring-1 ring-[#8DA173]'
              : 'bg-white border border-[#D5E2D9] text-[#2D4A3E] hover:bg-[#EDF3EF]'
          }`}
          title={
            isFocusMode
              ? 'Exit Focus View (Restore standard sidebar view)'
              : 'Maximize Workspace / View Only Mode (Optimizes screen resolution for table analysis)'
          }
        >
          {isFocusMode ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit Focus</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-[#2D4A3E]" />
              <span className="hidden sm:inline">Focus View</span>
            </>
          )}
        </button>

        {/* Sidebar Collapse Toggle */}
        <button
          type="button"
          id="btn-sidebar-collapse-bar"
          onClick={onToggleSidebarCollapse}
          className="p-1.5 text-[#56655A] hover:text-[#1A2E25] hover:bg-[#EDF3EF] rounded-lg transition-colors cursor-pointer"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-[#8DA173]" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
