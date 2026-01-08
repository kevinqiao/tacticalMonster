import { useTournamentManager } from "@/service/TournamentManager";
import React, { useEffect } from "react";
import { PlayTournamentProps } from "../../PlayTournament";
import "./styles.css";

const PlayTacticalMonster: React.FC<PlayTournamentProps> = ({ gameType, typeId, stageId }) => {
    console.log("play tactical monster", gameType, typeId, stageId);
    const { joinTournament } = useTournamentManager();
    useEffect(() => {
        const join = async () => {
            const result = await joinTournament(typeId, stageId);
            console.log("join result", result);
        };
        join();
    }, [joinTournament, typeId, stageId]);
    return <div className="play-tactical-monster-container">PlayTacticalMonster</div>;
};
export default PlayTacticalMonster;