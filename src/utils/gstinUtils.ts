import { PanEntity, PanGstinBranch } from '../types';

// Indian GST State Code Directory (01 to 38 + 97/99)
export const GST_STATE_MAP: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

export interface ClientGstinProfile {
  gstin: string;
  tradeName: string;
  legalName?: string;
  state: string;
  stateCode: string;
  pan: string;
  category?: string;
  lastUsedAt?: string;
}

// Enterprise Multi-GSTIN PAN Entities (Pre-configured master directory)
export const POPULAR_PAN_ENTITIES: PanEntity[] = [
  {
    pan: 'AABCA1234F',
    legalName: 'Apex Audit & Taxation Advisory LLP',
    tradeName: 'Apex Advisory Group',
    constitution: 'Partnership Firm / LLP',
    primaryGstin: '27AABCA1234F1Z8',
    branches: [
      {
        gstin: '27AABCA1234F1Z8',
        stateCode: '27',
        stateName: 'Maharashtra',
        tradeName: 'Apex Advisory (Mumbai HQ)',
        legalName: 'Apex Audit & Taxation Advisory LLP',
        isPrincipal: true,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
      {
        gstin: '07AABCA1234F1Z9',
        stateCode: '07',
        stateName: 'Delhi',
        tradeName: 'Apex Advisory (Delhi NCR Branch)',
        legalName: 'Apex Audit & Taxation Advisory LLP',
        isPrincipal: false,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
      {
        gstin: '24AABCA1234F1Z2',
        stateCode: '24',
        stateName: 'Gujarat',
        tradeName: 'Apex Advisory (Ahmedabad Unit)',
        legalName: 'Apex Audit & Taxation Advisory LLP',
        isPrincipal: false,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
      {
        gstin: '29AABCA1234F1Z5',
        stateCode: '29',
        stateName: 'Karnataka',
        tradeName: 'Apex Advisory (Bengaluru Tech Office)',
        legalName: 'Apex Audit & Taxation Advisory LLP',
        isPrincipal: false,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
    ],
  },
  {
    pan: 'AAACV4567B',
    legalName: 'Verma & Associates (Chartered Accountants)',
    tradeName: 'Verma & Associates CA',
    constitution: 'Partnership Firm / LLP',
    primaryGstin: '07AAACV4567B1Z2',
    branches: [
      {
        gstin: '07AAACV4567B1Z2',
        stateCode: '07',
        stateName: 'Delhi',
        tradeName: 'Verma & Associates (Central Delhi)',
        legalName: 'Verma & Associates (Chartered Accountants)',
        isPrincipal: true,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
      {
        gstin: '09AAACV4567B1Z8',
        stateCode: '09',
        stateName: 'Uttar Pradesh',
        tradeName: 'Verma & Associates (Noida Unit)',
        legalName: 'Verma & Associates (Chartered Accountants)',
        isPrincipal: false,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
      {
        gstin: '06AAACV4567B1Z4',
        stateCode: '06',
        stateName: 'Haryana',
        tradeName: 'Verma & Associates (Gurugram Branch)',
        legalName: 'Verma & Associates (Chartered Accountants)',
        isPrincipal: false,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
    ],
  },
  {
    pan: 'AABCP9876C',
    legalName: 'National Enterprises & Logistics Ltd',
    tradeName: 'National Logistics Group',
    constitution: 'Company (Pvt Ltd / Ltd)',
    primaryGstin: '29AABCP9876C1Z5',
    branches: [
      {
        gstin: '29AABCP9876C1Z5',
        stateCode: '29',
        stateName: 'Karnataka',
        tradeName: 'National Logistics (Bengaluru Hub)',
        legalName: 'National Enterprises & Logistics Ltd',
        isPrincipal: true,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
      {
        gstin: '27AABCP9876C1Z9',
        stateCode: '27',
        stateName: 'Maharashtra',
        tradeName: 'National Logistics (Nhava Sheva Port Unit)',
        legalName: 'National Enterprises & Logistics Ltd',
        isPrincipal: false,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
      {
        gstin: '33AABCP9876C1Z7',
        stateCode: '33',
        stateName: 'Tamil Nadu',
        tradeName: 'National Logistics (Chennai Depot)',
        legalName: 'National Enterprises & Logistics Ltd',
        isPrincipal: false,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
      {
        gstin: '36AABCP9876C1Z1',
        stateCode: '36',
        stateName: 'Telangana',
        tradeName: 'National Logistics (Hyderabad Distribution)',
        legalName: 'National Enterprises & Logistics Ltd',
        isPrincipal: false,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
    ],
  },
  {
    pan: 'AAACT1234D',
    legalName: 'Gujarat Polymers & Chemicals Pvt Ltd',
    tradeName: 'Gujarat Polymers Group',
    constitution: 'Company (Pvt Ltd / Ltd)',
    primaryGstin: '24AAACT1234D1Z9',
    branches: [
      {
        gstin: '24AAACT1234D1Z9',
        stateCode: '24',
        stateName: 'Gujarat',
        tradeName: 'Gujarat Polymers (Vadodara Plant)',
        legalName: 'Gujarat Polymers & Chemicals Pvt Ltd',
        isPrincipal: true,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
      {
        gstin: '27AAACT1234D1Z3',
        stateCode: '27',
        stateName: 'Maharashtra',
        tradeName: 'Gujarat Polymers (Tarapur Depot)',
        legalName: 'Gujarat Polymers & Chemicals Pvt Ltd',
        isPrincipal: false,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
    ],
  },
  {
    pan: 'AAACG1122H',
    legalName: 'Reliance Retail Ventures Ltd',
    tradeName: 'Reliance Retail Group',
    constitution: 'Company (Pvt Ltd / Ltd)',
    primaryGstin: '27AAACG1122H1Z1',
    branches: [
      {
        gstin: '27AAACG1122H1Z1',
        stateCode: '27',
        stateName: 'Maharashtra',
        tradeName: 'Reliance Retail (Mumbai HQ)',
        legalName: 'Reliance Retail Ventures Ltd',
        isPrincipal: true,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
      {
        gstin: '07AAACG1122H1Z2',
        stateCode: '07',
        stateName: 'Delhi',
        tradeName: 'Reliance Retail (Delhi North Hub)',
        legalName: 'Reliance Retail Ventures Ltd',
        isPrincipal: false,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
      {
        gstin: '24AAACG1122H1Z7',
        stateCode: '24',
        stateName: 'Gujarat',
        tradeName: 'Reliance Retail (Ahmedabad Mart)',
        legalName: 'Reliance Retail Ventures Ltd',
        isPrincipal: false,
        registrationType: 'Regular',
        status: 'ACTIVE',
      },
    ],
  },
];

export const POPULAR_CLIENT_PROFILES: ClientGstinProfile[] = POPULAR_PAN_ENTITIES.flatMap((p) =>
  p.branches.map((b) => ({
    gstin: b.gstin,
    tradeName: b.tradeName || p.tradeName || p.legalName,
    legalName: p.legalName,
    state: b.stateName,
    stateCode: b.stateCode,
    pan: p.pan,
    category: p.constitution,
  }))
);

export function extractPanFromGstin(gstin: string): string {
  const clean = (gstin || '').trim().toUpperCase();
  if (clean.length === 15) {
    return clean.slice(2, 12);
  }
  if (clean.length === 10) {
    return clean;
  }
  return '';
}

export function getPanEntityType(pan: string): string {
  if (!pan || pan.length < 4) return 'Registered Business';
  const panChar = pan[3].toUpperCase();
  switch (panChar) {
    case 'C':
      return 'Company (Pvt Ltd / Public Ltd)';
    case 'P':
      return 'Individual / Proprietorship';
    case 'F':
      return 'Partnership Firm / LLP';
    case 'A':
      return 'Association of Persons (AOP)';
    case 'T':
      return 'Trust';
    case 'H':
      return 'Hindu Undivided Family (HUF)';
    case 'G':
      return 'Government Agency';
    case 'L':
      return 'Local Authority';
    case 'J':
      return 'Artificial Juridical Person';
    default:
      return 'Registered Entity';
  }
}

export function validatePanStructure(pan: string): {
  isValid: boolean;
  cleanPan: string;
  constitution: string;
  message: string;
} {
  const cleanPan = (pan || '').trim().toUpperCase();
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const isValid = panRegex.test(cleanPan);
  const constitution = getPanEntityType(cleanPan);

  return {
    isValid,
    cleanPan,
    constitution,
    message: isValid
      ? `Valid 10-Character PAN • ${constitution}`
      : `PAN must be exactly 10 alphanumeric characters (e.g. AABCA1234F, currently ${cleanPan.length})`,
  };
}

export function validateGstinStructure(gstin: string): {
  isValid: boolean;
  stateCode: string;
  stateName: string;
  pan: string;
  entityType: string;
  message?: string;
} {
  const clean = (gstin || '').trim().toUpperCase();

  if (clean.length !== 15) {
    return {
      isValid: false,
      stateCode: clean.slice(0, 2),
      stateName: GST_STATE_MAP[clean.slice(0, 2)] || 'Unknown State',
      pan: clean.slice(2, 12),
      entityType: 'Unknown',
      message: `GSTIN must be exactly 15 characters (currently ${clean.length})`,
    };
  }

  const stateCode = clean.slice(0, 2);
  const pan = clean.slice(2, 12);
  const stateName = GST_STATE_MAP[stateCode] || 'Unknown State';

  // Standard GSTIN regex
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const isValid = gstinRegex.test(clean);
  const entityType = getPanEntityType(pan);

  return {
    isValid,
    stateCode,
    stateName,
    pan,
    entityType,
    message: isValid
      ? `Valid 15-Digit GSTIN • ${stateName} (${stateCode})`
      : 'Invalid GSTIN format. Expected: 2-digit state + 10-char PAN + 1 entity + Z + 1 check digit',
  };
}

const PAN_ENTITIES_KEY = 'clear_gst_pan_entities';
const RECENT_CLIENTS_KEY = 'clear_gst_recent_clients';

export function getStoredPanEntities(): PanEntity[] {
  try {
    const stored = localStorage.getItem(PAN_ENTITIES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with popular entities
        const existingPans = new Set(parsed.map((p: PanEntity) => p.pan.toUpperCase()));
        const unaddedPopular = POPULAR_PAN_ENTITIES.filter((p) => !existingPans.has(p.pan.toUpperCase()));
        return [...parsed, ...unaddedPopular];
      }
    }
  } catch (e) {
    // ignore
  }
  return POPULAR_PAN_ENTITIES;
}

export function savePanEntity(entity: PanEntity) {
  try {
    const current = getStoredPanEntities();
    const cleanPan = entity.pan.trim().toUpperCase();
    const filtered = current.filter((p) => p.pan.toUpperCase() !== cleanPan);
    const updated = [
      {
        ...entity,
        pan: cleanPan,
        lastUsedAt: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 20); // Keep top 20

    localStorage.setItem(PAN_ENTITIES_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }
}

export function bulkSavePanEntities(newEntities: PanEntity[]): PanEntity[] {
  try {
    const current = getStoredPanEntities();
    const panMap = new Map<string, PanEntity>();

    // Put existing
    current.forEach((e) => panMap.set(e.pan.toUpperCase(), e));

    // Upsert new
    newEntities.forEach((newEnt) => {
      const cleanPan = newEnt.pan.toUpperCase();
      const existing = panMap.get(cleanPan);
      if (existing) {
        // Merge branches
        const branchMap = new Map<string, PanGstinBranch>();
        existing.branches.forEach((b) => branchMap.set(b.gstin.toUpperCase(), b));
        newEnt.branches.forEach((b) => branchMap.set(b.gstin.toUpperCase(), { ...branchMap.get(b.gstin.toUpperCase()), ...b }));

        const mergedBranches = Array.from(branchMap.values());
        panMap.set(cleanPan, {
          ...existing,
          ...newEnt,
          branches: mergedBranches,
          primaryGstin: mergedBranches[0]?.gstin || existing.primaryGstin || '',
          lastUsedAt: new Date().toISOString(),
        });
      } else {
        panMap.set(cleanPan, {
          ...newEnt,
          lastUsedAt: new Date().toISOString(),
        });
      }
    });

    const updatedList = Array.from(panMap.values()).slice(0, 100);
    localStorage.setItem(PAN_ENTITIES_KEY, JSON.stringify(updatedList));
    return updatedList;
  } catch (e) {
    return getStoredPanEntities();
  }
}

export function updateBranchCredentials(
  pan: string,
  gstin: string,
  username?: string,
  password?: string
): PanEntity | null {
  try {
    const current = getStoredPanEntities();
    const cleanPan = pan.trim().toUpperCase();
    const cleanGstin = gstin.trim().toUpperCase();
    const entity = current.find((p) => p.pan.toUpperCase() === cleanPan);
    if (!entity) return null;

    const updatedBranches = entity.branches.map((b) => {
      if (b.gstin.toUpperCase() === cleanGstin) {
        return {
          ...b,
          portalUsername: username !== undefined ? username : b.portalUsername,
          portalPassword: password !== undefined ? password : b.portalPassword,
        };
      }
      return b;
    });

    const updatedEntity: PanEntity = {
      ...entity,
      defaultPortalUsername: username || entity.defaultPortalUsername,
      branches: updatedBranches,
    };

    savePanEntity(updatedEntity);
    return updatedEntity;
  } catch (e) {
    return null;
  }
}

export function deletePanEntity(pan: string) {
  try {
    const current = getStoredPanEntities();
    const cleanPan = pan.trim().toUpperCase();
    const filtered = current.filter((p) => p.pan.toUpperCase() !== cleanPan);
    localStorage.setItem(PAN_ENTITIES_KEY, JSON.stringify(filtered));
  } catch (e) {
    // ignore
  }
}

export function removeBranchFromEntity(pan: string, gstinToRemove: string): PanEntity | null {
  try {
    const current = getStoredPanEntities();
    const cleanPan = pan.trim().toUpperCase();
    const cleanGstin = gstinToRemove.trim().toUpperCase();
    const entity = current.find((p) => p.pan.toUpperCase() === cleanPan);
    if (!entity) return null;

    const updatedBranches = entity.branches.filter((b) => b.gstin.toUpperCase() !== cleanGstin);
    const updatedEntity: PanEntity = {
      ...entity,
      branches: updatedBranches,
      primaryGstin: updatedBranches.length > 0 ? (updatedBranches[0]?.gstin || '') : '',
    };
    savePanEntity(updatedEntity);
    return updatedEntity;
  } catch (e) {
    return null;
  }
}

/**
 * Dynamically fetches all GSTIN registrations linked to a PAN.
 * If PAN exists in user's saved entity directory or sample masters, returns those branches.
 * If user enters a new or unregistered PAN (e.g. personal PAN with no GST), returns 0 branches (branches: [])
 * rather than fabricating artificial mock GSTIN numbers.
 */
export function fetchGstinsForPan(panInput: string): PanEntity {
  const cleanPan = (panInput || '').trim().toUpperCase();
  const allEntities = getStoredPanEntities();
  
  const found = allEntities.find((e) => e.pan.toUpperCase() === cleanPan);
  if (found) {
    return found;
  }

  // Construct entity based on PAN structure with 0 branches
  const constitution = getPanEntityType(cleanPan);
  const defaultLegalName = constitution.includes('Individual')
    ? `Taxpayer (${cleanPan})`
    : `Enterprise (${cleanPan})`;

  const newEntity: PanEntity = {
    pan: cleanPan,
    legalName: defaultLegalName,
    tradeName: defaultLegalName,
    constitution,
    primaryGstin: '',
    branches: [],
    lastUsedAt: new Date().toISOString(),
  };

  return newEntity;
}

export function getRecentClients(): ClientGstinProfile[] {
  try {
    const stored = localStorage.getItem(RECENT_CLIENTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  return POPULAR_CLIENT_PROFILES;
}

export function saveRecentClient(client: ClientGstinProfile) {
  try {
    const current = getRecentClients();
    const filtered = current.filter((c) => c.gstin.toUpperCase() !== client.gstin.toUpperCase());
    const updated = [
      {
        ...client,
        gstin: client.gstin.toUpperCase(),
        lastUsedAt: new Date().toISOString(),
      },
      ...filtered,
    ].slice(0, 15); // Keep top 15

    localStorage.setItem(RECENT_CLIENTS_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }
}

