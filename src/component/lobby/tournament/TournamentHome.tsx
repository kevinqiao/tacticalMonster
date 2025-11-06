import { ConvexProvider, ConvexReactClient, useConvex, useQuery } from "convex/react";
import React, { useCallback, useState } from "react";
import { api } from "../../../convex/tournament/convex/_generated/api";
import { useSSAManager } from "../../../service/SSAManager";
import "./style.css";
import TournamentPlay from "./TournamentPlay";
const convex_url = "https://beloved-mouse-699.convex.cloud";
const TournamentItem: React.FC<{ item: any, onSelect: (item: any) => void }> = (props) => {
    const convex = useConvex();
    const joinTournament = useCallback(async () => {
        console.log("joinTournament", props.item);
        props.onSelect(props.item);
        const result = await convex.mutation(api.service.tournament.tournamentService.join, { uid: "kkk", tournamentId: props.item.tournamentId, typeId: props.item.typeId });
        console.log("join result", result);
    }, [props]);
    return (
        <div className="tournament-list-item">
            <div>{props.item.gameType}-{props.item.typeId}</div>
            <button onClick={joinTournament}>{props.item.name}</button>
        </div>
    );
};
const TournamentList: React.FC<{ onSelect: (item: any) => void }> = (props) => {
    const { player } = useSSAManager();
    const result = useQuery(api.service.tournament.tournamentService.getAvailableTournaments, { uid: "kkk" });
    console.log("result", result);
    return (
        <div
            className="tournament-list-container"
        >
            {result?.tournaments?.map((item: any, index: number) => {
                return <TournamentItem item={item} key={index} onSelect={props.onSelect} />
            })}
            {/* {Array.from({ length: 8 }, (_, index) => index + 1).map((item, index) => (
                <TournamentItem item={item} key={index} />
            ))} */}
        </div>
    );
};
const TournamentHome: React.FC = (props) => {
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);

    return (
        // <SSAProvider app="tournament">
        <ConvexProvider client={client}>
            <TournamentList onSelect={setSelectedItem} />
            {selectedItem && <TournamentPlay tournament={selectedItem} />}
        </ConvexProvider>
        // </SSAProvider>
    );
};
export default TournamentHome;