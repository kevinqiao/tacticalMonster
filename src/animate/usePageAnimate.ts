import gsap from "gsap";
import { animates } from "model/PageConfiguration";
import { useEffect, useMemo } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
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

const usePageAnimate = () => {
    const { currentPage, pageContainers, changeEvent, containersLoaded } = usePageManager();
    const containers = useMemo(() => {
        if (pageContainers && containersLoaded)
            return pageContainers.map((c) => flattenContainers(c)).flat();
    }, [pageContainers, containersLoaded])

    useEffect(() => {

        if (changeEvent && containers && containersLoaded && currentPage) {
            const { prepage } = changeEvent;

            const tcontainers = containers.filter((c) => currentPage.uri.indexOf(c.uri) === 0);
            const container = containers.find((c) => c.uri === currentPage.uri)
            const tl = gsap.timeline({
                onComplete: () => {
                    tl.kill();
                },
            });

            tcontainers.forEach((c) => {
                if (c.ele) {
                    tl.to(c.ele, { autoAlpha: 1, duration: 1.2 }, "<");
                }
            })
            /**handle open animate*/
            if (container?.ele && container?.animate) {
                const open = animates[container.animate.open];
                if (Array.isArray(open) && open.length > 1)
                    tl.fromTo(container.ele, open[0], open[1], "<")
                else
                    tl.to(container.ele, open)
            }
            /**handle close animate*/
            if (prepage) {
                const pcontainers = containers.filter((c) => prepage.uri.indexOf(c.uri) === 0);
                const ancestors = pcontainers.filter((c) => !tcontainers.includes(c));
                ancestors.forEach((c) => {
                    if (c.ele && c.animate) {
                        const close = animates[c.animate.close];
                        tl.to(c.ele, close, "<")
                    }
                })

            }

            tl.play();

        }
    }, [containers, containersLoaded, currentPage, changeEvent]);

};
export default usePageAnimate