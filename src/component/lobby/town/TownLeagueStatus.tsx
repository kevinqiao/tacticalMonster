import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { PortalWeeklyLeagueTierView } from "component/lobby/portal/service/usePortalManager";
import {
  portalTierDisplayLabel,
  type PortalTierId,
} from "component/lobby/portal/3d/portalGame3DTheme";

type TownLeagueStatusProps = {
  league: PortalWeeklyLeagueTierView | null;
  authed: boolean;
  onOpenLeague: () => void;
};

const TIER_EMOJI: Record<PortalTierId, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💠",
  diamond: "💎",
};

function seasonProgressPct(league: PortalWeeklyLeagueTierView): number {
  const span = league.seasonXpForLevel ?? 0;
  if (span <= 0) return 100;
  const into = league.seasonXpIntoLevel ?? 0;
  return Math.min(100, Math.round((into / span) * 100));
}

/**
 * Town League telegraph — opens the Town League tab (not Lobby / Game Center).
 */
export function TownLeagueStatus({
  league,
  authed,
  onOpenLeague,
}: TownLeagueStatusProps) {
  const { t } = useTranslation("portal.player");

  const tierId = (league?.tierId ?? "bronze") as PortalTierId;
  const { tierLabel } = useMemo(() => portalTierDisplayLabel(tierId), [tierId]);
  const emoji = TIER_EMOJI[tierId] ?? TIER_EMOJI.bronze;

  const seasonLevel = league?.seasonLevel;
  const showSeason =
    authed && typeof seasonLevel === "number" && Number.isFinite(seasonLevel);

  const seasonLabel = useMemo(() => {
    if (!showSeason) return null;
    const sid = String(league?.seasonId ?? "").replace(/^S/i, "");
    const week =
      league?.seasonWeek != null && league?.seasonWeeks != null
        ? ` · W${league.seasonWeek}/${league.seasonWeeks}`
        : "";
    return sid ? `S${sid}${week} · Lv ${seasonLevel}` : `Lv ${seasonLevel}`;
  }, [showSeason, league?.seasonId, league?.seasonWeek, league?.seasonWeeks, seasonLevel]);

  const rankHint =
    authed && league?.cohortRank != null && league.cohortRank > 0
      ? t("town.leagueRankHint", {
          rank: league.cohortRank,
          size: league.cohortMemberCount ?? league.cohortSize ?? 30,
        })
      : null;

  return (
    <button
      type="button"
      className="town-league-status"
      title={t("town.leagueStatusTitle")}
      onClick={onOpenLeague}
    >
      <span className="town-league-status__tier">
        {emoji} {tierLabel}
      </span>
      {showSeason ? (
        <>
          <span className="town-league-status__season">{seasonLabel}</span>
          <span className="town-league-status__track" aria-hidden>
            <span
              className="town-league-status__fill"
              style={{ width: `${seasonProgressPct(league!)}%` }}
            />
          </span>
        </>
      ) : (
        <span className="town-league-status__hint">
          {authed ? t("town.leagueHubHint") : t("town.leagueLoginHint")}
        </span>
      )}
      {rankHint ? (
        <span className="town-league-status__rank">{rankHint}</span>
      ) : null}
    </button>
  );
}
