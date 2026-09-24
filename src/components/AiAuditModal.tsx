import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldAlert,
  Send,
  Download,
  Copy,
  Check,
  FileText,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { ReconSummary, ReconItem, Language } from '../types';
import { translations } from '../utils/translations';

interface AiAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: ReconSummary;
  discrepancies: ReconItem[];
  language: Language;
}

export const AiAuditModal: React.FC<AiAuditModalProps> = ({
  isOpen,
  onClose,
  summary,
  discrepancies,
  language,
}) => {
  const t = translations[language];
  const [analysisText, setAnalysisText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [userQuery, setUserQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchAuditAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ai/analyze-reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary,
          discrepancies: discrepancies.slice(0, 10).map((d) => ({
            vendor: d.vendorName,
            gstin: d.gstin,
            invNo: d.invoiceNumber,
            status: d.matchStatus,
            bookTax: d.booksRecord?.totalTax,
            g2bTax: d.gstr2bRecord?.totalTax,
            diff: d.discrepancy?.taxDiff,
          })),
          language,
        }),
      });
      const data = await res.json();
      setAnalysisText(data.analysis || 'Analysis completed.');
    } catch (e: any) {
      console.error(e);
      setAnalysisText(
        '### Statutory GST Compliance & ITC Audit Note\n\n' +
          '1. **Mandatory 100% GSTR-2B Matching**: As per Section 16(2)(aa) of the CGST Act, Input Tax Credit (ITC) can only be availed in GSTR-3B if the invoice details have been furnished by the supplier in their GSTR-1 and communicated in GSTR-2B.\n\n' +
          '2. **Risk on Missing in 2B**: Holding back or following up on invoices missing in GSTR-2B prevents future demand notices with 18% p.a. interest under Section 50.\n\n' +
          '3. **Place of Supply (POS) Check**: When CGST+SGST is paid in books but supplier uploaded IGST (or vice-versa), an amendment under Table 9A of GSTR-1 is legally required before claiming.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAuditAnalysis();
    }
  }, [isOpen, language]);

  const handleSendQuery = async () => {
    if (!userQuery.trim() || isQuerying) return;
    const query = userQuery.trim();
    setUserQuery('');
    setChatMessages((prev) => [...prev, { role: 'user', content: query }]);
    setIsQuerying(true);

    try {
      const res = await fetch('/api/ai/tax-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          context: {
            totalBookTax: summary.totalBookTax,
            missingIn2bTax: summary.missingIn2bTax,
            missingIn2bCount: summary.missingIn2bCount,
            matchedTax: summary.matchedTax,
          },
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer || 'No response.' },
      ]);
    } catch (e: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Unable to contact AI assistant. Key rule: Under Section 16(2)(aa), never claim ITC without GSTR-2B matching.',
        },
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(analysisText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      id="ai-audit-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
    >
      <div
        id="ai-audit-modal-card"
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl border border-[#E0E4DE] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 my-auto"
      >
        {/* Header */}
        <div className="bg-[#2D4A3E] text-white p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8DA173] flex items-center justify-center font-bold text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  {language === 'hi' ? 'AI चार्टर्ड अकाउंटेंट ऑडिट एवं रिस्क असेसमेंट' : 'AI CA Compliance & Risk Audit Advisory'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#3D5C4F] text-[#8DA173] border border-[#8DA173]/40">
                  Gemini 3.7 Pro
                </span>
              </div>
              <p className="text-xs text-[#D3DCD6] mt-0.5">
                Automated legal review of ITC under CGST Section 16(2)(aa) and Section 17(5).
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F7F8F6]">
          {/* Risk Metrics Quick Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-[#E0E4DE] shadow-xs">
              <span className="text-[11px] font-semibold text-[#738276] uppercase">
                Eligible ITC (Claimable)
              </span>
              <div className="text-xl font-bold text-[#2D4A3E] mt-1">
                ₹{(summary.matchedTax + summary.fuzzyMatchedTax).toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-[#8DA173] font-semibold">
                Safe for GSTR-3B Table 4(A)(5)
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E0E4DE] shadow-xs">
              <span className="text-[11px] font-semibold text-[#738276] uppercase">
                ITC at Risk (Missing in 2B)
              </span>
              <div className="text-xl font-bold text-[#C75D4E] mt-1">
                ₹{summary.missingIn2bTax.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-[#C75D4E] font-semibold">
                {summary.missingIn2bCount} invoices require vendor push
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-[#E0E4DE] shadow-xs">
              <span className="text-[11px] font-semibold text-[#738276] uppercase">
                Unclaimed ITC (In 2B only)
              </span>
              <div className="text-xl font-bold text-[#2D5A88] mt-1">
                ₹{summary.missingInBooksTax.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-[#2D5A88] font-semibold">
                {summary.missingInBooksCount} invoices to book in Tally
              </span>
            </div>
          </div>

          {/* AI Generated Audit Note */}
          <div className="bg-white p-6 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F3EE] pb-3">
              <h4 className="text-sm font-bold text-[#2D4A3E] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#8DA173]" />
                <span>Executive Tax Compliance Findings</span>
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAuditAnalysis}
                  disabled={isLoading}
                  className="p-1.5 text-[#738276] hover:text-[#2D4A3E] rounded hover:bg-[#F1F3EE] transition-colors"
                  title="Re-run AI Analysis"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={copyToClipboard}
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-[#F1F3EE] text-[#2D4A3E] hover:bg-[#E0E4DE] transition-colors flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#8DA173]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#738276]">
                <RefreshCw className="w-6 h-6 animate-spin text-[#8DA173]" />
                <span className="text-xs font-semibold">
                  Generating CA-grade GST statutory analysis...
                </span>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-[#2D362E] text-xs leading-relaxed space-y-3 font-sans whitespace-pre-line">
                {analysisText}
              </div>
            )}
          </div>

          {/* Interactive Tax Assistant Chat */}
          <div className="bg-white p-5 rounded-2xl border border-[#E0E4DE] shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-[#2D4A3E] flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#8DA173]" />
              <span>Ask GST AI Assistant (Clarify ITC rules, Sec 16 deadlines, or RCM rules)</span>
            </h4>

            {chatMessages.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-[#F7F8F6] rounded-xl text-xs">
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg ${
                      msg.role === 'user'
                        ? 'bg-[#2D4A3E] text-white ml-8'
                        : 'bg-white text-[#2D362E] border border-[#E0E4DE] mr-8'
                    }`}
                  >
                    <span className="font-bold text-[10px] block opacity-70 mb-0.5">
                      {msg.role === 'user' ? 'You' : 'GST Advisor AI'}
                    </span>
                    <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="E.g., Can I claim ITC if vendor files GSTR-1 in next quarter? or What is the Nov 30 deadline?"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
                className="flex-1 text-xs border border-[#E0E4DE] px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173] text-[#2D362E]"
              />
              <button
                id="btn-send-tax-query"
                onClick={handleSendQuery}
                disabled={isQuerying || !userQuery.trim()}
                className="px-4 py-2 bg-[#8DA173] text-white rounded-xl text-xs font-bold hover:bg-[#7A8E61] transition-all flex items-center gap-1 disabled:opacity-50"
              >
                {isQuerying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Ask</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-[#E0E4DE] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#2D4A3E] text-white rounded-lg text-xs font-bold hover:bg-[#233B31] transition-colors"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
