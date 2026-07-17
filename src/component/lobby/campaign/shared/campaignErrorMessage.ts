import i18n from "@/i18n";

const ERROR_NS = "campaign.errors";

export function parseErrorCode(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.replace(/^Error:\s*/i, "").trim();
    const uncaught = msg.match(/Uncaught Error:\s*([^\s\n]+)/i);
    if (uncaught?.[1]) return uncaught[1];
    const lines = msg
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const last = lines[lines.length - 1];
    if (last && /^[a-z0-9_]+$/i.test(last)) return last;
    return msg;
  }
  const text = String(error).replace(/^Error:\s*/i, "").trim();
  const uncaught = text.match(/Uncaught Error:\s*([^\s\n]+)/i);
  if (uncaught?.[1]) return uncaught[1];
  return text;
}

export function campaignErrorMessage(
  code: string | undefined,
  params?: Record<string, string | number>
): string {
  if (!code) {
    return i18n.t("unknown_no_code", { ns: ERROR_NS });
  }
  const key = `codes.${code}`;
  if (i18n.exists(key, { ns: ERROR_NS })) {
    return i18n.t(key, { ns: ERROR_NS, ...params });
  }
  return i18n.t("unknown", { ns: ERROR_NS, code, ...params });
}

export function campaignAdminErrorMessage(error: unknown): string {
  const code = parseErrorCode(error);
  return campaignErrorMessage(code);
}

export function campaignSuccessMessage(
  key: keyof typeof successKeys,
  params?: Record<string, string | number>
): string {
  return i18n.t(`success.${key}`, { ns: ERROR_NS, ...params });
}

const successKeys = {
  merchantCreated: true,
  campaignCreated: true,
  saved: true,
  drafted: true,
  hiddenFromLanding: true,
  couponDefCreated: true,
  archived: true,
  voided: true,
  redeemSuccess: true,
  themeDraftFetched: true,
  themePublished: true,
  live: true,
  memberAdded: true,
  memberRemoved: true,
} as const;
