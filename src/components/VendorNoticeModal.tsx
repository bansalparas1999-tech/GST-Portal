import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  MessageSquare,
  Copy,
  Check,
  Send,
  Sparkles,
  Building2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Bookmark,
} from 'lucide-react';
import { ReconItem, Language, GlobalNoticeTemplate, UserProfile } from '../types';
import { translations } from '../utils/translations';
import { fetchGlobalTemplates, logNoticeDispatch } from '../lib/firebase';

interface VendorNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ReconItem[]; // Can be single or multiple
  language: Language;
  currentUser?: UserProfile | null;
  selectedPeriod?: string;
  selectedMonth?: string;
}

export const VendorNoticeModal: React.FC<VendorNoticeModalProps> = ({
  isOpen,
  onClose,
  items,
  language,
  currentUser,
  selectedPeriod = 'FY 2024-25',
  selectedMonth = 'ALL',
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'email' | 'whatsapp'>('email');
  const [templates, setTemplates] = useState<GlobalNoticeTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('ai_custom');
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [whatsappText, setWhatsappText] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const buyerCompanyName = currentUser?.companyName || 'Apex Audit & Advisory LLP';
  const buyerCompanyGstin = currentUser?.companyGstin || '27AABCA1234F1Z8';
  const buyerEmail = currentUser?.email || 'accounts@enterprise.in';

  const primaryVendor = items[0]?.vendorName || 'Valued Supplier';
  const primaryGstin = items[0]?.gstin || '';
  const firstItem = items[0];

  // Load global templates
  useEffect(() => {
    if (isOpen) {
      fetchGlobalTemplates().then((tpls) => {
        setTemplates(tpls);
      });
    }
  }, [isOpen]);

  const applyTemplate = (tpl: GlobalNoticeTemplate) => {
    const invNum = items.map((i) => i.invoiceNumber).join(', ');
    const invDate = firstItem?.booksRecord?.invoiceDate || firstItem?.gstr2bRecord?.invoiceDate || 'Recent';
    const taxableTotal = items
      .reduce((acc, i) => acc + (i.booksRecord?.taxableValue || i.gstr2bRecord?.taxableValue || 0), 0)
      .toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const taxTotal = items
      .reduce((acc, i) => acc + (i.booksRecord?.totalTax || i.gstr2bRecord?.totalTax || 0), 0)
      .toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const booksTax = (firstItem?.booksRecord?.totalTax || 0).toLocaleString('en-IN');
    const gstr2bTax = (firstItem?.gstr2bRecord?.totalTax || 0).toLocaleString('en-IN');
    const taxDiff = (firstItem?.discrepancy?.totalDiff || 0).toLocaleString('en-IN');
    const reason =
      firstItem?.discrepancy?.suggestedAction ||
      (firstItem?.matchStatus === 'MISSING_IN_2B'
        ? 'Invoice present in Books of Accounts but completely missing in GSTR-2B'
        : 'Tax amount / classification mismatch between Books and GSTR-2B');

    let sub = tpl.subject
      .replace(/{{vendor_name}}/g, primaryVendor)
      .replace(/{{gstin}}/g, primaryGstin)
      .replace(/{{invoice_number}}/g, invNum)
      .replace(/{{company_name}}/g, buyerCompanyName)
      .replace(/{{company_gstin}}/g, buyerCompanyGstin)
      .replace(/{{financial_year}}/g, selectedPeriod)
      .replace(/{{tax_period}}/g, selectedMonth === 'ALL' ? 'Annual Full Year' : selectedMonth);

    let body = tpl.body
      .replace(/{{vendor_name}}/g, primaryVendor)
      .replace(/{{gstin}}/g, primaryGstin)
      .replace(/{{invoice_number}}/g, invNum)
      .replace(/{{invoice_date}}/g, invDate)
      .replace(/{{taxable_amount}}/g, taxableTotal)
      .replace(/{{tax_amount}}/g, taxTotal)
      .replace(/{{books_tax}}/g, booksTax)
      .replace(/{{gstr2b_tax}}/g, gstr2bTax)
      .replace(/{{tax_diff}}/g, taxDiff)
      .replace(/{{discrepancy_reason}}/g, reason)
      .replace(/{{company_name}}/g, buyerCompanyName)
      .replace(/{{company_gstin}}/g, buyerCompanyGstin)
      .replace(/{{financial_year}}/g, selectedPeriod)
      .replace(/{{tax_period}}/g, selectedMonth === 'ALL' ? 'Annual Full Year' : selectedMonth)
      .replace(/{{contact_email}}/g, buyerEmail)
      .replace(/{{deadline_days}}/g, '7');

    setSubject(sub);
    setEmailBody(body);
    setWhatsappText(
      `Dear ${primaryVendor}, Greetings from ${buyerCompanyName}. Regarding invoice(s) ${invNum}, we identified a GST reconciliation variance (${reason}). Please review and update in GSTR-1. Thank you!`
    );
  };

  const generateNotice = async () => {
    setIsLoading(true);
    try {
      const invoicesPayload = items.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        invoiceDate: i.booksRecord?.invoiceDate || i.gstr2bRecord?.invoiceDate,
        taxableValue: i.booksRecord?.taxableValue || i.gstr2bRecord?.taxableValue,
        totalTax: i.booksRecord?.totalTax || i.gstr2bRecord?.totalTax,
        diff: i.discrepancy?.totalDiff,
        status: i.matchStatus,
      }));

      const res = await fetch('/api/ai/generate-vendor-notice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: primaryVendor,
          gstin: primaryGstin,
          invoices: invoicesPayload,
          issueType:
            items[0]?.matchStatus === 'MISSING_IN_2B'
              ? 'Invoices present in our Books of Accounts but MISSING in GSTR-2B'
              : 'Invoice Amount or Tax Head Mismatch in GSTR-1',
          buyerName: buyerCompanyName,
        }),
      });

      const data = await res.json();
      setSubject(data.subject || `Urgent: GST GSTR-2B Discrepancy Notice - ${primaryVendor}`);
      setEmailBody(data.emailBody || '');
      setWhatsappText(data.whatsappText || '');
    } catch (e: any) {
      console.error(e);
      // Fallback
      setSubject(`Urgent: GSTR-1 Upload / ITC Mismatch Notice - ${buyerCompanyName}`);
      setEmailBody(
        `Dear ${primaryVendor} (GSTIN: ${primaryGstin}),\n\n` +
          `We are conducting our monthly GST reconciliation for ITC availing under Section 16(2)(aa) of the CGST Act. The following invoice(s) are NOT reflecting in our GSTR-2B or have amount differences:\n\n` +
          items
            .map(
              (i) =>
                `• Inv No: ${i.invoiceNumber}, Date: ${i.booksRecord?.invoiceDate || 'N/A'}, Taxable: ₹${
                  i.booksRecord?.taxableValue || 0
                }, GST: ₹${i.booksRecord?.totalTax || 0}`
            )
            .join('\n') +
          `\n\nKindly file/amend your GSTR-1 immediately so that the Input Tax Credit reflects in our GSTR-2B. As per company policy, GST payment on these invoices may be held back until rectified.\n\n` +
          `Regards,\nTaxation & Accounts Team\n${buyerCompanyName} (GSTIN: ${buyerCompanyGstin})`
      );
      setWhatsappText(
        `Dear ${primaryVendor}, Greetings from ${buyerCompanyName}. During our monthly GST reconciliation, we found invoice(s) ${items
          .map((i) => i.invoiceNumber)
          .join(', ')} missing in our GSTR-2B. Kindly upload in your GSTR-1 to prevent ITC loss under Sec 16(2)(aa). Thank you!`
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && items.length > 0) {
      generateNotice();
    }
  }, [isOpen, items]);

  const handleTemplateChange = (tplId: string) => {
    setSelectedTemplateId(tplId);
    if (tplId === 'ai_custom') {
      generateNotice();
    } else {
      const found = templates.find((t) => t.id === tplId);
      if (found) {
        applyTemplate(found);
      }
    }
  };

  const copyCurrent = () => {
    const textToCopy = activeTab === 'email' ? `${subject}\n\n${emailBody}` : whatsappText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openMailClient = () => {
    if (currentUser?.uid) {
      logNoticeDispatch(currentUser.uid, {
        userId: currentUser.uid,
        vendorGstin: primaryGstin,
        vendorName: primaryVendor,
        invoiceNumber: items.map((i) => i.invoiceNumber).join(', '),
        templateId: selectedTemplateId,
        templateTitle: templates.find((t) => t.id === selectedTemplateId)?.title || 'AI Statutory Draft',
        recipientEmail: '',
        subject,
        taxVariance: items.reduce((acc, i) => acc + (i.discrepancy?.totalDiff || 0), 0),
        status: 'SENT',
      });
    }

    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
      emailBody
    )}`;
    window.location.href = mailtoUrl;
  };

  const openWhatsApp = () => {
    if (currentUser?.uid) {
      logNoticeDispatch(currentUser.uid, {
        userId: currentUser.uid,
        vendorGstin: primaryGstin,
        vendorName: primaryVendor,
        invoiceNumber: items.map((i) => i.invoiceNumber).join(', '),
        templateId: selectedTemplateId,
        templateTitle: 'WhatsApp Notice',
        recipientEmail: '',
        subject,
        taxVariance: items.reduce((acc, i) => acc + (i.discrepancy?.totalDiff || 0), 0),
        status: 'SENT',
      });
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
    window.open(waUrl, '_blank');
  };

  if (!isOpen || items.length === 0) return null;

  return (
    <div
      id="vendor-notice-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
    >
      <div
        id="vendor-notice-modal-card"
        className="bg-white w-full max-w-3xl rounded-2xl border border-[#E0E4DE] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] my-auto"
      >
        {/* Header */}
        <div className="bg-[#2D4A3E] text-white p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D9A14E] flex items-center justify-center font-bold text-white shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">
                {language === 'hi' ? 'सप्लायर को कानूनी नोटिस भेजें' : 'Vendor ITC Compliance Notice (Sec 16)'}
              </h3>
              <p className="text-xs text-[#D3DCD6]">
                Targeting: <strong className="text-white">{primaryVendor}</strong> ({primaryGstin}) — {items.length} invoice(s)
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

        {/* Template Selector Bar */}
        <div className="bg-[#F7F8F6] px-6 py-2.5 border-b border-[#E0E4DE] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <Bookmark className="w-4 h-4 text-[#8DA173]" />
            <span className="text-xs font-bold text-[#2D4A3E]">Template:</span>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-white border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173] text-[#2D362E] flex-1"
            >
              <option value="ai_custom">✨ AI Tailored Statutory Notice (Dynamic)</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  📄 [Admin Template] {tpl.title}
                </option>
              ))}
            </select>
          </div>

          <span className="text-[11px] text-[#738276]">
            From: <strong>{buyerCompanyName}</strong>
          </span>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-[#E0E4DE] bg-[#F7F8F6] px-6 pt-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('email')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'email'
                ? 'bg-white text-[#2D4A3E] border-t border-x border-[#E0E4DE] shadow-xs'
                : 'text-[#738276] hover:text-[#2D4A3E]'
            }`}
          >
            <Mail className="w-4 h-4 text-[#2D4A3E]" />
            <span>Formal Email Notice</span>
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'whatsapp'
                ? 'bg-white text-[#2D4A3E] border-t border-x border-[#E0E4DE] shadow-xs'
                : 'text-[#738276] hover:text-[#2D4A3E]'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-[#8DA173]" />
            <span>WhatsApp Quick Message</span>
          </button>
        </div>

        {/* Notice Content */}
        <div className="p-6 space-y-4 bg-[#FDFDFC] overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-16 text-center text-[#738276] text-xs">
              <Sparkles className="w-6 h-6 animate-spin text-[#D9A14E] mx-auto mb-2" />
              Generating formal legal notice with GST Act section references...
            </div>
          ) : (
            <>
              {activeTab === 'email' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#738276] uppercase block mb-1">
                      Subject Line:
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full text-xs font-medium border border-[#E0E4DE] px-3 py-2 rounded-lg bg-white text-[#2D362E] focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[#738276] uppercase block mb-1">
                      Email Body:
                    </label>
                    <textarea
                      rows={12}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full text-xs font-mono p-3 border border-[#E0E4DE] rounded-xl bg-white text-[#2D362E] focus:outline-none focus:ring-1 focus:ring-[#8DA173] leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'whatsapp' && (
                <div>
                  <label className="text-[11px] font-bold text-[#738276] uppercase block mb-1">
                    WhatsApp Text:
                  </label>
                  <textarea
                    rows={8}
                    value={whatsappText}
                    onChange={(e) => setWhatsappText(e.target.value)}
                    className="w-full text-xs font-sans p-3 border border-[#E0E4DE] rounded-xl bg-white text-[#2D362E] focus:outline-none focus:ring-1 focus:ring-[#8DA173] leading-relaxed"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F7F8F6] border-t border-[#E0E4DE] flex items-center justify-between shrink-0">
          <button
            onClick={copyCurrent}
            className="px-4 py-2 bg-white border border-[#E0E4DE] rounded-lg text-xs font-semibold text-[#2D4A3E] hover:bg-[#F1F3EE] transition-colors flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#8DA173]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-[#738276] hover:bg-[#E0E4DE] transition-colors"
            >
              Cancel
            </button>
            {activeTab === 'email' ? (
              <button
                id="btn-open-mailer"
                onClick={openMailClient}
                className="px-5 py-2 bg-[#2D4A3E] text-white rounded-lg text-xs font-bold hover:bg-[#233B31] transition-all flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Open in Email App & Log</span>
              </button>
            ) : (
              <button
                id="btn-open-wa"
                onClick={openWhatsApp}
                className="px-5 py-2 bg-[#8DA173] text-white rounded-lg text-xs font-bold hover:bg-[#7A8E61] transition-all flex items-center gap-1.5 shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Send WhatsApp</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
