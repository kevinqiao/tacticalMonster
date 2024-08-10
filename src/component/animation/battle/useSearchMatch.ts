import { gsap } from "gsap";
import { SCENE_NAME } from "model/Match3Constants";
import { SearchScene } from "model/SceneModel";
import { useCallback } from "react";
import { useSceneManager } from "service/SceneManager";
import { useUserManager } from "service/UserManager";


export const useSearchMatch = () => {
    const { scenes } = useSceneManager();
    const { user } = useUserManager();
    const playCloseMatching = useCallback((eles: Map<string, HTMLDivElement>, playerAvatars: Map<string, HTMLDivElement>, timeline: any) => {
        const containerEle = eles.get("container");
        if (!containerEle) return;
        const tl = timeline ?? gsap.timeline({
            onComplete: () => {
                tl.kill();
            },
        });
        tl.to(containerEle, { autoAlpha: 0, duration: 0.5 });
        if (!timeline)
            tl.play();

    }, []);

    const playMatching = useCallback((eles: Map<string, HTMLDivElement>, playerAvatars: Map<string, HTMLDivElement>, timeline: any) => {
        const containerEle = eles.get("container");
        const goalEle = eles.get("goal");
        const vsEle = eles.get("vs");

        if (!containerEle || !goalEle) {
            console.log("match scene element is null")
            return;
        }
        const width = containerEle.offsetWidth;
        // const height = containerEle.offsetHeight;
        const ml = timeline ?? gsap.timeline({
            onComplete: () => {
                ml.kill();
            },
        });
        const tl = gsap.timeline({
            onComplete: () => {
                tl.kill();
            },
        });
        //close search, open success match
        ml.add(tl);
        tl.to(containerEle, { autoAlpha: 1, duration: 0 })

        if (playerAvatars.size === 2 && vsEle) {
            tl.fromTo(vsEle, { scaleX: 0, scaleY: 0 }, { scaleX: 1.4, scaleY: 1.4, duration: 0.6 }, ">");
            // tl.to(foundEle, { autoAlpha: 1, duration: 0.1 }, "<");
            tl.to(vsEle, { autoAlpha: 1, duration: 0.8 }, "<");
            const ol = gsap.timeline();
            tl.add(ol, "<")
            const opponent = Array.from(playerAvatars.keys()).find((p) => p !== user.uid);
            if (opponent) {
                const opponentAvatarEle = playerAvatars.get(opponent);
                if (opponentAvatarEle) {
                    ol.to(opponentAvatarEle, { duration: 0, x: width * 0.45 }, ">");
                    ol.to(opponentAvatarEle, { duration: 1.2, autoAlpha: 1, x: width * 0.25 }, "<");
                }
            }
            const pl = gsap.timeline();
            tl.add(pl, "<")
            const playerAvatarEle = playerAvatars.get(user.uid);
            if (playerAvatarEle) {
                pl.to(playerAvatarEle, { duration: 0, x: -width * 0.45 }, ">");
                pl.to(playerAvatarEle, { duration: 1.2, autoAlpha: 1, x: -width * 0.25 }, "<");
            }
        }
        tl.to(goalEle, { autoAlpha: 1, duration: 0.8 }, "<");
        // const sl = gsap.timeline();
        // ml.add(sl, ">");
        // sl.to(
        //     startEle,
        //     {
        //         duration: 0.3,
        //         autoAlpha: 1,
        //     },
        //     ">"
        // );
        // sl.to(startEle, { duration: 0.9, autoAlpha: 0 }, ">");
        if (!timeline)
            ml.play();
    }, []);


    const playSearch = useCallback((timeline: any) => {
        if (!scenes) return;
        const searchScene = scenes.get(SCENE_NAME.BATTLE_SEARCH) as SearchScene;

        if (!searchScene.containerEle || !searchScene.searchEle) return;
        const tl = timeline ?? gsap.timeline({
            onComplete: () => {
                tl.kill();
            }
        });

        tl.fromTo(searchScene.containerEle, { scale: 0.5, autoAlpha: 0 }, { duration: 0.5, scale: 1, autoAlpha: 1 }).to(searchScene.searchEle, { duration: 0, autoAlpha: 1 }, "<")
        if (!timeline)
            tl.play();
    }, [scenes]);

    const closeSearch = useCallback((timeline: any) => {
        if (!scenes) return;
        const searchScene = scenes.get(SCENE_NAME.BATTLE_SEARCH) as SearchScene;
        if (!searchScene.containerEle || !searchScene.searchEle) return;
        const tl = timeline ?? gsap.timeline({
            onComplete: () => {
                tl.kill();
            }
        });
        tl.to(searchScene.containerEle, { scale: 0.5, autoAlpha: 0, duration: 0.5 }).to(searchScene.searchEle, { duration: 0.5, autoAlpha: 0 }, "<")
        if (!timeline)
            tl.play();
    }, [scenes]);

    return { playSearch, closeSearch, playMatching, playCloseMatching }
}