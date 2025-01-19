import { AppsConfiguration } from "model/PageConfiguration";
import { PageItem } from "model/PageProps";
import { PageContainer } from "service/PageManager";
export const parseLocation = (): PageItem | undefined => {
    const page: { [k: string]: any } = {}
    page.uri = window.location.pathname;
   
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
export const getURLParams = (location: any) => {
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
export const findContainerByURI = (container: PageContainer, uri: string): PageContainer | null => {
    // 如果当前节点的 id 匹配，返回当前节点
    if (container.uri === uri) {
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
