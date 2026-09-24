import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { DashboardView } from './components/DashboardView';
import { ReconTableView } from './components/ReconTableView';
import { UploadModal } from './components/UploadModal';
import { AiAuditModal } from './components/AiAuditModal';
import { VendorNoticeModal } from './components/VendorNoticeModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { DiscrepancyReportView } from './components/DiscrepancyReportView';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { AdminDashboardView } from './components/AdminDashboardView';
import { ClientGstinModal } from './components/ClientGstinModal';
import { GstPortalLoginModal } from './components/GstPortalLoginModal';
import { GstIncognitoDriverModal } from './components/GstIncognitoDriverModal';
import { AccountingView } from './components/AccountingView';
import { TemplatesView } from './components/TemplatesView';
import { Gstr1SummaryView } from './components/Gstr1SummaryView';
import { GstVerificationView } from './components/GstVerificationView';
import { InvoiceEditorModal, InvoiceEditorMode } from './components/InvoiceEditorModal';
import { ManualReconModal } from './components/ManualReconModal';
import { ManageRegistersModal } from './components/ManageRegistersModal';
import { AppTabBar } from './components/AppTabBar';
import { GstLegalAdvisorView } from './components/GstLegalAdvisorView';
import { GstChatbotWidget } from './components/GstChatbotWidget';
import {
  InvoiceRecord,
  ReconItem,
  ToleranceConfig,
  Language,
  UserProfile,
  SalesInvoiceRecord,
  BankTransaction,
  ImportTabType,
  PanEntity,
  PanGstinBranch,
  HsnSummaryItem,
  B2csSummaryItem,
  GstLegalQueryType,
  GstNoticeAttachment,
} from './types';
import {
  reconcileGstData,
  DEFAULT_TOLERANCE,
} from './utils/gstEngine';
import { filterInvoicesByPeriod } from './utils/periodUtils';
import { translations } from './utils/translations';
import {
  fetchGstinsForPan,
  savePanEntity,
  extractPanFromGstin,
  getStoredPanEntities,
  updateBranchCredentials,
} from './utils/gstinUtils';
import {
  auth,
  fetchOrCreateUserProfile,
  saveUserReconciliationData,
  fetchUserReconciliationData,
  updateUserProfile,
  saveUserPersistentRegisters,
  fetchUserPersistentRegisters,
  deleteUserInvoiceSingular,
  deleteUserInvoicesBatch,
  clearUserRegisterAll,
} from './lib/firebase';
import { generateMultiPeriodSampleData } from './utils/multiPeriodSampleData';

export default function App() {
  const [language, setLanguage] = useState<Language>('en');
  // Starts directly on the separate Home Page
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('FY 2024-25');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  // PAN-Wise Entity State Management
  const [selectedPan, setSelectedPan] = useState<string>(() => {
    const savedPan = localStorage.getItem('clear_gst_active_pan');
    const savedGstin = localStorage.getItem('clear_gst_active_gstin');
    return savedPan || (savedGstin ? extractPanFromGstin(savedGstin) : 'AABCA1234F');
  });

  const [selectedPanEntity, setSelectedPanEntity] = useState<PanEntity | null>(() => {
    const initialPan = localStorage.getItem('clear_gst_active_pan') || 'AABCA1234F';
    return fetchGstinsForPan(initialPan);
  });

  // 'ALL' for consolidated multi-branch entity audit, or specific GSTIN e.g. '27AABCA1234F1Z8'
  const [selectedGstinFilter, setSelectedGstinFilter] = useState<string>(() => {
    return localStorage.getItem('clear_gst_active_gstin_filter') || 'ALL';
  });

  const [companyGstin, setCompanyGstin] = useState<string>(() => {
    return localStorage.getItem('clear_gst_active_gstin') || '27AABCA1234F1Z8';
  });

  // Authentication & User Profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isClientGstinModalOpen, setIsClientGstinModalOpen] = useState(false);
  const [isGstPortalLoginOpen, setIsGstPortalLoginOpen] = useState(false);
  const [isGstIncognitoDriverOpen, setIsGstIncognitoDriverOpen] = useState(false);
  const [driverTargetGstin, setDriverTargetGstin] = useState<string>('');
  const [driverTargetBranch, setDriverTargetBranch] = useState<PanGstinBranch | null>(null);
  const [driverTargetEntity, setDriverTargetEntity] = useState<PanEntity | null>(null);
  const [isLoginPrompt, setIsLoginPrompt] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [preloadedLegalQuery, setPreloadedLegalQuery] = useState<{
    queryType: GstLegalQueryType;
    prompt: string;
    attachment?: GstNoticeAttachment;
  } | undefined>(undefined);

  // Sidebar Collapse, Mobile Drawer & Focus View / Maximize Screen Resolution
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('clear_gst_sidebar_collapsed') === 'true';
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState<boolean>(() => {
    return localStorage.getItem('clear_gst_focus_mode') === 'true';
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('clear_gst_sidebar_collapsed', String(next));
      return next;
    });
  };

  const toggleFocusMode = () => {
    setIsFocusMode((prev) => {
      const next = !prev;
      localStorage.setItem('clear_gst_focus_mode', String(next));
      if (next) {
        setIsSidebarCollapsed(true);
        localStorage.setItem('clear_gst_sidebar_collapsed', 'true');
      }
      return next;
    });
  };

  // Open GST Incognito Auto-Typing Driver
  const handleOpenGstIncognitoDriver = (
    gstin?: string,
    branch?: PanGstinBranch | null,
    entity?: PanEntity | null
  ) => {
    const targetG = gstin || companyGstin || selectedPanEntity?.branches[0]?.gstin || '27AABCA1234F1Z8';
    const targetE = entity || selectedPanEntity;
    const targetB =
      branch ||
      targetE?.branches?.find((b) => b.gstin === targetG) ||
      targetE?.branches?.[0] ||
      null;

    setDriverTargetGstin(targetG);
    setDriverTargetEntity(targetE);
    setDriverTargetBranch(targetB);
    setIsGstIncognitoDriverOpen(true);
  };

  // Purchase Data State - Clean start: NO prefilled sample data
  const [booksData, setBooksData] = useState<InvoiceRecord[]>([]);
  const [gstr2bData, setGstr2bData] = useState<InvoiceRecord[]>([]);

  // Sales Data State - Clean start: NO prefilled sample data
  const [salesData, setSalesData] = useState<InvoiceRecord[]>([]);
  const [gstr1Data, setGstr1Data] = useState<InvoiceRecord[]>([]);

  // HSN & B2CS Summaries for Table 12 & Table 7 of GSTR-1
  const [hsnSummaryData, setHsnSummaryData] = useState<HsnSummaryItem[]>(() => {
    const saved = localStorage.getItem('clear_gst_hsn_summary');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [b2csSummaryData, setB2csSummaryData] = useState<B2csSummaryItem[]>(() => {
    const saved = localStorage.getItem('clear_gst_b2cs_summary');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const handleUpdateHsnData = (items: HsnSummaryItem[]) => {
    setHsnSummaryData(items);
    localStorage.setItem('clear_gst_hsn_summary', JSON.stringify(items));
  };

  const handleUpdateB2csData = (items: B2csSummaryItem[]) => {
    setB2csSummaryData(items);
    localStorage.setItem('clear_gst_b2cs_summary', JSON.stringify(items));
  };

  // Dedicated Sales and Bank Statement state for Accounting & Financials
  // Default is completely zero ([]) for all users unless saved or admin loads sample data
  const [accountingSales, setAccountingSales] = useState<SalesInvoiceRecord[]>(() => {
    const saved = localStorage.getItem('clear_gst_accounting_sales');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [accountingBankTxns, setAccountingBankTxns] = useState<BankTransaction[]>(() => {
    const saved = localStorage.getItem('clear_gst_accounting_bank');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const handleUpdateSales = (newSales: SalesInvoiceRecord[]) => {
    setAccountingSales(newSales);
    localStorage.setItem('clear_gst_accounting_sales', JSON.stringify(newSales));
  };

  const handleUpdateBankTxns = (newTxns: BankTransaction[]) => {
    setAccountingBankTxns(newTxns);
    localStorage.setItem('clear_gst_accounting_bank', JSON.stringify(newTxns));
  };

  const handleClearAccountingData = () => {
    setAccountingSales([]);
    setAccountingBankTxns([]);
    localStorage.setItem('clear_gst_accounting_sales', JSON.stringify([]));
    localStorage.setItem('clear_gst_accounting_bank', JSON.stringify([]));
  };

  const handleImportFromGstSales = () => {
    const sourceRecords = salesData.length > 0 ? salesData : gstr1Data;
    if (sourceRecords.length === 0) return;
    const converted: SalesInvoiceRecord[] = sourceRecords.map((r) => ({
      id: `imported-${r.id || Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      gstin: r.vendorGstin || 'URP',
      customerName: r.vendorName || 'Valued Customer',
      invoiceNumber: r.invoiceNumber,
      invoiceDate: r.invoiceDate,
      taxableValue: r.taxableValue,
      igst: r.igst,
      cgst: r.cgst,
      sgst: r.sgst,
      cess: r.cess,
      totalTax: r.totalTax,
      invoiceValue: r.invoiceValue,
      financialYear: r.financialYear || '2024-25',
      taxPeriod: r.taxPeriod || selectedPeriod,
      paymentStatus: 'UNPAID',
      receivedAmount: 0,
      outstandingAmount: r.invoiceValue,
    }));
    handleUpdateSales([...converted, ...accountingSales]);
  };

  // Invoice & Record Editor State (Purchases, Sales, Bank)
  const [isInvoiceEditorOpen, setIsInvoiceEditorOpen] = useState(false);
  const [invoiceEditorMode, setInvoiceEditorMode] = useState<InvoiceEditorMode>('add_sale');
  const [editingPurchase, setEditingPurchase] = useState<InvoiceRecord | null>(null);
  const [editingSale, setEditingSale] = useState<SalesInvoiceRecord | null>(null);
  const [editingBank, setEditingBank] = useState<BankTransaction | null>(null);

  // CRUD Handlers for Purchases (Books & 2B)
  const handleOpenAddPurchase = (source: 'books' | 'gstr2b' = 'books') => {
    setInvoiceEditorMode(source === 'books' ? 'add_purchase_books' : 'add_purchase_2b');
    setEditingPurchase(null);
    setEditingSale(null);
    setEditingBank(null);
    setIsInvoiceEditorOpen(true);
  };

  const handleOpenEditPurchase = (inv: InvoiceRecord, source: 'books' | 'gstr2b') => {
    setInvoiceEditorMode(source === 'books' ? 'edit_purchase_books' : 'edit_purchase_2b');
    setEditingPurchase(inv);
    setEditingSale(null);
    setEditingBank(null);
    setIsInvoiceEditorOpen(true);
  };

  const handleSavePurchase = (inv: InvoiceRecord, isNew: boolean) => {
    const isBooks = invoiceEditorMode.includes('books');
    if (isBooks) {
      const updated = isNew
        ? [inv, ...booksData]
        : booksData.map((b) => (b.id === inv.id ? inv : b));
      setBooksData(updated);
    } else {
      const updated = isNew
        ? [inv, ...gstr2bData]
        : gstr2bData.map((b) => (b.id === inv.id ? inv : b));
      setGstr2bData(updated);
    }
  };

  const handleDeletePurchase = (id: string, source: 'books' | 'gstr2b') => {
    if (source === 'books') {
      setBooksData((prev) => prev.filter((b) => b.id !== id));
    } else {
      setGstr2bData((prev) => prev.filter((b) => b.id !== id));
    }
  };

  // CRUD Handlers for Sales Invoices
  const handleOpenAddSale = () => {
    setInvoiceEditorMode('add_sale');
    setEditingPurchase(null);
    setEditingSale(null);
    setEditingBank(null);
    setIsInvoiceEditorOpen(true);
  };

  const handleOpenEditSale = (sale: SalesInvoiceRecord) => {
    setInvoiceEditorMode('edit_sale');
    setEditingPurchase(null);
    setEditingSale(sale);
    setEditingBank(null);
    setIsInvoiceEditorOpen(true);
  };

  const handleSaveSale = (sale: SalesInvoiceRecord, isNew: boolean) => {
    if (isNew) {
      handleUpdateSales([sale, ...accountingSales]);
    } else {
      handleUpdateSales(accountingSales.map((s) => (s.id === sale.id ? sale : s)));
    }
  };

  const handleDeleteSale = (id: string) => {
    handleUpdateSales(accountingSales.filter((s) => s.id !== id));
  };

  // CRUD Handlers for Bank Transactions
  const handleOpenAddBank = () => {
    setInvoiceEditorMode('add_bank');
    setEditingPurchase(null);
    setEditingSale(null);
    setEditingBank(null);
    setIsInvoiceEditorOpen(true);
  };

  const handleOpenEditBank = (txn: BankTransaction) => {
    setInvoiceEditorMode('edit_bank');
    setEditingPurchase(null);
    setEditingSale(null);
    setEditingBank(txn);
    setIsInvoiceEditorOpen(true);
  };

  const handleSaveBank = (txn: BankTransaction, isNew: boolean) => {
    if (isNew) {
      handleUpdateBankTxns([txn, ...accountingBankTxns]);
    } else {
      handleUpdateBankTxns(accountingBankTxns.map((t) => (t.id === txn.id ? txn : t)));
    }
  };

  const handleDeleteBank = (id: string) => {
    handleUpdateBankTxns(accountingBankTxns.filter((t) => t.id !== id));
  };

  // Tolerances
  const [tolerance, setTolerance] = useState<ToleranceConfig>(DEFAULT_TOLERANCE);
  const [isMatching, setIsMatching] = useState<boolean>(false);
  const [tableFilterStatus, setTableFilterStatus] = useState<string>('ALL');

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadInitialTab, setUploadInitialTab] = useState<ImportTabType>('pdf');
  const [isAiAuditOpen, setIsAiAuditOpen] = useState(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ReconItem | null>(null);
  const [selectedNoticeItems, setSelectedNoticeItems] = useState<ReconItem[]>([]);

  // Manual Period Reconciliation Studio & Stored Registers Management Modals
  const [isManualReconOpen, setIsManualReconOpen] = useState(false);
  const [isManageRegistersOpen, setIsManageRegistersOpen] = useState(false);

  // Singular & Batch Register Deletion Handlers (stay forever in that user ID)
  const handleDeleteInvoiceSingular = async (id: string, source: 'books' | 'gstr2b' | 'both') => {
    const uid = currentUser?.uid || 'user-default-session';
    const res = await deleteUserInvoiceSingular(uid, id, source, booksData, gstr2bData);
    setBooksData(res.books);
    setGstr2bData(res.gstr2b);
    if (currentUser?.uid && !currentUser.uid.startsWith('demo-')) {
      await saveUserReconciliationData(
        currentUser.uid,
        res.books,
        res.gstr2b,
        tolerance,
        companyGstin,
        selectedPeriod,
        selectedMonth
      );
    }
  };

  const handleDeleteInvoicesBatch = async (ids: string[], source: 'books' | 'gstr2b' | 'both') => {
    const uid = currentUser?.uid || 'user-default-session';
    const res = await deleteUserInvoicesBatch(uid, ids, source, booksData, gstr2bData);
    setBooksData(res.books);
    setGstr2bData(res.gstr2b);
    if (currentUser?.uid && !currentUser.uid.startsWith('demo-')) {
      await saveUserReconciliationData(
        currentUser.uid,
        res.books,
        res.gstr2b,
        tolerance,
        companyGstin,
        selectedPeriod,
        selectedMonth
      );
    }
  };

  const handleClearRegistersAll = async (target: 'books' | 'gstr2b' | 'both') => {
    const uid = currentUser?.uid || 'user-default-session';
    const res = await clearUserRegisterAll(uid, target, booksData, gstr2bData);
    setBooksData(res.books);
    setGstr2bData(res.gstr2b);
    if (currentUser?.uid && !currentUser.uid.startsWith('demo-')) {
      await saveUserReconciliationData(
        currentUser.uid,
        res.books,
        res.gstr2b,
        tolerance,
        companyGstin,
        selectedPeriod,
        selectedMonth
      );
    }
  };

  const handleLoadMultiPeriodSample = async () => {
    const sample = generateMultiPeriodSampleData();
    const uid = currentUser?.uid || 'user-default-session';
    setBooksData(sample.books);
    setGstr2bData(sample.gstr2b);
    await saveUserPersistentRegisters(uid, sample.books, sample.gstr2b);
    handleRunSmartMatch();
  };

  const handleOpenUploadWithTab = (tab: ImportTabType = 'pdf') => {
    setUploadInitialTab(tab);
    setIsUploadOpen(true);
  };

  // Listen to Firebase Auth state & Local Profile Session
  useEffect(() => {
    // 1. Initial check from localStorage for immediate responsiveness
    const savedLocalProfile = localStorage.getItem('clear_gst_local_profile');
    const savedActiveGstin = localStorage.getItem('clear_gst_active_gstin');

    if (savedActiveGstin) {
      setCompanyGstin(savedActiveGstin);
    }

    if (savedLocalProfile) {
      try {
        const parsed = JSON.parse(savedLocalProfile);
        if (parsed && parsed.uid) {
          setCurrentUser(parsed);
          if (parsed.companyGstin && !savedActiveGstin) {
            setCompanyGstin(parsed.companyGstin);
          }
          // Load permanent registers stored forever under this user ID
          fetchUserPersistentRegisters(parsed.uid).then((res) => {
            if (res.books.length > 0 || res.gstr2b.length > 0) {
              setBooksData(res.books);
              setGstr2bData(res.gstr2b);
            }
          }).catch(() => {});
        }
      } catch (e) {
        // ignore JSON parse error
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        try {
          const profile = await fetchOrCreateUserProfile(firebaseUser);
          setCurrentUser(profile);
          localStorage.setItem('clear_gst_local_profile', JSON.stringify(profile));
          if (profile.companyGstin) {
            setCompanyGstin(profile.companyGstin);
            localStorage.setItem('clear_gst_active_gstin', profile.companyGstin);
          }

          // Load permanent registers stored forever under this user ID
          const userRegisters = await fetchUserPersistentRegisters(profile.uid);
          if (userRegisters.books.length > 0 || userRegisters.gstr2b.length > 0) {
            setBooksData(userRegisters.books);
            setGstr2bData(userRegisters.gstr2b);
          } else {
            // Check if user has explicitly cleared registers (cached as empty array)
            const cachedBooks = localStorage.getItem(`clear_gst_books_${profile.uid}`);
            const cachedGstr2b = localStorage.getItem(`clear_gst_gstr2b_${profile.uid}`);
            const wasCleared = cachedBooks === '[]' && cachedGstr2b === '[]';
            if (!wasCleared) {
              // Load user-specific saved workspace data if available
              const savedData = await fetchUserReconciliationData(profile.uid, selectedPeriod, selectedMonth);
              if (savedData && savedData.booksRecords && savedData.booksRecords.length > 0) {
                setBooksData(savedData.booksRecords);
                if (savedData.gstr2bRecords) setGstr2bData(savedData.gstr2bRecords);
                if (savedData.tolerance) setTolerance(savedData.tolerance);
              }
            } else {
              setBooksData([]);
              setGstr2bData([]);
            }
          }
        } catch (err) {
          console.error('Failed to load profile:', err);
        }
      } else {
        // If not in Firebase Auth, only clear if no local user profile exists
        if (!localStorage.getItem('clear_gst_local_profile')) {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleConfirmPanEntity = async (
    newPan: string,
    newCompanyName: string,
    selectedGstins: string[],
    entity: PanEntity
  ) => {
    const cleanPan = newPan.trim().toUpperCase();
    const cleanName = newCompanyName.trim();
    setSelectedPan(cleanPan);
    setSelectedPanEntity(entity);
    localStorage.setItem('clear_gst_active_pan', cleanPan);

    const primaryGstin = entity.branches[0]?.gstin || `${cleanPan}1Z5`;
    setCompanyGstin(primaryGstin);
    localStorage.setItem('clear_gst_active_gstin', primaryGstin);

    if (selectedGstins.includes('ALL') || selectedGstins.length === entity.branches.length) {
      setSelectedGstinFilter('ALL');
      localStorage.setItem('clear_gst_active_gstin_filter', 'ALL');
    } else {
      const filterVal = selectedGstins.join(',');
      setSelectedGstinFilter(filterVal);
      localStorage.setItem('clear_gst_active_gstin_filter', filterVal);
    }

    if (currentUser) {
      const updated: UserProfile = {
        ...currentUser,
        companyGstin: primaryGstin,
        companyName: cleanName,
        state: entity.branches[0]?.stateName || currentUser.state || 'Maharashtra',
      };
      setCurrentUser(updated);
      localStorage.setItem('clear_gst_local_profile', JSON.stringify(updated));

      try {
        await updateUserProfile(currentUser.uid, {
          companyGstin: primaryGstin,
          companyName: cleanName,
          state: entity.branches[0]?.stateName || 'Maharashtra',
        });
      } catch (err) {
        console.warn('Sync user profile warning:', err);
      }
    }
  };

  // Filtered by Selected Financial Year, Month & PAN Branch Filter
  const filteredBooksData = useMemo(() => {
    const periodFiltered = filterInvoicesByPeriod(booksData, selectedPeriod, selectedMonth);
    if (!selectedGstinFilter || selectedGstinFilter === 'ALL') {
      return periodFiltered;
    }
    const allowed = selectedGstinFilter.split(',').map((g) => g.trim().toUpperCase());
    return periodFiltered.filter((inv) => {
      if (!inv.billToGstin) return true; // If unassigned, show under consolidated / default
      return allowed.includes(inv.billToGstin.toUpperCase());
    });
  }, [booksData, selectedPeriod, selectedMonth, selectedGstinFilter]);

  const filteredGstr2bData = useMemo(() => {
    const periodFiltered = filterInvoicesByPeriod(gstr2bData, selectedPeriod, selectedMonth);
    if (!selectedGstinFilter || selectedGstinFilter === 'ALL') {
      return periodFiltered;
    }
    const allowed = selectedGstinFilter.split(',').map((g) => g.trim().toUpperCase());
    return periodFiltered.filter((inv) => {
      if (!inv.billToGstin) return true;
      return allowed.includes(inv.billToGstin.toUpperCase());
    });
  }, [gstr2bData, selectedPeriod, selectedMonth, selectedGstinFilter]);

  const filteredSalesData = useMemo(() => {
    const periodFiltered = filterInvoicesByPeriod(salesData, selectedPeriod, selectedMonth);
    if (!selectedGstinFilter || selectedGstinFilter === 'ALL') {
      return periodFiltered;
    }
    const allowed = selectedGstinFilter.split(',').map((g) => g.trim().toUpperCase());
    return periodFiltered.filter((inv) => {
      if (!inv.vendorGstin) return true;
      return allowed.includes(inv.vendorGstin.toUpperCase());
    });
  }, [salesData, selectedPeriod, selectedMonth, selectedGstinFilter]);

  const filteredGstr1Data = useMemo(() => {
    const periodFiltered = filterInvoicesByPeriod(gstr1Data, selectedPeriod, selectedMonth);
    if (!selectedGstinFilter || selectedGstinFilter === 'ALL') {
      return periodFiltered;
    }
    const allowed = selectedGstinFilter.split(',').map((g) => g.trim().toUpperCase());
    return periodFiltered.filter((inv) => {
      if (!inv.vendorGstin) return true;
      return allowed.includes(inv.vendorGstin.toUpperCase());
    });
  }, [gstr1Data, selectedPeriod, selectedMonth, selectedGstinFilter]);

  // Compute Purchase Reconciliation on Period-Filtered Data
  const purchaseRecon = useMemo(() => {
    return reconcileGstData(filteredBooksData, filteredGstr2bData, tolerance);
  }, [filteredBooksData, filteredGstr2bData, tolerance]);

  // Compute Sales vs GSTR-1 Reconciliation on Period-Filtered Data
  const salesRecon = useMemo(() => {
    return reconcileGstData(filteredSalesData, filteredGstr1Data, tolerance);
  }, [filteredSalesData, filteredGstr1Data, tolerance]);

  const t = translations[language];

  // Auto-sync user data and permanent registers on change
  useEffect(() => {
    const uid = currentUser?.uid || 'user-default-session';
    if (booksData.length > 0 || gstr2bData.length > 0) {
      const timer = setTimeout(() => {
        saveUserPersistentRegisters(uid, booksData, gstr2bData);
        if (currentUser && currentUser.uid && !currentUser.uid.startsWith('demo-')) {
          saveUserReconciliationData(
            currentUser.uid,
            booksData,
            gstr2bData,
            tolerance,
            companyGstin,
            selectedPeriod,
            selectedMonth
          );
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [booksData, gstr2bData, tolerance, companyGstin, currentUser, selectedPeriod, selectedMonth]);

  // Handle Smart Match Trigger with Animation
  const handleRunSmartMatch = () => {
    setIsMatching(true);
    setTimeout(() => {
      setIsMatching(false);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#8DA173', '#2D4A3E', '#D9A14E'],
        });
      } catch (e) {
        // ignore
      }
    }, 600);
  };

  const handleOpenNotice = (item: ReconItem) => {
    setSelectedNoticeItems([item]);
    setIsNoticeOpen(true);
  };

  const handleBulkNotice = (items: ReconItem[]) => {
    setSelectedNoticeItems(items);
    setIsNoticeOpen(true);
  };

  const handleViewItem = (item: ReconItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleFilterFromCard = (status: string) => {
    setTableFilterStatus(status);
    setActiveTab('purchase_recon');
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('clear_gst_local_profile');
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setCurrentUser(null);
      setIsAuthOpen(true);
    }
  };

  // Export Reconciled Data to CSV
  const handleExportCsv = () => {
    const currentItems = activeTab === 'sales_recon' ? salesRecon.items : purchaseRecon.items;
    const headers = [
      'Status',
      'Invoice Number',
      'Supplier GSTIN',
      'Supplier Name',
      'Invoice Date',
      'Book Taxable Value',
      'Book Total Tax',
      'Book Invoice Value',
      '2B Taxable Value',
      '2B Total Tax',
      '2B Invoice Value',
      'Tax Difference',
      'Total Variance',
      'Identified Issues',
    ];

    const rows = currentItems.map((item) => [
      item.matchStatus,
      `"${item.invoiceNumber}"`,
      `"${item.gstin}"`,
      `"${item.vendorName}"`,
      item.booksRecord?.invoiceDate || item.gstr2bRecord?.invoiceDate || '',
      item.booksRecord?.taxableValue || 0,
      item.booksRecord?.totalTax || 0,
      item.booksRecord?.invoiceValue || 0,
      item.gstr2bRecord?.taxableValue || 0,
      item.gstr2bRecord?.totalTax || 0,
      item.gstr2bRecord?.invoiceValue || 0,
      item.discrepancy?.taxDiff || 0,
      item.discrepancy?.totalDiff || 0,
      `"${(item.discrepancy?.mismatchedFields || []).join('; ')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `GST_Reconciliation_${selectedPeriod.replace(/\s+/g, '_')}_${selectedMonth}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalInvoicesCount = booksData.length + gstr2bData.length;

  // Tab Title mapping
  const getTabTitle = () => {
    switch (activeTab) {
      case 'home':
        return language === 'hi' ? 'जी.एस.टी. पोर्टल एवं समाधान' : 'Overview & Platform Architecture';
      case 'dashboard':
        return language === 'hi' ? 'जी.एस.टी. रे-कन्सिलिएशन डैशबोर्ड' : 'GST Reconciliation Dashboard';
      case 'purchase_recon':
        return language === 'hi' ? 'पर्चेज़ रजिस्टर बनाम GSTR-2B मिलान' : 'Purchase Register vs GSTR-2B Audit';
      case 'sales_recon':
        return language === 'hi' ? 'सेल्स रजिस्टर बनाम GSTR-1 मिलान' : 'Sales Register vs GSTR-1 Audit';
      case 'gstr1_summary':
        return language === 'hi' ? 'GSTR-1 रिटर्न, HSN सारांश (Table 12) व B2CS सारांश' : 'GSTR-1 Returns, Table 12 HSN & B2CS Summary';
      case 'gst_verification':
        return language === 'hi' ? 'GST व PAN स्थिति सत्यापन (एकल व बल्क)' : 'GST Status & PAN Verification Portal';
      case 'gst_legal_bot':
        return language === 'hi' ? 'GST लीगल AI एडवाइजरी एवं नोटिस रिप्लाई ड्राफ्टर' : 'GST Legal AI Advisory & Notice Reply Drafter';
      case 'discrepancy_report':
        return language === 'hi' ? 'डेटासेट अंतर एवं विसंगति रिपोर्ट' : 'Dataset Gap & Discrepancy Audit';
      case 'vendor_notices':
        return language === 'hi' ? 'सप्लायर कानूनी नोटिस व संचार' : 'Supplier ITC Notices (Section 16)';
      case 'accounting':
        return language === 'hi' ? 'वित्तीय खाते एवं लेजर (P&L, बैलेंस शीट)' : 'Automated Accounts & Financial Statements (P&L / BS)';
      case 'admin_dashboard':
        return language === 'hi' ? 'एडमिनिस्ट्रेशन एवं यूजर गवर्नेंस' : 'Admin & Multi-User Governance Center';
      default:
        return 'ClearMatch GST Portal';
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F7F8F6] text-[#2D362E] font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'import') {
            setIsUploadOpen(true);
          } else if (tab === 'manual_recon') {
            setIsManualReconOpen(true);
          } else if (tab === 'manage_registers') {
            setIsManageRegistersOpen(true);
          } else if (tab === 'ai_audit') {
            setIsAiAuditOpen(true);
          } else if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        language={language}
        setLanguage={setLanguage}
        companyGstin={companyGstin}
        counts={{
          missing2b: purchaseRecon.summary.missingIn2bCount,
          mismatches: purchaseRecon.summary.mismatchCount + purchaseRecon.summary.significantDiscrepancyCount,
        }}
        currentUser={currentUser}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenClientSelector={() => {
          setIsLoginPrompt(false);
          setIsClientGstinModalOpen(true);
        }}
        onOpenGstPortalLogin={() => setIsGstPortalLoginOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          language={language}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          onOpenUpload={() => handleOpenUploadWithTab('pdf')}
          onRunMatch={handleRunSmartMatch}
          onExport={handleExportCsv}
          onOpenAiAudit={() => setIsAiAuditOpen(true)}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenClientSelector={() => {
            setIsLoginPrompt(false);
            setIsClientGstinModalOpen(true);
          }}
          onOpenGstPortalLogin={() => setIsGstPortalLoginOpen(true)}
          onOpenGstIncognitoDriver={handleOpenGstIncognitoDriver}
          onOpenManualRecon={() => setIsManualReconOpen(true)}
          onOpenManageRegisters={() => setIsManageRegistersOpen(true)}
          booksCount={booksData.length}
          gstr2bCount={gstr2bData.length}
          companyGstin={companyGstin}
          activePan={selectedPan}
          activePanEntity={selectedPanEntity}
          activeGstinFilter={selectedGstinFilter}
          onSelectGstinFilter={(filterVal) => {
            setSelectedGstinFilter(filterVal);
            localStorage.setItem('clear_gst_active_gstin_filter', filterVal);
          }}
          isMatching={isMatching}
          activeTabTitle={getTabTitle()}
          currentUser={currentUser}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Global Horizontal App Tab Bar for Instant 1-Click View Switching & Focus Mode */}
        <AppTabBar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            if (tab === 'import') {
              setIsUploadOpen(true);
            } else if (tab === 'manual_recon') {
              setIsManualReconOpen(true);
            } else if (tab === 'manage_registers') {
              setIsManageRegistersOpen(true);
            } else if (tab === 'ai_audit') {
              setIsAiAuditOpen(true);
            } else if (tab === 'settings') {
              setIsSettingsOpen(true);
            } else {
              setActiveTab(tab);
            }
          }}
          language={language}
          counts={{
            missing2b: purchaseRecon.summary.missingIn2bCount,
            mismatches: purchaseRecon.summary.mismatchCount + purchaseRecon.summary.significantDiscrepancyCount,
          }}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebarCollapse={toggleSidebarCollapse}
          isFocusMode={isFocusMode}
          onToggleFocusMode={toggleFocusMode}
          onOpenManualRecon={() => setIsManualReconOpen(true)}
          onOpenManageRegisters={() => setIsManageRegistersOpen(true)}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'home' && (
            <HomeView
              language={language}
              currentUser={currentUser}
              companyGstin={companyGstin}
              onOpenClientSelector={() => {
                setIsLoginPrompt(false);
                setIsClientGstinModalOpen(true);
              }}
              onOpenGstPortalLogin={() => setIsGstPortalLoginOpen(true)}
              onOpenGstIncognitoDriver={() => handleOpenGstIncognitoDriver()}
              onNavigate={(tab) => {
                if (tab === 'manual_recon') setIsManualReconOpen(true);
                else if (tab === 'manage_registers') setIsManageRegistersOpen(true);
                else setActiveTab(tab);
              }}
              onOpenUpload={handleOpenUploadWithTab}
              onOpenAuth={() => setIsAuthOpen(true)}
              totalInvoicesCount={totalInvoicesCount}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              summary={purchaseRecon.summary}
              items={purchaseRecon.items}
              language={language}
              selectedFY={selectedPeriod}
              selectedMonth={selectedMonth}
              onSelectMonth={(m) => setSelectedMonth(m)}
              onSelectFilter={handleFilterFromCard}
              onViewItem={handleViewItem}
              onOpenNotice={handleOpenNotice}
              onOpenAiAudit={() => setIsAiAuditOpen(true)}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenManualRecon={() => setIsManualReconOpen(true)}
              onOpenManageRegisters={() => setIsManageRegistersOpen(true)}
              booksCount={booksData.length}
              gstr2bCount={gstr2bData.length}
            />
          )}

          {activeTab === 'purchase_recon' && (
            <ReconTableView
              title={language === 'hi' ? 'पर्चेज़ रजिस्टर बनाम GSTR-2B' : 'Purchase Register vs GSTR-2B'}
              items={purchaseRecon.items}
              language={language}
              initialFilterStatus={tableFilterStatus}
              selectedFY={selectedPeriod}
              selectedMonth={selectedMonth}
              onSelectMonth={(m) => setSelectedMonth(m)}
              onViewItem={handleViewItem}
              onOpenNotice={handleOpenNotice}
              onBulkNotice={handleBulkNotice}
              onManualMatch={handleViewItem}
              onOpenManualRecon={() => setIsManualReconOpen(true)}
              onOpenManageRegisters={() => setIsManageRegistersOpen(true)}
              onDeleteRecordSingular={handleDeleteInvoiceSingular}
              onDeleteRecordsBatch={handleDeleteInvoicesBatch}
            />
          )}

          {activeTab === 'sales_recon' && (
            <ReconTableView
              title={language === 'hi' ? 'सेल्स रजिस्टर बनाम GSTR-1' : 'Sales Register vs GSTR-1 (Outward Supplies)'}
              items={salesRecon.items}
              language={language}
              initialFilterStatus="ALL"
              selectedFY={selectedPeriod}
              selectedMonth={selectedMonth}
              onSelectMonth={(m) => setSelectedMonth(m)}
              onViewItem={handleViewItem}
              onOpenNotice={handleOpenNotice}
              onBulkNotice={handleBulkNotice}
              onManualMatch={handleViewItem}
              isSalesRecon={true}
            />
          )}

          {/* GSTR-1 Returns, Table 12 HSN Summary, Table 7 B2CS & JSON Generator */}
          {activeTab === 'gstr1_summary' && (
            <div className="w-full max-w-[1750px] mx-auto px-2 sm:px-4 lg:px-6 py-3 pb-12">
              <Gstr1SummaryView
                salesInvoices={salesData}
                gstr1Invoices={gstr1Data}
                hsnItems={hsnSummaryData}
                b2csItems={b2csSummaryData}
                companyGstin={companyGstin}
                selectedFY={selectedPeriod}
                selectedMonth={selectedMonth}
                language={language}
                onOpenUpload={handleOpenUploadWithTab}
                onUpdateHsnItems={handleUpdateHsnData}
                onUpdateB2csItems={handleUpdateB2csData}
              />
            </div>
          )}

          {/* GSTIN Status & PAN-to-GSTIN Verification Engine (Single, Bulk & Excel Reports) */}
          {activeTab === 'gst_verification' && (
            <div className="w-full max-w-[1750px] mx-auto px-2 sm:px-4 lg:px-6 py-3 pb-12">
              <GstVerificationView
                language={language}
                onNavigateToAccounting={() => setActiveTab('accounting')}
                onSelectPan={(pan) => {
                  setSelectedPan(pan);
                  localStorage.setItem('clear_gst_active_pan', pan);
                  const entity = fetchGstinsForPan(pan);
                  setSelectedPanEntity(entity);
                }}
              />
            </div>
          )}

          {/* GST Legal AI Advisory & Courtroom-Ready Notice Drafter */}
          {activeTab === 'gst_legal_bot' && (
            <GstLegalAdvisorView
              language={language}
              companyGstin={companyGstin}
              companyName={currentUser?.companyName || 'Acme Technologies India Pvt Ltd'}
              preloadedQuery={preloadedLegalQuery}
            />
          )}

          {activeTab === 'discrepancy_report' && (
            <DiscrepancyReportView
              items={purchaseRecon.items}
              summary={purchaseRecon.summary}
              tolerance={tolerance}
              language={language}
              selectedFY={selectedPeriod}
              selectedMonth={selectedMonth}
              onSelectMonth={(m) => setSelectedMonth(m)}
              onViewItem={handleViewItem}
              onOpenNotice={handleOpenNotice}
              onBulkNotice={handleBulkNotice}
              onOpenAiAudit={() => setIsAiAuditOpen(true)}
            />
          )}

          {activeTab === 'vendor_notices' && (
            <ReconTableView
              title={language === 'hi' ? 'सप्लायर डिफ़ॉल्ट एवं ITC फॉलोअप सूची' : 'Defaulting Suppliers (Actionable Non-Compliance)'}
              items={purchaseRecon.items.filter(
                (i) => i.matchStatus === 'MISSING_IN_2B' || i.matchStatus === 'VALUE_MISMATCH' || i.matchStatus === 'SIGNIFICANT_DISCREPANCY'
              )}
              language={language}
              initialFilterStatus="MISSING_IN_2B"
              selectedFY={selectedPeriod}
              selectedMonth={selectedMonth}
              onSelectMonth={(m) => setSelectedMonth(m)}
              onViewItem={handleViewItem}
              onOpenNotice={handleOpenNotice}
              onBulkNotice={handleBulkNotice}
              onManualMatch={handleViewItem}
            />
          )}

          {/* Accounting, Ledgers, P&L & Balance Sheet */}
          {activeTab === 'accounting' && (
            <div className="w-full max-w-[1750px] mx-auto px-2 sm:px-4 lg:px-6 py-3 pb-12">
              <AccountingView
                purchases={booksData.length > 0 ? booksData : []}
                sales={accountingSales}
                bankTransactions={accountingBankTxns}
                onUpdateSales={handleUpdateSales}
                onUpdateBankTransactions={handleUpdateBankTxns}
                onClearData={handleClearAccountingData}
                onImportFromGst={handleImportFromGstSales}
                canImportGst={salesData.length > 0 || gstr1Data.length > 0}
                onOpenAddSale={handleOpenAddSale}
                onOpenEditSale={handleOpenEditSale}
                onDeleteSale={handleDeleteSale}
                onOpenAddBank={handleOpenAddBank}
                onOpenEditBank={handleOpenEditBank}
                onDeleteBank={handleDeleteBank}
                onNavigateToTemplates={() => setActiveTab('templates')}
                companyGstin={companyGstin}
                selectedPeriod={selectedPeriod}
                currentUser={currentUser}
                language={language}
                isAdmin={currentUser?.role === 'admin'}
              />
            </div>
          )}

          {/* Templates Hub */}
          {activeTab === 'templates' && (
            <div className="w-full max-w-[1750px] mx-auto px-2 sm:px-4 lg:px-6 py-3 pb-12">
              <TemplatesView
                language={language}
                onOpenUpload={handleOpenUploadWithTab}
              />
            </div>
          )}

          {/* Admin Dashboard */}
          {activeTab === 'admin_dashboard' && currentUser && (
            <div className="w-full max-w-[1750px] mx-auto px-2 sm:px-4 lg:px-6 py-3 pb-12">
              <AdminDashboardView
                currentUser={currentUser}
                language={language}
                onOpenUserProfile={() => setIsProfileOpen(true)}
              />
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        currentFY={selectedPeriod}
        currentMonth={selectedMonth}
        companyGstin={companyGstin}
        companyName={currentUser?.companyName || currentUser?.name || 'Acme Technologies India Pvt Ltd'}
        initialTab={uploadInitialTab}
        existingBooks={booksData}
        existingGstr2b={gstr2bData}
        existingBankTxns={accountingBankTxns}
        existingSales={accountingSales}
        salesData={salesData}
        gstr1Data={gstr1Data}
        isAdmin={currentUser?.role === 'admin'}
        onDataLoaded={(newBooks, newGstr2b, targetFY, targetMonth) => {
          setBooksData(newBooks);
          setGstr2bData(newGstr2b);
          if (targetFY) setSelectedPeriod(targetFY);
          if (targetMonth) setSelectedMonth(targetMonth);
          handleRunSmartMatch();
          setActiveTab('dashboard');
        }}
        onSalesReconDataLoaded={(newSales, newGstr1, targetFY, targetMonth) => {
          setSalesData(newSales);
          setGstr1Data(newGstr1);
          if (targetFY) setSelectedPeriod(targetFY);
          if (targetMonth) setSelectedMonth(targetMonth);
          setActiveTab('sales_recon');
        }}
        onSalesDataLoaded={(newSales) => {
          handleUpdateSales([...newSales, ...accountingSales]);
        }}
        onHsnDataLoaded={(items) => {
          handleUpdateHsnData(items);
          setActiveTab('gstr1_summary');
        }}
        onB2csDataLoaded={(items) => {
          handleUpdateB2csData(items);
          setActiveTab('gstr1_summary');
        }}
        onBankDataLoaded={(newBank) => {
          handleUpdateBankTxns([...newBank, ...accountingBankTxns]);
        }}
        language={language}
      />

      {/* Manual Invoice / Transaction Editor Modal */}
      <InvoiceEditorModal
        isOpen={isInvoiceEditorOpen}
        onClose={() => setIsInvoiceEditorOpen(false)}
        mode={invoiceEditorMode}
        initialPurchase={editingPurchase}
        initialSale={editingSale}
        initialBank={editingBank}
        onSavePurchase={handleSavePurchase}
        onSaveSale={handleSaveSale}
        onSaveBank={handleSaveBank}
        onDeletePurchase={(id) => handleDeletePurchase(id, invoiceEditorMode.includes('books') ? 'books' : 'gstr2b')}
        onDeleteSale={handleDeleteSale}
        onDeleteBank={handleDeleteBank}
        selectedFY={selectedPeriod}
      />

      <AiAuditModal
        isOpen={isAiAuditOpen}
        onClose={() => setIsAiAuditOpen(false)}
        summary={purchaseRecon.summary}
        discrepancies={purchaseRecon.items.filter((i) => i.matchStatus !== 'EXACT_MATCH')}
        language={language}
      />

      <VendorNoticeModal
        isOpen={isNoticeOpen}
        onClose={() => setIsNoticeOpen(false)}
        items={selectedNoticeItems}
        language={language}
        currentUser={currentUser}
        selectedPeriod={selectedPeriod}
        selectedMonth={selectedMonth}
      />

      <InvoiceDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        item={selectedItem}
        language={language}
        onOpenNotice={handleOpenNotice}
        onEditRecord={handleOpenEditPurchase}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        tolerance={tolerance}
        setTolerance={setTolerance}
        companyGstin={companyGstin}
        setCompanyGstin={(g) => {
          const clean = g.trim().toUpperCase();
          setCompanyGstin(clean);
          localStorage.setItem('clear_gst_active_gstin', clean);
          if (currentUser) {
            const updated = { ...currentUser, companyGstin: clean };
            setCurrentUser(updated);
            localStorage.setItem('clear_gst_local_profile', JSON.stringify(updated));
            updateUserProfile(currentUser.uid, { companyGstin: clean }).catch(() => {});
          }
        }}
        language={language}
        onReRunMatch={handleRunSmartMatch}
        sampleBooks={booksData}
        sampleGstr2b={gstr2bData}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={() => {
          setIsAuthOpen(false);
          setIsLoginPrompt(true);
          setIsClientGstinModalOpen(true);
        }}
        onUserSignedIn={(profile) => {
          setCurrentUser(profile);
          if (profile.companyGstin) {
            setCompanyGstin(profile.companyGstin);
            localStorage.setItem('clear_gst_active_gstin', profile.companyGstin);
          }
          setIsLoginPrompt(true);
          setIsClientGstinModalOpen(true);
        }}
      />

      {/* PAN-Wise Entity & Multi-GSTIN Session Prompt & Switcher Modal */}
      <ClientGstinModal
        isOpen={isClientGstinModalOpen}
        onClose={() => setIsClientGstinModalOpen(false)}
        currentPan={selectedPan}
        currentGstinFilter={selectedGstinFilter}
        currentCompanyName={selectedPanEntity?.legalName || currentUser?.companyName || 'Apex Advisory Practice'}
        onConfirmPanEntity={handleConfirmPanEntity}
        currentUser={currentUser}
        language={language}
        isLoginPrompt={isLoginPrompt}
        onOpenGstPortalLogin={() => setIsGstPortalLoginOpen(true)}
        onOpenGstIncognitoDriver={handleOpenGstIncognitoDriver}
      />

      {/* Official GST Portal Login & Live AI Captcha Auto-Fill Modal */}
      <GstPortalLoginModal
        isOpen={isGstPortalLoginOpen}
        onClose={() => setIsGstPortalLoginOpen(false)}
        allEntities={getStoredPanEntities()}
        entities={getStoredPanEntities()}
        activeEntity={selectedPanEntity}
        onSelectEntity={(entity) => {
          setSelectedPan(entity.pan);
          setSelectedPanEntity(entity);
          localStorage.setItem('clear_gst_active_pan', entity.pan);
          if (entity.branches.length > 0) {
            setCompanyGstin(entity.branches[0].gstin);
            localStorage.setItem('clear_gst_active_gstin', entity.branches[0].gstin);
          }
        }}
        onUpdateEntity={(updated) => {
          savePanEntity(updated);
          if (selectedPan.toUpperCase() === updated.pan.toUpperCase()) {
            setSelectedPanEntity(updated);
          }
        }}
        onOpenGstIncognitoDriver={handleOpenGstIncognitoDriver}
        language={language}
      />

      {/* GST Automated Incognito Driver Modal */}
      <GstIncognitoDriverModal
        isOpen={isGstIncognitoDriverOpen}
        onClose={() => setIsGstIncognitoDriverOpen(false)}
        targetGstin={driverTargetGstin}
        targetBranch={driverTargetBranch}
        targetEntity={driverTargetEntity}
        onSaveCredentials={(user, pwd) => {
          if (driverTargetGstin) {
            updateBranchCredentials(driverTargetGstin, user, pwd);
          }
        }}
      />

      {/* User Profile Modal */}
      {currentUser && (
        <UserProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          userProfile={currentUser}
          onProfileUpdated={(updated) => {
            setCurrentUser(updated);
            if (updated.companyGstin) {
              setCompanyGstin(updated.companyGstin);
              localStorage.setItem('clear_gst_active_gstin', updated.companyGstin);
            }
          }}
          onLogout={handleLogout}
          onSwitchAccount={() => {
            setIsProfileOpen(false);
            setIsAuthOpen(true);
          }}
        />
      )}

      {/* Manual Period Reconciliation Studio Modal (e.g. 022022 to 022026) */}
      {isManualReconOpen && (
        <ManualReconModal
          isOpen={isManualReconOpen}
          onClose={() => setIsManualReconOpen(false)}
          booksData={booksData}
          gstr2bData={gstr2bData}
          currentUser={currentUser}
          companyGstin={companyGstin}
          tolerance={tolerance}
          language={language}
          onDeleteInvoiceSingular={handleDeleteInvoiceSingular}
          onDeleteInvoicesBatch={handleDeleteInvoicesBatch}
          onLoadMultiPeriodSample={handleLoadMultiPeriodSample}
          onOpenUpload={(tab?: ImportTabType) => {
            setIsManualReconOpen(false);
            handleOpenUploadWithTab(tab || 'zip_2b');
          }}
        />
      )}

      {/* Persistent User ID Stored Registers Manager Modal (Singular & Bulk Deletion) */}
      {isManageRegistersOpen && (
        <ManageRegistersModal
          isOpen={isManageRegistersOpen}
          onClose={() => setIsManageRegistersOpen(false)}
          booksData={booksData}
          gstr2bData={gstr2bData}
          currentUser={currentUser}
          companyGstin={companyGstin}
          onDeleteSingular={handleDeleteInvoiceSingular}
          onDeleteBatch={handleDeleteInvoicesBatch}
          onClearAll={handleClearRegistersAll}
          onOpenUpload={(tab?: ImportTabType) => {
            setIsManageRegistersOpen(false);
            handleOpenUploadWithTab(tab || 'zip_2b');
          }}
          onLoadMultiPeriodSample={handleLoadMultiPeriodSample}
          language={language}
        />
      )}

      {/* Global Floating GST Legal AI Assistant Widget */}
      <GstChatbotWidget
        language={language}
        companyGstin={companyGstin}
        companyName={currentUser?.companyName || 'Acme Technologies India Pvt Ltd'}
        onOpenFullStudio={(preloaded) => {
          if (preloaded) {
            setPreloadedLegalQuery(preloaded);
          }
          setActiveTab('gst_legal_bot');
        }}
      />
    </div>
  );
}
