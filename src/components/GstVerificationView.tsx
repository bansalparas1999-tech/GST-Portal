import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  FileSpreadsheet,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Layers,
  Building,
  UploadCloud,
  RefreshCw,
  Eye,
  Check,
  Filter,
  FileCode,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Server,
  Wifi,
  WifiOff,
  Globe,
  Key,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  GstVerificationSubTab,
  GstinStatusVerification,
  PanToGstinsResult,
  PanGstinResItem,
  Language,
} from '../types';
import {
  verifyGstinStatus,
  verifyBulkGstins,
  getPanToGstins,
  getBulkPanToGstins,
  exportGstinVerificationToExcel,
  exportPanToGstinsToExcel,
  SAMPLE_TEST_GSTINS,
  SAMPLE_TEST_PANS,
  PAN_REGEX,
} from '../utils/gstVerificationEngine';

interface GstVerificationViewProps {
  language: Language;
  onNavigateToAccounting?: () => void;
  onSelectPan?: (pan: string) => void;
}

export const GstVerificationView: React.FC<GstVerificationViewProps> = ({
  language,
  onSelectPan,
}) => {
  // Primary sub-tab: Single GSTIN, Bulk GSTIN, Single PAN, Bulk PAN
  const [activeSubTab, setActiveSubTab] =
    useState<GstVerificationSubTab>('gst_single');

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // ==========================================
  // LIVE WHITEBOOKS GSP GATEWAY CONFIG & STATE
  // ==========================================
  const [useLiveGateway, setUseLiveGateway] = useState<boolean>(true);
  const [gatewayStatus, setGatewayStatus] = useState<{
    connected: boolean;
    provider?: string;
    status_cd?: string;
    status_desc?: string;
    latencyMs?: number;
    baseUrl?: string;
    clientIdMasked?: string;
    isCredentialsActive?: boolean;
  } | null>(null);
  const [isCheckingGateway, setIsCheckingGateway] = useState<boolean>(false);
  const [gatewayDiagnosticNote, setGatewayDiagnosticNote] = useState<string | null>(null);

  const checkGatewayHealth = async () => {
    setIsCheckingGateway(true);
    try {
      const res = await fetch('/api/gst/gateway-status');
      const data = await res.json();
      setGatewayStatus(data);
      if (data?.status_desc && data.status_cd === '0') {
        setGatewayDiagnosticNote(
          `Gateway connected (${data.latencyMs || 0}ms). Note: Whitebooks sandbox returned: "${data.status_desc}". Verify credentials / activate sandbox access at accounts.whitebooks.in.`
        );
      } else {
        setGatewayDiagnosticNote(null);
      }
    } catch (err: any) {
      setGatewayStatus({
        connected: false,
        status_desc: err.message || 'Failed to ping Whitebooks gateway',
      });
    } finally {
      setIsCheckingGateway(false);
    }
  };

  useEffect(() => {
    checkGatewayHealth();
  }, []);

  // ==========================================
  // TAB 1: SINGLE GSTIN VERIFICATION STATE
  // ==========================================
  // TAB 1: SINGLE GSTIN EXTRACTION STATE
  // ==========================================
  const [singleGstinInput, setSingleGstinInput] = useState<string>('27AABCA1234F1Z8');
  const [singleGstinStatusOverride, setSingleGstinStatusOverride] = useState<string>('Auto');
  const [singleGstinResult, setSingleGstinResult] =
    useState<GstinStatusVerification | null>(() =>
      verifyGstinStatus('27AABCA1234F1Z8')
    );
  const [isVerifyingSingleGstin, setIsVerifyingSingleGstin] = useState<boolean>(false);

  const handleVerifySingleGstin = async (overrideGstin?: string, overrideStatus?: string) => {
    const target = (overrideGstin !== undefined ? overrideGstin : singleGstinInput).trim().toUpperCase();
    const statusParam = overrideStatus !== undefined ? overrideStatus : singleGstinStatusOverride;
    setIsVerifyingSingleGstin(true);

    if (useLiveGateway && target.length === 15) {
      try {
        const resp = await fetch('/api/gst/live-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gstin: target }),
        });
        const data = await resp.json();
        if (data.success && data.result) {
          const liveRes = data.result;
          const chosenStatus = statusParam !== 'Auto' ? statusParam : (liveRes.status || 'Active');
          const statutory = verifyGstinStatus(target, chosenStatus);

          setSingleGstinResult({
            ...statutory,
            legalName: liveRes.legalName || statutory.legalName,
            tradeName: liveRes.tradeName || statutory.tradeName,
            taxpayerType: liveRes.taxpayerType || statutory.taxpayerType,
            registrationDate: liveRes.registrationDate || statutory.registrationDate,
            constitution: liveRes.constitution || statutory.constitution,
            address: liveRes.address || statutory.address,
            status: chosenStatus,
          });

          if (liveRes.diagnosticNote) {
            setGatewayDiagnosticNote(liveRes.diagnosticNote);
          } else if (liveRes.isLive) {
            setGatewayDiagnosticNote(`Live Taxpayer data fetched from Whitebooks GSP Gateway in ${liveRes.responseTimeMs}ms`);
          }
          setIsVerifyingSingleGstin(false);
          return;
        }
      } catch (err) {
        console.warn('Live verify error, fallback to statutory engine:', err);
      }
    }

    setTimeout(() => {
      const chosenStatus = statusParam !== 'Auto' ? statusParam : undefined;
      const res = verifyGstinStatus(target, chosenStatus);
      setSingleGstinResult(res);
      setIsVerifyingSingleGstin(false);
    }, 150);
  };

  // ==========================================
  // TAB 2: BULK GSTIN VERIFICATION STATE
  // ==========================================
  const [bulkGstinText, setBulkGstinText] = useState<string>(
    SAMPLE_TEST_GSTINS.join('\n')
  );
  const [bulkGstinResults, setBulkGstinResults] = useState<
    GstinStatusVerification[]
  >(() => verifyBulkGstins(SAMPLE_TEST_GSTINS));
  const [bulkGstinFilter, setBulkGstinFilter] = useState<
    'ALL' | 'VALID' | 'ACTIVE' | 'CANCELLED' | 'INVALID'
  >('ALL');
  const [bulkGstinSearch, setBulkGstinSearch] = useState<string>('');
  const [isProcessingBulkGstin, setIsProcessingBulkGstin] = useState<boolean>(false);

  const handleProcessBulkGstin = async (customList?: string[]) => {
    setIsProcessingBulkGstin(true);
    const listToProcess =
      customList ||
      bulkGstinText
        .split(/[\n,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);

    if (useLiveGateway && listToProcess.length > 0) {
      try {
        const resp = await fetch('/api/gst/live-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gstins: listToProcess.slice(0, 25) }),
        });
        const data = await resp.json();
        if (data.success && Array.isArray(data.results)) {
          const liveMap = new Map<string, any>(data.results.map((r: any) => [r.gstin, r]));
          const statutory = verifyBulkGstins(listToProcess);
          const merged = statutory.map((item) => {
            const live = liveMap.get(item.gstin);
            if (live && live.isLive) {
              return {
                ...item,
                status: live.status,
                legalName: live.legalName || item.legalName,
                tradeName: live.tradeName || item.tradeName,
              };
            }
            return item;
          });
          setBulkGstinResults(merged);
          setIsProcessingBulkGstin(false);
          return;
        }
      } catch (err) {
        console.warn('Live bulk verify fallback:', err);
      }
    }

    setTimeout(() => {
      const results = verifyBulkGstins(listToProcess);
      setBulkGstinResults(results);
      setIsProcessingBulkGstin(false);
    }, 250);
  };

  const handleUpdateBulkItemStatus = (gstin: string, newStatus: string) => {
    setBulkGstinResults((prev) =>
      prev.map((item) =>
        item.gstin === gstin ? { ...item, status: newStatus } : item
      )
    );
  };

  const handleSetBulkAllStatus = (newStatus: string) => {
    setBulkGstinResults((prev) =>
      prev.map((item) => ({
        ...item,
        status: newStatus,
      }))
    );
  };

  const handleFileUploadGstin = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Flatten all cells and find valid-looking strings
        const extractedGstins: string[] = [];
        json.forEach((row) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              const str = String(cell || '').trim();
              if (str.length >= 10 && str.length <= 16) {
                extractedGstins.push(str.toUpperCase());
              }
            });
          }
        });

        if (extractedGstins.length > 0) {
          setBulkGstinText(extractedGstins.join('\n'));
          handleProcessBulkGstin(extractedGstins);
        } else {
          alert('Could not detect any GSTINs in the uploaded file.');
        }
      } catch (err) {
        alert('Failed to parse file. Please upload a valid Excel or CSV.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Filtered Bulk GSTINs
  const filteredBulkGstins = useMemo(() => {
    return bulkGstinResults.filter((item) => {
      // Search match
      const query = bulkGstinSearch.trim().toUpperCase();
      const matchesSearch =
        !query ||
        item.gstin.includes(query) ||
        (item.stateName && item.stateName.toUpperCase().includes(query)) ||
        (item.legalName && item.legalName.toUpperCase().includes(query)) ||
        (item.tradeName && item.tradeName.toUpperCase().includes(query)) ||
        (item.stateCode && item.stateCode.includes(query));

      if (!matchesSearch) return false;

      // Status filter
      if (bulkGstinFilter === 'VALID') return item.validGstin;
      if (bulkGstinFilter === 'ACTIVE') return item.status === 'Active';
      if (bulkGstinFilter === 'CANCELLED')
        return item.status === 'Cancelled' || item.status === 'Suspended';
      if (bulkGstinFilter === 'INVALID') return !item.validGstin;
      return true;
    });
  }, [bulkGstinResults, bulkGstinSearch, bulkGstinFilter]);

  // Bulk GSTIN KPIs
  const bulkGstinKpis = useMemo(() => {
    const total = bulkGstinResults.length;
    const valid = bulkGstinResults.filter((r) => r.validGstin).length;
    const active = bulkGstinResults.filter((r) => r.status === 'Active').length;
    const cancelled = bulkGstinResults.filter(
      (r) => r.status === 'Cancelled' || r.status === 'Suspended'
    ).length;
    const invalid = bulkGstinResults.filter((r) => !r.validGstin).length;

    return { total, valid, active, cancelled, invalid };
  }, [bulkGstinResults]);

  // ==========================================
  // TAB 3: SINGLE PAN TO GSTINS STATE
  // ==========================================
  const [singlePanInput, setSinglePanInput] = useState<string>('AABCA1234F');
  const [singlePanResult, setSinglePanResult] = useState<PanToGstinsResult | null>(
    () => getPanToGstins('AABCA1234F')
  );
  const [isSearchingSinglePan, setIsSearchingSinglePan] = useState<boolean>(false);

  const handleSearchSinglePan = async (overridePan?: string) => {
    const target = (overridePan !== undefined ? overridePan : singlePanInput).trim().toUpperCase();
    setIsSearchingSinglePan(true);

    if (useLiveGateway && target.length === 10) {
      try {
        const resp = await fetch('/api/gst/live-pan-mapping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pan: target }),
        });
        const data = await resp.json();
        if (data.success && Array.isArray(data.gstinResList)) {
          const statutory = getPanToGstins(target);
          setSinglePanResult({
            ...statutory,
            panNum: target,
            gstinResList: data.gstinResList,
            totalGstins: data.gstinResList.length,
            activeGstins: data.gstinResList.filter((g: any) => g.authStatus === 'Active').length,
            cancelledGstins: data.gstinResList.filter((g: any) => g.authStatus !== 'Active').length,
          });
          if (data.gatewayStatusDesc) {
            setGatewayDiagnosticNote(`Whitebooks Gateway (${data.gateway}): ${data.gatewayStatusDesc}`);
          }
          setIsSearchingSinglePan(false);
          return;
        }
      } catch (err) {
        console.warn('Live PAN mapping fallback:', err);
      }
    }

    setTimeout(() => {
      const res = getPanToGstins(target);
      setSinglePanResult(res);
      setIsSearchingSinglePan(false);
    }, 150);
  };

  const [newBranchGstinInput, setNewBranchGstinInput] = useState<string>('');
  const [newBranchStatusInput, setNewBranchStatusInput] = useState<string>('Active');
  const [showAddBranch, setShowAddBranch] = useState<boolean>(false);

  const handleAddBranchToSinglePan = () => {
    if (!singlePanResult) return;
    const cleanG = newBranchGstinInput.trim().toUpperCase();
    if (!cleanG || cleanG.length !== 15) {
      alert('Please enter a valid 15-character GSTIN (checksum validation is disabled)');
      return;
    }
    const stateCd = cleanG.substring(0, 2);
    const newBranch: PanGstinResItem = {
      gstin: cleanG,
      authStatus: newBranchStatusInput,
      stateCd,
      stateName: `State Code ${stateCd}`,
      tradeName: `${singlePanResult.tradeName || 'Enterprise'} (${stateCd})`,
      legalName: singlePanResult.legalName,
      taxpayerType: 'Regular Taxpayer',
    };
    const updatedList = [...singlePanResult.gstinResList.filter((g) => g.gstin !== cleanG), newBranch];
    const activeCount = updatedList.filter((g) => g.authStatus === 'Active').length;
    const cancelledCount = updatedList.filter((g) => g.authStatus === 'Cancelled').length;
    setSinglePanResult({
      ...singlePanResult,
      gstinResList: updatedList,
      totalGstins: updatedList.length,
      activeGstins: activeCount,
      cancelledGstins: cancelledCount,
    });
    setNewBranchGstinInput('');
    setShowAddBranch(false);
  };

  const handleToggleBranchStatus = (gstin: string) => {
    if (!singlePanResult) return;
    const updatedList = singlePanResult.gstinResList.map((b) => {
      if (b.gstin === gstin) {
        return {
          ...b,
          authStatus: b.authStatus === 'Active' ? 'Cancelled' : 'Active',
        };
      }
      return b;
    });
    const activeCount = updatedList.filter((g) => g.authStatus === 'Active').length;
    const cancelledCount = updatedList.filter((g) => g.authStatus === 'Cancelled').length;
    setSinglePanResult({
      ...singlePanResult,
      gstinResList: updatedList,
      activeGstins: activeCount,
      cancelledGstins: cancelledCount,
    });
  };

  // ==========================================
  // TAB 4: BULK PAN TO GSTINS STATE
  // ==========================================
  const [bulkPanText, setBulkPanText] = useState<string>(
    SAMPLE_TEST_PANS.join('\n')
  );
  const [bulkPanResults, setBulkPanResults] = useState<PanToGstinsResult[]>(
    () => getBulkPanToGstins(SAMPLE_TEST_PANS)
  );
  const [bulkPanSearch, setBulkPanSearch] = useState<string>('');
  const [expandedPanRow, setExpandedPanRow] = useState<string | null>(null);
  const [isProcessingBulkPan, setIsProcessingBulkPan] = useState<boolean>(false);

  const handleProcessBulkPan = (customList?: string[]) => {
    setIsProcessingBulkPan(true);
    const listToProcess =
      customList ||
      bulkPanText
        .split(/[\n,;\s]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

    setTimeout(() => {
      const results = getBulkPanToGstins(listToProcess);
      setBulkPanResults(results);
      setIsProcessingBulkPan(false);
    }, 250);
  };

  const handleFileUploadPan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const extractedPans: string[] = [];
        json.forEach((row) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              const str = String(cell || '').trim().toUpperCase();
              if (PAN_REGEX.test(str)) {
                extractedPans.push(str);
              }
            });
          }
        });

        if (extractedPans.length > 0) {
          setBulkPanText(extractedPans.join('\n'));
          handleProcessBulkPan(extractedPans);
        } else {
          alert('Could not find any valid 10-character PANs in the file.');
        }
      } catch (err) {
        alert('Failed to parse file. Please upload a valid Excel or CSV.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  // Filtered Bulk PANs
  const filteredBulkPans = useMemo(() => {
    return bulkPanResults.filter((p) => {
      const query = bulkPanSearch.trim().toUpperCase();
      if (!query) return true;
      return (
        p.panNum.includes(query) ||
        (p.legalName && p.legalName.toUpperCase().includes(query)) ||
        (p.constitution && p.constitution.toUpperCase().includes(query)) ||
        p.gstinResList.some(
          (g) =>
            g.gstin.includes(query) ||
            g.stateCd.includes(query) ||
            (g.stateName && g.stateName.toUpperCase().includes(query))
        )
      );
    });
  }, [bulkPanResults, bulkPanSearch]);

  // Bulk PAN KPIs
  const bulkPanKpis = useMemo(() => {
    const totalPans = bulkPanResults.length;
    let totalGstins = 0;
    let activeGstins = 0;
    let cancelledGstins = 0;

    bulkPanResults.forEach((p) => {
      totalGstins += p.gstinResList.length;
      activeGstins += p.gstinResList.filter((g) => g.authStatus === 'Active').length;
      cancelledGstins += p.gstinResList.filter(
        (g) => g.authStatus === 'Cancelled' || g.authStatus === 'Suspended'
      ).length;
    });

    return { totalPans, totalGstins, activeGstins, cancelledGstins };
  }, [bulkPanResults]);

  // Status badge styling helper
  const getStatusBadge = (status?: string, validGstin = true) => {
    if (!validGstin || status === 'Invalid GSTIN') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5" />
          Invalid Syntax
        </span>
      );
    }
    if (status === 'Active') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Active
        </span>
      );
    }
    if (status === 'Suspended') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
        <AlertCircle className="w-3.5 h-3.5" />
        {status || 'Cancelled'}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Title */}
      <div className="bg-[#2D4A3E] text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#8DA173] text-white tracking-wide">
                GST PORTAL EXTRACTION & REQUEST PAYLOAD ENGINE
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-900/60 border border-emerald-400/40 text-emerald-200 tracking-wide flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-300" />
                Checksum Validation: Disabled (Direct Payload Mode)
              </span>
              <span className="text-xs text-[#CBD5C0]">
                Statutory Extraction Schemas 1 & 2
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <ShieldCheck className="w-7 h-7 text-[#8DA173]" />
              GST Status & PAN-Wise GST Mapping Extraction Portal
            </h1>
            <p className="text-sm text-[#E2E8D8] mt-1 max-w-3xl">
              Extract GSTIN status and PAN-to-GSTIN mapping payloads for GST Portal queries.
              Outputs clean request payloads without checksum constraints, with instant Excel (.xlsx) and JSON report downloads.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                if (activeSubTab === 'gst_single' && singleGstinResult) {
                  exportGstinVerificationToExcel([singleGstinResult]);
                } else if (activeSubTab === 'gst_bulk') {
                  exportGstinVerificationToExcel(bulkGstinResults);
                } else if (activeSubTab === 'pan_single' && singlePanResult) {
                  exportPanToGstinsToExcel([singlePanResult]);
                } else if (activeSubTab === 'pan_bulk') {
                  exportPanToGstinsToExcel(bulkPanResults);
                }
              }}
              className="px-4 py-2.5 bg-[#8DA173] hover:bg-[#7D9163] text-white rounded-xl text-sm font-semibold shadow-xs transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Excel Report (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Whitebooks GSP Gateway Status & Controls */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className={`p-2.5 rounded-xl ${gatewayStatus?.connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-zinc-900">
                  Whitebooks GSP Gateway
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  gatewayStatus?.connected
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-zinc-100 text-zinc-600'
                }`}>
                  {gatewayStatus?.connected ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Connected to Sandbox ({gatewayStatus.latencyMs ? `${(gatewayStatus.latencyMs / 1000).toFixed(1)}s` : 'active'})
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                      Checking Connection...
                    </>
                  )}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-100 text-zinc-700 border border-zinc-200">
                  https://apisandbox.whitebooks.in
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Client ID: <code className="font-mono text-zinc-800 bg-zinc-100 px-1 py-0.5 rounded">GSTS6718991e...</code></span>
                <span>•</span>
                <span>Secret: <code className="font-mono text-zinc-800 bg-zinc-100 px-1 py-0.5 rounded">GSTSb5ed...</code> (Server Protected)</span>
                <span>•</span>
                <span>OAuth / Public Search Gateway API</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-100">
            {/* Live Gateway Toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none px-3 py-2 rounded-xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-colors">
              <input
                type="checkbox"
                checked={useLiveGateway}
                onChange={(e) => setUseLiveGateway(e.target.checked)}
                className="w-4 h-4 text-[#2D4A3E] rounded border-zinc-300 focus:ring-[#2D4A3E]"
              />
              <span className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#2D4A3E]" />
                Live Whitebooks GSP Mode
              </span>
            </label>

            {/* Test Gateway Ping */}
            <button
              onClick={checkGatewayHealth}
              disabled={isCheckingGateway}
              className="px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingGateway ? 'animate-spin' : ''}`} />
              Test Gateway Ping
            </button>
          </div>
        </div>

        {/* Diagnostic Notice Card if credentials pending activation */}
        {gatewayDiagnosticNote && (
          <div className="mt-4 p-3.5 bg-amber-50/80 rounded-xl border border-amber-200/90 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold text-amber-950">
                Whitebooks Sandbox Account Status:
              </p>
              <p className="text-amber-800">
                {gatewayDiagnosticNote}
              </p>
              <p className="text-[11px] text-amber-700/90 pt-0.5">
                Note: In sandbox mode, Whitebooks activates developer credentials following email confirmation at{' '}
                <a
                  href="https://accounts.whitebooks.in"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline hover:text-amber-950"
                >
                  accounts.whitebooks.in
                </a>
                . Meanwhile, all statutory extraction payloads (Schema 1 & Schema 2) run with zero checksum constraints and full Excel export capability.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Sub-Navigation Tabs */}
      <div className="bg-white rounded-xl border border-zinc-200 p-1.5 shadow-xs flex flex-wrap gap-1">
        <button
          onClick={() => setActiveSubTab('gst_single')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeSubTab === 'gst_single'
              ? 'bg-[#2D4A3E] text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
          }`}
        >
          <Search className="w-4 h-4" />
          GST Status Extraction (Single)
        </button>

        <button
          onClick={() => setActiveSubTab('gst_bulk')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeSubTab === 'gst_bulk'
              ? 'bg-[#2D4A3E] text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          Bulk Status Extraction (Batch Payload)
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeSubTab === 'gst_bulk'
                ? 'bg-white/20 text-white'
                : 'bg-zinc-100 text-zinc-700'
            }`}
          >
            {bulkGstinResults.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('pan_single')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeSubTab === 'pan_single'
              ? 'bg-[#2D4A3E] text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
          }`}
        >
          <Building className="w-4 h-4" />
          PAN-to-GSTINs Mapping (Single)
        </button>

        <button
          onClick={() => setActiveSubTab('pan_bulk')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
            activeSubTab === 'pan_bulk'
              ? 'bg-[#2D4A3E] text-white shadow-xs'
              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Bulk PAN Mapping (Batch Payload)
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              activeSubTab === 'pan_bulk'
                ? 'bg-white/20 text-white'
                : 'bg-zinc-100 text-zinc-700'
            }`}
          >
            {bulkPanResults.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: VERIFY SINGLE GSTIN                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'gst_single' && (
        <div className="space-y-6">
          {/* Input & Search Section */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-bold tracking-wider uppercase text-zinc-600">
                  Enter 15-Digit GSTIN (Goods & Services Tax Identification Number)
                </label>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Checksum Validation: Bypassed for Extraction
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 27AABCA1234F1Z8 or 36AAAAA0000A1Z5"
                    value={singleGstinInput}
                    onChange={(e) => setSingleGstinInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifySingleGstin()}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl font-mono text-base font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#2D4A3E] focus:bg-white tracking-wider uppercase"
                  />
                  {singleGstinInput && (
                    <button
                      onClick={() => setSingleGstinInput('')}
                      className="absolute right-3 top-3.5 text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="sm:w-44">
                  <select
                    value={singleGstinStatusOverride}
                    onChange={(e) => {
                      setSingleGstinStatusOverride(e.target.value);
                      handleVerifySingleGstin(undefined, e.target.value);
                    }}
                    className="w-full px-3 py-3 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#2D4A3E]"
                  >
                    <option value="Auto">Auto Status</option>
                    <option value="Active">Force Active</option>
                    <option value="Cancelled">Force Cancelled</option>
                    <option value="Suspended">Force Suspended</option>
                    <option value="Inactive">Force Inactive</option>
                  </select>
                </div>

                <button
                  onClick={() => handleVerifySingleGstin()}
                  disabled={isVerifyingSingleGstin || !singleGstinInput.trim()}
                  className="px-6 py-3 bg-[#2D4A3E] hover:bg-[#223930] text-white rounded-xl font-semibold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isVerifyingSingleGstin ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Extract Payload
                </button>
              </div>

              {/* Sample Quick Chips */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500 font-medium">Quick Extraction Tests:</span>
                {[
                  { label: 'Apex (Active)', gstin: '27AABCA1234F1Z8' },
                  { label: 'Delhi Branch', gstin: '07AABCA1234F1Z9' },
                  { label: 'TCS (Active)', gstin: '27AAACT2727Q1ZW' },
                  { label: 'Reliance', gstin: '27AAACR5055K1Z0' },
                  { label: 'Cancelled Entity', gstin: '08AAABB9999K1Z4' },
                  { label: 'Custom 15-Char (No Checksum)', gstin: '36AAAAA0000A1Z5' },
                ].map((chip) => (
                  <button
                    key={chip.gstin}
                    onClick={() => {
                      setSingleGstinInput(chip.gstin);
                      handleVerifySingleGstin(chip.gstin);
                    }}
                    className="px-2.5 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md font-mono transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result Presentation */}
          {singleGstinResult && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Detailed Taxpayer Profile Card */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-zinc-100 gap-4">
                  <div>
                    <span className="text-xs font-mono text-zinc-500 block mb-1">
                      EXTRACTED GSTIN IDENTIFIER
                    </span>
                    <h2 className="text-2xl font-mono font-bold text-zinc-900 tracking-wider">
                      {singleGstinResult.gstin}
                    </h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(singleGstinResult.status, singleGstinResult.validGstin)}
                    <button
                      onClick={() =>
                        exportGstinVerificationToExcel(
                          [singleGstinResult],
                          `GSTIN_${singleGstinResult.gstin}_Verification.xlsx`
                        )
                      }
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Excel
                    </button>
                  </div>
                </div>

                {/* Properties Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                    <span className="text-xs text-zinc-500 block">Valid GSTIN Flag (validGstin)</span>
                    <span
                      className={`text-base font-bold ${
                        singleGstinResult.validGstin ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {singleGstinResult.validGstin ? 'TRUE (15 Characters Valid)' : 'FALSE (Length Mismatch)'}
                    </span>
                    <span className="text-[11px] text-zinc-400 block mt-0.5">
                      Checksum checks disabled for extraction
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                    <span className="text-xs text-zinc-500 block">GSTIN Status (status)</span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-base font-bold text-zinc-900">
                        {singleGstinResult.status || 'N/A'}
                      </span>
                      <button
                        onClick={() => {
                          const nextStatus = singleGstinResult.status === 'Active' ? 'Cancelled' : 'Active';
                          handleVerifySingleGstin(singleGstinResult.gstin, nextStatus);
                        }}
                        className="text-[11px] text-[#2D4A3E] font-semibold hover:underline"
                      >
                        Toggle Status
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                    <span className="text-xs text-zinc-500 block">State Code (stateCode)</span>
                    <span className="text-base font-bold font-mono text-zinc-900">
                      {singleGstinResult.stateCode || 'N/A'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                    <span className="text-xs text-zinc-500 block">State Name (stateName)</span>
                    <span className="text-base font-bold text-zinc-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#8DA173]" />
                      {singleGstinResult.stateName || 'N/A'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                    <span className="text-xs text-zinc-500 block">Linked PAN</span>
                    <span className="text-base font-bold font-mono text-zinc-900">
                      {singleGstinResult.pan || 'N/A'}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                    <span className="text-xs text-zinc-500 block">Constitution of Business</span>
                    <span className="text-base font-semibold text-zinc-900">
                      {singleGstinResult.constitution || 'N/A'}
                    </span>
                  </div>

                  <div className="md:col-span-2 p-3.5 rounded-xl bg-zinc-50 border border-zinc-100">
                    <span className="text-xs text-zinc-500 block">Legal / Trade Name</span>
                    <span className="text-base font-bold text-zinc-900 block">
                      {singleGstinResult.legalName || 'N/A'}
                    </span>
                    {singleGstinResult.tradeName &&
                      singleGstinResult.tradeName !== singleGstinResult.legalName && (
                        <span className="text-xs text-zinc-600 block mt-0.5">
                          Trade Name: {singleGstinResult.tradeName}
                        </span>
                      )}
                  </div>
                </div>

                {singleGstinResult.errorMessage && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Validation Diagnostic Warning</p>
                      <p className="text-xs text-rose-700 mt-0.5">
                        {singleGstinResult.errorMessage}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Col: Exact Schema 1 Output Inspector */}
              <div className="bg-[#1E293B] text-zinc-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-700 mb-3">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-[#8DA173]" />
                      <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                        GST Portal Request Payload (Schema 1)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          const schemaObj = {
                            gstin: singleGstinResult.gstin,
                            stateCode: singleGstinResult.stateCode,
                            stateName: singleGstinResult.stateName,
                            status: singleGstinResult.status,
                            validGstin: singleGstinResult.validGstin,
                          };
                          handleCopy('single_gstin_json', JSON.stringify(schemaObj, null, 2));
                        }}
                        className="text-xs px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors flex items-center gap-1"
                      >
                        {copiedKey === 'single_gstin_json' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        Copy JSON
                      </button>
                    </div>
                  </div>

                  <pre className="text-xs font-mono text-emerald-400 bg-black/40 p-3.5 rounded-xl overflow-x-auto leading-relaxed">
                    {JSON.stringify(
                      {
                        gstin: singleGstinResult.gstin,
                        stateCode: singleGstinResult.stateCode,
                        stateName: singleGstinResult.stateName,
                        status: singleGstinResult.status,
                        validGstin: singleGstinResult.validGstin,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-700 space-y-3">
                  <div className="text-xs text-zinc-400 leading-relaxed">
                    Extraction Request Payload matches statutory Schema 1:{' '}
                    <code className="text-zinc-200">gstin</code>,{' '}
                    <code className="text-zinc-200">stateCode</code>,{' '}
                    <code className="text-zinc-200">stateName</code>,{' '}
                    <code className="text-zinc-200">status</code>, and{' '}
                    <code className="text-zinc-200">validGstin</code>.
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const schemaObj = {
                          gstin: singleGstinResult.gstin,
                          stateCode: singleGstinResult.stateCode,
                          stateName: singleGstinResult.stateName,
                          status: singleGstinResult.status,
                          validGstin: singleGstinResult.validGstin,
                        };
                        const blob = new Blob([JSON.stringify(schemaObj, null, 2)], {
                          type: 'application/json',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `GST_Payload_${singleGstinResult.gstin}.json`;
                        a.click();
                      }}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Payload (.json)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: BULK GSTIN VERIFICATION                                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'gst_bulk' && (
        <div className="space-y-6">
          {/* Input Area & Controls */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Bulk GSTIN Verification Input
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Paste up to 1,000 GSTINs separated by commas, newlines, or spaces, or upload an Excel/CSV spreadsheet.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs">
                  <UploadCloud className="w-4 h-4 text-[#8DA173]" />
                  Upload Excel / CSV
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileUploadGstin}
                  />
                </label>

                <button
                  onClick={() => {
                    setBulkGstinText(SAMPLE_TEST_GSTINS.join('\n'));
                    handleProcessBulkGstin(SAMPLE_TEST_GSTINS);
                  }}
                  className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Load Sample Batch
                </button>

                <button
                  onClick={() => handleProcessBulkGstin()}
                  disabled={isProcessingBulkGstin || !bulkGstinText.trim()}
                  className="px-4 py-2 bg-[#2D4A3E] hover:bg-[#223930] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessingBulkGstin ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Run Batch Verification
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={bulkGstinText}
              onChange={(e) => setBulkGstinText(e.target.value.toUpperCase())}
              placeholder="Paste GSTINs here (e.g. 27AABCA1234F1Z8, 07AABCA1234F1Z9, 29AAACT2727Q1ZT...)"
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#2D4A3E] focus:bg-white"
            />
          </div>

          {/* Bulk KPIs Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                Total Checked
              </span>
              <p className="text-2xl font-bold text-zinc-900 mt-1">
                {bulkGstinKpis.total}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                Valid GSTINs
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {bulkGstinKpis.valid}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                Active Status
              </span>
              <p className="text-2xl font-bold text-[#2D4A3E] mt-1">
                {bulkGstinKpis.active}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                Cancelled / Susp.
              </span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {bulkGstinKpis.cancelled}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                Invalid Syntax
              </span>
              <p className="text-2xl font-bold text-rose-600 mt-1">
                {bulkGstinKpis.invalid}
              </p>
            </div>
          </div>

          {/* Results Table Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            {/* Header & Filter Controls */}
            <div className="p-4 border-b border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-zinc-50">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['ALL', 'VALID', 'ACTIVE', 'CANCELLED', 'INVALID'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setBulkGstinFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      bulkGstinFilter === filter
                        ? 'bg-[#2D4A3E] text-white shadow-xs'
                        : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100'
                    }`}
                  >
                    {filter === 'ALL'
                      ? `All (${bulkGstinResults.length})`
                      : filter === 'VALID'
                      ? `Valid (${bulkGstinKpis.valid})`
                      : filter === 'ACTIVE'
                      ? `Active (${bulkGstinKpis.active})`
                      : filter === 'CANCELLED'
                      ? `Cancelled (${bulkGstinKpis.cancelled})`
                      : `Invalid (${bulkGstinKpis.invalid})`}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search GSTIN, state, name..."
                    value={bulkGstinSearch}
                    onChange={(e) => setBulkGstinSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2D4A3E] w-56"
                  />
                </div>

                <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-lg p-0.5 text-xs">
                  <span className="text-[11px] text-zinc-500 font-medium px-2">Batch Status:</span>
                  <button
                    onClick={() => handleSetBulkAllStatus('Active')}
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px] transition-colors"
                  >
                    All Active
                  </button>
                  <button
                    onClick={() => handleSetBulkAllStatus('Cancelled')}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 rounded font-semibold text-[11px] transition-colors"
                  >
                    All Cancelled
                  </button>
                </div>

                <button
                  onClick={() => {
                    const jsonPayload = bulkGstinResults.map((r) => ({
                      gstin: r.gstin,
                      stateCode: r.stateCode,
                      stateName: r.stateName,
                      status: r.status,
                      validGstin: r.validGstin,
                    }));
                    handleCopy('bulk_gstin_json', JSON.stringify(jsonPayload, null, 2));
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {copiedKey === 'bulk_gstin_json' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  Copy Batch JSON
                </button>

                <button
                  onClick={() => {
                    const jsonPayload = bulkGstinResults.map((r) => ({
                      gstin: r.gstin,
                      stateCode: r.stateCode,
                      stateName: r.stateName,
                      status: r.status,
                      validGstin: r.validGstin,
                    }));
                    const blob = new Blob([JSON.stringify(jsonPayload, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `GST_Bulk_Status_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Download JSON
                </button>

                <button
                  onClick={() => exportGstinVerificationToExcel(bulkGstinResults)}
                  className="px-3.5 py-1.5 bg-[#8DA173] hover:bg-[#7D9163] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-zinc-100/75 text-zinc-700 font-semibold sticky top-0 border-b border-zinc-200 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center">#</th>
                    <th className="py-2.5 px-3">GSTIN (gstin)</th>
                    <th className="py-2.5 px-3">Valid (validGstin)</th>
                    <th className="py-2.5 px-3">Status (status)</th>
                    <th className="py-2.5 px-3">State Code</th>
                    <th className="py-2.5 px-3">State Name</th>
                    <th className="py-2.5 px-3">Legal / Trade Name</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredBulkGstins.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-zinc-500">
                        No GSTINs match your search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBulkGstins.map((item, idx) => (
                      <tr
                        key={item.gstin + idx}
                        className="hover:bg-zinc-50/80 transition-colors"
                      >
                        <td className="py-2.5 px-3 text-center text-zinc-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">
                          {item.gstin}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.validGstin
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {item.validGstin ? 'TRUE' : 'FALSE'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => {
                              const next = item.status === 'Active' ? 'Cancelled' : 'Active';
                              handleUpdateBulkItemStatus(item.gstin, next);
                            }}
                            title="Click to toggle Active / Cancelled"
                            className="group flex items-center gap-1 cursor-pointer hover:opacity-80"
                          >
                            {getStatusBadge(item.status, item.validGstin)}
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-400">⇄</span>
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-700">
                          {item.stateCode || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-zinc-800">
                          {item.stateName || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-700 max-w-xs truncate">
                          <span className="font-semibold block text-zinc-900 truncate">
                            {item.legalName || (item.validGstin ? 'Taxpayer Registered' : 'Invalid')}
                          </span>
                          {item.tradeName && item.tradeName !== item.legalName && (
                            <span className="text-[11px] text-zinc-500 block truncate">
                              {item.tradeName}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => {
                              const rowObj = {
                                gstin: item.gstin,
                                stateCode: item.stateCode,
                                stateName: item.stateName,
                                status: item.status,
                                validGstin: item.validGstin,
                              };
                              handleCopy(`row_${item.gstin}`, JSON.stringify(rowObj, null, 2));
                            }}
                            className="p-1 hover:bg-zinc-200 rounded text-zinc-600 hover:text-zinc-900 transition-colors"
                            title="Copy Row Schema 1 JSON"
                          >
                            {copiedKey === `row_${item.gstin}` ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSingleGstinInput(item.gstin);
                              setSingleGstinResult(item);
                              setActiveSubTab('gst_single');
                            }}
                            className="p-1 hover:bg-zinc-200 rounded text-zinc-600 hover:text-zinc-900 transition-colors"
                            title="Inspect in Single View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const pan = item.pan || item.gstin.substring(2, 12);
                              if (PAN_REGEX.test(pan)) {
                                setSinglePanInput(pan);
                                handleSearchSinglePan(pan);
                                setActiveSubTab('pan_single');
                              }
                            }}
                            className="p-1 hover:bg-zinc-200 rounded text-zinc-600 hover:text-zinc-900 transition-colors"
                            title="Search Linked PAN Branches"
                          >
                            <Building className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: SINGLE PAN TO GSTINS                                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'pan_single' && (
        <div className="space-y-6">
          {/* Input & Search Section */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs">
            <div className="max-w-2xl">
              <label className="block text-xs font-bold tracking-wider uppercase text-zinc-600 mb-2">
                Enter 10-Character Permanent Account Number (PAN)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. AABCA1234F"
                    value={singlePanInput}
                    onChange={(e) => setSinglePanInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSinglePan()}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-300 rounded-xl font-mono text-base font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#2D4A3E] focus:bg-white tracking-wider uppercase"
                  />
                  {singlePanInput && (
                    <button
                      onClick={() => setSinglePanInput('')}
                      className="absolute right-3 top-3.5 text-xs text-zinc-400 hover:text-zinc-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleSearchSinglePan()}
                  disabled={isSearchingSinglePan || !singlePanInput.trim()}
                  className="px-6 py-3 bg-[#2D4A3E] hover:bg-[#223930] text-white rounded-xl font-semibold text-sm shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isSearchingSinglePan ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Get GSTINs for PAN
                </button>
              </div>

              {/* Sample Quick Chips */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500 font-medium">Popular PANs:</span>
                {[
                  { label: 'Apex Advisory (4)', pan: 'AABCA1234F' },
                  { label: 'Tata Consultancy (4)', pan: 'AAACT2727Q' },
                  { label: 'Reliance Ind (3)', pan: 'AAACR5055K' },
                  { label: 'Paras Enterprises (2)', pan: 'ABCDE1234F' },
                  { label: 'Meesho Fashnear (1)', pan: 'AARCM9332R' },
                  { label: 'Unregistered (0)', pan: 'AABCP9999K' },
                ].map((chip) => (
                  <button
                    key={chip.pan}
                    onClick={() => {
                      setSinglePanInput(chip.pan);
                      handleSearchSinglePan(chip.pan);
                    }}
                    className="px-2.5 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-md font-mono transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result Presentation */}
          {singlePanResult && (
            <div className="space-y-6">
              {/* Header Summary Banner */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold bg-[#8DA173]/20 text-[#2D4A3E] px-2 py-0.5 rounded">
                      PAN: {singlePanResult.panNum}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {singlePanResult.constitution}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900">
                    {singlePanResult.legalName || `Enterprise (${singlePanResult.panNum})`}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Discovered {singlePanResult.gstinResList.length} GSTIN branch registrations mapped across Indian states.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => exportPanToGstinsToExcel([singlePanResult])}
                    className="px-4 py-2 bg-[#8DA173] hover:bg-[#7D9163] text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    Download PAN Excel (.xlsx)
                  </button>
                </div>
              </div>

              {/* Two Column Layout: Registered GSTINs Table & Schema 2 JSON */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Branches Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                        Branch Registrations List ({singlePanResult.gstinResList.length})
                      </h3>
                      <span className="text-xs text-zinc-500">
                        Schema 2 <code className="font-mono text-zinc-700">gstinResList</code>
                      </span>
                    </div>

                    <button
                      onClick={() => setShowAddBranch(!showAddBranch)}
                      className="px-3 py-1.5 bg-[#2D4A3E] hover:bg-[#223930] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      {showAddBranch ? 'Cancel' : '+ Add Branch GSTIN'}
                    </button>
                  </div>

                  {/* Add Branch Inline Form */}
                  {showAddBranch && (
                    <div className="p-4 bg-emerald-50/60 border-b border-emerald-100 flex flex-wrap items-center gap-2.5">
                      <div className="flex-1 min-w-[200px]">
                        <input
                          type="text"
                          maxLength={15}
                          placeholder="Enter 15-char GSTIN (e.g. 19AABCA1234F1Z1)"
                          value={newBranchGstinInput}
                          onChange={(e) => setNewBranchGstinInput(e.target.value.toUpperCase())}
                          className="w-full px-3 py-1.5 bg-white border border-zinc-300 rounded-lg font-mono text-xs font-semibold text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
                        />
                      </div>
                      <select
                        value={newBranchStatusInput}
                        onChange={(e) => setNewBranchStatusInput(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2D4A3E]"
                      >
                        <option value="Active">Active</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Suspended">Suspended</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                      <button
                        onClick={handleAddBranchToSinglePan}
                        disabled={!newBranchGstinInput.trim() || newBranchGstinInput.trim().length !== 15}
                        className="px-3.5 py-1.5 bg-[#2D4A3E] hover:bg-[#223930] text-white rounded-lg text-xs font-semibold disabled:opacity-50 transition-colors shadow-xs"
                      >
                        Add to Extraction Schema
                      </button>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-100 text-zinc-700 font-semibold border-b border-zinc-200">
                        <tr>
                          <th className="py-2.5 px-3">State Code (stateCd)</th>
                          <th className="py-2.5 px-3">GSTIN (gstin)</th>
                          <th className="py-2.5 px-3">Auth Status (authStatus)</th>
                          <th className="py-2.5 px-3">Branch / Trade Name</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {singlePanResult.gstinResList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-zinc-500">
                              No active or historical GSTIN registrations found for PAN{' '}
                              <code className="font-mono text-zinc-700 font-bold">
                                {singlePanResult.panNum}
                              </code>
                              .
                            </td>
                          </tr>
                        ) : (
                          singlePanResult.gstinResList.map((branch) => (
                            <tr
                              key={branch.gstin}
                              className="hover:bg-zinc-50 transition-colors"
                            >
                              <td className="py-3 px-3">
                                <span className="font-mono font-bold text-zinc-800 bg-zinc-100 px-2 py-1 rounded">
                                  {branch.stateCd}
                                </span>
                                <span className="text-[11px] text-zinc-500 block mt-1">
                                  {branch.stateName}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-zinc-900">
                                {branch.gstin}
                                {branch.isPrincipal && (
                                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#8DA173]/20 text-[#2D4A3E]">
                                    HQ
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <button
                                  onClick={() => handleToggleBranchStatus(branch.gstin)}
                                  title="Click to toggle Active / Cancelled"
                                  className="group flex items-center gap-1 cursor-pointer hover:opacity-80"
                                >
                                  {getStatusBadge(branch.authStatus)}
                                  <span className="opacity-0 group-hover:opacity-100 text-[10px] text-zinc-400">⇄</span>
                                </button>
                              </td>
                              <td className="py-3 px-3 text-zinc-700">
                                <span className="font-semibold text-zinc-900 block">
                                  {branch.tradeName || branch.legalName || 'Registered Unit'}
                                </span>
                                <span className="text-[11px] text-zinc-500 block">
                                  {branch.taxpayerType || 'Regular'}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  onClick={() => {
                                    setSingleGstinInput(branch.gstin);
                                    handleVerifySingleGstin(branch.gstin);
                                    setActiveSubTab('gst_single');
                                  }}
                                  className="px-2 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded font-medium transition-colors"
                                >
                                  Verify Status
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Schema 2 JSON Output Inspector */}
                <div className="bg-[#1E293B] text-zinc-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-700 mb-3">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-[#8DA173]" />
                        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                          GST Portal Request Payload (Schema 2)
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const payload = {
                            panNum: singlePanResult.panNum,
                            gstinResList: singlePanResult.gstinResList.map((g) => ({
                              gstin: g.gstin,
                              authStatus: g.authStatus,
                              stateCd: g.stateCd,
                            })),
                          };
                          handleCopy('single_pan_json', JSON.stringify(payload, null, 2));
                        }}
                        className="text-xs px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors flex items-center gap-1"
                      >
                        {copiedKey === 'single_pan_json' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        Copy JSON
                      </button>
                    </div>

                    <pre className="text-xs font-mono text-emerald-400 bg-black/40 p-3.5 rounded-xl overflow-x-auto max-h-[350px] leading-relaxed">
                      {JSON.stringify(
                        {
                          panNum: singlePanResult.panNum,
                          gstinResList: singlePanResult.gstinResList.map((g) => ({
                            gstin: g.gstin,
                            authStatus: g.authStatus,
                            stateCd: g.stateCd,
                          })),
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-700 space-y-3">
                    <div className="text-xs text-zinc-400 leading-relaxed">
                      Complies strictly with Schema 2 requiring <code className="text-zinc-200">panNum</code>{' '}
                      and <code className="text-zinc-200">gstinResList</code> with items having{' '}
                      <code className="text-zinc-200">gstin</code>,{' '}
                      <code className="text-zinc-200">authStatus</code>, and{' '}
                      <code className="text-zinc-200">stateCd</code>.
                    </div>

                    <button
                      onClick={() => {
                        const payload = {
                          panNum: singlePanResult.panNum,
                          gstinResList: singlePanResult.gstinResList.map((g) => ({
                            gstin: g.gstin,
                            authStatus: g.authStatus,
                            stateCd: g.stateCd,
                          })),
                        };
                        const blob = new Blob([JSON.stringify(payload, null, 2)], {
                          type: 'application/json',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `PAN_Mapping_${singlePanResult.panNum}.json`;
                        a.click();
                      }}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Payload (.json)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: BULK PAN TO GSTINS                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'pan_bulk' && (
        <div className="space-y-6">
          {/* Input Area & Controls */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Bulk PAN to GSTINs Discovery Input
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Paste multiple 10-character PANs or upload an Excel/CSV spreadsheet to lookup all registered GSTIN branches.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs">
                  <UploadCloud className="w-4 h-4 text-[#8DA173]" />
                  Upload PAN Spreadsheet
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileUploadPan}
                  />
                </label>

                <button
                  onClick={() => {
                    setBulkPanText(SAMPLE_TEST_PANS.join('\n'));
                    handleProcessBulkPan(SAMPLE_TEST_PANS);
                  }}
                  className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Load Sample PANs
                </button>

                <button
                  onClick={() => handleProcessBulkPan()}
                  disabled={isProcessingBulkPan || !bulkPanText.trim()}
                  className="px-4 py-2 bg-[#2D4A3E] hover:bg-[#223930] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessingBulkPan ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Discover GSTINs Batch
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={bulkPanText}
              onChange={(e) => setBulkPanText(e.target.value.toUpperCase())}
              placeholder="Paste PANs here (e.g. AABCA1234F, AAACT2727Q, AAACR5055K, ABCDE1234F...)"
              className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-xs text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#2D4A3E] focus:bg-white"
            />
          </div>

          {/* Bulk PAN KPIs Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                Total PANs Processed
              </span>
              <p className="text-2xl font-bold text-zinc-900 mt-1">
                {bulkPanKpis.totalPans}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                Total GSTINs Found
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {bulkPanKpis.totalGstins}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                Active Registrations
              </span>
              <p className="text-2xl font-bold text-[#2D4A3E] mt-1">
                {bulkPanKpis.activeGstins}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                Cancelled / Inactive
              </span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {bulkPanKpis.cancelledGstins}
              </p>
            </div>
          </div>

          {/* Results Table & Accordion */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
            {/* Header & Filter Controls */}
            <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search PAN, entity name, GSTIN..."
                  value={bulkPanSearch}
                  onChange={(e) => setBulkPanSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#2D4A3E] w-64"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    const schemaPayload = bulkPanResults.map((p) => ({
                      panNum: p.panNum,
                      gstinResList: p.gstinResList.map((g) => ({
                        gstin: g.gstin,
                        authStatus: g.authStatus,
                        stateCd: g.stateCd,
                      })),
                    }));
                    handleCopy('bulk_pan_json', JSON.stringify(schemaPayload, null, 2));
                  }}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                >
                  {copiedKey === 'bulk_pan_json' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  Copy Batch JSON
                </button>

                <button
                  onClick={() => {
                    const schemaPayload = bulkPanResults.map((p) => ({
                      panNum: p.panNum,
                      gstinResList: p.gstinResList.map((g) => ({
                        gstin: g.gstin,
                        authStatus: g.authStatus,
                        stateCd: g.stateCd,
                      })),
                    }));
                    const blob = new Blob([JSON.stringify(schemaPayload, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `PAN_to_GSTINs_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                  }}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  Download JSON
                </button>

                <button
                  onClick={() => exportPanToGstinsToExcel(bulkPanResults)}
                  className="px-3.5 py-1.5 bg-[#8DA173] hover:bg-[#7D9163] text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Consolidated Excel (.xlsx)
                </button>
              </div>
            </div>

            {/* List of PANs */}
            <div className="divide-y divide-zinc-200">
              {filteredBulkPans.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  No PAN records match your filter criteria.
                </div>
              ) : (
                filteredBulkPans.map((panRes) => {
                  const isExpanded = expandedPanRow === panRes.panNum;
                  return (
                    <div key={panRes.panNum} className="transition-colors">
                      {/* PAN Summary Header Row */}
                      <div
                        onClick={() =>
                          setExpandedPanRow(isExpanded ? null : panRes.panNum)
                        }
                        className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-zinc-50/80 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <button className="text-zinc-400 hover:text-zinc-600">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded">
                                {panRes.panNum}
                              </span>
                              <span className="text-xs font-semibold text-zinc-700">
                                {panRes.legalName}
                              </span>
                              <span className="text-[11px] text-zinc-400">
                                • {panRes.constitution}
                              </span>
                            </div>
                            <span className="text-xs text-zinc-500 block mt-0.5">
                              Registered in {panRes.gstinResList.length} Indian states
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                              {panRes.activeGstins} Active
                            </span>
                            {panRes.cancelledGstins ? (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                {panRes.cancelledGstins} Inactive
                              </span>
                            ) : null}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const panPayload = {
                                panNum: panRes.panNum,
                                gstinResList: panRes.gstinResList.map((g) => ({
                                  gstin: g.gstin,
                                  authStatus: g.authStatus,
                                  stateCd: g.stateCd,
                                })),
                              };
                              handleCopy(`pan_json_${panRes.panNum}`, JSON.stringify(panPayload, null, 2));
                            }}
                            className="p-1.5 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 rounded transition-colors"
                            title="Copy Schema 2 JSON for this PAN"
                          >
                            {copiedKey === `pan_json_${panRes.panNum}` ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportPanToGstinsToExcel(
                                [panRes],
                                `PAN_${panRes.panNum}_GSTINs.xlsx`
                              );
                            }}
                            className="p-1.5 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-900 rounded transition-colors"
                            title="Download Excel for this PAN"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable Branches Detail */}
                      {isExpanded && (
                        <div className="px-8 pb-4 pt-1 bg-zinc-50/50">
                          <div className="bg-white rounded-xl border border-zinc-200 shadow-xs overflow-hidden">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-zinc-100 text-zinc-600 font-semibold border-b border-zinc-200">
                                <tr>
                                  <th className="py-2 px-3">State Code (stateCd)</th>
                                  <th className="py-2 px-3">GSTIN (gstin)</th>
                                  <th className="py-2 px-3">Auth Status (authStatus)</th>
                                  <th className="py-2 px-3">Branch / Trade Name</th>
                                  <th className="py-2 px-3 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200">
                                {panRes.gstinResList.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="py-4 text-center text-zinc-400 italic"
                                    >
                                      No GSTIN registrations found for this PAN.
                                    </td>
                                  </tr>
                                ) : (
                                  panRes.gstinResList.map((branch) => (
                                    <tr
                                      key={branch.gstin}
                                      className="hover:bg-zinc-50"
                                    >
                                      <td className="py-2.5 px-3">
                                        <span className="font-mono font-bold text-zinc-800">
                                          {branch.stateCd}
                                        </span>
                                        <span className="text-zinc-500 ml-1.5">
                                          ({branch.stateName})
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">
                                        {branch.gstin}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        {getStatusBadge(branch.authStatus)}
                                      </td>
                                      <td className="py-2.5 px-3 text-zinc-700">
                                        {branch.tradeName || 'Branch'}
                                      </td>
                                      <td className="py-2.5 px-3 text-right">
                                        <button
                                          onClick={() => {
                                            setSingleGstinInput(branch.gstin);
                                            handleVerifySingleGstin(branch.gstin);
                                            setActiveSubTab('gst_single');
                                          }}
                                          className="text-xs text-[#2D4A3E] font-semibold hover:underline"
                                        >
                                          Verify GSTIN →
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
