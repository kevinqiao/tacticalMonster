import { findAncestor, findContainer } from "@/host/util/PageUtils";
import gsap from "gsap";
import { PageContainer, PageItem } from "../service/PageManager";
import {
    childLeftPercent,
    resolveChildIndexByUri,
} from "../slideLobbyLeft";
interface OpenNewEffect {
    (args: { page: PageItem; containers: PageContainer[]; onComplete?: () => void | Promise<void> }): void;
}

interface OpenNewEffects {
    [key: string]: OpenNewEffect;
}

export const OpenNewEffects: OpenNewEffects = {

    "none": ({ page, containers, onComplete }) => {
        // console.log("container", container)
        const container = findContainer(containers, page.uri);
        if (!container || !container.ele) {
            onComplete?.();
            return;
        }
        if (!container.parentURI) {
            gsap.set(container.ele, {
                autoAlpha: 1,
            })
            onComplete?.();
        } else {
            const ancestor = findAncestor(containers, page.uri);
            if (!ancestor || !ancestor.ele) {
                onComplete?.();
                return;
            }
            gsap.set(ancestor.ele, {
                autoAlpha: 1,
            })
            const kids = ancestor.children;
            const n = kids?.length ?? 0;
            if (!kids || n === 0) {
                onComplete?.();
                return;
            }
            const byName = kids.findIndex((c) => c.name === container?.name);
            const byUri = resolveChildIndexByUri(kids, page.uri);
            const targetIdx = byName >= 0 ? byName : byUri >= 0 ? byUri : Math.floor(n / 2);
            const usesSlideLayout = kids.some((c) => c.init === "slide");

            if (!usesSlideLayout) {
                kids.forEach((c, i) => {
                    if (!c.ele) return;
                    gsap.set(c.ele, { clearProps: "left,transform,x" });
                    c.ele.dataset.active = i === targetIdx ? "true" : "false";
                    gsap.set(c.ele, {
                        autoAlpha: i === targetIdx ? 1 : 0,
                        pointerEvents: i === targetIdx ? "auto" : "none",
                    });
                });
                onComplete?.();
                return;
            }

            kids.forEach((c, i) => {
                if (!c.ele) return;
                const leftPct = childLeftPercent(i, targetIdx);
                gsap.set(c.ele, {
                    left: `${leftPct}%`,
                    clearProps: "transform,x",
                });
            });
            /** slide 子页统一保持可见，是否显示由 left 位置决定（父容器 overflow:hidden）。 */
            kids.forEach((c) => {
                if (!c.ele) return;
                gsap.set(c.ele, { autoAlpha: 1 });
            });
            kids.forEach((c, i) => {
                if (!c.ele) return;
                gsap.set(c.ele, { pointerEvents: i === targetIdx ? "auto" : "none" });
            });
            onComplete?.();
        }

    },

};
