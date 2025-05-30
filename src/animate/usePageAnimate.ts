import { useEffect } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import { EnterEffects } from "./effect/EnterEffects";
import { ExitEffects } from "./effect/ExitEffects";

const flattenContainers = (container: PageContainer) => {
    const result: PageContainer[] = [];

    // 定义递归函数
    const traverse = (currentContainer: PageContainer) => {
        result.push(currentContainer); // 将当前节点添加到结果数组

        // 遍历子节点
        currentContainer.children?.forEach(child => traverse(child));
    }

    traverse(container); // 开始遍历
    return result;
}
const closePrePage = (precontainer: PageContainer, currentcontainer: PageContainer, pageContainers: PageContainer[]) => {
    let container: PageContainer | null | undefined = precontainer;
    if (container?.children) {
        const child = container.children.find((c) => c.uri === currentcontainer.uri);
        if (child)
            container = null;
    } else if (precontainer?.parentURI) {
        const preparent = pageContainers.find((c) => c.uri === precontainer.parentURI);
        if (currentcontainer.uri.indexOf(precontainer.parentURI) < 0)
            container = preparent;
    }
    if (container) {
        const closeEffect = container?.close;
        if (typeof closeEffect === 'string' && closeEffect in ExitEffects) {
            const effectTl = ExitEffects[closeEffect]({
                container: container,
            });
            return effectTl;
        }
    }
    return null;
}
const openCurrentPage = ({ currentcontainer, precontainer, pageContainers }: { currentcontainer: PageContainer, precontainer?: PageContainer, pageContainers: PageContainer[] }) => {
    const effects: gsap.core.Timeline[] = [];
    if (currentcontainer.enter) {
        const parent = pageContainers.find((c) => c.uri === currentcontainer.parentURI);
        const openEffect = EnterEffects[currentcontainer.enter]({
            container: currentcontainer,
            parent: parent,
        })
        if (openEffect) effects.push(openEffect);
    }

    if (currentcontainer.parentURI) {
        const parentContainer = pageContainers.find((c) => c.uri === currentcontainer.parentURI);

        if (parentContainer && (!precontainer || precontainer.uri.indexOf(parentContainer.uri) < 0)) {

            if (parentContainer.enter) {
                const openEffect = EnterEffects[parentContainer.enter]({
                    container: parentContainer,
                })
                if (openEffect) effects.push(openEffect);
            }
        }
    }
    if (currentcontainer.children && currentcontainer.child) {
        // currentcontainer.children.forEach((c) => {
        //     if (c.close) {
        //         const closeEffect = ExitEffects[c.close]({
        //             container: c,
        //             params: { scale: 1, autoAlpha: 1, duration: 0.7 }
        //         })
        //         if (closeEffect) effects.push(closeEffect);
        //     }
        // })
        // }

    }
    return effects;
}
const usePageAnimate = () => {
    const { currentPage, pageContainers, changeEvent, containersLoaded } = usePageManager();


    useEffect(() => {

        // if (changeEvent && pageContainers && containersLoaded && currentPage) {
        //     const containers = pageContainers.map((c) => flattenContainers(c)).flat();
        //     const { prepage } = changeEvent;
        //     const precontainer: PageContainer | undefined = containers.find((c) => prepage?.uri === c.uri);
        //     const currentcontainer = containers.find((c) => c.uri === currentPage.uri);

        //     if (!currentcontainer || !currentcontainer.ele) return;

        //     const tl = gsap.timeline({
        //         onComplete: () => {
        //             tl.kill();
        //         },
        //     });
        //     if (precontainer) {
        //         const closeEffect = closePrePage(precontainer, currentcontainer, pageContainers);
        //         if (closeEffect) tl.add(closeEffect, "<");
        //     }
        //     const openEffects = openCurrentPage({ currentcontainer, precontainer, pageContainers });

        //     if (openEffects)
        //         openEffects.forEach((effect) => tl.add(effect, "<"));


        //     tl.play();

        // }
    }, [pageContainers, containersLoaded, currentPage, changeEvent]);

};
export default usePageAnimate