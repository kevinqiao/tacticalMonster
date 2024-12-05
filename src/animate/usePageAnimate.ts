import { ChildrenAnimateFunctions } from "component/util/ChildrenAnimateFunctions";
import gsap from "gsap";
import { animates } from "model/PageConfiguration";
import { useEffect, useMemo } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
const findContainerByURI = (container: PageContainer, uri: string): PageContainer | null => {
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
            const { type, prepage } = changeEvent;

            const tcontainers = containers.filter((c) => currentPage.uri.indexOf(c.uri) === 0 && currentPage.uri !== c.uri);
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
            if (container?.ele) {
                if (container?.animate) {
                    const open = animates[container.animate.open];
                    if (Array.isArray(open) && open.length > 1)
                        tl.fromTo(container.ele, open[0], open[1], 0)
                    else
                        tl.to(container.ele, open, 0)
                    if (container.animate?.children) {
                        const effectFunction = ChildrenAnimateFunctions[container.animate.children.effect as keyof typeof ChildrenAnimateFunctions]
                        tl.call(effectFunction, [{
                            type,
                            container,
                            child: container?.animate?.children?.entry
                        }], 0)
                    }

                } else if (container.parentURI) {
                    let parentContainer: PageContainer | null = null;
                    for (const pcontainer of pageContainers) {
                        parentContainer = findContainerByURI(pcontainer, container.parentURI);
                        if (parentContainer)
                            break;
                    }

                    if (parentContainer?.animate?.children) {
                        const effectFunction = ChildrenAnimateFunctions[parentContainer.animate.children.effect as keyof typeof ChildrenAnimateFunctions]
                        tl.call(effectFunction, [{
                            type,
                            container: parentContainer,
                            child: container.name
                        }], 0)
                    }
                }
            }
            /**handle close animate*/
            if (prepage) {
                const pcontainers = containers.filter((c) => prepage.uri.indexOf(c.uri) === 0);
                const ancestors = pcontainers.filter((c) => ![...tcontainers, container].includes(c));
                ancestors.forEach((c) => {
                    if (c.ele && c.animate) {
                        const close = animates[c.animate.close];
                        tl.to(c.ele, close, 0)
                    }
                })

            }

            tl.play();

        }
    }, [containers, containersLoaded, currentPage, changeEvent]);

};
export default usePageAnimate