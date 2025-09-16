import { InitStyles } from "animate/effect/InitStyle";
import { OpenEffects } from "animate/effect/OpenEffects";
import { gsap } from "gsap";
import React, { useCallback, useEffect } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import { findContainer } from "util/PageUtils";
import { EnterEffects } from "../../animate/effect/EnterEffects";
import { ExitEffects } from "../../animate/effect/ExitEffects";
export interface LifeCycleEvent {
    name: string;
    container: PageContainer;
    precontainer?: PageContainer | null;
}
const PageHandler = ({ children }: { children: React.ReactNode }) => {

    const { loadingBG, pageContainers, changeEvent, containersLoaded, initCompleted, onInitCompleted } = usePageManager();


    const processOpen = useCallback(({ container, containers, precontainer }: { container: PageContainer, containers: PageContainer[], precontainer?: PageContainer | null }) => {

        const tl = gsap.timeline({
            onComplete: () => {
                tl.kill();
            }
        });

        if (loadingBG.ele && loadingBG.status === 1) {
            tl.to(loadingBG.ele, { autoAlpha: 0, duration: 0.5, ease: "power2.out" }, "<=-0.2")
        }

        if (container.open) {
            OpenEffects[container.open]({ container: container, containers: containers, tl })
        }
        const isParent = precontainer ? precontainer.children?.some((c) => c.uri === container.uri) || precontainer?.uri === container.parentURI : false;
        const isSibling = container.parentURI && precontainer?.parentURI === container.parentURI;
        const isChild = container.children?.some((c) => c.uri === precontainer?.uri) || container.uri === precontainer?.parentURI;
        const isSwitch = !isParent && !isSibling && !isChild;

        if (container.parentURI && isSwitch) {
            const parentContainer = findContainer(pageContainers, container.parentURI);
            if (parentContainer && parentContainer.enter) {
                EnterEffects[parentContainer.enter]({ container: parentContainer, tl })
            }
            // parentContainer.children?.forEach((c) => {
            //     const effect = c.enter ?? parentContainer.enter
            //     if (effect && EnterEffects[effect]) {
            //         EnterEffects[effect]({ container: c, tl })
            //     }
            // })
        }

        if (precontainer && isSwitch) {

            const parentContainer = precontainer.parentURI ? findContainer(pageContainers, precontainer.parentURI) : null;
            if (parentContainer) {
                if (parentContainer.exit) {
                    ExitEffects[parentContainer.exit]({ container: parentContainer, tl })
                }
                parentContainer.children?.forEach((c) => {
                    const effect = c.exit ?? parentContainer.exit
                    console.log("effect", effect);
                    if (effect) {
                        ExitEffects[effect]({ container: c, tl })
                    }
                })
            }

            const exitEffect = precontainer.exit ?? parentContainer?.exit;
            if (exitEffect) {
                ExitEffects[exitEffect]({ container: precontainer, tl })
            }

        }

        tl.play();
    }, [pageContainers, containersLoaded]);


    useEffect(() => {
        if (initCompleted && changeEvent) {
            console.log("changeEvent", changeEvent);
            const container = changeEvent.page?.uri ? findContainer(pageContainers, changeEvent.page?.uri) : null;
            const precontainer = changeEvent.prepage?.uri ? findContainer(pageContainers, changeEvent.prepage?.uri) : undefined;
            if (!container) return;
            processOpen({ container, containers: pageContainers, precontainer })
        }
    }, [changeEvent, pageContainers, initCompleted])

    useEffect(() => {

        if (pageContainers && containersLoaded) {
            // if (loadingBG.ele) {
            //     tl.to(loadingBG.ele, { autoAlpha: 0, duration: 0, ease: "power2.out" }, "<")
            // }
            pageContainers.forEach((c) => {
                c.children?.forEach((child) => {
                    if (child.init && InitStyles[child.init]) {
                        InitStyles[child.init]({ container: child, containers: pageContainers })
                    }
                })
            })
            onInitCompleted();

        }
    }, [pageContainers, containersLoaded, onInitCompleted])
    return <>{children}</>;
};
export default PageHandler;
