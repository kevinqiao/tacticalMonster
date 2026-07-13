/** 与 Portal `portalBotPersonaDefaults` 同源 persona id；displayName 由统一生成器派生。 */

import { generateDisplayName } from "../../../../shared/displayName";

export type CampaignBotPersonaSeed = {
  botPersonaId: string;
  poolIndex: number;
  displayName: string;
};

function personaSeed(botPersonaId: string, poolIndex: number): CampaignBotPersonaSeed {
  return {
    botPersonaId,
    poolIndex,
    displayName: generateDisplayName(botPersonaId),
  };
}

export const CAMPAIGN_BOT_PERSONA_DEFAULTS: CampaignBotPersonaSeed[] = Array.from(
  { length: 24 },
  (_, i) => personaSeed(`pp_${String(i).padStart(2, "0")}`, i)
);

export const CAMPAIGN_BOT_PERSONA_POOL_SIZE = CAMPAIGN_BOT_PERSONA_DEFAULTS.length;

export function pickCampaignBotPersonaId(campaignId: string, slot: number): string {
  let h = 2166136261;
  const s = `${campaignId}:${slot}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = (h >>> 0) % CAMPAIGN_BOT_PERSONA_POOL_SIZE;
  return CAMPAIGN_BOT_PERSONA_DEFAULTS[idx]?.botPersonaId ?? `pp_${String(idx).padStart(2, "0")}`;
}

export function getCampaignBotPersonaDisplay(botPersonaId: string): string {
  return generateDisplayName(botPersonaId);
}
