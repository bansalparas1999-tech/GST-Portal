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

  // For Guest (not logged in), only the Home tab is accessible.
  // After login, all reconciliation and governance tabs are available.
  const navItems = isLoggedIn
    ? [
        {
          id: 'home',
          label: t.home || 'Home & Overview',
          icon: Home,
        },
        {
          id: 'dashboard',
          label: t.dashboard,
          icon: LayoutDashboard,
        },
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
          id: 'gstr1_summary',
          label: language === 'hi' ? 'GSTR-1 रिटर्न व HSN/B2CS' : 'GSTR-1 Returns & HSN/B2CS',
          icon: Layers,
          badge: 'JSON',
          badgeColor: 'bg-[#8DA173] text-white',
        },
        {
          id: 'gst_verification',
          label: language === 'hi' ? 'GST व PAN सत्यापन' : 'GST Status & PAN Lookup',
          icon: ShieldCheck,
          badge: 'Excel',
          badgeColor: 'bg-[#8DA173] text-white',
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
        {
          id: 'ai_audit',
          label: t.aiAuditReport,
          icon: Sparkles,
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
        {
          id: 'import',
          label: t.importFiles,
          icon: UploadCloud,
        },
        // Admin Dashboard tab (visible to Admins)
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
          label: t.settings,
          icon: SlidersHorizontal,
        },
      ]
    : [
        {
          id: 'home',
          label: t.home || 'Home & Overview',
          icon: Home,
        },
        {
          id: 'gst_verification',
          label: language === 'hi' ? 'GST व PAN सत्यापन' : 'GST Status & PAN Lookup',
          icon: ShieldCheck,
          badge: 'Bulk/Excel',
          badgeColor: 'bg-[#8DA173] text-white',
        },
        {
          id: 'templates',
          label: 'Templates & Formats',
          icon: FileSpreadsheet,
        },
      ];

  return (
    <aside
      id="sidebar-container"
      className="w-64 bg-[#2D4A3E] text-[#F1F3EE] flex flex-col justify-between shrink-0 shadow-lg select-none"
    >
      {/* Top Brand Header */}
      <div>
        <div
          onClick={() => setActiveTab('home')}
          className="p-5 flex items-center justify-between border-b border-[#3D5C4F] cursor-pointer hover:bg-[#254035] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#8DA173] rounded-xl flex items-center justify-center font-bold text-white shadow-xs text-base tracking-wider">
              GST
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block">
                {t.portalTitle}
              </span>
              <span className="text-[10px] text-[#8DA173] font-medium tracking-wide block">
                Reconciliation & Governance
              </span>
            </div>
          </div>
        </div>

        {/* Language & Workspace Profile Banner */}
        <div className="px-4 pt-3 pb-1 space-y-2">
          {/* User Profile Quick Banner */}
          {currentUser ? (
            <div
              onClick={onOpenProfile}
              className="bg-[#233B31] hover:bg-[#1E332B] cursor-pointer p-2.5 rounded-xl border border-[#3D5C4F]/60 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-[#8DA173] text-white flex items-center justify-center font-bold text-xs shrink-0">
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
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase shrink-0 ${
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
              onClick={onOpenAuth}
              className="w-full bg-[#8DA173] hover:bg-[#7A8E61] text-white p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t.signIn || 'Sign In to Workspace'}</span>
            </button>
          )}

          {/* Language Toggle */}
          <div className="flex items-center justify-between bg-[#233B31]/60 px-2.5 py-1.5 rounded-lg text-xs border border-[#3D5C4F]/40">
            <div className="flex items-center gap-1.5 text-[#8DA173]">
              <Languages className="w-3.5 h-3.5" />
              <span className="text-white font-medium text-[11px]">
                {language === 'hi' ? 'हिन्दी' : 'English'}
              </span>
            </div>
            <button
              id="btn-lang-toggle"
              onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
              className="text-[10px] px-2 py-0.5 rounded bg-[#3D5C4F] hover:bg-[#8DA173] text-white font-semibold transition-all"
            >
              {language === 'en' ? 'हिन्दी' : 'EN'}
            </button>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#3D5C4F] text-white shadow-xs ring-1 ring-[#8DA173]/50'
                    : 'text-[#D3DCD6] hover:bg-[#3D5C4F]/50 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-[#8DA173]'
                        : item.highlight
                        ? 'text-[#8DA173]'
                        : 'text-[#9CB3A5]'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold shadow-xs ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Official GST Portal Login Shortcut */}
          {onOpenGstPortalLogin && (
            <button
              type="button"
              onClick={onOpenGstPortalLogin}
              className="w-full flex items-center justify-between px-3 py-2 mt-2 rounded-xl text-xs font-semibold bg-[#233B31] text-[#D3E8DA] hover:bg-[#1E362C] hover:text-white border border-[#8DA173]/30 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded bg-[#8DA173]/20 flex items-center justify-center text-[#8DA173]">
                  ⚡
                </div>
                <span>GST Portal Login</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#8DA173] text-white font-bold">
                Auto-Fill
              </span>
            </button>
          )}

          {/* Locked Features indicator for guest users */}
          {!isLoggedIn && (
            <div className="mt-4 p-3 bg-[#233B31]/70 rounded-xl border border-[#3D5C4F]/60 text-center space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#8DA173] font-semibold">
                <Lock className="w-3.5 h-3.5" />
                <span>Features Locked</span>
              </div>
              <p className="text-[11px] text-[#A6B8AC] leading-relaxed">
                Sign in with your email or credentials to unlock reconciliation, gap analysis, AI audit, and supplier notices.
              </p>
              <button
                onClick={onOpenAuth}
                className="w-full py-1.5 bg-[#8DA173] hover:bg-[#7A8E61] text-white rounded-lg text-[11px] font-bold transition-all shadow-xs"
              >
                Sign In to Access
              </button>
            </div>
          )}
        </nav>
      </div>

      {/* Footer Profile & Logout Controls */}
      <div className="p-4 border-t border-[#3D5C4F] bg-[#233B31]/70 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-[#8DA173]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold tracking-wide uppercase">
              Sec 16(2)(aa) Active
            </span>
          </div>

          {currentUser && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="text-[#9CB3A5] hover:text-[#C75D4E] p-1 rounded hover:bg-[#3D5C4F] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {currentUser && (
          <div
            onClick={onOpenClientSelector || onOpenProfile}
            title="Click to Switch Client"
            className="text-[10px] text-[#A6B8AC] font-mono truncate hover:text-white cursor-pointer transition-colors"
          >
            Client: <span className="text-white font-semibold">{displayCompanyName}</span>{' '}
            <span className="text-[#8DA173]">({displayGstin})</span>
          </div>
        )}
      </div>
    </aside>
  );
};
