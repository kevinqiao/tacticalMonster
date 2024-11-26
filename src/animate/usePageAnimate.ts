import gsap from "gsap";
import { useEffect } from "react";
import { usePageManager } from "service/PageManager";


const usePageAnimate = () => {
    const { pageContainers, pageQueue, containersLoaded } = usePageManager();
    useEffect(() => {
        if (pageContainers && containersLoaded && pageQueue.length > 0) {
            const container = pageContainers.find((c) => c.app === pageQueue[0].app && c.name === pageQueue[0].name);
            if (container) {
                const tl = gsap.timeline({
                    onComplete: () => {
                        tl.kill();
                    },
                });
                tl.to(container.ele, { autoAlpha: 1, duration: 1.2 });
                if (pageQueue.length > 1) {
                    const preContainer = pageContainers.find((c) => c.app === pageQueue[1].app && c.name === pageQueue[1].name);
                    if (preContainer) {
                        tl.to(preContainer.ele, { autoAlpha: 0, duration: 1.2 }, "<");
                    }
                }
                tl.play();
            }
        }
    }, [pageContainers, containersLoaded, pageQueue]);

};
export default usePageAnimate