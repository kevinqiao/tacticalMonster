import gsap from "gsap";
import { useEffect } from "react";
import { usePageManager } from "service/PageManager";


const usePageAnimate = () => {
    const { currentPage, pageContainers, changeEvent, containersLoaded } = usePageManager();
    useEffect(() => {
        if (changeEvent && pageContainers && containersLoaded && currentPage) {
            const { prepage } = changeEvent;
            if (prepage?.app === currentPage.app && prepage.name === currentPage.name) return;
            const container = pageContainers.find((c) => c.app === currentPage.app && c.name === currentPage.name);
            if (container?.ele) {
                const tl = gsap.timeline({
                    onComplete: () => {
                        tl.kill();
                    },
                });
                tl.to(container.ele, { autoAlpha: 1, duration: 1.2 });
                if (prepage) {
                    const preContainer = pageContainers.find((c) => c.app === prepage.app && c.name === prepage.name);
                    if (preContainer?.ele) {
                        tl.to(preContainer.ele, { autoAlpha: 0, duration: 1.2 }, "<");
                    }
                }

                tl.play();
            }
        }
    }, [pageContainers, containersLoaded, currentPage, changeEvent]);

};
export default usePageAnimate