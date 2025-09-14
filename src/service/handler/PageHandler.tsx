import { gsap } from "gsap";
import React, { useCallback, useEffect, useState } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import { findContainer } from "util/PageUtils";
import { EnterEffects } from "../../animate/effect/EnterEffects";
import { ExitEffects } from "../../animate/effect/ExitEffects";
import { InitStyles } from "../../animate/effect/InitStyle";
export interface LifeCycleEvent {
    name: string;
    container: PageContainer;
    precontainer?: PageContainer | null;
}
const PageHandler = ({ children }: { children: React.ReactNode }) => {
    const [initCompleted, setInitCompleted] = useState(false);

    const { pageContainers, changeEvent, containersLoaded } = usePageManager();


    const processOpen = useCallback(({ container, precontainer }: { container: PageContainer, precontainer?: PageContainer | null }) => {
        const tl = gsap.timeline({
            onComplete: () => {
                tl.kill();
            }
        });
        if (container.parentURI) {
            const parentContainer = findContainer(pageContainers, container.parentURI);

            if (parentContainer) {
                if (parentContainer.enter) {
                    EnterEffects[parentContainer.enter]({ container: parentContainer, tl })
                }
                parentContainer.children?.forEach((c) => {
                    const effect = c.enter ?? parentContainer.enter
                    if (effect && EnterEffects[effect]) {
                        EnterEffects[effect]({ container: c, tl })
                    }
                })


            }
        } else if (container.enter) {
            EnterEffects[container.enter]({ container: container, tl })
        }
        if (precontainer) {
            if (precontainer.parentURI) {
                const parentContainer = findContainer(pageContainers, precontainer.parentURI);
                if (parentContainer) {
                    if (parentContainer.exit) {
                        ExitEffects[parentContainer.exit]({ container: parentContainer, tl })
                    }
                    parentContainer.children?.forEach((c) => {
                        const effect = c.exit ?? parentContainer.exit
                        if (effect) {
                            ExitEffects[effect]({ container: c, tl })
                        }
                    })
                }
            } else {
                if (precontainer.exit) {
                    ExitEffects[precontainer.exit]({ container: precontainer, tl })
                }
            }
        }
        tl.play();
    }, [pageContainers, containersLoaded]);


    useEffect(() => {
        if (initCompleted && changeEvent) {
            const container = changeEvent.page?.uri ? findContainer(pageContainers, changeEvent.page?.uri) : null;
            const precontainer = changeEvent.prepage?.uri ? findContainer(pageContainers, changeEvent.prepage?.uri) : undefined;
            if (!container) return;
            processOpen({ container, precontainer })
        }
    }, [changeEvent, initCompleted])

    useEffect(() => {
        if (pageContainers && containersLoaded) {
            pageContainers.forEach((c) => {
                if (c.init) {
                    InitStyles[c.init]({ container: c, containers: pageContainers })
                }
            })
            setInitCompleted(true);
        }
    }, [pageContainers, containersLoaded])
    return <>{children}</>;
};
export default PageHandler;
