import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  UploadCloud,
  FileCode,
  CreditCard,
  Receipt,
  BookOpen,
  Scale,
  ShieldCheck,
  Info,
  ExternalLink,
  Layers,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Language } from '../types';
import { ImportTabType } from './UploadModal';
import {
  MEESHO_FORWARD_SALES_HEADERS,
  MEESHO_RETURNS_HEADERS,
  MEESHO_FORWARD_SAMPLE_DATA,
  MEESHO_RETURNS_SAMPLE_DATA,
} from '../utils/ecommerceParser';

interface TemplatesViewProps {
  language: Language;
  onOpenUpload: (tab?: ImportTabType) => void;
}

interface TemplateDefinition {
  id: string;
  title: string;
  category: 'E-Commerce (Meesho & Amazon)' | 'GST Inward (Purchases)' | 'GST Outward (Sales)' | 'Banking & Cash' | 'Financial Ledgers';
  badge: string;
  badgeColor: string;
  description: string;
  fileName: string;
  statutoryRef: string;
  targetUploadTab: ImportTabType;
  headers: string[];
  sampleRows: (string | number)[][];
  columnsDoc: {
    column: string;
    required: boolean;
    type: string;
    example: string;
    description: string;
  }[];
}

const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'purchase_register',
    title: 'Books Purchase Register (ERP / Tally / SAP)',
    category: 'GST Inward (Purchases)',
    badge: 'Inward Books',
    badgeColor: 'bg-[#EDF3EF] text-[#2D4A3E] border-[#D5E2D9]',
    description:
      'Standard format to import your internal purchase invoices, vendor bills, and expense vouchers recorded in your accounting software (Tally Prime, SAP, Zoho Books, Busy, etc.).',
    fileName: 'ClearGST_Purchase_Register_Template',
    statutoryRef: 'Section 16(2) CGST Act 2017 & Rule 36(4)',
    targetUploadTab: 'files',
    headers: [
      'Customer GSTIN (User Entity)',
      'Supplier GSTIN',
      'Supplier Trade Name',
      'Invoice Number',
      'Invoice Date (YYYY-MM-DD)',
      'Invoice Type',
      'Taxable Value',
      'IGST',
      'CGST',
      'SGST',
      'Cess',
      'Total Invoice Value',
      'Place of Supply',
      'Reverse Charge (Y/N)',
      'ITC Eligibility (Y/N)',
      'Document Notes',
    ],
    sampleRows: [
      [
        '27AABCA1234F1Z8',
        '27AABCT3518Q1ZV',
        'Tata Steel Limited',
        'TSL/2024/0981',
        '2024-10-04',
        'B2B',
        450000.0,
        81000.0,
        0.0,
        0.0,
        0.0,
        531000.0,
        '27-Maharashtra',
        'N',
        'Y',
        'Raw material steel coils',
      ],
      [
        '07AABCA1234F1Z9',
        '24AAACL1962L1ZT',
        'Larsen & Toubro Ltd',
        'LT/OCT/4412',
        '2024-10-12',
        'B2B',
        880000.0,
        158400.0,
        0.0,
        0.0,
        0.0,
        1038400.0,
        '24-Gujarat',
        'N',
        'Y',
        'Electrical transformer equipment',
      ],
    ],
    columnsDoc: [
      {
        column: 'Customer GSTIN (User Entity)',
        required: true,
        type: '15-char Alphanumeric',
        example: '27AABCA1234F1Z8',
        description: 'Your registered branch GSTIN under the active PAN that received the invoice (supports PAN-wide multi-branch entity management).',
      },
      {
        column: 'Supplier GSTIN',
        required: true,
        type: '15-char Alphanumeric',
        example: '27AABCT3518Q1ZV',
        description: '15-character valid GSTIN of the supplier providing goods/services.',
      },
      {
        column: 'Supplier Trade Name',
        required: true,
        type: 'Text',
        example: 'Tata Steel Limited',
        description: 'Legal trade or registered business name of the vendor.',
      },
      {
        column: 'Invoice Number',
        required: true,
        type: 'Text (up to 16 chars)',
        example: 'TSL/2024/0981',
        description: 'Vendor tax invoice number (alphanumeric with slashes or dashes).',
      },
      {
        column: 'Invoice Date',
        required: true,
        type: 'Date (YYYY-MM-DD or DD/MM/YYYY)',
        example: '2024-10-04',
        description: 'Date of issuance of the tax invoice by the supplier.',
      },
      {
        column: 'Invoice Type',
        required: false,
        type: 'Enum (B2B, CDNR, DE, SEZWP)',
        example: 'B2B',
        description: 'Classification of supply (defaults to B2B regular).',
      },
      {
        column: 'Taxable Value',
        required: true,
        type: 'Decimal Number',
        example: '450000.00',
        description: 'Assessable value before GST taxes.',
      },
      {
        column: 'IGST',
        required: false,
        type: 'Decimal Number',
        example: '81000.00',
        description: 'Integrated GST for inter-state transactions.',
      },
      {
        column: 'CGST',
        required: false,
        type: 'Decimal Number',
        example: '0.00',
        description: 'Central GST for intra-state transactions.',
      },
      {
        column: 'SGST',
        required: false,
        type: 'Decimal Number',
        example: '0.00',
        description: 'State/UT GST for intra-state transactions.',
      },
      {
        column: 'Total Invoice Value',
        required: true,
        type: 'Decimal Number',
        example: '531000.00',
        description: 'Gross invoice value = Taxable Value + Taxes.',
      },
      {
        column: 'Place of Supply',
        required: false,
        type: 'State Code / Name',
        example: '27-Maharashtra',
        description: '2-digit state code or state name where goods/services are supplied.',
      },
      {
        column: 'ITC Eligibility',
        required: false,
        type: 'Boolean (Y / N)',
        example: 'Y',
        description: 'Whether Input Tax Credit is legally eligible under Section 16/17(5).',
      },
    ],
  },
  {
    id: 'gstr2b_portal',
    title: 'GSTR-2B Inward Portal Return Template',
    category: 'GST Inward (Purchases)',
    badge: 'Government 2B',
    badgeColor: 'bg-[#FFF8E6] text-[#B8860B] border-[#FFE8A3]',
    description:
      'Official statutory schema matching the auto-drafted GSTR-2B statement generated by the GST Portal on the 14th of every month based on supplier GSTR-1 filings.',
    fileName: 'ClearGST_GSTR2B_Portal_Template',
    statutoryRef: 'Section 38(2) & Rule 60(7) CGST Rules',
    targetUploadTab: 'files',
    headers: [
      'GSTIN of Supplier',
      'Trade/Legal Name',
      'Invoice number',
      'Invoice type',
      'Invoice Date',
      'Invoice Value',
      'Place of supply',
      'Supply Attract Reverse Charge',
      'GSTR-1/5 Filing Date',
      'ITC Availability',
      'Reason for Ineligibility',
      'Applicable % of Tax Rate',
      'Taxable Value',
      'Integrated Tax',
      'Central Tax',
      'State/UT Tax',
      'Cess',
    ],
    sampleRows: [
      [
        '27AABCT3518Q1ZV',
        'Tata Steel Limited',
        'TSL/2024/0981',
        'B2B',
        '04-10-2024',
        531000.0,
        '27-Maharashtra',
        'N',
        '11-11-2024',
        'Y',
        '',
        18.0,
        450000.0,
        81000.0,
        0.0,
        0.0,
        0.0,
      ],
      [
        '29AABCI2341M1ZY',
        'Infosys BPM Solutions',
        'INF-2024-5542',
        'B2B',
        '08-10-2024',
        147500.0,
        '27-Maharashtra',
        'N',
        '10-11-2024',
        'Y',
        '',
        18.0,
        125000.0,
        0.0,
        11250.0,
        11250.0,
        0.0,
      ],
    ],
    columnsDoc: [
      {
        column: 'GSTIN of Supplier',
        required: true,
        type: '15-char String',
        example: '27AABCT3518Q1ZV',
        description: 'Supplier GSTIN from official portal auto-drafted file.',
      },
      {
        column: 'Trade/Legal Name',
        required: true,
        type: 'Text',
        example: 'Tata Steel Limited',
        description: 'Vendor legal name as per GSTN database.',
      },
      {
        column: 'Invoice number',
        required: true,
        type: 'Text',
        example: 'TSL/2024/0981',
        description: 'Supplier reported invoice number in their GSTR-1.',
      },
      {
        column: 'Invoice Date',
        required: true,
        type: 'DD-MM-YYYY or YYYY-MM-DD',
        example: '04-10-2024',
        description: 'Date reported in supplier GSTR-1 return.',
      },
      {
        column: 'Invoice Value',
        required: true,
        type: 'Decimal',
        example: '531000.00',
        description: 'Gross invoice value reported on portal.',
      },
      {
        column: 'ITC Availability',
        required: true,
        type: 'Y / N',
        example: 'Y',
        description: 'Govt determination of ITC availability (Rule 37A/Sec 16(2)(aa)).',
      },
      {
        column: 'Taxable Value',
        required: true,
        type: 'Decimal',
        example: '450000.00',
        description: 'Taxable base amount.',
      },
      {
        column: 'Integrated Tax / Central / State',
        required: true,
        type: 'Decimals',
        example: '81000 / 0 / 0',
        description: 'Tax breakdown under IGST, CGST, and SGST heads.',
      },
    ],
  },
  {
    id: 'sales_register',
    title: 'Books Sales Register (Outward Supplies)',
    category: 'GST Outward (Sales)',
    badge: 'Outward Books',
    badgeColor: 'bg-[#EDF3EF] text-[#2D4A3E] border-[#D5E2D9]',
    description:
      'Format to import all your customer sales invoices, B2B sales bills, export invoices, and credit notes for 2-way GSTR-1 reconciliation and automated trade debtor ledgers.',
    fileName: 'ClearGST_Sales_Register_Template',
    statutoryRef: 'Section 31 & Section 37 CGST Act',
    targetUploadTab: 'sales_import',
    headers: [
      'Vendor GSTIN (User Entity)',
      'Customer GSTIN',
      'Customer Legal/Trade Name',
      'Invoice Number',
      'Invoice Date (YYYY-MM-DD)',
      'Invoice Type',
      'Taxable Value',
      'IGST',
      'CGST',
      'SGST',
      'Cess',
      'Total Invoice Value',
      'Place of Supply',
      'Financial Year',
      'Tax Period',
      'Payment Status (PAID / UNPAID)',
    ],
    sampleRows: [
      [
        '27AABCA1234F1Z8',
        '27AAACG1122H1Z1',
        'Reliance Retail Ventures Ltd',
        'INV/2024/001',
        '2024-10-05',
        'B2B',
        250000.0,
        0.0,
        22500.0,
        22500.0,
        0.0,
        295000.0,
        '27-Maharashtra',
        '2024-25',
        '2024-10',
        'UNPAID',
      ],
      [
        '24AABCA1234F1Z2',
        '29AABCS8899K1Z4',
        'Wipro Digital Technologies',
        'INV/2024/002',
        '2024-10-14',
        'B2B',
        420000.0,
        75600.0,
        0.0,
        0.0,
        0.0,
        495600.0,
        '29-Karnataka',
        '2024-25',
        '2024-10',
        'PAID',
      ],
    ],
    columnsDoc: [
      {
        column: 'Vendor GSTIN (User Entity)',
        required: true,
        type: '15-char Alphanumeric',
        example: '27AABCA1234F1Z8',
        description: 'Your registered branch GSTIN under the active PAN that issued the sales invoice (supports PAN-wide multi-branch entity management).',
      },
      {
        column: 'Customer GSTIN',
        required: true,
        type: '15-char String / URP',
        example: '27AAACG1122H1Z1',
        description: 'Customer GSTIN for B2B or "URP" for unregistered consumers.',
      },
      {
        column: 'Customer Legal/Trade Name',
        required: true,
        type: 'Text',
        example: 'Reliance Retail Ventures Ltd',
        description: 'Name of the buyer / customer account.',
      },
      {
        column: 'Invoice Number',
        required: true,
        type: 'Text (up to 16 chars)',
        example: 'INV/2024/001',
        description: 'Sequential invoice number issued by your company.',
      },
      {
        column: 'Invoice Date',
        required: true,
        type: 'Date (YYYY-MM-DD)',
        example: '2024-10-05',
        description: 'Date of outward invoice.',
      },
      {
        column: 'Taxable Value',
        required: true,
        type: 'Decimal',
        example: '250000.00',
        description: 'Turnover value before taxes.',
      },
      {
        column: 'IGST / CGST / SGST',
        required: true,
        type: 'Decimals',
        example: '0 / 22500 / 22500',
        description: 'Output tax liability charged to customer.',
      },
      {
        column: 'Total Invoice Value',
        required: true,
        type: 'Decimal',
        example: '295000.00',
        description: 'Gross invoice receivable from customer.',
      },
      {
        column: 'Payment Status',
        required: false,
        type: 'PAID / UNPAID / PARTIAL',
        example: 'UNPAID',
        description: 'Receipt status for automated debtor aging.',
      },
    ],
  },
  {
    id: 'gstr1_portal',
    title: 'GSTR-1 Outward Return Portal Format (B2B)',
    category: 'GST Outward (Sales)',
    badge: 'Govt GSTR-1',
    badgeColor: 'bg-[#FFF8E6] text-[#B8860B] border-[#FFE8A3]',
    description:
      'Official CSV format for filing or reconciling GSTR-1 outward supplies table 4A, 4B, 4C, 6B, 6C against internal accounts.',
    fileName: 'ClearGST_GSTR1_Portal_Template',
    statutoryRef: 'Section 37 CGST Act & Rule 59',
    targetUploadTab: 'sales_import',
    headers: [
      'GSTIN/UIN of Recipient',
      'Receiver Name',
      'Invoice Number',
      'Invoice Date',
      'Invoice Value',
      'Place Of Supply',
      'Reverse Charge',
      'Applicable % of Tax Rate',
      'Invoice Type',
      'E-Commerce GSTIN',
      'Taxable Value',
      'Integrated Tax',
      'Central Tax',
      'State/UT Tax',
      'Cess Amount',
    ],
    sampleRows: [
      [
        '27AAACG1122H1Z1',
        'Reliance Retail Ventures Ltd',
        'INV/2024/001',
        '05-10-2024',
        295000.0,
        '27-Maharashtra',
        'N',
        18.0,
        'Regular',
        '',
        250000.0,
        0.0,
        22500.0,
        22500.0,
        0.0,
      ],
      [
        '29AABCS8899K1Z4',
        'Wipro Digital Technologies',
        'INV/2024/002',
        '14-10-2024',
        495600.0,
        '29-Karnataka',
        'N',
        18.0,
        'Regular',
        '',
        420000.0,
        75600.0,
        0.0,
        0.0,
        0.0,
      ],
    ],
    columnsDoc: [
      {
        column: 'GSTIN/UIN of Recipient',
        required: true,
        type: '15-char String',
        example: '27AAACG1122H1Z1',
        description: 'Customer GST registration identifier.',
      },
      {
        column: 'Invoice Number',
        required: true,
        type: 'Text',
        example: 'INV/2024/001',
        description: 'Official invoice number.',
      },
      {
        column: 'Invoice Date',
        required: true,
        type: 'DD-MM-YYYY',
        example: '05-10-2024',
        description: 'Date of bill in standard portal DD-MM-YYYY.',
      },
      {
        column: 'Invoice Value',
        required: true,
        type: 'Decimal',
        example: '295000.00',
        description: 'Total transaction value.',
      },
      {
        column: 'Place Of Supply',
        required: true,
        type: 'State Name / Code',
        example: '27-Maharashtra',
        description: 'State where supply took place.',
      },
      {
        column: 'Taxable Value',
        required: true,
        type: 'Decimal',
        example: '250000.00',
        description: 'Taxable amount.',
      },
      {
        column: 'Integrated / Central / State Tax',
        required: true,
        type: 'Decimals',
        example: '0 / 22500 / 22500',
        description: 'Taxes charged on supply.',
      },
    ],
  },
  {
    id: 'meesho_forward_sales',
    title: 'Meesho E-Commerce GST Sales & Forward Orders Report',
    category: 'E-Commerce (Meesho & Amazon)',
    badge: 'Meesho Forward Sales',
    badgeColor: 'bg-[#EDF3EF] text-[#2D4A3E] border-[#D5E2D9]',
    description:
      'Official Meesho Seller Panel format for forward sales orders (Delivered & Shipped). Used for reporting e-commerce outward supply turnover in GSTR-1 (Table 7 B2CS / Table 14), GSTR-3B Table 3.1.1, and TCS reconciliation under Section 52.',
    fileName: 'Meesho_Ecommerce_Forward_Sales_Report_Template',
    statutoryRef: 'Section 9(5), Section 52 & GSTR-1 Table 7 / 14',
    targetUploadTab: 'sales_import',
    headers: MEESHO_FORWARD_SALES_HEADERS,
    sampleRows: MEESHO_FORWARD_SAMPLE_DATA,
    columnsDoc: [
      {
        column: 'month',
        required: true,
        type: 'Date (YYYY-MM-DD)',
        example: '2024-10-01',
        description: 'GST tax return filing period start date.',
      },
      {
        column: 'order_date',
        required: true,
        type: 'Date (YYYY-MM-DD)',
        example: '2024-10-16',
        description: 'Date the retail customer placed the order on Meesho.',
      },
      {
        column: 'order_num & sub_order_num',
        required: true,
        type: 'String / Number',
        example: '77833560212099776 / 77833560212099776_1',
        description: 'Meesho master order and sub-order sequential reference (mapped as Invoice Number).',
      },
      {
        column: 'order_status',
        required: true,
        type: 'Enum (Delivered, Shipped, Return, rto, Cancelled)',
        example: 'Delivered',
        description: 'Fulfillment order status determining invoice issuance or credit note.',
      },
      {
        column: 'manifesttime',
        required: false,
        type: 'Date / Timestamp',
        example: '2024-10-16',
        description: 'Courier dispatch / handover timestamp from seller warehouse.',
      },
      {
        column: 'sup_name',
        required: true,
        type: 'Text',
        example: 'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED',
        description: 'Registered legal trade name of your e-commerce supplier entity.',
      },
      {
        column: 'state & pin',
        required: true,
        type: 'State Name & PIN',
        example: 'Delhi / 110035',
        description: 'Supplier origin dispatch state and postal code.',
      },
      {
        column: 'end_customer_state & end_customer_state_new',
        required: true,
        type: 'State Name',
        example: 'DELHI / UTTAR PRADESH / KARNATAKA',
        description: 'Place of Supply (POS) determining whether IGST or CGST+SGST applies.',
      },
      {
        column: 'gstin',
        required: true,
        type: '15-char GSTIN',
        example: '07AAECO2378J1Z6',
        description: 'Supplier GST registration number under which the sale is declared.',
      },
      {
        column: 'hsn_code',
        required: true,
        type: '4-8 digits',
        example: '711719',
        description: 'Harmonized System of Nomenclature code for product tax classification.',
      },
      {
        column: 'gst_rate',
        required: true,
        type: 'Percentage Decimal',
        example: '3.00',
        description: 'Statutory GST rate applied on the item (e.g. 3%, 5%, 12%, 18%).',
      },
      {
        column: 'gst_amount',
        required: true,
        type: 'Decimal',
        example: '5.56',
        description: 'Total GST tax charged on the goods (split into IGST or CGST/SGST based on POS).',
      },
      {
        column: 'tcs_taxable_amount',
        required: true,
        type: 'Decimal',
        example: '167.96',
        description: 'Statutory net taxable assessable value for GST reporting and Section 52 TCS credit.',
      },
      {
        column: 'meesho_price & total invoice value',
        required: true,
        type: 'Decimal',
        example: '191.00 / 173.00',
        description: 'Catalog listing price and final total invoice value including shipping.',
      },
      {
        column: 'financial_year & month_number',
        required: false,
        type: 'Number',
        example: '2024 / 10',
        description: 'Financial year and calendar month sequence for period allocation.',
      },
    ],
  },
  {
    id: 'meesho_returns_reversals',
    title: 'Meesho E-Commerce Returns & Reverse Supply Report (RTO / Credit Notes)',
    category: 'E-Commerce (Meesho & Amazon)',
    badge: 'Meesho Returns & RTO',
    badgeColor: 'bg-[#FFF2F0] text-[#C75D4E] border-[#FFCCC7]',
    description:
      'Official Meesho Seller Panel format for sales returns, courier returns (RTO), and post-dispatch cancellations. Powers automated credit notes under GST Section 34, netting off outward tax liability in GSTR-1 Table 7 / Table 9B.',
    fileName: 'Meesho_Ecommerce_Returns_And_Reversals_Template',
    statutoryRef: 'Section 34 CGST Act, Table 9B & Table 7 Netting',
    targetUploadTab: 'sales_import',
    headers: MEESHO_RETURNS_HEADERS,
    sampleRows: MEESHO_RETURNS_SAMPLE_DATA,
    columnsDoc: [
      {
        column: 'month & order_date',
        required: true,
        type: 'Date (YYYY-MM-DD)',
        example: '2024-10-01 / 2024-09-30',
        description: 'Original order and transaction placement period.',
      },
      {
        column: 'order_num & sub_order_num',
        required: true,
        type: 'String / Number',
        example: '72278799210804096 / 72278799210804096_1',
        description: 'Unique order identifier to match and reverse original forward sale.',
      },
      {
        column: 'order_status',
        required: true,
        type: 'Enum (Return, rto, Cancelled)',
        example: 'Return / rto',
        description: 'Specifies customer return, courier return-to-origin, or cancellation.',
      },
      {
        column: 'cancel_return_date',
        required: true,
        type: 'Date (YYYY-MM-DD)',
        example: '2024-10-08',
        description: 'Effective date of return receipt / reversal for Section 34 credit note booking.',
      },
      {
        column: 'sup_name & gstin',
        required: true,
        type: 'Text & 15-char GSTIN',
        example: 'ONECLICK ONLINE SHOPPEE PRIVATE LIMITED / 07AAECO2378J1Z6',
        description: 'Seller registered legal name and branch GSTIN.',
      },
      {
        column: 'end_customer_state_new',
        required: true,
        type: 'State Name',
        example: 'TELANGANA / UTTAR PRADESH / BIHAR',
        description: 'Original Place of Supply (POS) to reduce state-specific outward tax liability.',
      },
      {
        column: 'tcs_taxable_amount',
        required: true,
        type: 'Decimal',
        example: '245.63',
        description: 'Reversed taxable turnover to offset against forward sales.',
      },
      {
        column: 'gst_amount & gst_rate',
        required: true,
        type: 'Decimal',
        example: '7.37 / 3.00',
        description: 'Output tax reversed (credited back against GST liability).',
      },
      {
        column: 'penalty',
        required: false,
        type: 'Decimal',
        example: '0.00',
        description: 'Return penalty or return freight deduction applied by Meesho.',
      },
    ],
  },
  {
    id: 'amazon_b2cs_summary',
    title: 'Amazon Seller Central B2CS Monthly Tax Report (Table 7 Summary)',
    category: 'E-Commerce (Meesho & Amazon)',
    badge: 'Amazon B2CS Table 7',
    badgeColor: 'bg-[#FFF9E6] text-[#975A16] border-[#FFE79A]',
    description:
      'Official Amazon Seller Central monthly B2CS report containing State (POS), GST Rate, Gross Taxable Amount, Tax Rates, and E-Commerce Operator (ECO) details for direct upload into GSTR-1 Table 7.',
    fileName: 'Amazon_B2CS_Monthly_Tax_Report_Template',
    statutoryRef: 'Section 37 CGST Act, Table 7 B2CS Outward Supplies',
    targetUploadTab: 'sales_import',
    headers: [
      'Place Of Supply',
      'Rate',
      'Gross Taxable Amount',
      'CGST Amount',
      'SGST Amount',
      'IGST Amount',
      'Cess Amount',
      'Type',
      'E-Commerce GSTIN',
    ],
    sampleRows: [
      ['07-Delhi', 18, 145000.0, 13050.0, 13050.0, 0.0, 0, 'OE', '07AAACA6602R1ZT'],
      ['27-Maharashtra', 18, 210000.0, 0.0, 0.0, 37800.0, 0, 'OE', '07AAACA6602R1ZT'],
      ['29-Karnataka', 12, 85000.0, 0.0, 0.0, 10200.0, 0, 'OE', '07AAACA6602R1ZT'],
      ['06-Haryana', 5, 45000.0, 0.0, 0.0, 2250.0, 0, 'OE', '07AAACA6602R1ZT'],
      ['09-Uttar Pradesh', 18, 120000.0, 0.0, 0.0, 21600.0, 0, 'OE', '07AAACA6602R1ZT'],
    ],
    columnsDoc: [
      {
        column: 'Place Of Supply',
        required: true,
        type: 'State Code / Name',
        example: '07-Delhi / 27-Maharashtra',
        description: 'Destination State Place of Supply for intra vs inter-state tax routing.',
      },
      {
        column: 'Rate',
        required: true,
        type: 'Percentage (%)',
        example: '18 / 12 / 5',
        description: 'Statutory GST slab rate applicable on outward supplies.',
      },
      {
        column: 'Gross Taxable Amount',
        required: true,
        type: 'Decimal',
        example: '145000.00',
        description: 'Net taxable turnover after deducting marketplace cancellations and returns.',
      },
      {
        column: 'CGST, SGST, IGST Amount',
        required: true,
        type: 'Decimal',
        example: '13050.00 / 37800.00',
        description: 'Output tax collected on e-commerce outward consumer supplies.',
      },
      {
        column: 'Type & E-Commerce GSTIN',
        required: false,
        type: 'Text (OE / E) & GSTIN',
        example: 'OE / 07AAACA6602R1ZT',
        description: 'Indicates supply made through e-commerce operator (Section 9(5) / Section 52).',
      },
    ],
  },
  {
    id: 'amazon_hsn_summary',
    title: 'Amazon / ERP HSN-Wise Summary of Outward Supplies (Table 12)',
    category: 'E-Commerce (Meesho & Amazon)',
    badge: 'Table 12 HSN Summary',
    badgeColor: 'bg-[#EDF3EF] text-[#2D4A3E] border-[#D5E2D9]',
    description:
      'Official statutory HSN/SAC summary required under Table 12 of GSTR-1. Specifies HSN code, product description, unit quantity code (UQC), total quantity, taxable turnover, and applicable tax breakdown.',
    fileName: 'Amazon_ERP_Table12_HSN_Summary_Template',
    statutoryRef: 'Notification No. 78/2020 - Central Tax, Table 12 GSTR-1',
    targetUploadTab: 'hsn_import',
    headers: [
      'HSN',
      'Description',
      'UQC',
      'Total Quantity',
      'Total Value',
      'Taxable Value',
      'IGST Amount',
      'CGST Amount',
      'SGST Amount',
      'Cess Amount',
      'Rate',
    ],
    sampleRows: [
      ['61091000', 'Cotton T-Shirts Men/Women', 'PCS', 480, 240000.0, 228571.43, 5714.29, 2857.14, 2857.14, 0, 5],
      ['62034200', 'Men Denim Trousers', 'PCS', 320, 384000.0, 342857.14, 20571.43, 10285.71, 10285.71, 0, 12],
      ['85183000', 'Wireless Bluetooth Headphones', 'PCS', 150, 298500.0, 252966.1, 45533.9, 0, 0, 0, 18],
      ['42022200', 'Travel Duffle Bags', 'PCS', 95, 142500.0, 120762.71, 10868.64, 5434.32, 5434.32, 0, 18],
    ],
    columnsDoc: [
      {
        column: 'HSN',
        required: true,
        type: 'Numeric (4/6/8 digits)',
        example: '61091000 / 85183000',
        description: 'Harmonized System of Nomenclature code mandated for outward goods/services.',
      },
      {
        column: 'Description',
        required: true,
        type: 'Text',
        example: 'Cotton T-Shirts',
        description: 'Product or service classification description.',
      },
      {
        column: 'UQC',
        required: true,
        type: 'Standard GST UQC',
        example: 'PCS / NOS / KGS',
        description: 'Prescribed Unit Quantity Code (e.g. PCS for pieces, KGS for kilograms).',
      },
      {
        column: 'Total Quantity & Taxable Value',
        required: true,
        type: 'Number & Decimal',
        example: '480 / 228571.43',
        description: 'Total units sold and net taxable value after trade discounts and returns.',
      },
      {
        column: 'Tax Breakup (IGST / CGST / SGST)',
        required: true,
        type: 'Decimal',
        example: '5714.29 / 2857.14',
        description: 'Central, State and Integrated tax amounts computed as per state destination.',
      },
    ],
  },
  {
    id: 'bank_of_baroda_statement',
    title: 'Bank of Baroda Customer Account Ledger (REP31)',
    category: 'Banking & Cash',
    badge: 'BOB Format',
    badgeColor: 'bg-[#FFF8E6] text-[#B8860B] border-[#FFE8A3]',
    description:
      'Official Bank of Baroda Customer Account Ledger (REP31) print format with GL Date, Value Date, Tran Id, Instrument Number, Debit/Credit columns, and Cr/Dr running balance.',
    fileName: 'ClearGST_Bank_of_Baroda_REP31_Template',
    statutoryRef: 'Bank of Baroda Core Banking (Finacle REP31 Ledger)',
    targetUploadTab: 'bank',
    headers: [
      'GL. Date',
      'Value Date',
      'Tran Id',
      'Instrmnt Number',
      'Particulars',
      'Transaction Debit Amount',
      'Transaction Credit Amount',
      'Balance',
    ],
    sampleRows: [
      [
        '02-04-2025',
        '01-04-2025',
        'S56536340',
        '',
        'UPI/521856104222/10:06:13/UPI/paytm.s1ajqvr@pty/P',
        38.0,
        0.0,
        '1,09,036.82Cr',
      ],
      [
        '02-04-2025',
        '02-04-2025',
        'U57576390',
        '',
        'NEFT-SBIN125092306409-POWER GRID CORPORATION OF IN',
        0.0,
        5149.0,
        '90,095.82Cr',
      ],
      [
        '18-06-2025',
        '18-06-2025',
        '00449098',
        '',
        'BY CASH',
        0.0,
        100000.0,
        '1,17,496.39Cr',
      ],
      [
        '18-06-2025',
        '18-06-2025',
        '00455396',
        '',
        'MAMTA BANSAL',
        0.0,
        200000.0,
        '3,17,496.39Cr',
      ],
      [
        '01-05-2025',
        '30-04-2025',
        'S35290400',
        '',
        '21240100016941:Int.Pd:01-02-2025 to 30-04-2025',
        0.0,
        415.0,
        '95,472.58Cr',
      ],
      [
        '24-06-2025',
        '24-06-2025',
        'S96549101',
        '',
        'SMS Charges for MAY 25',
        0.47,
        0.0,
        '1,03,833.60Cr',
      ],
    ],
    columnsDoc: [
      {
        column: 'GL. Date',
        required: true,
        type: 'Date (DD-MM-YYYY)',
        example: '02-04-2025',
        description: 'General Ledger posting date recorded by Bank of Baroda.',
      },
      {
        column: 'Value Date',
        required: true,
        type: 'Date (DD-MM-YYYY)',
        example: '01-04-2025',
        description: 'Effective transaction value date.',
      },
      {
        column: 'Tran Id',
        required: true,
        type: 'Alphanumeric',
        example: 'S56536340 / U57576390',
        description: 'Bank of Baroda transaction sequence number or reference identifier.',
      },
      {
        column: 'Instrmnt Number',
        required: false,
        type: 'Alphanumeric',
        example: '00449098',
        description: 'Cheque or cash deposit slip instrument number.',
      },
      {
        column: 'Particulars',
        required: true,
        type: 'Text',
        example: 'UPI/521856104222/10:06:13/UPI/paytm.s1ajqvr@pty/P',
        description: 'Complete transaction description, NEFT UTR, or UPI handle.',
      },
      {
        column: 'Transaction Debit Amount',
        required: false,
        type: 'Decimal',
        example: '38.00',
        description: 'Outward payments / withdrawals from your account.',
      },
      {
        column: 'Transaction Credit Amount',
        required: false,
        type: 'Decimal',
        example: '5149.00',
        description: 'Inward receipts / credits to your account.',
      },
      {
        column: 'Balance',
        required: true,
        type: 'Decimal with Cr/Dr',
        example: '1,09,036.82Cr',
        description: 'Closing running balance after transaction.',
      },
    ],
  },
  {
    id: 'bank_statement',
    title: 'Bank Passbook & Cash Statement Format (Multi-Bank)',
    category: 'Banking & Cash',
    badge: 'Banking Ledger',
    badgeColor: 'bg-[#EDF3EF] text-[#2D4A3E] border-[#D5E2D9]',
    description:
      'Standard tabular format for bank statements (HDFC, ICICI, SBI, Axis, Kotak, etc.) to feed automated double-entry cash ledgers, vendor payment matching, and debtor receipts.',
    fileName: 'ClearGST_Bank_Statement_Template',
    statutoryRef: 'Banking Reconciliation & Double-Entry Ledgers',
    targetUploadTab: 'bank',
    headers: [
      'Transaction Date (YYYY-MM-DD)',
      'Narration / Description',
      'Reference / Chq / UTR No',
      'Withdrawal (Debit Dr)',
      'Deposit (Credit Cr)',
      'Running Balance',
      'Category Tag',
      'Counterparty Name',
      'Counterparty GSTIN',
    ],
    sampleRows: [
      [
        '2024-10-06',
        'RTGS/CMS/TATASTEEL/INV981',
        'CMS9918231',
        531000.0,
        0.0,
        2469000.0,
        'VENDOR_PAYMENT',
        'Tata Steel Limited',
        '27AABCT3518Q1ZV',
      ],
      [
        '2024-10-18',
        'NEFT/RELIANCE/INV001',
        'NEFT771239',
        0.0,
        295000.0,
        2764000.0,
        'CUSTOMER_RECEIPT',
        'Reliance Retail Ventures Ltd',
        '27AAACG1122H1Z1',
      ],
      [
        '2024-10-20',
        'GST CHALLAN PMT-06 OCT 24',
        'GSTPMT88219',
        85000.0,
        0.0,
        2679000.0,
        'GST_CHALLAN_PAYMENT',
        'GST Council / Portal',
        '27AAACG1122H1Z1',
      ],
    ],
    columnsDoc: [
      {
        column: 'Transaction Date',
        required: true,
        type: 'Date (YYYY-MM-DD or DD/MM/YYYY)',
        example: '2024-10-06',
        description: 'Value date of bank debit or credit.',
      },
      {
        column: 'Narration / Description',
        required: true,
        type: 'Text',
        example: 'RTGS/CMS/TATASTEEL/INV981',
        description: 'Bank entry description or transaction remarks.',
      },
      {
        column: 'Reference / Chq / UTR No',
        required: false,
        type: 'Alphanumeric',
        example: 'CMS9918231',
        description: 'UTR number, cheque number, or transaction reference ID.',
      },
      {
        column: 'Withdrawal (Debit Dr)',
        required: true,
        type: 'Decimal (>= 0)',
        example: '531000.00',
        description: 'Money deducted from bank account (Vendor payment, salaries, taxes).',
      },
      {
        column: 'Deposit (Credit Cr)',
        required: true,
        type: 'Decimal (>= 0)',
        example: '295000.00',
        description: 'Money credited to bank account (Customer receipts, sales collections).',
      },
      {
        column: 'Running Balance',
        required: false,
        type: 'Decimal',
        example: '2469000.00',
        description: 'Bank closing ledger balance after transaction.',
      },
      {
        column: 'Category Tag',
        required: false,
        type: 'Enum',
        example: 'VENDOR_PAYMENT / CUSTOMER_RECEIPT',
        description: 'Auto-tagged classification head.',
      },
    ],
  },
  {
    id: 'trial_balance',
    title: 'Opening Trial Balance & Chart of Accounts',
    category: 'Financial Ledgers',
    badge: 'Double-Entry',
    badgeColor: 'bg-[#EDF3EF] text-[#2D4A3E] border-[#D5E2D9]',
    description:
      'Standard double-entry Chart of Accounts and Opening Trial Balance template to seed nominal, real, and personal balances for audited financial compilation.',
    fileName: 'ClearGST_Opening_Trial_Balance_Template',
    statutoryRef: 'Schedule III Companies Act 2013',
    targetUploadTab: 'bank',
    headers: [
      'Account Code',
      'Account Head Name',
      'Group Classification',
      'Opening Debit (Dr INR)',
      'Opening Credit (Cr INR)',
      'Financial Year',
    ],
    sampleRows: [
      ['1010', 'HDFC Current Bank A/c 502000123', 'Bank Accounts', 3000000.0, 0.0, '2024-25'],
      ['1020', 'Cash-in-Hand Imprest', 'Cash-in-Hand', 50000.0, 0.0, '2024-25'],
      ['2010', 'Share Capital & Reserves', 'Capital & Reserves', 0.0, 2500000.0, '2024-25'],
      ['3010', 'Secured Term Loan (HDFC Bank)', 'Loans & Borrowings', 0.0, 550000.0, '2024-25'],
    ],
    columnsDoc: [
      {
        column: 'Account Code',
        required: true,
        type: 'String / Number',
        example: '1010',
        description: 'Internal ledger chart code.',
      },
      {
        column: 'Account Head Name',
        required: true,
        type: 'Text',
        example: 'HDFC Current Bank A/c 502000123',
        description: 'General ledger account head name.',
      },
      {
        column: 'Group Classification',
        required: true,
        type: 'Standard Group',
        example: 'Bank Accounts / Sundry Creditors / Fixed Assets',
        description: 'Accounting hierarchy group as per Schedule III.',
      },
      {
        column: 'Opening Debit (Dr)',
        required: true,
        type: 'Decimal',
        example: '3000000.00',
        description: 'Debit balance (Assets & Expenses).',
      },
      {
        column: 'Opening Credit (Cr)',
        required: true,
        type: 'Decimal',
        example: '2500000.00',
        description: 'Credit balance (Liabilities, Capital & Incomes).',
      },
    ],
  },
];

export const TemplatesView: React.FC<TemplatesViewProps> = ({ language, onOpenUpload }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>('purchase_register');

  // Trigger CSV Download
  const handleDownloadCsv = (t: TemplateDefinition) => {
    const csvContent = [
      t.headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
      ...t.sampleRows.map((row) =>
        row
          .map((val) => {
            if (typeof val === 'number') return val;
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${t.fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Trigger Excel (.xlsx) Download
  const handleDownloadExcel = (t: TemplateDefinition) => {
    const wb = XLSX.utils.book_new();
    const sheetData = [t.headers, ...t.sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Auto calculate column widths
    const colWidths = t.headers.map((h, i) => {
      let maxLen = h.length;
      t.sampleRows.forEach((row) => {
        const cellVal = String(row[i] || '');
        if (cellVal.length > maxLen) maxLen = cellVal.length;
      });
      return { wch: Math.min(Math.max(maxLen + 4, 12), 40) };
    });
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${t.fileName}.xlsx`);
  };

  // Download All Templates as a Single Master Excel Workbook
  const handleDownloadMasterWorkbook = () => {
    const wb = XLSX.utils.book_new();

    TEMPLATES.forEach((t) => {
      const sheetData = [t.headers, ...t.sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const sheetName = t.title.slice(0, 31).replace(/[\/\?\*\[\]]/g, '');
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, 'ClearGST_Master_Statutory_Templates_Suite.xlsx');
  };

  // Copy CSV Headers to Clipboard
  const handleCopyHeaders = (t: TemplateDefinition) => {
    const headerStr = t.headers.join(',');
    navigator.clipboard.writeText(headerStr).then(() => {
      setCopiedTemplateId(t.id);
      setTimeout(() => setCopiedTemplateId(null), 2000);
    });
  };

  const categories = [
    'ALL',
    'E-Commerce (Meesho & Amazon)',
    'GST Outward (Sales)',
    'GST Inward (Purchases)',
    'Banking & Cash',
    'Financial Ledgers',
  ];

  const filteredTemplates =
    selectedCategory === 'ALL'
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div id="templates-view-container" className="p-4 sm:p-6 lg:p-8 max-w-6xl xl:max-w-7xl 2xl:max-w-[1500px] mx-auto space-y-8 pb-20">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl border border-[#E0E4DE] p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-[#EDF3EF] text-[#2D4A3E] border border-[#D5E2D9]">
            <ShieldCheck className="w-4 h-4 text-[#8DA173]" />
            <span>Official GSTN & Statutory Schedule III Compliant Schemas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1A2E25] tracking-tight">
            CSV & Excel Import Templates Hub
          </h1>
          <p className="text-xs sm:text-sm text-[#56655A] leading-relaxed">
            Download pre-formatted blank templates for your Purchase Register, GSTR-2B, Sales Register, Meesho E-Commerce Sales & Returns, Bank Statement, and Trial Balance. Fill in your actual business records and import them with 100% column accuracy.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 w-full lg:w-auto">
          <button
            onClick={handleDownloadMasterWorkbook}
            className="px-5 py-3 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-2xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#8DA173]" />
            <span>Download All Templates (.xlsx Suite)</span>
          </button>
        </div>
      </div>

      {/* Category Navigation Filter */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E0E4DE] pb-3">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#2D4A3E] text-white shadow-xs'
                  : 'bg-white text-[#56655A] hover:bg-[#EDF3EF] hover:text-[#1A2E25] border border-[#E0E4DE]'
              }`}
            >
              {cat === 'ALL' ? `All Templates (${TEMPLATES.length})` : cat}
            </button>
          );
        })}
      </div>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => {
          const isExpanded = expandedDocId === template.id;
          const isCopied = copiedTemplateId === template.id;

          return (
            <div
              key={template.id}
              className="bg-white rounded-2xl border border-[#E0E4DE] p-6 shadow-xs space-y-5 hover:border-[#8DA173] transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header & Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EDF3EF] flex items-center justify-center text-[#2D4A3E] shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#1A2E25] tracking-tight">
                        {template.title}
                      </h3>
                      <span className="text-[11px] text-[#738276] font-mono">
                        {template.statutoryRef}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${template.badgeColor} shrink-0`}
                  >
                    {template.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-[#56655A] leading-relaxed">
                  {template.description}
                </p>

                {/* Headers Preview Strip */}
                <div className="bg-[#F7F8F6] p-3 rounded-xl border border-[#E0E4DE] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#738276]">
                    <span>Included Column Headers ({template.headers.length})</span>
                    <button
                      type="button"
                      onClick={() => handleCopyHeaders(template)}
                      className="inline-flex items-center gap-1 text-[#2D4A3E] hover:text-[#1E362C] transition-colors cursor-pointer font-bold"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-[#8DA173]" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Headers</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pt-1">
                    {template.headers.map((h, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-white border border-[#D5E2D9] rounded-md text-[10px] font-mono text-[#2D4A3E]"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Expandable Column Documentation */}
                <div>
                  <button
                    type="button"
                    onClick={() => setExpandedDocId(isExpanded ? null : template.id)}
                    className="text-xs font-bold text-[#2D4A3E] hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span>{isExpanded ? 'Hide Column Schema Details' : 'View Column Schema & Validation Rules'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 bg-white rounded-xl border border-[#E0E4DE] overflow-x-auto max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#EDF3EF] text-[#2D4A3E] border-b border-[#D5E2D9]">
                            <th className="p-2 font-bold">Column Name</th>
                            <th className="p-2 font-bold">Required?</th>
                            <th className="p-2 font-bold">Data Type</th>
                            <th className="p-2 font-bold">Example</th>
                            <th className="p-2 font-bold">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E0E4DE]">
                          {template.columnsDoc.map((col, idx) => (
                            <tr key={idx} className="hover:bg-[#F7F8F6]">
                              <td className="p-2 font-bold text-[#1A2E25] font-mono">{col.column}</td>
                              <td className="p-2">
                                {col.required ? (
                                  <span className="px-1.5 py-0.5 bg-[#FFF2F0] text-[#C75D4E] rounded text-[10px] font-bold">
                                    Mandatory
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-[#F1F3EE] text-[#738276] rounded text-[10px]">
                                    Optional
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-[11px] text-[#56655A] font-mono">{col.type}</td>
                              <td className="p-2 font-mono text-[11px] text-[#2D4A3E]">{col.example}</td>
                              <td className="p-2 text-[11px] text-[#738276] leading-snug">{col.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#E0E4DE] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadCsv(template)}
                    className="px-3.5 py-2 bg-white border border-[#E0E4DE] hover:bg-[#F7F8F6] text-[#2D4A3E] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Download blank CSV template"
                  >
                    <Download className="w-3.5 h-3.5 text-[#8DA173]" />
                    <span>Download .CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadExcel(template)}
                    className="px-3.5 py-2 bg-white border border-[#E0E4DE] hover:bg-[#F7F8F6] text-[#2D4A3E] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Download blank Excel spreadsheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#2D4A3E]" />
                    <span>Download .XLSX</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenUpload(template.targetUploadTab)}
                  className="px-4 py-2 bg-[#2D4A3E] hover:bg-[#1E362C] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-[#8DA173]" />
                  <span>Import With This Format</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
