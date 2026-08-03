import {
    parseCampaignPartnerSlugFromPathname,
    resolvePartnerPidFromSearch,
} from "@/host/util/PageUtils";
import {
    isLegacyFirstPartyGameSegment,
    parsePortalPathFromPathname,
} from "@/host/util/portalPathParse";
import { useConvex } from "convex/react";
import { api } from "convex/sso/convex/_generated/api";
import React, { createContext, useContext, useEffect, useState } from "react";

import { useHistoryLocationKey } from "./useHistoryLocationKey";

export interface Partner {
    pid: number;
    name?: string;
    host?: string;
    /** Public /gc/{slug} and /cc/{slug} segment. */
    slug?: string;
    /** Product flags: Portal vs Campaign Ops (SoT for those contexts). */
    capabilities?: { portalGames?: boolean; campaignOps?: boolean };
    /** Static game catalog (full open; not a per-partner allowlist). */
    games?: string[];
    data?: Record<string, unknown>;
    /**
     * Cross-product visual brand SoT (Campaign / Game Center / future).
     * Consumed by Campaign FE to overlay partner name/logo/theme onto the
     * campaign-only public payload (Campaign backend no longer looks this up).
     */
    brand?: {
      sourceUrl?: string;
      themeVersion?: number;
      theme?: {
        version: number;
        sourceUrl?: string;
        mode: "light" | "dark";
        brand: {
          primary: string;
          onPrimary: string;
          background: string;
          surface: string;
          text: string;
          textMuted: string;
          fontFamily: string;
          radiusMd: string;
        };
        shell: {
          ctaBg: string;
          ctaText: string;
          headerBg: string;
          posterFrameRadius: string;
        };
        assets?: { logoUrl?: string };
      };
      logoUrl?: string;
      updatedAt?: number;
    };
    /** Player login SoT. */
    playerAuth?: {
      mode: "clerk" | "embed" | "embed_then_clerk";
      embed?: {
        method:
          | "jwt_local"
          | "crazygames_jwt"
          | "code_exchange"
          | "session_introspect";
      };
    };
    /** Staff console login SoT. */
    staffAuth?: { mode: "web" };
}

interface IPartnerContext {
    partner: Partner | null;
    /** Resolved SSO partner id (from partner slug on campaign pages, else default 0). */
    partnerPid: number;
    /** False while resolving partner slug -> partner on campaign URLs. */
    partnerResolveReady: boolean;
    /** Partner slug when on a player campaign shell route. */
    campaignPartnerSlug: string | null;
    /** Portal URL partner slug when on /gc/{slug}/... */
    portalPartnerSlug: string | null;
    /** True on first-party `/gc` (no partner slug), including legacy game-bookmark fallback. */
    isFirstPartyPortal: boolean;
}
const PartnerContext = createContext<IPartnerContext>({
    partner: null,
    partnerPid: 0,
    partnerResolveReady: false,
    campaignPartnerSlug: null,
    portalPartnerSlug: null,
    isFirstPartyPortal: false,
});

export const PartnerProvider = ({ children }: { children: React.ReactNode }) => {
    const [partner, setPartner] = useState<Partner | null>(null);
    const [partnerPid, setPartnerPid] = useState(0);
    const [partnerResolveReady, setPartnerResolveReady] = useState(false);
    const [campaignPartnerSlug, setCampaignPartnerSlug] = useState<string | null>(null);
    const [portalPartnerSlug, setPortalPartnerSlug] = useState<string | null>(null);
    const [isFirstPartyPortal, setIsFirstPartyPortal] = useState(false);
    const convex = useConvex();
    const locationKey = useHistoryLocationKey();
    const value = {
        partner,
        partnerPid,
        partnerResolveReady,
        campaignPartnerSlug,
        portalPartnerSlug,
        isFirstPartyPortal,
    };
    useEffect(() => {
        let cancelled = false;

        const fetchPartner = async () => {
            setPartnerResolveReady(false);
            const pathname = window.location.pathname;
            const search = window.location.search;
            const partnerSlug = parseCampaignPartnerSlugFromPathname(pathname);
            setCampaignPartnerSlug(partnerSlug);

            const portalPath = parsePortalPathFromPathname(pathname);
            // Prefer partnerSlug; partnerKey is a deprecated alias on ParsedPortalPath.
            const pathPartnerSlug = portalPath.partnerSlug ?? portalPath.partnerKey;
            setPortalPartnerSlug(pathPartnerSlug);
            setIsFirstPartyPortal(portalPath.isFirstPartyPortal);

            let pid = 0;
            let partnerRow: Partner | null = null;

            if (partnerSlug) {
                // slug → partnerId resolves only via SSO `partner.slug` (PartnerManager
                // is already backed by the SSO Convex client — no Campaign round-trip needed).
                // Shared by both `/gc/{slug}` (Portal) and `/cc/{slug}` (Campaign):
                // `partnerSlug` here is parsed generically from either URL shape, and
                // both product FEs read `partnerPid` from this same provider to call
                // their respective backends with an already-resolved partnerId.
                const row = await convex.query(api.service.PartnerManager.findByPartnerSlug, {
                    partnerSlug,
                });
                if (cancelled) return;
                partnerRow = row ? (row as Partner) : null;
                pid = partnerRow?.pid ?? 0;
            } else if (portalPath.isFirstPartyPortal) {
                pid = 0;
                const row = await convex.query(api.service.PartnerManager.find, { pid: 0 });
                if (cancelled) return;
                partnerRow = row ? (row as Partner) : null;
            } else if (pathPartnerSlug) {
                const row = await convex.query(api.service.PartnerManager.findByPartnerSlug, {
                    partnerSlug: pathPartnerSlug,
                });
                if (cancelled) return;
                if (row) {
                    partnerRow = row as Partner;
                    pid = partnerRow.pid;
                } else if (isLegacyFirstPartyGameSegment(pathPartnerSlug)) {
                    // Legacy `/gc/{gameType}` bookmarks → first-party default lobby.
                    setIsFirstPartyPortal(true);
                    setPortalPartnerSlug(null);
                    pid = 0;
                    const fp = await convex.query(api.service.PartnerManager.find, { pid: 0 });
                    if (cancelled) return;
                    partnerRow = fp ? (fp as Partner) : null;
                } else {
                    partnerRow = null;
                    pid = 0;
                }
            } else {
                const fromSearch = resolvePartnerPidFromSearch(search);
                if (fromSearch != null) {
                    pid = fromSearch;
                }
                const row = await convex.query(api.service.PartnerManager.find, { pid });
                if (cancelled) return;
                partnerRow = row ? (row as Partner) : null;
            }

            if (cancelled) return;
            setPartnerPid(pid);
            setPartner(partnerRow);
            setPartnerResolveReady(true);
        };

        void fetchPartner().catch(() => {
            if (!cancelled) {
                setPartnerPid(0);
                setPartner(null);
                setPartnerResolveReady(true);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [convex, locationKey]);

    return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
};
export const usePartnerManager = () => {
    const value = useContext(PartnerContext);
    if (!value) {
        throw new Error("usePartnerManager must be used within a PartnerProvider");
    }
    return value;
};
export default PartnerProvider;
