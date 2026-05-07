import {
  SEASON_SHELF_SKUS,
  seasonShelfPriceHint,
  type SeasonShelfSku,
} from "@/convex/casualPlatform/convex/data/casualSeasonShelfCatalog";
import { PageProp } from "host/RenderApp";
import { usePageManager } from "host/service/PageManager";
import { useUserManager } from "host/service/UserManager";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { CASUAL_FOOTER_NAV_URI } from "../../control/FooterNavCasual";
import {
  getMockCasualShopPromotionActivities,
  shouldUseMockCasualActivities,
} from "../../service/casualActivityMock";
import type { CasualActivityPublicRow } from "../../service/casualActivityTypes";
import { useCasualPlatform } from "../../service/useCasualPlatformManager";
import "../shared/casualEconomyPages.css";
import {
  formatActivityEffectChips,
  listActivitiesMatchingShelfRedeem,
  listActivitiesMatchingShopPurchase,
  previewCoinsCost,
  previewGemsCost,
  previewIapGrantGems,
  previewVoucherCost,
  resolveActivityTitlesById,
} from "../shared/casualActivityUi";
import { shopErrorMessage } from "../shared/casualEconomyUi";
import {
  createInitialShopWallet,
  MOCK_SHOP_SKUS,
  type CasualShopSkuRow,
} from "./casualShopMock";
import CasualPageShell from "../shell/CasualPageShell";

const SHOP_TITLE_ZH: Record<string, string> = {
  shop_coin_tier_1: "金币补给 · 小",
  shop_coin_tier_2: "金币补给 · 中",
  shop_coin_tier_3: "金币补给 · 大",
  iap_gem_tier_1: "钻石 · 入门档",
  iap_gem_tier_2: "钻石 · 进阶档",
  iap_gem_tier_3: "钻石 · 尊享档",
};

function displayTitle(skuId: string, serverTitle: string): string {
  return SHOP_TITLE_ZH[skuId] ?? serverTitle;
}

function skuEmoji(skuId: string): string {
  if (skuId.includes("combo")) return "🎁";
  if (skuId.includes("coin")) return "🪙";
  if (skuId.includes("gem")) return "💎";
  return "🛒";
}

function seasonShelfEmoji(skuId: string): string {
  if (skuId.includes("memorial")) return "📦";
  if (skuId.includes("supply")) return "🧰";
  if (skuId.includes("title")) return "🏅";
  return "✨";
}

function shelfRedeemErrorMessage(code: string | undefined): string {
  switch (code) {
    case "insufficient_vouchers":
      return "赛季券不足";
    case "insufficient_challenge_points":
      return "挑战点不足";
    case "insufficient_unlock_points":
      return "挑战点未达解锁门槛";
    case "insufficient_gems":
      return "钻石不足";
    case "already_redeemed":
      return "本赛季已兑换过";
    case "unknown_sku":
      return "商品不存在";
    case "no_player":
      return "未找到玩家档案";
    case "no_auth":
      return "请先登录";
    case "redeem_failed":
      return "兑换失败，请重试";
    default:
      return code ? `兑换：${code}` : "兑换失败";
  }
}

function seasonShelfGrantHint(sku: SeasonShelfSku): string {
  return sku.chestId ? `开启固定箱 · ${sku.chestId}` : "即时到账";
}

function seasonShelfAffordable(
  sku: SeasonShelfSku,
  balances: { vouchers: number; challengePts: number; gems: number },
  effectiveVoucherCost?: number,
  effectiveGemsCost?: number
): boolean {
  if (sku.paymentMode === "voucher_only") {
    const cost = effectiveVoucherCost ?? sku.voucherCost;
    return balances.vouchers >= cost;
  }
  if (sku.paymentMode === "challenge_points_only") {
    return balances.challengePts >= sku.challengePointsCost;
  }
  const gemsNeed = effectiveGemsCost ?? sku.priceGems;
  return balances.challengePts >= sku.unlockPointsRequired && balances.gems >= gemsNeed;
}

interface ShopViewModel {
  isLive: boolean;
  skus: CasualShopSkuRow[];
  coins: number;
  gems: number;
}

/** 商店 Tab：SKU 网格；无 Convex / 未登录 / 商品未加载时用静态预览 + 本地钱包 */
const CasualShopTab: React.FC<PageProp> = ({ visible }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const casual = useCasualPlatform();
  const { openPage } = usePageManager();
  const { user } = useUserManager();
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [busySku, setBusySku] = useState<string | null>(null);
  const [mockWallet, setMockWallet] = useState(createInitialShopWallet);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  /** 钻→币购买是否走后端；商品列表始终用下方 `MOCK_SHOP_SKUS` 静态六档 */
  const ordinaryShopPurchasesLive = Boolean(casual.convexUrl && user?.uid);

  const globalActivityCount = useMemo(
    () => casual.activities.filter((a) => a.target.type === "global").length,
    [casual.activities]
  );

  const seasonShelfRows = useMemo(
    () => (casual.seasonShelfSkus.length > 0 ? casual.seasonShelfSkus : SEASON_SHELF_SKUS),
    [casual.seasonShelfSkus]
  );

  const walletSeason = useMemo(
    () => ({
      vouchers: casual.casualPlayer?.seasonVouchers ?? 0,
      challengePts: casual.casualPlayer?.seasonChallengePoints ?? 0,
      gems: casual.casualPlayer?.gems ?? 0,
    }),
    [casual.casualPlayer]
  );

  const canRedeemSeasonShelf = Boolean(user?.uid && casual.convexUrl);

  const view: ShopViewModel = useMemo(() => {
    if (ordinaryShopPurchasesLive) {
      return {
        isLive: true,
        skus: MOCK_SHOP_SKUS,
        coins: casual.casualPlayer?.coins ?? 0,
        gems: casual.casualPlayer?.gems ?? 0,
      };
    }
    return {
      isLive: false,
      skus: MOCK_SHOP_SKUS,
      coins: mockWallet.coins,
      gems: mockWallet.gems,
    };
  }, [ordinaryShopPurchasesLive, casual.casualPlayer, mockWallet]);

  /** 静态商店 SKU 始终合并演示促销；全量 Mock 模式则用 casual.activities */
  const activitiesForOrdinaryShop = useMemo(() => {
    if (shouldUseMockCasualActivities()) return casual.activities;
    const shopMock = getMockCasualShopPromotionActivities();
    const byId = new Map<string, CasualActivityPublicRow>();
    for (const a of shopMock) byId.set(a.activityId, a);
    for (const a of casual.activities) byId.set(a.activityId, a);
    return [...byId.values()];
  }, [casual.activities]);

  const virtualShopSkus = useMemo(
    () => view.skus.filter((s) => (s.skuKind ?? "virtual") !== "iap"),
    [view.skus]
  );
  const iapShopSkus = useMemo(() => view.skus.filter((s) => s.skuKind === "iap"), [view.skus]);

  const shopSkuPriceDisplay = (sku: CasualShopSkuRow) => {
    const acts = activitiesForOrdinaryShop;
    if (sku.skuKind === "iap") {
      const base = sku.grantGems ?? 0;
      const label = sku.iapPriceLabel ?? "法币";
      if (base <= 0) return { line: label, hasPromo: false };
      const p = previewIapGrantGems(acts, { shopSkuId: sku.skuId }, base);
      if (p.changed) {
        return {
          line: `${label} · 到账 ${base}→${p.effective} 钻（活动）`,
          hasPromo: true,
        };
      }
      return { line: `${label} · 到账 ${base} 钻`, hasPromo: false };
    }
    const ctx = { shopSkuId: sku.skuId };
    let hasPromo = false;
    const parts: string[] = [];
    if (sku.priceCoins != null) {
      const p = previewCoinsCost(acts, ctx, sku.priceCoins);
      if (p.changed) hasPromo = true;
      parts.push(p.changed ? `${sku.priceCoins}→${p.effective} 金币（活动）` : `${sku.priceCoins} 金币`);
    }
    if (sku.priceGems != null) {
      const p = previewGemsCost(acts, ctx, sku.priceGems);
      if (p.changed) hasPromo = true;
      parts.push(p.changed ? `${sku.priceGems}→${p.effective} 钻（活动）` : `${sku.priceGems} 钻`);
    }
    return { line: parts.length ? parts.join(" · ") : "免费", hasPromo };
  };

  const shopSkuCanAfford = (sku: CasualShopSkuRow) => {
    if (sku.skuKind === "iap") return true;
    const acts = activitiesForOrdinaryShop;
    const ctx = { shopSkuId: sku.skuId };
    if (sku.priceCoins != null) {
      const eff = previewCoinsCost(acts, ctx, sku.priceCoins).effective;
      if (view.coins < eff) return false;
    }
    if (sku.priceGems != null) {
      const eff = previewGemsCost(acts, ctx, sku.priceGems).effective;
      if (view.gems < eff) return false;
    }
    return true;
  };

  const grantLine = (sku: CasualShopSkuRow) => {
    if (sku.skuKind === "iap" && (sku.grantGems ?? 0) > 0) {
      const p = previewIapGrantGems(activitiesForOrdinaryShop, { shopSkuId: sku.skuId }, sku.grantGems!);
      return p.changed
        ? `活动到账 ${p.effective} 钻（基准 ${sku.grantGems}）`
        : `到账 ${sku.grantGems} 钻`;
    }
    const parts: string[] = [];
    if (sku.grantCoins && sku.grantCoins > 0) parts.push(`金币 +${sku.grantCoins}`);
    if (sku.grantGems && sku.grantGems > 0) parts.push(`钻 +${sku.grantGems}`);
    return parts.length ? `获得 ${parts.join("，")}` : "即时到账";
  };

  const mockBannerText = !casual.convexUrl
    ? "未配置休闲后端：普通商店为静态六档演示，购买仅更新本页预览钱包。"
    : !user?.uid
      ? "未登录：普通商店仍为静态六档演示；登录后可使用真实余额购买钻→币（需后端配置同名 skuId）。"
      : "";

  return (
    <CasualPageShell
      title="商店"
      titleId="casual-tab-shop"
      rootRef={rootRef}
      visible={visible}
      showHeader
    >
      <div className="casual-econ">
        {toast ? (
          <div
            className={`casual-econ__toast${toast.ok ? "" : " casual-econ__toast--err"}`}
            role="status"
          >
            {toast.text}
          </div>
        ) : null}

        {ordinaryShopPurchasesLive && globalActivityCount > 0 ? (
          <div className="casual-econ__activityBanner" role="note">
            当前有 <b>{globalActivityCount}</b> 项<strong>全局</strong>
            限时活动；商店原价仍以卡片为准，赛季券/Pass 等相关折扣请查看 Play 与赛季专场。
          </div>
        ) : null}

        <section className="casual-shop__seasonSection" aria-labelledby="casual-shop-season-shelf">
          <div className="casual-shop__seasonHead">
            <div>
              <h2 id="casual-shop-season-shelf" className="casual-shop__seasonTitle">
                赛季专属
              </h2>
              <p className="casual-shop__seasonHint">
                纪念箱 / 补给 / 解锁礼包等与 Play「赛季专场」同源；每张卡下方列出<strong>与本 SKU 同时命中</strong>
                的限时活动（与后端扣券上下文一致）。券价预览以服务端为准。每账号每 SKU 限兑 1 次。
              </p>
            </div>
            <button
              type="button"
              className="casual-econ__textBtn"
              onClick={() => openPage({ uri: CASUAL_FOOTER_NAV_URI[2] })}
            >
              去 Play
            </button>
          </div>
          {casual.casualPlayer ? (
            <div className="casual-shop__seasonWallet" aria-label="赛季资产">
              <span>
                赛季券 <b>{walletSeason.vouchers}</b>
              </span>
              <span>
                挑战点 <b>{walletSeason.challengePts}</b>
              </span>
              <span>
                钻 <b>{walletSeason.gems}</b>
              </span>
            </div>
          ) : null}
          <div className="casual-shop__grid casual-shop__grid--season">
            {seasonShelfRows.map((sku) => {
              const shelfMatchedActs = listActivitiesMatchingShelfRedeem(casual.activities, sku.skuId);
              let effectiveVoucher: number | undefined;
              let effectiveGems: number | undefined;
              let priceLabel = seasonShelfPriceHint(sku);
              let voucherPromo = false;
              let gemsPromo = false;
              if (sku.paymentMode === "voucher_only") {
                const pv = previewVoucherCost(casual.activities, { skuId: sku.skuId }, sku.voucherCost);
                effectiveVoucher = pv.effective;
                voucherPromo = pv.changed;
                priceLabel = pv.changed
                  ? `${sku.voucherCost}→${pv.effective} 赛季券（活动）`
                  : seasonShelfPriceHint(sku);
              } else if (sku.paymentMode === "unlock_points_and_gems") {
                const pg = previewGemsCost(casual.activities, { skuId: sku.skuId }, sku.priceGems);
                effectiveGems = pg.effective;
                gemsPromo = pg.changed;
                priceLabel = pg.changed
                  ? `持有≥${sku.unlockPointsRequired} 挑战点 · ${sku.priceGems}→${pg.effective} 钻（活动）`
                  : seasonShelfPriceHint(sku);
              }
              const affordable = seasonShelfAffordable(sku, walletSeason, effectiveVoucher, effectiveGems);
              const loading = busySku === sku.skuId;
              const canGo = canRedeemSeasonShelf && affordable;
              let btnLabel = "兑换";
              if (!canRedeemSeasonShelf) {
                btnLabel = casual.convexUrl ? "请先登录" : "需配置后端";
              } else if (!affordable) {
                btnLabel = "条件不足";
              }
              return (
                <article
                  key={sku.skuId}
                  className={`casual-shop__card casual-shop__card--season${voucherPromo || gemsPromo ? " casual-shop__card--seasonVoucherPromo" : ""}`}
                >
                  <div className="casual-shop__cardIcon" aria-hidden>
                    {seasonShelfEmoji(sku.skuId)}
                  </div>
                  <h3 className="casual-shop__cardTitle">{sku.title}</h3>
                  <div className="casual-shop__price">
                    <span className="casual-shop__priceTag">{priceLabel}</span>
                  </div>
                  {shelfMatchedActs.length > 0 ? (
                    <div className="casual-shop__seasonActBox" role="group" aria-label="与本货架相关的限时活动">
                      <div className="casual-shop__seasonActLabel">活动关联 · {shelfMatchedActs.length}</div>
                      <ul className="casual-shop__seasonActList">
                        {shelfMatchedActs.map((a) => {
                          const fxChips = formatActivityEffectChips(a);
                          return (
                            <li key={a.activityId} className="casual-shop__seasonActRow">
                              <span className="casual-shop__seasonActTitle">{a.title}</span>
                              {fxChips.length > 0 ? (
                                <span className="casual-shop__seasonActFx">{fxChips.join(" · ")}</span>
                              ) : (
                                <span className="casual-shop__seasonActFx casual-shop__seasonActFx--muted">
                                  计入兑换上下文（无数值摘要）
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                  <p className="casual-shop__grant">{seasonShelfGrantHint(sku)}</p>
                  <button
                    type="button"
                    className={`casual-shop__buy${loading ? " casual-shop__buy--busy" : ""}`}
                    disabled={loading || !canGo}
                    onClick={async () => {
                      if (!canRedeemSeasonShelf || !affordable) return;
                      setBusySku(sku.skuId);
                      try {
                        const r = await casual.redeemSeasonShelfSku(sku.skuId);
                        const actTitles = r.ok ? resolveActivityTitlesById(casual.activities, r.activityIds) : [];
                        const chargeHint =
                          r.ok && sku.paymentMode === "voucher_only"
                            ? ` · 扣券 ${r.vouchersCharged ?? "—"}`
                            : r.ok && sku.paymentMode === "challenge_points_only"
                              ? ` · 扣点 ${r.challengePointsCharged ?? "—"}`
                              : r.ok && sku.paymentMode === "unlock_points_and_gems"
                                ? ` · 扣钻 ${r.gemsCharged ?? "—"}`
                                : "";
                        const actHint = actTitles.length ? ` · ${actTitles.join("、")}` : "";
                        setToast(
                          r.ok
                            ? { ok: true, text: `已兑换「${sku.title}」${chargeHint}${actHint}` }
                            : { ok: false, text: shelfRedeemErrorMessage(r.error) }
                        );
                        await casual.refreshCasualPlayer();
                      } finally {
                        setBusySku(null);
                      }
                    }}
                  >
                    {loading ? "处理中…" : btnLabel}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        {!view.isLive ? (
          <>
            <div className="casual-econ__mockBanner" role="note">
              {mockBannerText}
            </div>
            <div className="casual-shop__previewWallet" aria-label="预览钱包">
              <span>预览钱包</span>
              <span>币 {view.coins}</span>
              <span>钻 {view.gems}</span>
              <span style={{ opacity: 0.75, fontSize: 12, fontWeight: 500 }}>
                顶栏货币为实账户（若有），与预览独立
              </span>
            </div>
          </>
        ) : (
          <div className="casual-econ__mockBanner" role="note" style={{ marginBottom: 12 }}>
            普通商店展示<strong>静态六档</strong>（钻→币 ×3、法币→钻 ×3）；钻→币购买将请求后端{" "}
            <code style={{ fontSize: 12 }}>purchaseSku</code>（skuId 须与表一致）。法币档位仍走收银台接入流程。
          </div>
        )}

        <h2 className="casual-econ__sectionTitle">钻石换金币</h2>
        <p className="casual-econ__sectionHint">
          三档静态演示（钻石→金币）；价格可被商店定向活动修正。不设「金币买金币」。
        </p>

        <div className="casual-econ__linkRow">
          <span style={{ fontSize: 13, color: "var(--econ-muted, rgba(26,26,46,0.55))" }}>
            赛季通行证领奖在「奖励」
          </span>
          <button
            type="button"
            className="casual-econ__textBtn"
            onClick={() => openPage({ uri: "/casual/lobby/c4" })}
          >
            去奖励
          </button>
        </div>

        <div className="casual-shop__grid">
          {virtualShopSkus.map((sku, index) => {
            const shopMatchedActs = listActivitiesMatchingShopPurchase(activitiesForOrdinaryShop, sku.skuId);
            const { line: priceTagLine, hasPromo: pricePromo } = shopSkuPriceDisplay(sku);
            const affordable = shopSkuCanAfford(sku);
            const loading = busySku === sku.skuId;
            const hot = !view.isLive && index === 0;
            return (
              <article
                key={sku.skuId}
                className={`casual-shop__card${hot ? " casual-shop__card--hot" : ""}${pricePromo ? " casual-shop__card--seasonVoucherPromo" : ""}`}
              >
                {hot ? (
                  <div className="casual-shop__ribbon" aria-hidden>
                    推荐
                  </div>
                ) : null}
                <div className="casual-shop__cardIcon" aria-hidden>
                  {skuEmoji(sku.skuId)}
                </div>
                <h3 className="casual-shop__cardTitle">{displayTitle(sku.skuId, sku.title)}</h3>
                <div className="casual-shop__price">
                  <span className="casual-shop__priceTag">{priceTagLine}</span>
                </div>
                {shopMatchedActs.length > 0 ? (
                  <div className="casual-shop__seasonActBox" role="group" aria-label="与本商品相关的限时活动">
                    <div className="casual-shop__seasonActLabel">活动关联 · {shopMatchedActs.length}</div>
                    <ul className="casual-shop__seasonActList">
                      {shopMatchedActs.map((a) => {
                        const fxChips = formatActivityEffectChips(a);
                        return (
                          <li key={a.activityId} className="casual-shop__seasonActRow">
                            <span className="casual-shop__seasonActTitle">{a.title}</span>
                            {fxChips.length > 0 ? (
                              <span className="casual-shop__seasonActFx">{fxChips.join(" · ")}</span>
                            ) : (
                              <span className="casual-shop__seasonActFx casual-shop__seasonActFx--muted">
                                计入购买上下文（无数值摘要）
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                <p className="casual-shop__grant">{grantLine(sku)}</p>
                <button
                  type="button"
                  className={`casual-shop__buy${loading ? " casual-shop__buy--busy" : ""}`}
                  disabled={!affordable || loading}
                  onClick={async () => {
                    setBusySku(sku.skuId);
                    try {
                      if (view.isLive) {
                        const r = await casual.purchaseShopSku(sku.skuId);
                        if (r.ok) {
                          const actTitles = resolveActivityTitlesById(
                            activitiesForOrdinaryShop,
                            r.activityIds
                          );
                          const actHint = actTitles.length ? ` · ${actTitles.join("、")}` : "";
                          setToast({ ok: true, text: `购买成功，货币已更新。${actHint}` });
                        } else {
                          setToast({ ok: false, text: shopErrorMessage(r.error) });
                        }
                        await casual.refreshCasualPlayer();
                      } else {
                        if (!affordable) return;
                        const ctx = { shopSkuId: sku.skuId };
                        const acts = activitiesForOrdinaryShop;
                        setMockWallet((w) => {
                          let c = w.coins;
                          let g = w.gems;
                          if (sku.priceCoins != null) {
                            c -= previewCoinsCost(acts, ctx, sku.priceCoins).effective;
                          }
                          if (sku.priceGems != null) {
                            g -= previewGemsCost(acts, ctx, sku.priceGems).effective;
                          }
                          if (sku.grantCoins && sku.grantCoins > 0) c += sku.grantCoins;
                          if (sku.grantGems && sku.grantGems > 0) g += sku.grantGems;
                          return { coins: Math.max(0, c), gems: Math.max(0, g) };
                        });
                        setToast({
                          ok: true,
                          text: `预览：已购买「${displayTitle(sku.skuId, sku.title)}」（仅本页钱包演示）`,
                        });
                      }
                    } finally {
                      setBusySku(null);
                    }
                  }}
                >
                  {loading ? "处理中…" : affordable ? "购买" : "货币不足"}
                </button>
              </article>
            );
          })}
        </div>

        <h2 className="casual-econ__sectionTitle" style={{ marginTop: 28 }}>
          钻石充值（法币）
        </h2>
        <p className="casual-econ__sectionHint">
          三档静态演示（法币→钻）：标价 + 到账钻数；活动可通过 <code style={{ fontSize: 12 }}>iapGrantGemsMultiplier</code> /{" "}
          <code style={{ fontSize: 12 }}>iapGrantGemsDelta</code> 修正到账（与{" "}
          <code style={{ fontSize: 12 }}>fulfillIapShopPurchase</code> 一致）。生产环境须由支付回调带唯一{" "}
          <code style={{ fontSize: 12 }}>paymentRef</code> 调用发货。
        </p>

        <div className="casual-shop__grid">
          {iapShopSkus.map((sku) => {
            const shopMatchedActs = listActivitiesMatchingShopPurchase(activitiesForOrdinaryShop, sku.skuId).filter(
              (a) => {
                if (a.target.type !== "casual_shop_sku") return true;
                const boundSku =
                  "shopSkuId" in a.target && a.target.shopSkuId != null && a.target.shopSkuId !== "";
                if (boundSku) return true;
                const fx = a.effects;
                const touchesIapGrant =
                  fx.iapGrantGemsMultiplier != null || fx.iapGrantGemsDelta != null;
                if (touchesIapGrant) return true;
                const onlySoftGemPrice =
                  (fx.gemsCostMultiplier != null || fx.gemsCostDelta != null) &&
                  fx.coinsCostMultiplier == null &&
                  fx.coinsCostDelta == null;
                return !onlySoftGemPrice;
              }
            );
            const { line: priceTagLine, hasPromo: iapPricePromo } = shopSkuPriceDisplay(sku);
            const loading = busySku === sku.skuId;
            return (
              <article
                key={sku.skuId}
                className={`casual-shop__card casual-shop__card--iapShelf${iapPricePromo ? " casual-shop__card--seasonVoucherPromo" : ""}`}
              >
                <div className="casual-shop__cardIcon" aria-hidden>
                  {skuEmoji(sku.skuId)}
                </div>
                <h3 className="casual-shop__cardTitle">{displayTitle(sku.skuId, sku.title)}</h3>
                <div className="casual-shop__price">
                  <span className="casual-shop__priceTag">{priceTagLine}</span>
                </div>
                {shopMatchedActs.length > 0 ? (
                  <div className="casual-shop__seasonActBox" role="group" aria-label="与本商品相关的限时活动">
                    <div className="casual-shop__seasonActLabel">活动关联 · {shopMatchedActs.length}</div>
                    <ul className="casual-shop__seasonActList">
                      {shopMatchedActs.map((a) => {
                        const fxChips = formatActivityEffectChips(a);
                        return (
                          <li key={a.activityId} className="casual-shop__seasonActRow">
                            <span className="casual-shop__seasonActTitle">{a.title}</span>
                            {fxChips.length > 0 ? (
                              <span className="casual-shop__seasonActFx">{fxChips.join(" · ")}</span>
                            ) : (
                              <span className="casual-shop__seasonActFx casual-shop__seasonActFx--muted">
                                运营文案 / 支付页加赠（无数值摘要）
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                <p className="casual-shop__grant">{grantLine(sku)}</p>
                <button
                  type="button"
                  className={`casual-shop__buy${loading ? " casual-shop__buy--busy" : ""}`}
                  disabled={loading}
                  onClick={async () => {
                    setBusySku(sku.skuId);
                    try {
                      if (view.isLive) {
                        if (import.meta.env.DEV) {
                          const paymentRef = `dev_iap_${sku.skuId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
                          const r = await casual.fulfillIapShopPurchase(sku.skuId, paymentRef);
                          if (r.ok) {
                            const titles = resolveActivityTitlesById(
                              activitiesForOrdinaryShop,
                              r.activityIds
                            );
                            const actHint = titles.length ? ` · ${titles.join("、")}` : "";
                            setToast({
                              ok: true,
                              text: `开发：IAP 已发放 +${r.gemsGranted ?? 0} 钻（基准 ${r.baseGems ?? "—"}）${actHint}`,
                            });
                          } else {
                            setToast({ ok: false, text: shopErrorMessage(r.error) });
                          }
                          await casual.refreshCasualPlayer();
                        } else {
                          setToast({
                            ok: false,
                            text: shopErrorMessage("iap_use_payment_provider"),
                          });
                        }
                      } else {
                        const base = sku.grantGems ?? 0;
                        const grant =
                          base > 0
                            ? previewIapGrantGems(activitiesForOrdinaryShop, { shopSkuId: sku.skuId }, base).effective
                            : 0;
                        if (grant > 0) {
                          setMockWallet((w) => ({ ...w, gems: w.gems + grant }));
                        }
                        setToast({
                          ok: true,
                          text: `预览：已模拟 IAP「${displayTitle(sku.skuId, sku.title)}」到账 +${grant} 钻（含活动加赠预览）`,
                        });
                      }
                    } finally {
                      setBusySku(null);
                    }
                  }}
                >
                  {loading ? "处理中…" : view.isLive ? (import.meta.env.DEV ? "开发发放" : "法币购买") : "模拟到账"}
                </button>
              </article>
            );
          })}
        </div>

        {!view.isLive ? (
          <details className="casual-rewards__dev" style={{ marginTop: 18 }}>
            <summary>预览模式选项</summary>
            <div className="casual-rewards__devRow">
              <button
                type="button"
                className="casual-rewards__devBtn"
                onClick={() => {
                  setMockWallet((w) => ({ ...w, coins: w.coins + 2000 }));
                  setToast({ ok: true, text: "预览：金币 +2000" });
                }}
              >
                +2000 金币
              </button>
              <button
                type="button"
                className="casual-rewards__devBtn"
                onClick={() => {
                  setMockWallet((w) => ({ ...w, gems: w.gems + 40 }));
                  setToast({ ok: true, text: "预览：钻石 +40" });
                }}
              >
                +40 钻
              </button>
              <button
                type="button"
                className="casual-rewards__devBtn"
                onClick={() => setMockWallet(createInitialShopWallet())}
              >
                重置预览钱包
              </button>
            </div>
          </details>
        ) : null}
      </div>
    </CasualPageShell>
  );
};

export default CasualShopTab;
