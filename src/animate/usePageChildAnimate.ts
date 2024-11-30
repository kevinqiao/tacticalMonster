import gsap from "gsap";
import { useEffect } from "react";
import { usePageChildrenManager } from "service/PageChildrenManager";
import { PageContainer, usePageManager } from "service/PageManager";


const usePageChildAnimate = () => {
    const { changeEvent, currentPage } = usePageManager();
    const { childContainers, containersLoaded } = usePageChildrenManager();

    useEffect(() => {

        if (!childContainers || childContainers?.length === 0 || !containersLoaded || !changeEvent || !currentPage) return;
        const tl = gsap.timeline();
        if (currentPage.child) {
            const { prepage } = changeEvent;
            if (prepage?.child) {
                const precontainer = childContainers.find((c) => c.name === prepage.child);
                if (precontainer?.ele)
                    tl.to(precontainer.ele, { scale: 0.5, autoAlpha: 0, duration: 0.3 })
            }
            const container: PageContainer | undefined = childContainers.find((c) => c.name === currentPage.child);
            if (container?.ele)
                tl.fromTo(container.ele, { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.3 }, "<");
            // if (container?.exit && container?.closeEle)
            //     tl.set(container.closeEle, { autoAlpha: 1 });

        }

        tl.play();

    }, [childContainers, containersLoaded, changeEvent, currentPage]);

};
export default usePageChildAnimate