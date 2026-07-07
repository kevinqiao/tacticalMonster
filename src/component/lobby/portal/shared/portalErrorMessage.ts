import i18n from "@/i18n";

const PORTAL_ERROR_NS = "portal.errors";
const CAMPAIGN_ERROR_NS = "campaign.errors";

export function portalErrorMessage(
  code: string | undefined,
  params?: Record<string, string | number>
): string {
  if (!code) {
    return i18n.t("unknown_no_code", { ns: PORTAL_ERROR_NS });
  }
  const key = `codes.${code}`;
  if (i18n.exists(key, { ns: PORTAL_ERROR_NS })) {
    return i18n.t(key, { ns: PORTAL_ERROR_NS, ...params });
  }
  return i18n.t("unknown", { ns: PORTAL_ERROR_NS, code, ...params });
}

export function portalFlowMessage(
  key: string,
  params?: Record<string, string | number>
): string {
  return i18n.t(`flow.${key}`, { ns: PORTAL_ERROR_NS, ...params });
}

export function portalPurchaseErrorMessage(error?: string): string {
  if (!error) {
    return i18n.t("purchase_default", { ns: PORTAL_ERROR_NS });
  }
  return portalErrorMessage(error);
}

export function portalGiftCardFeedbackMessage(
  key: string,
  params?: Record<string, string | number>
): string {
  return i18n.t(`giftcard.${key}`, { ns: PORTAL_ERROR_NS, ...params });
}

export function campaignFlowErrorMessage(
  key: string,
  params?: Record<string, string | number>
): string {
  return i18n.t(key, { ns: CAMPAIGN_ERROR_NS, ...params });
}

export function leaveMatchQueueErrorText(error: string): string {
  if (error === "cannot_leave_claiming") {
    return campaignFlowErrorMessage("creatingMatch");
  }
  if (error === "not_in_queue") {
    return campaignFlowErrorMessage("notInQueue");
  }
  return campaignFlowErrorMessage("leaveFailed", { code: error });
}
