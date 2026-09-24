import React from 'react';
import {
  Home,
  LayoutDashboard,
  FileSpreadsheet,
  TrendingUp,
  UploadCloud,
  Sparkles,
  MailWarning,
  SlidersHorizontal,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Languages,
  User as UserIcon,
  LogOut,
  LogIn,
  Building,
  KeyRound,
  Lock,
  Scale,
  Layers,
  Database,
  ChevronLeft,
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { Language, UserProfile } from '../types';
import { translations } from '../utils/translations';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  companyGstin: string;
  counts: {
    missing2b: number;
    mismatches: number;
  };
  currentUser: UserProfile | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onOpenAuth: () => void;
  onOpenProfile: () => void;
  onOpenClientSelector?: () => void;
  onOpenGstPortalLogin?: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  companyGstin,
  counts,
  currentUser,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  onOpenAuth,
  onOpenProfile,
  onOpenClientSelector,
  onOpenGstPortalLogin,
  onLogout,
}) => {
  const t = translations[language];
  const isLoggedIn = !!currentUser;
  const isAdmin = currentUser?.role === 'admin';
  const displayGstin = companyGstin || currentUser?.companyGstin || '27AABCA1234F1Z8';
  const displayCompanyName = currentUser?.companyName || 'Apex Advisory Practice';

  // Grouped Navigation Structure for Clean Usability & Hierarchy
  const navGroups = isLoggedIn
    ? [
        {
          groupName: language === 'hi' ? 'ओवरव्यू' : 'Overview',
          items: [
            { id: 'home', label: t.home || 'Home & Overview', icon: Home },
            { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
          ],
        },
        {
          groupName: language === 'hi' ? 'जीएसटी मिलान' : 'Reconciliation',
          items: [
            {
              id: 'purchase_recon',
              label: t.purchaseRecon,
              icon: FileSpreadsheet,
              badge: counts.missing2b > 0 ? counts.missing2b : undefined,
              badgeColor: 'bg-[#C75D4E] text-white',
            },
            {
              id: 'sales_recon',
              label: language === 'hi' ? 'सेल्स बनाम GSTR-1' : 'Sales vs GSTR-1',
              icon: TrendingUp,
            },
            {
              id: 'discrepancy_report',
              label: t.discrepancyReport || 'Gap & Discrepancies',
              icon: ShieldAlert,
              badge:
                counts.missing2b + counts.mismatches > 0
                  ? counts.missing2b + counts.mismatches
                  : undefined,
              badgeColor: 'bg-[#C75D4E] text-white',
            },
            {
              id: 'vendor_notices',
              label: t.vendorNotices,
              icon: MailWarning,
              badge: counts.mismatches > 0 ? counts.mismatches : undefined,
              badgeColor: 'bg-[#D9A14E] text-white',
            },
          ],
        },
        {
          groupName: language === 'hi' ? 'टैक्स एवं खाते' : 'Tax & Accounting',
          items: [
            {
              id: 'gstr1_summary',
              label: language === 'hi' ? 'GSTR-1 रिटर्न व HSN' : 'GSTR-1 & Table 12 HSN',
              icon: Layers,
            },
            {
              id: 'gst_verification',
              label: language === 'hi' ? 'GST व PAN सत्यापन' : 'GST Status & PAN Lookup',
              icon: ShieldCheck,
            },
            {
              id: 'gst_legal_bot',
              label: language === 'hi' ? 'GST लीगल AI एडवाइजर' : 'GST Legal AI & Notice Drafter',
              icon: Scale,
              badge: 'AI',
              badgeColor: 'bg-[#2D5A43] text-white',
              highlight: true,
            },
            {
              id: 'accounting',
              label: t.accounting || 'Accounts & Ledgers (P&L/BS)',
              icon: Scale,
            },
            {
              id: 'templates',
              label: 'Templates & Formats',
              icon: FileSpreadsheet,
            },
          ],
        },
        {
          groupName: language === 'hi' ? 'टूल्स एवं सेटिंग्स' : 'Tools & Operations',
          items: [
            {
              id: 'manual_recon',
              label: language === 'hi' ? 'मैन्युअल अवधि मिलान' : 'Manual Period Recon',
              icon: SlidersHorizontal,
              tag: '022022-26',
            },
            {
              id: 'manage_registers',
              label: language === 'hi' ? 'स्थायी रजिस्टर' : 'Stored Registers',
              icon: Database,
              tag: 'Saved',
            },
            {
              id: 'ai_audit',
              label: t.aiAuditReport || 'AI Audit Report',
              icon: Sparkles,
              highlight: true,
            },
            {
              id: 'import',
              label: t.importFiles || 'Import Files',
              icon: UploadCloud,
            },
            ...(isAdmin
              ? [
                  {
                    id: 'admin_dashboard',
                    label: t.adminDashboard || 'Admin Governance',
                    icon: Shield,
                    badge: 'Admin',
                    badgeColor: 'bg-[#8DA173] text-white',
                  },
                ]
              : []),
            {
              id: 'settings',
              label: t.settings || 'Settings',
              icon: SlidersHorizontal,
            },
          ],
        },
      ]
    : [
        {
          groupName: language === 'hi' ? 'सार्वजनिक सेवाएं' : 'Public Access',
          items: [
            { id: 'home', label: t.home || 'Home & Overview', icon: Home },
            {
              id: 'gst_verification',
              label: language === 'hi' ? 'GST व PAN सत्यापन' : 'GST Status & PAN Lookup',
              icon: ShieldCheck,
            },
            {
              id: 'gst_legal_bot',
              label: language === 'hi' ? 'GST लीगल AI एडवाइजर' : 'GST Legal AI & Notice Drafter',
              icon: Scale,
              badge: 'AI',
              badgeColor: 'bg-[#2D5A43] text-white',
            },
            { id: 'templates', label: 'Templates & Formats', icon: FileSpreadsheet },
          ],
        },
      ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        id="sidebar-container"
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 bg-[#2D4A3E] text-[#F1F3EE] flex flex-col justify-between shrink-0 shadow-xl transition-all duration-300 ease-in-out select-none ${
          isCollapsed ? 'w-16' : 'w-64 sm:w-68'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Header */}
        <div className="shrink-0 p-3 sm:p-4 flex items-center justify-between border-b border-[#3D5C4F]">
          <div
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 cursor-pointer overflow-hidden group"
            title="GST Portal Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#8DA173] rounded-xl flex items-center justify-center font-bold text-white shadow-xs text-sm sm:text-base tracking-wider shrink-0 group-hover:bg-[#9BB080] transition-colors">
              GST
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <span className="text-sm sm:text-base font-bold tracking-tight text-white block truncate leading-tight">
                  {t.portalTitle}
                </span>
                <span className="text-[10px] text-[#8DA173] font-medium tracking-wide block truncate">
                  Recon & Compliance
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* Desktop Collapse Toggle */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="hidden lg:flex p-1.5 rounded-lg text-[#9CB3A5] hover:text-white hover:bg-[#3D5C4F] transition-colors cursor-pointer"
                title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                {isCollapsed ? (
                  <PanelLeftOpen className="w-4 h-4 text-[#8DA173]" />
                ) : (
                  <PanelLeftClose className="w-4 h-4 text-[#9CB3A5]" />
                )}
              </button>
            )}

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-[#9CB3A5] hover:text-white hover:bg-[#3D5C4F] transition-colors lg:hidden cursor-pointer"
                aria-label="Close Mobile Sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* User Account / Sign In Quick Status & Language (When Not Collapsed) */}
        {!isCollapsed && (
          <div className="shrink-0 px-3 pt-2.5 pb-1 space-y-2">
            {currentUser ? (
              <div
                onClick={onOpenProfile}
                className="bg-[#233B31] hover:bg-[#1E332B] cursor-pointer p-2 rounded-xl border border-[#3D5C4F]/60 transition-all flex items-center justify-between group"
                title="View Profile & Practice Settings"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-6 h-6 rounded-lg bg-[#8DA173] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-bold text-white truncate group-hover:text-[#8DA173] transition-colors">
                      {currentUser.displayName || 'GST User'}
                    </div>
                    <div className="text-[10px] text-[#9CB3A5] font-mono truncate">
                      {currentUser.companyGstin || companyGstin}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[8px] px-1.5 py-0.2 rounded font-mono font-bold uppercase shrink-0 ${
                    currentUser.role === 'admin'
                      ? 'bg-[#8DA173] text-white'
                      : 'bg-[#3D5C4F] text-[#D3DCD6]'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full bg-[#8DA173] hover:bg-[#7A8E61] text-white p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t.signIn || 'Sign In to Workspace'}</span>
              </button>
            )}

            {/* Language Switcher */}
            <div className="flex items-center justify-between bg-[#233B31]/60 px-2 py-1 rounded-lg text-xs border border-[#3D5C4F]/40">
              <div className="flex items-center gap-1.5 text-[#8DA173]">
                <Languages className="w-3 h-3" />
                <span className="text-white font-medium text-[10px]">
                  {language === 'hi' ? 'हिन्दी' : 'English'}
                </span>
              </div>
              <button
                type="button"
                id="btn-lang-toggle"
                onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
                className="text-[10px] px-1.5 py-0.2 rounded bg-[#3D5C4F] hover:bg-[#8DA173] text-white font-semibold transition-all cursor-pointer"
              >
                {language === 'en' ? 'हिन्दी' : 'EN'}
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Navigation Body */}
        <nav
          id="sidebar-nav-scroll"
          className="flex-1 overflow-y-auto overscroll-contain min-h-0 px-2 sm:px-2.5 py-2 space-y-3"
        >
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-0.5">
              {!isCollapsed ? (
                <div className="px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-[#8DA173] select-none">
                  {group.groupName}
                </div>
              ) : (
                <div className="h-2 border-t border-[#3D5C4F]/40 my-1" />
              )}

              {group.items.map((item: any) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    title={item.label}
                    className={`w-full flex items-center rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isCollapsed
                        ? 'justify-center p-2.5'
                        : 'justify-between px-2.5 py-2'
                    } ${
                      isActive
                        ? 'bg-[#3D5C4F] text-white shadow-xs ring-1 ring-[#8DA173]/50'
                        : 'text-[#D3DCD6] hover:bg-[#3D5C4F]/50 hover:text-white'
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2.5 min-w-0 ${
                        isCollapsed ? 'justify-center' : ''
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive
                            ? 'text-[#8DA173]'
                            : item.highlight
                            ? 'text-[#D9A14E]'
                            : 'text-[#9CB3A5]'
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate text-left">{item.label}</span>
                      )}
                    </div>

                    {!isCollapsed && (
                      <div className="flex items-center gap-1 shrink-0 ml-1.5">
                        {item.badge !== undefined && (
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold shadow-xs ${item.badgeColor}`}
                          >
                            {item.badge}
                          </span>
                        )}
                        {item.tag && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-[#233B31] text-[#8DA173] font-mono font-semibold">
                            {item.tag}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Official GST Portal Login Shortcut */}
          {onOpenGstPortalLogin && (
            <button
              type="button"
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
                onOpenGstPortalLogin();
              }}
              title="Official GST Portal Auto-Login"
              className={`w-full flex items-center rounded-xl text-xs font-semibold bg-[#233B31] text-[#D3E8DA] hover:bg-[#1E362C] hover:text-white border border-[#8DA173]/30 transition-all cursor-pointer shadow-xs ${
                isCollapsed ? 'justify-center p-2.5' : 'justify-between px-2.5 py-2 mt-1'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#8DA173]">⚡</span>
                {!isCollapsed && <span>GST Portal Login</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[8px] px-1.5 py-0.2 rounded bg-[#8DA173] text-white font-bold">
                  Auto
                </span>
              )}
            </button>
          )}

          {/* Locked Features message for Guest */}
          {!isLoggedIn && !isCollapsed && (
            <div className="mt-3 p-2.5 bg-[#233B31]/70 rounded-xl border border-[#3D5C4F]/60 text-center space-y-1.5">
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#8DA173] font-semibold">
                <Lock className="w-3 h-3" />
                <span>Recon Locked</span>
              </div>
              <p className="text-[10px] text-[#A6B8AC] leading-tight">
                Sign in to unlock GSTR-2B matching, ITC gap audits & legal vendor notices.
              </p>
              <button
                type="button"
                onClick={onOpenAuth}
                className="w-full py-1 bg-[#8DA173] hover:bg-[#7A8E61] text-white rounded-lg text-[10px] font-bold transition-all shadow-xs cursor-pointer"
              >
                Sign In Free
              </button>
            </div>
          )}
        </nav>

        {/* Footer Profile & Practice Controls */}
        <div className="shrink-0 p-2.5 sm:p-3 border-t border-[#3D5C4F] bg-[#233B31]/90 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div
              className="flex items-center gap-1.5 text-[#8DA173]"
              title="Statutory Section 16(2)(aa) compliance verified"
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              {!isCollapsed && (
                <span className="text-[9px] font-semibold tracking-wider uppercase text-[#D3E8DA]">
                  Sec 16(2)(aa) Active
                </span>
              )}
            </div>

            {currentUser && (
              <button
                type="button"
                onClick={onLogout}
                title="Sign Out"
                className="text-[#9CB3A5] hover:text-[#C75D4E] p-1 rounded hover:bg-[#3D5C4F] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {currentUser && !isCollapsed && (
            <div
              onClick={onOpenClientSelector || onOpenProfile}
              title="Click to Switch Client"
              className="text-[10px] text-[#A6B8AC] font-mono truncate hover:text-white cursor-pointer transition-colors pt-0.5"
            >
              Client: <span className="text-white font-semibold">{displayCompanyName}</span>{' '}
              <span className="text-[#8DA173]">({displayGstin.slice(0, 8)}...)</span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
