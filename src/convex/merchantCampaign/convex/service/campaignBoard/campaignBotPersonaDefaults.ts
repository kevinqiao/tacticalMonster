/** 与 Portal `portalBotPersonaDefaults` 同源命名，活动榜/对局可共用 persona id。 */

export type CampaignBotPersonaSeed = {
  botPersonaId: string;
  poolIndex: number;
  displayName: string;
};

export const CAMPAIGN_BOT_PERSONA_DEFAULTS: CampaignBotPersonaSeed[] = [
  { botPersonaId: "pp_00", poolIndex: 0, displayName: "Nova" },
  { botPersonaId: "pp_01", poolIndex: 1, displayName: "Kai" },
  { botPersonaId: "pp_02", poolIndex: 2, displayName: "Mira" },
  { botPersonaId: "pp_03", poolIndex: 3, displayName: "Juno" },
  { botPersonaId: "pp_04", poolIndex: 4, displayName: "Rex" },
  { botPersonaId: "pp_05", poolIndex: 5, displayName: "Luna" },
  { botPersonaId: "pp_06", poolIndex: 6, displayName: "Ash" },
  { botPersonaId: "pp_07", poolIndex: 7, displayName: "Vale" },
  { botPersonaId: "pp_08", poolIndex: 8, displayName: "Zephyr" },
  { botPersonaId: "pp_09", poolIndex: 9, displayName: "Iris" },
  { botPersonaId: "pp_10", poolIndex: 10, displayName: "Orion" },
  { botPersonaId: "pp_11", poolIndex: 11, displayName: "Sage" },
  { botPersonaId: "pp_12", poolIndex: 12, displayName: "Pax" },
  { botPersonaId: "pp_13", poolIndex: 13, displayName: "Nix" },
  { botPersonaId: "pp_14", poolIndex: 14, displayName: "Quinn" },
  { botPersonaId: "pp_15", poolIndex: 15, displayName: "Ember" },
  { botPersonaId: "pp_16", poolIndex: 16, displayName: "River" },
  { botPersonaId: "pp_17", poolIndex: 17, displayName: "Skye" },
  { botPersonaId: "pp_18", poolIndex: 18, displayName: "Blaze" },
  { botPersonaId: "pp_19", poolIndex: 19, displayName: "Echo" },
  { botPersonaId: "pp_20", poolIndex: 20, displayName: "Frost" },
  { botPersonaId: "pp_21", poolIndex: 21, displayName: "Haze" },
  { botPersonaId: "pp_22", poolIndex: 22, displayName: "Pixel" },
  { botPersonaId: "pp_23", poolIndex: 23, displayName: "Rune" },
];

export const CAMPAIGN_BOT_PERSONA_POOL_SIZE = CAMPAIGN_BOT_PERSONA_DEFAULTS.length;

const PERSONA_BY_ID = new Map(
  CAMPAIGN_BOT_PERSONA_DEFAULTS.map((p) => [p.botPersonaId, p] as const)
);

export function pickCampaignBotPersonaId(campaignId: string, slot: number): string {
  let h = 2166136261;
  const s = `${campaignId}:${slot}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const idx = (h >>> 0) % CAMPAIGN_BOT_PERSONA_POOL_SIZE;
  return CAMPAIGN_BOT_PERSONA_DEFAULTS[idx]?.botPersonaId ?? `pp_${idx}`;
}

export function getCampaignBotPersonaDisplay(botPersonaId: string): string {
  return PERSONA_BY_ID.get(botPersonaId)?.displayName ?? botPersonaId;
}
