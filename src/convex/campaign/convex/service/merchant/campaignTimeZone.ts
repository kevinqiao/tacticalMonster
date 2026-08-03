export const DEFAULT_CAMPAIGN_DAY_TIMEZONE = "Asia/Shanghai";

/** 校验 IANA 时区；无效则回退默认。 */
export function normalizeCampaignDayTimezone(timeZone?: string | null): string {
  const raw = (timeZone ?? DEFAULT_CAMPAIGN_DAY_TIMEZONE).trim();
  if (!raw) return DEFAULT_CAMPAIGN_DAY_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: raw });
    return raw;
  } catch {
    return DEFAULT_CAMPAIGN_DAY_TIMEZONE;
  }
}

export function playLimitsDayTimezone(playLimits: {
  dayTimezone?: string;
}): string {
  return normalizeCampaignDayTimezone(playLimits.dayTimezone);
}
