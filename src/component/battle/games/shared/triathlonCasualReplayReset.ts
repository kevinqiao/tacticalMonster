import { ConvexHttpClient } from 'convex/browser';

import { api as blockBlastApi } from '@/convex/blockBlast/convex/_generated/api';
import { api as match3Api } from '@/convex/match3Arena/convex/_generated/api';
import { api as solitaireApi } from '@/convex/solitaireArena/convex/_generated/api';
import {
  effectiveGameSequence,
  getTournamentDefinition,
} from '@/convex/casualPlatform/convex/data/casualTournamentConfigs';

import { triathlonLegGameIds } from './casualTriathlonSubmitFlow';

const BLOCKBLAST_URL =
  import.meta.env.VITE_CONVEX_URL_BLOCKBLAST ?? 'https://spotted-marten-367.convex.cloud';
const MATCH3_URL =
  import.meta.env.VITE_CONVEX_URL_MATCH3 ?? 'https://strong-condor-681.convex.cloud';
const SOLITAIRE_URL =
  import.meta.env.VITE_CONVEX_URL_SOLITAIRE ?? 'https://artful-chipmunk-59.convex.cloud';

/** 合战整场再战：清三局游戏服档并按原 seed 重建（避免重打时读到旧局状态） */
export async function resetTriathlonCasualGameServers(
  templateId: string,
  anyLegGameId: string
): Promise<void> {
  const def = getTournamentDefinition(templateId);
  if (!def || def.gameType !== 'triathlon') return;

  const sequence = effectiveGameSequence(def);
  const legIds = triathlonLegGameIds(templateId, anyLegGameId);
  if (legIds.length === 0) return;

  const blockBlastClient = new ConvexHttpClient(BLOCKBLAST_URL);
  const match3Client = new ConvexHttpClient(MATCH3_URL);
  const solitaireClient = new ConvexHttpClient(SOLITAIRE_URL);

  await Promise.all(
    legIds.map(async (gameId, index) => {
      const gameType = sequence[index];
      if (!gameType) return;
      const client =
        gameType === 'block_blast'
          ? blockBlastClient
          : gameType === 'match_3'
            ? match3Client
            : gameType === 'solitaire'
              ? solitaireClient
              : null;
      const apiRef =
        gameType === 'block_blast'
          ? blockBlastApi.proxy.controller.loadGame
          : gameType === 'match_3'
            ? match3Api.proxy.controller.loadGame
            : gameType === 'solitaire'
              ? solitaireApi.proxy.controller.loadGame
              : null;
      if (!client || !apiRef) return;
      try {
        await client.action(apiRef, { gameId, resetCasualRun: true });
      } catch (e) {
        console.warn('[triathlon] resetCasualRun loadGame failed', gameId, e);
      }
    })
  );
}
