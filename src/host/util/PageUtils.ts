import { AppsConfiguration } from "host/config/PageConfiguration";

import { useMemo } from "react";
import { PageContainer, PageItem } from "host/service/PageManager";
export const parseLocation = (): PageItem | undefined => {
    const page: { [k: string]: any } = {}
    page.uri = window.location.pathname;

    const ps = window.location.pathname.split("/");
    if (ps[1] === "portal" && ps[2]) {
        page.data = { gameType: ps[2] };
    }

    if (location.search) {
        const params: { [key: string]: string } = {};
        const searchParams = new URLSearchParams(window.location.search);
        for (const param of searchParams) {
            params[param[0]] = param[1];
        }
        page.data = params;
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
        // console.log(uri)
        let navCfg: any = app.navs.find((nav: any) => uri.includes(nav.uri));
        if (!navCfg && res["ctx"] === "portal" && app.navs.length > 0) {
            navCfg = app.navs[0];
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
                if (gameType) {
                    navItem.data = { ...(navItem.data ?? {}), gameType };
                    navItem.params = { ...(navItem.params ?? {}), gameType };
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
 * 与 PageConfig 生成的 uri 对齐（去掉尾部 `/` 等），避免 pathname 与 openPage 不一致时
 * findContainer/findAncestor 返回 null → isSameTree 误判为 false → 整层 lobby 被 pageComplete 压暗（黑屏）且 slide 被跳过。
 */
export function normalizePageUri(uri: string): string {
    if (!uri) return uri;
    const t = uri.trim();
    if (t === "/" || t === "") return "/";
    return t.replace(/\/+$/, "");
}

export const findContainerByURI = (container: PageContainer, uri: string): PageContainer | null => {
  const u = normalizePageUri(uri);
  if (normalizePageUri(container.uri) === "/portal" && u.startsWith("/portal/")) {
    return container;
  }
  if (normalizePageUri(container.uri) === u) {
    return container;
  }

    // 如果当前节点有子节点，递归搜索子节点
    if (container.children && Array.isArray(container.children)) {
        for (const child of container.children) {
            const result = findContainerByURI(child, uri);
            if (result) {
                return result;
            }
        }
    }

    // 如果未找到，返回 null
    return null;
}

/**
 * 在若干顶层容器组成的森林中按完整 uri 精确查找 PageContainer。
 * 与 {@link findContainerByURI} 等价于对每个根依次做子树 DFS。
 */
export const findContainer = (containers: PageContainer[], uri: string): PageContainer | null => {
    for (const container of containers) {
        const found = findContainerByURI(container, uri);
        if (found) return found;
    }
    return null;
}
/**
 * 在容器树中查找持有指定 uri 的节点的父级 PageContainer（递归）。
 * 若 uri 对应顶层列表中的节点，则返回 null。
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
 * 在顶层容器森林中，查找持有指定 uri 的节点所在的**根** PageContainer（`containers` 数组中的那一项）。
 * 若匹配发生在深层子节点，仍返回包含该子树的顶层根。
 */
export const findAncestor = (containers: PageContainer[], uri: string): PageContainer | null => {
    for (const root of containers) {
        if (findContainerByURI(root, uri) !== null) {
            return root;
        }
    }
    return null;
}
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
            // 获取单个参数
            get: (key: string) => searchParams.get(key),
            // 获取所有参数对象
            getAll: () => Object.fromEntries(searchParams.entries()),
            // 检查参数是否存在
            has: (key: string) => searchParams.has(key),
        };
    }, [window.location.search]);

    return params;
}