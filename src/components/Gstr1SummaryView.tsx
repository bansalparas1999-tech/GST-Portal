import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShoppingBag,
  ExternalLink,
  Layers,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Calendar,
  Building,
  Edit3,
  Plus,
  Trash2,
  HelpCircle,
  Info,
  ChevronRight,
} from 'lucide-react';
import {
  InvoiceRecord,
  HsnSummaryItem,
  B2csSummaryItem,
  Gstr1JsonPayload,
  Gstr1QuarterlyJsonPayload,
  Gstr1FilingFrequency,
  Language,
} from '../types';
import {
  generateB2csSummaryFromInvoices,
  generateHsnSummaryFromInvoices,
  generateGstr1Json,
  generateGstr1QuarterlyJson,
  formatGstr1QuarterlyFilingPeriod,
  getQuarterFromMonth,
  downloadGstr1JsonFile,
  DocSeriesConfig,
} from '../utils/gstr1Engine';

interface Gstr1SummaryViewProps {
  salesInvoices: InvoiceRecord[];
  gstr1Invoices: InvoiceRecord[];
  hsnItems: HsnSummaryItem[];
  b2csItems: B2csSummaryItem[];
  companyGstin: string;
  selectedFY: string;
  selectedMonth: string;
  language: Language;
  onOpenUpload: (tab?: any) => void;
  onUpdateHsnItems?: (items: HsnSummaryItem[]) => void;
  onUpdateB2csItems?: (items: B2csSummaryItem[]) => void;
}

export const Gstr1SummaryView: React.FC<Gstr1SummaryViewProps> = ({
  salesInvoices,
  gstr1Invoices,
  hsnItems,
  b2csItems,
  companyGstin,
  selectedFY,
  selectedMonth,
  language,
  onOpenUpload,
}) => {
  // Separate option for Quarterly Filers (QRMP Scheme) vs Monthly Filers
  const [filingFrequency, setFilingFrequency] = useState<Gstr1FilingFrequency>('QUARTERLY');
  const [selectedQuarter, setSelectedQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>(() => {
    return getQuarterFromMonth(selectedMonth || 'March');
  });

  // E-Commerce Operator (ECO) GSTIN for SUPECO (Sec 52 TCS)
  const [ecoGstin, setEcoGstin] = useState<string>('07AARCM9332R1CQ'); // Default Meesho GSTIN from sample
  const [customEcoInput, setCustomEcoInput] = useState<string>('');
  const [showEcoInput, setShowEcoInput] = useState<boolean>(false);

  // Sub-views: Table 7 B2CS, Table 12 HSN, Table 14/15 SUPECO, Table 13 DOC ISSUE, Table 4A B2B, JSON PREVIEW
  const [activeSubView, setActiveSubView] = useState<
    'b2cs' | 'hsn' | 'supeco' | 'doc_issue' | 'b2b' | 'json_preview'
  >('b2cs');

  // Preview format toggle inside JSON preview tab
  const [previewFormat, setPreviewFormat] = useState<Gstr1FilingFrequency>('QUARTERLY');
  const [copied, setCopied] = useState(false);

  // Editable Document Series for Quarterly Outward & Credit Notes (Table 13)
  const [customOutwardDocs, setCustomOutwardDocs] = useState<DocSeriesConfig[]>([
    { num: 1, from: 'emxmd263710', to: 'emxmd263986', totnum: 275, cancel: 0, net_issue: 275 },
    { num: 2, from: 'emxmd263987', to: 'emxmd264228', totnum: 246, cancel: 0, net_issue: 246 },
    { num: 3, from: 'emxmd264229', to: 'emxmd264530', totnum: 304, cancel: 0, net_issue: 304 },
  ]);

  const [customCreditDocs, setCustomCreditDocs] = useState<DocSeriesConfig[]>([
    { num: 1, from: 'emxmd26C1487', to: 'emxmd26C1610', totnum: 121, cancel: 0, net_issue: 121 },
    { num: 2, from: 'emxmd26C1619', to: 'emxmd26C1707', totnum: 96, cancel: 0, net_issue: 96 },
    { num: 3, from: 'emxmd26C1708', to: 'emxmd27C1', totnum: 146, cancel: 0, net_issue: 146 },
  ]);

  const [isEditingDocs, setIsEditingDocs] = useState<boolean>(false);

  const activeInvoices = useMemo(() => {
    return salesInvoices.length > 0 ? salesInvoices : gstr1Invoices;
  }, [salesInvoices, gstr1Invoices]);

  // Derived B2CS items (either uploaded or generated from invoices)
  const computedB2cs = useMemo(() => {
    if (b2csItems && b2csItems.length > 0) return b2csItems;
    return generateB2csSummaryFromInvoices(activeInvoices, companyGstin);
  }, [b2csItems, activeInvoices, companyGstin]);

  // Derived HSN items (either uploaded or generated from invoices)
  const computedHsn = useMemo(() => {
    if (hsnItems && hsnItems.length > 0) return hsnItems;
    return generateHsnSummaryFromInvoices(activeInvoices);
  }, [hsnItems, activeInvoices]);

  // B2B Invoices
  const b2bInvoices = useMemo(() => {
    return activeInvoices.filter(
      (inv) => inv.gstin && inv.gstin !== 'URP' && inv.gstin.length === 15 && inv.invoiceType !== 'B2CS'
    );
  }, [activeInvoices]);

  // Generated Standard Monthly GSTR-1 JSON Payload (GST3.2)
  const gstr1Payload: Gstr1JsonPayload = useMemo(() => {
    return generateGstr1Json({
      taxpayerGstin: companyGstin,
      financialYear: selectedFY,
      taxPeriod: selectedMonth,
      invoices: activeInvoices,
      hsnItems: computedHsn,
      b2csItems: computedB2cs,
    });
  }, [companyGstin, selectedFY, selectedMonth, activeInvoices, computedHsn, computedB2cs]);

  // Generated Quarterly GSTR-1 JSON Payload (GST3.1.6) - Specific Schema for Quarterly Filers
  const gstr1QuarterlyPayload: Gstr1QuarterlyJsonPayload = useMemo(() => {
    return generateGstr1QuarterlyJson({
      taxpayerGstin: companyGstin || '07AUVPK7442B1ZF',
      financialYear: selectedFY,
      quarter: selectedQuarter,
      invoices: activeInvoices,
      hsnItems: computedHsn,
      b2csItems: computedB2cs,
      ecommerceGstin: ecoGstin,
      customDocIssue: {
        outwardDocs: customOutwardDocs,
        creditNoteDocs: customCreditDocs,
      },
    });
  }, [
    companyGstin,
    selectedFY,
    selectedQuarter,
    activeInvoices,
    computedHsn,
    computedB2cs,
    ecoGstin,
    customOutwardDocs,
    customCreditDocs,
  ]);

  // Totals calculations
  const totalTaxable = activeInvoices.reduce((s, i) => s + i.taxableValue, 0);
  const totalTax = activeInvoices.reduce((s, i) => s + i.totalTax, 0);
  const totalIgst = activeInvoices.reduce((s, i) => s + i.igst, 0);
  const totalCgst = activeInvoices.reduce((s, i) => s + i.cgst, 0);
  const totalSgst = activeInvoices.reduce((s, i) => s + i.sgst, 0);
  const totalCess = activeInvoices.reduce((s, i) => s + (i.cess || 0), 0);
  const totalGross = activeInvoices.reduce((s, i) => s + i.invoiceValue, 0);

  const b2csTaxableTotal = computedB2cs.reduce((s, i) => s + i.txval, 0);
  const b2csTaxTotal = computedB2cs.reduce((s, i) => s + (i.iamt + i.camt + i.samt + i.csamt), 0);

  const hsnTaxableTotal = computedHsn.reduce((s, i) => s + i.txval, 0);
  const hsnTaxTotal = computedHsn.reduce((s, i) => s + (i.iamt + i.camt + i.samt + i.csamt), 0);
  const hsnQtyTotal = computedHsn.reduce((s, i) => s + i.qty, 0);

  const handleCopyJson = () => {
    const payloadToCopy = previewFormat === 'QUARTERLY' ? gstr1QuarterlyPayload : gstr1Payload;
    navigator.clipboard.writeText(JSON.stringify(payloadToCopy, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQuarterlyJson = () => {
    downloadGstr1JsonFile(
      gstr1QuarterlyPayload,
      `GSTR1_Quarterly_${gstr1QuarterlyPayload.gstin}_${gstr1QuarterlyPayload.fp}.json`
    );
  };

  const handleDownloadMonthlyJson = () => {
    downloadGstr1JsonFile(
      gstr1Payload,
      `GSTR1_Monthly_${gstr1Payload.gstin}_${gstr1Payload.fp}.json`
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* SEPARATE OPTION: FILING REGIME SELECTOR (QUARTERLY FILERS VS MONTHLY FILERS) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#2D4A3E]/20 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2D4A3E] flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#8DA173]" />
                GST Filing Frequency Selection
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EDF3EF] text-[#2D4A3E] font-bold">
                Required for Section 37 / QRMP Compliance
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#1A2E25]">
              Choose Your GSTR-1 Return Mode
            </h3>
            <p className="text-xs text-[#56655A] mt-0.5">
              Select <strong>Quarterly Filer</strong> to output the specialized JSON schema (GST3.1.6) with B2CS OE, HSN_B2C, SUPECO (ECO TCS), and Table 13 documents.
            </p>
          </div>

          {/* Option Selector Toggle */}
          <div className="inline-flex p-1.5 bg-[#F1F4EE] rounded-2xl border border-[#D5E2D9] self-stretch sm:self-auto shrink-0">
            <button
              id="opt-quarterly-filer"
              type="button"
              onClick={() => {
                setFilingFrequency('QUARTERLY');
                setPreviewFormat('QUARTERLY');
              }}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                filingFrequency === 'QUARTERLY'
                  ? 'bg-[#2D4A3E] text-white shadow-sm'
                  : 'text-[#56655A] hover:text-[#1A2E25] hover:bg-white/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>Quarterly Filer (QRMP)</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-mono font-bold ${
                  filingFrequency === 'QUARTERLY'
                    ? 'bg-[#8DA173] text-white'
                    : 'bg-[#D5E2D9] text-[#2D4A3E]'
                }`}
              >
                GST3.1.6
              </span>
            </button>

            <button
              id="opt-monthly-filer"
              type="button"
              onClick={() => {
                setFilingFrequency('MONTHLY');
                setPreviewFormat('MONTHLY');
              }}
              className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                filingFrequency === 'MONTHLY'
                  ? 'bg-[#2D4A3E] text-white shadow-sm'
                  : 'text-[#56655A] hover:text-[#1A2E25] hover:bg-white/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Monthly Filer (Normal)</span>
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-mono font-bold ${
                  filingFrequency === 'MONTHLY'
                    ? 'bg-[#8DA173] text-white'
                    : 'bg-[#D5E2D9] text-[#2D4A3E]'
                }`}
              >
                GST3.2
              </span>
            </button>
          </div>
        </div>

        {/* QUARTERLY FILER CONFIGURATION BAR (Visible when Quarterly option is active) */}
        {filingFrequency === 'QUARTERLY' && (
          <div className="mt-4 pt-4 border-t border-[#E0E4DE] bg-[#F7F9F6] -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-2xl">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#1A2E25] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#2D4A3E]" />
                  Return Quarter:
                </span>
                {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => {
                  const fpCode = formatGstr1QuarterlyFilingPeriod(q, selectedFY);
                  const label =
                    q === 'Q1'
                      ? 'Q1 (Apr - Jun)'
                      : q === 'Q2'
                      ? 'Q2 (Jul - Sep)'
                      : q === 'Q3'
                      ? 'Q3 (Oct - Dec)'
                      : 'Q4 (Jan - Mar)';
                  const isSelected = selectedQuarter === q;
                  return (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSelectedQuarter(q)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#2D4A3E] text-white shadow-2xs'
                          : 'bg-white text-[#56655A] hover:bg-[#EDF3EF] border border-[#D5E2D9]'
                      }`}
                    >
                      <span>{label}</span>
                      <span
                        className={`text-[10px] font-mono px-1 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-[#F1F4EE] text-[#56655A]'
                        }`}
                      >
                        {fpCode}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-[#1A2E25] flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-[#D9A14E]" />
                  ECO ETIN:
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEcoGstin('07AARCM9332R1CQ');
                      setShowEcoInput(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      ecoGstin === '07AARCM9332R1CQ' && !showEcoInput
                        ? 'bg-[#8DA173] text-white'
                        : 'bg-white text-[#2D4A3E] border border-[#D5E2D9]'
                    }`}
                  >
                    Meesho (07AARCM9332R1CQ)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEcoGstin('07AAACA6602R1ZT');
                      setShowEcoInput(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      ecoGstin === '07AAACA6602R1ZT' && !showEcoInput
                        ? 'bg-[#8DA173] text-white'
                        : 'bg-white text-[#2D4A3E] border border-[#D5E2D9]'
                    }`}
                  >
                    Amazon
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEcoGstin('29AAACF9005F1Z5');
                      setShowEcoInput(false);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      ecoGstin === '29AAACF9005F1Z5' && !showEcoInput
                        ? 'bg-[#8DA173] text-white'
                        : 'bg-white text-[#2D4A3E] border border-[#D5E2D9]'
                    }`}
                  >
                    Flipkart
                  </button>

                  {!showEcoInput ? (
                    <button
                      type="button"
                      onClick={() => setShowEcoInput(true)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#56655A] bg-white border border-[#D5E2D9] hover:bg-[#F1F4EE] cursor-pointer"
                    >
                      Custom...
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        maxLength={15}
                        value={customEcoInput}
                        onChange={(e) => setCustomEcoInput(e.target.value.toUpperCase())}
                        placeholder="15-digit GSTIN"
                        className="px-2 py-1 text-xs font-mono uppercase bg-white border border-[#2D4A3E] rounded-lg w-32 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customEcoInput.trim()) {
                            setEcoGstin(customEcoInput.trim().toUpperCase());
                          }
                        }}
                        className="px-2 py-1 bg-[#2D4A3E] text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Banner: GSTR-1 Generator & Summary */}
      <div className="bg-[#1A2E25] text-white rounded-2xl p-5 sm:p-6 border border-[#2D4A3E] shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#8DA173] text-white">
                {filingFrequency === 'QUARTERLY' ? 'Quarterly QRMP JSON Engine' : 'Monthly GSTR-1 Engine'}
              </span>
              <span className="text-xs text-[#D5E2D9] font-mono">
                GSTIN: <strong>{companyGstin}</strong>
              </span>
              <span className="text-xs text-[#D5E2D9] font-mono">
                FP:{' '}
                <strong>
                  {filingFrequency === 'QUARTERLY'
                    ? gstr1QuarterlyPayload.fp
                    : gstr1Payload.fp}
                </strong>{' '}
                ({filingFrequency === 'QUARTERLY' ? selectedQuarter : selectedMonth} / {selectedFY})
              </span>
              <span className="text-xs text-[#8DA173] font-mono">
                Version:{' '}
                <strong>
                  {filingFrequency === 'QUARTERLY'
                    ? gstr1QuarterlyPayload.version
                    : gstr1Payload.version}
                </strong>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <span>
                {filingFrequency === 'QUARTERLY'
                  ? 'Quarterly GSTR-1 Return (QRMP & E-Commerce)'
                  : 'Monthly GSTR-1 Outward Supplies'}
              </span>
            </h2>
            <p className="text-xs text-[#BBD3C5] mt-1 max-w-2xl">
              {filingFrequency === 'QUARTERLY'
                ? 'Formatted for Quarterly filers in GST3.1.6 schema. Aggregates Table 7 B2CS with OE type, Table 12 HSN (hsn_b2c), Table 14/15 SUPECO with Section 52 TCS, and Table 13 Invoices + Credit Notes.'
                : 'Compliant with Section 37 of CGST Act. Aggregates Table 7 (B2C Small) and Table 12 (HSN Summary). Export ready-to-upload JSON for the GST Portal.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
            {filingFrequency === 'QUARTERLY' ? (
              <button
                id="btn-download-quarterly-gstr1-json"
                type="button"
                onClick={handleDownloadQuarterlyJson}
                className="px-4 py-2.5 bg-[#8DA173] hover:bg-[#7D9163] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Quarterly JSON (GST3.1.6)</span>
              </button>
            ) : (
              <button
                id="btn-download-monthly-gstr1-json"
                type="button"
                onClick={handleDownloadMonthlyJson}
                className="px-4 py-2.5 bg-[#8DA173] hover:bg-[#7D9163] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Monthly JSON (GST3.2)</span>
              </button>
            )}

            <button
              id="btn-upload-hsn-summary"
              type="button"
              onClick={() => onOpenUpload('hsn_import')}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>Upload HSN Summary</span>
            </button>

            <button
              id="btn-upload-sales-summary"
              type="button"
              onClick={() => onOpenUpload('sales_import')}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#D9A14E]" />
              <span>Upload Amazon / Meesho</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] uppercase font-bold text-[#BBD3C5] tracking-wider">
              {filingFrequency === 'QUARTERLY' ? 'Quarter B2CS Items' : 'Total Invoices'}
            </div>
            <div className="text-lg font-bold text-white mt-0.5">
              {filingFrequency === 'QUARTERLY'
                ? gstr1QuarterlyPayload.b2cs?.length || computedB2cs.length
                : activeInvoices.length}
            </div>
            <div className="text-[10px] text-[#8DA173]">
              {filingFrequency === 'QUARTERLY'
                ? `${gstr1QuarterlyPayload.hsn?.hsn_b2c?.length || 0} HSN Groups`
                : `${b2bInvoices.length} B2B · ${activeInvoices.length - b2bInvoices.length} B2C`}
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] uppercase font-bold text-[#BBD3C5] tracking-wider">Total Taxable Value</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {formatCurrency(
                filingFrequency === 'QUARTERLY' && gstr1QuarterlyPayload.supeco?.clttx[0]
                  ? gstr1QuarterlyPayload.supeco.clttx[0].suppval
                  : totalTaxable || b2csTaxableTotal
              )}
            </div>
            <div className="text-[10px] text-[#BBD3C5]">Gross: {formatCurrency(totalGross || totalTaxable * 1.05)}</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] uppercase font-bold text-[#BBD3C5] tracking-wider">Integrated Tax (IGST)</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {formatCurrency(
                filingFrequency === 'QUARTERLY' && gstr1QuarterlyPayload.supeco?.clttx[0]
                  ? gstr1QuarterlyPayload.supeco.clttx[0].igst
                  : totalIgst
              )}
            </div>
            <div className="text-[10px] text-[#BBD3C5]">Inter-State Supplies</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] uppercase font-bold text-[#BBD3C5] tracking-wider">Central Tax (CGST)</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {formatCurrency(
                filingFrequency === 'QUARTERLY' && gstr1QuarterlyPayload.supeco?.clttx[0]
                  ? gstr1QuarterlyPayload.supeco.clttx[0].cgst
                  : totalCgst
              )}
            </div>
            <div className="text-[10px] text-[#BBD3C5]">Intra-State (50%)</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] uppercase font-bold text-[#BBD3C5] tracking-wider">State Tax (SGST)</div>
            <div className="text-lg font-bold text-white mt-0.5">
              {formatCurrency(
                filingFrequency === 'QUARTERLY' && gstr1QuarterlyPayload.supeco?.clttx[0]
                  ? gstr1QuarterlyPayload.supeco.clttx[0].sgst
                  : totalSgst
              )}
            </div>
            <div className="text-[10px] text-[#BBD3C5]">Intra-State (50%)</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="text-[10px] uppercase font-bold text-[#BBD3C5] tracking-wider">SUPECO Operator</div>
            <div className="text-lg font-bold text-[#D9A14E] mt-0.5 font-mono text-sm truncate">
              {ecoGstin}
            </div>
            <div className="text-[10px] text-[#BBD3C5]">Sec 52 TCS Operator</div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E0E4DE] pb-2 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubView('b2cs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubView === 'b2cs'
              ? 'bg-[#2D4A3E] text-white shadow-2xs'
              : 'bg-white text-[#56655A] hover:bg-[#F7F8F6] border border-[#E0E4DE]'
          }`}
        >
          <span>Table 7: B2C (Small) Summary</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeSubView === 'b2cs' ? 'bg-[#8DA173] text-white' : 'bg-[#EDF3EF] text-[#2D4A3E]'
            }`}
          >
            {filingFrequency === 'QUARTERLY'
              ? gstr1QuarterlyPayload.b2cs?.length || computedB2cs.length
              : computedB2cs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('hsn')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubView === 'hsn'
              ? 'bg-[#2D4A3E] text-white shadow-2xs'
              : 'bg-white text-[#56655A] hover:bg-[#F7F8F6] border border-[#E0E4DE]'
          }`}
        >
          <span>Table 12: HSN Summary</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeSubView === 'hsn' ? 'bg-[#8DA173] text-white' : 'bg-[#EDF3EF] text-[#2D4A3E]'
            }`}
          >
            {filingFrequency === 'QUARTERLY'
              ? gstr1QuarterlyPayload.hsn?.hsn_b2c?.length || computedHsn.length
              : computedHsn.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('supeco')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubView === 'supeco'
              ? 'bg-[#2D4A3E] text-white shadow-2xs'
              : 'bg-white text-[#56655A] hover:bg-[#F7F8F6] border border-[#E0E4DE]'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-[#D9A14E]" />
          <span>Table 14/15: SUPECO (ECO Supplies)</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#EDF3EF] text-[#2D4A3E] font-bold">
            Sec 52 TCS
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('doc_issue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubView === 'doc_issue'
              ? 'bg-[#2D4A3E] text-white shadow-2xs'
              : 'bg-white text-[#56655A] hover:bg-[#F7F8F6] border border-[#E0E4DE]'
          }`}
        >
          <span>Table 13: Documents & Credit Notes</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeSubView === 'doc_issue' ? 'bg-[#8DA173] text-white' : 'bg-[#EDF3EF] text-[#2D4A3E]'
            }`}
          >
            {customOutwardDocs.length + customCreditDocs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('b2b')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeSubView === 'b2b'
              ? 'bg-[#2D4A3E] text-white shadow-2xs'
              : 'bg-white text-[#56655A] hover:bg-[#F7F8F6] border border-[#E0E4DE]'
          }`}
        >
          <span>Table 4A: B2B Invoices</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              activeSubView === 'b2b' ? 'bg-[#8DA173] text-white' : 'bg-[#EDF3EF] text-[#2D4A3E]'
            }`}
          >
            {b2bInvoices.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('json_preview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ml-auto ${
            activeSubView === 'json_preview'
              ? 'bg-[#8DA173] text-white shadow-2xs'
              : 'bg-[#EDF3EF] text-[#2D4A3E] hover:bg-[#D5E2D9] border border-[#D5E2D9]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Official Portal JSON Preview</span>
        </button>
      </div>

      {/* SUB-VIEW 1: B2CS SUMMARY (TABLE 7) */}
      {activeSubView === 'b2cs' && (
        <div className="bg-white rounded-2xl border border-[#E0E4DE] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E0E4DE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FDFDFC]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1A2E25]">Table 7: B2C (Small) Outward Supplies Summary</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EDF3EF] text-[#2D4A3E] font-bold">
                  {filingFrequency === 'QUARTERLY' ? 'Quarterly OE Mode (GST3.1.6)' : 'Monthly Mode'}
                </span>
              </div>
              <p className="text-xs text-[#738276] mt-0.5">
                Grouped by Place of Supply (POS) and Tax Rate. In Quarterly Mode, output format enforces type &quot;OE&quot; with strict 2-digit POS and statutory rounding.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#2D4A3E] bg-[#EDF3EF] px-3 py-1 rounded-lg">
                Total POS Rows: {gstr1QuarterlyPayload.b2cs?.length || computedB2cs.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFBF9] text-[#56655A] border-b border-[#E0E4DE] text-[11px]">
                  <th className="px-4 py-3 font-semibold">Supply Type</th>
                  <th className="px-4 py-3 font-semibold">Place of Supply (POS)</th>
                  <th className="px-4 py-3 font-semibold text-center">Type</th>
                  <th className="px-4 py-3 font-semibold text-right">Tax Rate (%)</th>
                  <th className="px-4 py-3 font-semibold text-right">Taxable Value (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">IGST (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">CGST (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">SGST (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">Cess (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3EE]">
                {(!gstr1QuarterlyPayload.b2cs || gstr1QuarterlyPayload.b2cs.length === 0) &&
                computedB2cs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-[#738276]">
                      No B2CS supplies found for this period. Click &quot;Upload Amazon / Meesho&quot; to import seller reports.
                    </td>
                  </tr>
                ) : (
                  (gstr1QuarterlyPayload.b2cs || []).map((row, idx) => (
                    <tr key={`b2cs-${row.pos}-${row.rt}-${idx}`} className="hover:bg-[#FAFBF9] transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            row.sply_ty === 'INTER'
                              ? 'bg-[#EBF5FB] text-[#2980B9]'
                              : 'bg-[#EAFAF1] text-[#27AE60]'
                          }`}
                        >
                          {row.sply_ty}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#1A2E25]">
                        <span className="font-mono font-bold text-[#2D4A3E] mr-1.5">{row.pos}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#F1F4EE] text-[#2D4A3E]">
                          {row.typ || 'OE'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#1A2E25]">{row.rt}%</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#1A2E25]">
                        {formatCurrency(row.txval)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#8DA173]">
                        {row.iamt ? formatCurrency(row.iamt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#2D4A3E]">
                        {row.camt ? formatCurrency(row.camt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#2D4A3E]">
                        {row.samt ? formatCurrency(row.samt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#738276]">{row.csamt || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {gstr1QuarterlyPayload.b2cs && gstr1QuarterlyPayload.b2cs.length > 0 && (
                <tfoot className="bg-[#FAFBF9] font-bold text-[#1A2E25] border-t-2 border-[#E0E4DE]">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-right">
                      Quarterly Total:
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatCurrency(gstr1QuarterlyPayload.b2cs.reduce((s, i) => s + i.txval, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#8DA173]">
                      {formatCurrency(gstr1QuarterlyPayload.b2cs.reduce((s, i) => s + (i.iamt || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatCurrency(gstr1QuarterlyPayload.b2cs.reduce((s, i) => s + (i.camt || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatCurrency(gstr1QuarterlyPayload.b2cs.reduce((s, i) => s + (i.samt || 0), 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#738276]">0</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: HSN SUMMARY (TABLE 12) */}
      {activeSubView === 'hsn' && (
        <div className="bg-white rounded-2xl border border-[#E0E4DE] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E0E4DE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FDFDFC]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1A2E25]">Table 12: HSN/SAC Summary of Outward Supplies</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EDF3EF] text-[#2D4A3E] font-bold">
                  {filingFrequency === 'QUARTERLY' ? 'hsn_b2c Schema' : 'Standard Schema'}
                </span>
              </div>
              <p className="text-xs text-[#738276] mt-0.5">
                Statutory requirement under Rule 46. In Quarterly Mode, structured under <code>hsn.hsn_b2c</code> with sequence numbers, rate, and exact tax components.
              </p>
            </div>
            <span className="text-xs font-bold text-[#2D4A3E] bg-[#EDF3EF] px-3 py-1 rounded-lg">
              Total HSN Codes: {gstr1QuarterlyPayload.hsn?.hsn_b2c?.length || computedHsn.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFBF9] text-[#56655A] border-b border-[#E0E4DE] text-[11px]">
                  <th className="px-4 py-3 font-semibold text-center">#</th>
                  <th className="px-4 py-3 font-semibold">HSN/SAC Code</th>
                  <th className="px-4 py-3 font-semibold text-center">UQC</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Qty</th>
                  <th className="px-4 py-3 font-semibold text-right">Tax Rate (%)</th>
                  <th className="px-4 py-3 font-semibold text-right">Taxable Value (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">IGST (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">SGST (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">CGST (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">Cess (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3EE]">
                {(!gstr1QuarterlyPayload.hsn?.hsn_b2c || gstr1QuarterlyPayload.hsn.hsn_b2c.length === 0) &&
                computedHsn.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-[#738276]">
                      No HSN summary data found. Click &quot;Upload HSN Summary&quot; to import your report.
                    </td>
                  </tr>
                ) : (
                  (gstr1QuarterlyPayload.hsn?.hsn_b2c || []).map((h) => (
                    <tr key={`hsn-${h.num}-${h.hsn_sc}`} className="hover:bg-[#FAFBF9] transition-colors">
                      <td className="px-4 py-3 text-center font-mono text-[#738276]">{h.num}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#1A2E25]">{h.hsn_sc}</td>
                      <td className="px-4 py-3 text-center font-mono text-[#56655A]">{h.uqc}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#1A2E25]">{h.qty}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#1A2E25]">{h.rt}%</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#1A2E25]">
                        {formatCurrency(h.txval)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#8DA173]">{formatCurrency(h.iamt)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#2D4A3E]">{formatCurrency(h.samt)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#2D4A3E]">{formatCurrency(h.camt)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#738276]">{h.csamt || 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {gstr1QuarterlyPayload.hsn?.hsn_b2c && gstr1QuarterlyPayload.hsn.hsn_b2c.length > 0 && (
                <tfoot className="bg-[#FAFBF9] font-bold text-[#1A2E25] border-t-2 border-[#E0E4DE]">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {gstr1QuarterlyPayload.hsn.hsn_b2c.reduce((s, i) => s + i.qty, 0)}
                    </td>
                    <td className="px-4 py-3"></td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatCurrency(gstr1QuarterlyPayload.hsn.hsn_b2c.reduce((s, i) => s + i.txval, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#8DA173]">
                      {formatCurrency(gstr1QuarterlyPayload.hsn.hsn_b2c.reduce((s, i) => s + i.iamt, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatCurrency(gstr1QuarterlyPayload.hsn.hsn_b2c.reduce((s, i) => s + i.samt, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {formatCurrency(gstr1QuarterlyPayload.hsn.hsn_b2c.reduce((s, i) => s + i.camt, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-[#738276]">0</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: SUPECO (TABLE 14/15) - E-COMMERCE OPERATOR SUPPLIES */}
      {activeSubView === 'supeco' && (
        <div className="bg-white rounded-2xl border border-[#E0E4DE] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E0E4DE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FDFDFC]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1A2E25]">Table 14 &amp; 15: SUPECO Supplies (E-Commerce Operator TCS)</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EDF3EF] text-[#2D4A3E] font-bold">
                  Section 52 CGST Act
                </span>
              </div>
              <p className="text-xs text-[#738276] mt-0.5">
                Supplies made through electronic commerce operators (ECO) liable to collect tax at source under Section 52 (TCS). Reported in the <code>supeco.clttx</code> block of Quarterly JSON.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#2D4A3E] bg-[#EDF3EF] px-3 py-1 rounded-lg">
                ECO GSTIN: {ecoGstin}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="border border-[#E0E4DE] rounded-xl overflow-hidden mb-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#FAFBF9] text-[#56655A] border-b border-[#E0E4DE] text-[11px]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ECO GSTIN (ETIN)</th>
                    <th className="px-4 py-3 font-semibold">Operator Name</th>
                    <th className="px-4 py-3 font-semibold text-right">Total Net Supplies (₹)</th>
                    <th className="px-4 py-3 font-semibold text-right">IGST (₹)</th>
                    <th className="px-4 py-3 font-semibold text-right">CGST (₹)</th>
                    <th className="px-4 py-3 font-semibold text-right">SGST (₹)</th>
                    <th className="px-4 py-3 font-semibold text-right">Cess (₹)</th>
                    <th className="px-4 py-3 font-semibold text-center">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {gstr1QuarterlyPayload.supeco?.clttx.map((item, idx) => (
                    <tr key={`supeco-${idx}`} className="hover:bg-[#FAFBF9]">
                      <td className="px-4 py-3 font-mono font-bold text-[#2D4A3E]">{item.etin}</td>
                      <td className="px-4 py-3 text-[#1A2E25]">
                        {item.etin === '07AARCM9332R1CQ'
                          ? 'Meesho (Fashnear Technologies)'
                          : item.etin === '07AAACA6602R1ZT'
                          ? 'Amazon Seller Services Pvt Ltd'
                          : item.etin === '29AAACF9005F1Z5'
                          ? 'Flipkart Internet Pvt Ltd'
                          : 'E-Commerce Operator'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#1A2E25]">
                        {formatCurrency(item.suppval)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#8DA173]">{formatCurrency(item.igst)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#2D4A3E]">{formatCurrency(item.cgst)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#2D4A3E]">{formatCurrency(item.sgst)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#738276]">{item.cess}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EDF3EF] text-[#2D4A3E]">
                          {item.flag}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-[#FAFBF9] rounded-xl p-4 border border-[#E0E4DE] text-xs text-[#56655A] flex items-start gap-3">
              <Info className="w-4 h-4 text-[#8DA173] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-[#1A2E25] mb-0.5">About Section 52 TCS Reporting</h4>
                <p>
                  As an online seller on marketplaces like Meesho, Amazon, or Flipkart, your quarterly outward supplies must reconcile with the TCS credit statement filed by the marketplace under Section 52. The GST portal matches the operator GSTIN (ETIN) and turnover values automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: DOCUMENT ISSUE & CREDIT NOTES (TABLE 13) */}
      {activeSubView === 'doc_issue' && (
        <div className="bg-white rounded-2xl border border-[#E0E4DE] shadow-xs p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#1A2E25]">Table 13: Documents &amp; Credit Notes Issued</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EDF3EF] text-[#2D4A3E] font-bold">
                  Statutory Series Tracking
                </span>
              </div>
              <p className="text-xs text-[#738276] mt-0.5">
                Serial number ranges of tax invoices (doc_num 1) and credit notes / customer returns (doc_num 5).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingDocs(!isEditingDocs)}
                className="px-3 py-1.5 bg-white border border-[#D5E2D9] hover:bg-[#F7F8F6] text-[#2D4A3E] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingDocs ? 'Done Editing' : 'Customize Doc Series'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Outward Supply Invoices */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2E25] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#8DA173]" />
                  1. Invoices for Outward Supply (doc_num: 1)
                </h4>
                {isEditingDocs && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextNum = customOutwardDocs.length + 1;
                      setCustomOutwardDocs([
                        ...customOutwardDocs,
                        {
                          num: nextNum,
                          from: `emxmd${264531 + nextNum * 100}`,
                          to: `emxmd${264531 + (nextNum + 1) * 100}`,
                          totnum: 100,
                          cancel: 0,
                          net_issue: 100,
                        },
                      ]);
                    }}
                    className="text-[11px] text-[#2D4A3E] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Batch
                  </button>
                )}
              </div>

              <div className="border border-[#E0E4DE] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#FAFBF9] text-[#56655A] border-b border-[#E0E4DE] text-[11px]">
                    <tr>
                      <th className="px-4 py-2.5 text-center w-12">#</th>
                      <th className="px-4 py-2.5">Sr. No. From</th>
                      <th className="px-4 py-2.5">Sr. No. To</th>
                      <th className="px-4 py-2.5 text-right">Total Number</th>
                      <th className="px-4 py-2.5 text-right">Cancelled</th>
                      <th className="px-4 py-2.5 text-right font-bold">Net Issued</th>
                      {isEditingDocs && <th className="px-4 py-2.5 text-center w-16">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F3EE]">
                    {customOutwardDocs.map((doc, idx) => (
                      <tr key={`outward-${idx}`}>
                        <td className="px-4 py-2.5 text-center font-mono text-[#738276]">{doc.num}</td>
                        <td className="px-4 py-2.5 font-mono text-[#2D4A3E]">
                          {isEditingDocs ? (
                            <input
                              type="text"
                              value={doc.from}
                              onChange={(e) => {
                                const copy = [...customOutwardDocs];
                                copy[idx].from = e.target.value;
                                setCustomOutwardDocs(copy);
                              }}
                              className="px-2 py-1 bg-white border border-[#D5E2D9] rounded font-mono text-xs w-36"
                            />
                          ) : (
                            doc.from
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[#2D4A3E]">
                          {isEditingDocs ? (
                            <input
                              type="text"
                              value={doc.to}
                              onChange={(e) => {
                                const copy = [...customOutwardDocs];
                                copy[idx].to = e.target.value;
                                setCustomOutwardDocs(copy);
                              }}
                              className="px-2 py-1 bg-white border border-[#D5E2D9] rounded font-mono text-xs w-36"
                            />
                          ) : (
                            doc.to
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-[#1A2E25]">
                          {isEditingDocs ? (
                            <input
                              type="number"
                              value={doc.totnum}
                              onChange={(e) => {
                                const copy = [...customOutwardDocs];
                                const val = parseInt(e.target.value, 10) || 0;
                                copy[idx].totnum = val;
                                copy[idx].net_issue = val - (copy[idx].cancel || 0);
                                setCustomOutwardDocs(copy);
                              }}
                              className="px-2 py-1 bg-white border border-[#D5E2D9] rounded font-mono text-xs w-20 text-right"
                            />
                          ) : (
                            doc.totnum
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[#738276]">{doc.cancel || 0}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-[#8DA173]">
                          {doc.net_issue}
                        </td>
                        {isEditingDocs && (
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomOutwardDocs(customOutwardDocs.filter((_, i) => i !== idx));
                              }}
                              className="text-[#E74C3C] hover:text-[#C0392B] p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Credit Notes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1A2E25] flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-[#D9A14E]" />
                  2. Credit Notes / Return Series (doc_num: 5)
                </h4>
                {isEditingDocs && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextNum = customCreditDocs.length + 1;
                      setCustomCreditDocs([
                        ...customCreditDocs,
                        {
                          num: nextNum,
                          from: `emxmd27C${nextNum * 100}`,
                          to: `emxmd27C${(nextNum + 1) * 100}`,
                          totnum: 100,
                          cancel: 0,
                          net_issue: 100,
                        },
                      ]);
                    }}
                    className="text-[11px] text-[#2D4A3E] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add CN Batch
                  </button>
                )}
              </div>

              <div className="border border-[#E0E4DE] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#FAFBF9] text-[#56655A] border-b border-[#E0E4DE] text-[11px]">
                    <tr>
                      <th className="px-4 py-2.5 text-center w-12">#</th>
                      <th className="px-4 py-2.5">Sr. No. From</th>
                      <th className="px-4 py-2.5">Sr. No. To</th>
                      <th className="px-4 py-2.5 text-right">Total Number</th>
                      <th className="px-4 py-2.5 text-right">Cancelled</th>
                      <th className="px-4 py-2.5 text-right font-bold">Net Issued</th>
                      {isEditingDocs && <th className="px-4 py-2.5 text-center w-16">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F3EE]">
                    {customCreditDocs.map((doc, idx) => (
                      <tr key={`cn-${idx}`}>
                        <td className="px-4 py-2.5 text-center font-mono text-[#738276]">{doc.num}</td>
                        <td className="px-4 py-2.5 font-mono text-[#2D4A3E]">
                          {isEditingDocs ? (
                            <input
                              type="text"
                              value={doc.from}
                              onChange={(e) => {
                                const copy = [...customCreditDocs];
                                copy[idx].from = e.target.value;
                                setCustomCreditDocs(copy);
                              }}
                              className="px-2 py-1 bg-white border border-[#D5E2D9] rounded font-mono text-xs w-36"
                            />
                          ) : (
                            doc.from
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-[#2D4A3E]">
                          {isEditingDocs ? (
                            <input
                              type="text"
                              value={doc.to}
                              onChange={(e) => {
                                const copy = [...customCreditDocs];
                                copy[idx].to = e.target.value;
                                setCustomCreditDocs(copy);
                              }}
                              className="px-2 py-1 bg-white border border-[#D5E2D9] rounded font-mono text-xs w-36"
                            />
                          ) : (
                            doc.to
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-[#1A2E25]">
                          {isEditingDocs ? (
                            <input
                              type="number"
                              value={doc.totnum}
                              onChange={(e) => {
                                const copy = [...customCreditDocs];
                                const val = parseInt(e.target.value, 10) || 0;
                                copy[idx].totnum = val;
                                copy[idx].net_issue = val - (copy[idx].cancel || 0);
                                setCustomCreditDocs(copy);
                              }}
                              className="px-2 py-1 bg-white border border-[#D5E2D9] rounded font-mono text-xs w-20 text-right"
                            />
                          ) : (
                            doc.totnum
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-[#738276]">{doc.cancel || 0}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-[#D9A14E]">
                          {doc.net_issue}
                        </td>
                        {isEditingDocs && (
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomCreditDocs(customCreditDocs.filter((_, i) => i !== idx));
                              }}
                              className="text-[#E74C3C] hover:text-[#C0392B] p-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: B2B INVOICES (TABLE 4A) */}
      {activeSubView === 'b2b' && (
        <div className="bg-white rounded-2xl border border-[#E0E4DE] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E0E4DE] flex items-center justify-between bg-[#FDFDFC]">
            <div>
              <h3 className="text-sm font-bold text-[#1A2E25]">Table 4A: Taxable Outward Supplies to Registered Persons (B2B)</h3>
              <p className="text-xs text-[#738276] mt-0.5">
                Counterparty GSTIN invoices where recipient will claim Input Tax Credit (ITC).
              </p>
            </div>
            <span className="text-xs font-bold text-[#2D4A3E] bg-[#EDF3EF] px-3 py-1 rounded-lg">
              {b2bInvoices.length} Invoices
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAFBF9] text-[#56655A] border-b border-[#E0E4DE] text-[11px]">
                  <th className="px-4 py-3 font-semibold">Recipient GSTIN</th>
                  <th className="px-4 py-3 font-semibold">Customer Name</th>
                  <th className="px-4 py-3 font-semibold">Invoice No</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">POS</th>
                  <th className="px-4 py-3 font-semibold text-right">Taxable Value (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Tax (₹)</th>
                  <th className="px-4 py-3 font-semibold text-right">Invoice Value (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3EE]">
                {b2bInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#738276]">
                      No B2B invoices in this period. (All supplies are B2C retail/e-commerce).
                    </td>
                  </tr>
                ) : (
                  b2bInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-[#FAFBF9] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#2D4A3E]">{inv.gstin}</td>
                      <td className="px-4 py-3 font-medium text-[#1A2E25]">{inv.vendorName || 'Customer'}</td>
                      <td className="px-4 py-3 font-mono font-bold text-[#1A2E25]">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-[#56655A]">{inv.invoiceDate}</td>
                      <td className="px-4 py-3 font-mono">{inv.placeOfSupply?.slice(0, 2) || '07'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#1A2E25]">{formatCurrency(inv.taxableValue)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#8DA173]">{formatCurrency(inv.totalTax)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-[#1A2E25]">{formatCurrency(inv.invoiceValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: OFFICIAL GSTR-1 JSON PREVIEW */}
      {activeSubView === 'json_preview' && (
        <div className="bg-white rounded-2xl border border-[#E0E4DE] shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#E0E4DE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#FAFBF9]">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-[#1A2E25]">
                  {previewFormat === 'QUARTERLY'
                    ? 'Official Quarterly GSTR-1 JSON Payload (GST3.1.6)'
                    : 'Official Monthly GSTR-1 JSON Payload (GST3.2)'}
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EDF3EF] text-[#2D4A3E] font-bold">
                  {previewFormat === 'QUARTERLY'
                    ? 'QRMP / E-Commerce Specific Schema'
                    : 'Matches Offline Tool v3.2'}
                </span>
              </div>
              <p className="text-xs text-[#738276] mt-0.5">
                Directly uploadable to GST Portal (https://services.gst.gov.in &gt; Returns Dashboard &gt; GSTR-1 &gt; Prepare Offline).
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Preview Format Switcher */}
              <div className="inline-flex p-1 bg-[#F1F4EE] rounded-lg border border-[#D5E2D9]">
                <button
                  type="button"
                  onClick={() => setPreviewFormat('QUARTERLY')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    previewFormat === 'QUARTERLY'
                      ? 'bg-[#2D4A3E] text-white shadow-2xs'
                      : 'text-[#56655A] hover:text-[#1A2E25]'
                  }`}
                >
                  Quarterly (GST3.1.6)
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFormat('MONTHLY')}
                  className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                    previewFormat === 'MONTHLY'
                      ? 'bg-[#2D4A3E] text-white shadow-2xs'
                      : 'text-[#56655A] hover:text-[#1A2E25]'
                  }`}
                >
                  Monthly (GST3.2)
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3 py-1.5 bg-white hover:bg-[#F7F8F6] border border-[#D5E2D9] text-[#2D4A3E] rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#8DA173]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied JSON!' : 'Copy JSON'}</span>
              </button>

              <button
                type="button"
                onClick={previewFormat === 'QUARTERLY' ? handleDownloadQuarterlyJson : handleDownloadMonthlyJson}
                className="px-3.5 py-1.5 bg-[#2D4A3E] hover:bg-[#1A2E25] text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>
                  {previewFormat === 'QUARTERLY' ? 'Download Quarterly .json' : 'Download Monthly .json'}
                </span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-[#141F1A] text-[#8DA173] font-mono text-xs overflow-x-auto max-h-[520px] select-all">
            <pre className="text-[11px] leading-relaxed">
              {JSON.stringify(
                previewFormat === 'QUARTERLY' ? gstr1QuarterlyPayload : gstr1Payload,
                null,
                2
              )}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
