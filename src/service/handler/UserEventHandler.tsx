import React, { useCallback, useEffect } from "react";
import { useGameCenterManager } from "service/GameCenterManager";
import { usePageManager } from "service/PageManager";
import { UserEvent, useUserManager } from "service/UserManager";

const UserEventHandler = ({ children }: { children: React.ReactNode }) => {
    const { userEvents, completeEventHandle } = useUserManager();
    const { currentPage, openPage } = usePageManager();
    const { activeGame } = useGameCenterManager();

    const handleGameMatched = useCallback(async (event: UserEvent) => {
        if (activeGame?.name === event.data.game && currentPage?.uri !== "/play/lobby/match") {
            const res = await fetch(activeGame?.api + "/game/check", {
                method: "POST",
                body: JSON.stringify({
                    gameId: event.data.gameId,
                }),
            })
            if (res.ok) {
                console.log("game is active");
                openPage({ uri: "/play/lobby/match", data: event.data });
            } else {
                console.log("game is not active");
            }
        }
    }, [activeGame, currentPage]);
    useEffect(() => {
        if (userEvents && userEvents.length > 0) {
            for (const event of userEvents) {
                if (event.name === "GameMatched" && event.data.game === activeGame?.ssa) {
                    console.log("gameMatched", event);
                    handleGameMatched(event);
                }
            }
            const lastEvent = userEvents[userEvents.length - 1] as UserEvent;
            completeEventHandle(lastEvent.time);
        }
    }, [userEvents]);

    return <>{children}</>;
};
export default UserEventHandler;
