import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { styles } from "./portal_3d_classes";
import {
  resolvePortal3DSharedBg,
  resolvePortal3DTierBadge,
  type PortalTierId,
} from "./portalGame3DTheme";
import type { RegisteredPartnerGameType } from "@/convex/portal/convex/data/partnerGameRegistry";
import type { PortalWeeklyLeagueUnclaimedRewards } from "../service/usePortalManager";
import { getBootFallbackBg } from "@/host/bootTheme";
import { markPortalBootPainted } from "@/host/bootHandoff";
import {
  shouldShowPortalAccountChrome,
  shouldShowPortalAuthMenuActions,
} from "../portalAuthButtonVisible";
import { CasualAdReplayVideoIcon } from "@/component/battle/games/shared/CasualAdReplayVideoIcon";
import { formatWeekRemaining } from "./portalGame3DFormatters";

/** 统一规则弹窗的定位锚点：solo/multi 定位到积分段的对应模式卡 */
export type Portal3DRulesAnchor = "solo" | "multi" | "tiers" | "rewards";

export interface Portal3DTierInfo {
  tierId: PortalTierId;
  /** 例："白银 III" */
  tierLabel: string;
  /** 叠加在盾牌上的段位数字，例："III" */
  division?: string;
  /** 用户可见 8 位字母数字组号；null 表示分组未就绪 */
  cohortNo?: string | null;
  /** 组内名次（1-based） */
  rank?: number | null;
  /** 设计容量（三区条 / 降级文案 to） */
  cohortSize?: number;
  /** 当前可见人数（名次 #x / N） */
  cohortMemberCount?: number;
  /** 本周总积分 */
  points?: number;
  /** 按当前名次预估的结算金币；null 隐藏该行 */
  projectedCoins?: number | null;
  /** 晋升区最后一名（默认 10） */
  promoteTo?: number;
  /** 降级区第一名（默认 23） */
  demoteFrom?: number;
}

export interface PortalGame3DInnerProps {
  gameType?: RegisteredPartnerGameType | null;
  heroLogoUrl?: string;
  authed?: boolean;
  tier?: Portal3DTierInfo;
  /** 金币余额；null/undefined 时隐藏顶栏金币（未登录不传） */
  coinBalance?: number | null;
  /** 门票余额；null/undefined 时隐藏顶栏门票（未登录不传） */
  ticketBalance?: number | null;
  joining?: "solo" | "multi" | null;
  soloJoinBlocked?: boolean;
  multiJoinBlocked?: boolean;
  soloOpenAssignment?: unknown;
  multiOpenAssignment?: unknown;
  /** 免费/广告/门票阶梯今日次数（单人；开始按钮 used/cap 用） */
  soloLadderPlaysToday?: number;
  /** 免费每日上限（单人；按钮 used/cap 用） */
  soloMaxPlaysPerDay?: number;
  /** 免费/广告/门票阶梯今日次数（多人；开始按钮 used/cap 用） */
  multiLadderPlaysToday?: number;
  /** 免费每日上限（多人；按钮 used/cap 用） */
  multiMaxPlaysPerDay?: number;
  /** 单人今日次数已用尽（无进行中对局时「开始」应灰掉） */
  soloDailyExhausted?: boolean;
  /** 多人今日次数已用尽 */
  multiDailyExhausted?: boolean;
  /** 免费用尽后可看广告入场 */
  soloAdEntryAvailable?: boolean;
  multiAdEntryAvailable?: boolean;
  /** 广告入场功能开启（用于展示广告配额，与选赛窗一致） */
  soloAdEntryEnabled?: boolean;
  multiAdEntryEnabled?: boolean;
  soloAdEntryUsedToday?: number;
  multiAdEntryUsedToday?: number;
  soloAdEntryCap?: number;
  multiAdEntryCap?: number;
  soloTicketEntryAvailable?: boolean;
  multiTicketEntryAvailable?: boolean;
  soloTicketEntryPrice?: number;
  multiTicketEntryPrice?: number;
  soloTicketEntryRemaining?: number;
  multiTicketEntryRemaining?: number;
  /**
   * 该模式恰好只有一场免费→广告阶梯赛事（无选赛窗）：
   * 主页显示与选赛窗相同的「免费 used/cap · 广告 used/cap」。
   */
  soloShowHomeLadderCta?: boolean;
  multiShowHomeLadderCta?: boolean;
  queueWaiting?: boolean;
  weekEndsAt?: number | null;
  bgUrl?: string;
  pageActive?: boolean;

  onJoin?: (mode: "solo" | "multi") => void;
  /** 打开统一玩法规则弹窗并定位到对应段落 */
  onOpenRules?: (anchor: Portal3DRulesAnchor) => void;
  /** 打开周联赛本组排行 */
  onOpenLeaderboard?: () => void;
  onOpenFullHistory?: () => void;
  onOpenShop?: () => void;
  /** Hide shop entry when catalog has no visible SKUs for this partner. Default true. */
  showShop?: boolean;
  onSignIn?: () => void;
  /** Override account chrome visibility (preview). */
  showAuthButton?: boolean;
  /** Override Sign In (embed/partner should be false). */
  showAuthMenuActions?: boolean;
  /** Open My Account panel (authed avatar click). */
  onOpenAccount?: () => void;
  /** 未领取的周联赛金币；有值时在段位条显示「待领」胶囊 */
  unclaimedRewards?: PortalWeeklyLeagueUnclaimedRewards | null;
  onOpenUnclaimedRewards?: () => void;
}

export function PortalGame3DInner({
  gameType,
  heroLogoUrl,
  authed = false,
  tier,
  coinBalance,
  ticketBalance,
  joining = null,
  soloJoinBlocked = false,
  multiJoinBlocked = false,
  soloOpenAssignment,
  multiOpenAssignment,
  soloLadderPlaysToday = 0,
  soloMaxPlaysPerDay = 3,
  multiLadderPlaysToday = 0,
  multiMaxPlaysPerDay = 10,
  soloDailyExhausted = false,
  multiDailyExhausted = false,
  soloAdEntryAvailable = false,
  multiAdEntryAvailable = false,
  soloAdEntryEnabled = false,
  multiAdEntryEnabled = false,
  soloAdEntryUsedToday = 0,
  multiAdEntryUsedToday = 0,
  soloAdEntryCap = 0,
  multiAdEntryCap = 0,
  soloTicketEntryAvailable = false,
  multiTicketEntryAvailable = false,
  soloTicketEntryPrice,
  multiTicketEntryPrice,
  soloTicketEntryRemaining,
  multiTicketEntryRemaining,
  soloShowHomeLadderCta = false,
  multiShowHomeLadderCta = false,
  queueWaiting = false,
  weekEndsAt,
  bgUrl,
  onJoin,
  onOpenRules,
  onOpenLeaderboard,
  onOpenFullHistory,
  onOpenShop,
  showShop = true,
  onSignIn,
  showAuthButton,
  showAuthMenuActions: showAuthMenuActionsProp,
  onOpenAccount,
  unclaimedRewards,
  onOpenUnclaimedRewards,
  pageActive = true,
}: PortalGame3DInnerProps) {
  const { t } = useTranslation("portal.player");
  const showAuthActions =
    showAuthMenuActionsProp ?? shouldShowPortalAuthMenuActions();
  const accountChromeVisible =
    showAuthButton ?? shouldShowPortalAccountChrome(authed);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleWrapperRef = useRef<HTMLDivElement>(null);
  const shopRef = useRef<HTMLDivElement>(null);
  const authRef = useRef<HTMLDivElement>(null);
  const [isPortrait, setIsPortrait] = useState(false);

  useLayoutEffect(() => {
    if (!pageActive) return;
    const wrapper = scaleWrapperRef.current;
    if (!wrapper) return;

    // Tab hide / remount can briefly report tiny client sizes — retry those frames.
    const MIN_VIEW_PX = 80;
    let retryTimer: number | null = null;
    const delayedTimers: number[] = [];

    function applyScale() {
      const container = containerRef.current;
      if (!container || !wrapper) return;

      const viewW = wrapper.clientWidth;
      const viewH = wrapper.clientHeight;
      if (viewW < MIN_VIEW_PX || viewH < MIN_VIEW_PX) {
        if (retryTimer != null) window.clearTimeout(retryTimer);
        retryTimer = window.setTimeout(() => {
          retryTimer = null;
          scheduleApply();
        }, 50);
        return;
      }

      const portrait = viewW / viewH < 132 / 182;
      setIsPortrait((prev) => (prev === portrait ? prev : portrait));

      const designWidth = 1440;
      const designHeight = portrait ? 2560 : 1080;
      // Keep the CSS box in lockstep with transform math (avoids one-frame
      // mismatch when isPortrait state flips after tab restore).
      container.style.width = `${designWidth}px`;
      container.style.height = `${designHeight}px`;

      const scaleX = viewW / designWidth;
      const scaleY = viewH / designHeight;
      const scale = Math.min(scaleX, scaleY);

      const offsetX = (viewW - designWidth * scale) / 2;
      const offsetY = (viewH - designHeight * scale) / 2;
      container.style.transform =
        `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

      // Keep corner chrome readable/tappable on phones (canvas scale ~0.27).
      // Auth needs a larger floor; shop art is already wide — use a lower floor.
      const authChromeScale = Math.min(1, Math.max(scale, 0.6));
      const shopChromeScale = Math.min(1, Math.max(scale, 0.4));

      const shop = shopRef.current;
      if (shop) {
        shop.style.transform = `scale(${shopChromeScale})`;
        shop.style.top = `${24 * shopChromeScale}px`;
        shop.style.left = `${24 * shopChromeScale}px`;
      }

      const auth = authRef.current;
      if (auth) {
        auth.style.transform = `scale(${authChromeScale})`;
        auth.style.top = `${24 * authChromeScale}px`;
        auth.style.right = `${24 * authChromeScale}px`;
      }
    }

    const scheduleApply = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(applyScale);
      });
    };

    scheduleApply();
    const observer = new ResizeObserver(() => scheduleApply());
    observer.observe(wrapper);
    window.addEventListener("resize", scheduleApply);
    window.addEventListener("orientationchange", scheduleApply);
    window.addEventListener("pageshow", scheduleApply);
    window.addEventListener("focus", scheduleApply);
    const onVisibility = () => {
      if (document.visibilityState === "visible") scheduleApply();
    };
    document.addEventListener("visibilitychange", onVisibility);
    // Remount after in-app / browser tab return often needs a late pass once
    // side-banner shell and fonts settle.
    for (const ms of [0, 100, 300]) {
      delayedTimers.push(window.setTimeout(scheduleApply, ms));
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleApply);
      window.removeEventListener("orientationchange", scheduleApply);
      window.removeEventListener("pageshow", scheduleApply);
      window.removeEventListener("focus", scheduleApply);
      document.removeEventListener("visibilitychange", onVisibility);
      if (retryTimer != null) window.clearTimeout(retryTimer);
      for (const id of delayedTimers) window.clearTimeout(id);
    };
  }, [pageActive, isPortrait]);

  const soloJoinDisabled = !authed || joining != null || soloJoinBlocked;
  const multiJoinDisabled = !authed || joining != null || multiJoinBlocked;
  /** 不可新开且无「继续」时灰掉（含免费/广告/门票用尽；金币桌不受此限） */
  const soloStartGrayed = authed && !soloOpenAssignment && soloJoinDisabled;
  const multiStartGrayed =
    authed && !multiOpenAssignment && !queueWaiting && multiJoinDisabled;

  /** Same copy as tournament picker quota chips (`pickQuotaFree` / `pickQuotaAd`). */
  const renderHomeLadderQuota = (mode: "solo" | "multi") => {
    const freeUsed = Math.min(
      Math.max(0, mode === "solo" ? soloLadderPlaysToday : multiLadderPlaysToday),
      Math.max(0, mode === "solo" ? soloMaxPlaysPerDay : multiMaxPlaysPerDay)
    );
    const freeCap = Math.max(
      0,
      mode === "solo" ? soloMaxPlaysPerDay : multiMaxPlaysPerDay
    );
    const adEnabled =
      mode === "solo" ? soloAdEntryEnabled : multiAdEntryEnabled;
    const adCap = Math.max(
      0,
      mode === "solo" ? soloAdEntryCap : multiAdEntryCap
    );
    const adUsed = Math.min(
      Math.max(0, mode === "solo" ? soloAdEntryUsedToday : multiAdEntryUsedToday),
      adCap
    );
    const showAd = adEnabled && adCap > 0;
    if (freeCap <= 0) return null;
    return (
      <span
        className={styles.modePlayQuotaRow}
        aria-label={t("lobby.pickQuotaAria", {
          freeUsed,
          freeCap,
          adUsed: showAd ? adUsed : 0,
          adCap: showAd ? adCap : 0,
        })}
      >
        <span className={styles.modePlayQuotaChip}>
          {t("lobby.pickQuotaFree", { used: freeUsed, cap: freeCap })}
        </span>
        {showAd ? (
          <span
            className={`${styles.modePlayQuotaChip} ${styles.modePlayQuotaChipAd}`}
          >
            <CasualAdReplayVideoIcon />
            {t("lobby.pickQuotaAd", { used: adUsed, cap: adCap })}
          </span>
        ) : null}
      </span>
    );
  };

  const handleSoloClick = () => {
    if (!authed) {
      onSignIn?.();
    } else if (!soloJoinDisabled) {
      onJoin?.("solo");
    }
  };

  const handleMultiClick = () => {
    if (!authed) {
      onSignIn?.();
    } else if (!multiJoinDisabled) {
      onJoin?.("multi");
    }
  };

  const currentBgUrl =
    bgUrl ||
    resolvePortal3DSharedBg(isPortrait ? "portrait" : "landscape", gameType);

  const heroStyle = heroLogoUrl
    ? {
        backgroundImage: `url(${heroLogoUrl})`,
        backgroundSize: "contain" as const,
        backgroundRepeat: "no-repeat" as const,
        backgroundPosition: "center" as const,
      }
    : undefined;

  const containerStyle = {
    width: "1440px",
    height: isPortrait ? "2560px" : "1080px",
  };

  const handleShopClick = () => {
    if (!authed) {
      onSignIn?.();
      return;
    }
    onOpenShop?.();
  };

  useLayoutEffect(() => {
    if (!pageActive) return;
    markPortalBootPainted();
  }, [pageActive]);

  const promoteTo = tier?.promoteTo ?? 8;
  const demoteFrom = tier?.demoteFrom ?? 23;
  const cohortSize = tier?.cohortSize ?? 30;
  const cohortMemberCount = tier?.cohortMemberCount ?? cohortSize;

  return (
    <div
      ref={scaleWrapperRef}
      className={styles.scaleWrapper}
      style={{
        backgroundImage: `url(${currentBgUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: getBootFallbackBg(),
        visibility: pageActive ? "visible" : "hidden",
        pointerEvents: pageActive ? "auto" : "none",
      }}
    >
      <div ref={shopRef} className={styles.fixedShopCluster}>
        {showShop ? (
          <div
            className={styles.fixedShopButton}
            onClick={handleShopClick}
            style={{ cursor: "pointer" }}
            role="button"
            aria-label={
              coinBalance != null
                ? t("lobby.shopWithBalanceAria", {
                    coins: coinBalance.toLocaleString(),
                  })
                : t("lobby.shopAria")
            }
          >
            <div className={styles.fixedShopBackground}>
              <span className={styles.fixedShopGem} aria-hidden />
              <span className={styles.fixedShopText}>{t("lobby.shop")}</span>
            </div>
          </div>
        ) : null}
        {coinBalance != null || ticketBalance != null ? (
          <div className={styles.balanceChipRow} aria-hidden>
            {coinBalance != null ? (
              <div className={styles.coinChip}>
                <span className={styles.coinChipIcon} />
                <span className={styles.coinChipText}>{coinBalance.toLocaleString()}</span>
              </div>
            ) : null}
            {ticketBalance != null ? (
              <div className={styles.coinChip}>
                <span className={styles.ticketChipIcon} aria-hidden />
                <span className={styles.coinChipText}>{ticketBalance.toLocaleString()}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {accountChromeVisible ? (
        <div ref={authRef} className={styles.fixedAuthCluster}>
          <div
            className={styles.fixedAuthButton}
            role="button"
            tabIndex={0}
            aria-label={
              authed ? t("lobby.accountMenu.openAria") : t("lobby.signIn")
            }
            onClick={() => {
              if (!authed) {
                if (showAuthActions) onSignIn?.();
                return;
              }
              onOpenAccount?.();
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              if (!authed) {
                if (showAuthActions) onSignIn?.();
                return;
              }
              onOpenAccount?.();
            }}
            style={{ cursor: "pointer" }}
          >
            <div className={styles.fixedAuthBackground}>
              <span className={styles.fixedAuthIcon} aria-hidden />
            </div>
          </div>
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={isPortrait ? styles.mainContainerPortrait : styles.mainContainer}
        style={containerStyle}
      >
        <div className={isPortrait ? styles.groupsPortrait : styles.groups}>
          <div className={styles.image4} style={heroStyle} />
          {weekEndsAt != null && (
            <div className={styles.clockChip}>
              <span>⏱️ {formatWeekRemaining(weekEndsAt)}</span>
            </div>
          )}
        </div>
        <div className={styles.spacer} />
        {tier ? (
          <div
            className={
              isPortrait ? styles.tierStripRowPortrait : styles.tierStripRow
            }
          >
            <div className={styles.tierStrip}>
              <div className={styles.tierBadgeWrap}>
                <div
                  className={`${styles.tierBadge}${authed ? "" : ` ${styles.tierBadgeLocked}`}`}
                  style={{
                    backgroundImage: `url(${resolvePortal3DTierBadge(tier.tierId)})`,
                  }}
                  aria-hidden={!authed}
                >
                  {authed && tier.division ? (
                    <span className={styles.tierDivision}>{tier.division}</span>
                  ) : null}
                </div>
                {authed ? (
                  <span className={styles.tierName}>{tier.tierLabel}</span>
                ) : null}
              </div>
              <div className={styles.tierCenter}>
                <div className={styles.tierTopLine}>
                  <span
                    className={styles.tierRankText}
                    onClick={() => onOpenRules?.("tiers")}
                    role="button"
                    aria-label={t("lobby.rulesAria")}
                  >
                    {t("lobby.rankLabel", {
                      rank: tier.rank != null ? `#${tier.rank}` : t("common.dash"),
                    })}
                    {/* Portrait: ? next to rank (cohort hidden). */}
                    {isPortrait ? (
                      <span
                        className={styles.tierHelpBtn}
                        aria-hidden
                      />
                    ) : null}
                  </span>
                  {/* Landscape: cohort immediately after rank on the same top row. */}
                  {!isPortrait ? (
                    <span className={styles.tierCohortNo}>
                      {tier.cohortNo != null
                        ? t("lobby.cohortLabel", { no: tier.cohortNo })
                        : t("lobby.cohortPending")}
                      <span
                        className={styles.tierHelpBtn}
                        onClick={() => onOpenRules?.("tiers")}
                        role="button"
                        aria-label={t("lobby.rulesAria")}
                      />
                    </span>
                  ) : null}
                </div>
                <div className={styles.tierZoneBar}>
                  <div className={styles.tierZonePromote}>
                    {t("lobby.zonePromote", { from: 1, to: promoteTo })}
                  </div>
                  <div className={styles.tierZoneKeep}>
                    {t("lobby.zoneKeep", { from: promoteTo + 1, to: demoteFrom - 1 })}
                  </div>
                  <div className={styles.tierZoneDemote}>
                    {t("lobby.zoneDemote", { from: demoteFrom, to: cohortSize })}
                  </div>
                  {tier.rank != null ? (
                    <div
                      className={styles.tierZoneMarker}
                      style={{
                        left: `${Math.min(
                          100,
                          Math.max(
                            0,
                            ((tier.rank - 0.5) / cohortSize) * 100
                          )
                        )}%`,
                      }}
                    />
                  ) : null}
                </div>
                {/* Portrait: hide projected settlement text; keep claimable chip if any */}
                {(!isPortrait && tier.projectedCoins != null) ||
                (unclaimedRewards && unclaimedRewards.coins > 0) ? (
                  <div className={styles.tierRewardLine}>
                    {!isPortrait && tier.projectedCoins != null ? (
                      <div className={styles.tierRewardLineMain}>
                        <span>{t("lobby.projectedReward")}</span>
                        <div className={styles.tierRewardCoin} />
                        <span className={styles.tierRewardNum}>
                          +{tier.projectedCoins}
                        </span>
                      </div>
                    ) : null}
                    {unclaimedRewards && unclaimedRewards.coins > 0 ? (
                      <div
                        className={styles.tierUnclaimedChip}
                        onClick={onOpenUnclaimedRewards}
                        role="button"
                        aria-label={t("lobby.unclaimedCoinsAria", {
                          coins: unclaimedRewards.coins.toLocaleString(),
                        })}
                      >
                        <span className={styles.tierUnclaimedIcon} aria-hidden />
                        <span className={styles.tierUnclaimedText}>
                          {t("lobby.unclaimedCoins", {
                            coins: unclaimedRewards.coins.toLocaleString(),
                          })}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className={styles.tierBtnGroup}>
                <div
                  className={`${styles.tierLbBtn}${authed ? "" : ` ${styles.tierActionDisabled}`}`}
                  onClick={authed ? onOpenLeaderboard : undefined}
                  role="button"
                  aria-label={t("lobby.leaderboardAria")}
                  aria-disabled={!authed}
                >
                  <div className={styles.tierLbBtnBg}>
                    <div className={styles.tierLbTrophy} />
                    <span className={styles.tierLbText}>{t("lobby.leaderboard")}</span>
                  </div>
                </div>
                <div
                  className={`${styles.tierHistoryBtn}${authed ? "" : ` ${styles.tierActionDisabled}`}`}
                  onClick={authed ? onOpenFullHistory : undefined}
                  role="button"
                  aria-label={t("lobby.historyAria")}
                  aria-disabled={!authed}
                >
                  <div className={styles.tierLbBtnBg}>
                    <div className={styles.tierHistoryIcon} />
                    <span className={styles.tierLbText}>{t("lobby.history")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className={isPortrait ? styles.flexRowBPortrait : styles.flexRowB}>
          <div className={styles.groups5}>
            <div className={`${styles.modeCard} ${styles.modeCardSolo}`}>
              <div className={styles.modeCardTopRow}>
                <div className={styles.modeIconSolo} />
                <span className={styles.modeTitle}>{t("lobby.modes.challenge")}</span>
              </div>
              <div className={styles.modePlayBlock}>
                {soloShowHomeLadderCta &&
                !soloOpenAssignment &&
                joining !== "solo"
                  ? renderHomeLadderQuota("solo")
                  : null}
                <div
                  className={`${styles.modePlayBtn} ${styles.modePlayBtnSolo}${
                    soloStartGrayed ? ` ${styles.modePlayBtnDisabled}` : ""
                  }`}
                  onClick={handleSoloClick}
                  role="button"
                  aria-disabled={soloStartGrayed || undefined}
                  aria-label={
                    joining === "solo"
                      ? t("lobby.joining")
                      : soloOpenAssignment
                        ? `${t("lobby.continue")} · ${t("lobby.continueInProgress")}`
                        : soloShowHomeLadderCta &&
                            soloDailyExhausted &&
                            soloAdEntryAvailable
                          ? t("lobby.playWatchAdPlain")
                          : soloShowHomeLadderCta &&
                              soloDailyExhausted &&
                              soloTicketEntryAvailable
                            ? t("lobby.playWithTickets", {
                                price: soloTicketEntryPrice ?? 1,
                              })
                            : t("lobby.play")
                  }
                  style={{
                    cursor: !authed || !soloJoinDisabled ? "pointer" : "not-allowed",
                  }}
                >
                  {joining === "solo" ? (
                    <span className={styles.modePlayText}>{t("lobby.joining")}</span>
                  ) : soloOpenAssignment ? (
                    <span className={styles.modePlayStack}>
                      <span className={styles.modePlayText}>{t("lobby.continue")}</span>
                      <span className={styles.modePlaySubtext}>
                        {t("lobby.continueInProgress")}
                      </span>
                    </span>
                  ) : soloShowHomeLadderCta &&
                    soloDailyExhausted &&
                    soloAdEntryAvailable ? (
                    <span
                      className={`${styles.modePlayText} ${styles.modePlayTextCompact}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                    >
                      <CasualAdReplayVideoIcon />
                      {t("lobby.playWatchAdPlain")}
                    </span>
                  ) : soloShowHomeLadderCta &&
                    soloDailyExhausted &&
                    soloTicketEntryAvailable ? (
                    <span className={styles.modePlayStack}>
                      <span className={styles.modePlayText}>
                        {t("lobby.playWithTickets", {
                          price: soloTicketEntryPrice ?? 1,
                        })}
                      </span>
                      <span className={styles.modePlaySubtext}>
                        {t("lobby.playWithTicketsSub", {
                          remaining: soloTicketEntryRemaining ?? 0,
                        })}
                      </span>
                    </span>
                  ) : (
                    <span className={`${styles.modePlayText} ${styles.modePlayTextCompact}`}>
                      {t("lobby.play")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.groups10}>
            <div className={`${styles.modeCard} ${styles.modeCardArena}`}>
              <div className={styles.modeCardTopRow}>
                <div className={styles.modeIconArena} />
                <span className={styles.modeTitle}>{t("lobby.modes.arena")}</span>
              </div>
              <div className={styles.modePlayBlock}>
                {multiShowHomeLadderCta &&
                !multiOpenAssignment &&
                joining !== "multi" &&
                !queueWaiting
                  ? renderHomeLadderQuota("multi")
                  : null}
                <div
                  className={`${styles.modePlayBtn} ${styles.modePlayBtnArena}${
                    multiStartGrayed ? ` ${styles.modePlayBtnDisabled}` : ""
                  }`}
                  onClick={handleMultiClick}
                  role="button"
                  aria-disabled={multiStartGrayed || undefined}
                  aria-label={
                    joining === "multi" || queueWaiting
                      ? t("lobby.matching")
                      : multiOpenAssignment
                        ? `${t("lobby.continue")} · ${t("lobby.continueInProgress")}`
                        : multiShowHomeLadderCta &&
                            multiDailyExhausted &&
                            multiAdEntryAvailable
                          ? t("lobby.playWatchAdPlain")
                          : multiShowHomeLadderCta &&
                              multiDailyExhausted &&
                              multiTicketEntryAvailable
                            ? t("lobby.playWithTickets", {
                                price: multiTicketEntryPrice ?? 2,
                              })
                            : t("lobby.play")
                  }
                  style={{
                    cursor: !authed || !multiJoinDisabled ? "pointer" : "not-allowed",
                  }}
                >
                  {joining === "multi" || queueWaiting ? (
                    <span className={styles.modePlayText}>{t("lobby.matching")}</span>
                  ) : multiOpenAssignment ? (
                    <span className={styles.modePlayStack}>
                      <span className={styles.modePlayText}>{t("lobby.continue")}</span>
                      <span className={styles.modePlaySubtext}>
                        {t("lobby.continueInProgress")}
                      </span>
                    </span>
                  ) : multiShowHomeLadderCta &&
                    multiDailyExhausted &&
                    multiAdEntryAvailable ? (
                    <span
                      className={`${styles.modePlayText} ${styles.modePlayTextCompact}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                    >
                      <CasualAdReplayVideoIcon />
                      {t("lobby.playWatchAdPlain")}
                    </span>
                  ) : multiShowHomeLadderCta &&
                    multiDailyExhausted &&
                    multiTicketEntryAvailable ? (
                    <span className={styles.modePlayStack}>
                      <span className={styles.modePlayText}>
                        {t("lobby.playWithTickets", {
                          price: multiTicketEntryPrice ?? 2,
                        })}
                      </span>
                      <span className={styles.modePlaySubtext}>
                        {t("lobby.playWithTicketsSub", {
                          remaining: multiTicketEntryRemaining ?? 0,
                        })}
                      </span>
                    </span>
                  ) : (
                    <span className={`${styles.modePlayText} ${styles.modePlayTextCompact}`}>
                      {t("lobby.play")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
