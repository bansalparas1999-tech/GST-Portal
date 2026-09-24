import React, { useState, useMemo } from 'react';
import {
  X,
  SlidersHorizontal,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Building,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowUpDown,
  FileCode,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ToleranceConfig,
  Language,
  CustomMatchingRule,
  MatchingPresetType,
  InvoiceRecord,
} from '../types';
import {
  DEFAULT_TOLERANCE,
  DEFAULT_MATCHING_RULES,
  getPresetToleranceConfig,
  reconcileGstData,
} from '../utils/gstEngine';
import { translations } from '../utils/translations';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tolerance: ToleranceConfig;
  setTolerance: (cfg: ToleranceConfig) => void;
  companyGstin: string;
  setCompanyGstin: (g: string) => void;
  language: Language;
  onReRunMatch: () => void;
  sampleBooks?: InvoiceRecord[];
  sampleGstr2b?: InvoiceRecord[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  tolerance,
  setTolerance,
  companyGstin,
  setCompanyGstin,
  language,
  onReRunMatch,
  sampleBooks = [],
  sampleGstr2b = [],
}) => {
  const [localTolerance, setLocalTolerance] = useState<ToleranceConfig>(tolerance);
  const [activeSubTab, setActiveSubTab] = useState<'presets' | 'tolerances' | 'custom_rules'>('presets');
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleStage, setNewRuleStage] = useState<'partial_amount' | 'fuzzy_invoice' | 'fuzzy_gstin' | 'custom'>('partial_amount');
  const [newRuleAmountTol, setNewRuleAmountTol] = useState(5.0);
  const [newRuleTaxTol, setNewRuleTaxTol] = useState(2.0);
  const [newRuleDateTol, setNewRuleDateTol] = useState(30);

  // Sync state when modal opens
  React.useEffect(() => {
    setLocalTolerance(tolerance);
  }, [tolerance, isOpen]);

  // Live simulation results on current sample dataset
  const liveSimulation = useMemo(() => {
    if (sampleBooks.length === 0 || sampleGstr2b.length === 0) return null;
    const res = reconcileGstData(sampleBooks, sampleGstr2b, localTolerance);
    return res.summary;
  }, [sampleBooks, sampleGstr2b, localTolerance]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: MatchingPresetType) => {
    const updated = getPresetToleranceConfig(preset);
    setLocalTolerance(updated);
  };

  const handleToggleRule = (ruleId: string) => {
    const updatedRules = localTolerance.rules.map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    setLocalTolerance({
      ...localTolerance,
      preset: 'CUSTOM',
      rules: updatedRules,
    });
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = localTolerance.rules.filter((r) => r.id !== ruleId);
    setLocalTolerance({
      ...localTolerance,
      preset: 'CUSTOM',
      rules: updatedRules,
    });
  };

  const handleAddCustomRule = () => {
    if (!newRuleName.trim()) return;
    const newRule: CustomMatchingRule = {
      id: `custom-rule-${Date.now()}`,
      name: newRuleName.trim(),
      description: newRuleDesc.trim() || 'User defined custom reconciliation rule.',
      enabled: true,
      priority: localTolerance.rules.length + 1,
      stage: newRuleStage,
      conditions: {
        gstinMatch: newRuleStage === 'fuzzy_gstin' ? 'fuzzy' : 'exact',
        gstinFuzzyMaxDistance: 1,
        invoiceMatch: newRuleStage === 'fuzzy_invoice' ? 'fuzzy' : 'normalized',
        invoiceFuzzyMaxDistance: 2,
        amountMatch: 'absolute_tolerance',
        amountToleranceValue: newRuleAmountTol,
        taxToleranceValue: newRuleTaxTol,
        dateToleranceDays: newRuleDateTol,
        ignoreLeadingZeros: true,
        ignoreSpecialChars: true,
        ignoreCase: true,
      },
      assignStatus:
        newRuleStage === 'partial_amount'
          ? 'PARTIAL_MATCH'
          : newRuleStage === 'fuzzy_invoice'
          ? 'FUZZY_MATCH'
          : newRuleStage === 'fuzzy_gstin'
          ? 'FUZZY_GSTIN_MATCH'
          : 'VALUE_MISMATCH',
      confidence: 85,
      isBuiltIn: false,
    };

    setLocalTolerance({
      ...localTolerance,
      preset: 'CUSTOM',
      rules: [...localTolerance.rules, newRule],
    });

    setNewRuleName('');
    setNewRuleDesc('');
    setIsAddRuleOpen(false);
  };

  const handleReset = () => {
    setLocalTolerance(DEFAULT_TOLERANCE);
  };

  const handleSaveAndReMatch = () => {
    setTolerance(localTolerance);
    onReRunMatch();
    onClose();
  };

  return (
    <div
      id="settings-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
    >
      <div
        id="settings-modal-card"
        className="bg-white w-full max-w-2xl rounded-2xl border border-[#E0E4DE] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] my-auto"
      >
        {/* Header */}
        <div className="bg-[#2D4A3E] text-white p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8DA173] flex items-center justify-center font-bold text-white shadow-xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {language === 'hi'
                  ? 'कस्टम रे-कन्सिलिएशन नियम एवं टॉलरेंस इंजन'
                  : 'Advanced Reconciliation Rules & Matching Logic'}
              </h3>
              <p className="text-xs text-[#D3DCD6]">
                Configure multi-pass rules, fuzzy parameters, partial matching & thresholds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#D3DCD6] hover:text-white rounded-lg hover:bg-[#3D5C4F] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Simulation Banner */}
        {liveSimulation && (
          <div className="bg-[#EDF3EF] border-b border-[#D8E4DC] px-6 py-2.5 flex items-center justify-between text-xs text-[#2D4A3E]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#8DA173]" />
              <span className="font-bold">Live Rule Simulation:</span>
              <span>
                {liveSimulation.matchedCount} Exact • {liveSimulation.partialMatchCount} Partial •{' '}
                {liveSimulation.fuzzyMatchedCount} Fuzzy Inv • {liveSimulation.fuzzyGstinCount} Fuzzy GSTIN •{' '}
                {liveSimulation.missingIn2bCount} Missing in 2B
              </span>
            </div>
            <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#D8E4DC]">
              Preset: {localTolerance.preset}
            </span>
          </div>
        )}

        {/* Navigation SubTabs */}
        <div className="flex border-b border-[#E0E4DE] bg-[#F7F8F6] px-6">
          <button
            onClick={() => setActiveSubTab('presets')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === 'presets'
                ? 'border-[#2D4A3E] text-[#2D4A3E]'
                : 'border-transparent text-[#738276] hover:text-[#2D4A3E]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Preset Strategies</span>
          </button>

          <button
            onClick={() => setActiveSubTab('tolerances')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === 'tolerances'
                ? 'border-[#2D4A3E] text-[#2D4A3E]'
                : 'border-transparent text-[#738276] hover:text-[#2D4A3E]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Thresholds & Tolerances</span>
          </button>

          <button
            onClick={() => setActiveSubTab('custom_rules')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeSubTab === 'custom_rules'
                ? 'border-[#2D4A3E] text-[#2D4A3E]'
                : 'border-transparent text-[#738276] hover:text-[#2D4A3E]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Custom Rule Chain ({localTolerance.rules.filter((r) => r.enabled).length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 bg-[#FDFDFC]">
          {/* TAB 1: PRESET STRATEGIES */}
          {activeSubTab === 'presets' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-[#2D4A3E] uppercase tracking-wider text-[#738276]">
                Select Pre-Configured CA Reconciliation Presets
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Balanced CA */}
                <div
                  onClick={() => handleApplyPreset('BALANCED_CA')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    localTolerance.preset === 'BALANCED_CA'
                      ? 'border-[#2D4A3E] bg-[#EDF3EF]'
                      : 'border-[#E0E4DE] bg-white hover:border-[#8DA173]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D4A3E]">
                      Balanced CA Standard (Recommended)
                    </span>
                    {localTolerance.preset === 'BALANCED_CA' && (
                      <CheckCircle2 className="w-4 h-4 text-[#2D4A3E]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#738276] mt-1">
                    ±₹2.00 paise rounding tolerance, Levenshtein typo detection (dist 2), 30-day date window.
                  </p>
                </div>

                {/* Strict Statutory */}
                <div
                  onClick={() => handleApplyPreset('STRICT_STATUTORY')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    localTolerance.preset === 'STRICT_STATUTORY'
                      ? 'border-[#2D4A3E] bg-[#EDF3EF]'
                      : 'border-[#E0E4DE] bg-white hover:border-[#8DA173]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D4A3E]">
                      Strict Statutory (Sec 16(2)(aa))
                    </span>
                    {localTolerance.preset === 'STRICT_STATUTORY' && (
                      <CheckCircle2 className="w-4 h-4 text-[#2D4A3E]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#738276] mt-1">
                    Zero-tolerance exact matching only. Disallows fuzzy GSTIN/invoice differences for audits.
                  </p>
                </div>

                {/* Lenient Rounding */}
                <div
                  onClick={() => handleApplyPreset('LENIENT_ROUNDING')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    localTolerance.preset === 'LENIENT_ROUNDING'
                      ? 'border-[#2D4A3E] bg-[#EDF3EF]'
                      : 'border-[#E0E4DE] bg-white hover:border-[#8DA173]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D4A3E]">
                      Lenient Commercial (±₹10.00 / 2%)
                    </span>
                    {localTolerance.preset === 'LENIENT_ROUNDING' && (
                      <CheckCircle2 className="w-4 h-4 text-[#2D4A3E]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#738276] mt-1">
                    Accepts minor price variances, trade discounts, freight rounding up to ₹10 or 2%.
                  </p>
                </div>

                {/* Aggressive Fuzzy */}
                <div
                  onClick={() => handleApplyPreset('AGGRESSIVE_FUZZY')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    localTolerance.preset === 'AGGRESSIVE_FUZZY'
                      ? 'border-[#2D4A3E] bg-[#EDF3EF]'
                      : 'border-[#E0E4DE] bg-white hover:border-[#8DA173]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D4A3E]">
                      Aggressive Fuzzy & PAN Match
                    </span>
                    {localTolerance.preset === 'AGGRESSIVE_FUZZY' && (
                      <CheckCircle2 className="w-4 h-4 text-[#2D4A3E]" />
                    )}
                  </div>
                  <p className="text-[11px] text-[#738276] mt-1">
                    Matches across sister branches via PAN, accepts up to 3 typos in invoice number, 90-day window.
                  </p>
                </div>
              </div>

              {/* Company GSTIN */}
              <div className="pt-2">
                <label className="text-xs font-bold text-[#2D4A3E] block mb-1">
                  Your Company GSTIN:
                </label>
                <input
                  type="text"
                  value={companyGstin}
                  onChange={(e) => setCompanyGstin(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-semibold border border-[#E0E4DE] px-3.5 py-2 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: THRESHOLDS & TOLERANCES */}
          {activeSubTab === 'tolerances' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-[#2D4A3E] uppercase tracking-wider text-[#738276]">
                Granular Threshold Controls
              </h4>

              {/* Value Rounding Tolerance */}
              <div className="flex items-center justify-between bg-[#F7F8F6] p-3.5 rounded-xl border border-[#E0E4DE]">
                <div>
                  <span className="text-xs font-bold text-[#2D4A3E] block">
                    Taxable Value Rounding Tolerance (₹)
                  </span>
                  <span className="text-[11px] text-[#738276]">
                    Allow difference due to paise rounding (e.g. ± ₹2.00)
                  </span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={localTolerance.valueTolerance}
                  onChange={(e) =>
                    setLocalTolerance({
                      ...localTolerance,
                      preset: 'CUSTOM',
                      valueTolerance: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-24 text-xs font-mono text-center font-bold border border-[#E0E4DE] py-1.5 px-2 rounded-lg bg-white"
                />
              </div>

              {/* Tax Tolerance */}
              <div className="flex items-center justify-between bg-[#F7F8F6] p-3.5 rounded-xl border border-[#E0E4DE]">
                <div>
                  <span className="text-xs font-bold text-[#2D4A3E] block">
                    Tax Amount Tolerance (₹)
                  </span>
                  <span className="text-[11px] text-[#738276]">
                    Allow GST difference in rounding (e.g. ± ₹1.50)
                  </span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={localTolerance.taxTolerance}
                  onChange={(e) =>
                    setLocalTolerance({
                      ...localTolerance,
                      preset: 'CUSTOM',
                      taxTolerance: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-24 text-xs font-mono text-center font-bold border border-[#E0E4DE] py-1.5 px-2 rounded-lg bg-white"
                />
              </div>

              {/* Percentage Tolerance */}
              <div className="flex items-center justify-between bg-[#F7F8F6] p-3.5 rounded-xl border border-[#E0E4DE]">
                <div>
                  <span className="text-xs font-bold text-[#2D4A3E] block">
                    Percentage Value Allowance (%)
                  </span>
                  <span className="text-[11px] text-[#738276]">
                    Accept commercial difference within % threshold (e.g. 1.0%)
                  </span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={localTolerance.percentageTolerance}
                  onChange={(e) =>
                    setLocalTolerance({
                      ...localTolerance,
                      preset: 'CUSTOM',
                      percentageTolerance: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-24 text-xs font-mono text-center font-bold border border-[#E0E4DE] py-1.5 px-2 rounded-lg bg-white"
                />
              </div>

              {/* Date Window */}
              <div className="flex items-center justify-between bg-[#F7F8F6] p-3.5 rounded-xl border border-[#E0E4DE]">
                <div>
                  <span className="text-xs font-bold text-[#2D4A3E] block">
                    Date Variance Allowance (Days)
                  </span>
                  <span className="text-[11px] text-[#738276]">
                    Accept invoice dates within window for matching (e.g. 30 days)
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={localTolerance.dateToleranceDays}
                  onChange={(e) =>
                    setLocalTolerance({
                      ...localTolerance,
                      preset: 'CUSTOM',
                      dateToleranceDays: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-24 text-xs font-mono text-center font-bold border border-[#E0E4DE] py-1.5 px-2 rounded-lg bg-white"
                />
              </div>

              {/* Significant Discrepancy Threshold */}
              <div className="flex items-center justify-between bg-[#FFF8EE] p-3.5 rounded-xl border border-[#D9A14E]/30">
                <div>
                  <span className="text-xs font-bold text-[#2D4A3E] block">
                    Significant Discrepancy Threshold (₹)
                  </span>
                  <span className="text-[11px] text-[#738276]">
                    Trigger high-priority audit alerts when tax diff exceeds this amount (e.g. ₹500)
                  </span>
                </div>
                <input
                  type="number"
                  step="50"
                  min="100"
                  max="10000"
                  value={localTolerance.significantDiscrepancyThreshold}
                  onChange={(e) =>
                    setLocalTolerance({
                      ...localTolerance,
                      preset: 'CUSTOM',
                      significantDiscrepancyThreshold: parseFloat(e.target.value) || 500,
                    })
                  }
                  className="w-24 text-xs font-mono text-center font-bold border border-[#E0E4DE] py-1.5 px-2 rounded-lg bg-white text-[#D9A14E]"
                />
              </div>

              {/* Logic Toggles */}
              <div className="border-t border-[#E0E4DE] pt-4 space-y-2.5">
                <h4 className="text-xs font-bold text-[#2D4A3E] uppercase tracking-wider text-[#738276]">
                  Data Normalization & Cross-Matching Toggles
                </h4>

                <label className="flex items-center gap-2.5 text-xs text-[#2D362E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localTolerance.ignoreLeadingZeros}
                    onChange={(e) =>
                      setLocalTolerance({ ...localTolerance, ignoreLeadingZeros: e.target.checked })
                    }
                    className="rounded text-[#8DA173] focus:ring-[#8DA173]"
                  />
                  <span>Ignore leading zeros (e.g. <strong>00045</strong> matches <strong>45</strong>)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-[#2D362E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localTolerance.ignoreCommonPrefixes}
                    onChange={(e) =>
                      setLocalTolerance({ ...localTolerance, ignoreCommonPrefixes: e.target.checked })
                    }
                    className="rounded text-[#8DA173] focus:ring-[#8DA173]"
                  />
                  <span>
                    Strip common prefixes & financial years (e.g. <strong>INV-24-25/001</strong> matches <strong>1</strong>)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-[#2D362E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localTolerance.allowGstinFuzzy}
                    onChange={(e) =>
                      setLocalTolerance({ ...localTolerance, allowGstinFuzzy: e.target.checked })
                    }
                    className="rounded text-[#8DA173] focus:ring-[#8DA173]"
                  />
                  <span>Allow GSTIN optical OCR / typo matching (1 character distance, 0 vs O, 1 vs I)</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-[#2D362E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localTolerance.allowPanMatching}
                    onChange={(e) =>
                      setLocalTolerance({ ...localTolerance, allowPanMatching: e.target.checked })
                    }
                    className="rounded text-[#8DA173] focus:ring-[#8DA173]"
                  />
                  <span>Enable PAN-level multi-state matching across branch GSTINs</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-[#2D362E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localTolerance.allowTaxHeadCrossMatch}
                    onChange={(e) =>
                      setLocalTolerance({
                        ...localTolerance,
                        allowTaxHeadCrossMatch: e.target.checked,
                      })
                    }
                    className="rounded text-[#8DA173] focus:ring-[#8DA173]"
                  />
                  <span>Cross-match Place of Supply tax head mismatches (IGST booked as CGST+SGST)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM RULE CHAIN */}
          {activeSubTab === 'custom_rules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#2D4A3E] uppercase tracking-wider text-[#738276]">
                  Active Matching Pipeline & Rule Sequence
                </h4>
                <button
                  onClick={() => setIsAddRuleOpen(!isAddRuleOpen)}
                  className="px-3 py-1.5 bg-[#8DA173] text-white rounded-lg text-xs font-bold hover:bg-[#7A8E61] transition-all flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Define New Rule</span>
                </button>
              </div>

              {/* Add Custom Rule Inline Form */}
              {isAddRuleOpen && (
                <div className="bg-[#F7F8F6] p-4 rounded-xl border border-[#E0E4DE] space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#2D4A3E]">
                      Define Custom Matching Condition
                    </span>
                    <button
                      onClick={() => setIsAddRuleOpen(false)}
                      className="text-[#738276] hover:text-[#2D4A3E]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
                        Rule Name:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Freight Rounding Allowance"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                        className="w-full text-xs border border-[#E0E4DE] px-3 py-1.5 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#2D4A3E] block mb-1">
                        Matching Type:
                      </label>
                      <select
                        value={newRuleStage}
                        onChange={(e: any) => setNewRuleStage(e.target.value)}
                        className="w-full text-xs border border-[#E0E4DE] px-3 py-1.5 rounded-lg bg-white"
                      >
                        <option value="partial_amount">Partial Amount Allowance (₹ / %)</option>
                        <option value="fuzzy_invoice">Fuzzy Invoice Number (Typos / Formats)</option>
                        <option value="fuzzy_gstin">Fuzzy GSTIN / PAN Match</option>
                        <option value="custom">Custom Discrepancy Flag</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-[#738276] block mb-0.5">
                        Amount Tol (₹)
                      </label>
                      <input
                        type="number"
                        value={newRuleAmountTol}
                        onChange={(e) => setNewRuleAmountTol(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-mono border border-[#E0E4DE] px-2 py-1 rounded bg-white text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#738276] block mb-0.5">
                        Tax Tol (₹)
                      </label>
                      <input
                        type="number"
                        value={newRuleTaxTol}
                        onChange={(e) => setNewRuleTaxTol(parseFloat(e.target.value) || 0)}
                        className="w-full text-xs font-mono border border-[#E0E4DE] px-2 py-1 rounded bg-white text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#738276] block mb-0.5">
                        Date Window (Days)
                      </label>
                      <input
                        type="number"
                        value={newRuleDateTol}
                        onChange={(e) => setNewRuleDateTol(parseInt(e.target.value, 10) || 0)}
                        className="w-full text-xs font-mono border border-[#E0E4DE] px-2 py-1 rounded bg-white text-center"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleAddCustomRule}
                      className="px-4 py-1.5 bg-[#2D4A3E] text-white rounded-lg text-xs font-bold hover:bg-[#1E362C]"
                    >
                      Save & Append Rule
                    </button>
                  </div>
                </div>
              )}

              {/* Rules List */}
              <div className="space-y-2.5">
                {localTolerance.rules.map((rule, idx) => (
                  <div
                    key={rule.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      rule.enabled
                        ? 'bg-white border-[#E0E4DE] shadow-xs'
                        : 'bg-[#F7F8F6] border-[#E0E4DE] opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#EDF3EF] text-[#2D4A3E] text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#2D4A3E]">{rule.name}</span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full font-mono font-bold bg-[#F7F8F6] text-[#738276] border border-[#E0E4DE]">
                            Stage: {rule.stage}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#738276] mt-0.5">{rule.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={() => handleToggleRule(rule.id)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-[#E0E4DE] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8DA173]"></div>
                      </label>

                      {!rule.isBuiltIn && (
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="p-1 text-[#C75D4E] hover:bg-[#FFF2F0] rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F7F8F6] border-t border-[#E0E4DE] flex items-center justify-between shrink-0">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 text-xs font-semibold text-[#738276] hover:text-[#2D4A3E] flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-[#738276] hover:bg-[#E0E4DE] transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-settings"
              onClick={handleSaveAndReMatch}
              className="px-5 py-2 bg-[#8DA173] text-white rounded-lg text-xs font-bold hover:bg-[#7A8E61] transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Apply & Re-Match Portal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
