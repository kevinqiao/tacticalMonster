import { useModalManager } from "@/service/ModalManager";
import React, { useCallback } from "react";
import "./style.css";
import { useTournamentManager } from "@/service/TournamentManager";
const convex_url = "https://beloved-mouse-699.convex.cloud";
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

        // const result = await joinTournament(item.typeId, item.stageId);
        openModal("play_tournament", { gameType: item.gameType, typeId: item.typeId, stageId: item.stageId });


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