/**
 * Portal 徽章模板（纯展示；无钱包奖励）。
 * 前后端可共用。
 */

export type PortalBadgeEventKind =
  | "peak_league_tier"
  | "weekly_promote_count"
  | "multiplayer_win"
  | "total_match_wins"
  | "season_level"
  | "legacy_complete";

export type PortalBadgeCategory =
  | "league_peak"
  | "climb"
  | "crowns"
  | "wins"
  | "collector"
  | "season_marks";

export interface PortalBadgeTemplate {
  badgeId: string;
  title: string;
  description: string;
  eventKind: PortalBadgeEventKind;
  threshold: number;
  category: PortalBadgeCategory;
  iconKey: string;
  seasonScoped?: boolean;
}

const TIER_ORDER: Record<string, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
  diamond: 4,
};

export function portalLeagueTierOrder(tierId: string): number {
  return TIER_ORDER[tierId] ?? 0;
}

export const PORTAL_BADGE_TEMPLATES: PortalBadgeTemplate[] = [
  {
    badgeId: "peak_league_silver",
    title: "League · Silver",
    description: "Reached Silver as your all-time peak league tier.",
    eventKind: "peak_league_tier",
    threshold: portalLeagueTierOrder("silver"),
    category: "league_peak",
    iconKey: "tier_silver",
  },
  {
    badgeId: "peak_league_gold",
    title: "League · Gold",
    description: "Reached Gold as your all-time peak league tier.",
    eventKind: "peak_league_tier",
    threshold: portalLeagueTierOrder("gold"),
    category: "league_peak",
    iconKey: "tier_gold",
  },
  {
    badgeId: "peak_league_platinum",
    title: "League · Platinum",
    description: "Reached Platinum as your all-time peak league tier.",
    eventKind: "peak_league_tier",
    threshold: portalLeagueTierOrder("platinum"),
    category: "league_peak",
    iconKey: "tier_platinum",
  },
  {
    badgeId: "peak_league_diamond",
    title: "League · Diamond",
    description: "Reached Diamond as your all-time peak league tier.",
    eventKind: "peak_league_tier",
    threshold: portalLeagueTierOrder("diamond"),
    category: "league_peak",
    iconKey: "tier_diamond",
  },
  {
    badgeId: "weekly_promote_1",
    title: "First Promotion",
    description: "Finished in the promotion zone for the first time.",
    eventKind: "weekly_promote_count",
    threshold: 1,
    category: "climb",
    iconKey: "climb",
  },
  {
    badgeId: "weekly_promote_5",
    title: "Regular Promoter",
    description: "Earned 5 weekly league promotions.",
    eventKind: "weekly_promote_count",
    threshold: 5,
    category: "climb",
    iconKey: "climb",
  },
  {
    badgeId: "weekly_promote_20",
    title: "Promotion Veteran",
    description: "Earned 20 weekly league promotions.",
    eventKind: "weekly_promote_count",
    threshold: 20,
    category: "climb",
    iconKey: "climb",
  },
  {
    badgeId: "multiplayer_win_10",
    title: "10 Crowns",
    description: "Finished 1st in multiplayer 10 times.",
    eventKind: "multiplayer_win",
    threshold: 10,
    category: "crowns",
    iconKey: "crown",
  },
  {
    badgeId: "multiplayer_win_50",
    title: "50 Crowns",
    description: "Finished 1st in multiplayer 50 times.",
    eventKind: "multiplayer_win",
    threshold: 50,
    category: "crowns",
    iconKey: "crown",
  },
  {
    badgeId: "multiplayer_win_200",
    title: "200 Crowns",
    description: "Finished 1st in multiplayer 200 times.",
    eventKind: "multiplayer_win",
    threshold: 200,
    category: "crowns",
    iconKey: "crown",
  },
  {
    badgeId: "total_wins_25",
    title: "First Sparks",
    description: "Won 25 matches (1st place or Solo clear).",
    eventKind: "total_match_wins",
    threshold: 25,
    category: "wins",
    iconKey: "wins",
  },
  {
    badgeId: "total_wins_100",
    title: "Century Club",
    description: "Won 100 matches.",
    eventKind: "total_match_wins",
    threshold: 100,
    category: "wins",
    iconKey: "wins",
  },
  {
    badgeId: "total_wins_500",
    title: "Match Veteran",
    description: "Won 500 matches.",
    eventKind: "total_match_wins",
    threshold: 500,
    category: "wins",
    iconKey: "wins",
  },
  {
    badgeId: "legacy_collector",
    title: "Badge Collector",
    description: "Unlocked every all-time league and match badge.",
    eventKind: "legacy_complete",
    threshold: 1,
    category: "collector",
    iconKey: "collector",
  },
];

export const PORTAL_LEGACY_BADGE_IDS = PORTAL_BADGE_TEMPLATES.filter(
  (t) => t.category !== "collector" && t.category !== "season_marks"
).map((t) => t.badgeId);

export const SEASON_MARK_THRESHOLDS = [
  { level: 10 as const, suffix: "lv10", titleSuffix: "Active" },
  { level: 20 as const, suffix: "lv20", titleSuffix: "Dedicated" },
  { level: 30 as const, suffix: "lv30", titleSuffix: "Max" },
];

export function seasonMarkBadgeId(seasonId: string, level: 10 | 20 | 30): string {
  const row = SEASON_MARK_THRESHOLDS.find((r) => r.level === level)!;
  return `season_${seasonId}_${row.suffix}`;
}

export function buildSeasonMarkTemplates(
  seasonId: string,
  seasonDisplayN: number
): PortalBadgeTemplate[] {
  return SEASON_MARK_THRESHOLDS.map((row) => ({
    badgeId: seasonMarkBadgeId(seasonId, row.level),
    title: `Season ${seasonDisplayN} · ${row.titleSuffix}`,
    description: `Reached Season level ${row.level}${
      row.level === 30 ? " (max)" : ""
    } in Season ${seasonDisplayN}.`,
    eventKind: "season_level" as const,
    threshold: row.level,
    category: "season_marks" as const,
    iconKey: `season_${row.titleSuffix.toLowerCase()}`,
    seasonScoped: true,
  }));
}

export function getPortalBadgeTemplate(
  badgeId: string
): PortalBadgeTemplate | undefined {
  const staticHit = PORTAL_BADGE_TEMPLATES.find((t) => t.badgeId === badgeId);
  if (staticHit) return staticHit;
  const m = /^season_(.+)_lv(10|20|30)$/.exec(badgeId);
  if (!m) return undefined;
  const seasonId = m[1]!;
  const level = Number(m[2]) as 10 | 20 | 30;
  const displayN = Number(seasonId.replace(/^S/i, "")) || 0;
  return buildSeasonMarkTemplates(seasonId, displayN).find((t) => t.badgeId === badgeId);
}
