/** Portal 共享 Bot persona 默认池（对局虚拟席 + 周榜竞争者同源）。displayName 由统一生成器派生。 */

import { generateDisplayName } from "../../../../shared/displayName";

export type PortalBotPersonaSeed = {
  botPersonaId: string;
  poolIndex: number;
  displayName: string;
  avatarUrl?: string;
};

function personaSeed(botPersonaId: string, poolIndex: number): PortalBotPersonaSeed {
  return {
    botPersonaId,
    poolIndex,
    displayName: generateDisplayName(botPersonaId),
  };
}

export const PORTAL_BOT_PERSONA_DEFAULTS: PortalBotPersonaSeed[] = Array.from(
  { length: 24 },
  (_, i) => personaSeed(`pp_${String(i).padStart(2, "0")}`, i)
);

export const PORTAL_BOT_PERSONA_POOL_SIZE = PORTAL_BOT_PERSONA_DEFAULTS.length;
