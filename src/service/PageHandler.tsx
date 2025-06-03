import { gsap } from "gsap";
import React, { useCallback, useEffect } from "react";
import { PageContainer, usePageManager } from "service/PageManager";
import { findContainer } from "util/PageUtils";
import { EnterEffects } from "../animate/effect/EnterEffects";
import { ExitEffects } from "../animate/effect/ExitEffects";
import { InitStyles } from "../animate/effect/InitStyle";
import { OpenEffects } from "../animate/effect/OpenEffects";

const PageHandler = ({ children }: { children: React.ReactNode }) => {

    const { pageContainers, lifeCycleEvent, createLifeCycleEvent, changeEvent, containersLoaded } = usePageManager();


    const processInit = useCallback((container: PageContainer, curcontainer: PageContainer) => {

        if (container.children) {
            container.children.forEach((c) => {
                if (c.init) {
                    InitStyles[c.init]({ curcontainer: curcontainer, container: c, parent: container, containers: pageContainers })
                }
            })
        } else {
            if (container.init) {
                InitStyles[container.init]({ curcontainer: curcontainer, container: container, containers: pageContainers })
            }
        }
        createLifeCycleEvent({ name: "initCompleted", container: container })

    }, [pageContainers, containersLoaded]);
    const processSwitch = useCallback(({ curcontainer, precontainer }: { curcontainer: PageContainer, precontainer: PageContainer | null }) => {
        createLifeCycleEvent({ name: "switchStart", container: curcontainer, precontainer: precontainer === null ? undefined : precontainer });
        const tl = gsap.timeline({
            onComplete: () => {
                createLifeCycleEvent({ name: "switchCompleted", container: curcontainer, precontainer: precontainer === null ? undefined : precontainer });
            }
        });
        if (curcontainer.parentURI) {
            const parentContainer = findContainer(pageContainers, curcontainer.parentURI);

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
        } else if (curcontainer.enter) {
            EnterEffects[curcontainer.enter]({ container: curcontainer, tl })
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
        // createLifeCycleEvent({ name: "switchCompleted", container: curcontainer, precontainer: precontainer });
    }, [pageContainers, containersLoaded]);

    const processOpen = useCallback(({ container, precontainer }: { container: PageContainer, precontainer?: PageContainer | null }) => {

        if (container.open) {
            const tl = gsap.timeline({
                onComplete: () => {
                    createLifeCycleEvent({ name: "openCompleted", container: container })
                }
            })
            OpenEffects[container.open]({ container: container, containers: pageContainers, duration: 0.5, tl })
            // if (precontainer?.close) {
            //     CloseEffects[precontainer.close]({ container: precontainer, tl })
            // }
            tl.play();

        } else {
            createLifeCycleEvent({ name: "openCompleted", container: container })

        }
    }, [pageContainers, containersLoaded]);

    useEffect(() => {
        if (changeEvent && lifeCycleEvent) {

            const curContainer = changeEvent.page?.uri ? findContainer(pageContainers, changeEvent.page?.uri) : null;
            const precontainer = changeEvent.prepage?.uri ? findContainer(pageContainers, changeEvent.prepage?.uri) : null;
            if (!curContainer) return;
            if (lifeCycleEvent.name === "initCompleted") {
                processSwitch({ curcontainer: curContainer, precontainer });
            } else if (lifeCycleEvent.name === "switchCompleted") {

                processOpen({ container: curContainer, precontainer });
            }
        }
    }, [lifeCycleEvent, changeEvent, pageContainers]);

    useEffect(() => {
        if (changeEvent && pageContainers && containersLoaded) {
            const curcontainer = changeEvent.page?.uri ? findContainer(pageContainers, changeEvent.page?.uri) : null;
            const precontainer = changeEvent.prepage?.uri ? findContainer(pageContainers, changeEvent.prepage?.uri) : undefined;
            const noSwitch = precontainer && curcontainer && (precontainer.uri === curcontainer.uri || precontainer.uri === curcontainer.parentURI || precontainer.parentURI === curcontainer.uri || precontainer.parentURI === curcontainer.parentURI) ? true : false;
            if (!curcontainer) return;
            if (noSwitch) {
                processOpen({ container: curcontainer, precontainer })
            } else {

                if (curcontainer.parentURI) {
                    const parentContainer = findContainer(pageContainers, curcontainer.parentURI);
                    if (parentContainer) {
                        processInit(parentContainer, curcontainer)
                    }
                } else {
                    processInit(curcontainer, curcontainer)
                }
            }
        }
    }, [changeEvent, pageContainers, containersLoaded])
    return <>{children}</>;
};
export default PageHandler;
