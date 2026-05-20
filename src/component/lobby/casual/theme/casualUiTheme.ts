/**
 * 休闲大厅 UI 主题：按赛季 id 映射（见 docs/skin/SKIN_DESIGN.md §9）。
 * `data-casual-ui-theme` 挂在 document.documentElement，供全局 token 与 Play Hub 覆写。
 */

export type CasualUiThemeDataset = "s1-midnight-sky" | "s2-edo-sakura";

export type CasualUiBpTier = "env" | "standard" | "deluxe";

export function pickSeasonIdForUiTheme(casual: {
  seasonLadderSnapshot: { seasonId: string } | null;
  passProgress: { seasonId: string } | null;
  seasons: Array<{ seasonId: string; active?: boolean }>;
}): string | null {
  const ladder = casual.seasonLadderSnapshot?.seasonId?.trim();
  if (ladder) return ladder;
  const pass = casual.passProgress?.seasonId?.trim();
  if (pass) return pass;
  const active = casual.seasons?.find((s) => s.active);
  if (active?.seasonId?.trim()) return active.seasonId.trim();
  const first = casual.seasons?.[0]?.seasonId?.trim();
  if (first) return first;
  return null;
}

/** 返回写入 `document.documentElement.dataset.casualUiTheme` 的值；无主题则空串。 */
export function resolveCasualUiThemeDataAttr(seasonId: string | null | undefined): CasualUiThemeDataset | "" {
  if (!seasonId?.trim()) return "";
  const n = seasonId.trim().toLowerCase();
  if (
    n === "casual_s1" ||
    n === "s1" ||
    n === "season_placeholder_1" ||
    n.endsWith("_s1") ||
    n.startsWith("casual_s1_")
  ) {
    return "s1-midnight-sky";
  }
  if (n === "casual_s2" || n === "s2" || n.endsWith("_s2") || n.startsWith("casual_s2_")) {
    return "s2-edo-sakura";
  }
  return "";
}

export function resolveCasualUiBpTier(input: {
  uiTier?: "free" | "standard" | "deluxe";
  tracksPurchased?: { standard?: boolean; deluxe?: boolean };
}): CasualUiBpTier {
  if (input.uiTier === "deluxe" || input.tracksPurchased?.deluxe) return "deluxe";
  if (input.uiTier === "standard" || input.tracksPurchased?.standard) return "standard";
  return "env";
}
