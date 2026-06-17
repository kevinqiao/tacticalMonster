/** 局内 / 结算页展示的周联赛 League XP 摘要 */

export type WeeklyLeagueSettleUI = {
  leagueXpDelta: number;
  weeklyLeagueXpTotal: number;
  cohortRank: number;
  cohortSize: number;
  lines?: Array<{ label: string; value: number }>;
};

export function formatWeeklyLeagueSettleLines(
  settle: WeeklyLeagueSettleUI | null | undefined
): Array<{ label: string; value: string }> {
  if (!settle || settle.leagueXpDelta <= 0) return [];
  const rows: Array<{ label: string; value: string }> = [];
  if (settle.lines?.length) {
    for (const line of settle.lines) {
      if (line.value > 0) rows.push({ label: line.label, value: `+${line.value}` });
    }
  } else {
    rows.push({ label: "League XP", value: `+${settle.leagueXpDelta}` });
  }
  if (settle.cohortRank > 0 && settle.cohortSize > 0) {
    rows.push({
      label: "周赛排名",
      value: `${settle.cohortRank} / ${settle.cohortSize}`,
    });
  }
  return rows;
}

export function weeklyLeagueSettleHeadline(
  settle: WeeklyLeagueSettleUI | null | undefined
): string | null {
  if (!settle || settle.leagueXpDelta <= 0) return null;
  return `+${settle.leagueXpDelta} League XP（当周 ${settle.weeklyLeagueXpTotal}）`;
}
