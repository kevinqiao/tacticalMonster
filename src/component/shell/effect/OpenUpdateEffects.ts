import {
  childLeftPercent,
  resolveChildIndexByUri,
} from "@/component/shell/slideLobbyLeft";
import { findAncestor } from "@/util/PageUtils";
import gsap from "gsap";
import { PageContainer, PageItem } from "service/PageManager";

interface OpenUpdateEffect {
    (args: { page: PageItem; prepage?: PageItem; containers: PageContainer[]; onComplete?: () => void | Promise<void> }): void;
}

interface OpenUpdateEffects {
    [key: string]: OpenUpdateEffect;
}

export const OpenUpdateEffects: OpenUpdateEffects = {

    slide: ({ page, containers, onComplete }) => {
        const ancestor = findAncestor(containers, page.uri);
        if (!ancestor || !ancestor.ele) {
            onComplete?.();
            return;
        }
        const kids = ancestor.children;
        const n = kids?.length ?? 0;
        const tl = gsap.timeline({
            onComplete: () => {
                onComplete?.();
            }
        });
        if (!kids || n === 0) {
            tl.play();
            return;
        }
        const cindex = resolveChildIndexByUri(kids, page.uri);
        /** 与历史 x:0、offset===0 时一致：目标为中间子页 */
        const targetIdx = cindex < 0 ? Math.floor(n / 2) : cindex;
        /** 滑动前统一拉亮：不依赖 React visible/useLayoutEffect 顺序（否则 incoming 仍为透明、slide 像硬切或黑底） */
        kids.forEach((c) => {
            if (c.ele) gsap.set(c.ele, { autoAlpha: 1 });
        });
        /** 仅当前页接收交互，避免离屏 sibling 透明层抢走滚动条拖拽。 */
        kids.forEach((c, i) => {
            if (!c.ele) return;
            gsap.set(c.ele, { pointerEvents: i === targetIdx ? "auto" : "none" });
        });
        kids.forEach((c, i) => {
            if (!c.ele) return;
            const leftPct = childLeftPercent(i, targetIdx);
            tl.to(
                c.ele,
                {
                    left: `${leftPct}%`,
                    duration: 0.5,
                    ease: "power2.inOut",
                },
                "<"
            );
        });
        tl.play();
    },

};
