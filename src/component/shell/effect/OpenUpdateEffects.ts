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
        if (!ancestor || !ancestor.ele) return;
        const cindex = ancestor?.children?.findIndex((c) => c.uri === page.uri);
        const offset = (cindex === undefined || cindex < 0) ? 0 : Math.floor((ancestor.children?.length ?? 0) / 2) - cindex;
        // console.log("offset", cindex, offset, page.uri);
        const tl = gsap.timeline({
            onComplete: () => {
                onComplete?.();
            }
        });
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
    },

};
