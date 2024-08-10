import { AppsConfiguration, Covers } from "model/PageConfiguration";
import { PageConfig, PageItem } from "model/PageProps";

export const parseURL = (location: any): { navItem?: PageItem; ctx?: string; stackItems?: PageItem[] } => {

    const res: any = {};
    const navItem: any = {};
    const ps = location.pathname.split("/");
    res["ctx"] = ps[1].length === 0 ? "/" : ps[1];
    let app: any = AppsConfiguration.find((a) => a.context === res['ctx']);
    if (!app) {
        app = AppsConfiguration.find((a) => a.context === "/" || a.context === "");
        res['ctx'] = "/"
    }

    if (app) {

        const uri = res['ctx'] === "/" ? location.pathname : location.pathname.substring(res['ctx'].length);
        let navCfg: any = app.navs.find((nav: any) => uri.includes(nav.uri));
        if (!navCfg) {
            navCfg = app.navs[0]
        }

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
export const buildNavURL = (pageItem: PageItem): string | null => {
    const appCfg = AppsConfiguration.find((a) => a.name === pageItem.app);
    if (appCfg) {
        let url = "/" + (appCfg.context !== "/" ? appCfg.context : "");
        const nav = appCfg.navs.find((nav: any) => nav.name === pageItem.name);
        if (nav) {
            url = url + nav.uri;
            if (pageItem.child) {
                const child = nav.children.find((c: any) => c.name === pageItem.child);
                if (child) url = url + "/" + child.uri;
            }
            if (pageItem.params && Object.keys(pageItem.params).length > 0) {
                url = url + "?"
                Object.keys(pageItem.params).forEach((k, index) => {
                    if (pageItem.params) {
                        const v = pageItem.params[k];
                        if (Object.keys(pageItem.params).length === index + 1) {
                            url = url + k + "=" + v;
                        } else url = url + k + "=" + v + "&";
                    }
                })
            }
            const hashParams = pageItem.hash
            if (hashParams && Object.keys(hashParams).length > 0) {
                url = url + "#"
                Object.keys(hashParams).forEach((k, index) => {
                    const v = hashParams[k];
                    if (Object.keys(hashParams).length === index + 1) {
                        url = url + k + "=" + v;
                    } else url = url + k + "=" + v + "&";

                })
            }
        }
        return url;
    }
    return null;
};
export const buildStackURL = (pageItem: PageItem): string | null => {
    let uri = window.location.search ? window.location.href + "&" : window.location.href;
    if (pageItem.params) {
        uri = uri + "?"
        Object.keys(pageItem.params).forEach((k, index) => {
            if (pageItem.params) {
                const v = pageItem.params[k];
                if (Object.keys(pageItem.params).length === index + 1) {
                    uri = uri + k + "=" + v;
                } else uri = uri + k + "=" + v + "&";
            }
        });
    }

    if (pageItem.app) {
        const app: any = AppsConfiguration.find((a) => a.name === pageItem.app);
        if (app?.stacks) {
            const stack = app.stacks.find((s: any) => s.name === pageItem.name);
            if (stack) return uri + "#@" + pageItem.name;
        }
    } else {
        const cover = Covers.find((c) => c.name === pageItem.name);
        if (cover) return uri + "#@" + pageItem.name;
    }
    return null;
};
export const getCurrentAppConfig = () => {
    const ps = window.location.pathname.split("/");
    const app: any = AppsConfiguration.find((a) => a.context === (ps[1].length === 0 ? "/" : ps[1]));
    if (!app) {
        return AppsConfiguration.find((a) => a.context === "/")
    }
    return app;
}
export const getPageConfig = (appName: string, page: string) => {
    const app = AppsConfiguration.find((a) => a.name === appName);
    let cfg: PageConfig | undefined = app.navs.find((p: any) => p.name === page);
    if (!cfg) {
        cfg = app.stacks.find((p: any) => p.name === page);
    }
    return cfg
}
export const getUriByPop = (stacks: PageItem[], pop: string): string => {
    let url = window.location.pathname;
    if (window.location.search) {
        const searchParams = new URLSearchParams(window.location.search);
        const toPop = stacks.find((s) => s.name === pop)
        if (toPop?.params)
            Object.keys(toPop.params).forEach((k) => {
                if (searchParams.has(k)) searchParams.delete(k);
            });

        if (Object.keys(searchParams).length > 0) url = url + "?" + searchParams.toString();
    }
    const hash = window.location.hash;
    if (hash) {
        const hs: string[] = hash.split("@");
        const nhash = hs.filter((h) => h !== pop).join("@");
        url = url + (nhash !== "#" ? nhash : "");
    }
    return url
}

export const getURIParam = (name: string): string | null => {
    const urlObj = new URL(window.location.href);
    const params = new URLSearchParams(urlObj.search);
    return params.get(name);
}
export const getURIHashParam = (name: string): string | null => {
    const urlObj = new URL(window.location.href);
    const fragment = urlObj.hash;
    const params = new URLSearchParams(fragment.slice(1));
    const res = params.get(name);
    return res
}