import {
    collectRootBootCriticalUrls,
    resolveColdBootRootShells,
    resolveMountedRootShells,
    useColdBootPreload,
} from "@/host/service/useColdBootPreload";
import { findContainer, isSameTree, normalizePageUri, parseLocation, resolveMountedRootShells } from "@/host/util/PageUtils";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppsConfiguration, PageConfig } from "../config/PageConfiguration";
import { PageStatus } from "../config/PageProps";
import { applyDocumentTitle } from "../documentTitles";
import { usePageAnimate } from "../usePageAnimate";
import { useSharedPageData } from "./SharedPageDataManager";
import { useUserManager } from "./UserManager";

export type { UseColdBootPreloadResult } from "@/host/service/useColdBootPreload";
export {
    collectRootBootCriticalUrls,
    resolveColdBootRootShells,
    resolveMountedRootShells,
    useColdBootPreload
};

export type App = {
    name: string;
    params?: { [k: string]: string };
};

export interface PageEvent {
    name?: "pageOpen" | "pageUpdate" | "pageComplete";
    prepage?: PageItem | null;
    page: PageItem;
}
export interface PageItem {
    data?: { [key: string]: any };
    uri: string;
    status?: PageStatus;
    onExit?: PageItem;
}
export interface PageContainer extends PageConfig {
    ele?: HTMLDivElement | null;
    closeEle?: HTMLDivElement | null;
    children?: PageContainer[];
    mask?: HTMLDivElement | null;
    preventNavigation?: boolean;
}



/** SharedPageData 前缀：`lobby.*`（tactical）与 `casualLobby.*`（casual） */
const getSharedDataNamespaceFromUri = (uri?: string | null): string | null => {
    if (!uri) return null;
    const root = uri.split("/").filter(Boolean)[0];
    if (root === "casual") return "casualLobby";
    if (root === "tactical") return "lobby";
    return null;
};

interface IPageContext {
    histories: PageItem[];
    currentPage: PageItem | undefined | null;
    pageUpdated: PageItem | null;
    pageEvent: PageEvent | null;
    app: App | null;
    /** 展平的顶层壳列表（全量，供路由/鉴权/动画） */
    pageContainers: PageContainer[];
    /** 当前 URL context 下应挂载的顶层壳子集（供 RenderApp） */
    mountedPageContainers: PageContainer[];
    /**
     * 首屏壳 `bootCriticalAssetUrls` 已跑完预加载（由 {@link useColdBootPreload} 驱动；无 URL 时为 true）。
     * BootLoadingOverlay 与此项组合决定是否结束冷启动遮罩。
     */
    coldBootAssetsReady: boolean;
    sumbitPage: (page: PageItem) => void;
    openPage: (page: PageItem) => void;
    completePage: () => void;
}

const PageContext = createContext<IPageContext>({
    pageEvent: null,
    histories: [],
    currentPage: null,
    pageUpdated: null,
    app: null,
    // authReq: null,
    pageContainers: [],
    mountedPageContainers: [],
    coldBootAssetsReady: false,
    sumbitPage: (p: PageItem) => null,
    // cancelAuth: () => null,
    openPage: (p: PageItem) => null,
    completePage: () => null,
});
const PageHandler = ({ children }: { children: React.ReactNode }) => {
    const { pageEvent, completePage } = usePageManager();
    const { playOpen } = usePageAnimate();
    useEffect(() => {

        if (pageEvent?.name === "pageOpen") {
            playOpen({
                page: pageEvent.page,
                prepage: pageEvent.prepage,
                onComplete: () => {
                    /**
                     * 关键：不要在 pageOpen 同一 effect 周期内同步切成 pageComplete。
                     * 否则 RenderApp 子页面可能尚未消费到 pageOpen（visible/autoAlpha 未更新）就被覆盖，首屏出现黑底。
                     */
                    requestAnimationFrame(() => {
                        completePage();
                    });
                },
            });
        }
    }, [pageEvent, playOpen, completePage]);
    return <>{children}</>;
};
export const PageProvider = ({ children }: { children: React.ReactNode }) => {
    const { user, askAuth } = useUserManager();
    const { clearNamespace } = useSharedPageData();
    // const loadingBGRef = useRef<{ ele: HTMLDivElement | null; status: number }>({ ele: null, status: 1 });
    const historiesRef = useRef<PageItem[]>([]);
    const currentPageRef = useRef<PageItem | null>(null);
    const [currentPage, setCurrentPage] = useState<PageItem | null>(null);
    // const [initCompleted, setInitCompleted] = useState(false);
    const [pageUpdated, setPageUpdated] = useState<PageItem | null>(null);
    const [pageEvent, setPageEvent] = useState<PageEvent | null>(null);
    const [app, setApp] = useState<App | null>(null);
    // const [authReq, setAuthReq] = useState<{ params?: { [k: string]: string }; page?: PageItem; modal?: ModalItem } | null>(null);
    const pageContainers: PageContainer[] = useMemo(() => {
        const containers = AppsConfiguration.reduce<PageConfig[]>((acc, config) => {
            return acc.concat(
                config.navs.map((nav) => ({
                    ...nav,
                    app: config.name,
                    uri: config.context === "/" ? config.context + nav.uri : config.context + "/" + nav.uri,
                }))
            );
        }, []);
        containers.forEach((container) => {
            if (container.children) {
                container.children = container.children.map((child) => ({
                    ...child,
                    app: container.app,
                    uri: container.uri + "/" + child.uri,
                    parentURI: container.uri,
                }));
            }
        });
        return containers;
    }, []);

    const { coldBootAssetsReady } = useColdBootPreload(pageContainers);

    const mountedPageContainers = useMemo(() => {
        const uri =
            currentPage?.uri ??
            (typeof window !== "undefined" ? window.location.pathname : "");
        return resolveMountedRootShells(pageContainers, uri);
    }, [pageContainers, currentPage?.uri]);

    const requireAuth = useCallback(
        (page: PageItem) => {
            const container = findContainer(pageContainers, page.uri);
            if (!container) return false;
            const parent = container.parentURI ? findContainer(pageContainers, container.parentURI) : null;
            return (container?.auth === 1 || parent?.auth === 1) && (!user || !user.uid) ? true : false;
        },
        [user, pageContainers]
    );
    const sumbitPage = useCallback((page: PageItem) => {
        if (currentPageRef.current?.uri === page.uri) return;
        window.history.replaceState(null, "", page.uri);
        historiesRef.current.push(page);
        if (historiesRef.current.length > 10) {
            historiesRef.current.shift();
        }

        const prepage = currentPageRef.current;
        setPageEvent({ name: "pageOpen", prepage, page: page });
        currentPageRef.current = page;
        setCurrentPage(page);
    }, []);
    const openPage = useCallback(
        (page: PageItem) => {
            const container = findContainer(pageContainers, page.uri);
            if (!container) return;
            if (normalizePageUri(page.uri) === normalizePageUri(currentPageRef.current?.uri ?? "")) {
                setPageUpdated(page);
                return;
            }
            const authRequired = requireAuth(page);
            if (authRequired) {
                askAuth({ page: page });
                return;
            }
            sumbitPage(page);
        },
        [requireAuth, askAuth, requireAuth, sumbitPage]
    );

    const completePage = useCallback(() => {
        setPageEvent((prev) => {
            if (prev) {
                return { ...prev, name: "pageComplete" };
            }
            return null;
        });
    }, []);

    useEffect(() => {
        if (pageEvent?.name !== "pageComplete") return;
        if (!pageEvent.prepage) return;
        if (isSameTree(pageContainers, pageEvent.page.uri, pageEvent.prepage.uri)) return;
        const prespace = getSharedDataNamespaceFromUri(pageEvent.prepage.uri);
        if (!prespace) return;
        clearNamespace(prespace);
    }, [pageEvent, pageContainers, clearNamespace]);

    useEffect(() => {
        applyDocumentTitle(
            currentPage?.uri ??
                (typeof window !== "undefined" ? window.location.pathname : undefined)
        );
    }, [currentPage?.uri]);

    useEffect(() => {
        const handlePopState = () => {
            const page = parseLocation();
            if (page) {
                const prepage = currentPageRef.current;
                setPageEvent({ name: "pageOpen", prepage, page });
                currentPageRef.current = page;
                setCurrentPage(page);
            }
        };
        handlePopState();
        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    const value = {
        histories: historiesRef.current,
        currentPage,
        pageUpdated,
        pageEvent,
        pageContainers,
        mountedPageContainers,
        coldBootAssetsReady,
        // initCompleted,
        app,
        sumbitPage,
        openPage,
        completePage,
        // onInitCompleted,
    };
    return (
        <PageContext.Provider value={value}>
            <PageHandler>{children}</PageHandler>
        </PageContext.Provider>
    );
};

export const usePageManager = () => {
    return useContext(PageContext);
};
export default PageProvider;
