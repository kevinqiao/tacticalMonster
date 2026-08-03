/**
 * 纯函数：胜场计数增量与徽章阈值判定（供单测）。
 */
import {
  PORTAL_BADGE_TEMPLATES,
  PORTAL_LEGACY_BADGE_IDS,
  portalLeagueTierOrder,
  type PortalBadgeTemplate,
} from "../../data/portalBadgeTemplates";

export function portalMatchWinDeltas(args: {
  mode: "solo" | "multi";
  rank?: number;
  p75Success?: boolean;
}): { matchWin: boolean; multiWin: boolean } {
  const multiWin = args.mode === "multi" && (args.rank ?? 0) === 1;
  const soloWin = args.mode === "solo" && args.p75Success === true;
  return { matchWin: multiWin || soloWin, multiWin };
}

export function portalBadgeTemplateMet(
  tmpl: PortalBadgeTemplate,
  event:
    | {
        kind: "week_close";
        peakLeagueTier: string;
        weeklyPromoteCount: number;
      }
    | {
        kind: "match_settled";
        peakLeagueTier: string;
        totalMatchWins: number;
        totalMultiplayerWins: number;
      }
    | {
        kind: "season_finalized";
        seasonId: string;
        seasonLevel: number;
      }
): boolean {
  if (tmpl.eventKind === "legacy_complete") return false;
  if (event.kind === "week_close") {
    if (tmpl.eventKind === "peak_league_tier") {
      return portalLeagueTierOrder(event.peakLeagueTier) >= tmpl.threshold;
    }
    if (tmpl.eventKind === "weekly_promote_count") {
      return event.weeklyPromoteCount >= tmpl.threshold;
    }
  } else if (event.kind === "match_settled") {
    if (tmpl.eventKind === "peak_league_tier") {
      return portalLeagueTierOrder(event.peakLeagueTier) >= tmpl.threshold;
    }
    if (tmpl.eventKind === "multiplayer_win") {
      return event.totalMultiplayerWins >= tmpl.threshold;
    }
    if (tmpl.eventKind === "total_match_wins") {
      return event.totalMatchWins >= tmpl.threshold;
    }
  } else if (event.kind === "season_finalized") {
    if (tmpl.eventKind === "season_level" && tmpl.seasonScoped) {
      return (
        tmpl.badgeId.startsWith(`season_${event.seasonId}_`) &&
        event.seasonLevel >= tmpl.threshold
      );
    }
  }
  return false;
}

export function portalBadgesUnlockedByEvent(
  event:
    | {
        kind: "week_close";
        peakLeagueTier: string;
        weeklyPromoteCount: number;
      }
    | {
        kind: "match_settled";
        peakLeagueTier: string;
        totalMatchWins: number;
        totalMultiplayerWins: number;
      },
  alreadyUnlocked: ReadonlySet<string> = new Set()
): string[] {
  const out: string[] = [];
  for (const tmpl of PORTAL_BADGE_TEMPLATES) {
    if (tmpl.eventKind === "legacy_complete") continue;
    if (alreadyUnlocked.has(tmpl.badgeId)) continue;
    if (portalBadgeTemplateMet(tmpl, event)) out.push(tmpl.badgeId);
  }
  const after = new Set([...alreadyUnlocked, ...out]);
  if (
    PORTAL_LEGACY_BADGE_IDS.every((id) => after.has(id)) &&
    !alreadyUnlocked.has("legacy_collector")
  ) {
    out.push("legacy_collector");
  }
  return out;
}
