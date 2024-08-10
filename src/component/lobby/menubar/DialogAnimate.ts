
import gsap from "gsap";
import { RefObject, useCallback } from "react";
import { STACK_PAGE_DIRECTION } from "../../../model/Constants";
import { MenuConfigItem } from "./MenuBar";

const useDialogAnimation = (activeMenu: MenuConfigItem | null) => {



    const openDialog = useCallback((containerRef: RefObject<HTMLDivElement>, maskRef: RefObject<HTMLDivElement>, timeline: any) => {



        if (!activeMenu) return;
        const tl = timeline ?? gsap.timeline({
            onComplete: () => {
                tl.kill()
            }
        });
        console.log(activeMenu)
        switch (activeMenu.position.direction) {
            case STACK_PAGE_DIRECTION.CENTER:
                tl.fromTo(containerRef.current, { x: 0, y: 0, scale: 0.5, autoAlpha: 0 }, { duration: 0.7, scale: 1, autoAlpha: 1, ease: "Power4.easeOut" });
                tl.to(maskRef.current, { autoAlpha: 0.7, duration: 0.7 }, "<");
                break;
            case STACK_PAGE_DIRECTION.RIGHT:
                tl.fromTo(containerRef.current, { autoAlpha: 1, x: window.innerWidth }, { x: 0, duration: 0.7, ease: "Power2.easeOut" });
                tl.to(maskRef.current, { autoAlpha: 0.7, duration: 0.7 }, "<");
                break;
            case STACK_PAGE_DIRECTION.BOTTOM:
                tl.fromTo(containerRef.current, { autoAlpha: 1, y: window.innerHeight }, { duration: 0.7, y: 0, ease: "Power2.easeOut" });
                tl.to(maskRef.current, { autoAlpha: 0.7, duration: 0.7 }, "<");
                break;
            case STACK_PAGE_DIRECTION.LEFT:
                tl.fromTo(containerRef.current, { autoAlpha: 1, x: -window.innerWidth }, { x: 0, duration: 0.7, ease: "Power2.easeOut" });
                tl.to(maskRef.current, { autoAlpha: 0.7, duration: 0.7 }, "<");
                break;
            case STACK_PAGE_DIRECTION.TOP:
                tl.fromTo(containerRef.current, { autoAlpha: 1, y: -window.innerHeight }, { duration: 0.7, y: 0, ease: "Power2.easeOut" });
                tl.to(maskRef.current, { autoAlpha: 0.7, duration: 0.7 }, "<");
                break;
            default:
                break;
        }

        tl.play();


    }, [activeMenu])

    const closeDialog = useCallback((containerRef: RefObject<HTMLDivElement>, maskRef: RefObject<HTMLDivElement>, timeline: any) => {

        if (!activeMenu) return;
        const tl = timeline ?? gsap.timeline({
            onComplete: () => {
                tl.kill()
            }
        });

        switch (activeMenu.position.direction) {
            case STACK_PAGE_DIRECTION.CENTER:
                console.log("closing dialog")
                tl.to(containerRef.current, { duration: 0.4, scale: 0.5, autoAlpha: 0, ease: "Power4.easeIn" });
                tl.to(maskRef.current, { autoAlpha: 0, duration: 0.4 }, "<");
                break;
            case STACK_PAGE_DIRECTION.RIGHT:

                tl.to(containerRef.current, { x: window.innerWidth, duration: 0.4, ease: "Power2.easeIn" });
                tl.to(maskRef.current, { autoAlpha: 0, duration: 0.4 }, "<");
                break;
            case STACK_PAGE_DIRECTION.BOTTOM:
                tl.to(containerRef.current, { duration: 0.7, y: window.innerHeight, ease: "Power2.easeIn" });
                tl.to(maskRef.current, { autoAlpha: 0, duration: 0.7 }, "<");
                break;
            case STACK_PAGE_DIRECTION.LEFT:
                tl.to(containerRef.current, { duration: 0.7, x: -window.innerWidth, ease: "Power2.easeIn" });
                tl.to(maskRef.current, { autoAlpha: 0, duration: 0.7 }, "<");
                break;
            case STACK_PAGE_DIRECTION.TOP:
                tl.to(containerRef.current, { y: -window.innerHeight, duration: 0.7, ease: "Power2.easeIn" });
                tl.to(maskRef.current, { autoAlpha: 0, duration: 0.7 }, "<");
                break;
            default:
                break;
        }
        tl.to(containerRef.current, { x: 0, y: 0, autoAlpha: 0, scale: 1, duration: 0 }, ">");
        tl.play();


    }, [activeMenu])

    return { openDialog, closeDialog }
}
export default useDialogAnimation