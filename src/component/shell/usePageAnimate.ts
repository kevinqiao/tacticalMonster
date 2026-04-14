/**
 * 3D 技能动画 - 施法者面向目标 + 按技能类型选择动画
 * 可选 mapDimension：有则攻击前旋转施法者面向目标；HP 条由 applyStateChanges 更新
 */
import { PageContainer, PageItem, usePageManager } from "@/service/PageManager";
import { findAncestor, findContainer } from "@/util/PageUtils";
import gsap from "gsap";
import { useCallback } from "react";

export const usePageAnimate = () => {
    const { pageContainers } = usePageManager();
    const playInit = useCallback(
        ({ container, onComplete }: { container: PageContainer, onComplete?: () => void | Promise<void> }) => {

            if (!container || !container.ele || !container.parentURI) return;
            if (container.init === "slide") {
                const parent = findContainer(pageContainers, container.parentURI);
                if (!parent || !parent.children) return;
                const cindex = parent.children?.findIndex((c) => c.name === container.name);
                if (cindex !== undefined && cindex >= 0) {
                    const center = Math.floor(parent.children?.length / 2);
                    const offset = cindex - center;
                    console.log("offset", container.name, offset);
                    gsap.set(container.ele, {
                        autoAlpha: 1,
                        left: `${offset * 100}%`,
                        force3D: true, // 启用硬件加速
                        willChange: "transform" // 提示浏览器优化
                    })
                }
                return;
            }

        },
        [pageContainers]
    );
    const playOpen = useCallback(
        ({ page, prepage, onComplete }: { page: PageItem, prepage?: PageItem | null, onComplete?: () => void | Promise<void> }) => {
            if (page) {
                console.log("playOpen", page, prepage);
                if (prepage) {
                    const ancestor = findAncestor(pageContainers, page.uri);
                    const preAncestor = findAncestor(pageContainers, prepage.uri);
                    if (ancestor && preAncestor && ancestor?.uri === preAncestor?.uri) {
                        const container = findContainer(pageContainers, page.uri);

                        const cindex = ancestor.children?.findIndex((c) => c.name === container?.name);
                        if (cindex !== undefined && cindex >= 0 && ancestor.ele) {
                            const offset = Math.floor((ancestor.children?.length ?? 0) / 2) - cindex;

                            const tl = gsap.timeline();
                            ancestor.children?.forEach((c) => {
                                if (c.ele) {
                                    tl.to(c.ele, {
                                        x: `${offset * 100}%`,
                                        duration: 0.5,
                                        ease: "power2.inOut",
                                    }, "<")
                                }
                            })
                            tl.play();

                        }
                    }
                } else {
                    const container = findContainer(pageContainers, page.uri);
                    console.log("container", container);
                    if (!container || !container.ele) return;
                    if (!container.parentURI) {
                        gsap.set(container.ele, {
                            autoAlpha: 1,
                        })
                        onComplete?.();
                    } else {
                        const ancestor = findAncestor(pageContainers, page.uri);
                        if (!ancestor || !ancestor.ele) return;
                        gsap.set(ancestor.ele, {
                            autoAlpha: 1,
                        })
                        const cindex = ancestor.children?.findIndex((c) => c.name === container?.name);
                        if (cindex !== undefined && cindex >= 0 && ancestor.ele) {
                            const offset = Math.floor((ancestor.children?.length ?? 0) / 2) - cindex;
                            ancestor.children?.forEach((c) => {
                                if (c.ele) {
                                    gsap.set(c.ele, {
                                        x: `${offset * 100}%`,
                                    })
                                }
                            })

                        }

                        onComplete?.();
                    }
                }
            }
        },
        [pageContainers]
    );

    return { playInit, playOpen };
};
