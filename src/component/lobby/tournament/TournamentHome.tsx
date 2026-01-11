import { useModalManager } from "@/service/ModalManager";
import { useTournamentManager } from "@/service/TournamentManager";
import React, { useCallback } from "react";
import "./style.css";

const TournamentItem: React.FC<{ item: any, onJoin: (item: any) => void }> = (props) => {

    return (
        <div className="tournament-list-item">
            <div>{props.item.gameType}-{props.item.typeId}-{props.item.unlocked ? "unlocked" : "locked"}</div>
            <button onClick={() => props.onJoin(props.item)}>{props.item.name}</button>
        </div>
    );
};
const TournamentList: React.FC = () => {
    const { openModal } = useModalManager();
    const { activeTournaments: tournaments } = useTournamentManager();

    const join = useCallback(async (item: any) => {
        console.log("join tournament", item);
        const matchType = item.config.matchRules.maxPlayers === 1 ? "solo" : "multi_player";
        openModal("play_tournament", { mode: "join", gameType: item.gameType, typeId: item.typeId, stageId: item.stageId, matchType: matchType });
        // openModal("game_over", { gameId: "11111" });

    }, [openModal]);
    return (
        <div
            className="tournament-list-container"
        >
            {tournaments?.map((item: any, index: number) => {
                return <TournamentItem item={item} key={index} onJoin={join} />
            })}
        </div>
    );
};
const TournamentHome: React.FC = (props) => {
    return (
        <>
            <TournamentList />
        </>

    );
};
export default TournamentHome;