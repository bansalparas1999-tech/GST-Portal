import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Building2,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  History,
  AlertCircle,
  Briefcase,
  MapPin,
  Plus,
  Layers,
  Globe,
  Check,
  Search,
  Filter,
  Trash2,
  Info,
  User,
  FileSpreadsheet,
  Upload,
  Download,
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Zap,
} from 'lucide-react';
import {
  GST_STATE_MAP,
  validatePanStructure,
  validateGstinStructure,
  extractPanFromGstin,
  fetchGstinsForPan,
  savePanEntity,
  deletePanEntity,
  removeBranchFromEntity,
  getStoredPanEntities,
  bulkSavePanEntities,
  updateBranchCredentials,
  POPULAR_PAN_ENTITIES,
} from '../utils/gstinUtils';
import {
  parsePanMasterExcel,
  downloadPanMasterExcelTemplate,
  exportPanMasterToExcel,
  ParseExcelResult,
} from '../utils/panExcelUtils';
import { checkExtensionActive, triggerExtensionLogin } from '../utils/gstExtensionBridge';
import { UserProfile, Language, PanEntity, PanGstinBranch } from '../types';

interface ClientGstinModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPan: string;
  currentGstinFilter: string; // 'ALL' or specific GSTIN or comma-separated
  currentCompanyName: string;
  onConfirmPanEntity: (
    pan: string,
    companyName: string,
    selectedGstins: string[],
    entity: PanEntity
  ) => void;
  currentUser: UserProfile | null;
  language: Language;
  isLoginPrompt?: boolean;
  onOpenGstPortalLogin?: () => void;
  onOpenGstIncognitoDriver?: (gstin: string, branch?: PanGstinBranch, entity?: PanEntity) => void;
}

export const ClientGstinModal: React.FC<ClientGstinModalProps> = ({
  isOpen,
  onClose,
  currentPan,
  currentGstinFilter,
  currentCompanyName,
  onConfirmPanEntity,
  currentUser,
  language,
  isLoginPrompt = false,
  onOpenGstPortalLogin,
  onOpenGstIncognitoDriver,
}) => {
  const [activeTab, setActiveTab] = useState<'workspace' | 'excel_import' | 'credentials_vault' | 'add_branch'>('workspace');
  const [panInput, setPanInput] = useState(currentPan || 'AABCA1234F');
  const [companyName, setCompanyName] = useState(currentCompanyName || '');
  const [activeEntity, setActiveEntity] = useState<PanEntity | null>(null);
  const [selectedGstins, setSelectedGstins] = useState<string[]>([]);
  const [isConsolidatedAll, setIsConsolidatedAll] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [storedEntities, setStoredEntities] = useState<PanEntity[]>([]);

  // Excel Import State
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [parseResult, setParseResult] = useState<ParseExcelResult | null>(null);
  const [excelImportSuccess, setExcelImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Branch Form State
  const [newBranchMode, setNewBranchMode] = useState<'exact' | 'state'>('exact');
  const [newBranchExactGstin, setNewBranchExactGstin] = useState('');
  const [newBranchStateCode, setNewBranchStateCode] = useState('27');
  const [newBranchTradeName, setNewBranchTradeName] = useState('');
  const [newBranchUserId, setNewBranchUserId] = useState('');
  const [newBranchPassword, setNewBranchPassword] = useState('');

  // Password visibility map for vault
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      const initialPan = (currentPan || currentUser?.companyGstin?.slice(2, 12) || 'AABCA1234F').toUpperCase();
      setPanInput(initialPan);
      setCompanyName(currentCompanyName || currentUser?.companyName || '');
      const allEnts = getStoredPanEntities();
      setStoredEntities(allEnts);

      const entity = fetchGstinsForPan(initialPan);
      setActiveEntity(entity);

      if (entity.branches.length === 0) {
        setIsConsolidatedAll(true);
        setSelectedGstins([]);
      } else if (!currentGstinFilter || currentGstinFilter === 'ALL') {
        setIsConsolidatedAll(true);
        setSelectedGstins(entity.branches.map((b) => b.gstin));
      } else {
        setIsConsolidatedAll(false);
        const parsed = currentGstinFilter.split(',').map((g) => g.trim().toUpperCase());
        setSelectedGstins(parsed);
      }
      setErrorMsg('');
      setInfoMsg('');
      setParseResult(null);
      setExcelFile(null);
    }
  }, [isOpen, currentPan, currentGstinFilter, currentCompanyName, currentUser]);

  if (!isOpen) return null;

  const handlePanChange = (val: string) => {
    const clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    setPanInput(clean);
    setErrorMsg('');
    setInfoMsg('');

    if (clean.length === 10) {
      const panValidation = validatePanStructure(clean);
      if (panValidation.isValid) {
        const entity = fetchGstinsForPan(clean);
        setActiveEntity(entity);
        setCompanyName(entity.legalName);
        if (entity.branches.length === 0) {
          setIsConsolidatedAll(true);
          setSelectedGstins([]);
        } else {
          setIsConsolidatedAll(true);
          setSelectedGstins(entity.branches.map((b) => b.gstin));
        }
      } else {
        setErrorMsg('Invalid PAN structure. Must be 5 letters + 4 digits + 1 letter (e.g. AABCA1234F).');
      }
    }
  };

  const handleSelectPopularEntity = (entity: PanEntity) => {
    setPanInput(entity.pan);
    setCompanyName(entity.legalName);
    setActiveEntity(entity);
    setIsConsolidatedAll(true);
    setSelectedGstins(entity.branches.map((b) => b.gstin));
    setErrorMsg('');
    setInfoMsg(`Loaded verified multi-GSTIN profile for ${entity.legalName}`);
  };

  const toggleGstinSelection = (gstin: string) => {
    const allBranchGstins = activeEntity?.branches.map((b) => b.gstin) || [];

    if (isConsolidatedAll) {
      // Unchecking this GSTIN leaves all other GSTINs selected
      const remaining = allBranchGstins.filter((g) => g !== gstin);
      setIsConsolidatedAll(false);
      setSelectedGstins(remaining.length > 0 ? remaining : [gstin]);
      return;
    }

    if (selectedGstins.includes(gstin)) {
      const updated = selectedGstins.filter((g) => g !== gstin);
      if (updated.length === 0) {
        // If unchecking the only remaining branch, switch to empty or select this
        setSelectedGstins([]);
      } else {
        setSelectedGstins(updated);
      }
    } else {
      const updated = [...selectedGstins, gstin];
      if (allBranchGstins.length > 0 && updated.length === allBranchGstins.length) {
        setIsConsolidatedAll(true);
      }
      setSelectedGstins(updated);
    }
  };

  const handleSelectAllBranches = () => {
    setIsConsolidatedAll(true);
    if (activeEntity) {
      setSelectedGstins(activeEntity.branches.map((b) => b.gstin));
    }
  };

  const handleDeselectAllBranches = () => {
    setIsConsolidatedAll(false);
    setSelectedGstins([]);
  };

  const handleInvertSelection = () => {
    if (!activeEntity) return;
    const all = activeEntity.branches.map((b) => b.gstin);
    if (isConsolidatedAll) {
      setIsConsolidatedAll(false);
      setSelectedGstins([]);
    } else {
      const inverted = all.filter((g) => !selectedGstins.includes(g));
      if (inverted.length === all.length) {
        setIsConsolidatedAll(true);
      } else {
        setIsConsolidatedAll(false);
      }
      setSelectedGstins(inverted);
    }
  };

  const handleSelectSingleBranch = (gstin: string) => {
    setIsConsolidatedAll(false);
    setSelectedGstins([gstin]);
  };

  const handleRemoveBranch = (gstinToRemove: string) => {
    if (!activeEntity) return;
    const updated = removeBranchFromEntity(activeEntity.pan, gstinToRemove);
    if (updated) {
      setActiveEntity(updated);
      setSelectedGstins((prev) => prev.filter((g) => g !== gstinToRemove));
      setStoredEntities(getStoredPanEntities());
      setInfoMsg(`Removed GSTIN ${gstinToRemove} from records.`);
    }
  };

  // Handle Excel Parsing
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFile(file);
    setIsParsingExcel(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const result = await parsePanMasterExcel(file);
      setParseResult(result);
      setIsParsingExcel(false);
    } catch (err: any) {
      setIsParsingExcel(false);
      setErrorMsg(err?.message || 'Failed to parse Excel file. Please use the template.');
    }
  };

  const handleConfirmExcelImport = () => {
    if (!parseResult || parseResult.entities.length === 0) return;

    const saved = bulkSavePanEntities(parseResult.entities);
    setStoredEntities(saved);
    setExcelImportSuccess(true);

    // If active PAN is in imported list, select it
    const firstImported = parseResult.entities[0];
    if (firstImported) {
      setActiveEntity(firstImported);
      setPanInput(firstImported.pan);
      setCompanyName(firstImported.legalName);
      setSelectedGstins(firstImported.branches.map((b) => b.gstin));
      setIsConsolidatedAll(true);
    }

    setTimeout(() => {
      setExcelImportSuccess(false);
      setActiveTab('workspace');
    }, 1500);
  };

  const handleAddNewBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntity) return;

    const cleanPan = activeEntity.pan.trim().toUpperCase();
    let targetGstin = '';
    let targetStateCode = newBranchStateCode;
    let targetStateName = GST_STATE_MAP[targetStateCode] || 'State Unit';

    if (newBranchMode === 'exact') {
      const cleanExact = newBranchExactGstin.trim().toUpperCase();
      if (cleanExact.length !== 15) {
        setErrorMsg('Please enter a valid 15-character GSTIN (e.g. 27' + cleanPan + '1Z5).');
        return;
      }
      const gstinPan = cleanExact.slice(2, 12);
      if (gstinPan !== cleanPan) {
        setErrorMsg(`GSTIN PAN substring (${gstinPan}) does not match active PAN (${cleanPan}). Characters 3 to 12 must be ${cleanPan}.`);
        return;
      }
      targetGstin = cleanExact;
      targetStateCode = cleanExact.slice(0, 2);
      targetStateName = GST_STATE_MAP[targetStateCode] || 'Registered State';
    } else {
      targetGstin = `${newBranchStateCode}${cleanPan}1Z5`;
    }

    // Check if already exists
    const exists = activeEntity.branches.some((b) => b.gstin.toUpperCase() === targetGstin.toUpperCase());
    if (exists) {
      setErrorMsg(`GSTIN ${targetGstin} is already registered under this PAN.`);
      return;
    }

    const newBranch: PanGstinBranch = {
      gstin: targetGstin,
      stateCode: targetStateCode,
      stateName: targetStateName,
      tradeName: newBranchTradeName.trim() || `${activeEntity.legalName} (${targetStateName} Unit)`,
      legalName: activeEntity.legalName,
      isPrincipal: activeEntity.branches.length === 0,
      registrationType: 'Regular',
      status: 'ACTIVE',
      portalUsername: newBranchUserId.trim() || undefined,
      portalPassword: newBranchPassword.trim() || undefined,
    };

    const updatedBranches = [...activeEntity.branches, newBranch];
    const updatedEntity: PanEntity = {
      ...activeEntity,
      primaryGstin: activeEntity.primaryGstin || targetGstin,
      branches: updatedBranches,
    };

    setActiveEntity(updatedEntity);
    savePanEntity(updatedEntity);
    setStoredEntities(getStoredPanEntities());
    setSelectedGstins((prev) => [...prev, targetGstin]);
    setNewBranchExactGstin('');
    setNewBranchTradeName('');
    setNewBranchUserId('');
    setNewBranchPassword('');
    setErrorMsg('');
    setInfoMsg(`Successfully registered GSTIN ${targetGstin} (${targetStateName}) under PAN ${cleanPan}.`);
    setActiveTab('workspace');
  };

  const handleUpdateVaultCredentials = (gstin: string, username: string, password: string) => {
    if (!activeEntity) return;
    const updated = updateBranchCredentials(activeEntity.pan, gstin, username, password);
    if (updated) {
      setActiveEntity(updated);
      setStoredEntities(getStoredPanEntities());
      setInfoMsg(`Saved login credentials for GSTIN ${gstin}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPan = panInput.trim().toUpperCase();

    if (cleanPan.length !== 10) {
      setErrorMsg('PAN must be exactly 10 alphanumeric characters (e.g. AABCA1234F).');
      return;
    }

    const entityToSave: PanEntity = activeEntity || fetchGstinsForPan(cleanPan);
    entityToSave.legalName = companyName.trim() || entityToSave.legalName;
    savePanEntity(entityToSave);

    const finalGstins = entityToSave.branches.length === 0
      ? ['ALL']
      : isConsolidatedAll
      ? ['ALL']
      : selectedGstins.length > 0
      ? selectedGstins
      : ['ALL'];

    onConfirmPanEntity(cleanPan, entityToSave.legalName, finalGstins, entityToSave);
    onClose();
  };

  return (
    <div
      id="pan-entity-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in"
    >
      <div
        id="pan-entity-modal-card"
        className="bg-white w-full max-w-3xl rounded-2xl border border-[#E0E4DE] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto text-[#1A2E25]"
      >
        {/* Modal Header */}
        <div className="bg-linear-to-r from-[#1A2E25] via-[#2D4A3E] to-[#1E362C] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#8DA173]/25 border border-[#8DA173]/40 flex items-center justify-center font-bold text-white shadow-xs">
              <Building2 className="w-6 h-6 text-[#D3E8DA]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight">
                  {isLoginPrompt ? 'Enterprise PAN & Multi-GSTIN Workspace' : 'PAN & Multi-GSTIN Master Management'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#8DA173] text-white">
                  Client Directory
                </span>
              </div>
              <p className="text-xs text-[#D3DCD6] mt-0.5">
                Bulk import PAN-wise credentials via Excel, select multiple GSTINs, and manage GST portal access.
              </p>
            </div>
          </div>
          {!isLoginPrompt && (
            <button
              onClick={onClose}
              className="p-1.5 text-[#D3DCD6] hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Top Tab Bar */}
        <div className="bg-[#F7F8F6] border-b border-[#E0E4DE] px-5 pt-2 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('workspace')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'workspace'
                  ? 'border-[#2D4A3E] text-[#2D4A3E] bg-white rounded-t-lg shadow-2xs'
                  : 'border-transparent text-[#738276] hover:text-[#2D4A3E]'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>Multi-GSTIN Workspace</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('excel_import')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'excel_import'
                  ? 'border-[#2D4A3E] text-[#2D4A3E] bg-white rounded-t-lg shadow-2xs'
                  : 'border-transparent text-[#738276] hover:text-[#2D4A3E]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>Import PAN Master Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('credentials_vault')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'credentials_vault'
                  ? 'border-[#2D4A3E] text-[#2D4A3E] bg-white rounded-t-lg shadow-2xs'
                  : 'border-transparent text-[#738276] hover:text-[#2D4A3E]'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>Portal Credentials Vault</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('add_branch')}
              className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'add_branch'
                  ? 'border-[#2D4A3E] text-[#2D4A3E] bg-white rounded-t-lg shadow-2xs'
                  : 'border-transparent text-[#738276] hover:text-[#2D4A3E]'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>Register State GSTIN</span>
            </button>
          </div>

          {onOpenGstPortalLogin && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenGstPortalLogin();
              }}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#EDF3EF] text-[#2D4A3E] hover:bg-[#D5E2D9] border border-[#BBD3C5] transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>GST Portal Login & Captcha</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#FDFDFC] space-y-5">
          {errorMsg && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] p-3 rounded-xl text-xs text-[#991B1B] font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="bg-[#EDF3EF] border border-[#D5E2D9] p-3 rounded-xl text-xs text-[#2D4A3E] font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#8DA173] shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {/* TAB 1: WORKSPACE & MULTI-GSTIN SELECTION */}
          {activeTab === 'workspace' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Quick Select Popular Profiles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#738276]">
                  <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 text-[#2D4A3E]">
                    <History className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span>Saved PAN Entity Directory ({storedEntities.length} Entities)</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('excel_import')}
                      className="text-[10px] text-[#2D4A3E] hover:underline font-bold flex items-center gap-1"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-[#8DA173]" />
                      <span>Bulk Import Excel</span>
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => exportPanMasterToExcel(storedEntities)}
                      className="text-[10px] text-[#2D4A3E] hover:underline font-bold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 text-[#8DA173]" />
                      <span>Export Directory</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1.5 bg-[#F7F8F6] rounded-xl border border-[#E0E4DE]">
                  {storedEntities.slice(0, 6).map((ent) => {
                    const isSelected = panInput.toUpperCase() === ent.pan.toUpperCase();
                    return (
                      <button
                        key={ent.pan}
                        type="button"
                        onClick={() => handleSelectPopularEntity(ent)}
                        className={`text-left p-2.5 rounded-lg border text-xs transition-all flex flex-col justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#EDF3EF] border-[#8DA173] ring-1 ring-[#8DA173]'
                            : 'bg-white border-[#E0E4DE] hover:border-[#8DA173] hover:bg-[#FDFDFC]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-[#2D4A3E] text-xs">
                            PAN: {ent.pan}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F1F3EE] text-[#56655A] font-bold">
                            {ent.branches.length} GSTINs
                          </span>
                        </div>
                        <div className="font-semibold text-[#1A2E25] truncate mt-0.5">
                          {ent.legalName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PAN & Entity Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-[#1A2E25] block mb-1.5">
                    10-Digit Entity PAN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={panInput}
                    onChange={(e) => handlePanChange(e.target.value)}
                    placeholder="e.g. AABCA1234F"
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-[#1A2E25] border border-[#E0E4DE] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#8DA173]"
                  />
                  <div className="text-[10px] text-[#738276] mt-1">
                    Entity: <strong>{activeEntity?.constitution || 'Income Tax Identifier'}</strong>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-[#1A2E25] block mb-1.5">
                    Legal Enterprise / Trade Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Audit & Taxation Advisory LLP"
                    className="w-full px-3.5 py-2.5 text-xs font-bold text-[#1A2E25] border border-[#E0E4DE] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#8DA173]"
                  />
                  <div className="text-[10px] text-[#738276] mt-1">
                    Primary entity legal name used on audit reports and notices.
                  </div>
                </div>
              </div>

              {/* Multi-GSTIN Branches Selection List */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-[#1A2E25] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#8DA173]" />
                      <span>Registered GSTIN Branches under PAN ({panInput})</span>
                    </label>
                    <p className="text-[11px] text-[#738276]">
                      Click the selection checkbox in front of each GSTIN to choose exact branches for audit.
                    </p>
                  </div>

                  {activeEntity && activeEntity.branches.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSelectAllBranches}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                          isConsolidatedAll
                            ? 'bg-[#2D4A3E] text-white border-[#2D4A3E]'
                            : 'bg-white text-[#2D4A3E] border-[#D5E2D9] hover:bg-[#EDF3EF]'
                        }`}
                        title="Select all branches"
                      >
                        ✓ Select All ({activeEntity.branches.length})
                      </button>
                      <button
                        type="button"
                        onClick={handleDeselectAllBranches}
                        className="px-2 py-1 text-xs font-semibold rounded-lg border border-[#D5E2D9] bg-white text-[#56655A] hover:bg-[#EDF3EF] transition-colors cursor-pointer"
                        title="Clear all selected checkboxes"
                      >
                        ✕ Clear
                      </button>
                      <button
                        type="button"
                        onClick={handleInvertSelection}
                        className="px-2 py-1 text-xs font-semibold rounded-lg border border-[#D5E2D9] bg-white text-[#56655A] hover:bg-[#EDF3EF] transition-colors cursor-pointer"
                        title="Invert checked branches"
                      >
                        ⇄ Invert
                      </button>
                    </div>
                  )}
                </div>

                {activeEntity && activeEntity.branches.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-[#E0E4DE] rounded-xl p-2 bg-[#F7F8F6]">
                    {activeEntity.branches.map((b) => {
                      const isSelected = isConsolidatedAll || selectedGstins.includes(b.gstin);
                      const hasCredentials = Boolean(b.portalUsername || b.portalPassword);
                      return (
                        <div
                          key={b.gstin}
                          onClick={() => toggleGstinSelection(b.gstin)}
                          className={`p-3 rounded-lg border text-xs transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                            isSelected
                              ? 'bg-white border-[#2D4A3E] ring-1 ring-[#2D4A3E]/30 shadow-xs'
                              : 'bg-[#FDFDFC] border-[#E0E4DE] opacity-65 hover:opacity-100 hover:border-[#C2C9BF]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Prominent Selection Check Box in Front of GSTIN */}
                            <div className="flex items-center justify-center shrink-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  toggleGstinSelection(b.gstin);
                                }}
                                className="w-4 h-4 text-[#2D4A3E] rounded border-[#8DA173] focus:ring-2 focus:ring-[#8DA173] cursor-pointer accent-[#2D4A3E]"
                              />
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-xs text-[#1A2E25]">
                                  {b.gstin}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#EDF3EF] text-[#2D4A3E]">
                                  {b.stateCode} • {b.stateName}
                                </span>
                                {b.isPrincipal && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#92400E]">
                                    ★ Principal HQ
                                  </span>
                                )}
                                {hasCredentials && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#D1FAE5] text-[#065F46] flex items-center gap-1">
                                    <Key className="w-2.5 h-2.5" />
                                    <span>Vault ID: {b.portalUsername}</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-[#738276] truncate mt-0.5">
                                {b.tradeName || b.legalName}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {onOpenGstIncognitoDriver && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (checkExtensionActive()) {
                                    triggerExtensionLogin(b.gstin, b.portalUsername, b.portalPassword);
                                  } else {
                                    onOpenGstIncognitoDriver(b.gstin, b, activeEntity);
                                  }
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold bg-[#1A2E25] text-white hover:bg-[#2D4A3E] rounded-lg transition-all flex items-center gap-1 shadow-xs cursor-pointer border border-[#8DA173]/30"
                                title="Open GST portal in new Incognito tab and auto-type credentials + OCR captcha"
                              >
                                <Zap className="w-3 h-3 text-[#8DA173] animate-pulse" />
                                <span>⚡ GST Login</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSelectSingleBranch(b.gstin)}
                              className="px-2 py-1 text-[11px] font-bold text-[#2D4A3E] hover:bg-[#EDF3EF] rounded transition-colors cursor-pointer border border-[#D5E2D9]"
                              title="Filter strictly to this GSTIN"
                            >
                              Only This
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveBranch(b.gstin)}
                              className="p-1 text-[#738276] hover:text-red-600 rounded transition-colors cursor-pointer"
                              title="Remove branch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center bg-[#F7F8F6] rounded-xl border border-dashed border-[#C2C9BF] space-y-2">
                    <div className="text-xs font-bold text-[#2D4A3E]">
                      PAN is Operating in Non-GST / Unregistered (URP) Mode
                    </div>
                    <p className="text-[11px] text-[#738276]">
                      No GSTIN registrations linked to this PAN. You can still reconcile invoices by PAN or add state GSTINs.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('add_branch')}
                      className="px-3 py-1.5 bg-[#2D4A3E] text-white text-xs font-bold rounded-lg hover:bg-[#1E362C] transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#8DA173]" />
                      <span>Register State GSTIN Branch</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Submit / Confirm Button */}
              <div className="pt-3 border-t border-[#E0E4DE] flex items-center justify-between">
                <div className="text-xs text-[#738276]">
                  Active selection:{' '}
                  <strong className="text-[#2D4A3E]">
                    {isConsolidatedAll
                      ? `Consolidated (${activeEntity?.branches.length || 0} Branches)`
                      : `${selectedGstins.length} Selected GSTIN(s)`}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  {!isLoginPrompt && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-xs font-bold text-[#56655A] hover:bg-[#E0E4DE] rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#2D4A3E] text-white font-bold text-xs rounded-xl hover:bg-[#1E362C] transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span>Confirm & Activate Workspace</span>
                    <ArrowRight className="w-4 h-4 text-[#8DA173]" />
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: IMPORT PAN MASTER EXCEL */}
          {activeTab === 'excel_import' && (
            <div className="space-y-5">
              <div className="bg-[#EDF3EF] border border-[#D5E2D9] p-4 rounded-xl text-xs space-y-2 text-[#2D4A3E]">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-[#8DA173]" />
                    <span>PAN-Wise Multi-GSTIN & Credentials Excel Import</span>
                  </span>
                  <button
                    type="button"
                    onClick={downloadPanMasterExcelTemplate}
                    className="px-3 py-1 bg-white text-[#2D4A3E] border border-[#D5E2D9] rounded-lg font-bold text-xs hover:bg-[#EDF3EF] transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span>Download Excel Template (.xlsx)</span>
                  </button>
                </div>
                <p className="text-[#56655A] text-[11px] leading-relaxed">
                  Import your entire client database or corporate multi-state structure. Supports columns: <strong>PAN</strong>, <strong>Legal Name</strong>, <strong>GSTIN</strong>, <strong>Portal User ID</strong>, <strong>Portal Password</strong>, <strong>State Code</strong>, and <strong>Authorized Signatory</strong>.
                </p>
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#C2C9BF] hover:border-[#8DA173] bg-[#F7F8F6] p-6 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-[#EDF3EF]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-white border border-[#D5E2D9] flex items-center justify-center mx-auto shadow-xs text-[#8DA173] mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-xs font-bold text-[#1A2E25]">
                  {excelFile ? excelFile.name : 'Click to Upload Excel / CSV Master File'}
                </div>
                <p className="text-[11px] text-[#738276] mt-0.5">
                  Supports Excel (.xlsx, .xls) and CSV formatted files
                </p>
              </div>

              {/* Parse Preview */}
              {isParsingExcel && (
                <div className="text-center py-6 text-xs text-[#2D4A3E] font-bold animate-pulse">
                  Parsing spreadsheet columns and organizing PAN entities...
                </div>
              )}

              {parseResult && (
                <div className="space-y-3 bg-white border border-[#E0E4DE] p-4 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between border-b border-[#F1F3EE] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#1A2E25]">Parsed Spreadsheet Preview</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EDF3EF] text-[#2D4A3E]">
                        {parseResult.totalPans} PANs • {parseResult.totalGstins} GSTINs • {parseResult.credentialsCount} Credentials
                      </span>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-[#F7F8F6] text-[#738276] text-[11px] font-bold">
                          <th className="p-2 border-b">PAN</th>
                          <th className="p-2 border-b">Legal Name</th>
                          <th className="p-2 border-b">Branches</th>
                          <th className="p-2 border-b">Portal ID</th>
                          <th className="p-2 border-b">State Code</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.entities.map((ent) => (
                          <tr key={ent.pan} className="border-b border-[#F1F3EE] hover:bg-[#FDFDFC]">
                            <td className="p-2 font-mono font-bold text-[#2D4A3E]">{ent.pan}</td>
                            <td className="p-2 font-semibold text-[#1A2E25]">{ent.legalName}</td>
                            <td className="p-2">
                              <span className="px-2 py-0.5 bg-[#EDF3EF] text-[#2D4A3E] rounded font-bold text-[10px]">
                                {ent.branches.length} GSTINs
                              </span>
                            </td>
                            <td className="p-2 font-mono text-[11px] text-[#56655A]">
                              {ent.branches[0]?.portalUsername || ent.defaultPortalUsername || '—'}
                            </td>
                            <td className="p-2 text-[11px]">
                              {ent.branches.map((b) => b.stateCode).join(', ') || 'URP'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-[#F1F3EE]">
                    <span className="text-xs text-[#738276]">
                      Ready to bulk save into local client directory.
                    </span>
                    <button
                      type="button"
                      onClick={handleConfirmExcelImport}
                      className="px-5 py-2 bg-[#2D4A3E] text-white font-bold text-xs rounded-xl hover:bg-[#1E362C] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Check className="w-4 h-4 text-[#8DA173]" />
                      <span>Confirm & Import {parseResult.totalPans} PAN Entities</span>
                    </button>
                  </div>
                </div>
              )}

              {excelImportSuccess && (
                <div className="p-4 bg-[#DCFCE7] border border-[#86EFAC] rounded-xl text-xs font-bold text-[#166534] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                  <span>Master Excel Directory Successfully Imported & Verified!</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PORTAL CREDENTIALS VAULT */}
          {activeTab === 'credentials_vault' && (
            <div className="space-y-4">
              <div className="bg-[#EDF3EF] border border-[#D5E2D9] p-4 rounded-xl text-xs space-y-2 text-[#2D4A3E]">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-[#8DA173]" />
                    <span>GST Portal Credentials Vault ({panInput})</span>
                  </span>
                  {onOpenGstPortalLogin && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenGstPortalLogin();
                      }}
                      className="px-3 py-1 bg-[#2D4A3E] text-white rounded-lg font-bold text-xs hover:bg-[#1E362C] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Globe className="w-3.5 h-3.5 text-[#8DA173]" />
                      <span>Launch Portal & Captcha Reader</span>
                    </button>
                  )}
                </div>
                <p className="text-[#56655A] text-[11px] leading-relaxed">
                  Store secure GST portal User IDs and Passwords per state registration for 1-click auto-fill on <strong>https://services.gst.gov.in/services/login</strong>.
                </p>
              </div>

              {activeEntity && activeEntity.branches.length > 0 ? (
                <div className="space-y-3">
                  {activeEntity.branches.map((b) => {
                    const isPassVisible = showPasswordMap[b.gstin] || false;
                    return (
                      <div
                        key={b.gstin}
                        className="bg-white border border-[#E0E4DE] p-4 rounded-xl shadow-xs space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-[#F1F3EE] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#2D4A3E]">
                              {b.gstin}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-[#EDF3EF] text-[#2D4A3E] rounded">
                              {b.stateCode} - {b.stateName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#738276] font-medium hidden sm:inline">
                              {b.tradeName || b.legalName}
                            </span>
                            {onOpenGstIncognitoDriver && (
                              <button
                                type="button"
                                onClick={() => onOpenGstIncognitoDriver(b.gstin, b, activeEntity)}
                                className="px-2.5 py-1 text-[11px] font-bold bg-[#1A2E25] text-white hover:bg-[#2D4A3E] rounded-lg transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <Zap className="w-3 h-3 text-[#8DA173]" />
                                <span>⚡ Launch Auto-Login</span>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-[#56655A] block mb-1">
                              Portal User ID / Username
                            </label>
                            <input
                              type="text"
                              defaultValue={b.portalUsername || ''}
                              onBlur={(e) =>
                                handleUpdateVaultCredentials(b.gstin, e.target.value, b.portalPassword || '')
                              }
                              placeholder="e.g. gst_user_mh"
                              className="w-full px-3 py-2 text-xs font-mono font-bold border border-[#E0E4DE] rounded-lg bg-[#F7F8F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8DA173]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-[#56655A] block mb-1">
                              Portal Password
                            </label>
                            <div className="relative flex items-center">
                              <input
                                type={isPassVisible ? 'text' : 'password'}
                                defaultValue={b.portalPassword || ''}
                                onBlur={(e) =>
                                  handleUpdateVaultCredentials(b.gstin, b.portalUsername || '', e.target.value)
                                }
                                placeholder="••••••••••••"
                                className="w-full px-3 pr-10 py-2 text-xs font-mono font-bold border border-[#E0E4DE] rounded-lg bg-[#F7F8F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#8DA173]"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowPasswordMap((prev) => ({
                                    ...prev,
                                    [b.gstin]: !isPassVisible,
                                  }))
                                }
                                className="absolute right-2.5 p-1 text-[#738276] hover:text-[#1A2E25] cursor-pointer"
                              >
                                {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#738276]">
                  No state GSTIN branches linked to this PAN.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: REGISTER NEW STATE GSTIN */}
          {activeTab === 'add_branch' && (
            <form onSubmit={handleAddNewBranch} className="space-y-4">
              <div className="bg-[#EDF3EF] border border-[#D5E2D9] p-4 rounded-xl text-xs space-y-1 text-[#2D4A3E]">
                <span className="font-bold block">Add Verified State GSTIN Branch:</span>
                <p className="text-[#56655A] text-[11px]">
                  Add a 15-character GSTIN linked to PAN <strong>{panInput}</strong> with optional login credentials.
                </p>
              </div>

              <div className="space-y-3 bg-white border border-[#E0E4DE] p-4 rounded-xl shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#1A2E25] block mb-1">
                      Registration Mode
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewBranchMode('exact')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                          newBranchMode === 'exact'
                            ? 'bg-[#2D4A3E] text-white border-[#2D4A3E]'
                            : 'bg-white text-[#2D4A3E] border-[#D5E2D9]'
                        }`}
                      >
                        Exact 15-Digit GSTIN
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewBranchMode('state')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer ${
                          newBranchMode === 'state'
                            ? 'bg-[#2D4A3E] text-white border-[#2D4A3E]'
                            : 'bg-white text-[#2D4A3E] border-[#D5E2D9]'
                        }`}
                      >
                        By State Code
                      </button>
                    </div>
                  </div>

                  {newBranchMode === 'exact' ? (
                    <div>
                      <label className="text-xs font-bold text-[#1A2E25] block mb-1">
                        Exact 15-Character GSTIN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={15}
                        value={newBranchExactGstin}
                        onChange={(e) => setNewBranchExactGstin(e.target.value.toUpperCase())}
                        placeholder={`27${panInput}1Z5`}
                        className="w-full px-3 py-2 text-xs font-mono font-bold text-[#1A2E25] border border-[#E0E4DE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8DA173]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-bold text-[#1A2E25] block mb-1">
                        Select Indian State / POS
                      </label>
                      <select
                        value={newBranchStateCode}
                        onChange={(e) => setNewBranchStateCode(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-bold text-[#1A2E25] border border-[#E0E4DE] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8DA173]"
                      >
                        {Object.entries(GST_STATE_MAP).map(([code, name]) => (
                          <option key={code} value={code}>
                            {code} - {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-[#1A2E25] block mb-1">
                    Branch / Trade Unit Name
                  </label>
                  <input
                    type="text"
                    value={newBranchTradeName}
                    onChange={(e) => setNewBranchTradeName(e.target.value)}
                    placeholder="e.g. Bangalore Tech Park Unit"
                    className="w-full px-3 py-2 text-xs font-bold text-[#1A2E25] border border-[#E0E4DE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8DA173]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#F1F3EE]">
                  <div>
                    <label className="text-xs font-bold text-[#1A2E25] block mb-1">
                      Portal User ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={newBranchUserId}
                      onChange={(e) => setNewBranchUserId(e.target.value)}
                      placeholder="e.g. apex_gst_user"
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-[#1A2E25] border border-[#E0E4DE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8DA173]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#1A2E25] block mb-1">
                      Portal Password (Optional)
                    </label>
                    <input
                      type="password"
                      value={newBranchPassword}
                      onChange={(e) => setNewBranchPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3 py-2 text-xs font-mono font-bold text-[#1A2E25] border border-[#E0E4DE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8DA173]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#2D4A3E] text-white font-bold text-xs rounded-xl hover:bg-[#1E362C] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#8DA173]" />
                    <span>Save & Register Branch</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
