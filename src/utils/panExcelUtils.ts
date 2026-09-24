import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { PanEntity, PanGstinBranch } from '../types';
import { GST_STATE_MAP, getPanEntityType } from './gstinUtils';

export interface ParseExcelResult {
  entities: PanEntity[];
  totalRows: number;
  totalPans: number;
  totalGstins: number;
  credentialsCount: number;
  errors: string[];
  warnings: string[];
}

/**
 * Standardizes column keys to match varied CA/enterprise spreadsheet header names.
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV file containing PAN-wise Multi-GSTIN data with credentials.
 */
export async function parsePanMasterExcel(file: File): Promise<ParseExcelResult> {
  const isCsv = file.name.endsWith('.csv');
  const buffer = await file.arrayBuffer();

  let rawRows: any[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    if (isCsv) {
      const text = new TextDecoder().decode(buffer);
      const parsedCsv = Papa.parse(text, { header: true, skipEmptyLines: true });
      rawRows = parsedCsv.data as any[];
    } else {
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    }
  } catch (err: any) {
    throw new Error(`Failed to read spreadsheet file: ${err?.message || err}`);
  }

  if (!rawRows || rawRows.length === 0) {
    throw new Error('Spreadsheet contains no data rows. Please use the template.');
  }

  const panMap = new Map<string, {
    pan: string;
    legalName: string;
    tradeName?: string;
    constitution: string;
    branches: PanGstinBranch[];
    defaultPortalUsername?: string;
  }>();

  let totalGstins = 0;
  let credentialsCount = 0;

  rawRows.forEach((row, index) => {
    // Map normalized headers
    const rowObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(row)) {
      rowObj[normalizeHeader(key)] = typeof val === 'string' ? val.trim() : String(val || '').trim();
    }

    // Extract PAN
    let pan = (
      rowObj['pan'] ||
      rowObj['panno'] ||
      rowObj['permanentaccountnumber'] ||
      rowObj['panid'] ||
      ''
    ).toUpperCase();

    // Extract GSTIN
    const gstin = (
      rowObj['gstin'] ||
      rowObj['gstinno'] ||
      rowObj['gstnumber'] ||
      rowObj['registrationnumber'] ||
      rowObj['gst'] ||
      ''
    ).toUpperCase();

    // If GSTIN provided without PAN, extract PAN from 3rd to 12th chars of GSTIN
    if (!pan && gstin.length === 15) {
      pan = gstin.slice(2, 12);
    }

    if (!pan && !gstin) {
      // Empty row or header repeat
      return;
    }

    if (pan.length !== 10) {
      warnings.push(`Row #${index + 2}: Invalid PAN "${pan}". Must be 10 alphanumeric characters.`);
      return;
    }

    const legalName =
      rowObj['legalname'] ||
      rowObj['companyname'] ||
      rowObj['entityname'] ||
      rowObj['taxpayername'] ||
      rowObj['clientname'] ||
      `Enterprise (${pan})`;

    const tradeName =
      rowObj['tradename'] ||
      rowObj['branchname'] ||
      rowObj['unitname'] ||
      legalName;

    const portalUsername =
      rowObj['portalusername'] ||
      rowObj['portalid'] ||
      rowObj['gstportalid'] ||
      rowObj['username'] ||
      rowObj['loginid'] ||
      rowObj['userid'] ||
      '';

    const portalPassword =
      rowObj['portalpassword'] ||
      rowObj['gstpassword'] ||
      rowObj['password'] ||
      rowObj['loginpassword'] ||
      rowObj['pwd'] ||
      '';

    const rawStateCode =
      rowObj['statecode'] ||
      rowObj['state'] ||
      rowObj['poscode'] ||
      (gstin.length === 15 ? gstin.slice(0, 2) : '27');

    const stateCode = rawStateCode.length === 1 ? `0${rawStateCode}` : rawStateCode.slice(0, 2);
    const stateName =
      rowObj['statename'] ||
      GST_STATE_MAP[stateCode] ||
      `State Code ${stateCode}`;

    const isPrincipal =
      rowObj['isprincipal']?.toLowerCase() === 'yes' ||
      rowObj['isprincipal']?.toLowerCase() === 'true' ||
      rowObj['hq']?.toLowerCase() === 'yes' ||
      rowObj['principal']?.toLowerCase() === 'yes';

    const registrationType = (rowObj['registrationtype'] || 'Regular') as any;
    const authorizedSignatory = rowObj['authorizedsignatory'] || rowObj['signatory'] || '';
    const returnFilingFrequency = (rowObj['returnfrequency'] || rowObj['frequency'] || 'MONTHLY').toUpperCase() as any;

    if (portalUsername || portalPassword) {
      credentialsCount++;
    }

    // Get or initialize PAN entity entry
    let panEntry = panMap.get(pan);
    if (!panEntry) {
      const constitution = getPanEntityType(pan);
      panEntry = {
        pan,
        legalName,
        tradeName,
        constitution,
        branches: [],
        defaultPortalUsername: portalUsername,
      };
      panMap.set(pan, panEntry);
    }

    // Add branch if valid GSTIN is present
    if (gstin && gstin.length === 15) {
      const branchExists = panEntry.branches.some((b) => b.gstin === gstin);
      if (!branchExists) {
        panEntry.branches.push({
          gstin,
          stateCode,
          stateName,
          tradeName,
          legalName,
          isPrincipal: isPrincipal || panEntry.branches.length === 0,
          registrationType,
          status: 'ACTIVE',
          portalUsername: portalUsername || panEntry.defaultPortalUsername,
          portalPassword,
          authorizedSignatory,
          returnFilingFrequency,
        });
        totalGstins++;
      }
    }
  });

  const entities: PanEntity[] = Array.from(panMap.values()).map((p) => ({
    pan: p.pan,
    legalName: p.legalName,
    tradeName: p.tradeName,
    constitution: p.constitution,
    branches: p.branches,
    primaryGstin: p.branches[0]?.gstin || '',
    defaultPortalUsername: p.defaultPortalUsername,
    lastUsedAt: new Date().toISOString(),
  }));

  return {
    entities,
    totalRows: rawRows.length,
    totalPans: entities.length,
    totalGstins,
    credentialsCount,
    errors,
    warnings,
  };
}

/**
 * Downloads a pre-formatted Excel workbook template for PAN-wise Multi-GSTIN bulk data import.
 */
export function downloadPanMasterExcelTemplate() {
  const templateData = [
    {
      'PAN': 'AAACA1234F',
      'Legal Name': 'Apex Global Technologies Ltd',
      'Trade / Branch Name': 'Apex Maharashtra HQ',
      'GSTIN': '27AAACA1234F1Z5',
      'Portal User ID': 'apex_mh_portal',
      'Portal Password': 'ApexSecure@2025',
      'State Code': '27',
      'State Name': 'Maharashtra',
      'Is Principal (Yes/No)': 'Yes',
      'Authorized Signatory': 'Rajesh Sharma',
      'Return Frequency': 'MONTHLY',
    },
    {
      'PAN': 'AAACA1234F',
      'Legal Name': 'Apex Global Technologies Ltd',
      'Trade / Branch Name': 'Apex Karnataka Tech Park',
      'GSTIN': '29AAACA1234F1Z8',
      'Portal User ID': 'apex_ka_portal',
      'Portal Password': 'ApexSecure@2025',
      'State Code': '29',
      'State Name': 'Karnataka',
      'Is Principal (Yes/No)': 'No',
      'Authorized Signatory': 'Pooja Hegde',
      'Return Frequency': 'MONTHLY',
    },
    {
      'PAN': 'AAACA1234F',
      'Legal Name': 'Apex Global Technologies Ltd',
      'Trade / Branch Name': 'Apex Delhi NCR Unit',
      'GSTIN': '07AAACA1234F1Z2',
      'Portal User ID': 'apex_dl_portal',
      'Portal Password': 'ApexSecure@2025',
      'State Code': '07',
      'State Name': 'Delhi',
      'Is Principal (Yes/No)': 'No',
      'Authorized Signatory': 'Vikas Malhotra',
      'Return Frequency': 'MONTHLY',
    },
    {
      'PAN': 'BBPPS8901K',
      'Legal Name': 'Bansal Industrial Corporation',
      'Trade / Branch Name': 'Bansal Haryana Mill',
      'GSTIN': '06BBPPS8901K1Z3',
      'Portal User ID': 'bansal_gst06',
      'Portal Password': 'BansalPass#99',
      'State Code': '06',
      'State Name': 'Haryana',
      'Is Principal (Yes/No)': 'Yes',
      'Authorized Signatory': 'Paras Bansal',
      'Return Frequency': 'MONTHLY',
    },
    {
      'PAN': 'CCXPB4432L',
      'Legal Name': 'Horizon Logistics LLP',
      'Trade / Branch Name': 'Horizon Gujarat Port Ops',
      'GSTIN': '24CCXPB4432L1Z9',
      'Portal User ID': 'horizon_gj_24',
      'Portal Password': 'Horizon@Logistics1',
      'State Code': '24',
      'State Name': 'Gujarat',
      'Is Principal (Yes/No)': 'Yes',
      'Authorized Signatory': 'Sunil Patel',
      'Return Frequency': 'QRMP_QUARTERLY',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);

  // Column width styling
  worksheet['!cols'] = [
    { wch: 14 }, // PAN
    { wch: 32 }, // Legal Name
    { wch: 28 }, // Trade Name
    { wch: 18 }, // GSTIN
    { wch: 20 }, // Portal User ID
    { wch: 20 }, // Portal Password
    { wch: 12 }, // State Code
    { wch: 18 }, // State Name
    { wch: 22 }, // Is Principal
    { wch: 22 }, // Authorized Signatory
    { wch: 18 }, // Return Frequency
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PAN_GSTIN_Master');

  XLSX.writeFile(workbook, 'PAN_MultiGSTIN_Credentials_Template.xlsx');
}

/**
 * Exports all active PAN Entities and their GSTIN branches/credentials into an Excel file.
 */
export function exportPanMasterToExcel(entities: PanEntity[]) {
  const exportRows: any[] = [];

  entities.forEach((entity) => {
    if (entity.branches.length === 0) {
      exportRows.push({
        'PAN': entity.pan,
        'Legal Name': entity.legalName,
        'Trade / Branch Name': entity.tradeName || entity.legalName,
        'GSTIN': '(Non-GST / URP)',
        'Portal User ID': entity.defaultPortalUsername || '',
        'Portal Password': '',
        'State Code': '',
        'State Name': '',
        'Constitution': entity.constitution,
        'Is Principal': 'Yes',
        'Authorized Signatory': '',
        'Return Frequency': '',
      });
    } else {
      entity.branches.forEach((b) => {
        exportRows.push({
          'PAN': entity.pan,
          'Legal Name': entity.legalName,
          'Trade / Branch Name': b.tradeName || entity.tradeName || entity.legalName,
          'GSTIN': b.gstin,
          'Portal User ID': b.portalUsername || entity.defaultPortalUsername || '',
          'Portal Password': b.portalPassword || '',
          'State Code': b.stateCode,
          'State Name': b.stateName,
          'Constitution': entity.constitution,
          'Is Principal': b.isPrincipal ? 'Yes' : 'No',
          'Authorized Signatory': b.authorizedSignatory || '',
          'Return Frequency': b.returnFilingFrequency || 'MONTHLY',
        });
      });
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 32 },
    { wch: 28 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 22 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'PAN_Master_Export');
  XLSX.writeFile(workbook, `PAN_Master_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
