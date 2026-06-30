import i18n from "@/i18n";

import type { Doc } from "../../_generated/dataModel";

import { isValidTelCtaUrl, normalizeTelCtaUrl } from "../shared/displayCtaUrl";

import { formatCampaignRewardLabel } from "../shared/campaignRewardDisplay";

export type CampaignRewardModel = "pass_per_run" | "competitive_leaderboard";

export type CampaignPassRewardKind = "solo_p75_success" | "score_threshold";

export type CampaignRankRewardTier = {
  rankFrom: string;
  rankTo: string;
  couponDefId: string;
};

export type MerchantCouponDefOption = {
  couponDefId: string;
  name: string;
  status: string;
  reward: Doc<"merchant_coupon_defs">["reward"];
};

export type CampaignExperienceType = "game" | "display";

export type DisplayCtaKind = "none" | "external_url" | "tel" | "maps";

export type CampaignFormState = {
  experienceType: CampaignExperienceType;
  title: string;
  slug: string;
  rulesText: string;
  startsAtLocal: string;
  endsAtLocal: string;
  highlightText: string;
  ctaKind: DisplayCtaKind;
  ctaLabel: string;
  ctaUrl: string;
  gameType: string;
  mode: "solo" | "multi";
  rewardModel: CampaignRewardModel;
  rewardKind: CampaignPassRewardKind;
  minScore: string;
  topN: string;
  couponDefId: string;
  rankRewardTiers: CampaignRankRewardTier[];
  maxCouponsPerPlayer: string;
  maxPlaysPerDay: string;
  dayTimezone: string;
};

export const CAMPAIGN_DAY_TIMEZONE_OPTIONS = [
  { value: "Asia/Shanghai", labelKey: "timezone.Asia/Shanghai" },
  { value: "Asia/Hong_Kong", labelKey: "timezone.Asia/Hong_Kong" },
  { value: "Asia/Tokyo", labelKey: "timezone.Asia/Tokyo" },
  { value: "Asia/Singapore", labelKey: "timezone.Asia/Singapore" },
  { value: "America/Los_Angeles", labelKey: "timezone.America/Los_Angeles" },
  { value: "America/New_York", labelKey: "timezone.America/New_York" },
  { value: "Europe/London", labelKey: "timezone.Europe/London" },
  { value: "UTC", labelKey: "timezone.UTC" },
] as const;

export function campaignTimezoneLabel(value: string): string {
  const hit = CAMPAIGN_DAY_TIMEZONE_OPTIONS.find((opt) => opt.value === value);
  return hit ? i18n.t(hit.labelKey, { ns: "campaign.merchant" }) : value;
}

export const DEFAULT_CAMPAIGN_DAY_TIMEZONE = "Asia/Shanghai";

export const PORTAL_GAME_OPTIONS = [
  { value: "block_blast", label: "Block Blast" },
  { value: "match_3", label: "Match-3" },
  { value: "solitaire", label: "Solitaire" },
  { value: "tower_arena", label: "Tower Arena" },
  { value: "yatz", label: "Yatz" },
] as const;

export function msToDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToMs(value: string): number {
  return new Date(value).getTime();
}

function rankRuleBoundsFromDoc(rule: {
  rankFrom?: number;
  rankTo?: number;
  topN?: number;
}): { from: number; to: number } {
  if (
    typeof rule.rankFrom === "number" &&
    typeof rule.rankTo === "number" &&
    rule.rankFrom >= 1 &&
    rule.rankTo >= rule.rankFrom
  ) {
    return { from: rule.rankFrom, to: rule.rankTo };
  }
  const topN = Math.max(1, rule.topN ?? 1);
  return { from: 1, to: topN };
}

export function defaultRankRewardTier(couponDefId = ""): CampaignRankRewardTier {
  return { rankFrom: "1", rankTo: "1", couponDefId };
}

export function defaultRankRewardTiers(couponDefId = ""): CampaignRankRewardTier[] {
  return [
    { rankFrom: "1", rankTo: "1", couponDefId },
    { rankFrom: "2", rankTo: "3", couponDefId },
  ];
}

export function defaultCampaignForm(now = Date.now()): CampaignFormState {
  return {
    experienceType: "game",
    title: "",
    slug: "",
    rulesText: "",
    startsAtLocal: msToDatetimeLocal(now),
    endsAtLocal: msToDatetimeLocal(now + 30 * 24 * 3600 * 1000),
    highlightText: "",
    ctaKind: "none",
    ctaLabel: "",
    ctaUrl: "",
    gameType: "block_blast",
    mode: "solo",
    rewardModel: "pass_per_run",
    rewardKind: "solo_p75_success",
    minScore: "5000",
    topN: "3",
    couponDefId: "",
    rankRewardTiers: defaultRankRewardTiers(),
    maxCouponsPerPlayer: "1",
    maxPlaysPerDay: "",
    dayTimezone: DEFAULT_CAMPAIGN_DAY_TIMEZONE,
  };
}

export function defaultDisplayCampaignForm(now = Date.now()): CampaignFormState {
  return {
    ...defaultCampaignForm(now),
    experienceType: "display",
    ctaKind: "none",
  };
}

function inferRewardModel(campaign: Doc<"merchant_campaigns">): CampaignRewardModel {
  if (
    campaign.rewardModel === "pass_per_run" ||
    campaign.rewardModel === "competitive_leaderboard"
  ) {
    return campaign.rewardModel;
  }
  const hasLeaderboardRule = campaign.rewardRules.some(
    (r) => r.kind === "campaign_leaderboard_rank_top_n" || r.kind === "multi_rank_top_n"
  );
  if (hasLeaderboardRule || campaign.mode === "multi") {
    return "competitive_leaderboard";
  }
  return "pass_per_run";
}

export function campaignFormFromDoc(campaign: Doc<"merchant_campaigns">): CampaignFormState {
  const experienceType =
    campaign.experienceType === "display" ? ("display" as const) : ("game" as const);

  if (experienceType === "display") {
    const cta = campaign.displayConfig?.cta;
    return {
      experienceType: "display",
      title: campaign.title,
      slug: campaign.slug,
      rulesText: campaign.rulesText ?? "",
      startsAtLocal: msToDatetimeLocal(campaign.startsAt),
      endsAtLocal: msToDatetimeLocal(campaign.endsAt),
      highlightText: campaign.displayConfig?.highlightText ?? "",
      ctaKind: cta?.kind ?? "none",
      ctaLabel: cta?.label ?? "",
      ctaUrl: cta?.url ?? "",
      gameType: campaign.gameType,
      mode: campaign.mode,
      rewardModel: "pass_per_run",
      rewardKind: "solo_p75_success",
      minScore: "5000",
      topN: "3",
      couponDefId: "",
      rankRewardTiers: defaultRankRewardTiers(),
      maxCouponsPerPlayer: "0",
      maxPlaysPerDay: "",
      dayTimezone: DEFAULT_CAMPAIGN_DAY_TIMEZONE,
    };
  }

  const rewardModel = inferRewardModel(campaign);
  const passRule = campaign.rewardRules.find(
    (r) => r.kind === "solo_p75_success" || r.kind === "score_threshold"
  );
  const leaderboardRules = campaign.rewardRules.filter(
    (r) => r.kind === "campaign_leaderboard_rank_top_n" || r.kind === "multi_rank_top_n"
  );

  let rewardKind: CampaignPassRewardKind = "solo_p75_success";
  if (passRule?.kind === "score_threshold") {
    rewardKind = "score_threshold";
  }

  const rankRewardTiers =
    leaderboardRules.length > 0
      ? leaderboardRules.map((rule) => {
          const bounds = rankRuleBoundsFromDoc(rule);
          return {
            rankFrom: String(bounds.from),
            rankTo: String(bounds.to),
            couponDefId: rule.couponDefId ?? "",
          };
        })
      : defaultRankRewardTiers(passRule?.couponDefId ?? "");

  const firstLeaderboard = leaderboardRules[0];
  const legacyTopN = firstLeaderboard ? rankRuleBoundsFromDoc(firstLeaderboard).to : 3;

  return {
    experienceType: "game",
    title: campaign.title,
    slug: campaign.slug,
    rulesText: campaign.rulesText ?? "",
    startsAtLocal: msToDatetimeLocal(campaign.startsAt),
    endsAtLocal: msToDatetimeLocal(campaign.endsAt),
    highlightText: "",
    ctaKind: "none",
    ctaLabel: "",
    ctaUrl: "",
    gameType: campaign.gameType,
    mode: campaign.mode,
    rewardModel,
    rewardKind,
    minScore: String(passRule?.minScore ?? 5000),
    topN: String(legacyTopN),
    couponDefId: passRule?.couponDefId ?? rankRewardTiers[0]?.couponDefId ?? "",
    rankRewardTiers,
    maxCouponsPerPlayer: String(campaign.playLimits.maxCouponsPerPlayer),
    maxPlaysPerDay:
      campaign.playLimits.maxPlaysPerDay != null
        ? String(campaign.playLimits.maxPlaysPerDay)
        : "",
    dayTimezone: campaign.playLimits.dayTimezone ?? DEFAULT_CAMPAIGN_DAY_TIMEZONE,
  };
}

export function couponDefLabel(def: MerchantCouponDefOption | undefined): string {
  const fallback = i18n.t("rewardLabel.default", { ns: "campaign.merchant" });
  if (!def) return fallback;
  return `${def.name} · ${formatCampaignRewardLabel(def.reward)}`;
}

function resolveCouponDefReward(
  couponDefId: string,
  couponDefs: MerchantCouponDefOption[]
): Doc<"merchant_campaigns">["rewardRules"][number]["reward"] {
  const fallbackLabel = i18n.t("rewardLabel.default", { ns: "campaign.merchant" });
  const def = couponDefs.find((d) => d.couponDefId === couponDefId);
  return (
    def?.reward ??
    ({
      type: "free_item" as const,
      itemLabel: fallbackLabel,
      displayText: fallbackLabel,
    } satisfies Doc<"merchant_campaigns">["rewardRules"][number]["reward"])
  );
}

export function buildDisplayConfigFromForm(
  form: CampaignFormState
): Doc<"merchant_campaigns">["displayConfig"] {
  const kind = form.ctaKind;
  const highlightText = form.highlightText.trim();
  if (kind === "none") {
    return highlightText ? { highlightText } : undefined;
  }
  const label = form.ctaLabel.trim();
  const url = form.ctaUrl.trim();
  if (!label || !url) {
    return highlightText ? { highlightText } : undefined;
  }
  const resolvedUrl = kind === "tel" ? normalizeTelCtaUrl(url) : url;
  return {
    highlightText: highlightText || undefined,
    cta: { kind, label, url: resolvedUrl },
  };
}

/** Client-side validation before create/save display campaigns. */
export function validateDisplayCampaignForm(form: CampaignFormState): string | null {
  if (!form.title.trim()) return "name_required";
  if (!form.slug.trim()) return "invalid_fields";
  if (datetimeLocalToMs(form.startsAtLocal) >= datetimeLocalToMs(form.endsAtLocal)) {
    return "invalid_period";
  }
  if (form.ctaKind !== "none") {
    if (!form.ctaLabel.trim()) return "display_cta_label_required";
    if (!form.ctaUrl.trim()) return "display_cta_url_required";
    const url = form.ctaUrl.trim();
    if (form.ctaKind === "external_url") {
      try {
        if (new URL(url).protocol !== "https:") return "https_required";
      } catch {
        return "https_required";
      }
    }
    if (form.ctaKind === "tel" && !isValidTelCtaUrl(url)) {
      return "display_cta_invalid_tel";
    }
    if (
      form.ctaKind === "maps" &&
      !(
        url.startsWith("https://maps.") ||
        url.startsWith("https://www.google.com/maps") ||
        url.startsWith("http://maps.") ||
        url.startsWith("geo:")
      )
    ) {
      return "display_cta_invalid_maps";
    }
  }
  return null;
}

export function experienceTypeLabel(experienceType: CampaignExperienceType): string {
  return i18n.t(`experienceType.${experienceType}`, { ns: "campaign.merchant" });
}

export function buildRewardRulesFromForm(
  form: CampaignFormState,
  couponDefs: MerchantCouponDefOption[]
): Doc<"merchant_campaigns">["rewardRules"] {
  if (form.rewardModel === "competitive_leaderboard") {
    if (form.rankRewardTiers.length === 0) {
      throw new Error("reward_rules_required");
    }
    return form.rankRewardTiers.map((tier, index) => {
      if (!tier.couponDefId.trim()) {
        throw new Error("coupon_def_required");
      }
      const rankFrom = Math.max(1, Number.parseInt(tier.rankFrom, 10) || 1);
      const rankTo = Math.max(rankFrom, Number.parseInt(tier.rankTo, 10) || rankFrom);
      const couponDefId = tier.couponDefId.trim();
      return {
        ruleId: `leaderboard_reward_${index + 1}`,
        kind: "campaign_leaderboard_rank_top_n" as const,
        rankFrom,
        rankTo,
        topN: rankTo,
        couponDefId,
        reward: resolveCouponDefReward(couponDefId, couponDefs),
      };
    });
  }

  if (!form.couponDefId.trim()) {
    throw new Error("coupon_def_required");
  }

  const couponDefId = form.couponDefId.trim();
  const reward = resolveCouponDefReward(couponDefId, couponDefs);

  if (form.rewardKind === "score_threshold") {
    return [
      {
        ruleId: "score_reward",
        kind: "score_threshold" as const,
        minScore: Number.parseInt(form.minScore, 10) || 0,
        couponDefId,
        reward,
      },
    ];
  }

  return [
    {
      ruleId: "p75_reward",
      kind: "solo_p75_success" as const,
      couponDefId,
      reward,
    },
  ];
}

export function formatRankTierRangeLabel(from: number, to: number): string {
  if (from === to) {
    return from === 1
      ? i18n.t("rewardKind.firstPlace", { ns: "campaign.merchant" })
      : i18n.t("rewardKind.rankExact", { ns: "campaign.merchant", rank: from });
  }
  if (from === 1) {
    return i18n.t("rewardKind.topN", { ns: "campaign.merchant", topN: to });
  }
  return i18n.t("rewardKind.rankRange", { ns: "campaign.merchant", from, to });
}

export function rewardKindLabel(form: CampaignFormState): string {
  if (form.rewardModel === "competitive_leaderboard") {
    if (form.rankRewardTiers.length <= 1) {
      const tier = form.rankRewardTiers[0];
      if (tier) {
        const from = Math.max(1, Number.parseInt(tier.rankFrom, 10) || 1);
        const to = Math.max(from, Number.parseInt(tier.rankTo, 10) || from);
        return formatRankTierRangeLabel(from, to);
      }
    }
    return i18n.t("rewardKind.rankTiers", {
      ns: "campaign.merchant",
      count: form.rankRewardTiers.length,
    });
  }
  if (form.rewardKind === "score_threshold") {
    return i18n.t("rewardKind.scoreThreshold", {
      ns: "campaign.merchant",
      minScore: form.minScore,
    });
  }
  return i18n.t("rewardKind.p75", { ns: "campaign.merchant" });
}

export function rankRewardTierPreviewLines(
  form: CampaignFormState,
  couponDefs: MerchantCouponDefOption[]
): string[] {
  return form.rankRewardTiers.map((tier) => {
    const from = Math.max(1, Number.parseInt(tier.rankFrom, 10) || 1);
    const to = Math.max(from, Number.parseInt(tier.rankTo, 10) || from);
    const def = couponDefs.find((d) => d.couponDefId === tier.couponDefId);
    return `${formatRankTierRangeLabel(from, to)} → ${couponDefLabel(def)}`;
  });
}

export function rewardModelLabel(model: CampaignRewardModel): string {
  return i18n.t(`rewardModel.${model}`, { ns: "campaign.merchant" });
}

export function portalTemplateLabel(mode: "solo" | "multi", gameType: string): string {
  return mode === "solo" ? `portal_solo_p75_${gameType}` : `portal_multi_${gameType}`;
}

export function normalizeFormForRewardModel(form: CampaignFormState): CampaignFormState {
  if (form.rewardModel === "pass_per_run") {
    return { ...form, mode: "solo" };
  }
  const couponDefId = form.couponDefId || form.rankRewardTiers[0]?.couponDefId || "";
  const rankRewardTiers =
    form.rankRewardTiers.length > 0
      ? form.rankRewardTiers
      : defaultRankRewardTiers(couponDefId);
  return { ...form, rankRewardTiers };
}

export function pickDefaultCouponDefId(defs: MerchantCouponDefOption[]): string {
  const active = defs.filter((d) => d.status === "active");
  return active[0]?.couponDefId ?? "";
}

/** Fill missing coupon def ids so legacy campaigns can be saved after admin adds defs. */
export function ensureFormCouponDef(
  form: CampaignFormState,
  couponDefs: MerchantCouponDefOption[]
): CampaignFormState {
  const defaultId = pickDefaultCouponDefId(couponDefs);
  if (!defaultId) return form;

  let couponDefId = form.couponDefId;
  let rankRewardTiers = form.rankRewardTiers;
  let changed = false;

  if (!couponDefId.trim()) {
    couponDefId = defaultId;
    changed = true;
  }

  if (rankRewardTiers.some((tier) => !tier.couponDefId.trim())) {
    rankRewardTiers = rankRewardTiers.map((tier) =>
      tier.couponDefId.trim() ? tier : { ...tier, couponDefId: defaultId }
    );
    changed = true;
  }

  return changed ? { ...form, couponDefId, rankRewardTiers } : form;
}

export function playLimitsFromForm(form: CampaignFormState): {
  maxCouponsPerPlayer: number;
  maxPlaysPerDay?: number;
  dayTimezone: string;
} {
  const maxCouponsPerPlayer = Math.max(1, Number.parseInt(form.maxCouponsPerPlayer, 10) || 1);
  const dayTimezone = form.dayTimezone.trim() || DEFAULT_CAMPAIGN_DAY_TIMEZONE;
  const dailyRaw = form.maxPlaysPerDay.trim();
  if (!dailyRaw) {
    return { maxCouponsPerPlayer, dayTimezone };
  }
  const maxPlaysPerDay = Math.max(1, Number.parseInt(dailyRaw, 10) || 1);
  return { maxCouponsPerPlayer, maxPlaysPerDay, dayTimezone };
}
