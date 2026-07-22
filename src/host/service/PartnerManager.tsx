import {
    parseCampaignPartnerSlugFromPathname,
    resolvePartnerPidFromSearch,
} from "@/host/util/PageUtils";
import { parsePortalPathFromPathname } from "@/host/util/portalPathParse";
import { useConvex } from "convex/react";
import { api } from "convex/sso/convex/_generated/api";
import React, { createContext, useContext, useEffect, useState } from "react";

import { resolvePartnerIdByPartnerSlug } from "./resolveMerchantPartner";
import { useHistoryLocationKey } from "./useHistoryLocationKey";

export interface Partner {
    pid: number;
    name?: string;
    host?: string;
    portal_key?: string;
    /** Public /campaign/{slug} segment when campaignOps. */
    slug?: string;
    /** Product flags: Portal vs Campaign Ops (SoT for those contexts). */
    capabilities?: { portalGames?: boolean; campaignOps?: boolean };
    /** Enabled game types from partnerGameRegistry (portal + campaign scope). */
    games?: string[];
    data?: Record<string, unknown>;
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
    /** Portal URL partner key when on /portal/{key}/... */
    portalPartnerKey: string | null;
    /** True on first-party /portal/{gameType} routes (no partner key). */
    isFirstPartyPortal: boolean;
}
const PartnerContext = createContext<IPartnerContext>({
    partner: null,
    partnerPid: 0,
    partnerResolveReady: false,
    campaignPartnerSlug: null,
    portalPartnerKey: null,
    isFirstPartyPortal: false,
});

export const PartnerProvider = ({ children }: { children: React.ReactNode }) => {
    const [partner, setPartner] = useState<Partner | null>(null);
    const [partnerPid, setPartnerPid] = useState(0);
    const [partnerResolveReady, setPartnerResolveReady] = useState(false);
    const [campaignPartnerSlug, setCampaignPartnerSlug] = useState<string | null>(null);
    const [portalPartnerKey, setPortalPartnerKey] = useState<string | null>(null);
    const [isFirstPartyPortal, setIsFirstPartyPortal] = useState(false);
    const convex = useConvex();
    const locationKey = useHistoryLocationKey();
    const value = {
        partner,
        partnerPid,
        partnerResolveReady,
        campaignPartnerSlug,
        portalPartnerKey,
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
            setPortalPartnerKey(portalPath.partnerKey);
            setIsFirstPartyPortal(portalPath.isFirstPartyPortal);

            let pid = 0;
            let partnerRow: Partner | null = null;

            if (partnerSlug) {
                const resolved = await resolvePartnerIdByPartnerSlug(partnerSlug);
                if (cancelled) return;
                pid = resolved?.partnerId ?? 0;
                const row = await convex.query(api.service.PartnerManager.find, { pid });
                if (cancelled) return;
                partnerRow = row ? (row as Partner) : null;
            } else if (portalPath.isFirstPartyPortal) {
                pid = 0;
                const row = await convex.query(api.service.PartnerManager.find, { pid: 0 });
                if (cancelled) return;
                partnerRow = row ? (row as Partner) : null;
            } else if (portalPath.partnerKey) {
                const row = await convex.query(api.service.PartnerManager.findByPortalKey, {
                    portalKey: portalPath.partnerKey,
                });
                if (cancelled) return;
                if (row) {
                    partnerRow = row as Partner;
                    pid = partnerRow.pid;
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
