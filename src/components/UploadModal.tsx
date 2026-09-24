import React, { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  Clipboard,
  CheckCircle,
  AlertCircle,
  Database,
  Sparkles,
  Calendar,
  Clock,
  FileText,
  CreditCard,
  Building,
  Scale,
  ArrowRight,
  RefreshCw,
  Upload,
  CheckCircle2,
  Info,
  TrendingUp,
  Coins,
  Receipt,
  ShoppingBag,
  Layers,
  Archive,
  FolderArchive,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  InvoiceRecord,
  DataSourceType,
  Language,
  BankTransaction,
  SalesInvoiceRecord,
  ImportTabType,
  HsnSummaryItem,
  B2csSummaryItem,
} from '../types';
import { parseCsvData, parseGstr2bJson, parseGstr1Json } from '../utils/gstEngine';
import {
  parseGstr2bZipFile,
  parseMultipleGstr2bJsonFiles,
  isZipFile,
  ZipGstr2bParseResult,
  generateSampleMultiPeriodGstr2bZip,
} from '../utils/zipGstr2bParser';
import {
  MEESHO_FORWARD_SALES_HEADERS,
  MEESHO_FORWARD_SAMPLE_DATA,
  MEESHO_RETURNS_HEADERS,
  MEESHO_RETURNS_SAMPLE_DATA,
} from '../utils/ecommerceParser';
import {
  parseBankStatementText,
  categorizeBankTransaction,
} from '../utils/accountingUtils';
import {
  parseAmazonB2csSummary,
  parseAmazonHsnSummary,
  AMAZON_B2CS_SAMPLE_CSV,
  AMAZON_HSN_SAMPLE_CSV,
} from '../utils/gstr1Engine';
import { translations } from '../utils/translations';
import {
  FINANCIAL_YEARS,
  GST_MONTHS,
  extractInvoiceFY,
  extractInvoiceMonth,
} from '../utils/periodUtils';
import { ScannedInvoicesPdfParser } from './ScannedInvoicesPdfParser';

export type { ImportTabType };

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (
    books: InvoiceRecord[],
    gstr2b: InvoiceRecord[],
    targetFY?: string,
    targetMonth?: string
  ) => void;
  onSalesReconDataLoaded?: (
    sales: InvoiceRecord[],
    gstr1: InvoiceRecord[],
    targetFY?: string,
    targetMonth?: string
  ) => void;
  onBankDataLoaded?: (transactions: BankTransaction[]) => void;
  onSalesDataLoaded?: (sales: SalesInvoiceRecord[]) => void;
  onHsnDataLoaded?: (hsnItems: HsnSummaryItem[]) => void;
  onB2csDataLoaded?: (b2csItems: B2csSummaryItem[]) => void;
  language: Language;
  currentFY?: string;
  currentMonth?: string;
  companyGstin?: string;
  companyName?: string;
  initialTab?: ImportTabType;
  existingBooks?: InvoiceRecord[];
  existingGstr2b?: InvoiceRecord[];
  existingBankTxns?: BankTransaction[];
  existingSales?: SalesInvoiceRecord[];
  salesData?: InvoiceRecord[];
  gstr1Data?: InvoiceRecord[];
  isAdmin?: boolean;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDataLoaded,
  onSalesReconDataLoaded,
  onBankDataLoaded,
  onSalesDataLoaded,
  onHsnDataLoaded,
  onB2csDataLoaded,
  language,
  currentFY = 'FY 2024-25',
  currentMonth = 'ALL',
  companyGstin = '27AABCA1234F1Z8',
  companyName = 'Acme Technologies India Pvt Ltd',
  initialTab = 'pdf',
  existingBooks = [],
  existingGstr2b = [],
  existingBankTxns = [],
  existingSales = [],
  salesData = [],
  gstr1Data = [],
  isAdmin = false,
}) => {
  const t = translations[language];
  const effectiveInitialTab: ImportTabType =
    (!isAdmin && initialTab === 'sample' ? 'pdf' : initialTab) as ImportTabType;
  const [activeSubTab, setActiveSubTab] = useState<ImportTabType>(effectiveInitialTab);
  const [targetFY, setTargetFY] = useState<string>(currentFY);
  const [targetMonth, setTargetMonth] = useState<string>(currentMonth);
  const [autoDetectPeriod, setAutoDetectPeriod] = useState<boolean>(true);

  // Files Tab State (Purchase vs 2B)
  const [booksFile, setBooksFile] = useState<File | null>(null);
  const [gstr2bFile, setGstr2bFile] = useState<File | null>(null);
  const [filesGstr2bZipSummary, setFilesGstr2bZipSummary] = useState<ZipGstr2bParseResult | null>(null);

  // GSTR-2B Bulk ZIP Tab State
  const [zipParseResult, setZipParseResult] = useState<ZipGstr2bParseResult | null>(null);
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [zipImportMode, setZipImportMode] = useState<'append' | 'replace'>('append');
  const [zipSuccessMsg, setZipSuccessMsg] = useState('');
  const [isDragOverZip, setIsDragOverZip] = useState(false);

  // Sales Register Import Tab State
  const [salesRegisterFile, setSalesRegisterFile] = useState<File | null>(null);
  const [gstr1File, setGstr1File] = useState<File | null>(null);
  const [pasteSalesText, setPasteSalesText] = useState('');
  const [pasteGstr1Text, setPasteGstr1Text] = useState('');
  const [salesImportMode, setSalesImportMode] = useState<'files' | 'paste'>('files');
  const [salesRouting, setSalesRouting] = useState<'both' | 'sales_recon' | 'accounting'>('both');
  const [isProcessingSales, setIsProcessingSales] = useState(false);
  const [salesSuccessMsg, setSalesSuccessMsg] = useState('');

  // HSN Summary Import Tab State (Table 12)
  const [hsnFile, setHsnFile] = useState<File | null>(null);
  const [pasteHsnText, setPasteHsnText] = useState('');
  const [hsnImportMode, setHsnImportMode] = useState<'files' | 'paste'>('files');
  const [isProcessingHsn, setIsProcessingHsn] = useState(false);
  const [hsnSuccessMsg, setHsnSuccessMsg] = useState('');

  // Paste Tab State (Purchase vs 2B)
  const [pasteBooksText, setPasteBooksText] = useState('');
  const [pasteGstr2bText, setPasteGstr2bText] = useState('');

  // Bank Tab State
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [bankPasteText, setBankPasteText] = useState('');
  const [bankMode, setBankMode] = useState<'upload' | 'paste'>('upload');
  const [isProcessingBank, setIsProcessingBank] = useState(false);
  const [bankSuccessMsg, setBankSuccessMsg] = useState('');

  // Sales Sync Tab State
  const [isSyncingSales, setIsSyncingSales] = useState(false);
  const [salesSyncSuccess, setSalesSyncSuccess] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveSubTab(!isAdmin && initialTab === 'sample' ? 'pdf' : initialTab);
      setErrorMsg('');
      setBankSuccessMsg('');
      setSalesSyncSuccess('');
      setSalesSuccessMsg('');
      setHsnSuccessMsg('');
      setZipSuccessMsg('');
      setFilesGstr2bZipSummary(null);
    }
  }, [isOpen, initialTab, isAdmin]);

  if (!isOpen) return null;

  // Enrich records with target or auto-detected FY and month
  const enrichRecords = (records: InvoiceRecord[]): InvoiceRecord[] => {
    return records.map((rec) => {
      const detectedFY = extractInvoiceFY(rec.invoiceDate);
      const detectedM = extractInvoiceMonth(rec.invoiceDate);

      return {
        ...rec,
        financialYear: autoDetectPeriod && detectedFY ? detectedFY : targetFY,
        taxPeriod:
          autoDetectPeriod && detectedM
            ? detectedM
            : targetMonth !== 'ALL'
            ? targetMonth
            : detectedM || 'ALL',
      };
    });
  };

  // Merge new records with existing records so multi-period datasets accumulate and stay forever
  const mergeInvoices = (existing: InvoiceRecord[], incoming: InvoiceRecord[]): InvoiceRecord[] => {
    if (!existing || existing.length === 0) return incoming;
    if (!incoming || incoming.length === 0) return existing;
    const map = new Map<string, InvoiceRecord>();
    existing.forEach((item) => {
      const key = `${item.gstin}_${item.invoiceNumber}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      map.set(key || item.id, item);
    });
    incoming.forEach((item) => {
      const key = `${item.gstin}_${item.invoiceNumber}`.toLowerCase().replace(/[^a-z0-9]/g, '');
      map.set(key || item.id, item);
    });
    return Array.from(map.values());
  };

  // Handler for Scanned PDF Invoices Extractor
  const handleScannedInvoicesExtracted = (
    invoices: InvoiceRecord[],
    action: 'replace' | 'append',
    fy?: string,
    month?: string
  ) => {
    let finalBooks: InvoiceRecord[] = [];
    if (action === 'append' && existingBooks.length > 0) {
      finalBooks = mergeInvoices(existingBooks, invoices);
    } else {
      finalBooks = invoices;
    }

    const g2bToUse = existingGstr2b.length > 0 ? existingGstr2b : [];
    onDataLoaded(finalBooks, g2bToUse, fy || targetFY, month || targetMonth);
    onClose();
  };

  // Handle Excel / CSV / JSON File Upload
  const handleFileUpload = async () => {
    if (!booksFile && !gstr2bFile) {
      setErrorMsg('Please select at least one file (Purchase Register or GSTR-2B).');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      let parsedBooks: InvoiceRecord[] = [];
      let parsedGstr2b: InvoiceRecord[] = [];

      // Process Books File
      if (booksFile) {
        const text = await booksFile.text();
        if (booksFile.name.endsWith('.json')) {
          parsedBooks = parseGstr2bJson(text);
        } else {
          const parsed = Papa.parse<Record<string, string>>(text, {
            header: true,
            skipEmptyLines: true,
          });
          parsedBooks = parseCsvData(parsed.data, 'books');
        }
      }

      // Process GSTR-2B File
      if (gstr2bFile) {
        if (isZipFile(gstr2bFile)) {
          const zipRes = await parseGstr2bZipFile(gstr2bFile, gstr2bFile.name);
          parsedGstr2b = zipRes.allRecords;
        } else if (gstr2bFile.name.endsWith('.json')) {
          const text = await gstr2bFile.text();
          parsedGstr2b = parseGstr2bJson(text);
        } else {
          const text = await gstr2bFile.text();
          const parsed = Papa.parse<Record<string, string>>(text, {
            header: true,
            skipEmptyLines: true,
          });
          parsedGstr2b = parseCsvData(parsed.data, 'gstr2b');
        }
      }

      const enrichedBooks = enrichRecords(parsedBooks);
      const enriched2b = enrichRecords(parsedGstr2b);

      const finalBooks = parsedBooks.length > 0
        ? mergeInvoices(existingBooks, enrichedBooks)
        : existingBooks;
      const finalGstr2b = parsedGstr2b.length > 0
        ? mergeInvoices(existingGstr2b, enriched2b)
        : existingGstr2b;

      onDataLoaded(finalBooks, finalGstr2b, targetFY, targetMonth);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to parse files: ${err.message || 'Check file format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Copy & Paste
  const handlePasteProcess = () => {
    try {
      setIsProcessing(true);
      setErrorMsg('');

      let books: InvoiceRecord[] = [];
      let g2b: InvoiceRecord[] = [];

      if (pasteBooksText.trim()) {
        const parsed = Papa.parse<Record<string, string>>(pasteBooksText, {
          header: true,
          skipEmptyLines: true,
        });
        books = parseCsvData(parsed.data, 'books');
      }

      if (pasteGstr2bText.trim()) {
        if (pasteGstr2bText.trim().startsWith('{') || pasteGstr2bText.trim().startsWith('[')) {
          g2b = parseGstr2bJson(pasteGstr2bText);
        } else {
          const parsed = Papa.parse<Record<string, string>>(pasteGstr2bText, {
            header: true,
            skipEmptyLines: true,
          });
          g2b = parseCsvData(parsed.data, 'gstr2b');
        }
      }

      if (books.length === 0 && g2b.length === 0) {
        setErrorMsg('Please paste tab-separated or comma-separated invoice data.');
        setIsProcessing(false);
        return;
      }

      const enrichedBooks = enrichRecords(books);
      const enriched2b = enrichRecords(g2b);

      const finalBooks = books.length > 0 ? mergeInvoices(existingBooks, enrichedBooks) : existingBooks;
      const finalG2b = g2b.length > 0 ? mergeInvoices(existingGstr2b, enriched2b) : existingGstr2b;

      onDataLoaded(finalBooks, finalG2b, targetFY, targetMonth);
      onClose();
    } catch (e: any) {
      setErrorMsg(`Paste parse error: ${e.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Bank Statement File Upload
  const handleBankFileUpload = async (file: File) => {
    setIsProcessingBank(true);
    setErrorMsg('');
    setBankSuccessMsg('');

    try {
      if (file.name.endsWith('.pdf')) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Data = e.target?.result as string;
          try {
            const res = await fetch('/api/ai/parse-bank-statement', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileBase64: base64Data,
                mimeType: 'application/pdf',
                fileName: file.name,
              }),
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.transactions) && data.transactions.length > 0) {
              const formatted: BankTransaction[] = data.transactions.map(
                (tItem: any, idx: number) => ({
                  id: `ai-bank-${idx}-${Date.now()}`,
                  date: tItem.date || new Date().toISOString().slice(0, 10),
                  narration: tItem.narration || 'Bank Entry',
                  referenceNo: tItem.referenceNo || `REF-${idx + 1}`,
                  withdrawal: Number(tItem.withdrawal) || 0,
                  deposit: Number(tItem.deposit) || 0,
                  balance: Number(tItem.balance) || 0,
                  category:
                    tItem.category ||
                    categorizeBankTransaction(
                      tItem.narration || '',
                      Number(tItem.withdrawal) || 0,
                      Number(tItem.deposit) || 0
                    ),
                  partyName: tItem.partyName,
                  partyGstin: tItem.partyGstin,
                  confidence: Number(tItem.confidence) || 95,
                  isAutoTagged: true,
                })
              );
              if (onBankDataLoaded) {
                onBankDataLoaded(formatted);
              }
              setBankSuccessMsg(
                `Successfully imported ${formatted.length} transactions from bank statement PDF!`
              );
              setTimeout(() => {
                onClose();
              }, 1200);
            } else {
              setErrorMsg(
                'No valid transactions found in statement. Please ensure it is a valid bank statement file.'
              );
            }
          } catch (err: any) {
            setErrorMsg(err.message || 'Failed to parse bank statement');
          } finally {
            setIsProcessingBank(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        const parsed = parseBankStatementText(text);
        if (parsed.length > 0) {
          if (onBankDataLoaded) {
            onBankDataLoaded(parsed);
          }
          setBankSuccessMsg(
            `Successfully imported ${parsed.length} bank transactions into accounting ledgers!`
          );
          setTimeout(() => {
            onClose();
          }, 1200);
        } else {
          setErrorMsg('Could not find recognizable transaction columns in CSV.');
        }
        setIsProcessingBank(false);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing bank statement');
      setIsProcessingBank(false);
    }
  };

  // Handle Bank Paste Submit
  const handleBankPasteSubmit = () => {
    if (!bankPasteText.trim()) {
      setErrorMsg('Please paste bank statement rows before submitting.');
      return;
    }
    const parsed = parseBankStatementText(bankPasteText);
    if (parsed.length > 0) {
      if (onBankDataLoaded) {
        onBankDataLoaded(parsed);
      }
      setBankSuccessMsg(
        `Successfully posted ${parsed.length} pasted transactions into accounting ledgers!`
      );
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMsg('Could not parse bank rows. Ensure format is Date, Narration, Amount, Balance.');
    }
  };

  // Handle Sales Register & GSTR-1 File Upload
  const handleSalesRegisterFileProcess = async () => {
    if (!salesRegisterFile && !gstr1File) {
      setErrorMsg('Please select at least one file (Sales Register or GSTR-1).');
      return;
    }

    setIsProcessingSales(true);
    setErrorMsg('');
    setSalesSuccessMsg('');

    try {
      let parsedSales: InvoiceRecord[] = [];
      let parsedGstr1: InvoiceRecord[] = [];

      // Process Sales Register File
      if (salesRegisterFile) {
        if (salesRegisterFile.name.endsWith('.json')) {
          const text = await salesRegisterFile.text();
          parsedSales = parseGstr1Json(text);
        } else {
          let text = '';
          if (
            salesRegisterFile.name.endsWith('.xlsx') ||
            salesRegisterFile.name.endsWith('.xls')
          ) {
            const buffer = await salesRegisterFile.arrayBuffer();
            const wb = XLSX.read(buffer, { type: 'array' });
            const firstSheet = wb.SheetNames[0];
            text = XLSX.utils.sheet_to_csv(wb.Sheets[firstSheet]);
          } else {
            text = await salesRegisterFile.text();
          }

          if (
            text.includes('Summary For B2CS') ||
            (text.includes('Place Of Supply') && text.includes('E-Commerce GSTIN'))
          ) {
            const amazonRes = parseAmazonB2csSummary(text, companyGstin, {
              fy: targetFY,
              month: targetMonth,
            });
            parsedSales = amazonRes.salesRecords;
            if (onB2csDataLoaded) onB2csDataLoaded(amazonRes.b2csItems);
          } else {
            const parsed = Papa.parse<Record<string, string>>(text, {
              header: true,
              skipEmptyLines: true,
            });
            parsedSales = parseCsvData(parsed.data, 'sales');
          }
        }
      }

      // Process GSTR-1 Return File
      if (gstr1File) {
        const text = await gstr1File.text();
        if (gstr1File.name.endsWith('.json')) {
          parsedGstr1 = parseGstr1Json(text);
        } else {
          const parsed = Papa.parse<Record<string, string>>(text, {
            header: true,
            skipEmptyLines: true,
          });
          parsedGstr1 = parseCsvData(parsed.data, 'gstr1');
        }
      }

      const finalSales = enrichRecords(
        parsedSales.length > 0 ? parsedSales : (salesData.length > 0 ? salesData : [])
      );
      const finalG1 = enrichRecords(
        parsedGstr1.length > 0 ? parsedGstr1 : (gstr1Data.length > 0 ? gstr1Data : [])
      );

      // Convert to Accounting Sales Records
      const convertedSalesRecords: SalesInvoiceRecord[] = (parsedSales.length > 0 ? finalSales : finalG1).map((r, idx) => ({
        id: `sales-imp-${idx}-${Date.now()}`,
        gstin: r.gstin || 'URP',
        customerName: r.vendorName || `Customer (${(r.gstin || 'URP').slice(0, 10)})`,
        invoiceNumber: r.invoiceNumber,
        invoiceDate: r.invoiceDate,
        taxableValue: r.taxableValue,
        igst: r.igst,
        cgst: r.cgst,
        sgst: r.sgst,
        cess: r.cess || 0,
        totalTax: r.totalTax,
        invoiceValue: r.invoiceValue,
        placeOfSupply: r.placeOfSupply || '27-Maharashtra',
        financialYear: r.financialYear || targetFY,
        taxPeriod: r.taxPeriod || targetMonth,
        paymentStatus: 'UNPAID',
        receivedAmount: 0,
        outstandingAmount: r.invoiceValue,
        notes: 'Imported from Sales Register file',
      }));

      // Route 1: Sales Recon (GSTR-1 vs Books)
      if (salesRouting === 'both' || salesRouting === 'sales_recon') {
        if (onSalesReconDataLoaded) {
          onSalesReconDataLoaded(finalSales, finalG1, targetFY, targetMonth);
        } else {
          onDataLoaded(finalSales, finalG1, targetFY, targetMonth);
        }
      }

      // Route 2: Accounting Ledgers & Trade Debtors
      if (salesRouting === 'both' || salesRouting === 'accounting') {
        if (onSalesDataLoaded) {
          onSalesDataLoaded(convertedSalesRecords);
        }
      }

      const totalVal = (parsedSales.length > 0 ? finalSales : finalG1).reduce((sum, i) => sum + i.invoiceValue, 0);
      setSalesSuccessMsg(
        `Successfully imported ${finalSales.length} Sales Register invoices & ${finalG1.length} GSTR-1 returns (Turnover: ₹${totalVal.toLocaleString('en-IN')})!`
      );

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to parse sales files: ${err.message || 'Check file columns'}`);
    } finally {
      setIsProcessingSales(false);
    }
  };

  // Handle Sales Register & GSTR-1 Paste Process
  const handleSalesPasteProcess = () => {
    try {
      setIsProcessingSales(true);
      setErrorMsg('');
      setSalesSuccessMsg('');

      let sales: InvoiceRecord[] = [];
      let g1: InvoiceRecord[] = [];

      if (pasteSalesText.trim()) {
        if (
          pasteSalesText.includes('Summary For B2CS') ||
          (pasteSalesText.includes('Place Of Supply') && pasteSalesText.includes('E-Commerce GSTIN'))
        ) {
          const amazonRes = parseAmazonB2csSummary(pasteSalesText, companyGstin, {
            fy: targetFY,
            month: targetMonth,
          });
          sales = amazonRes.salesRecords;
          if (onB2csDataLoaded) onB2csDataLoaded(amazonRes.b2csItems);
        } else {
          const parsed = Papa.parse<Record<string, string>>(pasteSalesText, {
            header: true,
            skipEmptyLines: true,
          });
          sales = parseCsvData(parsed.data, 'sales');
        }
      }

      if (pasteGstr1Text.trim()) {
        if (pasteGstr1Text.trim().startsWith('{') || pasteGstr1Text.trim().startsWith('[')) {
          g1 = parseGstr1Json(pasteGstr1Text);
        } else {
          const parsed = Papa.parse<Record<string, string>>(pasteGstr1Text, {
            header: true,
            skipEmptyLines: true,
          });
          g1 = parseCsvData(parsed.data, 'gstr1');
        }
      }

      if (sales.length === 0 && g1.length === 0) {
        setErrorMsg('Please paste tab-separated rows or JSON for Sales Register / GSTR-1.');
        setIsProcessingSales(false);
        return;
      }

      const finalSales = enrichRecords(sales.length > 0 ? sales : (salesData.length > 0 ? salesData : []));
      const finalG1 = enrichRecords(g1.length > 0 ? g1 : (gstr1Data.length > 0 ? gstr1Data : []));

      // Convert to Accounting Sales Records
      const convertedSalesRecords: SalesInvoiceRecord[] = (sales.length > 0 ? finalSales : finalG1).map((r, idx) => ({
        id: `sales-paste-${idx}-${Date.now()}`,
        gstin: r.gstin || 'URP',
        customerName: r.vendorName || `Customer (${(r.gstin || 'URP').slice(0, 10)})`,
        invoiceNumber: r.invoiceNumber,
        invoiceDate: r.invoiceDate,
        taxableValue: r.taxableValue,
        igst: r.igst,
        cgst: r.cgst,
        sgst: r.sgst,
        cess: r.cess || 0,
        totalTax: r.totalTax,
        invoiceValue: r.invoiceValue,
        placeOfSupply: r.placeOfSupply || '27-Maharashtra',
        financialYear: r.financialYear || targetFY,
        taxPeriod: r.taxPeriod || targetMonth,
        paymentStatus: 'UNPAID',
        receivedAmount: 0,
        outstandingAmount: r.invoiceValue,
        notes: 'Imported via Clipboard Paste',
      }));

      // Route 1: Sales Recon (GSTR-1 vs Books)
      if (salesRouting === 'both' || salesRouting === 'sales_recon') {
        if (onSalesReconDataLoaded) {
          onSalesReconDataLoaded(finalSales, finalG1, targetFY, targetMonth);
        } else {
          onDataLoaded(finalSales, finalG1, targetFY, targetMonth);
        }
      }

      // Route 2: Accounting Ledgers & Trade Debtors
      if (salesRouting === 'both' || salesRouting === 'accounting') {
        if (onSalesDataLoaded) {
          onSalesDataLoaded(convertedSalesRecords);
        }
      }

      const totalVal = (sales.length > 0 ? finalSales : finalG1).reduce((sum, i) => sum + i.invoiceValue, 0);
      setSalesSuccessMsg(
        `Successfully posted ${finalSales.length} Sales Register rows & ${finalG1.length} GSTR-1 records (Turnover: ₹${totalVal.toLocaleString('en-IN')})!`
      );

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e: any) {
      setErrorMsg(`Sales paste parse error: ${e.message}`);
    } finally {
      setIsProcessingSales(false);
    }
  };

  // Handle Table 12 HSN File Upload
  const handleHsnFileProcess = async () => {
    if (!hsnFile) {
      setErrorMsg('Please select an HSN summary CSV or Excel file.');
      return;
    }

    setIsProcessingHsn(true);
    setErrorMsg('');
    setHsnSuccessMsg('');

    try {
      let text = '';
      if (hsnFile.name.endsWith('.xlsx') || hsnFile.name.endsWith('.xls')) {
        const buffer = await hsnFile.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const firstSheet = wb.SheetNames[0];
        text = XLSX.utils.sheet_to_csv(wb.Sheets[firstSheet]);
      } else {
        text = await hsnFile.text();
      }

      const hsnItems = parseAmazonHsnSummary(text);
      if (hsnItems.length === 0) {
        throw new Error(
          'No valid HSN records found. Please check columns: HSN, Description, UQC, Rate, Taxable Value.'
        );
      }

      if (onHsnDataLoaded) {
        onHsnDataLoaded(hsnItems);
      }

      const totalTaxable = hsnItems.reduce((s, i) => s + i.txval, 0);
      setHsnSuccessMsg(
        `Successfully imported ${hsnItems.length} HSN records (Total Taxable: ₹${totalTaxable.toLocaleString('en-IN')})!`
      );

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to parse HSN file: ${err.message || 'Check column headers'}`);
    } finally {
      setIsProcessingHsn(false);
    }
  };

  // Handle Table 12 HSN Paste Process
  const handleHsnPasteProcess = () => {
    if (!pasteHsnText.trim()) {
      setErrorMsg('Please paste HSN Summary data from Excel or Amazon Seller Central.');
      return;
    }

    setIsProcessingHsn(true);
    setErrorMsg('');
    setHsnSuccessMsg('');

    try {
      const hsnItems = parseAmazonHsnSummary(pasteHsnText);
      if (hsnItems.length === 0) {
        throw new Error(
          'No valid HSN records detected. Please check columns: HSN, Description, UQC, Rate, Taxable Value.'
        );
      }

      if (onHsnDataLoaded) {
        onHsnDataLoaded(hsnItems);
      }

      const totalTaxable = hsnItems.reduce((s, i) => s + i.txval, 0);
      setHsnSuccessMsg(
        `Successfully imported ${hsnItems.length} HSN records (Total Taxable: ₹${totalTaxable.toLocaleString('en-IN')})!`
      );

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to parse pasted HSN data: ${err.message}`);
    } finally {
      setIsProcessingHsn(false);
    }
  };

  // Handle GST Sales Register Sync to Accounting
  const handleSyncGstSalesToAccounting = () => {
    setIsSyncingSales(true);
    setErrorMsg('');
    try {
      const sourceInvoices =
        salesData.length > 0
          ? salesData
          : gstr1Data.length > 0
          ? gstr1Data
          : [];

      if (sourceInvoices.length === 0) {
        throw new Error('No GST Sales Register or GSTR-1 records found to sync. Please import your sales records first.');
      }

      const convertedSales: SalesInvoiceRecord[] = sourceInvoices.map((inv, idx) => ({
        id: `sale-gst-${idx}-${Date.now()}`,
        gstin: inv.gstin,
        customerName: inv.vendorName || `Customer (${inv.gstin.slice(0, 10)})`,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        taxableValue: inv.taxableValue,
        igst: inv.igst,
        cgst: inv.cgst,
        sgst: inv.sgst,
        cess: inv.cess || 0,
        totalTax: inv.totalTax,
        invoiceValue: inv.invoiceValue,
        placeOfSupply: inv.placeOfSupply || '27-Maharashtra',
        financialYear: inv.financialYear || targetFY,
        taxPeriod: inv.taxPeriod || targetMonth,
        paymentStatus: 'PAID',
        receivedAmount: inv.invoiceValue,
        outstandingAmount: 0,
        notes: 'Synced automatically from GST Sales Register / GSTR-1',
      }));

      if (onSalesDataLoaded) {
        onSalesDataLoaded(convertedSales);
      }
      setSalesSyncSuccess(
        `Successfully synced ${convertedSales.length} GST sales records into Accounting Sales Register!`
      );
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sync GST sales data');
    } finally {
      setIsSyncingSales(false);
    }
  };

  // Handle GSTR-2B ZIP File Upload and Extraction
  const handleProcessZipFile = async (file: File) => {
    setIsProcessingZip(true);
    setErrorMsg('');
    setZipSuccessMsg('');
    try {
      const result = await parseGstr2bZipFile(file, file.name);
      if (result.totalFilesFound === 0) {
        throw new Error('No .json files found in this ZIP archive.');
      }
      setZipParseResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to unpack ZIP archive: ${err.message || 'Corrupt or unsupported ZIP format'}`);
    } finally {
      setIsProcessingZip(false);
    }
  };

  // Handle Multiple GSTR-2B JSON Files Selection
  const handleProcessMultipleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setIsProcessingZip(true);
    setErrorMsg('');
    setZipSuccessMsg('');
    try {
      const result = await parseMultipleGstr2bJsonFiles(fileArray);
      if (result.totalFilesFound === 0) {
        throw new Error('No valid GSTR-2B JSON or ZIP files detected in selection.');
      }
      setZipParseResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to process selected files: ${err.message}`);
    } finally {
      setIsProcessingZip(false);
    }
  };

  // Handle Generating and Loading Sample Multi-Period GSTR-2B ZIP (022022 - 022026)
  const handleLoadSampleZip = async () => {
    setIsProcessingZip(true);
    setErrorMsg('');
    setZipSuccessMsg('');
    try {
      const { blob, fileName } = await generateSampleMultiPeriodGstr2bZip();
      const result = await parseGstr2bZipFile(blob, fileName);
      setZipParseResult(result);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Failed to generate sample multi-period ZIP: ${err.message}`);
    } finally {
      setIsProcessingZip(false);
    }
  };

  // Confirm and Import Unpacked Invoices into GSTR-2B Register
  const handleConfirmZipImport = () => {
    if (!zipParseResult || zipParseResult.allRecords.length === 0) {
      setErrorMsg('No valid GSTR-2B invoices found to import.');
      return;
    }

    try {
      const newRecords = zipParseResult.allRecords;
      let final2b: InvoiceRecord[] = [];

      if (zipImportMode === 'append') {
        final2b = mergeInvoices(existingGstr2b, newRecords);
      } else {
        final2b = newRecords;
      }

      const activeFY = zipParseResult.financialYearsDetected[0] || targetFY;
      const activeMonth = zipParseResult.periodsDetected[0]?.slice(0, 2) || targetMonth;

      onDataLoaded(existingBooks, final2b, activeFY, activeMonth);

      setZipSuccessMsg(
        `Successfully imported ${newRecords.length} invoices across ${zipParseResult.periodsDetected.length} periods from ${zipParseResult.zipFileName}!`
      );

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (e: any) {
      setErrorMsg(`Import failed: ${e.message}`);
    }
  };

  const importOptions = [
    {
      id: 'pdf' as ImportTabType,
      label: 'Scanned Invoices (AI OCR)',
      subtitle: 'Multi-page PDF & paper bill images',
      icon: FileText,
      badge: 'AI Vision',
      badgeColor: 'bg-[#8DA173] text-white',
    },
    {
      id: 'zip_2b' as ImportTabType,
      label: 'Bulk GSTR-2B ZIP Archive',
      subtitle: 'Multi-period ZIP with various 2B JSONs',
      icon: Archive,
      badge: 'Multi-Period',
      badgeColor: 'bg-[#2D4A3E] text-white',
    },
    {
      id: 'files' as ImportTabType,
      label: 'Purchase Register & GSTR-2B',
      subtitle: 'Tally, Zoho & Portal GSTR-2B files',
      icon: FileSpreadsheet,
      badge: 'Inward',
      badgeColor: 'bg-[#EDF3EF] text-[#2D4A3E]',
    },
    {
      id: 'sales_import' as ImportTabType,
      label: 'Sales Register & GSTR-1',
      subtitle: 'Outward sales invoices & return',
      icon: TrendingUp,
      badge: 'Outward',
      badgeColor: 'bg-[#2D4A3E] text-white',
    },
    {
      id: 'hsn_import' as ImportTabType,
      label: 'HSN Summary (Table 12)',
      subtitle: 'Amazon HSN & Table 12',
      icon: Layers,
      badge: 'Mandatory',
      badgeColor: 'bg-[#8DA173] text-white',
    },
    {
      id: 'bank' as ImportTabType,
      label: 'Bank Statement',
      subtitle: 'PDF/CSV for P&L, BS & Ledgers',
      icon: CreditCard,
      badge: 'Accounting',
      badgeColor: 'bg-[#EDF3EF] text-[#2D4A3E]',
    },
    {
      id: 'paste' as ImportTabType,
      label: 'Copy & Paste',
      subtitle: 'Fast TSV paste from Sheets/Excel',
      icon: Clipboard,
      badge: 'Direct',
      badgeColor: 'bg-[#F1F3EE] text-[#56655A]',
    },
    {
      id: 'sales_sync' as ImportTabType,
      label: 'GST Sales Sync',
      subtitle: 'Convert GSTR-1 to sales ledger',
      icon: Scale,
      badge: '1-Click',
      badgeColor: 'bg-[#EDF3EF] text-[#2D4A3E]',
    },
  ];

  return (
    <div
      id="upload-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto overscroll-contain"
    >
      <div
        id="upload-modal-card"
        className="bg-white w-full max-w-5xl rounded-2xl border border-[#E0E4DE] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-[#2D4A3E] text-white p-5 md:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8DA173] flex items-center justify-center font-bold text-white shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold tracking-tight">
                {language === 'hi'
                  ? 'इम्पोर्ट हब: इनवॉइस, रिटर्न व बैंक डेटा'
                  : 'Unified Import Hub: Invoices, Returns & Bank Data'}
              </h3>
              <p className="text-xs text-[#D3DCD6] mt-0.5">
                Select your import method: Scanned PDFs, Excel/CSV registers, GSTR-2B JSON, Bank Statements, or Direct Paste.
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

        {/* Period & Entity Bar */}
        <div className="bg-[#FAFBF9] border-b border-[#E0E4DE] px-4 sm:px-6 py-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#8DA173]" />
                <span className="font-bold text-[#2D4A3E]">Target FY:</span>
                <select
                  value={targetFY}
                  onChange={(e) => setTargetFY(e.target.value)}
                  className="bg-white border border-[#E0E4DE] text-xs font-semibold text-[#1A2E25] px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
                >
                  {FINANCIAL_YEARS.map((fy) => (
                    <option key={fy} value={fy}>
                      {fy}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#8DA173]" />
                <span className="font-bold text-[#2D4A3E]">Month:</span>
                <select
                  value={targetMonth}
                  onChange={(e) => setTargetMonth(e.target.value)}
                  className="bg-white border border-[#E0E4DE] text-xs font-semibold text-[#1A2E25] px-2 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#8DA173]"
                >
                  {GST_MONTHS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-[#56655A] font-mono bg-white px-2 py-0.5 rounded border border-[#E0E4DE]">
                <span className="text-[#738276]">Active GSTIN:</span>
                <strong className="text-[#2D4A3E]">{companyGstin}</strong>
              </div>
            </div>

            <label className="flex items-center gap-1.5 text-xs text-[#56655A] cursor-pointer">
              <input
                type="checkbox"
                checked={autoDetectPeriod}
                onChange={(e) => setAutoDetectPeriod(e.target.checked)}
                className="w-3.5 h-3.5 text-[#2D4A3E] rounded border-[#E0E4DE] focus:ring-[#8DA173]"
              />
              <span className="font-medium text-[11px]">Auto-detect FY & Month from invoice dates</span>
            </label>
          </div>
        </div>

        {/* All Import Options - Interactive Quick Tabs Bar */}
        <div className="flex border-b border-[#E0E4DE] bg-[#F7F8F6] px-4 sm:px-6 pt-2.5 gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          {importOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = activeSubTab === opt.id;
            return (
              <button
                key={opt.id}
                id={`tab-import-${opt.id}`}
                onClick={() => {
                  setActiveSubTab(opt.id);
                  setErrorMsg('');
                }}
                className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 shrink-0 border-t border-x cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#2D4A3E] border-[#E0E4DE] shadow-xs'
                    : 'bg-transparent text-[#738276] border-transparent hover:text-[#2D4A3E] hover:bg-white/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#8DA173]' : 'text-[#738276]'}`} />
                <span>{opt.label}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${opt.badgeColor}`}>
                  {opt.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 overscroll-contain">
          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#FCF0EE] border border-[#C75D4E]/30 text-[#C75D4E] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banners */}
          {bankSuccessMsg && (
            <div className="p-3 rounded-xl bg-[#EDF3EF] border border-[#BBD3C5] text-[#2D4A3E] text-xs flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#8DA173] shrink-0" />
              <span>{bankSuccessMsg}</span>
            </div>
          )}

          {salesSuccessMsg && (
            <div className="p-3 rounded-xl bg-[#EDF3EF] border border-[#BBD3C5] text-[#2D4A3E] text-xs flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#8DA173] shrink-0" />
              <span>{salesSuccessMsg}</span>
            </div>
          )}

          {salesSyncSuccess && (
            <div className="p-3 rounded-xl bg-[#EDF3EF] border border-[#BBD3C5] text-[#2D4A3E] text-xs flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#8DA173] shrink-0" />
              <span>{salesSyncSuccess}</span>
            </div>
          )}

          {zipSuccessMsg && (
            <div className="p-3 rounded-xl bg-[#EDF3EF] border border-[#BBD3C5] text-[#2D4A3E] text-xs flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#8DA173] shrink-0" />
              <span>{zipSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: SCANNED INVOICES PDF/IMAGE OCR */}
          {activeSubTab === 'pdf' && (
            <ScannedInvoicesPdfParser
              language={language}
              currentFY={targetFY}
              currentMonth={targetMonth}
              companyGstin={companyGstin}
              companyName={companyName}
              onInvoicesExtracted={handleScannedInvoicesExtracted}
              onClose={onClose}
              isAdmin={isAdmin}
            />
          )}

          {/* TAB 2: BULK GSTR-2B ZIP ARCHIVE (MULTI-PERIOD) */}
          {activeSubTab === 'zip_2b' && (
            <div className="space-y-4">
              <div className="bg-[#FAFBF9] p-4 rounded-xl border border-[#E0E4DE] flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#2D4A3E] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Archive className="w-4 h-4 text-[#8DA173]" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[#1A2E25]">
                      Bulk GSTR-2B ZIP Archive Importer (Multi-Period Engine)
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EDF3EF] text-[#2D4A3E] font-bold border border-[#D5E2D9]">
                      Multi-Month .ZIP & JSONs
                    </span>
                  </div>
                  <p className="text-xs text-[#56655A] leading-relaxed">
                    Upload a <strong>.zip file containing various monthly GSTR-2B JSONs</strong> downloaded from the GST Portal (e.g. from <code>022022</code> to <code>022026</code>). All JSONs are recursively unpacked, their return periods are detected, and invoices stay forever in your User ID.
                  </p>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-[#738276] font-medium">
                  Upload your downloaded GST portal ZIP or test with preloaded multi-period samples:
                </span>
                <button
                  type="button"
                  onClick={handleLoadSampleZip}
                  disabled={isProcessingZip}
                  className="px-3 py-1.5 bg-[#F1F3EE] hover:bg-[#E0E4DE] text-[#2D4A3E] rounded-lg text-xs font-bold transition-all border border-[#D5E2D9] cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#8DA173]" />
                  <span>Try Sample Multi-Period ZIP (022022 - 022026)</span>
                </button>
              </div>

              {/* Drag and Drop Upload Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOverZip(true);
                }}
                onDragLeave={() => setIsDragOverZip(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOverZip(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    if (e.dataTransfer.files.length === 1 && isZipFile(e.dataTransfer.files[0])) {
                      handleProcessZipFile(e.dataTransfer.files[0]);
                    } else {
                      handleProcessMultipleFiles(e.dataTransfer.files);
                    }
                  }
                }}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  isDragOverZip
                    ? 'border-[#2D4A3E] bg-[#EDF3EF]/60'
                    : 'border-[#CBD5CD] bg-[#FDFDFC] hover:bg-[#F7F8F6]'
                }`}
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#EDF3EF] flex items-center justify-center text-[#2D4A3E]">
                  <Archive className="w-6 h-6 text-[#8DA173]" />
                </div>
                <h5 className="text-sm font-bold text-[#1A2E25]">
                  Drop your GSTR-2B .ZIP file here, or browse
                </h5>
                <p className="text-xs text-[#738276] mt-1 max-w-md mx-auto">
                  Supports .zip archives containing multiple <code>returns_MMYYYY_GSTR2B_*.json</code> files or multiple selected <code>.json</code> files.
                </p>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <label className="px-4 py-2 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span>Select GSTR-2B .ZIP File</span>
                    <input
                      type="file"
                      accept=".zip,.json"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          if (e.target.files.length === 1 && isZipFile(e.target.files[0])) {
                            handleProcessZipFile(e.target.files[0]);
                          } else {
                            handleProcessMultipleFiles(e.target.files);
                          }
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Processing Spinner */}
              {isProcessingZip && (
                <div className="p-6 rounded-xl border border-[#E0E4DE] bg-[#FAFBF9] text-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#8DA173] mx-auto" />
                  <p className="text-xs font-bold text-[#2D4A3E]">
                    Unpacking ZIP archive & parsing monthly GSTR-2B JSON statements...
                  </p>
                  <p className="text-[11px] text-[#738276]">
                    Extracting B2B invoices, CDNR credit/debit notes & auto-detecting tax periods
                  </p>
                </div>
              )}

              {/* ZIP Analysis & Content Breakdown */}
              {zipParseResult && (
                <div className="border border-[#BBD3C5] bg-white rounded-xl p-4 shadow-xs space-y-4 animate-in fade-in duration-200">
                  {/* File Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#E0E4DE] gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#EDF3EF] flex items-center justify-center text-[#2D4A3E]">
                        <FolderArchive className="w-4 h-4 text-[#8DA173]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#1A2E25] flex items-center gap-2">
                          <span>{zipParseResult.zipFileName}</span>
                          <span className="text-[10px] text-[#738276] font-mono">
                            ({(zipParseResult.zipFileSize / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <p className="text-[11px] text-[#56655A] mt-0.5">
                          Unpacked {zipParseResult.totalFilesFound} JSON files • Recipient GSTIN:{' '}
                          <strong className="text-[#2D4A3E]">
                            {zipParseResult.recipientGstinsDetected[0] || companyGstin}
                          </strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setZipParseResult(null)}
                        className="text-xs text-[#738276] hover:text-[#C75D4E] underline cursor-pointer"
                      >
                        Clear & Choose Another File
                      </button>
                    </div>
                  </div>

                  {/* KPI Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-[#FAFBF9] border border-[#E0E4DE] p-2.5 rounded-lg">
                      <div className="text-[10px] uppercase font-bold text-[#738276]">Files Unpacked</div>
                      <div className="text-base font-extrabold text-[#2D4A3E] mt-0.5">
                        {zipParseResult.validJsonCount}{' '}
                        <span className="text-xs font-normal text-[#738276]">/ {zipParseResult.totalFilesFound}</span>
                      </div>
                    </div>

                    <div className="bg-[#FAFBF9] border border-[#E0E4DE] p-2.5 rounded-lg">
                      <div className="text-[10px] uppercase font-bold text-[#738276]">Periods Range</div>
                      <div className="text-xs font-extrabold text-[#2D4A3E] mt-1 truncate" title={zipParseResult.periodsDetected.join(', ')}>
                        {zipParseResult.periodsDetected[0] || 'N/A'} → {zipParseResult.periodsDetected[zipParseResult.periodsDetected.length - 1] || 'N/A'}
                        <div className="text-[10px] font-normal text-[#8DA173]">
                          ({zipParseResult.periodsDetected.length} Months)
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#FAFBF9] border border-[#E0E4DE] p-2.5 rounded-lg">
                      <div className="text-[10px] uppercase font-bold text-[#738276]">Inward Invoices</div>
                      <div className="text-base font-extrabold text-[#2D4A3E] mt-0.5">
                        {zipParseResult.totalInvoices}
                      </div>
                    </div>

                    <div className="bg-[#FAFBF9] border border-[#E0E4DE] p-2.5 rounded-lg">
                      <div className="text-[10px] uppercase font-bold text-[#738276]">Total Inward ITC</div>
                      <div className="text-base font-extrabold text-[#8DA173] mt-0.5">
                        ₹{zipParseResult.totalTax.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Detected Periods Badges */}
                  <div>
                    <div className="text-[11px] font-bold text-[#2D4A3E] mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#8DA173]" />
                      <span>Detected Return Periods ({zipParseResult.periodsDetected.length}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {zipParseResult.periodsDetected.map((p) => {
                        const count = zipParseResult.fileSummaries
                          .filter((f) => f.periodMMYYYY === p)
                          .reduce((sum, f) => sum + f.invoiceCount, 0);
                        return (
                          <span
                            key={p}
                            className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[#EDF3EF] border border-[#D5E2D9] text-[#2D4A3E] font-medium"
                          >
                            <strong>{p}</strong>
                            <span className="text-[10px] text-[#738276]">({count} inv)</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Table of Files Inside ZIP */}
                  <div className="border border-[#E0E4DE] rounded-lg overflow-hidden">
                    <div className="bg-[#FAFBF9] px-3 py-2 border-b border-[#E0E4DE] flex items-center justify-between text-xs">
                      <span className="font-bold text-[#2D4A3E]">JSON Files Breakdown in Archive</span>
                      <span className="text-[11px] text-[#738276]">
                        {zipParseResult.fileSummaries.length} files extracted
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7F8F6] text-[#56655A] text-[10px] uppercase font-bold sticky top-0 border-b border-[#E0E4DE]">
                          <tr>
                            <th className="px-3 py-1.5">File Name</th>
                            <th className="px-3 py-1.5">Period</th>
                            <th className="px-3 py-1.5">FY</th>
                            <th className="px-3 py-1.5 text-right">Invoices</th>
                            <th className="px-3 py-1.5 text-right">Taxable (₹)</th>
                            <th className="px-3 py-1.5 text-right">Total Tax (₹)</th>
                            <th className="px-3 py-1.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E0E4DE]">
                          {zipParseResult.fileSummaries.map((fileItem, idx) => (
                            <tr key={idx} className="hover:bg-[#FAFBF9]">
                              <td className="px-3 py-1.5 font-mono text-[11px] text-[#2D4A3E] truncate max-w-xs" title={fileItem.fileName}>
                                {fileItem.fileName}
                              </td>
                              <td className="px-3 py-1.5 text-[#56655A]">
                                <span className="px-1.5 py-0.5 rounded bg-[#EDF3EF] text-[#2D4A3E] text-[10px] font-bold">
                                  {fileItem.periodMMYYYY || 'Auto'}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-[#56655A] text-[11px]">
                                {fileItem.financialYear || 'N/A'}
                              </td>
                              <td className="px-3 py-1.5 text-right font-bold text-[#2D4A3E]">
                                {fileItem.invoiceCount}
                              </td>
                              <td className="px-3 py-1.5 text-right text-[#56655A]">
                                ₹{fileItem.taxableValue.toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-1.5 text-right font-bold text-[#8DA173]">
                                ₹{fileItem.totalTax.toLocaleString('en-IN')}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                {fileItem.status === 'SUCCESS' ? (
                                  <span className="text-[10px] font-bold text-[#2D4A3E] bg-[#EDF3EF] px-1.5 py-0.5 rounded">
                                    Loaded
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-[#C75D4E] bg-[#FCF0EE] px-1.5 py-0.5 rounded">
                                    {fileItem.status}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Register Persistence Option */}
                  <div className="bg-[#FAFBF9] border border-[#E0E4DE] p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-[#8DA173]" />
                      <span className="font-bold text-[#2D4A3E]">Target Register Storage:</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="zipImportMode"
                          checked={zipImportMode === 'append'}
                          onChange={() => setZipImportMode('append')}
                          className="w-3.5 h-3.5 text-[#2D4A3E]"
                        />
                        <span className="text-xs text-[#56655A]">
                          <strong>Append & Accumulate</strong> (Keep multi-period records forever in this user ID)
                        </span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="zipImportMode"
                          checked={zipImportMode === 'replace'}
                          onChange={() => setZipImportMode('replace')}
                          className="w-3.5 h-3.5 text-[#2D4A3E]"
                        />
                        <span className="text-xs text-[#56655A]">Replace GSTR-2B</span>
                      </label>
                    </div>
                  </div>

                  {/* Import Button */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleConfirmZipImport}
                      className="px-5 py-2.5 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#8DA173]" />
                      <span>
                        Import {zipParseResult.totalInvoices} Invoices ({zipParseResult.periodsDetected.length} Periods) into GSTR-2B Register
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXCEL / CSV / JSON FILES (PURCHASE REGISTER & GSTR-2B) */}
          {activeSubTab === 'files' && (
            <div className="space-y-4">
              <div className="bg-[#FAFBF9] p-4 rounded-xl border border-[#E0E4DE] flex items-center gap-3">
                <FileSpreadsheet className="w-5 h-5 text-[#8DA173] shrink-0" />
                <div className="text-xs text-[#56655A]">
                  Upload your internal <strong>Purchase Register (Excel/CSV)</strong> exported from Tally, Zoho, SAP or Busy, and your official <strong>GSTR-2B (JSON/CSV/ZIP)</strong> downloaded from the GST Portal.
                </div>
              </div>

              {/* File 1: Purchase Register / Books */}
              <div className="border border-[#E0E4DE] rounded-xl p-4 bg-[#FDFDFC]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#8DA173]" />
                    <span className="text-xs font-bold text-[#2D4A3E]">
                      1. Purchase Register / Internal Inward Books
                    </span>
                  </div>
                  <span className="text-[10px] text-[#738276] font-mono">.csv, .xlsx, .json</span>
                </div>
                <p className="text-xs text-[#738276] mb-3">
                  Upload CSV/Excel containing columns: GSTIN, Vendor Name, Invoice No, Date, Taxable Value, IGST, CGST, SGST.
                </p>
                <input
                  id="input-books-file"
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  onChange={(e) => setBooksFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-[#56655A] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EDF3EF] file:text-[#2D4A3E] hover:file:bg-[#D5E2D9] cursor-pointer"
                />
                {booksFile && (
                  <div className="mt-2 text-xs font-semibold text-[#2D4A3E] flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span>Selected: {booksFile.name} ({(booksFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>

              {/* File 2: GSTR-2B Statement */}
              <div className="border border-[#E0E4DE] rounded-xl p-4 bg-[#FDFDFC]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-[#8DA173]" />
                    <span className="text-xs font-bold text-[#2D4A3E]">
                      2. Official GST Portal GSTR-2B Statement (ZIP, JSON or CSV)
                    </span>
                  </div>
                  <span className="text-[10px] text-[#738276] font-mono">.zip, .json, .csv</span>
                </div>
                <p className="text-xs text-[#738276] mb-3">
                  Upload official GSTR-2B JSON, CSV, or a <strong>.ZIP archive</strong> containing various monthly GSTR-2B JSONs.
                </p>
                <input
                  id="input-gstr2b-file"
                  type="file"
                  accept=".zip,.json,.csv"
                  onChange={async (e) => {
                    const file = e.target.files?.[0] || null;
                    setGstr2bFile(file);
                    setFilesGstr2bZipSummary(null);
                    if (file && isZipFile(file)) {
                      try {
                        const res = await parseGstr2bZipFile(file, file.name);
                        setFilesGstr2bZipSummary(res);
                      } catch (err) {
                        console.warn('Zip preview err:', err);
                      }
                    }
                  }}
                  className="block w-full text-xs text-[#56655A] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EDF3EF] file:text-[#2D4A3E] hover:file:bg-[#D5E2D9] cursor-pointer"
                />
                {gstr2bFile && (
                  <div className="mt-2 text-xs font-semibold text-[#2D4A3E] flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span>Selected: {gstr2bFile.name} ({(gstr2bFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
                {filesGstr2bZipSummary && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-[#EDF3EF] border border-[#BBD3C5] text-xs text-[#2D4A3E] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Archive className="w-4 h-4 text-[#8DA173] shrink-0" />
                      <span>
                        <strong>ZIP Archive Detected:</strong> {filesGstr2bZipSummary.totalFilesFound} JSON files,{' '}
                        {filesGstr2bZipSummary.totalInvoices} invoices across periods:{' '}
                        <strong>{filesGstr2bZipSummary.periodsDetected.join(', ')}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setZipParseResult(filesGstr2bZipSummary);
                        setActiveSubTab('zip_2b');
                      }}
                      className="text-[11px] underline font-bold text-[#2D4A3E] hover:text-[#1E362C] shrink-0 cursor-pointer"
                    >
                      View Detailed Breakdown →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SALES REGISTER & GSTR-1 OUTWARD SUPPLIES IMPORT */}
          {activeSubTab === 'sales_import' && (
            <div className="space-y-4">
              <div className="bg-[#FAFBF9] p-4 rounded-xl border border-[#E0E4DE] flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-[#8DA173] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#1A2E25]">
                    Sales Register & GSTR-1 Outward Supplies Importer
                  </h4>
                  <p className="text-xs text-[#56655A] leading-relaxed">
                    Import your internal <strong>Sales Register (Billing POS / Tally / ERP)</strong> and official <strong>GSTR-1 Outward Return (JSON / CSV)</strong>. Perform outward sales audits, detect unfiled supplies, and automatically populate <strong>Revenue in P&L and Trade Debtors in Balance Sheet</strong>.
                  </p>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSalesImportMode('files')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      salesImportMode === 'files'
                        ? 'bg-[#2D4A3E] text-white'
                        : 'bg-white border border-[#E0E4DE] text-[#738276] hover:bg-[#F7F8F6]'
                    }`}
                  >
                    Upload Files (Excel / CSV / JSON)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesImportMode('paste')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      salesImportMode === 'paste'
                        ? 'bg-[#2D4A3E] text-white'
                        : 'bg-white border border-[#E0E4DE] text-[#738276] hover:bg-[#F7F8F6]'
                    }`}
                  >
                    Copy & Paste Sales Rows
                  </button>
                </div>

                {/* Target Routing Options */}
                <div className="flex items-center gap-1.5 bg-[#F1F3EE] p-1 rounded-lg text-xs border border-[#E0E4DE]">
                  <span className="text-[10px] font-bold text-[#738276] uppercase px-1.5">Route To:</span>
                  <button
                    type="button"
                    onClick={() => setSalesRouting('both')}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      salesRouting === 'both' ? 'bg-[#2D4A3E] text-white shadow-xs' : 'text-[#56655A] hover:text-[#1A2E25]'
                    }`}
                  >
                    Both (Recon & Ledgers)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesRouting('sales_recon')}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      salesRouting === 'sales_recon' ? 'bg-[#2D4A3E] text-white shadow-xs' : 'text-[#56655A] hover:text-[#1A2E25]'
                    }`}
                  >
                    Sales vs GSTR-1 Audit
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalesRouting('accounting')}
                    className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      salesRouting === 'accounting' ? 'bg-[#2D4A3E] text-white shadow-xs' : 'text-[#56655A] hover:text-[#1A2E25]'
                    }`}
                  >
                    Accounting Only
                  </button>
                </div>
              </div>

              {/* Meesho E-Commerce Integration Quick Access */}
              <div className="bg-[#EDF3EF] border border-[#D5E2D9] rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#2D4A3E] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <ShoppingBag className="w-4 h-4 text-[#8DA173]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1A2E25] flex items-center gap-2">
                      <span>Meesho & Amazon E-Commerce GST Templates Ready</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white border border-[#D5E2D9] text-[#2D4A3E] font-semibold">
                        Forward, Returns & B2CS
                      </span>
                    </div>
                    <p className="text-[11px] text-[#56655A] mt-0.5">
                      Upload raw seller reports (.csv, .xlsx) or try sample forward orders, return/RTO credit notes, or Amazon B2CS summary:
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setSalesImportMode('paste');
                      const sampleText = [
                        MEESHO_FORWARD_SALES_HEADERS.join('\t'),
                        ...MEESHO_FORWARD_SAMPLE_DATA.map((row) => row.join('\t')),
                      ].join('\n');
                      setPasteSalesText(sampleText);
                    }}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#F7F8F6] border border-[#D5E2D9] text-[#2D4A3E] rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>+ Meesho Sales</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSalesImportMode('paste');
                      const sampleText = [
                        MEESHO_RETURNS_HEADERS.join('\t'),
                        ...MEESHO_RETURNS_SAMPLE_DATA.map((row) => row.join('\t')),
                      ].join('\n');
                      setPasteSalesText(sampleText);
                    }}
                    className="px-2.5 py-1.5 bg-[#FFF2F0] hover:bg-[#FFEAE6] border border-[#FFCCC7] text-[#C75D4E] rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>+ Meesho Returns</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSalesImportMode('paste');
                      setPasteSalesText(AMAZON_B2CS_SAMPLE_CSV);
                    }}
                    className="px-2.5 py-1.5 bg-[#FFF9E6] hover:bg-[#FFF3CC] border border-[#FFE79A] text-[#975A16] rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <span>+ Amazon B2CS Sample</span>
                  </button>
                </div>
              </div>

              {salesImportMode === 'files' ? (
                <div className="space-y-3">
                  {/* File 1: Sales Register */}
                  <div className="border border-[#E0E4DE] rounded-xl p-4 bg-[#FDFDFC]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#8DA173]" />
                        <span className="text-xs font-bold text-[#2D4A3E]">
                          1. Internal Sales Register (Books Outward Invoices)
                        </span>
                      </div>
                      <span className="text-[10px] text-[#738276] font-mono">.csv, .xlsx, .xls, .json</span>
                    </div>
                    <p className="text-xs text-[#738276] mb-3">
                      Upload sales records containing columns: Customer GSTIN, Customer/Party Name, Invoice No, Date, Taxable Value, IGST, CGST, SGST, Total Value.
                    </p>
                    <input
                      id="input-sales-file"
                      type="file"
                      accept=".csv,.xlsx,.xls,.json"
                      onChange={(e) => setSalesRegisterFile(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-[#56655A] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EDF3EF] file:text-[#2D4A3E] hover:file:bg-[#D5E2D9] cursor-pointer"
                    />
                    {salesRegisterFile && (
                      <div className="mt-2 text-xs font-semibold text-[#2D4A3E] flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#8DA173]" />
                        <span>Selected: {salesRegisterFile.name} ({(salesRegisterFile.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}
                  </div>

                  {/* File 2: GSTR-1 Return File */}
                  <div className="border border-[#E0E4DE] rounded-xl p-4 bg-[#FDFDFC]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4 text-[#8DA173]" />
                        <span className="text-xs font-bold text-[#2D4A3E]">
                          2. Official GST Portal GSTR-1 Return File (Optional for Recon)
                        </span>
                      </div>
                      <span className="text-[10px] text-[#738276] font-mono">.json, .csv</span>
                    </div>
                    <p className="text-xs text-[#738276] mb-3">
                      Upload GSTR-1 JSON downloaded from GST Portal (Includes B2B, B2CL, B2CS, and CDNR outward supplies).
                    </p>
                    <input
                      id="input-gstr1-file"
                      type="file"
                      accept=".json,.csv"
                      onChange={(e) => setGstr1File(e.target.files?.[0] || null)}
                      className="block w-full text-xs text-[#56655A] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#EDF3EF] file:text-[#2D4A3E] hover:file:bg-[#D5E2D9] cursor-pointer"
                    />
                    {gstr1File && (
                      <div className="mt-2 text-xs font-semibold text-[#2D4A3E] flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-[#8DA173]" />
                        <span>Selected: {gstr1File.name} ({(gstr1File.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#2D4A3E] block mb-1">
                      Paste Sales Register (Header row + tab-separated rows from Excel/Sheets):
                    </label>
                    <textarea
                      id="textarea-paste-sales"
                      rows={4}
                      placeholder={`GSTIN\tCustomer Name\tInvoiceNo\tDate\tTaxable\tIGST\tCGST\tSGST\tTotal\n27AAACB2212M1Z0\tReliance Retail Ltd\tINV-OUT-001\t2024-04-10\t450000\t0\t40500\t40500\t531000`}
                      value={pasteSalesText}
                      onChange={(e) => setPasteSalesText(e.target.value)}
                      className="w-full text-xs font-mono p-3 border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173] bg-[#FDFDFC]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[#2D4A3E] block mb-1">
                      Paste Official GSTR-1 Data (CSV text or raw GSTR-1 JSON):
                    </label>
                    <textarea
                      id="textarea-paste-g1"
                      rows={4}
                      placeholder={`GSTIN\tCustomer Name\tInvoiceNo\tDate\tTaxable\tIGST\tCGST\tSGST\n27AAACB2212M1Z0\tReliance Retail Ltd\tINV-OUT-001\t2024-04-10\t450000\t0\t40500\t40500`}
                      value={pasteGstr1Text}
                      onChange={(e) => setPasteGstr1Text(e.target.value)}
                      className="w-full text-xs font-mono p-3 border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173] bg-[#FDFDFC]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: HSN-WISE SUMMARY (TABLE 12) */}
          {activeSubTab === 'hsn_import' && (
            <div className="space-y-4">
              <div className="bg-[#FAFBF9] p-4 rounded-xl border border-[#E0E4DE] flex items-start gap-3">
                <Layers className="w-5 h-5 text-[#8DA173] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-[#1A2E25]">
                      Table 12: HSN-Wise Summary of Outward Supplies
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#8DA173]/20 text-[#2D4A3E] font-bold">
                      Mandatory for GSTR-1
                    </span>
                  </div>
                  <p className="text-xs text-[#56655A] leading-relaxed">
                    Under statutory GST notification, reporting HSN/SAC code, GST Rate (%), and UQC is mandatory for outward sales in GSTR-1. Upload or paste your Amazon HSN summary, ERP HSN report, or GST portal Table 12 file.
                  </p>
                </div>
              </div>

              {/* Mode Switcher & Sample Button */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHsnImportMode('files')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      hsnImportMode === 'files'
                        ? 'bg-[#2D4A3E] text-white'
                        : 'bg-white border border-[#E0E4DE] text-[#738276] hover:bg-[#F7F8F6]'
                    }`}
                  >
                    Upload Files (Excel / CSV / JSON)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHsnImportMode('paste')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      hsnImportMode === 'paste'
                        ? 'bg-[#2D4A3E] text-white'
                        : 'bg-white border border-[#E0E4DE] text-[#738276] hover:bg-[#F7F8F6]'
                    }`}
                  >
                    Copy & Paste HSN Rows
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setHsnImportMode('paste');
                    setPasteHsnText(AMAZON_HSN_SAMPLE_CSV);
                  }}
                  className="px-2.5 py-1.5 bg-[#FFF9E6] hover:bg-[#FFF3CC] border border-[#FFE79A] text-[#975A16] rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <span>+ Load Amazon HSN Sample</span>
                </button>
              </div>

              {hsnSuccessMsg && (
                <div className="p-3 bg-[#EDF3EF] border border-[#D5E2D9] rounded-xl text-xs font-bold text-[#2D4A3E] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#8DA173]" />
                  <span>{hsnSuccessMsg}</span>
                </div>
              )}

              {hsnImportMode === 'files' ? (
                <div className="space-y-3">
                  <div className="border border-[#E0E4DE] rounded-xl p-4 bg-[#FDFDFC]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#8DA173]" />
                        <span className="text-xs font-bold text-[#1A2E25]">
                          HSN Summary Spreadsheet (Table 12)
                        </span>
                      </div>
                      <span className="text-[10px] text-[#738276]">.xlsx, .xls, .csv, .json</span>
                    </div>
                    <label className="border-2 border-dashed border-[#D5E2D9] hover:border-[#8DA173] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white">
                      <Upload className="w-6 h-6 text-[#8DA173] mb-1.5" />
                      <span className="text-xs font-medium text-[#1A2E25]">
                        {hsnFile ? hsnFile.name : 'Select or drag & drop HSN summary file'}
                      </span>
                      <span className="text-[10px] text-[#738276] mt-1">
                        Supports Amazon HSN Summary Report, Tally HSN/SAC summary, and Portal Table 12
                      </span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls,.json"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setHsnFile(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-[#2D4A3E] block mb-1">
                      Paste Tab-Separated Rows from Excel / Amazon Seller Central:
                    </label>
                    <textarea
                      rows={6}
                      placeholder={`HSN\tDescription\tUQC\tTotal Quantity\tTotal Value\tTaxable Value\tIGST Amount\tCGST Amount\tSGST Amount\tRate\n61091000\tCotton T-Shirts\tPCS\t240\t120000\t114285.71\t0\t2857.14\t2857.14\t5\n62034200\tMen Denim Jeans\tPCS\t180\t189000\t168750\t10125\t5062.5\t5062.5\t12`}
                      value={pasteHsnText}
                      onChange={(e) => setPasteHsnText(e.target.value)}
                      className="w-full text-xs font-mono p-3 border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173] bg-[#FDFDFC]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BANK STATEMENT / PASSBOOK */}
          {activeSubTab === 'bank' && (
            <div className="space-y-4">
              <div className="bg-[#FAFBF9] p-4 rounded-xl border border-[#E0E4DE] flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-[#8DA173] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#1A2E25]">
                    Bank Statement / Passbook Importer for Automated Accounting
                  </h4>
                  <p className="text-xs text-[#56655A] leading-relaxed">
                    Upload your official bank statement (PDF, CSV, Excel) from HDFC, ICICI, SBI, Axis, or Kotak. Our AI auto-categorizes payments, tags vendor payouts & client receipts, and powers your <strong>Balance Sheet, P&L, and Ledger Statements</strong>.
                  </p>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBankMode('upload')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    bankMode === 'upload'
                      ? 'bg-[#2D4A3E] text-white'
                      : 'bg-white border border-[#E0E4DE] text-[#738276] hover:bg-[#F7F8F6]'
                  }`}
                >
                  Upload File (PDF / CSV / Excel)
                </button>
                <button
                  type="button"
                  onClick={() => setBankMode('paste')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    bankMode === 'paste'
                      ? 'bg-[#2D4A3E] text-white'
                      : 'bg-white border border-[#E0E4DE] text-[#738276] hover:bg-[#F7F8F6]'
                  }`}
                >
                  Paste Statement Rows
                </button>
              </div>

              {bankMode === 'upload' ? (
                <div className="space-y-3">
                  <label className="border-2 border-dashed border-[#D5E2D9] hover:border-[#8DA173] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#FDFDFC]">
                    <Upload className="w-8 h-8 text-[#8DA173] mb-2" />
                    <span className="text-xs font-bold text-[#1A2E25]">Choose Bank Statement PDF or CSV</span>
                    <span className="text-[11px] text-[#738276] mt-1">Supports HDFC, ICICI, SBI, Axis, Kotak Bank formats</span>
                    <input
                      id="input-bank-file"
                      type="file"
                      accept=".pdf,.csv,.txt,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setBankFile(e.target.files[0]);
                          handleBankFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                  {isProcessingBank && (
                    <div className="flex items-center justify-center gap-2 text-xs text-[#2D4A3E] font-bold py-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-[#8DA173]" />
                      <span>Parsing Bank Statement via Gemini OCR & Auto-Tagging Transactions...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    id="textarea-paste-bank"
                    rows={6}
                    value={bankPasteText}
                    onChange={(e) => setBankPasteText(e.target.value)}
                    placeholder={`Date\tNarration\tRef\tWithdrawal\tDeposit\tBalance\n2024-04-10\tNEFT: INFOSYS BPM\tN123456\t147500\t0\t852500\n2024-04-12\tRTGS: GODREJ INFOTECH\tR987654\t0\t531000\t1383500`}
                    className="w-full p-3 text-xs font-mono border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173] bg-[#FDFDFC]"
                  />
                  <button
                    type="button"
                    onClick={handleBankPasteSubmit}
                    className="px-5 py-2 bg-[#2D4A3E] hover:bg-[#1E362C] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Parse & Post Transactions
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DIRECT COPY & PASTE SPREADSHEET */}
          {activeSubTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#2D4A3E] block mb-1">
                  Paste Purchase Register (Header row + tab-separated rows from Excel):
                </label>
                <textarea
                  id="textarea-paste-books"
                  rows={4}
                  placeholder={`GSTIN\tVendor\tInvoiceNo\tDate\tTaxable\tIGST\tCGST\tSGST\n27AABCU9603R1ZM\tInfosys BPM\tINV/23-24/0089\t12/10/2023\t125000\t22500\t0\t0`}
                  value={pasteBooksText}
                  onChange={(e) => setPasteBooksText(e.target.value)}
                  className="w-full text-xs font-mono p-3 border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173] bg-[#FDFDFC]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#2D4A3E] block mb-1">
                  Paste GSTR-2B Data (CSV text or raw JSON):
                </label>
                <textarea
                  id="textarea-paste-g2b"
                  rows={4}
                  placeholder={`GSTIN\tVendor\tInvoiceNo\tDate\tTaxable\tIGST\tCGST\tSGST\n27AABCU9603R1ZM\tInfosys BPM\tINV/23-24/0089\t12/10/2023\t125000\t22500\t0\t0`}
                  value={pasteGstr2bText}
                  onChange={(e) => setPasteGstr2bText(e.target.value)}
                  className="w-full text-xs font-mono p-3 border border-[#E0E4DE] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#8DA173] bg-[#FDFDFC]"
                />
              </div>
            </div>
          )}

          {/* TAB 5: GST SALES REGISTER TO ACCOUNTING SYNC */}
          {activeSubTab === 'sales_sync' && (
            <div className="space-y-4">
              <div className="bg-[#FAFBF9] p-4 rounded-xl border border-[#E0E4DE] flex items-start gap-3">
                <Scale className="w-5 h-5 text-[#8DA173] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#1A2E25]">
                    Sync GST Sales (GSTR-1 Outward Supplies) into Accounting Books
                  </h4>
                  <p className="text-xs text-[#56655A] leading-relaxed">
                    Automatically convert all filed GST outward invoices into your double-entry sales ledger. This updates <strong>Revenue in P&L, Trade Receivables in Balance Sheet</strong>, and generates individual <strong>Customer Account Statements</strong>.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-[#E0E4DE] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#56655A]">Available GST Outward Supplies:</span>
                  <span className="font-mono font-bold text-[#2D4A3E]">
                    {(salesData.length || gstr1Data.length)} Invoices
                  </span>
                </div>
                <div className="text-xs text-[#738276]">
                  Target Accounting Period: <strong>{targetFY}</strong> • <strong>{targetMonth}</strong>
                </div>

                <button
                  type="button"
                  onClick={handleSyncGstSalesToAccounting}
                  disabled={isSyncingSales}
                  className="w-full py-3 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncingSales ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncingSales
                      ? 'Syncing to Accounting...'
                      : 'Convert & Sync GST Sales to Accounting Ledgers'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F7F8F6] border-t border-[#E0E4DE] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#738276] hover:bg-[#E0E4DE] transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {activeSubTab === 'pdf' && (
            <div className="flex items-center gap-2 text-xs text-[#56655A]">
              <Sparkles className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>Use the workspace above to process & reconcile invoices</span>
            </div>
          )}

          {activeSubTab === 'files' && (
            <button
              id="btn-process-files"
              type="button"
              onClick={handleFileUpload}
              disabled={isProcessing}
              className="px-5 py-2 bg-[#8DA173] hover:bg-[#7A8E61] text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? 'Processing & Matching...' : 'Process & Reconcile'}
            </button>
          )}

          {activeSubTab === 'zip_2b' && (
            <button
              id="btn-process-zip-import"
              type="button"
              onClick={handleConfirmZipImport}
              disabled={isProcessingZip || !zipParseResult || zipParseResult.allRecords.length === 0}
              className="px-5 py-2 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isProcessingZip ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Unpacking ZIP Archive...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#8DA173]" />
                  <span>
                    {zipParseResult
                      ? `Import ${zipParseResult.totalInvoices} Invoices (${zipParseResult.periodsDetected.length} Periods)`
                      : 'Upload & Unpack ZIP'}
                  </span>
                </>
              )}
            </button>
          )}

          {activeSubTab === 'sales_import' && (
            <button
              id="btn-process-sales-import"
              type="button"
              onClick={salesImportMode === 'files' ? handleSalesRegisterFileProcess : handleSalesPasteProcess}
              disabled={isProcessingSales}
              className="px-5 py-2 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isProcessingSales ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Sales Data...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Import & Process Sales Register</span>
                </>
              )}
            </button>
          )}

          {activeSubTab === 'hsn_import' && (
            <button
              id="btn-process-hsn-import"
              type="button"
              onClick={hsnImportMode === 'files' ? handleHsnFileProcess : handleHsnPasteProcess}
              disabled={isProcessingHsn}
              className="px-5 py-2 bg-[#8DA173] hover:bg-[#7A8E61] text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isProcessingHsn ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Table 12 HSN...</span>
                </>
              ) : (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>Import Table 12 HSN Summary</span>
                </>
              )}
            </button>
          )}

          {activeSubTab === 'paste' && (
            <button
              id="btn-process-paste"
              type="button"
              onClick={handlePasteProcess}
              disabled={isProcessing}
              className="px-5 py-2 bg-[#8DA173] hover:bg-[#7A8E61] text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? 'Processing...' : 'Parse Pasted Data'}
            </button>
          )}

          {activeSubTab === 'bank' && (
            <div className="flex items-center gap-2 text-xs text-[#56655A]">
              <CreditCard className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>Uploaded bank transactions automatically post to Financial Ledgers</span>
            </div>
          )}

          {activeSubTab === 'sales_sync' && (
            <div className="flex items-center gap-2 text-xs text-[#56655A]">
              <Scale className="w-3.5 h-3.5 text-[#8DA173]" />
              <span>Syncing outward supplies updates Revenue and Trade Receivables</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
