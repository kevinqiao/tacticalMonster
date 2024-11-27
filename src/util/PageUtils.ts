import { AppsConfiguration, PageConfig } from "model/PageConfiguration";
import { PageItem } from "model/PageProps";
export const parseLocation = (): PageItem | undefined => {
    const page: { [k: string]: any } = {}
    const ps: string[] = window.location.pathname.split("/");
    if (ps.length < 2) return
    const app = AppsConfiguration.find((a) => a.context === ps[1]);
    if (app) {
        page.app = app.name;
        if (ps.length > 2)
            page.name = ps[2]
        if (ps.length > 3)
            page.child = ps[3]
    } else {
        const root = AppsConfiguration.find((a) => a.context === "/");
        if (root) {
            page.app = root.name;
            if (ps.length > 2)
                page.name = ps[2]
            if (ps.length > 3)
                page.child = ps[3]
        }
    }
    if (location.search) {
        const params: { [key: string]: string } = {};
        const searchParams = new URLSearchParams(location.search);
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
    console.log(ps)
    res["ctx"] = ps[1].length === 0 ? "/" : ps[1];
    let app: any = AppsConfiguration.find((a) => a.context === res['ctx']);
    if (!app) {
        app = AppsConfiguration.find((a) => a.context === "/" || a.context === "");
        res['ctx'] = "/"
    }

    if (app) {
        console.log(app)

        const uri = res['ctx'] === "/" ? location.pathname : location.pathname.substring(res['ctx'].length);
        console.log(uri)
        const navCfg: any = app.navs.find((nav: any) => uri.includes(nav.uri));
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

        let url = appCfg.context !== "/" ? "/" + appCfg.context : "";
        const nav = appCfg.navs.find((nav: any) => nav.name === pageItem.name);
        if (nav) {
            url = url + nav.uri;
            if (pageItem.child) {
                const child = nav.children?.find((c: any) => c.name === pageItem.child);
                if (child) url = url + "/" + child.uri;
            }
        }
        return url;
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
    const cfg: PageConfig | undefined = app?.navs.find((p: any) => p.name === page);
    return cfg
}
export const getNavConfig = (appName: string, page: string, child?: string) => {
    const app = AppsConfiguration.find((a) => a.name === appName);
    const cfg: PageConfig | undefined = app?.navs.find((p: any) => p.name === page);
    if (child && cfg?.children) {
        const cnav = cfg.children.find((c) => c.name === child);
        return cnav
    }
    return cfg
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