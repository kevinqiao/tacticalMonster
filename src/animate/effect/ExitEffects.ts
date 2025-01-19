import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface ExitEffect {
    (args: { container: PageContainer; tl?:gsap.core.Timeline; params: { [k: string]: string | number } }): gsap.core.Timeline|null;
}

interface ExitEffects {
    [key: string]: ExitEffect;
}

export const ExitEffects: ExitEffects = {
    center: ({ container, params }) => {
        if(!container.ele) return null;
        const tl = gsap.timeline();      
        tl.to(container.ele, { scale: 0.5, autoAlpha: 0, duration: 0.7 });
        return tl;
    },
    fadeOut: ({ container, params }) => {
        console.log("container", container)
        if(!container.ele) return null;
        const timeline = gsap.timeline();
        
        timeline.to(container.ele,
              { autoAlpha: 0, duration: 0.7 }
        );
        return timeline;
    }
};
