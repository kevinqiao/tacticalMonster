import { PageProp } from "component/RenderApp";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import React, { useCallback } from "react";
import { MatchPlayer } from "./MatchHome";
import MatchProvider from "./MatchProvider";
import { PlayerMatch } from "./MatchTypes";

const convex_url = "https://beloved-mouse-699.convex.cloud";

const BattlePlay: React.FC<PageProp> = ({ visible, data }) => {

    const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);
    const onGameLoadComplete = useCallback(() => {
        console.log("onGameLoadComplete");
    }, []);
    const onScoreSubmit = useCallback(() => {
        console.log("onScoreSubmit");
        history.back()
    }, []);
    return (
        <>
            <ConvexProvider client={client}>
                {data && visible && <MatchProvider match={data as PlayerMatch}>
                    <MatchPlayer onGameLoadComplete={onGameLoadComplete} onScoreSubmit={onScoreSubmit} />
                </MatchProvider>}
            </ConvexProvider>
        </>
    );
};

export default BattlePlay;