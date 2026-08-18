import { incrementCoinWeekCount } from "./coinWeekProgress";
import { completeQuestIfNeeded, grantMayorXp } from "./mayorProgress";
import { incrementShowdownWeekCount } from "./showdownWeekProgress";
import { readTownProgress, townProgressCtxFromId } from "./townProgressStore";
import { grantVenueXp } from "./venueProgress";
import { resolveDistrictOps } from "./districtOps";
import { addTermPassXp } from "./termPass";
import { recordGamePlay } from "./gameOps";

type SettleCtx = { db: any };

/**
 * Mayor / venue / Showdown-week / D1 quest / Term Pass — only for runs opened from Town.
 * Lobby settles must not grant Town progress just because town_progress exists.
 */
export async function applyTownProgressOnMatchSettle(
  ctx: SettleCtx,
  args: {
    uid: string;
    matchType: string;
    rank?: number;
    townId: string;
    coinTable?: boolean;
    soloSuccess?: boolean;
    gameType?: string;
  }
): Promise<void> {
  if (!args.townId) return;

  const hallKind =
    args.matchType === "solo_p75"
      ? ("trial" as const)
      : args.matchType === "multi_ranked"
        ? ("showdown" as const)
        : null;
  if (!hallKind) return;

  const townCtx = townProgressCtxFromId(ctx.db, args.uid, args.townId);
  const progress = await readTownProgress(townCtx);
  if (!progress) return;

  const ops = resolveDistrictOps(progress);
  const won = hallKind === "showdown" && args.rank === 1;
  await grantMayorXp(townCtx, { hallKind, won });
  await grantVenueXp(townCtx, { hallKind, won });
  if (hallKind === "showdown") {
    await incrementShowdownWeekCount(townCtx);
    await completeQuestIfNeeded(townCtx, "quest_d1_market");
    await addTermPassXp(townCtx, { showdown: true });
  } else if (args.soloSuccess) {
    await addTermPassXp(townCtx, { soloSuccess: true });
  }
  if (args.coinTable) {
    await incrementCoinWeekCount(townCtx);
  }
  if (args.gameType) {
    await recordGamePlay(townCtx, { gameType: args.gameType, ops });
  }
}
