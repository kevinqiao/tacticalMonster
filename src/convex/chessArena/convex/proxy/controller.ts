import { v } from "convex/values";
import { internal } from "../_generated/api";
import { action } from "../_generated/server";
import { defaultRankRoadLoadout } from "../service/createGame";

const tournament_url = "https://beloved-mouse-699.convex.site";
const portal_url = "https://portal-rpg-placeholder.convex.site";

async function fetchMatch(gameId: string): Promise<any | null> {
  for (const base of [portal_url, tournament_url]) {
    try {
      const response = await fetch(`${base}/findMatchGame`, {
        method: "POST",
        body: JSON.stringify({ gameId }),
      });
      if (!response.ok) continue;
      const matchGameResult = await response.json();
      if (matchGameResult?.ok && matchGameResult.match) {
        return matchGameResult.match;
      }
    } catch {
      // 占位部署未上线时走 join 写入的 seed/loadout。
    }
  }
  return null;
}

export const loadGame = action({
  args: { gameId: v.string() },
  handler: async (ctx, { gameId }): Promise<any> => {
    const res: { ok: boolean; game?: any } = { ok: false };
    let game = await ctx.runQuery(internal.service.gameManager.findGame, { gameId });
    if (!game) {
      const match = await fetchMatch(gameId);
      const rawSeed = match?.seed ?? match?.seedId ?? gameId;
      const loadout = Array.isArray(match?.loadout) && match.loadout.length === 4
        ? match.loadout
        : defaultRankRoadLoadout();
      const gameResult = await ctx.runMutation(internal.service.gameManager.createGame, {
        gameId,
        seed: typeof rawSeed === "string" ? rawSeed : String(rawSeed),
        loadout,
        uid: match?.uid,
        matchId: match?.matchId,
      });
      if (gameResult?.ok) {
        res.ok = true;
        res.game = gameResult.data;
      }
    } else {
      res.ok = true;
      res.game = game;
    }
    return res;
  },
});

export const submitScore = action({
  args: { gameId: v.string(), score: v.number() },
  handler: async (ctx, { gameId, score }): Promise<any> => {
    for (const base of [portal_url, tournament_url]) {
      try {
        const response = await fetch(`${base}/submitGameScore`, {
          method: "POST",
          body: JSON.stringify({ gameId, score }),
        });
        const res = await response.json();
        if (res?.ok) {
          return { ok: true, res };
        }
      } catch {
        // continue
      }
    }
    return { ok: false };
  },
});
