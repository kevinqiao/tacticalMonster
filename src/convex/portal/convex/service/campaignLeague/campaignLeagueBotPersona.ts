import { generateDisplayName } from "../../../../shared/displayName";
import {
  PORTAL_BOT_PERSONA_DEFAULTS,
  PORTAL_BOT_PERSONA_POOL_SIZE,
} from "../botPersona/portalBotPersonaDefaults";

export function pickCampaignLeagueBotPersonaId(campaignId: string, slot: number): string {
  let h = 2166136261;
  const s = `${campaignId}:${slot}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = (h >>> 0) % PORTAL_BOT_PERSONA_POOL_SIZE;
  return (
    PORTAL_BOT_PERSONA_DEFAULTS[idx]?.botPersonaId ?? `pp_${String(idx).padStart(2, "0")}`
  );
}

export function campaignLeagueBotDisplayName(botPersonaId: string): string {
  return generateDisplayName(botPersonaId);
}

export function campaignLeagueBotUid(campaignId: string, slot: number): string {
  return `__campaign_league_bot:${campaignId}:${slot}`;
}
