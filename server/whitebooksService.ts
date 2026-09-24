/**
 * Whitebooks GSP API Gateway Service
 * Integrates with Whitebooks Sandbox / Production APIs (https://apisandbox.whitebooks.in)
 * for real-time live GSTIN verification and PAN-to-GSTIN mapping.
 */

interface WhitebooksConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
}

export function getWhitebooksConfig(override?: Partial<WhitebooksConfig>): WhitebooksConfig {
  return {
    baseUrl:
      override?.baseUrl ||
      process.env.WHITEBOOKS_BASE_URL ||
      "https://apisandbox.whitebooks.in",
    clientId:
      override?.clientId ||
      process.env.WHITEBOOKS_CLIENT_ID ||
      "GSTS6718991e-7325-4143-a831-946f27f8ca8f",
    clientSecret:
      override?.clientSecret ||
      process.env.WHITEBOOKS_CLIENT_SECRET ||
      "GSTSb5ed0a26-760a-4044-98df-f05df9c917e7",
  };
}

export interface LiveVerificationResult {
  gstin: string;
  validGstin: boolean;
  status: "Active" | "Cancelled" | "Suspended" | "Inactive" | "Unknown";
  stateCode: string;
  stateName: string;
  legalName?: string;
  tradeName?: string;
  taxpayerType?: string;
  registrationDate?: string;
  cancellationDate?: string;
  constitution?: string;
  address?: string;
  pinCode?: string;
  rawGatewayResponse?: any;
  isLive: boolean;
  gateway: string;
  responseTimeMs: number;
  gatewayError?: string;
  diagnosticNote?: string;
}

// Indian State Codes dictionary
const STATE_NAMES: Record<string, string> = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "25": "Daman & Diu",
  "26": "Dadra & Nagar Haveli",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
  "99": "Centre Jurisdiction",
};

/**
 * Test connectivity and credentials against Whitebooks API gateway
 */
export async function testWhitebooksGateway(overrideConfig?: Partial<WhitebooksConfig>) {
  const config = getWhitebooksConfig(overrideConfig);
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const testUrl = `${config.baseUrl.replace(/\/+$/, "")}/public/search?gstin=27AABCA1234F1Z8`;
    const response = await fetch(testUrl, {
      method: "GET",
      headers: {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        secret: config.clientSecret,
        "User-Agent": "Whitebooks-GST-Reconciler/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    const latency = Date.now() - startTime;

    const isConnected = response.ok;
    const isCredentialsActive = data?.status_cd !== "0";

    return {
      connected: isConnected,
      status_cd: data?.status_cd,
      status_desc: data?.status_desc || "Success",
      latencyMs: latency,
      baseUrl: config.baseUrl,
      clientIdMasked: config.clientId ? `${config.clientId.slice(0, 8)}...` : "None",
      isCredentialsActive,
      data,
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message || "Connection failed or timed out",
      latencyMs: Date.now() - startTime,
      baseUrl: config.baseUrl,
    };
  }
}

/**
 * Fetch live GSTIN status from Whitebooks API
 */
export async function verifyGstinLive(
  gstinRaw: string,
  overrideConfig?: Partial<WhitebooksConfig>
): Promise<LiveVerificationResult> {
  const config = getWhitebooksConfig(overrideConfig);
  const gstin = (gstinRaw || "").trim().toUpperCase();
  const startTime = Date.now();

  // Basic structural extraction
  const stateCode = gstin.length >= 2 ? gstin.slice(0, 2) : "00";
  const stateName = STATE_NAMES[stateCode] || "Unknown State";

  if (!gstin || gstin.length < 15) {
    return {
      gstin,
      validGstin: false,
      status: "Inactive",
      stateCode,
      stateName,
      isLive: false,
      gateway: config.baseUrl,
      responseTimeMs: 0,
      gatewayError: "Invalid GSTIN length (expected 15 characters)",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14000);

    const targetUrl = `${config.baseUrl.replace(/\/+$/, "")}/public/search?gstin=${encodeURIComponent(gstin)}`;

    const response = await fetch(targetUrl, {
      method: "GET",
      headers: {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        secret: config.clientSecret,
        "User-Agent": "Whitebooks-GST-Reconciler/1.0",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const responseTimeMs = Date.now() - startTime;
    const rawData = await response.json();

    // Check if live taxpayer payload received
    if (rawData && rawData.status_cd === "1" && rawData.data) {
      const tp = rawData.data;
      const rawStatus = (tp.sts || tp.status || "Active").toLowerCase();
      let normStatus: "Active" | "Cancelled" | "Suspended" | "Inactive" = "Active";
      if (rawStatus.includes("canc")) normStatus = "Cancelled";
      else if (rawStatus.includes("susp")) normStatus = "Suspended";
      else if (rawStatus.includes("inact")) normStatus = "Inactive";

      return {
        gstin,
        validGstin: true,
        status: normStatus,
        stateCode: tp.stcd || stateCode,
        stateName: STATE_NAMES[tp.stcd || stateCode] || stateName,
        legalName: tp.lgnm || tp.legalName || "Registered Taxpayer",
        tradeName: tp.tradeNam || tp.tradeName || tp.lgnm,
        taxpayerType: tp.dty || tp.taxpayerType || "Regular",
        registrationDate: tp.rgdt || tp.registrationDate,
        cancellationDate: tp.cxdt || tp.cancellationDate,
        constitution: tp.ctb || tp.constitution,
        address: tp.pradr?.addr ? formatAddr(tp.pradr.addr) : undefined,
        pinCode: tp.pradr?.addr?.pncd,
        rawGatewayResponse: rawData,
        isLive: true,
        gateway: "Whitebooks GSP Gateway (Live)",
        responseTimeMs,
      };
    }

    // If Whitebooks returns status_cd 0 (e.g. invalid credentials or sandbox pending activation)
    const errDesc = rawData?.status_desc || "Taxpayer search error";
    const isCredentialsIssue = errDesc.toLowerCase().includes("credentials") || errDesc.toLowerCase().includes("account is not active");

    return {
      gstin,
      validGstin: true,
      status: "Active", // Default statutory assumption for valid 15-char GSTIN
      stateCode,
      stateName,
      rawGatewayResponse: rawData,
      isLive: false,
      gateway: config.baseUrl,
      responseTimeMs,
      gatewayError: errDesc,
      diagnosticNote: isCredentialsIssue
        ? `Whitebooks GSP responded with code 0: "${errDesc}". Account credentials configured (${config.clientId.slice(0, 8)}...), but sandbox access may require activation on accounts.whitebooks.in.`
        : `Whitebooks GSP notice: ${errDesc}`,
    };
  } catch (err: any) {
    const responseTimeMs = Date.now() - startTime;
    return {
      gstin,
      validGstin: true,
      status: "Active",
      stateCode,
      stateName,
      isLive: false,
      gateway: config.baseUrl,
      responseTimeMs,
      gatewayError: err.message || "Network request failed or timed out",
      diagnosticNote: `Could not reach Whitebooks sandbox gateway at ${config.baseUrl} within 14s.`,
    };
  }
}

function formatAddr(addr: any): string {
  if (!addr || typeof addr !== "object") return "";
  const parts = [
    addr.bno,
    addr.bnm,
    addr.st,
    addr.loc,
    addr.dst,
    addr.stcd,
    addr.pncd,
  ].filter(Boolean);
  return parts.join(", ");
}
