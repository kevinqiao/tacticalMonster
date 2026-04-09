import gsap from "gsap";
import React, { useCallback } from "react";

const usePreGameAnimate = (teamLayoutRef: React.RefObject<HTMLDivElement>, loadingRef: React.RefObject<HTMLDivElement>, playGameRef: React.RefObject<HTMLDivElement>) => {
    const playInit = useCallback(() => {
        gsap.set(loadingRef.current, { autoAlpha: 0 });
        gsap.set(teamLayoutRef.current, { autoAlpha: 0 });
        gsap.set(playGameRef.current, { autoAlpha: 0 });
    }, []);
    const openTeamLayout = useCallback(() => {
        gsap.set(playGameRef.current, { autoAlpha: 0 });
        const tl = gsap.timeline();

        tl.to(teamLayoutRef.current, {
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.inOut"
        });
        tl.to(loadingRef.current, {
            autoAlpha: 0,
            duration: 0.5,
            ease: "power2.inOut"
        }, ">");
        tl.play();
    }, []);
    const playLoading = useCallback(() => {
        const tl = gsap.timeline();
        tl.to(teamLayoutRef.current, {
            autoAlpha: 0,
            duration: 0.5,
            ease: "power2.inOut"
        });
        tl.to(loadingRef.current, {
            autoAlpha: 0.6,
            duration: 0.5,
            ease: "power2.inOut"
        }, "<");
        tl.play();
    }, []);
    const openPlayGame = useCallback(() => {
        console.log("openPlayGame", playGameRef.current);
        const tl = gsap.timeline();
        tl.to(loadingRef.current, {
            autoAlpha: 0,
            duration: 0.5,
            ease: "power2.inOut"
        });
        tl.to(teamLayoutRef.current, {
            autoAlpha: 0,
            duration: 0.5,
            ease: "power2.inOut"
        }, "<");
        tl.to(playGameRef.current, {
            autoAlpha: 1,
            duration: 0.5,
            ease: "power2.inOut"
        }, "<");
        tl.play();
    }, []);
    return { playInit, playLoading, openPlayGame, openTeamLayout };
}
export default usePreGameAnimate;