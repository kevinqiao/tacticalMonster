/** Normalize phone CTA input to a tel: href (accepts plain numbers or tel: URLs). */
export function normalizeTelCtaUrl(raw: string): string {
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

export function isValidTelCtaUrl(raw: string): boolean {
  const normalized = normalizeTelCtaUrl(raw);
  const match = normalized.match(/^tel:(\+?\d+)$/i);
  if (!match) return false;
  const digitCount = match[1].replace(/\D/g, "").length;
  return digitCount >= 3 && digitCount <= 15;
}
