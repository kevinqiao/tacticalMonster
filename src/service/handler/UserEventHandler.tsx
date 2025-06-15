import { useConvex, useQuery } from "convex/react";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useGameCenterManager } from "service/GameCenterManager";
import { usePageManager } from "service/PageManager";
import { UserEvent, useUserManager } from "service/UserManager";
import { api } from "../../convex/sso/convex/_generated/api";
import "./popup.css";
const matchAPI = "https://beloved-mouse-699.convex.site/match";
const UserEventHandler = () => {
    const alertRef = useRef<HTMLDivElement>(null);
    const maskRef = useRef<HTMLDivElement>(null);
    const { user } = useUserManager();
    const { changeEvent, openPage, updatePage, histories } = usePageManager();
    const { activeGame } = useGameCenterManager();
    const [lastUpdate, setLastUpdate] = useState<number | undefined>(user?.lastUpdate);
    const convex = useConvex();
    const userEvents: UserEvent[] | undefined = useQuery(api.dao.eventDao.find, { uid: user?.uid ?? "", lastUpdate });

    const handleGameMatched = useCallback(async (event: UserEvent) => {
        if (activeGame?.ssa === event.data.game) {
            await convex.mutation(api.dao.userDao.updateMatch, { matchId: event.data.matchId, uid: user?.uid ?? "", token: user?.token ?? "" });
            console.log("game is active", event.data);
            if (changeEvent?.page?.uri === "/play/lobby/join") {
                console.log("updatePage", event.data);
                updatePage({ uri: "/play/lobby/join", data: event.data });
            } else {
                console.log("openPage", event.data);
                // openPage({ uri: "/play/lobby/join", data: event.data });
            }
            // } else {
            //     await convex.mutation(api.dao.userDao.completeMatch, { uid: user?.uid ?? "", token: user?.token ?? "" });
            // }
        }
    }, [activeGame, changeEvent]);
    const playAlert = useCallback(() => {
        const tl = gsap.timeline();
        tl.to(alertRef.current, { autoAlpha: 1, duration: 0.5 }).to(maskRef.current, { autoAlpha: 0.5, duration: 0.5 }, "<");
        tl.play();
    }, []);

    const cancelAlert = useCallback(async () => {
        await convex.mutation(api.dao.userDao.cancelMatch, { uid: user?.uid ?? "", token: user?.token ?? "" });
        user.data.matchId = undefined;
        const tl = gsap.timeline();
        tl.to(alertRef.current, { autoAlpha: 0, duration: 0.5 }).to(maskRef.current, { autoAlpha: 0, duration: 0.5 }, "<");
        tl.play();
    }, [user]);
    const openMatch = useCallback(() => {
        const tl = gsap.timeline({
            onComplete: () => {
                openPage({ uri: "/play/lobby/battle", data: { matchId: user.data.matchId } });
            }
        });
        tl.to(alertRef.current, { autoAlpha: 0, duration: 0.5 }).to(maskRef.current, { autoAlpha: 0, duration: 0.5 }, "<");
        tl.play();
    }, [user]);
    useEffect(() => {
        // const updateLastEvent = async (time: number) => {
        //     await convex.mutation(api.dao.userDao.updateLastEvent, { uid: user?.uid ?? "", token: user?.token ?? "", lastUpdate: time });
        // }
        if (user?.uid && userEvents && userEvents.length > 0) {
            for (const event of userEvents) {
                console.log("event", event, activeGame);
                if (event.name === "GameMatched" && event.data.game === activeGame?.ssa) {
                    console.log("gameMatched", event);
                    handleGameMatched(event);
                }
            }
            const lastEvent = userEvents[userEvents.length - 1] as UserEvent;
            console.log("lastEvent", lastEvent);
            setLastUpdate(lastEvent.time);
            // updateLastEvent(lastEvent.time);
            // completeEventHandle(lastEvent.time);
        }
    }, [user, userEvents]);
    useEffect(() => {
        const checkMatch = async (matchId: string) => {
            const uri = matchAPI + "/check";
            const res = await fetch(uri, {
                method: "POST",
                body: JSON.stringify({
                    matchId: matchId,
                }),
            })
            const result = await res.json();
            if (result.ok) {
                playAlert();
            } else {
                await convex.mutation(api.dao.userDao.completeMatch, { uid: user?.uid ?? "", token: user?.token ?? "" });
            }
        }
        if (user && user.uid) {
            setLastUpdate(user.lastUpdate);
        }
        if (changeEvent && user?.data?.matchId && changeEvent.page.uri !== "/play/lobby/battle") {
            console.log("checkMatch", user.data, changeEvent);
            checkMatch(user.data.matchId);
        }
    }, [user, changeEvent]);

    return <>
        <div ref={maskRef} className="mask"></div>
        <div ref={alertRef} className="alert-box">
            <div className="btn-container">
                <div className="confirm-btn" onClick={openMatch}>Confirm</div>
                <div className="cancel-btn" onClick={cancelAlert}>Cancel</div>
            </div>
        </div>
    </>;
};
export default UserEventHandler;
