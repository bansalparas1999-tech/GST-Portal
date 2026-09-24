import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Trash2,
  FileSpreadsheet,
  Building,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Receipt,
  Scale,
  Sparkles,
  Calculator,
  Layers,
} from 'lucide-react';
import {
  InvoiceRecord,
  SalesInvoiceRecord,
  BankTransaction,
  BankTransactionCategory,
  Language,
} from '../types';

export type InvoiceEditorMode =
  | 'edit_purchase_books'
  | 'add_purchase_books'
  | 'edit_purchase_2b'
  | 'add_purchase_2b'
  | 'edit_sales'
  | 'add_sales'
  | 'edit_bank'
  | 'add_bank';

interface InvoiceEditorModalProps {
  isOpen: boolean;
  mode: InvoiceEditorMode;
  initialPurchase?: InvoiceRecord | null;
  initialSale?: SalesInvoiceRecord | null;
  initialBank?: BankTransaction | null;
  companyGstin?: string;
  selectedPeriod?: string;
  language: Language;
  onClose: () => void;
  onSavePurchase?: (invoice: InvoiceRecord, isNew: boolean) => void;
  onSaveSale?: (sale: SalesInvoiceRecord, isNew: boolean) => void;
  onSaveBank?: (bankTxn: BankTransaction, isNew: boolean) => void;
  onDeletePurchase?: (id: string, source: 'books' | 'gstr2b') => void;
  onDeleteSale?: (id: string) => void;
  onDeleteBank?: (id: string) => void;
}

export const InvoiceEditorModal: React.FC<InvoiceEditorModalProps> = ({
  isOpen,
  mode,
  initialPurchase,
  initialSale,
  initialBank,
  companyGstin = '27AABCA1234F1Z8',
  selectedPeriod = 'FY 2024-25',
  language,
  onClose,
  onSavePurchase,
  onSaveSale,
  onSaveBank,
  onDeletePurchase,
  onDeleteSale,
  onDeleteBank,
}) => {
  // Form fields for Purchase & Sales
  const [partyGstin, setPartyGstin] = useState('');
  const [partyName, setPartyName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [taxableValue, setTaxableValue] = useState<number>(0);
  const [gstRate, setGstRate] = useState<number>(18);
  const [igst, setIgst] = useState<number>(0);
  const [cgst, setCgst] = useState<number>(0);
  const [sgst, setSgst] = useState<number>(0);
  const [cess, setCess] = useState<number>(0);
  const [totalInvoiceValue, setTotalInvoiceValue] = useState<number>(0);
  const [placeOfSupply, setPlaceOfSupply] = useState('27-Maharashtra');
  const [reverseCharge, setReverseCharge] = useState(false);
  const [itcAvailable, setItcAvailable] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'UNPAID' | 'PARTIALLY_PAID'>('UNPAID');
  const [notes, setNotes] = useState('');

  // Form fields for Bank Transaction
  const [bankDate, setBankDate] = useState(new Date().toISOString().slice(0, 10));
  const [narration, setNarration] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [withdrawal, setWithdrawal] = useState<number>(0);
  const [deposit, setDeposit] = useState<number>(0);
  const [runningBalance, setRunningBalance] = useState<number>(0);
  const [category, setCategory] = useState<BankTransactionCategory>('VENDOR_PAYMENT');

  const [errorMsg, setErrorMsg] = useState('');

  // Populate data when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');

    if (mode.includes('purchase')) {
      if (initialPurchase) {
        setPartyGstin(initialPurchase.gstin || '');
        setPartyName(initialPurchase.vendorName || '');
        setInvoiceNumber(initialPurchase.invoiceNumber || '');
        setInvoiceDate(initialPurchase.invoiceDate || new Date().toISOString().slice(0, 10));
        setTaxableValue(initialPurchase.taxableValue || 0);
        setIgst(initialPurchase.igst || 0);
        setCgst(initialPurchase.cgst || 0);
        setSgst(initialPurchase.sgst || 0);
        setCess(initialPurchase.cess || 0);
        setTotalInvoiceValue(initialPurchase.invoiceValue || 0);
        setPlaceOfSupply(initialPurchase.placeOfSupply || '27-Maharashtra');
        setReverseCharge(!!initialPurchase.reverseCharge);
        setItcAvailable(initialPurchase.itcAvailable !== false);
        setNotes(initialPurchase.notes || '');

        // Determine rate
        const totalTax = initialPurchase.totalTax || initialPurchase.igst + initialPurchase.cgst + initialPurchase.sgst;
        if (initialPurchase.taxableValue > 0 && totalTax > 0) {
          const calculatedRate = Math.round((totalTax / initialPurchase.taxableValue) * 100);
          setGstRate([0, 5, 12, 18, 28].includes(calculatedRate) ? calculatedRate : 18);
        }
      } else {
        // Reset for Add
        setPartyGstin('');
        setPartyName('');
        setInvoiceNumber(`INV-${Date.now().toString().slice(-5)}`);
        setInvoiceDate(new Date().toISOString().slice(0, 10));
        setTaxableValue(100000);
        setGstRate(18);
        recalcTaxes(100000, 18, '27AABCA1234F1Z8', companyGstin);
        setPlaceOfSupply('27-Maharashtra');
        setReverseCharge(false);
        setItcAvailable(true);
        setNotes('');
      }
    } else if (mode.includes('sales')) {
      if (initialSale) {
        setPartyGstin(initialSale.gstin || 'URP');
        setPartyName(initialSale.customerName || '');
        setInvoiceNumber(initialSale.invoiceNumber || '');
        setInvoiceDate(initialSale.invoiceDate || new Date().toISOString().slice(0, 10));
        setTaxableValue(initialSale.taxableValue || 0);
        setIgst(initialSale.igst || 0);
        setCgst(initialSale.cgst || 0);
        setSgst(initialSale.sgst || 0);
        setCess(initialSale.cess || 0);
        setTotalInvoiceValue(initialSale.invoiceValue || 0);
        setPaymentStatus(initialSale.paymentStatus || 'UNPAID');
        setPlaceOfSupply(initialSale.placeOfSupply || '27-Maharashtra');
        setNotes(initialSale.notes || '');
      } else {
        setPartyGstin('URP');
        setPartyName('');
        setInvoiceNumber(`OUT-${Date.now().toString().slice(-4)}`);
        setInvoiceDate(new Date().toISOString().slice(0, 10));
        setTaxableValue(100000);
        setGstRate(18);
        recalcTaxes(100000, 18, 'URP', companyGstin);
        setPaymentStatus('UNPAID');
        setNotes('');
      }
    } else if (mode.includes('bank')) {
      if (initialBank) {
        setBankDate(initialBank.date || new Date().toISOString().slice(0, 10));
        setNarration(initialBank.narration || '');
        setReferenceNo(initialBank.referenceNo || '');
        setWithdrawal(initialBank.withdrawal || 0);
        setDeposit(initialBank.deposit || 0);
        setRunningBalance(initialBank.balance || 0);
        setCategory(initialBank.category || 'VENDOR_PAYMENT');
        setPartyName(initialBank.partyName || '');
        setPartyGstin(initialBank.partyGstin || '');
      } else {
        setBankDate(new Date().toISOString().slice(0, 10));
        setNarration('');
        setReferenceNo(`REF-${Date.now().toString().slice(-6)}`);
        setWithdrawal(0);
        setDeposit(0);
        setRunningBalance(1000000);
        setCategory('VENDOR_PAYMENT');
        setPartyName('');
        setPartyGstin('');
      }
    }
  }, [isOpen, mode, initialPurchase, initialSale, initialBank, companyGstin]);

  // Recalculate Taxes based on Taxable Value & GST Rate
  const recalcTaxes = (
    taxable: number,
    rate: number,
    targetGstin: string,
    myGstin: string
  ) => {
    const totalTax = (taxable * rate) / 100;
    const isInterstate =
      targetGstin.length >= 2 &&
      myGstin.length >= 2 &&
      targetGstin !== 'URP' &&
      targetGstin.slice(0, 2) !== myGstin.slice(0, 2);

    if (isInterstate) {
      setIgst(totalTax);
      setCgst(0);
      setSgst(0);
    } else {
      setIgst(0);
      setCgst(totalTax / 2);
      setSgst(totalTax / 2);
    }
    setTotalInvoiceValue(taxable + totalTax + cess);
  };

  const handleTaxableChange = (val: number) => {
    setTaxableValue(val);
    recalcTaxes(val, gstRate, partyGstin, companyGstin);
  };

  const handleGstRateChange = (rate: number) => {
    setGstRate(rate);
    recalcTaxes(taxableValue, rate, partyGstin, companyGstin);
  };

  const handleGstinChange = (g: string) => {
    const formatted = g.toUpperCase().replace(/\s+/g, '');
    setPartyGstin(formatted);
    recalcTaxes(taxableValue, gstRate, formatted, companyGstin);
  };

  if (!isOpen) return null;

  const isPurchaseMode = mode.includes('purchase');
  const isSalesMode = mode.includes('sales');
  const isBankMode = mode.includes('bank');
  const isNew = mode.startsWith('add');

  const title = isPurchaseMode
    ? isNew
      ? mode.includes('2b')
        ? 'Add GSTR-2B Inward Invoice'
        : 'Add Purchase Invoice (Books)'
      : mode.includes('2b')
      ? 'Edit GSTR-2B Inward Record'
      : 'Edit Purchase Invoice (Books)'
    : isSalesMode
    ? isNew
      ? 'Add Outward Sales Invoice'
      : 'Edit Sales Invoice'
    : isNew
    ? 'Add Bank Transaction Voucher'
    : 'Edit Bank Transaction';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isPurchaseMode) {
      if (!partyName.trim()) {
        setErrorMsg('Supplier / Vendor Name is required.');
        return;
      }
      if (!invoiceNumber.trim()) {
        setErrorMsg('Invoice Number is required.');
        return;
      }
      if (taxableValue < 0) {
        setErrorMsg('Taxable Value cannot be negative.');
        return;
      }

      const totalTax = igst + cgst + sgst + cess;
      const finalGross = taxableValue + totalTax;

      const record: InvoiceRecord = {
        id: initialPurchase?.id || `pb-manual-${Date.now()}`,
        source: mode.includes('2b') ? 'gstr2b' : 'books',
        gstin: partyGstin.trim().toUpperCase() || 'URP',
        vendorName: partyName.trim(),
        invoiceNumber: invoiceNumber.trim(),
        rawInvoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        invoiceType: 'B2B',
        taxableValue,
        igst,
        cgst,
        sgst,
        cess,
        totalTax,
        invoiceValue: finalGross,
        placeOfSupply,
        reverseCharge,
        itcAvailable,
        financialYear: selectedPeriod,
        notes: notes.trim() || undefined,
      };

      if (onSavePurchase) {
        onSavePurchase(record, isNew);
      }
      onClose();
    } else if (isSalesMode) {
      if (!partyName.trim()) {
        setErrorMsg('Customer Name is required.');
        return;
      }
      if (!invoiceNumber.trim()) {
        setErrorMsg('Invoice Number is required.');
        return;
      }

      const totalTax = igst + cgst + sgst + cess;
      const finalGross = taxableValue + totalTax;

      const record: SalesInvoiceRecord = {
        id: initialSale?.id || `sale-manual-${Date.now()}`,
        gstin: partyGstin.trim().toUpperCase() || 'URP',
        customerName: partyName.trim(),
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        taxableValue,
        igst,
        cgst,
        sgst,
        cess,
        totalTax,
        invoiceValue: finalGross,
        placeOfSupply,
        financialYear: '2024-25',
        taxPeriod: selectedPeriod,
        paymentStatus,
        receivedAmount: paymentStatus === 'PAID' ? finalGross : 0,
        outstandingAmount: paymentStatus === 'PAID' ? 0 : finalGross,
        notes: notes.trim() || undefined,
      };

      if (onSaveSale) {
        onSaveSale(record, isNew);
      }
      onClose();
    } else if (isBankMode) {
      if (!narration.trim()) {
        setErrorMsg('Narration / Description is required.');
        return;
      }
      if (withdrawal <= 0 && deposit <= 0) {
        setErrorMsg('Please specify either a Withdrawal (Debit) or Deposit (Credit) amount.');
        return;
      }

      const record: BankTransaction = {
        id: initialBank?.id || `bank-manual-${Date.now()}`,
        date: bankDate,
        narration: narration.trim(),
        referenceNo: referenceNo.trim() || `REF-${Date.now().toString().slice(-6)}`,
        withdrawal: Number(withdrawal) || 0,
        deposit: Number(deposit) || 0,
        balance: Number(runningBalance) || 0,
        category,
        partyName: partyName.trim() || undefined,
        partyGstin: partyGstin.trim().toUpperCase() || undefined,
      };

      if (onSaveBank) {
        onSaveBank(record, isNew);
      }
      onClose();
    }
  };

  const handleDelete = () => {
    if (!window.confirm('Are you sure you want to delete this transaction record? All ledgers and trial balance will recompute.')) {
      return;
    }
    if (isPurchaseMode && initialPurchase && onDeletePurchase) {
      onDeletePurchase(initialPurchase.id, initialPurchase.source);
    } else if (isSalesMode && initialSale && onDeleteSale) {
      onDeleteSale(initialSale.id);
    } else if (isBankMode && initialBank && onDeleteBank) {
      onDeleteBank(initialBank.id);
    }
    onClose();
  };

  return (
    <div
      id="invoice-editor-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
    >
      <div
        id="invoice-editor-modal-card"
        className="bg-white w-full max-w-3xl rounded-3xl border border-[#E0E4DE] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] my-auto"
      >
        {/* Header */}
        <div className="bg-[#2D4A3E] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8DA173] flex items-center justify-center font-bold text-white shadow-xs">
              {isBankMode ? (
                <Scale className="w-5 h-5" />
              ) : isSalesMode ? (
                <DollarSign className="w-5 h-5" />
              ) : (
                <FileSpreadsheet className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">{title}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#3D5C4F] text-[#8DA173]">
                  {isNew ? 'New Entry' : 'Live Recalculation'}
                </span>
              </div>
              <p className="text-xs text-[#D3DCD6] mt-0.5">
                {isBankMode
                  ? 'Posts double-entry cash vouchers to GL and updates Party Balances automatically.'
                  : 'Updating values will instantly recalculate reconciliations, GST gap analytics, and Trial Balance.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#D3DCD6] hover:text-white rounded-lg hover:bg-[#3D5C4F] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-[#FFF2F0] border-b border-[#F5C2BC] px-6 py-3 text-xs text-[#C75D4E] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* PURCHASE & SALES INVOICE FORM */}
          {(isPurchaseMode || isSalesMode) && (
            <div className="space-y-4">
              {/* Party Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#1A2E25] mb-1">
                    {isSalesMode ? 'Customer / Buyer Name *' : 'Supplier / Vendor Trade Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    placeholder={isSalesMode ? 'e.g. Reliance Retail Ventures' : 'e.g. Tata Steel Limited'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] focus:outline-none focus:ring-2 focus:ring-[#8DA173] text-xs font-semibold text-[#1A2E25]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A2E25] mb-1">
                    {isSalesMode ? 'Customer GSTIN (or URP)' : 'Supplier 15-Digit GSTIN *'}
                  </label>
                  <input
                    type="text"
                    value={partyGstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="e.g. 27AABCT3518Q1ZV"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] focus:outline-none focus:ring-2 focus:ring-[#8DA173] text-xs font-mono font-bold text-[#2D4A3E]"
                  />
                </div>
              </div>

              {/* Invoice Number & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-[#1A2E25] mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. TSL/2024/0981"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] focus:outline-none focus:ring-2 focus:ring-[#8DA173] text-xs font-mono font-bold text-[#1A2E25]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A2E25] mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] focus:outline-none focus:ring-2 focus:ring-[#8DA173] text-xs font-mono text-[#1A2E25]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A2E25] mb-1">Place of Supply</label>
                  <input
                    type="text"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    placeholder="27-Maharashtra"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] focus:outline-none focus:ring-2 focus:ring-[#8DA173] text-xs font-semibold text-[#1A2E25]"
                  />
                </div>
              </div>

              {/* Tax Calculations */}
              <div className="bg-[#F7F8F6] p-4 rounded-2xl border border-[#E0E4DE] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1A2E25] flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-[#8DA173]" />
                    Taxable Base & GST Computation Engine
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-[#738276]">Quick Rate:</span>
                    {[0, 5, 12, 18, 28].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleGstRateChange(r)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer transition-all ${
                          gstRate === r
                            ? 'bg-[#2D4A3E] text-white shadow-xs'
                            : 'bg-white text-[#56655A] border border-[#D5E2D9] hover:bg-[#EDF3EF]'
                        }`}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-[#1A2E25] mb-1">Taxable Value (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={taxableValue}
                      onChange={(e) => handleTaxableChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-[#D5E2D9] bg-white text-xs font-mono font-bold text-[#1A2E25]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2D4A3E] mb-1">IGST (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={igst}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setIgst(val);
                        setTotalInvoiceValue(taxableValue + val + cgst + sgst + cess);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#D5E2D9] bg-white text-xs font-mono font-bold text-[#2D4A3E]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2D4A3E] mb-1">CGST (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cgst}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setCgst(val);
                        setTotalInvoiceValue(taxableValue + igst + val + sgst + cess);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#D5E2D9] bg-white text-xs font-mono font-bold text-[#2D4A3E]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#2D4A3E] mb-1">SGST (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={sgst}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setSgst(val);
                        setTotalInvoiceValue(taxableValue + igst + cgst + val + cess);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-[#D5E2D9] bg-white text-xs font-mono font-bold text-[#2D4A3E]"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E0E4DE] flex items-center justify-between">
                  <div className="text-xs text-[#738276]">
                    Total Tax: <strong className="text-[#2D4A3E]">₹{(igst + cgst + sgst + cess).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="text-sm font-black text-[#1A2E25]">
                    Gross Invoice Total: <span className="font-mono text-[#2D4A3E]">₹{totalInvoiceValue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Status & Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {isSalesMode ? (
                  <div>
                    <label className="block font-bold text-[#1A2E25] mb-1">Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2 rounded-xl border border-[#D5E2D9] text-xs font-semibold text-[#1A2E25] bg-white"
                    >
                      <option value="UNPAID">UNPAID (Debtor Receivable)</option>
                      <option value="PAID">PAID (Settled in Bank/Cash)</option>
                      <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-6 pt-3">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#1A2E25]">
                      <input
                        type="checkbox"
                        checked={itcAvailable}
                        onChange={(e) => setItcAvailable(e.target.checked)}
                        className="rounded border-[#D5E2D9] text-[#2D4A3E] focus:ring-[#8DA173]"
                      />
                      <span>Eligible for ITC (Sec 16(2))</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#1A2E25]">
                      <input
                        type="checkbox"
                        checked={reverseCharge}
                        onChange={(e) => setReverseCharge(e.target.checked)}
                        className="rounded border-[#D5E2D9] text-[#2D4A3E] focus:ring-[#8DA173]"
                      />
                      <span>Reverse Charge (RCM)</span>
                    </label>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-[#1A2E25] mb-1">Audit Notes / Item Description</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Raw materials purchase, verified bill copy"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D5E2D9] text-xs font-semibold text-[#1A2E25] bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BANK TRANSACTION FORM */}
          {isBankMode && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-[#1A2E25] mb-1">Transaction Date *</label>
                  <input
                    type="date"
                    required
                    value={bankDate}
                    onChange={(e) => setBankDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-mono text-[#1A2E25]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A2E25] mb-1">Ref / Chq / UTR Number</label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. CMS9918231 / NEFT8891"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-mono text-[#1A2E25]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A2E25] mb-1">Accounting Category Head</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-bold text-[#2D4A3E] bg-white"
                  >
                    <option value="VENDOR_PAYMENT">Vendor Payment (Creditor Dr)</option>
                    <option value="CUSTOMER_RECEIPT">Customer Receipt (Debtor Cr)</option>
                    <option value="GST_CHALLAN_PAYMENT">GST Challan PMT-06 Tax</option>
                    <option value="SALARY_WAGES">Salary / Wages Disbursement</option>
                    <option value="RENT_OFFICE">Office & Warehouse Rent</option>
                    <option value="ELECTRICITY_POWER">Electricity & Power Bill</option>
                    <option value="LEGAL_PROFESSIONAL">Legal & Professional Fees</option>
                    <option value="SOFTWARE_SUBSCRIPTION">Software & IT Tools</option>
                    <option value="BANK_CHARGES">Bank Charges & Card Fees</option>
                    <option value="INTEREST_INCOME">Bank Interest & Incomes</option>
                    <option value="DIRECTOR_DRAWINGS">Director Drawings / Capital</option>
                    <option value="LOAN_DISBURSEMENT">Loan Borrowings</option>
                    <option value="GENERAL_ADMIN_EXPENSE">General Overhead Expense</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1A2E25] mb-1">Bank Narration / Description *</label>
                <input
                  type="text"
                  required
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="e.g. RTGS/CMS/TATASTEEL/INV981"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-semibold text-[#1A2E25]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#F7F8F6] p-4 rounded-2xl border border-[#E0E4DE]">
                <div>
                  <label className="block font-bold text-[#C75D4E] mb-1">Withdrawal / Debit (Dr ₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={withdrawal}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setWithdrawal(val);
                      if (val > 0) setDeposit(0);
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5E2D9] bg-white text-xs font-mono font-bold text-[#C75D4E]"
                  />
                  <span className="text-[10px] text-[#738276] mt-0.5 block">Money leaving bank</span>
                </div>

                <div>
                  <label className="block font-bold text-[#2D4A3E] mb-1">Deposit / Credit (Cr ₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={deposit}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setDeposit(val);
                      if (val > 0) setWithdrawal(0);
                    }}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5E2D9] bg-white text-xs font-mono font-bold text-[#2D4A3E]"
                  />
                  <span className="text-[10px] text-[#738276] mt-0.5 block">Money received in bank</span>
                </div>

                <div>
                  <label className="block font-bold text-[#1A2E25] mb-1">Closing Bank Balance (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={runningBalance}
                    onChange={(e) => setRunningBalance(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 rounded-xl border border-[#D5E2D9] bg-white text-xs font-mono font-bold text-[#1A2E25]"
                  />
                  <span className="text-[10px] text-[#738276] mt-0.5 block">Passbook balance</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[#1A2E25] mb-1">Associated Counterparty Name (Optional)</label>
                  <input
                    type="text"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    placeholder="e.g. Tata Steel Limited or Reliance Retail"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-semibold text-[#1A2E25]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1A2E25] mb-1">Associated GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={partyGstin}
                    onChange={(e) => setPartyGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 27AABCT3518Q1ZV"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5E2D9] text-xs font-mono font-bold text-[#2D4A3E]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-[#E0E4DE] flex items-center justify-between">
            <div>
              {!isNew && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-[#FFF2F0] hover:bg-[#FFE5E2] text-[#C75D4E] border border-[#F5C2BC] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white border border-[#E0E4DE] rounded-xl text-xs font-bold text-[#56655A] hover:bg-[#F7F8F6] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Save className="w-4 h-4 text-[#8DA173]" />
                <span>{isNew ? 'Add & Recompute All Ledgers' : 'Save Changes & Recalculate'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
