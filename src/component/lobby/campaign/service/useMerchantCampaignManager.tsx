import { ConvexHttpClient } from "convex/browser";
import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useUserManager } from "host/service/UserManager";
import { usePartnerManager, type Partner } from "host/service/PartnerManager";
import { registerConvexAuthClient } from "host/service/platformAuth/convexAuthRegistry";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";

import { merchantCampaignFns } from "./campaignConvexFunctionRefs";
import type { CampaignCouponView } from "../shared/campaignTypes";
import type { MerchantThemeJson } from "./applyMerchantTheme";

const _campaignUrlRaw = import.meta.env.VITE_CONVEX_URL_CAMPAIGN;
const DEV_CAMPAIGN_CONVEX_URL = "https://curious-goldfish-112.convex.cloud";

export const CAMPAIGN_CONVEX_URL =
  typeof _campaignUrlRaw === "string" && _campaignUrlRaw.trim() !== ""
    ? _campaignUrlRaw.trim()
    : DEV_CAMPAIGN_CONVEX_URL;

export type CampaignRewardModel = "pass_per_run" | "competitive_leaderboard";

export type CampaignExperienceType = "game" | "display";

export type DisplayCtaKind = "none" | "external_url" | "tel" | "maps";

export type DisplayConfig = {
  highlightText?: string;
  cta?: {
    kind: DisplayCtaKind;
    label?: string;
    url?: string;
  };
};

export function isDisplayCampaign(
  campaign: { experienceType?: CampaignExperienceType }
): campaign is { experienceType: "display" } {
  return campaign.experienceType === "display";
}

export type CampaignSettlementView = {
  status: string;
  winnerCount?: number;
  couponsIssued?: number;
  settledAt?: number;
  error?: string;
};

export type CampaignLeaderboardRankRewardView = {
  rankFrom: number;
  rankTo: number;
  topN: number;
  label: string;
};

export type CampaignPassRewardView = {
  kind: "solo_p75_success" | "score_threshold";
  minScore?: number;
  rewardLabel: string;
};

export type CampaignPublicView = {
  partner: {
    partnerId: number;
    slug: string;
    name: string;
    logoUrl: string | null;
  };
  campaign: {
    campaignId: string;
    slug: string;
    status: string;
    title: string;
    rulesText?: string;
    startsAt: number;
    endsAt: number;
    experienceType?: CampaignExperienceType;
    displayConfig?: DisplayConfig | null;
    highlightText?: string | null;
    gameType?: string;
    mode?: "solo" | "multi";
    rewardModel?: CampaignRewardModel;
    hasLeaderboard?: boolean;
    posterUrl: string | null;
    posterPortraitUrl?: string | null;
    posterLandscapeUrl?: string | null;
    live: boolean;
    settlement?: CampaignSettlementView;
    playLimits?: { maxCouponsPerPlayer: number; maxPlaysPerDay?: number; dayTimezone?: string };
    leaderboardRankRewards?: CampaignLeaderboardRankRewardView[];
    passReward?: CampaignPassRewardView | null;
  };
  theme: MerchantThemeJson | null;
};

export type MerchantCampaignCarouselItem = {
  slug: string;
  title: string;
  status: string;
  startsAt: number;
  endsAt: number;
  experienceType?: CampaignExperienceType;
  gameType: string;
  posterUrl: string | null;
  posterPortraitUrl?: string | null;
  posterLandscapeUrl?: string | null;
  ctaLabel?: string;
};

type MerchantCampaignContextValue = {
  convexUrl: string;
  fetchCampaignPublic: (
    partnerId: number,
    campaignSlug: string
  ) => Promise<CampaignPublicView | null>;
  fetchPartnerCampaignsPublic: (
    partnerId: number
  ) => Promise<MerchantCampaignCarouselItem[]>;
  fetchMyCoupon: (campaignId: string) => Promise<unknown | null>;
  fetchMyCoupons: (campaignId: string) => Promise<CampaignCouponView[]>;
  fetchLeaderboard: (campaignId: string, hasLeaderboard: boolean) => Promise<unknown[]>;
  triggerLeaderboardSettlement: (campaignId: string) => Promise<unknown>;
  updateCampaignDisplayName: (
    displayName: string
  ) => Promise<{ ok: boolean; error?: string; displayName?: string }>;
  syncCampaignContactProfile: (args: {
    verifiedEmail?: string;
    verifiedPhone?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
};

const MerchantCampaignContext = createContext<MerchantCampaignContextValue | null>(null);

let sharedHttp: ConvexHttpClient | null = null;
let merchantReactClient: ConvexReactClient | null = null;

function getHttp(): ConvexHttpClient | null {
  if (!CAMPAIGN_CONVEX_URL) return null;
  if (!sharedHttp) {
    sharedHttp = new ConvexHttpClient(CAMPAIGN_CONVEX_URL);
    registerConvexAuthClient(sharedHttp);
  }
  return sharedHttp;
}

function getMerchantReactClient(): ConvexReactClient | null {
  if (!CAMPAIGN_CONVEX_URL) return null;
  if (!merchantReactClient) {
    merchantReactClient = new ConvexReactClient(CAMPAIGN_CONVEX_URL);
    registerConvexAuthClient(merchantReactClient);
  }
  return merchantReactClient;
}

export function MerchantCampaignContextProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUserManager();
  const userRef = useRef(user);
  userRef.current = user;

  const fetchCampaignPublic = useCallback(async (partnerId: number, campaignSlug: string) => {
    const http = getHttp();
    if (!http || partnerId <= 0) return null;
    try {
      // Query takes an already-resolved partnerId — no SSO HTTP round-trip here.
      // Caller is responsible for overlaying SSO partner.brand (see
      // `mergeSsoPartnerBrand` / `useCampaignPublicLive`).
      return (await http.query(merchantCampaignFns.getCampaignPublic, {
        partnerId,
        campaignSlug,
      })) as CampaignPublicView | null;
    } catch (e) {
      console.error("[Campaign] getCampaignPublic", e);
      return null;
    }
  }, []);

  const fetchPartnerCampaignsPublic = useCallback(async (partnerId: number) => {
    const http = getHttp();
    if (!http || partnerId <= 0) return [];
    try {
      const rows = (await http.query(merchantCampaignFns.listPartnerCampaignsPublic, {
        partnerId,
      })) as MerchantCampaignCarouselItem[] | null;
      return rows ?? [];
    } catch (e) {
      console.error("[Campaign] listPartnerCampaignsPublic", e);
      return [];
    }
  }, []);

  const fetchMyCoupon = useCallback(async (campaignId: string) => {
    const http = getHttp();
    if (!http || !isPlatformAuthed(userRef.current)) return null;
    try {
      return await http.query(merchantCampaignFns.getMyCampaignCoupon, { campaignId });
    } catch (e) {
      console.error("[Campaign] getMyCampaignCoupon", e);
      return null;
    }
  }, []);

  const fetchMyCoupons = useCallback(async (campaignId: string) => {
    const http = getHttp();
    if (!http || !isPlatformAuthed(userRef.current)) return [];
    try {
      const rows = (await http.query(merchantCampaignFns.listPlayerCoupons, {
        campaignId,
      })) as CampaignCouponView[] | null;
      return rows ?? [];
    } catch (e) {
      console.error("[Campaign] listPlayerCoupons", e);
      return [];
    }
  }, []);

  const fetchLeaderboard = useCallback(async (campaignId: string, hasLeaderboard: boolean) => {
    const http = getHttp();
    if (!http || !hasLeaderboard) return [];
    try {
      await http.action(merchantCampaignFns.ensureCampaignBoardBotsForLeaderboard, {
        campaignId,
      });
      return ((await http.action(merchantCampaignFns.getCampaignLeaderboard, {
        campaignId,
        limit: 20,
      })) ?? []) as unknown[];
    } catch (e) {
      console.error("[Campaign] getCampaignLeaderboard", e);
      return [];
    }
  }, []);

  const triggerLeaderboardSettlement = useCallback(async (campaignId: string) => {
    const http = getHttp();
    if (!http || !isPlatformAuthed(userRef.current)) {
      return { ok: false as const, error: "unauthenticated" };
    }
    try {
      return await http.action(merchantCampaignFns.triggerCampaignLeaderboardSettlement, {
        campaignId,
      });
    } catch (e) {
      console.error("[Campaign] triggerSettlement", e);
      return { ok: false as const, error: "settlement_failed" };
    }
  }, []);

  const updateCampaignDisplayName = useCallback(async (displayName: string) => {
    const http = getHttp();
    if (!http || !isPlatformAuthed(userRef.current)) {
      return { ok: false as const, error: "no_auth" };
    }
    try {
      const res = (await http.action(merchantCampaignFns.updateCampaignDisplayName, {
        displayName,
      })) as { ok?: boolean; error?: string; displayName?: string };
      return {
        ok: Boolean(res?.ok),
        error: res?.error,
        displayName: res?.displayName,
      };
    } catch (e) {
      console.error("[Campaign] updateCampaignDisplayName", e);
      return { ok: false as const, error: "save_failed" };
    }
  }, []);

  const syncCampaignContactProfile = useCallback(
    async (args: { verifiedEmail?: string; verifiedPhone?: string }) => {
      const http = getHttp();
      if (!http || !isPlatformAuthed(userRef.current)) {
        return { ok: false as const, error: "no_auth" };
      }
      try {
        const res = (await http.action(merchantCampaignFns.syncCampaignContactProfile, args)) as {
          ok?: boolean;
          error?: string;
        };
        return { ok: Boolean(res?.ok), error: res?.error };
      } catch (e) {
        console.error("[Campaign] syncCampaignContactProfile", e);
        return { ok: false as const, error: "save_failed" };
      }
    },
    []
  );

  const value = useMemo<MerchantCampaignContextValue>(
    () => ({
      convexUrl: CAMPAIGN_CONVEX_URL,
      fetchCampaignPublic,
      fetchPartnerCampaignsPublic,
      fetchMyCoupon,
      fetchMyCoupons,
      fetchLeaderboard,
      triggerLeaderboardSettlement,
      updateCampaignDisplayName,
      syncCampaignContactProfile,
    }),
    [
      fetchCampaignPublic,
      fetchPartnerCampaignsPublic,
      fetchMyCoupon,
      fetchMyCoupons,
      fetchLeaderboard,
      triggerLeaderboardSettlement,
      updateCampaignDisplayName,
      syncCampaignContactProfile,
    ]
  );

  return (
    <MerchantCampaignContext.Provider value={value}>
      {children}
    </MerchantCampaignContext.Provider>
  );
}

function MerchantCampaignConvexShell({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getMerchantReactClient(), []);

  if (!client) {
    return <MerchantCampaignContextProvider>{children}</MerchantCampaignContextProvider>;
  }
  return (
    <ConvexProvider client={client}>
      <MerchantCampaignContextProvider>{children}</MerchantCampaignContextProvider>
    </ConvexProvider>
  );
}

export { MerchantCampaignConvexShell as MerchantCampaignProvider };

/**
 * Resolves a Campaign `partnerSlug` -> `partnerId` via the shared
 * `usePartnerManager()` (SSO `PartnerManager.findByPartnerSlug`) — the same
 * FE resolve path Portal uses for `/gc/{slug}`. Campaign public reads then
 * take the resolved `partnerId` directly (no SSO HTTP call in Campaign
 * backend code for these page loads).
 *
 * Holds the last successfully-resolved partner across transient
 * `partnerResolveReady` flips for the *same* slug (e.g. the campaign
 * carousel calls `history.replaceState` on every slide switch, which
 * re-triggers `usePartnerManager()`'s resolve effect) so the page doesn't
 * flicker back to a loading state while swiping between slides.
 */
export function useCampaignPartnerGate(partnerSlug: string) {
  const { partner, partnerPid, partnerResolveReady, campaignPartnerSlug } = usePartnerManager();
  const matchesUrl = Boolean(partnerSlug) && campaignPartnerSlug === partnerSlug;
  const readyForSlug = partnerResolveReady && matchesUrl;

  const lastGoodRef = useRef<{ slug: string; pid: number; partner: Partner } | null>(null);
  if (readyForSlug && partner) {
    lastGoodRef.current = { slug: partnerSlug, pid: partnerPid, partner };
  }
  // Only trust the cached "last good" resolve while it matches the slug this
  // hook is currently asked about — guards against briefly reusing a stale
  // partnerId if the caller's `partnerSlug` itself changes (e.g. in-app nav
  // straight from one merchant's campaign page to another's).
  const lastGood =
    lastGoodRef.current && lastGoodRef.current.slug === partnerSlug ? lastGoodRef.current : null;

  return {
    resolving: !lastGood && !readyForSlug,
    partnerMissing: !lastGood && readyForSlug && !partner,
    partnerPid: lastGood?.pid ?? 0,
    partner: lastGood?.partner ?? null,
  };
}

/** Live subscription to partner carousel slides (live / scheduled / ended). */
export function usePartnerCampaignsPublicLive(partnerId: number) {
  const enabled = partnerId > 0;
  const rows = useQuery(
    merchantCampaignFns.listPartnerCampaignsPublic,
    enabled ? { partnerId } : "skip"
  );
  return {
    slides: rows as MerchantCampaignCarouselItem[] | undefined,
    isLoading: rows === undefined && enabled,
  };
}

/** Live subscription to a player's coupons for a partner (requires platform JWT). */
export function usePartnerPlayerCouponsLive(partnerId: number | null | undefined) {
  const { user } = useUserManager();
  const enabled = Boolean(partnerId != null && isPlatformAuthed(user));
  const rows = useQuery(
    merchantCampaignFns.listPlayerCouponsForPartner,
    enabled ? { partnerId: partnerId! } : "skip"
  );
  return {
    coupons: rows as CampaignCouponView[] | undefined,
    isLoading: rows === undefined && enabled,
  };
}

type RawSsoTheme = MerchantThemeJson & { assets?: { logoUrl?: string } };

/**
 * Overlays SSO `partner.brand` (name / logo / theme) onto a campaign-only
 * public payload — the same enrichment Portal effectively gets from partner
 * context, done here on the FE instead of server-side in a Campaign action.
 * Per-campaign `theme` (campaign's own `themeOverride`) wins over the
 * partner-level brand theme.
 */
function mergeSsoPartnerBrand(
  view: CampaignPublicView,
  ssoPartner: Partner | null,
  fallbackSlug: string
): CampaignPublicView {
  const brand = ssoPartner?.brand;
  const campaignTheme = (view.theme ?? null) as RawSsoTheme | null;
  const ssoTheme = (brand?.theme ?? null) as RawSsoTheme | null;
  const theme = campaignTheme ?? ssoTheme ?? null;
  const ssoLogo = brand?.logoUrl?.trim() || undefined;
  const logoUrl = theme?.assets?.logoUrl?.trim() || ssoLogo || null;
  const slug = ssoPartner?.slug?.trim() || fallbackSlug;
  const name = ssoPartner?.name?.trim() || slug;
  return {
    ...view,
    partner: {
      partnerId: ssoPartner?.pid ?? view.partner.partnerId,
      slug,
      name,
      logoUrl,
    },
    theme,
  };
}

/**
 * Live subscription to a single campaign public payload. `partnerId` must
 * already be resolved (see `useCampaignPartnerGate`); the query itself does
 * not resolve slugs. Overlays SSO `partner.brand` (name/logo/theme) from
 * `usePartnerManager()` onto the campaign-only backend payload.
 */
export function useCampaignPublicLive(
  partnerId: number,
  campaignSlug: string | null | undefined
) {
  const { partner: ssoPartner, campaignPartnerSlug } = usePartnerManager();
  const enabled = Boolean(partnerId > 0 && campaignSlug);
  const row = useQuery(
    merchantCampaignFns.getCampaignPublic,
    enabled ? { partnerId, campaignSlug: campaignSlug! } : "skip"
  ) as CampaignPublicView | null | undefined;

  const campaignPublic = useMemo(() => {
    if (!row) return row;
    return mergeSsoPartnerBrand(row, ssoPartner, campaignPartnerSlug ?? "");
  }, [row, ssoPartner, campaignPartnerSlug]);

  return {
    campaignPublic,
    isLoading: row === undefined && enabled,
  };
}

export function useMerchantCampaign() {
  const ctx = useContext(MerchantCampaignContext);
  if (!ctx) throw new Error("useMerchantCampaign requires MerchantCampaignProvider");
  return ctx;
}

/** Standalone hook for merchant admin pages (no provider required). */
export function useMerchantCampaignClient() {
  const { user } = useUserManager();
  const http = useMemo(() => getHttp(), []);

  return useMemo(
    () => ({
      http,
      authed: isPlatformAuthed(user),
      fns: merchantCampaignFns,
    }),
    [http, user]
  );
}

export function useMerchantCampaignAdmin(partnerId: number | null) {
  const { http, authed, fns } = useMerchantCampaignClient();
  const [campaigns, setCampaigns] = useState<unknown[]>([]);
  const [couponDefs, setCouponDefs] = useState<unknown[]>([]);
  const [portalVoucherSkus, setPortalVoucherSkus] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  /** coupon_defs is retired server-side (always []); Portal voucher SKUs are the only reward products now. */
  const refreshCouponDefs = useCallback(async () => {
    if (!http || !authed || partnerId == null) {
      setCouponDefs([]);
      setPortalVoucherSkus([]);
      return;
    }
    const skus = await http.action(fns.listPartnerVoucherSkusForStaff, { partnerId });
    setCouponDefs([]);
    setPortalVoucherSkus(skus ?? []);
  }, [http, authed, partnerId, fns.listPartnerVoucherSkusForStaff]);

  const refresh = useCallback(async () => {
    if (!http || !authed || partnerId == null) {
      setCampaigns([]);
      setCouponDefs([]);
      setPortalVoucherSkus([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await http.action(fns.listCampaigns, { partnerId });
      setCampaigns(rows ?? []);
      await refreshCouponDefs();
    } finally {
      setLoading(false);
    }
  }, [http, authed, partnerId, fns.listCampaigns, refreshCouponDefs]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    campaigns,
    couponDefs,
    portalVoucherSkus,
    loading,
    refresh,
    refreshCouponDefs,
    http,
    authed,
    fns,
    partnerId,
  };
}
