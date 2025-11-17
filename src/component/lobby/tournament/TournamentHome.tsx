import { ConvexProvider, ConvexReactClient, useQuery } from "convex/react";
import React, { useCallback } from "react";
import { usePageManager } from "service/PageManager";
import { api } from "../../../convex/tournament/convex/_generated/api";
import "./style.css";
const convex_url = "https://beloved-mouse-699.convex.cloud";
const TournamentItem: React.FC<{ item: any, onSelect: (item: any) => void }> = (props) => {

    const joinTournament = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        event.preventDefault();
        props.onSelect(props.item);

    }, [props]);
    return (
        <div className="tournament-list-item">
            <div>{props.item.gameType}-{props.item.typeId}</div>
            <button onClick={joinTournament}>{props.item.name}</button>
        </div>
    );
};
const TournamentList: React.FC<{ onSelect: (item: any) => void }> = (props) => {
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
    const { openPage } = usePageManager();
    const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);
    const play = useCallback((item: any) => {

        openPage({ uri: "/play/tournament", data: JSON.parse(JSON.stringify(item)) });

    }, [openPage]);
    return (
        // <SSAProvider app="tournament">
        <ConvexProvider client={client}>
            <TournamentList onSelect={play} />
        </ConvexProvider>
        // </SSAProvider>
    );
};
export default TournamentHome;