
import gsap from "gsap";
import { PagePattern } from "model/PageProps";
import { useCallback } from "react";
import { STACK_PAGE_DIRECTION } from "../../../model/Constants";
interface StackProps {
    scene: any;
    mask: any;
    closeBtn: any;
    pageProp: any;
    // position: { top: number; left: number; width: number; height: number, direction: number } | null;
}
const useStackAnimation = ({ scene, mask, closeBtn, pageProp }: StackProps) => {


    const fit = useCallback((pagePattern: PagePattern) => {

        if (!scene || !pageProp || !pagePattern) {
            return
        }

        const tl = gsap.timeline({ onComplete: () => { tl.kill() } });
        // tl.to(scene.current, { width: pagePattern.width, height: pagePattern.height })
        switch (pagePattern.direction) {
            case STACK_PAGE_DIRECTION.CENTER:
                tl.to(scene.current, { x: (pagePattern.vw - pagePattern.width) / 2, y: (pagePattern.vh - pagePattern.height) / 2 }, "<");
                break;
            case STACK_PAGE_DIRECTION.RIGHT:
                tl.to(scene.current, { x: pagePattern.vw - pagePattern.width }, "<");
                break;
            case STACK_PAGE_DIRECTION.BOTTOM:
                tl.to(scene.current, { x: (pagePattern.vw - pagePattern.width) / 2, y: pagePattern.vh - pagePattern.height }, "<");
                break;
            case STACK_PAGE_DIRECTION.LEFT:
                tl.to(scene.current, { x: 0, y: 0 }, "<");
                break;
            default:
                break;
        }
        tl.play();

    }, [scene, pageProp])

    const openStack = useCallback((pagePattern: PagePattern, timeline: any) => {

        if (!scene || !pageProp) {
            return
        }
        const tl = timeline ?? gsap.timeline({
            onComplete: () => {
                tl.kill()
            }
        });
        switch (pagePattern.direction) {
            case STACK_PAGE_DIRECTION.CENTER:
                tl.fromTo(scene.current, { scale: 0, autoAlpha: 1, x: (pagePattern.vw - pagePattern.width) / 2, y: (pagePattern.vh - pagePattern.height) / 2 }, { duration: 0.7, scale: 1 }, ">+=1");
                tl.to(mask.current, { autoAlpha: 0.7, duration: 0.7 }, "<");
                // if (pageProp.config.closeType !== CLOSE_TYPE.NO_BUTTON)
                tl.to(closeBtn.current, { autoAlpha: 1, duration: 0.5 }, ">")
                break;
            case STACK_PAGE_DIRECTION.RIGHT:
                tl.to(scene.current, { autoAlpha: 0, x: pagePattern.vw, y: 0, duration: 0 });
                tl.to(scene.current, { autoAlpha: 1, x: pagePattern.vw - pagePattern.width, duration: 0.4 });
                tl.to(mask.current, { autoAlpha: 0.7, duration: 0.4 }, "<");
                tl.to(closeBtn.current, { autoAlpha: 1, duration: 0 }, "<")
                break;
            case STACK_PAGE_DIRECTION.BOTTOM:
                tl.to(scene.current, { scale: 1, autoAlpha: 0, x: (pagePattern.vw - pagePattern.width) / 2, y: pagePattern.vh, duration: 0 });
                tl.to(scene.current, { autoAlpha: 1, y: pagePattern.vh - pagePattern.height, duration: 0.8 });
                tl.to(mask.current, { autoAlpha: 0.7, duration: 0.3 }, "<");
                tl.to(closeBtn.current, { autoAlpha: 1, duration: 0 }, "<")
                break;
            case STACK_PAGE_DIRECTION.LEFT:
                tl.to(scene.current, { scale: 1, autoAlpha: 0, x: - pagePattern.width, y: 0, duration: 0 });
                tl.to(scene.current, { autoAlpha: 1, x: 0, duration: 0.8 });
                tl.to(mask.current, { autoAlpha: 0.7, duration: 0.8 }, "<");
                tl.to(closeBtn.current, { autoAlpha: 1, duration: 0 }, "<")
                break;
            default:
                break;
        }

        tl.play();


    }, [scene, mask, closeBtn, pageProp])

    const closeStack = useCallback((pagePattern: PagePattern, timeline: any) => {

        if (pageProp && pagePattern) {
            const tl = timeline ?? gsap.timeline();
            switch (pagePattern.direction) {
                case STACK_PAGE_DIRECTION.CENTER:
                    tl.to(scene.current, { autoAlpha: 0, scale: 0, duration: 0.3 });
                    tl.to(mask.current, { autoAlpha: 0, duration: 0.3 }, "<");
                    tl.to(closeBtn.current, { autoAlpha: 0, duration: 0.3 }, "<")
                    break;
                case STACK_PAGE_DIRECTION.RIGHT:
                    tl.to(scene.current, { duration: 0.2, x: pagePattern.vw });
                    tl.to(mask.current, { autoAlpha: 0, duration: 0.2 }, "<");
                    // tl.to(scene.current, { autoAlpha: 0, duration: 0 });
                    // tl.to(closeBtn.current, { autoAlpha: 0, duration: 0 }, "<")
                    break;
                case STACK_PAGE_DIRECTION.BOTTOM:
                    tl.to(scene.current, { duration: 0.7, y: pagePattern.vh });
                    tl.to(mask.current, { autoAlpha: 0, duration: 0.7 }, "<");
                    tl.to(scene.current, { autoAlpha: 0, duration: 0 });
                    tl.to(closeBtn.current, { autoAlpha: 0, duration: 0 }, "<")
                    break;
                case STACK_PAGE_DIRECTION.LEFT:
                    tl.to(scene.current, { duration: 0.7, x: - pagePattern.width });
                    tl.to(mask.current, { autoAlpha: 0, duration: 0.7 }, "<");
                    tl.to(scene.current, { autoAlpha: 0, duration: 0 });
                    tl.to(closeBtn.current, { autoAlpha: 0, duration: 0 }, "<")
                    break;
                default:
                    break;
            }
            tl.play()
        }

    }, [pageProp, scene, mask, closeBtn])


    return { openStack, closeStack, fit }
}
export default useStackAnimation