import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface EnterEffect {
    (args: { container: PageContainer; parent?:PageContainer; params: { [k: string]: string | number } }): gsap.core.Timeline|null;
}

interface EnterEffects {
    [key: string]: EnterEffect;
}

export const EnterEffects: EnterEffects = {
    center: ({ container, params }) => {
        console.log("container", container)
        if(!container.ele) return null;
        const timeline = gsap.timeline();
        
        timeline.fromTo(container.ele, 
              { scale: 0.5, autoAlpha: 0 },
              { scale: 1, autoAlpha: 1, duration: 0.7 }
        );
        return timeline;
    },
    fadeIn: ({ container, params }) => {
        console.log("container", container)
        if(!container.ele) return null;
        const timeline = gsap.timeline();
        
        timeline.to(container.ele,
              { autoAlpha: 1, duration: 0.7 }
        );
        return timeline;
    },
    slideIn: ({ container, parent }) => {
    
        if(!container.ele) return null;
        console.log("container",container)  
        console.log("parent",parent)
        const current = (parent?.children?.findIndex((c) => c.uri === container.uri)??0)
        console.log("current",current)  
        const timeline = gsap.timeline();   
        parent?.children?.forEach((c,index)=>{
            if(c.ele){
                timeline.to(c.ele,
                    { x: `${(0 - current) * 100}%`, duration: 0.7 },"<"
                );
            }
        })     

        return timeline;
    }
};
