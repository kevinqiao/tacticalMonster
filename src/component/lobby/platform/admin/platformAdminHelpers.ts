import { webSignInErrorMessage } from "../../shared/webSignInHelpers";

export function platformAdminErrorMessage(error: unknown): string {
  return webSignInErrorMessage(error);
}

export function platformAdminSuccessMessage(key: string): string {
  const map: Record<string, string> = {
    partnerCreated: "Partner 已创建。",
    partnerDeleted: "Partner 已删除。",
    staffUpdated: "成员资料已更新。",
    portalSaved: "Partner 基础设置已保存。",
    capabilitiesSaved: "能力配置已保存。",
  };
  return map[key] ?? key;
}

export function capabilityBadges(caps?: {
  portalGames?: boolean;
  campaignOps?: boolean;
} | null): string {
  if (!caps) return "无能力";
  const parts: string[] = [];
  if (caps.portalGames) parts.push("Portal");
  if (caps.campaignOps) parts.push("CampaignOps");
  return parts.length ? parts.join(" · ") : "无能力";
}

