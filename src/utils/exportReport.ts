import { ReconItem, ReconSummary } from '../types';

export function exportReconciliationToCsv(
  items: ReconItem[],
  summary: ReconSummary,
  clientName: string = 'Taxpayer',
  period: string = 'October 2024'
): void {
  const headers = [
    'Match Status',
    'GSTIN',
    'Supplier Name',
    'Books Invoice No',
    '2B Invoice No',
    'Books Date',
    '2B Date',
    'Books Taxable Value (₹)',
    '2B Taxable Value (₹)',
    'Taxable Diff (₹)',
    'Books Total Tax (₹)',
    '2B Total Tax (₹)',
    'Tax Diff (₹)',
    'Books IGST (₹)',
    '2B IGST (₹)',
    'Books CGST (₹)',
    '2B CGST (₹)',
    'Books SGST (₹)',
    '2B SGST (₹)',
    'Discrepancy Reason / Legal Flag',
    'ITC Status / Action Recommendation'
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[] = [];
  rows.push(`"GST RECONCILIATION & ITC AUDIT REPORT - ${clientName.toUpperCase()} - PERIOD: ${period.toUpperCase()}"`);
  rows.push(`"Generated on: ${new Date().toLocaleString('en-IN')}"`);
  rows.push('');
  
  // High Level Summary Block
  rows.push('"--- SUMMARY METRICS ---"');
  rows.push(`"Total Invoices in Books: ${summary.totalBookRecords}", "Total Books Tax: ₹${summary.totalBookTax.toFixed(2)}"`);
  rows.push(`"Total Invoices in GSTR-2B: ${summary.totalGstr2bRecords}", "Total 2B Tax: ₹${summary.totalGstr2bTax.toFixed(2)}"`);
  rows.push(`"Fully Matched Invoices: ${summary.matchedCount}", "Matched Tax: ₹${summary.matchedTax.toFixed(2)}"`);
  rows.push(`"Fuzzy Matched Invoices: ${summary.fuzzyMatchedCount}", "Fuzzy Tax: ₹${summary.fuzzyMatchedTax.toFixed(2)}"`);
  rows.push(`"Amount/Head Mismatches: ${summary.mismatchCount}", "Tax Variance: ₹${summary.mismatchTaxDiff.toFixed(2)}"`);
  rows.push(`"Missing in GSTR-2B (ITC At Risk): ${summary.missingIn2bCount}", "Risk Tax Amount: ₹${summary.missingIn2bTax.toFixed(2)}"`);
  rows.push(`"Missing in Books (Unclaimed ITC): ${summary.missingInBooksCount}", "Unclaimed Tax: ₹${summary.missingInBooksTax.toFixed(2)}"`);
  rows.push('');
  rows.push(headers.map(escapeCsv).join(','));

  for (const item of items) {
    const book = item.booksRecord;
    const g2b = item.gstr2bRecord;
    const disc = item.discrepancy;

    let actionRec = '';
    switch (item.matchStatus) {
      case 'EXACT_MATCH':
        actionRec = 'Eligible for 100% ITC claim in GSTR-3B Table 4(A)(5)';
        break;
      case 'FUZZY_MATCH':
        actionRec = 'Verify typo and accept ITC. Update invoice no in accounting';
        break;
      case 'VALUE_MISMATCH':
        actionRec = 'Reconcile value with vendor. Hold difference or claim lower of Books/2B';
        break;
      case 'HEAD_MISMATCH':
        actionRec = 'POS Mismatch: Ask supplier to amend in GSTR-1 Table 9A';
        break;
      case 'MISSING_IN_2B':
        actionRec = 'CRITICAL RISK: Do not claim in GSTR-3B under Sec 16(2)(aa). Send notice to vendor';
        break;
      case 'MISSING_IN_BOOKS':
        actionRec = 'Unclaimed ITC: Verify delivery and book purchase before Section 16(4) deadline';
        break;
      case 'INELIGIBLE_ITC':
        actionRec = 'Ineligible under Sec 17(5): Reverse in GSTR-3B Table 4(B)';
        break;
      default:
        actionRec = 'Manual Review Required';
    }

    const row = [
      item.matchStatus,
      item.gstin,
      item.vendorName,
      book?.invoiceNumber || '-',
      g2b?.invoiceNumber || '-',
      book?.invoiceDate || '-',
      g2b?.invoiceDate || '-',
      book?.taxableValue ?? '-',
      g2b?.taxableValue ?? '-',
      disc?.taxableDiff ?? 0,
      book?.totalTax ?? '-',
      g2b?.totalTax ?? '-',
      disc?.taxDiff ?? 0,
      book?.igst ?? '-',
      g2b?.igst ?? '-',
      book?.cgst ?? '-',
      g2b?.cgst ?? '-',
      book?.sgst ?? '-',
      g2b?.sgst ?? '-',
      disc?.mismatchedFields.join(' | ') || 'None',
      actionRec
    ];

    rows.push(row.map(escapeCsv).join(','));
  }

  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `GST_Recon_Report_${clientName.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download Sample CSV template for user convenience
export function downloadSampleCsvTemplate(type: 'books' | 'gstr2b' | 'sales'): void {
  let content = '';
  let filename = '';

  if (type === 'books') {
    filename = 'Sample_Purchase_Register.csv';
    content =
`GSTIN,Vendor Name,Invoice Number,Invoice Date,Taxable Value,IGST,CGST,SGST,Total Tax,Invoice Value,Place of Supply
27AABCT3518Q1ZV,Tata Steel Limited,TSL/2024/0981,04-10-2024,450000,81000,0,0,81000,531000,27-Maharashtra
29AABCI2341M1ZY,Infosys BPM Solutions,INF-2024-5542,08-10-2024,125000,0,11250,11250,22500,147500,27-Maharashtra
24AAACL1962L1ZT,Larsen & Toubro Electricals,LT/OCT/4412,12-10-2024,880000,158400,0,0,158400,1038400,24-Gujarat
07AAACR7854Q1ZU,Reliance Jio Infocomm Ltd,JIO/DEL/9088,15-10-2024,48500,8730,0,0,8730,57230,27-Maharashtra
27AABCB6712D1ZE,Blue Dart Express Logistics,BDE-2024-00192,18-10-2024,34200,0,3078,3078,6156,40356,27-Maharashtra
27AAACS8910P1Z4,Schneider Electric India,SEI/24-25/0890,19-10-2024,260000,0,23400,23400,46800,306800,27-Maharashtra
06AAACH2233M1ZQ,Apex Machinery & Tools Corp,AMT/2024/774,25-10-2024,310000,55800,0,0,55800,365800,27-Maharashtra`;
  } else if (type === 'gstr2b') {
    filename = 'Sample_GSTR_2B_Report.csv';
    content =
`GSTIN of Supplier,Trade/Legal Name,Invoice number,Invoice Date,Invoice Value,Taxable Value,Integrated Tax(₹),Central Tax(₹),State/UT Tax(₹),Cess(₹),ITC Available,Reason
27AABCT3518Q1ZV,Tata Steel Limited,TSL/2024/0981,04-10-2024,531000,450000,81000,0,0,0,Y,
29AABCI2341M1ZY,Infosys BPM Solutions,INF-2024-5542,08-10-2024,147500,125000,0,11250,11250,0,Y,
24AAACL1962L1ZT,Larsen & Toubro Electricals,LT/OCT/4412,12-10-2024,1038400,880000,158400,0,0,0,Y,
07AAACR7854Q1ZU,Reliance Jio Infocomm Ltd,JIO/DEL/9088,15-10-2024,57230,48500,8730,0,0,0,Y,
27AABCB6712D1ZE,Blue Dart Express Logistics,BDE-2024-00192,18-10-2024,40356,34200,0,3078,3078,0,Y,
27AAACS8910P1Z4,Schneider Electric India,SEI-24-25-890,19-10-2024,306800,260000,0,23400,23400,0,Y,
27AABCA3839K1ZM,Amazon Web Services India Pvt Ltd,AWS-INV-2024-912,28-10-2024,76700,65000,11700,0,0,0,Y,
27AAACE5566P1Z3,Executive Club & Hospitality,ECH/2024/339,30-10-2024,49560,42000,0,3780,3780,0,N,Section 17(5)(b)`;
  } else {
    filename = 'Sample_Sales_Register.csv';
    content =
`GSTIN of Recipient,Customer Name,Invoice Number,Invoice Date,Taxable Value,IGST,CGST,SGST,Total Tax,Invoice Value
27AAACE1234F1Z5,Acme Retail Pvt Ltd,SLS/2024/001,05-10-2024,200000,0,18000,18000,36000,236000
29AAACX9876Q1Z2,Zenith Technologies,SLS/2024/002,11-10-2024,150000,27000,0,0,27000,177000`;
  }

  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
