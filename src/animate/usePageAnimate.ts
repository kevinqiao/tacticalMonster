import gsap from "gsap";
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
            if (tcontainers.length > 0) {

                const tl = gsap.timeline({
                    onComplete: () => {
                        tl.kill();
                    },
                });
                tcontainers?.forEach((c) => {
                    console.log(c.ele)
                    if (c.ele)
                        tl.to(c.ele, { autoAlpha: 1, duration: 1.2 }, "<");
                })


                if (prepage) {
                    const preContainer = pageContainers.find((c) => c.uri === prepage.uri);
                    if (preContainer?.ele) {
                        tl.to(preContainer.ele, { autoAlpha: 0, duration: 1.2 }, "<");
                    }
                }

                tl.play();
            }
        }
    }, [containers, containersLoaded, currentPage, changeEvent]);

};
export default usePageAnimate