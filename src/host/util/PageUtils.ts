import { AppsConfiguration } from "host/config/PageConfiguration";

import { parsePortalPathFromPathname } from "./portalPathParse";

import { useMemo } from "react";
import { PageContainer, PageItem } from "host/service/PageManager";
/** Default app shell when pathname matches no configured container. */
export const DEFAULT_MOUNT_CONTEXT = "/tactical";

export type AppContextTag = "tactical" | "casual" | "portal" | "campaign" | "platform" | "partner" | "shared";

/** Resolve URL context segment: `/campaign/foo` â†’ `/campaign`, `/` â†’ `/`. */
export function resolveActiveContext(pathname: string): string {
    const ps = pathname.split("/").filter(Boolean);
    if (ps.length === 0) return "/";
    const ctx = `/${ps[0]}`;
    const known = AppsConfiguration.some((a) => a.context === ctx);
    return known ? ctx : "/";
}

function inferModalContexts(modalPath: string): AppContextTag[] {
    if (modalPath.includes("/lobby/casual/")) return ["casual"];
    if (modalPath.includes("/lobby/tactical/")) return ["tactical"];
    if (modalPath.includes("/lobby/campaign/")) return ["campaign"];
    if (modalPath.includes("/lobby/partner/")) return ["partner"];
    if (modalPath.includes("/lobby/platform/")) return ["platform"];
    if (modalPath.includes("/lobby/portal/")) return ["portal"];
    return ["shared"];
}

export function modalMatchesActiveContext(
    modal: { contexts?: readonly AppContextTag[]; path: string },
    pathname: string
): boolean {
    const tags = modal.contexts ?? inferModalContexts(modal.path);
    if (tags.includes("shared")) return true;
    const ctx = resolveActiveContext(pathname);
    const tag = ctx.replace(/^\//, "") as AppContextTag;
    return tags.includes(tag);
}

export const parseLocation = (): PageItem | undefined => {
    const page: { [k: string]: any } = {}
    page.uri = window.location.pathname;

    const ps = window.location.pathname.split("/");
    if (ps[1] === "portal") {
        const portalPath = parsePortalPathFromPathname(window.location.pathname);
        if (portalPath.gameType) {
            page.data = { gameType: portalPath.gameType };
        }
    }
    if (ps[1] === "campaign" && ps[2] && ps[2] !== "merchant") {
        page.data = {
            merchantSlug: ps[2],
            ...(ps[3] ? { campaignSlug: ps[3] } : {}),
        };
    }

    if (location.search) {
        const params: { [key: string]: string } = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const param of searchParams) {
            params[param[0]] = param[1];
        }
        page.data = { ...(page.data ?? {}), ...params };
    }
    return page as PageItem
}
export const parseURL = (location: any): { navItem?: PageItem; ctx?: string; stackItems?: PageItem[] } => {

    const res: any = {};
    const navItem: any = {};
    const ps = location.pathname.split("/");
    // console.log(ps)
    res["ctx"] = ps[1].length === 0 ? "/" : ps[1];
    let app: any = AppsConfiguration.find((a) => a.context === res['ctx']);
    if (!app) {
        app = AppsConfiguration.find((a) => a.context === "/" || a.context === "");
        res['ctx'] = "/"
    }

    if (app) {
        // console.log(app)

        const uri = res['ctx'] === "/" ? location.pathname : location.pathname.substring(res['ctx'].length);
        let navCfg: any;
        if (res["ctx"] === "campaign" && ps[2] === "merchant") {
            navCfg = app.navs.find((nav: any) => nav.uri === "merchant");
        } else if (res["ctx"] === "partner" && ps[2] === "admin") {
            navCfg = app.navs.find((nav: any) => nav.uri === "admin");
        } else if (res["ctx"] === "platform" && ps[2] === "admin") {
            navCfg = app.navs.find((nav: any) => nav.uri === "admin");
        } else if (res["ctx"] === "campaign" && ps[2] && ps[2] !== "merchant") {
            navCfg = app.navs.find((nav: any) => nav.uri === "");
        } else if (res["ctx"] === "portal" && ps[2] === "preview") {
            navCfg = undefined;
        } else {
            navCfg = app.navs.find((nav: any) => nav.uri && uri.includes(nav.uri));
        }
        if (!navCfg && res["ctx"] === "portal" && app.navs.length > 0) {
            navCfg = app.navs.find((nav: any) => nav.uri === "") ?? app.navs[0];
        }
        if (!navCfg && res["ctx"] === "campaign" && isCampaignPlayerShellUri(location.pathname) && app.navs.length > 0) {
            navCfg = app.navs.find((nav: any) => nav.uri === "") ?? app.navs[0];
        }
        if (!navCfg && res["ctx"] === "campaign" && ps[2] === "merchant") {
            navCfg = app.navs.find((nav: any) => nav.uri === "merchant") ?? app.navs[0];
        }
        // if (!navCfg) {
        //     navCfg = app.navs[0]
        // }

        if (navCfg) {
            navItem["ctx"] = app.context;
            navItem.name = navCfg.name;
            navItem.app = app.name;
            navItem.child = navCfg.child;
            res.navItem = navItem;
            const pos = uri.lastIndexOf(navCfg.uri) + navCfg.uri.length;
            const sub = uri.substring(pos + 1);
            if (navCfg.children && sub) {
                const child = navCfg.children.find((c: any) => c.uri === sub);
                if (child) navItem.child = child.name;
            }


            if (location.search) {
                const params: { [key: string]: string } = {};
                const searchParams = new URLSearchParams(location.search);
                for (const param of searchParams) {
                    params[param[0]] = param[1];
                }
                navItem.data = params;
                navItem.params = params
            }
            if (res["ctx"] === "portal") {
                const gameType = ps[2]?.trim();
                if (gameType && gameType !== "preview") {
                    navItem.data = { ...(navItem.data ?? {}), gameType };
                    navItem.params = { ...(navItem.params ?? {}), gameType };
                }
            }
            if (res["ctx"] === "platform" && ps[2] === "admin") {
                const sub = ps[3]?.trim();
                if (sub) {
                    navItem.child = sub;
                }
            }
            if (res["ctx"] === "partner" && ps[2] === "admin") {
                const sub = ps[3]?.trim();
                if (sub) {
                    navItem.child = sub;
                }
                const partnerId = navItem.params?.partnerId ?? navItem.data?.partnerId;
                if (partnerId) {
                    navItem.data = { ...(navItem.data ?? {}), partnerId };
                }
            }
            if (res["ctx"] === "campaign") {
                if (ps[2] === "merchant") {
                    const sub = ps[3]?.trim();
                    if (sub) {
                        navItem.child = sub;
                    }
                    const merchantId = navItem.params?.merchantId ?? navItem.data?.merchantId;
                    const campaignId =
                      navItem.params?.campaignId ??
                      navItem.data?.campaignId ??
                      new URLSearchParams(location.search).get("campaignId");
                    if (merchantId) {
                        navItem.data = { ...(navItem.data ?? {}), merchantId };
                    }
                    if (campaignId) {
                        navItem.data = { ...(navItem.data ?? {}), campaignId };
                    }
                } else if (ps[2] && ps[2] !== "merchant") {
                    navItem.data = {
                        ...(navItem.data ?? {}),
                        merchantSlug: ps[2],
                        ...(ps[3] ? { campaignSlug: ps[3] } : {}),
                    };
                    navItem.params = {
                        ...(navItem.params ?? {}),
                        merchantSlug: ps[2],
                        ...(ps[3] ? { campaignSlug: ps[3] } : {}),
                    };
                }
            }
            if (location.hash) {
                const params: { [key: string]: string } = {};
                const fragment = location.hash;
                const hashParams = new URLSearchParams(fragment.slice(1));
                for (const param of hashParams) {
                    params[param[0]] = param[1];
                }
                navItem.hash = params;

            }
        }

    }
    console.log(res)
    return res;
};
export const getURLParams = (location: any): { [key: string]: string } => {
    const params: { [key: string]: string } = {};
    const searchParams = new URLSearchParams(location.search);
    for (const param of searchParams) {
        params[param[0]] = param[1];
    }
    return params
}
// export const buildNavURL = (pageItem: PageItem): string | null => {
//     const appCfg = AppsConfiguration.find((a) => a.name === pageItem.app);
//     if (appCfg) {

//         let url = appCfg.context !== "/" ? "/" + appCfg.context : "";
//         const nav = appCfg.navs.find((nav: any) => nav.name === pageItem.name);
//         if (nav) {
//             url = url + "/" + nav.uri;
//             if (pageItem.child) {
//                 const child = nav.children?.find((c: any) => c.name === pageItem.child);
//                 if (child) url = url + "/" + child.uri;
//             }
//         }
//         return url;
//     }
//     return null;
// };


export const getURIParam = (name: string): string | null => {
    const urlObj = new URL(window.location.href);
    const params = new URLSearchParams(urlObj.search);
    return params.get(name);
}

/**
 * ä¸Ž PageConfig ç”Ÿæˆçš„ uri å¯¹é½ï¼ˆåŽ»æŽ‰å°¾éƒ¨ `/` ç­‰ï¼‰ï¼Œé¿å… pathname ä¸Ž openPage ä¸ä¸€è‡´æ—¶
 * findContainer/findAncestor è¿”å›ž null â†’ isSameTree è¯¯åˆ¤ä¸º false â†’ æ•´å±‚ lobby è¢« pageComplete åŽ‹æš—ï¼ˆé»‘å±ï¼‰ä¸” slide è¢«è·³è¿‡ã€‚
 */
export function normalizePageUri(uri: string): string {
    if (!uri) return uri;
    const t = uri.trim();
    if (t === "/" || t === "") return "/";
    return t.replace(/\/+$/, "");
}

/** Campaign landing shell is `/campaign/{merchantSlug}/{campaignSlug}` â€” not `/campaign/merchant/*`. */
export function isCampaignLandingPageUri(uri: string): boolean {
    const u = normalizePageUri(uri);
    if (!u.startsWith("/campaign/")) return false;
    if (u.startsWith("/campaign/merchant")) return false;
    const parts = u.split("/").filter(Boolean);
    return parts.length >= 3;
}

/** Merchant carousel entry: `/campaign/{merchantSlug}` (no campaign slug yet). */
export function isCampaignMerchantEntryUri(uri: string): boolean {
    const u = normalizePageUri(uri);
    if (!u.startsWith("/campaign/")) return false;
    if (u.startsWith("/campaign/merchant")) return false;
    const parts = u.split("/").filter(Boolean);
    return parts.length === 2;
}

/** Player-facing campaign shell: merchant hub or a specific campaign landing. */
export function isCampaignPlayerShellUri(uri: string): boolean {
    return isCampaignMerchantEntryUri(uri) || isCampaignLandingPageUri(uri);
}

/** `/campaign/{merchantSlug}` or `/campaign/{merchantSlug}/{campaignSlug}` â†’ merchant slug. */
export function parseCampaignMerchantSlugFromPathname(pathname: string): string | null {
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] !== "campaign" || !parts[1] || parts[1] === "merchant") {
        return null;
    }
    return parts[1].trim().toLowerCase();
}

/** `?partnerId=` or legacy `?pid=` for SSO / partner admin deep links. */
export function resolvePartnerPidFromSearch(search: string = typeof window !== "undefined" ? window.location.search : ""): number | null {
    const params = new URLSearchParams(search);
    const raw = params.get("partnerId") ?? params.get("pid");
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

export function pageUriMatchesContainer(pageUri: string, containerUri: string): boolean {
    const u = normalizePageUri(pageUri);
    const c = normalizePageUri(containerUri);
    if (u === c) return true;
    if (c === "/campaign") {
        return isCampaignPlayerShellUri(u);
    }
    return u.startsWith(`${c}/`);
}

export const findContainerByURI = (container: PageContainer, uri: string): PageContainer | null => {
  const u = normalizePageUri(uri);
  const containerUri = normalizePageUri(container.uri);
  if (containerUri === "/portal" && u.startsWith("/portal/") && !u.startsWith("/portal/preview")) {
    return container;
  }
  if (normalizePageUri(container.uri) === "/campaign" && isCampaignPlayerShellUri(u)) {
    return container;
  }
  if (normalizePageUri(container.uri) === u) {
    return container;
  }

    // å¦‚æžœå½“å‰èŠ‚ç‚¹æœ‰å­èŠ‚ç‚¹ï¼Œé€’å½’æœç´¢å­èŠ‚ç‚¹
    if (container.children && Array.isArray(container.children)) {
        for (const child of container.children) {
            const result = findContainerByURI(child, uri);
            if (result) {
                return result;
            }
        }
    }

    // å¦‚æžœæœªæ‰¾åˆ°ï¼Œè¿”å›ž null
    return null;
}

/**
 * åœ¨è‹¥å¹²é¡¶å±‚å®¹å™¨ç»„æˆçš„æ£®æž—ä¸­æŒ‰å®Œæ•´ uri ç²¾ç¡®æŸ¥æ‰¾ PageContainerã€‚
 * ä¸Ž {@link findContainerByURI} ç­‰ä»·äºŽå¯¹æ¯ä¸ªæ ¹ä¾æ¬¡åšå­æ ‘ DFSã€‚
 */
export const findContainer = (containers: PageContainer[], uri: string): PageContainer | null => {
    for (const container of containers) {
        const found = findContainerByURI(container, uri);
        if (found) return found;
    }
    return null;
}
/**
 * åœ¨å®¹å™¨æ ‘ä¸­æŸ¥æ‰¾æŒæœ‰æŒ‡å®š uri çš„èŠ‚ç‚¹çš„çˆ¶çº§ PageContainerï¼ˆé€’å½’ï¼‰ã€‚
 * è‹¥ uri å¯¹åº”é¡¶å±‚åˆ—è¡¨ä¸­çš„èŠ‚ç‚¹ï¼Œåˆ™è¿”å›ž nullã€‚
 */
export const findParent = (containers: PageContainer[], uri: string): PageContainer | null => {
    const u = normalizePageUri(uri);
    for (const container of containers) {
        if (container.children?.some((c) => normalizePageUri(c.uri) === u)) {
            return container;
        }
    }
    for (const container of containers) {
        if (!container.children?.length) continue;
        const parent = findParent(container.children, uri);
        if (parent !== null) {
            return parent;
        }
    }
    return null;
}

/**
 * åœ¨é¡¶å±‚å®¹å™¨æ£®æž—ä¸­ï¼ŒæŸ¥æ‰¾æŒæœ‰æŒ‡å®š uri çš„èŠ‚ç‚¹æ‰€åœ¨çš„**æ ¹** PageContainerï¼ˆ`containers` æ•°ç»„ä¸­çš„é‚£ä¸€é¡¹ï¼‰ã€‚
 * è‹¥åŒ¹é…å‘ç”Ÿåœ¨æ·±å±‚å­èŠ‚ç‚¹ï¼Œä»è¿”å›žåŒ…å«è¯¥å­æ ‘çš„é¡¶å±‚æ ¹ã€‚
 */
export const findAncestor = (containers: PageContainer[], uri: string): PageContainer | null => {
    for (const root of containers) {
        if (findContainerByURI(root, uri) !== null) {
            return root;
        }
    }
    return null;
}

/** `/portal/preview` 由 MainApp 独立壳层渲染，不参与 RenderApp page_container 树。 */
export function isPortalPreviewUri(uri: string): boolean {
    return normalizePageUri(uri).startsWith("/portal/preview");
}

/**
 * Top-level page shells to mount for a pathname (one root tree).
 * Used by cold-boot preload and RenderApp context-scoped mounting.
 */
export function resolveMountedRootShells(
    containers: readonly PageContainer[],
    entryUri: string
): PageContainer[] {
    const u = normalizePageUri(entryUri);
    if (isPortalPreviewUri(u)) {
        return [];
    }
    if (!u) {
        const fallback = containers.find(
            (c) => normalizePageUri(c.uri).startsWith(DEFAULT_MOUNT_CONTEXT)
        );
        return fallback ? [fallback] : containers.slice(0, 1);
    }
    const ancestor = findAncestor([...containers], u);
    if (ancestor) {
        return [ancestor];
    }
    console.warn("[context] URI matches no shell; falling back to default context", entryUri);
    const fallback = containers.find(
        (c) => normalizePageUri(c.uri).startsWith(DEFAULT_MOUNT_CONTEXT)
    );
    return fallback ? [fallback] : containers.slice(0, 1);
}

/** @deprecated use resolveMountedRootShells */
export const resolveColdBootRootShells = resolveMountedRootShells;

export const isSibling = (containers: PageContainer[], uri: string, preUri: string): boolean => {
    const parent = findParent(containers, uri);
    const preParent = findParent(containers, preUri);
    if (parent && preParent && parent?.uri === preParent?.uri) {
        return true;
    }
    return false;
}
export const isSameTree = (containers: PageContainer[], uri: string, preUri: string): boolean => {
    if (!uri || !preUri) return false;
    const ancestor = findAncestor(containers, uri);
    const preAncestor = findAncestor(containers, preUri);
    if (ancestor && preAncestor && normalizePageUri(ancestor.uri) === normalizePageUri(preAncestor.uri)) {
        return true;
    }
    return false;
}
export const useUrlParams = () => {
    const params = useMemo(() => {
        const searchParams = new URLSearchParams(window.location.search);
        return {
            // èŽ·å–å•ä¸ªå‚æ•°
            get: (key: string) => searchParams.get(key),
            // èŽ·å–æ‰€æœ‰å‚æ•°å¯¹è±¡
            getAll: () => Object.fromEntries(searchParams.entries()),
            // æ£€æŸ¥å‚æ•°æ˜¯å¦å­˜åœ¨
            has: (key: string) => searchParams.has(key),
        };
    }, [window.location.search]);

    return params;
}
