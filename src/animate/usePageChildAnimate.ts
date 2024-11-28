import gsap from "gsap";
import { PageConfig } from "model/PageConfiguration";
import { useEffect } from "react";
import { usePageChildrenManager } from "service/PageChildrenManager";
interface Props {
    childrenGround: PageConfig | null;
    childContainers?: PageConfig[];
    containersLoaded: number;
}

const usePageChildAnimate = () => {
    const { childContainers, containersLoaded } = usePageChildrenManager();
    useEffect(() => {
        console.log("page child animation")
    }, [])
    useEffect(() => {
        if (!childContainers || childContainers?.length === 0 || !containersLoaded) return;
        const tl = gsap.timeline();
        const len = childContainers.length;
        console.log(childContainers)
        childContainers.forEach((c, index) => {
            if (c?.ele) {
                if (index < len - 1)
                    tl.set(c.ele, { zIndex: index + 100, scale: 1, autoAlpha: 1 })
                else
                    tl.fromTo(
                        c.ele,
                        { zIndex: index + 100, scale: 0.6, autoAlpha: 0.6 },
                        { scale: 1, autoAlpha: 1, duration: 0.7 }
                    );
            }
        })
        tl.play();

    }, [childContainers, containersLoaded]);

};
export default usePageChildAnimate