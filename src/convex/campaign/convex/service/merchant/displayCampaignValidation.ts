import type { Id } from "../../_generated/dataModel";
import type { Doc } from "../../_generated/dataModel";

function isHttpsUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Accept plain numbers or tel: URLs; normalize to tel:+digits or tel:digits. */
function normalizeTelUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  let body = trimmed;
  if (/^tel:/i.test(body)) {
    body = body.slice(4).trim();
  }

  const hasPlus = body.includes("+");
  const digits = body.replace(/\D/g, "");
  if (!digits) return trimmed;

  if (hasPlus || body.trimStart().startsWith("+")) {
    return `tel:+${digits}`;
  }
  return `tel:${digits}`;
}

function isTelUrl(value: string): boolean {
  const normalized = normalizeTelUrl(value);
  const match = normalized.match(/^tel:(\+?\d+)$/i);
  if (!match) return false;
  const digitCount = match[1].replace(/\D/g, "").length;
  return digitCount >= 3 && digitCount <= 15;
}

function isMapsUrl(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.startsWith("https://maps.") ||
    trimmed.startsWith("https://www.google.com/maps") ||
    trimmed.startsWith("http://maps.") ||
    trimmed.startsWith("geo:")
  );
}

export function assertDisplayConfig(
  displayConfig: Doc<"campaigns">["displayConfig"] | undefined
): void {
  const cta = displayConfig?.cta;
  if (!cta || cta.kind === "none") return;

  const label = cta.label?.trim();
  const url = cta.url?.trim();
  if (!label) {
    throw new Error("display_cta_label_required");
  }
  if (!url) {
    throw new Error("display_cta_url_required");
  }

  if (cta.kind === "external_url" && !isHttpsUrl(url)) {
    throw new Error("https_required");
  }
  if (cta.kind === "tel" && !isTelUrl(url)) {
    throw new Error("display_cta_invalid_tel");
  }
  if (cta.kind === "maps" && !isMapsUrl(url)) {
    throw new Error("display_cta_invalid_maps");
  }
}

export function assertCampaignPosterRequired(args: {
  posterStorageId?: Id<"_storage"> | null;
  posterPortraitStorageId?: Id<"_storage"> | null;
  posterLandscapeStorageId?: Id<"_storage"> | null;
  requirePoster?: boolean;
}): void {
  if (args.requirePoster === false) return;
  const hasPoster =
    Boolean(args.posterPortraitStorageId) ||
    Boolean(args.posterLandscapeStorageId) ||
    Boolean(args.posterStorageId);
  if (!hasPoster) {
    throw new Error("display_poster_required");
  }
  if (!args.posterPortraitStorageId && !args.posterStorageId) {
    throw new Error("display_poster_portrait_required");
  }
}

export function assertDisplayCampaignConfig(args: {
  startsAt: number;
  endsAt: number;
  posterStorageId?: Id<"_storage"> | null;
  posterPortraitStorageId?: Id<"_storage"> | null;
  posterLandscapeStorageId?: Id<"_storage"> | null;
  displayConfig?: Doc<"campaigns">["displayConfig"];
  requirePoster?: boolean;
}): void {
  if (args.startsAt >= args.endsAt) {
    throw new Error("invalid_period");
  }
  assertCampaignPosterRequired(args);
  assertDisplayConfig(args.displayConfig);
}
