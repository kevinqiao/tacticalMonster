"use node";

import type {
  TangoCreateOrderArgs,
  TangoCreateOrderResult,
  TangoGetOrderResult,
} from "./tangoTypes";

const SANDBOX_BASE = "https://integration-api.tangocard.com/raas/v2";
const PRODUCTION_BASE = "https://api.tangocard.com/raas/v2";

function tangoBaseUrl(): string {
  const env = process.env.TANGO_ENV?.trim().toLowerCase();
  return env === "production" ? PRODUCTION_BASE : SANDBOX_BASE;
}

function tangoAuthHeader(): string | null {
  const platform = process.env.TANGO_PLATFORM_NAME?.trim();
  const apiKey = process.env.TANGO_API_KEY?.trim();
  if (!platform || !apiKey) return null;
  const token = Buffer.from(`${platform}:${apiKey}`).toString("base64");
  return `Basic ${token}`;
}

function extractRewardLink(payload: Record<string, unknown>): string | undefined {
  const reward = payload.reward;
  if (!reward || typeof reward !== "object") return undefined;
  const r = reward as Record<string, unknown>;
  const credentials = r.credentialList ?? r.credentials;
  if (!Array.isArray(credentials)) {
    const link = r.redemptionUrl ?? r.rewardLink;
    return typeof link === "string" ? link : undefined;
  }
  for (const cred of credentials) {
    if (!cred || typeof cred !== "object") continue;
    const c = cred as Record<string, unknown>;
    const type = String(c.credentialType ?? c.type ?? "").toLowerCase();
    const value = c.value ?? c.credential;
    if (
      (type === "link" || type === "url" || type === "rewardlink") &&
      typeof value === "string" &&
      value.length > 0
    ) {
      return value;
    }
  }
  return undefined;
}

function mockEnabled(): boolean {
  return process.env.TANGO_MOCK_FULFILL === "1" || process.env.TANGO_MOCK_FULFILL === "true";
}

export function isTangoConfigured(): boolean {
  return (
    Boolean(tangoAuthHeader() && process.env.TANGO_ACCOUNT_IDENTIFIER?.trim()) || mockEnabled()
  );
}

export async function tangoCreateOrder(
  args: TangoCreateOrderArgs
): Promise<TangoCreateOrderResult> {
  if (mockEnabled()) {
    return {
      referenceOrderID: args.externalRefID,
      orderId: `mock_${args.externalRefID}`,
      rewardLink: `https://reward.tangocard.com/mock/${encodeURIComponent(args.externalRefID)}`,
    };
  }

  const auth = tangoAuthHeader();
  if (!auth) {
    throw new Error("tango_not_configured");
  }

  const body: Record<string, unknown> = {
    accountIdentifier: args.accountIdentifier,
    amount: args.amount,
    utid: args.utid,
    sendEmail: args.sendEmail ?? false,
    externalRefID: args.externalRefID,
  };
  if (args.recipientEmail) {
    body.recipient = {
      email: args.recipientEmail,
      firstName: "Player",
    };
  }

  const response = await fetch(`${tangoBaseUrl()}/orders`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(`tango_bad_response_${response.status}`);
  }

  if (!response.ok) {
    const msg =
      typeof payload.message === "string"
        ? payload.message
        : typeof payload.error === "string"
          ? payload.error
          : `tango_http_${response.status}`;
    throw new Error(msg);
  }

  const referenceOrderID =
    typeof payload.referenceOrderID === "string"
      ? payload.referenceOrderID
      : args.externalRefID;
  const orderId = typeof payload.orderId === "string" ? payload.orderId : undefined;
  const rewardLink = extractRewardLink(payload);

  return { referenceOrderID, orderId, rewardLink };
}

export async function tangoGetOrder(referenceOrderID: string): Promise<TangoGetOrderResult> {
  if (mockEnabled()) {
    return {
      referenceOrderID,
      orderId: `mock_${referenceOrderID}`,
      status: "COMPLETE",
      rewardLink: `https://reward.tangocard.com/mock/${encodeURIComponent(referenceOrderID)}`,
    };
  }

  const auth = tangoAuthHeader();
  if (!auth) {
    throw new Error("tango_not_configured");
  }

  const response = await fetch(
    `${tangoBaseUrl()}/orders/${encodeURIComponent(referenceOrderID)}`,
    {
      method: "GET",
      headers: { Authorization: auth },
    }
  );

  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    throw new Error(`tango_bad_response_${response.status}`);
  }

  if (!response.ok) {
    throw new Error(`tango_http_${response.status}`);
  }

  return {
    referenceOrderID:
      typeof payload.referenceOrderID === "string" ? payload.referenceOrderID : referenceOrderID,
    orderId: typeof payload.orderId === "string" ? payload.orderId : undefined,
    status: typeof payload.status === "string" ? payload.status : undefined,
    rewardLink: extractRewardLink(payload),
  };
}

export async function tangoResendOrderEmail(referenceOrderID: string): Promise<void> {
  if (mockEnabled()) return;

  const auth = tangoAuthHeader();
  if (!auth) throw new Error("tango_not_configured");

  const response = await fetch(
    `${tangoBaseUrl()}/orders/${encodeURIComponent(referenceOrderID)}/resends`,
    {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    throw new Error(`tango_resend_${response.status}`);
  }
}
