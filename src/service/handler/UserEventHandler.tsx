import { useConvex, useQuery } from "convex/react";
import React, { useCallback, useEffect, useState } from "react";
import { useGameCenterManager } from "service/GameCenterManager";
import { usePageManager } from "service/PageManager";
import { UserEvent, useUserManager } from "service/UserManager";
import { api } from "../../convex/sso/convex/_generated/api";

const UserEventHandler = () => {
    const { user } = useUserManager();
    const { changeEvent, openPage, updatePage } = usePageManager();
    const { activeGame } = useGameCenterManager();
    const [lastUpdate, setLastUpdate] = useState<number | undefined>(user?.lastUpdate);
    const convex = useConvex();
    const userEvents: UserEvent[] | undefined = useQuery(api.dao.eventDao.find, { uid: user?.uid ?? "", lastUpdate });

    const handleGameMatched = useCallback(async (event: UserEvent) => {
        if (activeGame?.ssa === event.data.game) {
            const uri = activeGame?.api + "/game/check";

            const res = await fetch(uri, {
                method: "POST",
                body: JSON.stringify({
                    matchId: event.data.matchId,
                }),
            })
            const result = await res.json();

            if (result.ok) {
                console.log("game is active", event.data);
                if (changeEvent?.page?.uri === "/play/lobby/match") {
                    console.log("updatePage", event.data);
                    updatePage({ uri: "/play/lobby/match", data: event.data });
                } else {
                    console.log("openPage", event.data);
                    openPage({ uri: "/play/lobby/match", data: event.data });
                }
            }
        }
    }, [activeGame, changeEvent]);
    useEffect(() => {
        const updateLastEvent = async (time: number) => {
            await convex.mutation(api.dao.userDao.updateLastEvent, { uid: user?.uid ?? "", token: user?.token ?? "", lastUpdate: time });
        }
        if (userEvents && userEvents.length > 0) {
            for (const event of userEvents) {
                console.log("event", event, activeGame);
                if (event.name === "GameMatched" && event.data.game === activeGame?.ssa) {
                    console.log("gameMatched", event);
                    handleGameMatched(event);
                }
            }
            const lastEvent = userEvents[userEvents.length - 1] as UserEvent;
            setLastUpdate(lastEvent.time);
            updateLastEvent(lastEvent.time);
            // completeEventHandle(lastEvent.time);
        }
    }, [userEvents]);
    useEffect(() => {
        if (user && user.uid) {
            setLastUpdate(user.lastUpdate);
        }
    }, [user]);

    return <></>;
};
export default UserEventHandler;
