import {
  SEASON_SHELF_SKUS,
  seasonShelfPriceHint,
} from "@/convex/casualPlatform/convex/data/casualSeasonShelfCatalog";
import {
  CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID,
  DEFAULT_CASUAL_TOURNAMENT_ID,
  getDefaultCasualTournaments,
  getTournamentDefinition,
  type CasualTournamentDefinition,
  type EntryCost,
} from "@/convex/casualPlatform/convex/data/casualTournamentConfigs";
import { PageProp } from "host/RenderApp";
import { useModalManager } from "host/service/ModalManager";
import { usePageManager } from "host/service/PageManager";
import React, { useMemo, useRef, useState } from "react";

import { CASUAL_FOOTER_NAV_URI } from "../../control/FooterNavCasual";
import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import CasualActivityStrip from "../shared/CasualActivityStrip";
import {
  previewCoinsCost,
  previewGemsCost,
  previewPassXp,
  previewVoucherCost,
  resolveActivityTitlesById,
  type CasualActivityPublicRow,
} from "../shared/casualActivityUi";
import CasualPageShell from "../shell/CasualPageShell";
import "./casualPlayTab.css";

function formatEntry(cost: EntryCost | undefined): string {
  if (!cost) return "—";
  if (cost.kind === "none") return "免费";
  if (cost.kind === "coins") return `${cost.amount} 金币`;
  if (cost.kind === "gems") return `${cost.amount} 钻`;
  if (cost.kind === "seasonVouchers") return `${cost.amount} 赛季券`;
  return "—";
}

function formatPrizeLine(
  def: CasualTournamentDefinition | null,
  activities: CasualActivityPublicRow[],
  tournamentId: string
): string {
  if (!def) return "计奖以服务端为准";
  const parts: string[] = [];
  if (def.rewardCoinsOnSettle > 0) parts.push(`≈${def.rewardCoinsOnSettle} 金币`);
  if (def.rewardGemsOnSettle > 0) parts.push(`≈${def.rewardGemsOnSettle} 钻`);
  if (def.seasonXpOnSettle > 0) {
    const pv = previewPassXp(activities, { tournamentId }, def.seasonXpOnSettle);
    parts.push(
      pv.changed
        ? `+${def.seasonXpOnSettle}→${pv.effective} 赛季 XP`
        : `+${def.seasonXpOnSettle} 赛季 XP`
    );
  }
  return parts.length ? parts.join(" · ") : "赛季进度与榜单位次";
}

function matchBadgeClass(matchType: string): string {
  if (matchType === "tournament_a") return "casual-play-tourney__cardBadge casual-play-tourney__cardBadge--a";
  if (matchType === "tournament_b") return "casual-play-tourney__cardBadge casual-play-tourney__cardBadge--b";
  if (matchType === "tournament_c") return "casual-play-tourney__cardBadge casual-play-tourney__cardBadge--c";
  if (matchType === "season_challenge") return "casual-play-tourney__cardBadge casual-play-tourney__cardBadge--spot";
  return "casual-play-tourney__cardBadge";
}

function matchBadgeLabel(matchType: string): string {
  if (matchType === "tournament_a") return "A 档";
  if (matchType === "tournament_b") return "B 档";
  if (matchType === "tournament_c") return "C 档";
  if (matchType === "season_challenge") return "专场";
  return "锦标";
}

function gameLabel(gameId: string): string {
  if (gameId === "block_blast") return "Block Blast";
  return gameId;
}

/** Play Tab：Solitaire Cash 式锦标赛大厅（PVE 异步 · 同一挑战比成绩） */
const CasualPlayTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const casual = useCasualPlatform();
  const { openModal } = useModalManager();
  const { openPage } = usePageManager();
  const [note, setNote] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const displayTournaments = useMemo(() => {
    if (casual.tournaments.length > 0) return casual.tournaments;
    return getDefaultCasualTournaments();
  }, [casual.tournaments]);

  const coins = casual.casualPlayer?.coins;
  const gems = casual.casualPlayer?.gems;
  const vouchers = casual.casualPlayer?.seasonVouchers;
  const challengePts = casual.casualPlayer?.seasonChallengePoints;

  const seasonChallengeDef = useMemo(
    () => getTournamentDefinition(CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID),
    []
  );
  const seasonChallengeEntryLabel = useMemo(() => {
    if (!seasonChallengeDef) return "—";
    const entry = seasonChallengeDef.entry;
    if (entry.kind !== "seasonVouchers") return formatEntry(entry);
    const pv = previewVoucherCost(
      casual.activities,
      { tournamentId: CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID },
      entry.amount
    );
    if (!pv.changed) return `${entry.amount} 赛季券`;
    return `${entry.amount}→${pv.effective} 赛季券`;
  }, [casual.activities, seasonChallengeDef]);

  const openHistory = () =>
    openModal({
      name: "tournament_history",
      effect: { name: "swipeBottom", args: { height: "100%" } },
    });

  const onJoinTournament = async (tournamentId: string) => {
    setJoiningId(tournamentId);
    try {
      const r = await casual.joinTournament(tournamentId);
      setNote(
        r?.ok ? "已入场，打开对局即可提交成绩。" : `加入失败：${(r as { error?: string })?.error ?? "未知错误"}`
      );
      await casual.refreshCasualPlayer();
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <CasualPageShell
      title="Play"
      titleId="casual-tab-play"
      rootRef={rootRef}
      visible={visible}
      showHeader={true}
    >
      {!casual.convexUrl ? (
        <div className="casual-play-tourney">
          <div className="casual-play-tourney__offline">
            配置 <code>VITE_CONVEX_URL_CASUAL</code> 后可同步锦标赛与专场。
          </div>
        </div>
      ) : (
        <div className="casual-play-tourney">
          <div className="casual-play-tourney__topActions">
            <button
              type="button"
              className="casual-play-tourney__spotBtn"
              aria-label="打开赛季任务"
              onClick={() => openPage({ uri: CASUAL_FOOTER_NAV_URI[1] })}
            >
              <span>
                赛季任务
                <small>赛季挑战与奖励</small>
              </span>
              <span className="casual-play-tourney__spotBtnChev" aria-hidden>
                ›
              </span>
            </button>
          </div>

          <header className="casual-play-tourney__hero">
            <div className="casual-play-tourney__heroTop">
              <div className="casual-play-tourney__titleBlock">
                <h1 className="casual-play-tourney__title">Tournaments</h1>
                <p className="casual-play-tourney__subtitle">同一挑战，比成绩 · PVE 异步锦标</p>
              </div>
              <button type="button" className="casual-play-tourney__history" onClick={openHistory}>
                历史
              </button>
            </div>
            <div className="casual-play-tourney__balances" aria-label="当前资产">
              {typeof coins === "number" ? (
                <span className="casual-play-tourney__chip">
                  金币 <b>{coins}</b>
                </span>
              ) : null}
              {typeof gems === "number" ? (
                <span className="casual-play-tourney__chip">
                  钻 <b>{gems}</b>
                </span>
              ) : null}
              {typeof vouchers === "number" ? (
                <span className="casual-play-tourney__chip">
                  赛季券 <b>{vouchers}</b>
                </span>
              ) : null}
            </div>
          </header>

          {note ? <div className="casual-play-tourney__toast" role="status">{note}</div> : null}

          <CasualActivityStrip activities={casual.activities} />

          <div className="casual-play-tourney__list" aria-label="锦标赛列表">
            {displayTournaments.length === 0 ? (
              <p className="casual-play-tourney__empty">暂无可用锦标赛，请稍后再试。</p>
            ) : (
              displayTournaments.map((t) => {
                const def = getTournamentDefinition(t.tournamentId);
                const entry = def?.entry;
                const voucherPreview =
                  entry?.kind === "seasonVouchers"
                    ? previewVoucherCost(casual.activities, { tournamentId: t.tournamentId }, entry.amount)
                    : { effective: 0, changed: false };
                const coinsPreview =
                  entry?.kind === "coins"
                    ? previewCoinsCost(casual.activities, { tournamentId: t.tournamentId }, entry.amount)
                    : { effective: 0, changed: false };
                const gemsPreview =
                  entry?.kind === "gems"
                    ? previewGemsCost(casual.activities, { tournamentId: t.tournamentId }, entry.amount)
                    : { effective: 0, changed: false };
                return (
                  <article key={t.tournamentId} className="casual-play-tourney__card">
                    <div className="casual-play-tourney__cardMain">
                      <span className={matchBadgeClass(t.matchType)}>{matchBadgeLabel(t.matchType)}</span>
                      <h2 className="casual-play-tourney__cardTitle">{t.title}</h2>
                      <p className="casual-play-tourney__cardGame">{gameLabel(t.gameId)} · 异步排行榜</p>
                    </div>
                    <div className="casual-play-tourney__cardEntry">Entry</div>
                    <div className="casual-play-tourney__cardEntryFee">
                      {entry?.kind === "seasonVouchers" && voucherPreview.changed ? (
                        <span className="casual-play-tourney__feeLine">
                          <span className="casual-play-tourney__feeStrike">{entry.amount}</span>
                          <span aria-hidden className="casual-play-tourney__feeArrow">
                            →
                          </span>
                          <span className="casual-play-tourney__feeNow">{voucherPreview.effective} 赛季券</span>
                        </span>
                      ) : entry?.kind === "coins" && coinsPreview.changed ? (
                        <span className="casual-play-tourney__feeLine">
                          <span className="casual-play-tourney__feeStrike">{entry.amount}</span>
                          <span aria-hidden className="casual-play-tourney__feeArrow">
                            →
                          </span>
                          <span className="casual-play-tourney__feeNow">{coinsPreview.effective} 金币</span>
                        </span>
                      ) : entry?.kind === "gems" && gemsPreview.changed ? (
                        <span className="casual-play-tourney__feeLine">
                          <span className="casual-play-tourney__feeStrike">{entry.amount}</span>
                          <span aria-hidden className="casual-play-tourney__feeArrow">
                            →
                          </span>
                          <span className="casual-play-tourney__feeNow">{gemsPreview.effective} 钻</span>
                        </span>
                      ) : (
                        formatEntry(entry)
                      )}
                    </div>
                    <div className="casual-play-tourney__cardPrize">
                      <span>奖池示意</span>
                      {formatPrizeLine(def, casual.activities, t.tournamentId)}
                    </div>
                    <button
                      type="button"
                      className="casual-play-tourney__enter"
                      disabled={joiningId === t.tournamentId}
                      aria-label={`加入 ${t.title}`}
                      onClick={() => void onJoinTournament(t.tournamentId)}
                    >
                      {joiningId === t.tournamentId ? "…" : "ENTER"}
                    </button>
                  </article>
                );
              })
            )}
          </div>

          <section className="casual-play-tourney__section" aria-labelledby="casual-play-season-challenge">
            <h2 id="casual-play-season-challenge" className="casual-play-tourney__sectionTitle">
              赛季专场
            </h2>
            <p className="casual-play-tourney__sectionHint">
              入场消耗赛季券；提交成绩按档位得挑战点与 Pass XP（见配表）。货架支持券、挑战点直购或点数解锁+钻石。
            </p>
            <div className="casual-play-tourney__seasonChallengeGrid">
              <button
                type="button"
                className="casual-play-tourney__spotBtn"
                disabled={joiningId === CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID}
                onClick={async () => {
                  setJoiningId(CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID);
                  try {
                    const r = await casual.joinTournament(CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID);
                    if (r?.ok) {
                      const actTitles = resolveActivityTitlesById(casual.activities, r.activityIds);
                      const actHint = actTitles.length ? `（活动：${actTitles.join("、")}）` : "";
                      setNote(
                        `专场已入场 · 本次扣 ${r.vouchersCharged ?? "—"} 券${actHint}；提交成绩后结算 Pass XP + 档位挑战点（S 档额外返券）`
                      );
                      openModal({
                        name: "play_block_blast",
                        data: { casualTournamentId: CASUAL_SEASON_CHALLENGE_BB_TOURNAMENT_ID },
                      });
                    } else {
                      setNote(`专场：${(r as { error?: string })?.error ?? "失败"}`);
                    }
                    await casual.refreshCasualPlayer();
                  } finally {
                    setJoiningId(null);
                  }
                }}
              >
                <span>
                  专场对局
                  <small>
                    {seasonChallengeEntryLabel} · Block Blast · 锦标入场模型
                  </small>
                </span>
                <span className="casual-play-tourney__spotBtnChev" aria-hidden>
                  ›
                </span>
              </button>
              {SEASON_SHELF_SKUS.map((sku) => (
                <button
                  key={sku.skuId}
                  type="button"
                  className="casual-play-tourney__spotBtn"
                  onClick={async () => {
                    const r = await casual.redeemSeasonShelfSku(sku.skuId);
                    const actTitles = r.ok ? resolveActivityTitlesById(casual.activities, r.activityIds) : [];
                    const chargeHint =
                      r.ok && sku.paymentMode === "voucher_only"
                        ? ` · 扣券 ${r.vouchersCharged ?? "—"}`
                        : "";
                    const actHint = actTitles.length ? ` · ${actTitles.join("、")}` : "";
                    setNote(
                      r.ok
                        ? `已兑换：${sku.title}${chargeHint}${actHint}`
                        : `兑换：${r.error ?? "失败"}`
                    );
                    await casual.refreshCasualPlayer();
                  }}
                >
                  <span>
                    {sku.title}
                    <small>
                      {sku.paymentMode === "voucher_only"
                        ? (() => {
                            const pv = previewVoucherCost(
                              casual.activities,
                              { skuId: sku.skuId },
                              sku.voucherCost
                            );
                            return pv.changed
                              ? `${sku.voucherCost}→${pv.effective} 赛季券（活动）`
                              : seasonShelfPriceHint(sku);
                          })()
                        : seasonShelfPriceHint(sku)}{" "}
                      · 每账号每 SKU 限 1 次（演示）
                    </small>
                  </span>
                  <span className="casual-play-tourney__spotBtnChev" aria-hidden>
                    ›
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="casual-play-tourney__section" aria-labelledby="casual-play-practice">
            <h2 id="casual-play-practice" className="casual-play-tourney__sectionTitle">
              练习
            </h2>
            <button
              type="button"
              className="casual-play-tourney__practice"
              onClick={() =>
                openModal({
                  name: "play_block_blast",
                  data: { casualTournamentId: DEFAULT_CASUAL_TOURNAMENT_ID },
                })
              }
            >
              <span>
                <strong>Free Play</strong>
                <span>无门票练习；若已配置锦标，成绩可同步至默认异步赛。</span>
              </span>
              <span className="casual-play-tourney__practicePlay">Play</span>
            </button>
          </section>
        </div>
      )}
    </CasualPageShell>
  );
};

export default CasualPlayTab;
