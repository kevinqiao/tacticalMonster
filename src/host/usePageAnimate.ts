/** 页面切换动画（初始化定位 + 打开动画调度） */
import { findContainer, isSameTree, normalizePageUri } from "@/host/util/PageUtils";
import gsap from "gsap";
import { useCallback } from "react";
import { OpenNewEffects } from "./effect/OpenNewEffects";
import { OpenUpdateEffects } from "./effect/OpenUpdateEffects";
import { PageContainer, PageItem, usePageManager } from "./service/PageManager";
import { childLeftPercent, resolveChildIndexByUri } from "./slideLobbyLeft";

export const usePageAnimate = () => {
    const { pageContainers } = usePageManager();
    const playInit = useCallback(
        ({ container }: { container: PageContainer }) => {
            if (!container || !container.ele) return;
            const currentUri = normalizePageUri(window.location.pathname);
            const containerUri = normalizePageUri(container.uri);
            const currentUnderContainer =
                currentUri === containerUri || currentUri.startsWith(`${containerUri}/`);
            /**
             * 首屏兜底：pageOpen 可能早于 ref 挂载，导致当次 autoAlpha 丢失。
             * 在挂载时按当前 URL 修正可见性，避免首次进 /tactical/lobby/c1 或 /c2 黑底。
             */
            if (currentUnderContainer) {
                gsap.set(container.ele, { autoAlpha: 1 });
            }
            if (!container.parentURI) return;
            if (container.init === "slide") {
                const parent = findContainer(pageContainers, container.parentURI);
                if (!parent || !parent.children) return;
                const cindex = parent.children?.findIndex((c) => c.name === container.name);
                if (cindex !== undefined && cindex >= 0) {
                    const target = resolveChildIndexByUri(parent.children, currentUri);
                    const targetIdx = target >= 0 ? target : Math.floor(parent.children.length / 2);
                    const leftPct = childLeftPercent(cindex, targetIdx);
                    /** slide 子页统一保持可见，仅靠 left 决定是否在视口内，避免 autoAlpha 竞态导致黑屏。 */
                    gsap.set(container.ele, {
                        left: `${leftPct}%`,
                        clearProps: "transform,x",
                        willChange: "left",
                        autoAlpha: 1,
                        pointerEvents: currentUri === containerUri ? "auto" : "none",
                    });
                }
                return;
            }

        },
        [pageContainers]
    );
    const playOpen = useCallback(
        ({ page, prepage, onComplete }: { page: PageItem, prepage?: PageItem | null, onComplete?: () => void | Promise<void> }) => {
            if (!page) return;
            if (prepage) {
                const isFamily = isSameTree(pageContainers, page.uri, prepage.uri);
                const currentContainer = findContainer(pageContainers, page.uri);
                const prevContainer = findContainer(pageContainers, prepage.uri);
                const sameSlideParent =
                    !!currentContainer?.parentURI &&
                    currentContainer.parentURI === prevContainer?.parentURI &&
                    currentContainer.init === "slide" &&
                    prevContainer?.init === "slide";
                if (isFamily || sameSlideParent) {
                    OpenUpdateEffects.slide({ page, containers: pageContainers, onComplete });
                } else {
                    onComplete?.();
                }
            } else {
                OpenNewEffects.none({ page, containers: pageContainers, onComplete });
            }
        },
        [pageContainers]
    );

    return { playInit, playOpen };
};
