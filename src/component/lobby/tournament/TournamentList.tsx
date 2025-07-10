import { useConvex, useQuery } from "convex/react";
import React, { useCallback } from "react";
import { api } from "../../../convex/tournament/convex/_generated/api";
import { SSAProvider, useSSAManager } from "../../../service/SSAManager";
import "./style.css";
const TournamentItem: React.FC<{ item: any, player: any }> = (props) => {
    const convex = useConvex();

    const joinTournament = useCallback(async () => {
        console.log("joinTournament", props.item);
        await convex.mutation(api.service.tournament.tournamentService.joinTournament, { uid: props.player.uid, gameType: props.item.gameType, tournamentType: props.item.typeId });
    }, [props]);
    return (
        <div className="tournament-list-item">
            <div>{props.item.gameType}-{props.item.typeId}</div>
            <button onClick={joinTournament}>{props.item.name}</button>
        </div>
    );
};
const TournamentList: React.FC = (props) => {
    const { player } = useSSAManager();
    const tournamentStatus = useQuery(api.service.tournament.tournamentService.getPlayerTournamentStatus, { uid: player?.uid });
    console.log("tournamentStatus", tournamentStatus);
    return (
        <div
            className="tournament-list-container"
        >
            {tournamentStatus?.tournaments?.map((item: any, index: number) => {
                return <TournamentItem item={item} key={index} player={player} />
            })}
            {/* {Array.from({ length: 8 }, (_, index) => index + 1).map((item, index) => (
                <TournamentItem item={item} key={index} />
            ))} */}
        </div>
    );
};
const TournamentHome: React.FC = (props) => {
    return (
        <SSAProvider app="tournament">

            <TournamentList />

        </SSAProvider>
    );
};
export default TournamentHome;