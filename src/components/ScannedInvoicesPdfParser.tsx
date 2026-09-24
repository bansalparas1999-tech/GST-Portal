import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Download,
  Trash2,
  Edit2,
  FileCheck2,
  Search,
  Eye,
  RefreshCw,
  Zap,
  Building,
  ShieldCheck,
  Percent,
  PenTool,
  Receipt,
  Truck,
  Layers,
  HelpCircle,
  AlertTriangle,
  XCircle,
  UserCheck,
  ShieldAlert,
  Info,
  Plus,
  X,
  RotateCcw,
  File as FileIcon,
} from 'lucide-react';
import { InvoiceRecord, Language } from '../types';
import { translations } from '../utils/translations';
import { FINANCIAL_YEARS, GST_MONTHS, extractInvoiceFY, extractInvoiceMonth } from '../utils/periodUtils';

export interface UploadedDoc {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  base64: string;
}

interface ScannedInvoicesPdfParserProps {
  onInvoicesExtracted: (
    invoices: InvoiceRecord[],
    action: 'replace' | 'append',
    targetFY?: string,
    targetMonth?: string
  ) => void;
  language: Language;
  currentFY?: string;
  currentMonth?: string;
  companyGstin?: string;
  companyName?: string;
  onClose?: () => void;
  isAdmin?: boolean;
}

export const ScannedInvoicesPdfParser: React.FC<ScannedInvoicesPdfParserProps> = ({
  onInvoicesExtracted,
  language,
  currentFY = 'FY 2024-25',
  currentMonth = 'ALL',
  companyGstin = '27AABCA1234F1Z8',
  companyName = 'Acme Technologies India Pvt Ltd',
  onClose,
  isAdmin = false,
}) => {
  const t = translations[language];

  const [uploadedFiles, setUploadedFiles] = useState<UploadedDoc[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isAiPowered, setIsAiPowered] = useState<boolean>(true);
  const [usedModel, setUsedModel] = useState<string>('');

  // Extracted Invoices Staging
  const [extractedInvoices, setExtractedInvoices] = useState<InvoiceRecord[]>([]);
  const [documentSummary, setDocumentSummary] = useState<string>('');
  const [totalPages, setTotalPages] = useState<number>(0);

  // Ingestion settings
  const [targetFY, setTargetFY] = useState<string>(currentFY);
  const [targetMonth, setTargetMonth] = useState<string>(currentMonth);
  const [autoDetectPeriod, setAutoDetectPeriod] = useState<boolean>(true);
  const [ingestMode, setIngestMode] = useState<'replace' | 'append'>('replace');
  const [onlyValidGstIngestion, setOnlyValidGstIngestion] = useState<boolean>(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [complianceFilter, setComplianceFilter] = useState<'all' | 'valid' | 'mismatch' | 'non_gst' | 'handwritten' | 'erp' | 'transport'>('all');

  // Editing state
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);
  const [selectedDisclaimerInv, setSelectedDisclaimerInv] = useState<InvoiceRecord | null>(null);

  // Handle Files from file input or drag-and-drop
  const handleFilesSelected = (filesList: FileList | File[] | null) => {
    if (!filesList || filesList.length === 0) return;
    setErrorMsg('');

    const filesArray = Array.from(filesList);
    const validFiles: File[] = [];

    for (const file of filesArray) {
      if (file.size > 25 * 1024 * 1024) {
        setErrorMsg(`File "${file.name}" exceeds 25MB limit. Please upload a smaller file.`);
        return;
      }
      validFiles.push(file);
    }

    const readers = validFiles.map((file) => {
      return new Promise<UploadedDoc>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            file,
            name: file.name,
            size: file.size,
            type: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
            base64: e.target?.result as string,
          });
        };
        reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers)
      .then((docs) => {
        setUploadedFiles((prev) => [...prev, ...docs]);
        if (docs.length > 0) {
          setSelectedFile(docs[0].file);
          setFileBase64(docs[0].base64);
        }
      })
      .catch((err) => {
        setErrorMsg(err.message || 'Failed to read uploaded files.');
      });
  };

  const handleRemoveDoc = (id: string) => {
    setUploadedFiles((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      if (updated.length > 0) {
        setSelectedFile(updated[0].file);
        setFileBase64(updated[0].base64);
      } else {
        setSelectedFile(null);
        setFileBase64(null);
      }
      return updated;
    });
  };

  // Run AI PDF Invoice Extraction with Gemini 3.7 Vision & Handwriting Disambiguation
  const handleExtractInvoices = async () => {
    if (uploadedFiles.length === 0 && !fileBase64 && !selectedFile) {
      setErrorMsg('Please select or drop a scanned PDF / invoice image to process.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');
    setProcessingStep(1);
    const count = uploadedFiles.length || 1;
    setStatusMessage(`Reading PDF streams & segmenting multi-vendor invoice pages from ${count} document(s)...`);

    try {
      setTimeout(() => {
        setProcessingStep(2);
        setStatusMessage('Gemini 3.7 Vision analyzing Supplier vs Bill-To GSTINs & cursive handwriting...');
      }, 700);

      setTimeout(() => {
        setProcessingStep(3);
        setStatusMessage(`Validating Section 16(2) compliance against active entity ${companyGstin}...`);
      }, 1600);

      const payload = {
        fileBase64: uploadedFiles[0]?.base64 || fileBase64 || '',
        files: uploadedFiles.map((f) => ({
          fileBase64: f.base64,
          fileName: f.name,
          mimeType: f.type,
        })),
        fileName: uploadedFiles[0]?.name || selectedFile?.name || 'scanned_invoices_merged.pdf',
        mimeType: uploadedFiles[0]?.type || selectedFile?.type || 'application/pdf',
        targetFY,
        targetMonth,
        activeCompanyGstin: companyGstin,
        activeCompanyName: companyName,
      };

      const response = await fetch('/api/ai/extract-invoices-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();

      if (!data.success && !data.invoices) {
        throw new Error(data.error || 'Failed to extract invoices from the PDF.');
      }

      const rawList: InvoiceRecord[] = data.invoices || [];

      // Auto-detect Period if enabled
      if (rawList.length > 0 && autoDetectPeriod) {
        const firstDate = rawList[0].invoiceDate;
        const detectedFY = extractInvoiceFY(firstDate);
        const detectedM = extractInvoiceMonth(firstDate);
        if (detectedFY) setTargetFY(detectedFY);
        if (detectedM) setTargetMonth(detectedM);
      }

      setExtractedInvoices(rawList);
      setDocumentSummary(data.documentSummary || `Extracted ${rawList.length} invoices successfully.`);
      setTotalPages(data.totalPagesProcessed || rawList.length);
      setIsAiPowered(Boolean(data.isAiGenerated));
      setUsedModel(data.model || 'gemini-3.7-flash (Multimodal Vision & GST Compliance)');
      setProcessingStep(4);
    } catch (err: any) {
      console.error('PDF Extraction Error:', err);
      setErrorMsg(err.message || 'Error occurred while scanning PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Load Built-in Test Sample Merged Scanned PDF with Mixed Formats and Bill-To GSTIN Compliance
  const handleLoadSamplePdf = (sampleType: 'diverse' | 'handwritten' = 'diverse') => {
    setIsProcessing(true);
    setErrorMsg('');
    setProcessingStep(1);
    setStatusMessage(
      sampleType === 'diverse'
        ? 'Loading multi-vendor package (Supplier vs Bill-To GSTIN verification, ERP, Handwritten, Bilty, Thermal POS)...'
        : 'Loading complex handwritten carbon-copy bill books & job-work challans with Bill-To checks...'
    );

    setTimeout(() => {
      setProcessingStep(2);
      setStatusMessage('Gemini 3.7 Vision OCR verifying statutory GST compliance & predicting cursive handwriting...');
    }, 500);

    setTimeout(() => {
      const activeG = companyGstin || '27AABCA1234F1Z8';
      const activeN = companyName || 'Acme Technologies India Pvt Ltd';

      const sampleInvoices: InvoiceRecord[] =
        sampleType === 'diverse'
          ? [
              {
                id: `scanned_demo_${Date.now()}_1`,
                source: 'books',
                gstin: '27AABCU9603R1ZM',
                vendorName: 'Infosys BPM Limited',
                billToGstin: activeG,
                billToName: activeN,
                isGstInvoice: true,
                gstComplianceStatus: 'VALID_GST_INVOICE',
                gstComplianceNote: 'Valid Statutory GST Tax Invoice: Billed to active entity GSTIN (27AABCA1234F1Z8). Full Section 16(2) compliance.',
                invoiceNumber: 'INV-2024-8901',
                rawInvoiceNumber: 'INV-2024-8901',
                invoiceDate: '2024-10-12',
                invoiceType: 'B2B',
                taxableValue: 125000,
                igst: 22500,
                cgst: 0,
                sgst: 0,
                cess: 0,
                totalTax: 22500,
                invoiceValue: 147500,
                placeOfSupply: '27-Maharashtra',
                reverseCharge: false,
                itcAvailable: true,
                financialYear: targetFY,
                taxPeriod: targetMonth !== 'ALL' ? targetMonth : '10',
                pageNumber: 1,
                confidence: 99,
                isHandwritten: false,
                formatType: 'Computerized ERP',
                handwrittenFields: [],
                itemsSummary: 'Cloud ERP Software Implementation & Consulting',
                notes: 'Scanned Tax Invoice Page 1 (E-Invoice QR verified, Bill-To matched)',
              },
              {
                id: `scanned_demo_${Date.now()}_2`,
                source: 'books',
                gstin: '07AAACG0569P1Z3',
                vendorName: 'Gupta Hardware & Mill Store',
                billToGstin: activeG,
                billToName: activeN,
                isGstInvoice: true,
                gstComplianceStatus: 'VALID_GST_INVOICE',
                gstComplianceNote: 'Valid Statutory GST Tax Invoice: Handwritten carbon copy with balanced CGST/SGST and matched Bill-To GSTIN.',
                invoiceNumber: 'BK-4421',
                rawInvoiceNumber: 'Book No. 12 / Bill 4421',
                invoiceDate: '2024-10-15',
                invoiceType: 'B2B',
                taxableValue: 84000,
                igst: 0,
                cgst: 7560,
                sgst: 7560,
                cess: 0,
                totalTax: 15120,
                invoiceValue: 99120,
                placeOfSupply: '07-Delhi',
                reverseCharge: false,
                itcAvailable: true,
                financialYear: targetFY,
                taxPeriod: targetMonth !== 'ALL' ? targetMonth : '10',
                pageNumber: 2,
                confidence: 94,
                isHandwritten: true,
                formatType: 'Handwritten Bill Book',
                handwrittenFields: ['Invoice Number', 'Date', 'Item Description', 'Taxable Total'],
                itemsSummary: 'Handwritten MS Fasteners, Hex Bolts & Hardware (Pink Carbon Copy)',
                notes: 'Cursive numerals predicted & intra-state CGST/SGST balanced (Page 2)',
              },
              {
                id: `scanned_demo_${Date.now()}_3`,
                source: 'books',
                gstin: '29AABCT1332L1ZV',
                vendorName: 'Tata Consultancy Services Ltd',
                billToGstin: '07AABCA1234F1Z9', // Mismatched Delhi Branch GSTIN!
                billToName: 'Acme Technologies (Delhi Branch)',
                isGstInvoice: true,
                gstComplianceStatus: 'BILL_TO_MISMATCH',
                gstComplianceNote: `⚠️ STATUTORY DISCLAIMER (Section 16(2) CGST Act): Billed to Delhi Branch GSTIN (07AABCA1234F1Z9) instead of active entity (${activeG}). ITC cannot be claimed under this GST registration.`,
                invoiceNumber: 'TCS-BLR-8819',
                rawInvoiceNumber: 'TCS-BLR-8819',
                invoiceDate: '2024-10-18',
                invoiceType: 'B2B',
                taxableValue: 240000,
                igst: 43200,
                cgst: 0,
                sgst: 0,
                cess: 0,
                totalTax: 43200,
                invoiceValue: 283200,
                placeOfSupply: '29-Karnataka',
                reverseCharge: false,
                itcAvailable: false,
                financialYear: targetFY,
                taxPeriod: targetMonth !== 'ALL' ? targetMonth : '10',
                pageNumber: 3,
                confidence: 98,
                isHandwritten: false,
                formatType: 'Computerized ERP',
                handwrittenFields: [],
                itemsSummary: 'Managed Security Services & IT Architecture',
                notes: 'Scanned Tax Invoice Page 3: Bill-to mismatch detected (Billed to Delhi branch)',
              },
              {
                id: `scanned_demo_${Date.now()}_4`,
                source: 'books',
                gstin: '24AABCS1429B1Z4',
                vendorName: 'Navkar Express Transport Logistics',
                billToGstin: activeG,
                billToName: activeN,
                isGstInvoice: true,
                gstComplianceStatus: 'VALID_GST_INVOICE',
                gstComplianceNote: 'Valid GST Consignment Note (Lorry Receipt): GTA under Reverse Charge Mechanism (Section 9(3)).',
                invoiceNumber: 'LR-GJ-9912',
                rawInvoiceNumber: 'Bilty LR-9912/24',
                invoiceDate: '2024-10-22',
                invoiceType: 'B2BUR',
                taxableValue: 56000,
                igst: 2800,
                cgst: 0,
                sgst: 0,
                cess: 0,
                totalTax: 2800,
                invoiceValue: 58800,
                placeOfSupply: '24-Gujarat',
                reverseCharge: true,
                itcAvailable: true,
                financialYear: targetFY,
                taxPeriod: targetMonth !== 'ALL' ? targetMonth : '10',
                pageNumber: 4,
                confidence: 93,
                isHandwritten: true,
                formatType: 'Transport Bilty / LR',
                handwrittenFields: ['Consignment Number', 'Freight Charges', 'Truck Reg No'],
                itemsSummary: 'Interstate Heavy Freight (Goods Transport Agency under RCM 5%)',
                notes: 'Handwritten Lorry Receipt with GTA Reverse Charge detected (Page 4)',
              },
              {
                id: `scanned_demo_${Date.now()}_5`,
                source: 'books',
                gstin: '06AAACL2710H1ZF',
                vendorName: 'Reliance Retail Fuels & Lubes',
                billToGstin: activeG,
                billToName: activeN,
                isGstInvoice: true,
                gstComplianceStatus: 'VALID_GST_INVOICE',
                gstComplianceNote: 'Valid GST Retail Tax Invoice: 3-inch thermal POS receipt with complete statutory breakdown.',
                invoiceNumber: 'POS-TX-7021',
                rawInvoiceNumber: 'TXN# 7021 / PUMP 04',
                invoiceDate: '2024-10-27',
                invoiceType: 'B2B',
                taxableValue: 310000,
                igst: 55800,
                cgst: 0,
                sgst: 0,
                cess: 0,
                totalTax: 55800,
                invoiceValue: 365800,
                placeOfSupply: '06-Haryana',
                reverseCharge: false,
                itcAvailable: true,
                financialYear: targetFY,
                taxPeriod: targetMonth !== 'ALL' ? targetMonth : '10',
                pageNumber: 5,
                confidence: 95,
                isHandwritten: false,
                formatType: 'Thermal POS Receipt',
                handwrittenFields: [],
                itemsSummary: 'Industrial Generator Diesel & Lubricants (3-inch Thermal Roll)',
                notes: 'Thermal POS cash memo optical parsing from Page 5',
              },
              {
                id: `scanned_demo_${Date.now()}_6`,
                source: 'books',
                gstin: 'UNREGISTERED',
                vendorName: 'Shree Sai Print & Xerox Proforma',
                billToGstin: 'NONE',
                billToName: 'M/s Cash Customer',
                isGstInvoice: false,
                gstComplianceStatus: 'NON_GST_DOCUMENT',
                gstComplianceNote: '⛔ REJECTED: Non-GST Document (Proforma Quotation / Cash Slip). Does not satisfy Section 31 Tax Invoice requirements under CGST Act.',
                invoiceNumber: 'QUOT-902',
                rawInvoiceNumber: 'Estimate Slip #902',
                invoiceDate: '2024-10-29',
                invoiceType: 'NON_GST',
                taxableValue: 18500,
                igst: 0,
                cgst: 0,
                sgst: 0,
                cess: 0,
                totalTax: 0,
                invoiceValue: 18500,
                placeOfSupply: '27-Maharashtra',
                reverseCharge: false,
                itcAvailable: false,
                financialYear: targetFY,
                taxPeriod: targetMonth !== 'ALL' ? targetMonth : '10',
                pageNumber: 6,
                confidence: 90,
                isHandwritten: true,
                formatType: 'Non-GST Estimate / Quotation',
                handwrittenFields: ['Slip No', 'Amount'],
                itemsSummary: 'Handwritten Xerox & Binding Estimate (No GSTIN / Non-Tax Document)',
                notes: 'Non-GST Quotation rejected from purchase register ingestion (Page 6)',
              },
            ]
          : [
              {
                id: `scanned_hw_${Date.now()}_1`,
                source: 'books',
                gstin: '27AAOFM2914K1ZK',
                vendorName: 'Mahalaxmi Electrical & Winding Works',
                billToGstin: activeG,
                billToName: activeN,
                isGstInvoice: true,
                gstComplianceStatus: 'VALID_GST_INVOICE',
                gstComplianceNote: 'Valid Statutory GST Tax Invoice: Handwritten carbon copy with balanced CGST/SGST and matched Bill-To GSTIN.',
                invoiceNumber: 'MEM-88',
                rawInvoiceNumber: 'Book 04 / No. 88',
                invoiceDate: '2024-10-08',
                invoiceType: 'B2B',
                taxableValue: 42000,
                igst: 0,
                cgst: 3780,
                sgst: 3780,
                cess: 0,
                totalTax: 7560,
                invoiceValue: 49560,
                placeOfSupply: '27-Maharashtra',
                reverseCharge: false,
                itcAvailable: true,
                financialYear: targetFY,
                taxPeriod: targetMonth !== 'ALL' ? targetMonth : '10',
                pageNumber: 1,
                confidence: 93,
                isHandwritten: true,
                formatType: 'Handwritten Bill Book',
                handwrittenFields: ['Bill No', 'Date', 'Copper Wire Qty', 'Amount in Words'],
                itemsSummary: 'Handwritten 3-Phase Motor Rewinding & Copper Wire',
                notes: 'Deciphered blue ballpoint handwriting and rubber stamp seal (Page 1)',
              },
              {
                id: `scanned_hw_${Date.now()}_2`,
                source: 'books',
                gstin: '27BBAPB1190E1ZH',
                vendorName: 'Bhagwati Job Work & Engineering',
                billToGstin: activeG,
                billToName: activeN,
                isGstInvoice: true,
                gstComplianceStatus: 'VALID_GST_INVOICE',
                gstComplianceNote: 'Valid Statutory GST Jobwork Invoice: Decoded Rule 55 delivery challan and tax heads.',
                invoiceNumber: 'JW-512',
                rawInvoiceNumber: 'Challan #512',
                invoiceDate: '2024-10-14',
                invoiceType: 'B2B',
                taxableValue: 68000,
                igst: 0,
                cgst: 4080,
                sgst: 4080,
                cess: 0,
                totalTax: 8160,
                invoiceValue: 76160,
                placeOfSupply: '27-Maharashtra',
                reverseCharge: false,
                itcAvailable: true,
                financialYear: targetFY,
                taxPeriod: targetMonth !== 'ALL' ? targetMonth : '10',
                pageNumber: 2,
                confidence: 92,
                isHandwritten: true,
                formatType: 'Jobwork Challan',
                handwrittenFields: ['Challan No', 'Labour Charges', 'SAC Code'],
                itemsSummary: 'CNC Lathe Precision Turning & Jobwork Charges',
                notes: 'Rule 55 handwritten delivery challan & tax invoice decoded (Page 2)',
              },
              {
                id: `scanned_hw_${Date.now()}_3`,
                source: 'books',
                gstin: '07AAAFK8821Q1Z9',
                vendorName: 'Khurana Packers & Logistics',
                billToGstin: '07AABCA1234F1Z9', // Mismatched Branch GSTIN!
                billToName: 'Acme Technologies (Delhi Office)',
                isGstInvoice: true,
                gstComplianceStatus: 'BILL_TO_MISMATCH',
                gstComplianceNote: `⚠️ STATUTORY DISCLAIMER (Section 16(2) CGST Act): Billed to Delhi Office GSTIN (07AABCA1234F1Z9) rather than active registration (${activeG}). ITC cannot be claimed here.`,
                invoiceNumber: 'KPL-331',
                rawInvoiceNumber: 'Bilty No. 331',
                invoiceDate: '2024-10-25',
                invoiceType: 'B2BUR',
                taxableValue: 28000,
                igst: 1400,
                cgst: 0,
                sgst: 0,
                cess: 0,
                totalTax: 1400,
                invoiceValue: 29400,
                placeOfSupply: '07-Delhi',
                reverseCharge: true,
                itcAvailable: false,
                financialYear: targetFY,
                taxPeriod: targetMonth !== 'ALL' ? targetMonth : '10',
                pageNumber: 3,
                confidence: 91,
                isHandwritten: true,
                formatType: 'Transport Bilty / LR',
                handwrittenFields: ['Consignment No', 'Station From/To', 'Freight Amount'],
                itemsSummary: 'Handwritten Cargo Cartage & Freight (GTA under RCM 5%)',
                notes: 'Handwritten triplicate bilty with RCM applicability (Page 3)',
              },
            ];

      setExtractedInvoices(sampleInvoices);
      setDocumentSummary(
        sampleType === 'diverse'
          ? `Extracted 6 vendor documents. Identified Supplier & Bill-To GSTINs. 4 Valid GST Invoices matched to ${activeG}; 1 Bill-To Mismatch flagged under Sec 16(2); 1 Non-GST Document rejected under Sec 31.`
          : `Extracted 3 handwritten vendor bills. Identified Supplier & Bill-To GSTINs with cursive digit predictions and tax head decomposition.`
      );
      setTotalPages(sampleInvoices.length);
      setIsAiPowered(true);
      setUsedModel('gemini-3.7-flash (Multimodal Vision & GST Compliance)');
      setIsProcessing(false);
    }, 1100);
  };

  // Delete an extracted item
  const handleDeleteInvoice = (id: string) => {
    setExtractedInvoices((prev) => prev.filter((item) => item.id !== id));
  };

  // Save edited invoice
  const handleSaveEdit = () => {
    if (!editingInvoice) return;
    const totalTax =
      Number(editingInvoice.igst || 0) +
      Number(editingInvoice.cgst || 0) +
      Number(editingInvoice.sgst || 0) +
      Number(editingInvoice.cess || 0);
    const invoiceValue = Number(editingInvoice.taxableValue || 0) + totalTax;

    // Recalculate compliance status based on billToGstin
    const cleanActiveG = (companyGstin || '').trim().toUpperCase();
    const cleanBillToG = (editingInvoice.billToGstin || '').trim().toUpperCase();

    let complianceStatus = editingInvoice.gstComplianceStatus || 'VALID_GST_INVOICE';
    let complianceNote = editingInvoice.gstComplianceNote;
    let itcEligible = editingInvoice.itcAvailable;

    if (!editingInvoice.isGstInvoice) {
      complianceStatus = 'NON_GST_DOCUMENT';
      complianceNote = '⛔ REJECTED: Non-GST Document (Quotation/Estimate). Ineligible for ITC under Sec 31.';
      itcEligible = false;
    } else if (cleanBillToG && cleanActiveG && cleanBillToG !== cleanActiveG) {
      complianceStatus = 'BILL_TO_MISMATCH';
      complianceNote = `⚠️ STATUTORY DISCLAIMER (Section 16(2) CGST Act): Billed to GSTIN ${cleanBillToG} instead of active entity (${cleanActiveG}). ITC disallowed under this registration.`;
      itcEligible = false;
    } else if (cleanBillToG && cleanBillToG === cleanActiveG) {
      complianceStatus = 'VALID_GST_INVOICE';
      complianceNote = `Valid GST Tax Invoice: Billed to active entity (${cleanActiveG}). Eligible under Sec 16(2).`;
      itcEligible = true;
    }

    const updated: InvoiceRecord = {
      ...editingInvoice,
      totalTax: Math.round(totalTax * 100) / 100,
      invoiceValue: Math.round(invoiceValue * 100) / 100,
      gstComplianceStatus: complianceStatus,
      gstComplianceNote: complianceNote,
      itcAvailable: itcEligible,
    };

    setExtractedInvoices((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    setEditingInvoice(null);
  };

  // Download Extracted Purchase Register as CSV
  const handleDownloadCsv = () => {
    if (extractedInvoices.length === 0) return;

    const headers = [
      'Supplier GSTIN',
      'Supplier Trade Name',
      'Bill-To GSTIN',
      'Bill-To Recipient Name',
      'GST Compliance Status',
      'Compliance Statutory Note',
      'Invoice Number',
      'Invoice Date',
      'Invoice Type',
      'Taxable Value (Rs.)',
      'Integrated Tax (Rs.)',
      'Central Tax (Rs.)',
      'State/UT Tax (Rs.)',
      'Cess (Rs.)',
      'Total Tax (Rs.)',
      'Invoice Value (Rs.)',
      'Place of Supply',
      'Reverse Charge',
      'ITC Eligibility',
      'Format Type',
      'Is Handwritten',
      'Predicted Fields',
      'Page Number',
      'OCR Confidence',
      'Items Description',
    ];

    const rows = extractedInvoices.map((inv) => [
      `"${inv.gstin}"`,
      `"${inv.vendorName.replace(/"/g, '""')}"`,
      `"${inv.billToGstin || ''}"`,
      `"${(inv.billToName || '').replace(/"/g, '""')}"`,
      `"${inv.gstComplianceStatus || 'VALID_GST_INVOICE'}"`,
      `"${(inv.gstComplianceNote || '').replace(/"/g, '""')}"`,
      `"${inv.invoiceNumber}"`,
      `"${inv.invoiceDate}"`,
      `"${inv.invoiceType || 'B2B'}"`,
      inv.taxableValue,
      inv.igst,
      inv.cgst,
      inv.sgst,
      inv.cess,
      inv.totalTax,
      inv.invoiceValue,
      `"${inv.placeOfSupply || ''}"`,
      inv.reverseCharge ? 'Y' : 'N',
      inv.itcAvailable ? 'Eligible' : 'Ineligible',
      `"${inv.formatType || 'Computerized ERP'}"`,
      inv.isHandwritten ? 'Yes' : 'No',
      `"${(inv.handwrittenFields || []).join('; ')}"`,
      inv.pageNumber || 1,
      `${inv.confidence || 95}%`,
      `"${(inv.itemsSummary || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Scanned_Purchase_Register_${targetFY.replace(/\s+/g, '_')}_${Date.now()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Final Ingestion into Books & Trigger Reconciliation
  const handleConfirmAndReconcile = () => {
    if (extractedInvoices.length === 0) return;

    // Filter out Non-GST documents if onlyValidGstIngestion is checked
    let eligibleList = extractedInvoices;
    if (onlyValidGstIngestion) {
      eligibleList = extractedInvoices.filter((inv) => inv.isGstInvoice !== false && inv.gstComplianceStatus !== 'NON_GST_DOCUMENT');
    }

    if (eligibleList.length === 0) {
      setErrorMsg('No valid GST invoices found to ingest. All scanned documents are non-GST or rejected.');
      return;
    }

    const finalInvoices = eligibleList.map((inv) => {
      const detectedFY = extractInvoiceFY(inv.invoiceDate);
      const detectedM = extractInvoiceMonth(inv.invoiceDate);

      return {
        ...inv,
        financialYear: autoDetectPeriod && detectedFY ? detectedFY : targetFY,
        taxPeriod:
          autoDetectPeriod && detectedM
            ? detectedM
            : targetMonth !== 'ALL'
            ? targetMonth
            : detectedM || 'ALL',
      };
    });

    onInvoicesExtracted(finalInvoices, ingestMode, targetFY, targetMonth);
  };

  // Compliance Metrics
  const validGstCount = extractedInvoices.filter((i) => i.isGstInvoice !== false && i.gstComplianceStatus === 'VALID_GST_INVOICE').length;
  const billToMismatchCount = extractedInvoices.filter((i) => i.gstComplianceStatus === 'BILL_TO_MISMATCH').length;
  const nonGstCount = extractedInvoices.filter((i) => i.isGstInvoice === false || i.gstComplianceStatus === 'NON_GST_DOCUMENT').length;
  const missingBillToCount = extractedInvoices.filter((i) => i.gstComplianceStatus === 'MISSING_BILL_TO').length;

  const totalTaxable = extractedInvoices.reduce((acc, i) => acc + (i.taxableValue || 0), 0);
  const totalTax = extractedInvoices.reduce((acc, i) => acc + (i.totalTax || 0), 0);
  const totalValue = extractedInvoices.reduce((acc, i) => acc + (i.invoiceValue || 0), 0);
  const eligibleTax = extractedInvoices
    .filter((i) => i.itcAvailable !== false && i.gstComplianceStatus === 'VALID_GST_INVOICE')
    .reduce((acc, i) => acc + (i.totalTax || 0), 0);

  const handwrittenCount = extractedInvoices.filter((i) => i.isHandwritten).length;
  const avgConfidence =
    extractedInvoices.length > 0
      ? Math.round(
          extractedInvoices.reduce((acc, i) => acc + (i.confidence || 95), 0) /
            extractedInvoices.length
        )
      : 0;

  // Filtered list
  const filteredList = extractedInvoices.filter((inv) => {
    // Compliance & format filter
    if (complianceFilter === 'valid' && inv.gstComplianceStatus !== 'VALID_GST_INVOICE') return false;
    if (complianceFilter === 'mismatch' && inv.gstComplianceStatus !== 'BILL_TO_MISMATCH') return false;
    if (complianceFilter === 'non_gst' && inv.isGstInvoice !== false && inv.gstComplianceStatus !== 'NON_GST_DOCUMENT') return false;
    if (complianceFilter === 'handwritten' && !inv.isHandwritten) return false;
    if (complianceFilter === 'erp' && (inv.isHandwritten || inv.formatType?.includes('Thermal') || inv.formatType?.includes('Transport'))) return false;
    if (complianceFilter === 'transport' && !inv.formatType?.includes('Transport')) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.vendorName.toLowerCase().includes(q) ||
      inv.gstin.toLowerCase().includes(q) ||
      (inv.billToGstin || '').toLowerCase().includes(q) ||
      (inv.billToName || '').toLowerCase().includes(q) ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.formatType || '').toLowerCase().includes(q) ||
      (inv.itemsSummary || '').toLowerCase().includes(q) ||
      (inv.gstComplianceNote || '').toLowerCase().includes(q)
    );
  });

  return (
    <div id="scanned-pdf-parser-container" className="space-y-6">
      {/* Informative Banner */}
      <div className="bg-[#EDF3EF] border border-[#D5E2D9] rounded-2xl p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#2D4A3E] text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[#8DA173]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xs md:text-sm font-bold text-[#1A2E25]">
                AI Multimodal Scanner, Handwriting OCR & Multi-GSTIN Verifier
              </h4>
              <span className="text-[10px] font-bold bg-[#8DA173]/20 text-[#2D4A3E] px-2 py-0.5 rounded-md">
                Gemini 3.7 Flash Vision
              </span>
              <span className="text-[10px] font-bold bg-[#2D4A3E] text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#8DA173]" />
                Section 16(2) & 31 Enforced
              </span>
            </div>
            <p className="text-xs text-[#56655A] mt-1 leading-relaxed">
              Processes <strong>diverse vendor formats</strong> (Tally/SAP ERP bills, <strong>handwritten carbon-copy bill books</strong>, 3-inch thermal POS receipts, transport bilties). Identifies both <strong>Supplier GSTIN</strong> and <strong>Bill-To (Recipient) GSTIN</strong>, validates against active entity (<strong>{companyGstin}</strong>), flags Section 16(2) mismatches, and enforces statutory GST invoice acceptance.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-right">
          <span className="text-[10px] font-mono font-bold bg-white text-[#2D4A3E] px-2.5 py-1 rounded-full border border-[#D5E2D9]">
            Active Entity: {companyGstin}
          </span>
          <span className="text-[10px] text-[#738276]">{companyName}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-[#FCF0EE] border border-[#C75D4E]/30 text-[#C75D4E] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Zone (Visible if no invoices extracted or user wants to re-upload) */}
      {extractedInvoices.length === 0 && (
        <div className="space-y-4">
          {/* Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFilesSelected(e.dataTransfer.files);
            }}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragging
                ? 'border-[#2D4A3E] bg-[#EDF3EF] ring-2 ring-[#8DA173]/40'
                : 'border-[#D5E2D9] hover:border-[#8DA173] bg-[#FAFBF9]'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-[#E0E4DE] shadow-xs flex items-center justify-center mx-auto mb-3">
              <UploadCloud className={`w-6 h-6 ${isDragging ? 'text-[#2D4A3E] animate-bounce' : 'text-[#8DA173]'}`} />
            </div>

            <h5 className="text-xs md:text-sm font-bold text-[#2D4A3E]">
              {uploadedFiles.length > 0
                ? `${uploadedFiles.length} Scanned Document${uploadedFiles.length > 1 ? 's' : ''} Selected`
                : 'Drag & Drop your Merged Invoices PDF or Scanned Images'}
            </h5>
            <p className="text-xs text-[#738276] mt-1 max-w-lg mx-auto">
              Upload multi-page merged PDFs or multiple images (computerized ERP bills, handwritten bill books, transport bilties, thermal slips) up to 25MB each.
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <label
                htmlFor="pdf-scanned-input"
                className="px-4 py-2 bg-white border border-[#E0E4DE] hover:border-[#8DA173] text-[#2D4A3E] rounded-xl text-xs font-bold shadow-xs cursor-pointer hover:bg-[#F7F8F6] transition-all inline-flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-[#8DA173]" />
                <span>{uploadedFiles.length > 0 ? 'Select More Files' : 'Select PDF / Image Files'}</span>
              </label>
              <input
                id="pdf-scanned-input"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.webp,.tiff"
                onChange={(e) => handleFilesSelected(e.target.files)}
                className="hidden"
              />

              {isAdmin && (
                <>
                  <button
                    id="btn-try-sample-scanned-pdf"
                    onClick={() => handleLoadSamplePdf('diverse')}
                    disabled={isProcessing}
                    className="px-3.5 py-2 bg-[#EDF3EF] hover:bg-[#D5E2D9] text-[#2D4A3E] border border-[#D5E2D9] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span>Sample 1: Mixed 6-Vendor Invoices (Admin Demo)</span>
                  </button>

                  <button
                    id="btn-try-handwritten-sample-pdf"
                    onClick={() => handleLoadSamplePdf('handwritten')}
                    disabled={isProcessing}
                    className="px-3.5 py-2 bg-[#FAF4EB] hover:bg-[#F3E8D5] text-[#915B1E] border border-[#E8D9C0] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <PenTool className="w-3.5 h-3.5 text-[#B37B2E]" />
                    <span>Sample 2: Handwritten Bill Books (Admin Demo)</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Attached Files List (if any selected) */}
          {uploadedFiles.length > 0 && (
            <div className="bg-white border border-[#D5E2D9] rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2D4A3E] flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-[#8DA173]" />
                  Attached Documents ({uploadedFiles.length})
                </span>
                <button
                  onClick={() => {
                    setUploadedFiles([]);
                    setSelectedFile(null);
                    setFileBase64(null);
                  }}
                  className="text-[11px] text-[#C75D4E] hover:underline font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {uploadedFiles.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#F7F8F6] border border-[#E0E4DE] text-xs text-[#2D4A3E]"
                  >
                    <FileIcon className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span className="font-medium max-w-[200px] truncate">{doc.name}</span>
                    <span className="text-[10px] text-[#738276] font-mono">({(doc.size / 1024).toFixed(1)} KB)</span>
                    <button
                      onClick={() => handleRemoveDoc(doc.id)}
                      className="p-0.5 hover:bg-[#E0E4DE] rounded-full text-[#738276] hover:text-[#C75D4E] transition-colors cursor-pointer"
                      title="Remove file"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Period Assignment Toolbar */}
          <div className="bg-[#F7F8F6] border border-[#E0E4DE] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[#2D4A3E] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#8DA173]" /> Target Period:
              </span>
              <select
                value={targetFY}
                onChange={(e) => setTargetFY(e.target.value)}
                className="bg-white border border-[#E0E4DE] text-xs font-semibold text-[#1A2E25] px-2 py-1 rounded-lg focus:outline-none"
              >
                {FINANCIAL_YEARS.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
              <select
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="bg-white border border-[#E0E4DE] text-xs font-semibold text-[#1A2E25] px-2 py-1 rounded-lg focus:outline-none"
              >
                {GST_MONTHS.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-[11px] text-[#56655A] font-mono bg-white px-2 py-1 rounded-lg border border-[#E0E4DE]">
                <span className="text-[#738276]">Recon Entity:</span>
                <strong className="text-[#2D4A3E]">{companyGstin}</strong>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-[#56655A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDetectPeriod}
                  onChange={(e) => setAutoDetectPeriod(e.target.checked)}
                  className="w-3.5 h-3.5 text-[#2D4A3E] rounded border-[#E0E4DE]"
                />
                <span>Auto-detect FY and Month from scanned dates</span>
              </label>
            </div>
          </div>

          {/* Primary Action Button Container */}
          <div className="bg-[#FAFBF9] border border-[#8DA173]/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#56655A]">
              {uploadedFiles.length > 0 ? (
                <span>
                  <strong>{uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''}</strong> ready. Gemini 3.7 Flash will extract all line items, tax heads, and verify Buyer GSTIN vs <strong>{companyGstin}</strong>.
                </span>
              ) : (
                <span>
                  Select or drag-and-drop scanned invoice files above, then click Process to run AI extraction.
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
              <button
                id="btn-run-pdf-extraction"
                onClick={handleExtractInvoices}
                disabled={isProcessing || (uploadedFiles.length === 0 && !fileBase64 && !selectedFile)}
                className="w-full sm:w-auto px-7 py-3 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs md:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-[#8DA173]" />
                <span>
                  {isProcessing
                    ? 'Processing Invoices...'
                    : uploadedFiles.length > 0
                    ? `Process & Extract Invoices (${uploadedFiles.length} File${uploadedFiles.length > 1 ? 's' : ''})`
                    : 'Process & Extract Invoices'}
                </span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing Animation */}
      {isProcessing && (
        <div className="bg-white border border-[#E0E4DE] rounded-2xl p-6 shadow-xs space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#8DA173] animate-spin" />
              <span className="text-xs font-bold text-[#2D4A3E]">{statusMessage}</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#8DA173]">Step {processingStep} of 4</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#F1F3EE] rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#8DA173] h-full transition-all duration-500 rounded-full"
              style={{ width: `${processingStep * 25}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 text-[11px] text-[#738276]">
            <div className={`p-2 rounded-lg ${processingStep >= 1 ? 'bg-[#EDF3EF] text-[#2D4A3E] font-bold' : ''}`}>
              1. Ingest PDF Stream
            </div>
            <div className={`p-2 rounded-lg ${processingStep >= 2 ? 'bg-[#EDF3EF] text-[#2D4A3E] font-bold' : ''}`}>
              2. Multimodal OCR & Handwriting
            </div>
            <div className={`p-2 rounded-lg ${processingStep >= 3 ? 'bg-[#EDF3EF] text-[#2D4A3E] font-bold' : ''}`}>
              3. Supplier vs Bill-To GSTIN Verification
            </div>
            <div className={`p-2 rounded-lg ${processingStep >= 4 ? 'bg-[#EDF3EF] text-[#2D4A3E] font-bold' : ''}`}>
              4. Generate Purchase Register
            </div>
          </div>
        </div>
      )}

      {/* Extracted Invoices Review Staging Area */}
      {extractedInvoices.length > 0 && !isProcessing && (
        <div className="space-y-5">
          {/* Prominent Top Action Header */}
          <div className="bg-[#2D4A3E] text-white rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-[#8DA173]" />
              </div>
              <div>
                <h4 className="text-sm md:text-base font-bold">
                  Extracted {extractedInvoices.length} Invoice{extractedInvoices.length > 1 ? 's' : ''} ({validGstCount} Valid, {billToMismatchCount} Mismatch, {nonGstCount} Non-GST)
                </h4>
                <p className="text-xs text-white/80 mt-0.5">
                  Target: {targetFY} • {targetMonth} | Recon Entity: {companyGstin}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                id="btn-reupload-scanned-docs"
                onClick={() => {
                  setExtractedInvoices([]);
                  setUploadedFiles([]);
                  setSelectedFile(null);
                  setFileBase64(null);
                }}
                className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Upload Other Files</span>
              </button>

              <button
                id="btn-download-scanned-csv-top"
                onClick={handleDownloadCsv}
                className="px-3.5 py-2 bg-white text-[#2D4A3E] hover:bg-[#F1F3EE] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Export CSV</span>
              </button>

              <button
                id="btn-confirm-reconcile-top"
                onClick={handleConfirmAndReconcile}
                className="px-5 py-2 bg-[#8DA173] hover:bg-[#7A8E61] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Ingest & Reconcile ({onlyValidGstIngestion ? validGstCount : extractedInvoices.length} Records)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* Statutory Compliance Notice Banner if Mismatches or Non-GST Documents are present */}
          {(billToMismatchCount > 0 || nonGstCount > 0) && (
            <div className="bg-[#FFFDF6] border border-[#D9A14E]/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-[#B37B2E] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-[#915B1E]">
                      GST Compliance & Statutory Notice: {billToMismatchCount} Bill-To GSTIN Mismatch{billToMismatchCount > 1 ? 'es' : ''} & {nonGstCount} Non-GST Document{nonGstCount > 1 ? 's' : ''} Identified
                    </h4>
                    <p className="text-xs text-[#6B5532] mt-0.5 leading-relaxed">
                      <strong>Section 16(2) CGST Act, 2017 Requirement:</strong> A registered buyer can only claim Input Tax Credit (ITC) if the tax invoice is explicitly issued to their registered entity GSTIN (<strong>{companyGstin}</strong>). Invoices billed to other branches/entities or non-GST estimates cannot be claimed under this registration.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-[#FAF4EB] text-[#915B1E] border border-[#E8D9C0]">
                    {billToMismatchCount} Mismatch Disclaimers
                  </span>
                  {nonGstCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded bg-[#FCF0EE] text-[#C75D4E] border border-[#C75D4E]/30">
                      {nonGstCount} Non-GST Rejected
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white border border-[#E0E4DE] p-3.5 rounded-xl shadow-xs">
              <div className="text-[11px] text-[#738276] font-semibold">Total Documents</div>
              <div className="text-lg font-bold text-[#1A2E25] mt-0.5 flex items-baseline gap-1.5">
                <span>{extractedInvoices.length}</span>
                <span className="text-[10px] text-[#8DA173] font-normal">({totalPages} pages)</span>
              </div>
              <div className="text-[10px] text-[#738276] mt-1">
                ✍️ {handwrittenCount} Handwritten / {extractedInvoices.length - handwrittenCount} Computerized
              </div>
            </div>

            <div className="bg-white border border-[#E0E4DE] p-3.5 rounded-xl shadow-xs">
              <div className="text-[11px] text-[#738276] font-semibold">Valid GST Invoices</div>
              <div className="text-lg font-bold text-[#2D4A3E] mt-0.5 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#8DA173]" />
                <span>{validGstCount}</span>
              </div>
              <div className="text-[10px] text-[#8DA173] mt-1 font-medium">
                Billed to {companyGstin.slice(0, 8)}...
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border shadow-xs ${billToMismatchCount > 0 ? 'bg-[#FFFDF6] border-[#D9A14E]/40' : 'bg-white border-[#E0E4DE]'}`}>
              <div className="text-[11px] text-[#915B1E] font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Bill-To Mismatches</span>
              </div>
              <div className="text-lg font-bold text-[#915B1E] mt-0.5 font-mono">
                {billToMismatchCount}
              </div>
              <div className="text-[10px] text-[#915B1E] mt-1">
                Section 16(2) Disclaimer
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border shadow-xs ${nonGstCount > 0 ? 'bg-[#FCF0EE] border-[#C75D4E]/30' : 'bg-white border-[#E0E4DE]'}`}>
              <div className="text-[11px] text-[#C75D4E] font-semibold flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Non-GST Documents</span>
              </div>
              <div className="text-lg font-bold text-[#C75D4E] mt-0.5 font-mono">
                {nonGstCount}
              </div>
              <div className="text-[10px] text-[#C75D4E] mt-1">
                Rejected under Sec 31
              </div>
            </div>

            <div className="bg-white border border-[#E0E4DE] p-3.5 rounded-xl shadow-xs">
              <div className="text-[11px] text-[#738276] font-semibold">Eligible ITC (Valid Invoices)</div>
              <div className="text-lg font-bold text-[#8DA173] mt-0.5 font-mono">
                ₹{eligibleTax.toLocaleString('en-IN')}
              </div>
              <div className="text-[10px] text-[#738276] mt-1">
                Gross: ₹{totalValue.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Document Summary Note */}
          <div className="bg-[#FAFBF9] border border-[#E0E4DE] rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#56655A]">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#8DA173] shrink-0" />
              <span>{documentSummary}</span>
            </div>
            {usedModel && (
              <span className="text-[10px] font-mono bg-white border border-[#E0E4DE] px-2 py-0.5 rounded text-[#2D4A3E] font-bold">
                {usedModel}
              </span>
            )}
          </div>

          {/* Compliance & Format Filter Chips & Search Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setComplianceFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  complianceFilter === 'all'
                    ? 'bg-[#2D4A3E] text-white shadow-xs'
                    : 'bg-white border border-[#E0E4DE] text-[#56655A] hover:bg-[#F7F8F6]'
                }`}
              >
                All ({extractedInvoices.length})
              </button>

              <button
                onClick={() => setComplianceFilter('valid')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  complianceFilter === 'valid'
                    ? 'bg-[#2D4A3E] text-white shadow-xs'
                    : 'bg-white border border-[#E0E4DE] text-[#2D4A3E] hover:bg-[#EDF3EF]'
                }`}
              >
                <CheckCircle className="w-3 h-3 text-[#8DA173]" />
                <span>Valid GST ({validGstCount})</span>
              </button>

              {billToMismatchCount > 0 && (
                <button
                  onClick={() => setComplianceFilter('mismatch')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    complianceFilter === 'mismatch'
                      ? 'bg-[#915B1E] text-white shadow-xs'
                      : 'bg-[#FAF4EB] border border-[#E8D9C0] text-[#915B1E] hover:bg-[#F3E8D5]'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Bill-To Mismatch ({billToMismatchCount})</span>
                </button>
              )}

              {nonGstCount > 0 && (
                <button
                  onClick={() => setComplianceFilter('non_gst')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    complianceFilter === 'non_gst'
                      ? 'bg-[#C75D4E] text-white shadow-xs'
                      : 'bg-[#FCF0EE] border border-[#C75D4E]/30 text-[#C75D4E] hover:bg-[#FBE8E5]'
                  }`}
                >
                  <XCircle className="w-3 h-3" />
                  <span>Non-GST ({nonGstCount})</span>
                </button>
              )}

              <button
                onClick={() => setComplianceFilter('handwritten')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  complianceFilter === 'handwritten'
                    ? 'bg-[#915B1E] text-white shadow-xs'
                    : 'bg-white border border-[#E0E4DE] text-[#915B1E] hover:bg-[#FAF4EB]'
                }`}
              >
                <PenTool className="w-3 h-3" />
                <span>Handwritten ({handwrittenCount})</span>
              </button>

              <button
                onClick={() => setComplianceFilter('erp')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  complianceFilter === 'erp'
                    ? 'bg-[#2D4A3E] text-white shadow-xs'
                    : 'bg-white border border-[#E0E4DE] text-[#2D4A3E] hover:bg-[#EDF3EF]'
                }`}
              >
                <Building className="w-3 h-3" />
                <span>Computerized ERP</span>
              </button>

              <button
                onClick={() => setComplianceFilter('transport')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  complianceFilter === 'transport'
                    ? 'bg-[#3A506B] text-white shadow-xs'
                    : 'bg-white border border-[#E0E4DE] text-[#3A506B] hover:bg-[#F0F4F8]'
                }`}
              >
                <Truck className="w-3 h-3" />
                <span>Transport Bilties</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#738276] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search vendor, Bill-To GSTIN, format..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 text-xs border border-[#E0E4DE] rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#8DA173] w-52"
                />
              </div>

              <button
                onClick={handleDownloadCsv}
                className="px-3 py-1 bg-white border border-[#E0E4DE] hover:border-[#8DA173] text-[#2D4A3E] rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={() => {
                  setExtractedInvoices([]);
                  setSelectedFile(null);
                  setFileBase64(null);
                }}
                className="px-3 py-1 text-xs text-[#738276] hover:text-[#C75D4E] transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Invoices Table with Supplier GSTIN, Bill-To GSTIN & Compliance Badge */}
          <div className="border border-[#E0E4DE] rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#F7F8F6] text-[#56655A] sticky top-0 border-b border-[#E0E4DE] z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Pg</th>
                    <th className="py-2.5 px-3 font-bold">Format & OCR Type</th>
                    <th className="py-2.5 px-3 font-bold">Supplier (Seller) GSTIN</th>
                    <th className="py-2.5 px-3 font-bold">Bill-To (Buyer) GSTIN & Compliance</th>
                    <th className="py-2.5 px-3 font-bold">Invoice No</th>
                    <th className="py-2.5 px-3 font-bold">Date</th>
                    <th className="py-2.5 px-3 font-bold text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-3 font-bold text-right">IGST (₹)</th>
                    <th className="py-2.5 px-3 font-bold text-right">CGST+SGST</th>
                    <th className="py-2.5 px-3 font-bold text-right">Total Tax (₹)</th>
                    <th className="py-2.5 px-3 font-bold text-right">Gross (₹)</th>
                    <th className="py-2.5 px-3 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0E4DE]/60">
                  {filteredList.map((inv) => {
                    const isGstinValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
                      inv.gstin
                    );

                    const isBillToMatch = inv.gstComplianceStatus === 'VALID_GST_INVOICE';
                    const isBillToMismatch = inv.gstComplianceStatus === 'BILL_TO_MISMATCH';
                    const isNonGst = inv.isGstInvoice === false || inv.gstComplianceStatus === 'NON_GST_DOCUMENT';

                    return (
                      <tr
                        key={inv.id}
                        className={`transition-colors ${
                          isBillToMismatch
                            ? 'bg-[#FFFDF6] hover:bg-[#FFF8EE]'
                            : isNonGst
                            ? 'bg-[#FCF0EE]/40 hover:bg-[#FCF0EE]/70'
                            : 'hover:bg-[#FAFBF9]'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#738276]">
                          P.{inv.pageNumber || 1}
                        </td>

                        {/* Format & Handwriting Intelligence Column */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col gap-1">
                            {inv.isHandwritten ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FAF4EB] text-[#915B1E] border border-[#E8D9C0]/60 w-fit">
                                <PenTool className="w-2.5 h-2.5" />
                                <span>Handwritten</span>
                              </span>
                            ) : inv.formatType === 'Thermal POS Receipt' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EEF4F8] text-[#2C5282] border border-[#D0E2EE] w-fit">
                                <Receipt className="w-2.5 h-2.5" />
                                <span>Thermal POS</span>
                              </span>
                            ) : inv.formatType === 'Transport Bilty / LR' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F0F4F8] text-[#3A506B] border border-[#D2DCE6] w-fit">
                                <Truck className="w-2.5 h-2.5" />
                                <span>Bilty / LR</span>
                              </span>
                            ) : inv.formatType === 'Non-GST Estimate / Quotation' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#FCF0EE] text-[#C75D4E] border border-[#C75D4E]/30 w-fit">
                                <XCircle className="w-2.5 h-2.5" />
                                <span>Non-GST Slip</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#EDF3EF] text-[#2D4A3E] border border-[#D5E2D9] w-fit">
                                <Building className="w-2.5 h-2.5" />
                                <span>ERP Tax Inv</span>
                              </span>
                            )}

                            {inv.handwrittenFields && inv.handwrittenFields.length > 0 && (
                              <span className="text-[9px] text-[#915B1E] truncate max-w-[120px]" title={`Predicted fields: ${inv.handwrittenFields.join(', ')}`}>
                                ✍️ {inv.handwrittenFields.slice(0, 2).join(', ')}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Supplier Details */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[#1A2E25]">
                            <span>{inv.gstin}</span>
                            {!isGstinValid && inv.gstin !== 'UNREGISTERED' && (
                              <span
                                title="Unconventional GSTIN format - auto-validated by AI"
                                className="w-1.5 h-1.5 rounded-full bg-[#D9A14E]"
                              />
                            )}
                          </div>
                          <div className="font-semibold text-[#1A2E25] truncate max-w-[150px]">
                            {inv.vendorName}
                          </div>
                          <div className="text-[10px] text-[#738276]">POS: {inv.placeOfSupply || 'N/A'}</div>
                        </td>

                        {/* Bill-To Recipient & Compliance Column */}
                        <td className="py-2.5 px-3">
                          <div className="flex flex-col gap-1">
                            <div className="font-mono text-[11px] font-bold text-[#1A2E25] flex items-center gap-1">
                              <span>{inv.billToGstin || 'Missing GSTIN'}</span>
                            </div>

                            {/* Compliance Status Badge */}
                            {isBillToMatch ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#EDF3EF] text-[#2D4A3E] border border-[#D5E2D9] w-fit">
                                <CheckCircle className="w-2.5 h-2.5 text-[#8DA173]" />
                                <span>Billed to Active Entity</span>
                              </span>
                            ) : isBillToMismatch ? (
                              <button
                                onClick={() => setSelectedDisclaimerInv(inv)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAF4EB] text-[#915B1E] border border-[#E8D9C0] w-fit cursor-pointer hover:bg-[#F3E8D5]"
                                title="Click to view Section 16(2) statutory disclaimer"
                              >
                                <AlertTriangle className="w-2.5 h-2.5 text-[#B37B2E]" />
                                <span>⚠️ Bill-To Mismatch (Sec 16(2))</span>
                              </button>
                            ) : isNonGst ? (
                              <button
                                onClick={() => setSelectedDisclaimerInv(inv)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-[#FCF0EE] text-[#C75D4E] border border-[#C75D4E]/30 w-fit cursor-pointer hover:bg-[#FBE8E5]"
                                title="Click to view rejection reason"
                              >
                                <XCircle className="w-2.5 h-2.5 text-[#C75D4E]" />
                                <span>⛔ Non-GST (Rejected Sec 31)</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-[#F7F8F6] text-[#738276] w-fit">
                                <span>Unverified Bill-To</span>
                              </span>
                            )}

                            {inv.billToName && (
                              <div className="text-[10px] text-[#56655A] truncate max-w-[150px]">
                                Recipient: {inv.billToName}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 font-mono font-medium text-[#2D4A3E]">
                          <div>{inv.invoiceNumber}</div>
                          {inv.rawInvoiceNumber && inv.rawInvoiceNumber !== inv.invoiceNumber && (
                            <div className="text-[9px] text-[#738276] font-mono">Raw: {inv.rawInvoiceNumber}</div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-[#56655A] font-mono text-[11px]">
                          {inv.invoiceDate}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-medium text-[#1A2E25]">
                          {inv.taxableValue.toLocaleString('en-IN')}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-[#56655A]">
                          {inv.igst ? inv.igst.toLocaleString('en-IN') : '-'}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-[#56655A]">
                          {inv.cgst || inv.sgst
                            ? (inv.cgst + inv.sgst).toLocaleString('en-IN')
                            : '-'}
                        </td>

                        <td className={`py-2.5 px-3 text-right font-mono font-bold ${isBillToMismatch || isNonGst ? 'text-[#915B1E] line-through decoration-[#915B1E]' : 'text-[#8DA173]'}`}>
                          {inv.totalTax.toLocaleString('en-IN')}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#1A2E25]">
                          {inv.invoiceValue.toLocaleString('en-IN')}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setEditingInvoice(inv)}
                              className="p-1 hover:bg-[#F1F3EE] rounded text-[#738276] hover:text-[#2D4A3E] cursor-pointer"
                              title="Edit record & Bill-To GSTIN"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(inv.id)}
                              className="p-1 hover:bg-[#FCF0EE] rounded text-[#738276] hover:text-[#C75D4E] cursor-pointer"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ingestion Options & Final Reconcile Trigger */}
          <div className="bg-[#FAFBF9] border border-[#E0E4DE] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#1A2E25]">Purchase Register Ingestion & Compliance Controls</div>
              
              <div className="flex flex-wrap items-center gap-5 text-xs text-[#56655A]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="ingest_mode"
                    value="replace"
                    checked={ingestMode === 'replace'}
                    onChange={() => setIngestMode('replace')}
                    className="text-[#2D4A3E]"
                  />
                  <span>Replace current Purchase Register</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="ingest_mode"
                    value="append"
                    checked={ingestMode === 'append'}
                    onChange={() => setIngestMode('append')}
                    className="text-[#2D4A3E]"
                  />
                  <span>Append to existing Purchase Register</span>
                </label>
              </div>

              {/* Strict GST Invoice Enforcer Toggle */}
              <label className="flex items-center gap-2 text-xs font-semibold text-[#2D4A3E] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={onlyValidGstIngestion}
                  onChange={(e) => setOnlyValidGstIngestion(e.target.checked)}
                  className="w-4 h-4 text-[#2D4A3E] rounded border-[#E0E4DE]"
                />
                <span>Enforce GST Invoice Acceptance: Filter out Non-GST documents automatically ({nonGstCount} document{nonGstCount === 1 ? '' : 's'} excluded)</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                id="btn-reconcile-scanned-invoices"
                onClick={handleConfirmAndReconcile}
                className="px-6 py-2.5 bg-[#8DA173] hover:bg-[#7A8E61] text-white rounded-xl text-xs md:text-sm font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Ingest Valid Purchase Records & Reconcile with GSTR-2B</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statutory Disclaimer / Note Modal */}
      {selectedDisclaimerInv && (
        <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E0E4DE] shadow-xl p-6 w-full max-w-md space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectedDisclaimerInv.gstComplianceStatus === 'BILL_TO_MISMATCH' ? (
                  <div className="w-8 h-8 rounded-lg bg-[#FAF4EB] text-[#915B1E] flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-[#FCF0EE] text-[#C75D4E] flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-[#1A2E25]">
                    {selectedDisclaimerInv.gstComplianceStatus === 'BILL_TO_MISMATCH'
                      ? 'Section 16(2) Bill-To Disclaimer'
                      : 'Non-GST Document Rejection Notice'}
                  </h4>
                  <p className="text-[11px] text-[#738276]">
                    Invoice #{selectedDisclaimerInv.invoiceNumber} • {selectedDisclaimerInv.vendorName}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FAFBF9] border border-[#E0E4DE] text-xs space-y-2">
              <div>
                <span className="text-[#738276] block text-[10px] uppercase font-bold">Supplier GSTIN</span>
                <span className="font-mono font-semibold text-[#1A2E25]">{selectedDisclaimerInv.gstin}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[#738276] block text-[10px] uppercase font-bold">Billed-To GSTIN on Bill</span>
                  <span className="font-mono font-bold text-[#915B1E]">{selectedDisclaimerInv.billToGstin || 'Missing / Non-GST'}</span>
                </div>
                <div>
                  <span className="text-[#738276] block text-[10px] uppercase font-bold">Active Recon GSTIN</span>
                  <span className="font-mono font-bold text-[#2D4A3E]">{companyGstin}</span>
                </div>
              </div>
              {selectedDisclaimerInv.gstComplianceNote && (
                <div className="pt-2 border-t border-[#E0E4DE]/60 text-[#56655A] leading-relaxed">
                  {selectedDisclaimerInv.gstComplianceNote}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedDisclaimerInv(null)}
                className="px-4 py-2 bg-[#2D4A3E] text-white rounded-lg text-xs font-bold hover:bg-[#1E362C] transition-colors cursor-pointer"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-60 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E0E4DE] shadow-xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[#1A2E25] flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#8DA173]" />
                <span>Edit Scanned Invoice #{editingInvoice.invoiceNumber}</span>
              </h4>
              {editingInvoice.isHandwritten && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FAF4EB] text-[#915B1E] border border-[#E8D9C0]">
                  ✍️ Handwritten Bill
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[#56655A] font-semibold block mb-1">Supplier GSTIN</label>
                <input
                  type="text"
                  value={editingInvoice.gstin}
                  onChange={(e) =>
                    setEditingInvoice({ ...editingInvoice, gstin: e.target.value.toUpperCase() })
                  }
                  className="w-full p-2 border border-[#E0E4DE] rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-[#56655A] font-semibold block mb-1">Supplier Trade Name</label>
                <input
                  type="text"
                  value={editingInvoice.vendorName}
                  onChange={(e) =>
                    setEditingInvoice({ ...editingInvoice, vendorName: e.target.value })
                  }
                  className="w-full p-2 border border-[#E0E4DE] rounded-lg"
                />
              </div>

              {/* Bill To GSTIN Field */}
              <div>
                <label className="text-[#56655A] font-semibold block mb-1">
                  Bill-To (Recipient) GSTIN
                </label>
                <input
                  type="text"
                  value={editingInvoice.billToGstin || ''}
                  onChange={(e) =>
                    setEditingInvoice({ ...editingInvoice, billToGstin: e.target.value.toUpperCase() })
                  }
                  placeholder={`e.g. ${companyGstin}`}
                  className="w-full p-2 border border-[#E0E4DE] rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-[#56655A] font-semibold block mb-1">
                  Bill-To (Recipient) Name
                </label>
                <input
                  type="text"
                  value={editingInvoice.billToName || ''}
                  onChange={(e) =>
                    setEditingInvoice({ ...editingInvoice, billToName: e.target.value })
                  }
                  placeholder="e.g. Acme Technologies"
                  className="w-full p-2 border border-[#E0E4DE] rounded-lg"
                />
              </div>

              <div>
                <label className="text-[#56655A] font-semibold block mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={editingInvoice.invoiceNumber}
                  onChange={(e) =>
                    setEditingInvoice({ ...editingInvoice, invoiceNumber: e.target.value })
                  }
                  className="w-full p-2 border border-[#E0E4DE] rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-[#56655A] font-semibold block mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={editingInvoice.invoiceDate}
                  onChange={(e) =>
                    setEditingInvoice({ ...editingInvoice, invoiceDate: e.target.value })
                  }
                  className="w-full p-2 border border-[#E0E4DE] rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-[#56655A] font-semibold block mb-1">Document Format Type</label>
                <select
                  value={editingInvoice.formatType || 'Computerized ERP'}
                  onChange={(e) =>
                    setEditingInvoice({
                      ...editingInvoice,
                      formatType: e.target.value,
                      isHandwritten: e.target.value === 'Handwritten Bill Book',
                      isGstInvoice: e.target.value !== 'Non-GST Estimate / Quotation',
                    })
                  }
                  className="w-full p-2 border border-[#E0E4DE] rounded-lg bg-white"
                >
                  <option value="Computerized ERP">Computerized ERP Tax Invoice</option>
                  <option value="Handwritten Bill Book">Handwritten Bill Book</option>
                  <option value="Thermal POS Receipt">Thermal POS Receipt</option>
                  <option value="Transport Bilty / LR">Transport Bilty / LR</option>
                  <option value="Jobwork Challan">Jobwork Challan</option>
                  <option value="Non-GST Estimate / Quotation">Non-GST Estimate / Quotation (Rejected)</option>
                </select>
              </div>

              <div>
                <label className="text-[#56655A] font-semibold block mb-1">Place of Supply (POS)</label>
                <input
                  type="text"
                  value={editingInvoice.placeOfSupply || ''}
                  onChange={(e) =>
                    setEditingInvoice({ ...editingInvoice, placeOfSupply: e.target.value })
                  }
                  className="w-full p-2 border border-[#E0E4DE] rounded-lg"
                  placeholder="e.g. 27-Maharashtra"
                />
              </div>

              <div>
                <label className="text-[#56655A] font-semibold block mb-1">Taxable Value (₹)</label>
                <input
                  type="number"
                  value={editingInvoice.taxableValue}
                  onChange={(e) =>
                    setEditingInvoice({
                      ...editingInvoice,
                      taxableValue: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2 border border-[#E0E4DE] rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-[#56655A] font-semibold block mb-1">IGST Amount (₹)</label>
                <input
                  type="number"
                  value={editingInvoice.igst}
                  onChange={(e) =>
                    setEditingInvoice({
                      ...editingInvoice,
                      igst: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2 border border-[#E0E4DE] rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-[#56655A] font-semibold block mb-1">CGST Amount (₹)</label>
                <input
                  type="number"
                  value={editingInvoice.cgst}
                  onChange={(e) =>
                    setEditingInvoice({
                      ...editingInvoice,
                      cgst: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2 border border-[#E0E4DE] rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="text-[#56655A] font-semibold block mb-1">SGST Amount (₹)</label>
                <input
                  type="number"
                  value={editingInvoice.sgst}
                  onChange={(e) =>
                    setEditingInvoice({
                      ...editingInvoice,
                      sgst: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2 border border-[#E0E4DE] rounded-lg font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E0E4DE]">
              <button
                onClick={() => setEditingInvoice(null)}
                className="px-4 py-2 text-xs font-semibold text-[#738276] hover:bg-[#F1F3EE] rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-xs font-bold bg-[#8DA173] text-white hover:bg-[#7A8E61] rounded-lg cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
