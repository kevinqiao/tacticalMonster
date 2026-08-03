import { useLayoutEffect, useMemo } from "react";

import { useCasualPlatform } from "../service/useCasualPlatformManager";
import {
  pickSeasonIdForUiTheme,
  resolveCasualUiBpTier,
  resolveCasualUiThemeDataAttr,
  type CasualUiThemeDataset,
} from "./casualUiTheme";

/** 与 `listSeasons` 占位、`CasualLeaderboardsTab` 默认赛季对齐 */
const CASUAL_UI_THEME_SEASON_FALLBACK = "casual_s1";

export const CASUAL_UI_THEME_HTML_ATTR = "data-casual-ui-theme";
export const CASUAL_UI_BP_HTML_ATTR = "data-casual-ui-bp";

/** 未单独配置主题的赛季仍用 S1 环境层（后续按 seasonId 扩展映射表） */
const CASUAL_UI_THEME_ENV_DEFAULT: CasualUiThemeDataset = "s1-midnight-sky";

export function isCasualLobbyPath(pathname = window.location.pathname): boolean {
  return pathname.includes("/casual");
}

export function applyCasualUiThemeToDocument(
  theme: CasualUiThemeDataset | "",
  bpTier?: string
): void {
  const root = document.documentElement;
  if (theme) {
    root.setAttribute(CASUAL_UI_THEME_HTML_ATTR, theme);
  } else {
    root.removeAttribute(CASUAL_UI_THEME_HTML_ATTR);
  }
  if (bpTier) {
    root.setAttribute(CASUAL_UI_BP_HTML_ATTR, bpTier);
  } else {
    root.removeAttribute(CASUAL_UI_BP_HTML_ATTR);
  }
}

/**
 * 将当前赛季 UI 主题写到 `<html data-casual-ui-theme="…">` 与 BP 分档。
 * 仅在离开 `/casual` 路由时清除，避免 Tab 切换 / Strict Mode 卸载误删。
 */
export function useCasualUiTheme(): void {
  const casual = useCasualPlatform();
  const seasonIdForUi =
    pickSeasonIdForUiTheme(casual) ?? CASUAL_UI_THEME_SEASON_FALLBACK;
  const uiThemeAttr = useMemo(() => {
    const mapped = resolveCasualUiThemeDataAttr(seasonIdForUi);
    return mapped || CASUAL_UI_THEME_ENV_DEFAULT;
  }, [seasonIdForUi]);

  const bpTier = useMemo(() => {
    const ent = casual.skinState?.entitlements;
    return resolveCasualUiBpTier({
      uiTier: ent?.uiTier,
      tracksPurchased: casual.passProgress?.tracksPurchased,
    });
  }, [casual.skinState?.entitlements, casual.passProgress?.tracksPurchased]);

  if (typeof document !== "undefined" && isCasualLobbyPath()) {
    applyCasualUiThemeToDocument(uiThemeAttr, bpTier);
  }

  useLayoutEffect(() => {
    if (!isCasualLobbyPath()) return;
    applyCasualUiThemeToDocument(uiThemeAttr, bpTier);
    return () => {
      if (!isCasualLobbyPath()) {
        applyCasualUiThemeToDocument("", "");
      }
    };
  }, [uiThemeAttr, bpTier]);
}
