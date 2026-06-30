import type { Doc } from "../../_generated/dataModel";

export type CampaignExperienceType = "game" | "display";

export const DISPLAY_CAMPAIGN_GAME_TYPE = "_display";

export function resolveExperienceType(campaign: {
  experienceType?: CampaignExperienceType | string;
}): CampaignExperienceType {
  return campaign.experienceType === "display" ? "display" : "game";
}

export function displayCampaignDefaults(): Pick<
  Doc<"merchant_campaigns">,
  "gameType" | "mode" | "playLimits" | "rewardRules"
> {
  return {
    gameType: DISPLAY_CAMPAIGN_GAME_TYPE,
    mode: "solo",
    playLimits: { maxCouponsPerPlayer: 0 },
    rewardRules: [],
  };
}
