import gsap from "gsap";
import { useEffect } from "react";
import { usePageManager } from "service/PageManager";


const usePageAnimate = () => {
    const { pageQueue, pageContainers, changeEvent, containersLoaded } = usePageManager();
    useEffect(() => {
        if (changeEvent && pageContainers && containersLoaded) {
            const { type, index } = changeEvent;
            console.log(changeEvent)
            console.log(pageQueue)
            console.log(pageQueue[index])
            const container = pageContainers.find((c) => c.app === pageQueue[index].app && c.name === pageQueue[index].name);

            if (container?.ele) {
                const tl = gsap.timeline({
                    onComplete: () => {
                        tl.kill();
                    },
                });
                if (((type === 0 && index > 0) || type === 2) && (pageQueue[index].app !== pageQueue[index - 1].app || pageQueue[index - 1].name !== pageQueue[index].name)) {
                    tl.to(container.ele, { autoAlpha: 1, duration: 1.2 });
                    const preContainer = pageContainers.find((c) => c.app === pageQueue[index - 1].app && c.name === pageQueue[index - 1].name);
                    if (preContainer?.ele) {
                        tl.to(preContainer.ele, { autoAlpha: 0, duration: 1.2 }, "<");
                    }
                } else if (type === 1 && (pageQueue[index].app !== pageQueue[index + 1].app || pageQueue[index + 1].name !== pageQueue[index].name)) {
                    tl.to(container.ele, { autoAlpha: 1, duration: 1.2 });
                    const preContainer = pageContainers.find((c) => c.app === pageQueue[index + 1].app && c.name === pageQueue[index + 1].name);
                    if (preContainer?.ele) {
                        tl.to(preContainer.ele, { autoAlpha: 0, duration: 1.2 }, "<");
                    }
                } else if (type === 0 && index === 0)
                    tl.to(container.ele, { autoAlpha: 1, duration: 1.2 });
                tl.play();
            }
        }
    }, [pageContainers, containersLoaded, pageQueue, changeEvent]);

};
export default usePageAnimate