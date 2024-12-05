import gsap from "gsap";
import { PageContainer } from "service/PageManager";

export const ChildrenAnimateFunctions = {
    slide: ({ type, container, child }: { type: number; container: PageContainer; child?: string }) => {
        //type:0-init 1-open

        if (!container.children) return
        const childIndex = container.children?.findIndex((c) => c.name === child);
        const tl = gsap.timeline({
            onComplete: () => { tl.kill(); }
        });
        console.log("type:" + type)
        if (type > 0)
            container.children?.forEach((c, index) => {
                if (c.ele)
                    tl.set(c.ele, { x: `${-childIndex * 100}%`, autoAlpha: 1 })
            })
        else {
            container.children?.forEach((c, index) => {
                if (c.ele) {
                    tl.to(c.ele, { x: `${-childIndex * 100}%`, autoAlpha: 1 }, "<")
                }
            })
        }
        tl.play();
        return
    },
};
