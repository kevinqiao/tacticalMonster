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
import { registerConvexAuthClient } from "host/service/platformAuth/convexAuthRegistry";
import { isPlatformAuthed } from "host/service/platformAuth/platformAccessToken";

import { merchantCampaignFns } from "./campaignConvexFunctionRefs";
import type { CampaignCouponView } from "../shared/campaignTypes";
import type { MerchantThemeJson } from "./applyMerchantTheme";

const _merchantUrlRaw = import.meta.env.VITE_CONVEX_URL_MERCHANT;
const DEV_MERCHANT_CONVEX_URL = "https://curious-goldfish-112.convex.cloud";

export const MERCHANT_CONVEX_URL =
  typeof _merchantUrlRaw === "string" && _merchantUrlRaw.trim() !== ""
    ? _merchantUrlRaw.trim()
    : DEV_MERCHANT_CONVEX_URL;

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
  merchant: {
    merchantId: string;
    slug: string;
    name: string;
    partnerId: number;
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
    merchantSlug: string,
    campaignSlug: string
  ) => Promise<CampaignPublicView | null>;
  fetchMerchantCampaignsPublic: (
    merchantSlug: string
  ) => Promise<MerchantCampaignCarouselItem[]>;
  fetchMyCoupon: (campaignId: string) => Promise<unknown | null>;
  fetchMyCoupons: (campaignId: string) => Promise<CampaignCouponView[]>;
  fetchLeaderboard: (campaignId: string, hasLeaderboard: boolean) => Promise<unknown[]>;
  triggerLeaderboardSettlement: (campaignId: string) => Promise<unknown>;
};

const MerchantCampaignContext = createContext<MerchantCampaignContextValue | null>(null);

let sharedHttp: ConvexHttpClient | null = null;
let merchantReactClient: ConvexReactClient | null = null;

function getHttp(): ConvexHttpClient | null {
  if (!MERCHANT_CONVEX_URL) return null;
  if (!sharedHttp) {
    sharedHttp = new ConvexHttpClient(MERCHANT_CONVEX_URL);
    registerConvexAuthClient(sharedHttp);
  }
  return sharedHttp;
}

function getMerchantReactClient(): ConvexReactClient | null {
  if (!MERCHANT_CONVEX_URL) return null;
  if (!merchantReactClient) {
    merchantReactClient = new ConvexReactClient(MERCHANT_CONVEX_URL);
    registerConvexAuthClient(merchantReactClient);
  }
  return merchantReactClient;
}

export function MerchantCampaignContextProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUserManager();
  const userRef = useRef(user);
  userRef.current = user;

  const fetchCampaignPublic = useCallback(async (merchantSlug: string, campaignSlug: string) => {
    const http = getHttp();
    if (!http) return null;
    try {
      return (await http.query(merchantCampaignFns.getCampaignPublic, {
        merchantSlug,
        campaignSlug,
      })) as CampaignPublicView | null;
    } catch (e) {
      console.error("[Campaign] getCampaignPublic", e);
      return null;
    }
  }, []);

  const fetchMerchantCampaignsPublic = useCallback(async (merchantSlug: string) => {
    const http = getHttp();
    if (!http) return [];
    try {
      const rows = (await http.query(merchantCampaignFns.listMerchantCampaignsPublic, {
        merchantSlug,
      })) as MerchantCampaignCarouselItem[] | null;
      return rows ?? [];
    } catch (e) {
      console.error("[Campaign] listMerchantCampaignsPublic", e);
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
      await http.mutation(merchantCampaignFns.ensureCampaignBoardBotsForLeaderboard, {
        campaignId,
      });
      return ((await http.query(merchantCampaignFns.getCampaignLeaderboard, {
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
      return await http.mutation(merchantCampaignFns.triggerCampaignLeaderboardSettlement, {
        campaignId,
      });
    } catch (e) {
      console.error("[Campaign] triggerSettlement", e);
      return { ok: false as const, error: "settlement_failed" };
    }
  }, []);

  const value = useMemo<MerchantCampaignContextValue>(
    () => ({
      convexUrl: MERCHANT_CONVEX_URL,
      fetchCampaignPublic,
      fetchMerchantCampaignsPublic,
      fetchMyCoupon,
      fetchMyCoupons,
      fetchLeaderboard,
      triggerLeaderboardSettlement,
    }),
    [fetchCampaignPublic, fetchMerchantCampaignsPublic, fetchMyCoupon, fetchMyCoupons, fetchLeaderboard, triggerLeaderboardSettlement]
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

/** Live subscription to merchant carousel slides (live/scheduled campaigns). */
export function useMerchantCampaignsPublicLive(merchantSlug: string) {
  const rows = useQuery(
    merchantCampaignFns.listMerchantCampaignsPublic,
    merchantSlug ? { merchantSlug } : "skip"
  );
  return {
    slides: rows as MerchantCampaignCarouselItem[] | undefined,
    isLoading: rows === undefined && Boolean(merchantSlug),
  };
}

/** Live subscription to a player's coupons at a merchant (requires platform JWT). */
export function useMerchantPlayerCouponsLive(merchantId: string | null | undefined) {
  const { user } = useUserManager();
  const enabled = Boolean(merchantId && isPlatformAuthed(user));
  const rows = useQuery(
    merchantCampaignFns.listPlayerCouponsForMerchant,
    enabled ? { merchantId: merchantId! } : "skip"
  );
  return {
    coupons: rows as CampaignCouponView[] | undefined,
    isLoading: rows === undefined && enabled,
  };
}

/** Live subscription to a single campaign public payload. */
export function useCampaignPublicLive(
  merchantSlug: string,
  campaignSlug: string | null | undefined
) {
  const enabled = Boolean(merchantSlug && campaignSlug);
  const row = useQuery(
    merchantCampaignFns.getCampaignPublic,
    enabled ? { merchantSlug, campaignSlug: campaignSlug! } : "skip"
  );
  return {
    campaignPublic:
      row === undefined ? undefined : (row as CampaignPublicView | null),
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

export function useMerchantCampaignAdmin(merchantId: string | null) {
  const { http, authed, fns } = useMerchantCampaignClient();
  const [campaigns, setCampaigns] = useState<unknown[]>([]);
  const [couponDefs, setCouponDefs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshCouponDefs = useCallback(async () => {
    if (!http || !authed || !merchantId) {
      setCouponDefs([]);
      return;
    }
    const rows = await http.query(fns.listCouponDefsForStaff, { merchantId });
    setCouponDefs(rows ?? []);
  }, [http, authed, merchantId, fns.listCouponDefsForStaff]);

  const refresh = useCallback(async () => {
    if (!http || !authed || !merchantId) {
      setCampaigns([]);
      setCouponDefs([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await http.query(fns.listCampaigns, { merchantId });
      setCampaigns(rows ?? []);
      await refreshCouponDefs();
    } finally {
      setLoading(false);
    }
  }, [http, authed, merchantId, fns.listCampaigns, refreshCouponDefs]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { campaigns, couponDefs, loading, refresh, refreshCouponDefs, http, authed, fns };
}
