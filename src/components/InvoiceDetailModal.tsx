import React from 'react';
import {
  X,
  FileSpreadsheet,
  FileCode,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Mail,
  ShieldCheck,
  ShieldAlert,
  XCircle,
  Building,
  UserCheck,
  Info,
  Pencil,
} from 'lucide-react';
import { ReconItem, InvoiceRecord, Language } from '../types';
import { translations } from '../utils/translations';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ReconItem | null;
  language: Language;
  onOpenNotice: (item: ReconItem) => void;
  onEditRecord?: (inv: InvoiceRecord, source: 'books' | 'gstr2b') => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  language,
  onOpenNotice,
  onEditRecord,
}) => {
  const t = translations[language];

  if (!isOpen || !item) return null;

  const book = item.booksRecord;
  const g2b = item.gstr2bRecord;

  const isBillToMismatch = book?.gstComplianceStatus === 'BILL_TO_MISMATCH';
  const isNonGstDoc = book?.isGstInvoice === false || book?.gstComplianceStatus === 'NON_GST_DOCUMENT';
  const isBillToValid = book?.gstComplianceStatus === 'VALID_GST_INVOICE' || (!isBillToMismatch && !isNonGstDoc);

  const formatRupee = (val?: number) => {
    if (val === undefined || isNaN(val)) return '—';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const isDiff = (val1?: number | string, val2?: number | string) => {
    if (val1 === undefined || val2 === undefined) return true;
    if (typeof val1 === 'number' && typeof val2 === 'number') {
      return Math.abs(val1 - val2) > 0.05;
    }
    return String(val1).trim().toUpperCase() !== String(val2).trim().toUpperCase();
  };

  return (
    <div
      id="invoice-detail-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
    >
      <div
        id="invoice-detail-modal-card"
        className="bg-white w-full max-w-3xl rounded-2xl border border-[#E0E4DE] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] my-auto"
      >
        {/* Header */}
        <div className="bg-[#2D4A3E] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8DA173] flex items-center justify-center font-bold text-white shadow-xs">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  {language === 'hi' ? 'इनवॉइस विस्तृत तुलना (Books vs 2B)' : 'Invoice Audit & Side-by-Side Comparison'}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#3D5C4F] text-[#8DA173]">
                  {item.matchStatus}
                </span>
                {isBillToMismatch && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#D9A14E] text-[#2D4A3E] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Bill-To Mismatch (Sec 16(2))
                  </span>
                )}
                {isNonGstDoc && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[#C75D4E] text-white flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    Non-GST Document
                  </span>
                )}
              </div>
              <p className="text-xs text-[#D3DCD6] mt-0.5">
                {item.vendorName} ({item.gstin}) • Inv #{item.invoiceNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#D3DCD6] hover:text-white rounded-lg hover:bg-[#3D5C4F] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GST Compliance & Statutory Warning Banner */}
        {isBillToMismatch && (
          <div className="bg-[#FFF8EE] border-b border-[#D9A14E]/30 p-4 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#B37B2E] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#915B1E]">
                ⚠️ Section 16(2) CGST Act Statutory Disclaimer: Bill-To Recipient GSTIN Mismatch
              </div>
              <p className="text-[#6B5532] mt-0.5 leading-relaxed">
                {book?.gstComplianceNote ||
                  `This scanned invoice is billed to a different GSTIN (${book?.billToGstin || 'Different Branch/Entity'}). Under Section 16(2)(a) of the CGST Act 2017, Input Tax Credit (ITC) can only be availed by the specific registered entity in possession of a tax invoice addressed to its own GST registration.`}
              </p>
              <div className="mt-2 flex items-center gap-4 text-[11px] font-mono">
                <span className="bg-white px-2 py-0.5 rounded border border-[#E8D9C0] text-[#915B1E]">
                  Billed To on Document: <strong>{book?.billToGstin || 'Missing'}</strong>
                </span>
                <span className="bg-white px-2 py-0.5 rounded border border-[#E8D9C0] text-[#2D4A3E]">
                  Buyer Entity: <strong>{book?.billToName || 'Acme Technologies'}</strong>
                </span>
              </div>
            </div>
          </div>
        )}

        {isNonGstDoc && (
          <div className="bg-[#FCF0EE] border-b border-[#C75D4E]/30 p-4 text-xs flex items-start gap-2.5">
            <XCircle className="w-5 h-5 text-[#C75D4E] shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-[#C75D4E]">
                ⛔ Statutory Rejection: Non-GST Document (Section 31 CGST Act)
              </div>
              <p className="text-[#842E22] mt-0.5 leading-relaxed">
                {book?.gstComplianceNote ||
                  'The uploaded document is an unregistered quotation, cash slip, or estimate that does not meet the statutory requirements of a Tax Invoice under Section 31 of the CGST Act. No Input Tax Credit can be claimed.'}
              </p>
            </div>
          </div>
        )}

        {/* Discrepancy Alert if any */}
        {item.discrepancy && item.discrepancy.mismatchedFields.length > 0 && !isBillToMismatch && !isNonGstDoc && (
          <div className="bg-[#FFF8EE] border-b border-[#D9A14E]/30 p-4 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-[#D9A14E] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#2D362E]">Identified Discrepancies:</span>
              <ul className="list-disc list-inside mt-0.5 text-[#738276] space-y-0.5">
                {item.discrepancy.mismatchedFields.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Side-by-side Table */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E0E4DE] text-[11px] text-[#738276] uppercase tracking-wider bg-[#F7F8F6]">
                <th className="py-2.5 px-4 font-semibold">Attribute</th>
                <th className="py-2.5 px-4 font-semibold text-[#2D4A3E]">
                  Purchase Register (Books / Scan)
                </th>
                <th className="py-2.5 px-4 font-semibold text-[#2D4A3E]">
                  GSTR-2B (Portal)
                </th>
                <th className="py-2.5 px-4 font-semibold text-right">Match Status</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-[#F1F3EE]">
              {/* Supplier GSTIN */}
              <tr>
                <td className="py-3 px-4 font-medium text-[#738276]">Supplier (Seller) GSTIN</td>
                <td className="py-3 px-4 font-mono font-medium text-[#2D362E]">
                  {book?.gstin || '—'}
                </td>
                <td className="py-3 px-4 font-mono font-medium text-[#2D362E]">
                  {g2b?.gstin || '—'}
                </td>
                <td className="py-3 px-4 text-right">
                  {!isDiff(book?.gstin, g2b?.gstin) ? (
                    <span className="text-[#8DA173] font-bold">Matched</span>
                  ) : (
                    <span className="text-[#C75D4E] font-bold">Mismatch</span>
                  )}
                </td>
              </tr>

              {/* Bill-To Recipient GSTIN & Compliance */}
              <tr className={isBillToMismatch ? 'bg-[#FFFDF6]' : ''}>
                <td className="py-3 px-4 font-medium text-[#738276]">
                  Bill-To (Buyer) Recipient GSTIN
                </td>
                <td className="py-3 px-4">
                  <div className="font-mono font-bold text-[#2D362E]">
                    {book?.billToGstin || (book ? 'Matched Active Entity' : '—')}
                  </div>
                  {book?.billToName && (
                    <div className="text-[10px] text-[#738276] mt-0.5">
                      {book.billToName}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 font-mono font-medium text-[#2D362E]">
                  {g2b ? 'Filed for Active GSTIN' : '—'}
                </td>
                <td className="py-3 px-4 text-right">
                  {isBillToMismatch ? (
                    <span className="text-[#915B1E] font-bold">⚠️ Bill-To Mismatch</span>
                  ) : isNonGstDoc ? (
                    <span className="text-[#C75D4E] font-bold">⛔ Non-GST</span>
                  ) : (
                    <span className="text-[#8DA173] font-bold">✓ Sec 16(2) Verified</span>
                  )}
                </td>
              </tr>

              {/* Invoice Number */}
              <tr>
                <td className="py-3 px-4 font-medium text-[#738276]">Invoice Number</td>
                <td className="py-3 px-4 font-mono font-semibold text-[#2D362E]">
                  {book?.invoiceNumber || '—'}
                </td>
                <td className="py-3 px-4 font-mono font-semibold text-[#2D362E]">
                  {g2b?.invoiceNumber || '—'}
                </td>
                <td className="py-3 px-4 text-right">
                  {book?.invoiceNumber === g2b?.invoiceNumber ? (
                    <span className="text-[#8DA173] font-bold">Exact</span>
                  ) : item.matchStatus === 'FUZZY_MATCH' ? (
                    <span className="text-[#8DA173] font-bold">Fuzzy Match</span>
                  ) : (
                    <span className="text-[#C75D4E] font-bold">Missing</span>
                  )}
                </td>
              </tr>

              {/* Invoice Date */}
              <tr>
                <td className="py-3 px-4 font-medium text-[#738276]">Invoice Date</td>
                <td className="py-3 px-4 font-mono text-[#2D362E]">
                  {book?.invoiceDate || '—'}
                </td>
                <td className="py-3 px-4 font-mono text-[#2D362E]">
                  {g2b?.invoiceDate || '—'}
                </td>
                <td className="py-3 px-4 text-right">
                  {book?.invoiceDate === g2b?.invoiceDate ? (
                    <span className="text-[#8DA173] font-bold">Matched</span>
                  ) : (
                    <span className="text-[#D9A14E] font-medium">Date Variance</span>
                  )}
                </td>
              </tr>

              {/* Taxable Value */}
              <tr className={isDiff(book?.taxableValue, g2b?.taxableValue) ? 'bg-[#FFFDF9]' : ''}>
                <td className="py-3 px-4 font-medium text-[#738276]">Taxable Value</td>
                <td className="py-3 px-4 font-semibold text-[#2D362E]">
                  {formatRupee(book?.taxableValue)}
                </td>
                <td className="py-3 px-4 font-semibold text-[#2D362E]">
                  {formatRupee(g2b?.taxableValue)}
                </td>
                <td className="py-3 px-4 text-right font-mono">
                  {book && g2b ? (
                    <span
                      className={
                        Math.abs(book.taxableValue - g2b.taxableValue) <= 2
                          ? 'text-[#8DA173] font-bold'
                          : 'text-[#D9A14E] font-bold'
                      }
                    >
                      Diff: {formatRupee(Math.abs(book.taxableValue - g2b.taxableValue))}
                    </span>
                  ) : (
                    <span className="text-[#C75D4E] font-bold">—</span>
                  )}
                </td>
              </tr>

              {/* IGST */}
              <tr>
                <td className="py-3 px-4 font-medium text-[#738276]">IGST (Inter-State)</td>
                <td className="py-3 px-4 font-mono text-[#2D362E]">{formatRupee(book?.igst)}</td>
                <td className="py-3 px-4 font-mono text-[#2D362E]">{formatRupee(g2b?.igst)}</td>
                <td className="py-3 px-4 text-right">
                  {!isDiff(book?.igst, g2b?.igst) ? (
                    <span className="text-[#8DA173]">Matched</span>
                  ) : (
                    <span className="text-[#D9A14E] font-bold">Diff</span>
                  )}
                </td>
              </tr>

              {/* CGST + SGST */}
              <tr>
                <td className="py-3 px-4 font-medium text-[#738276]">CGST + SGST</td>
                <td className="py-3 px-4 font-mono text-[#2D362E]">
                  {book ? `${formatRupee(book.cgst)} + ${formatRupee(book.sgst)}` : '—'}
                </td>
                <td className="py-3 px-4 font-mono text-[#2D362E]">
                  {g2b ? `${formatRupee(g2b.cgst)} + ${formatRupee(g2b.sgst)}` : '—'}
                </td>
                <td className="py-3 px-4 text-right">
                  {!isDiff(book?.cgst, g2b?.cgst) && !isDiff(book?.sgst, g2b?.sgst) ? (
                    <span className="text-[#8DA173]">Matched</span>
                  ) : (
                    <span className="text-[#D9A14E] font-bold">Diff</span>
                  )}
                </td>
              </tr>

              {/* Total Tax */}
              <tr className="bg-[#F7F8F6] font-semibold">
                <td className="py-3 px-4 text-[#2D4A3E]">Total ITC (Tax Amount)</td>
                <td className="py-3 px-4 text-[#2D4A3E]">{formatRupee(book?.totalTax)}</td>
                <td className="py-3 px-4 text-[#2D4A3E]">{formatRupee(g2b?.totalTax)}</td>
                <td className="py-3 px-4 text-right">
                  {book && g2b ? (
                    <span
                      className={
                        Math.abs(book.totalTax - g2b.totalTax) <= 1.5
                          ? 'text-[#8DA173]'
                          : 'text-[#D9A14E]'
                      }
                    >
                      {formatRupee(Math.abs(book.totalTax - g2b.totalTax))}
                    </span>
                  ) : (
                    <span className="text-[#C75D4E]">—</span>
                  )}
                </td>
              </tr>

              {/* Total Invoice Value */}
              <tr className="font-bold">
                <td className="py-3 px-4 text-[#1A2E25]">Total Invoice Value</td>
                <td className="py-3 px-4 text-[#1A2E25]">{formatRupee(book?.invoiceValue)}</td>
                <td className="py-3 px-4 text-[#1A2E25]">{formatRupee(g2b?.invoiceValue)}</td>
                <td className="py-3 px-4 text-right">
                  {book && g2b && Math.abs(book.invoiceValue - g2b.invoiceValue) <= 2 ? (
                    <span className="text-[#8DA173]">✓ OK</span>
                  ) : (
                    <span className="text-[#D9A14E]">Variance</span>
                  )}
                </td>
              </tr>

              {/* Document Format & OCR Intelligence (if scanned) */}
              {book && (book.isHandwritten || book.formatType || book.notes?.includes('Scanned') || book.notes?.includes('Gemini')) && (
                <tr className="bg-[#FAFBF9]">
                  <td className="py-3 px-4 font-medium text-[#738276]">Invoice Format & OCR Intelligence</td>
                  <td className="py-3 px-4" colSpan={2}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EDF3EF] text-[#2D4A3E] border border-[#D5E2D9]">
                        {book.formatType || (book.isHandwritten ? '✍️ Handwritten Bill Book' : '📄 Computerized ERP')}
                      </span>
                      {book.isHandwritten && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAF4EB] text-[#915B1E] border border-[#E8D9C0]">
                          ✍️ Handwriting Model Predicted
                        </span>
                      )}
                      {book.confidence && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white border border-[#E0E4DE] text-[#2D4A3E]">
                          Accuracy: {book.confidence}%
                        </span>
                      )}
                    </div>
                    {book.itemsSummary && (
                      <div className="text-[11px] text-[#56655A] mt-1">
                        <strong>Line Item:</strong> {book.itemsSummary}
                      </div>
                    )}
                    {book.notes && (
                      <div className="text-[10px] text-[#738276] mt-0.5 italic">
                        {book.notes}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-[10px] font-bold text-[#8DA173]">AI Verified</span>
                  </td>
                </tr>
              )}

              {/* Statutory ITC Eligibility & Reason */}
              <tr>
                <td className="py-3 px-4 font-medium text-[#738276]">Section 16(2) & 17(5) ITC Eligibility</td>
                <td className="py-3 px-4 text-[#2D362E]">
                  {isBillToMismatch ? (
                    <span className="text-[#915B1E] font-bold">Ineligible (Bill-To Mismatch)</span>
                  ) : isNonGstDoc ? (
                    <span className="text-[#C75D4E] font-bold">Ineligible (Non-GST Document)</span>
                  ) : (
                    <span className="text-[#8DA173] font-bold">Eligible in Books</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {g2b?.itcAvailable !== false ? (
                    <span className="text-[#8DA173] font-bold">Eligible (Available in 2B)</span>
                  ) : (
                    <span className="text-[#C75D4E] font-bold">
                      Ineligible / Blocked ({g2b?.itcReason || 'Sec 17(5)'})
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  {isBillToMismatch || isNonGstDoc || g2b?.itcAvailable === false ? (
                    <span className="text-[#C75D4E] font-bold">Disallowed</span>
                  ) : (
                    <span className="text-[#8DA173] font-bold">Allowed</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#F7F8F6] border-t border-[#E0E4DE] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#E0E4DE] rounded-lg text-xs font-semibold text-[#738276] hover:bg-[#F1F3EE] transition-colors cursor-pointer"
            >
              Close
            </button>
            {onEditRecord && (book || g2b) && (
              <button
                onClick={() => {
                  onClose();
                  if (book) {
                    onEditRecord(book, 'books');
                  } else if (g2b) {
                    onEditRecord(g2b, 'gstr2b');
                  }
                }}
                className="px-4 py-2 bg-white border border-[#2D4A3E] text-[#2D4A3E] hover:bg-[#EDF3EF] rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Pencil className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Edit Invoice Details</span>
              </button>
            )}
          </div>

          {(item.matchStatus === 'MISSING_IN_2B' ||
            item.matchStatus === 'VALUE_MISMATCH' ||
            item.matchStatus === 'HEAD_MISMATCH' ||
            isBillToMismatch) && (
            <button
              onClick={() => {
                onClose();
                onOpenNotice(item);
              }}
              className="px-5 py-2 bg-[#D9A14E] text-white rounded-lg text-xs font-bold hover:bg-[#C28C3D] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{isBillToMismatch ? 'Send Bill-To Correction Notice' : 'Generate Supplier Notice'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
