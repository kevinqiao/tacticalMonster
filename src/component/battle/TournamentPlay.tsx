import { PageProp } from "component/RenderApp";
import { ConvexProvider, ConvexReactClient, useConvex } from "convex/react";
import { api } from "convex/tournament/convex/_generated/api";
import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MatchHome from "./MatchHome";
import { PlayerMatch } from "./MatchTypes";
import "./style.css";
const convex_url = "https://beloved-mouse-699.convex.cloud";
const TournamentMain: React.FC<{ tournament: any }> = ({ tournament }) => {

    const loadingRef = useRef<HTMLDivElement | null>(null);
    const matchingRef = useRef<HTMLDivElement | null>(null);
    const matchingCompleteRef = useRef<HTMLDivElement | null>(null);
    // const matchPlayRef = useRef<HTMLDivElement | null>(null);
    const [progress, setProgress] = useState(0);
    const [matchReady, setMatchReady] = useState(false);
    const [playerMatch, setPlayerMatch] = useState<PlayerMatch | null>(null);
    const convex = useConvex();
    // const matchingResult = useQuery(api.service.tournament.matchManager.findTournamentMatch, { typeId: tournament?.typeId, uid: "kkk" });
    const onGameLoadComplete = useCallback(() => {

    }, []);
    const onScoreSubmit = useCallback(() => {
        setTimeout(() => {
            setMatchReady(false);
            setPlayerMatch(null); ``
        }, 1000);
        history.back()
    }, []);
    useEffect(() => {

        if (tournament?.config) {
            const maxPlayers = tournament.config.maxPlayers ?? 1;
            // if (maxPlayers === 1) {
            //     setProgress(1);
            //     return;
            // }

            const tl = gsap.timeline({
                onComplete: () => {
                    console.log("tournament play loadComplete complete");
                    setProgress(1);
                }
            });
            console.log("tournament play matching", matchingRef.current);
            tl.to(matchingRef.current, { autoAlpha: 1, duration: 0.3 }, "+=2");

            tl.play();
        }

    }, [tournament]);

    useEffect(() => {

        if (playerMatch && tournament?.config && progress === 1) {
            const maxPlayers = tournament.config.maxPlayers ?? 1;
            const tl = gsap.timeline({
                onComplete: () => {
                    setProgress(0);
                }
            });

            tl.to(matchingCompleteRef.current, { autoAlpha: 1, duration: 0.3 }, "+=3");
            // if (maxPlayers > 1) {
            tl.to(matchingRef.current, { autoAlpha: 0, duration: 0.3 }, "<");
            // tl.to(loadingRef.current, { autoAlpha: 0, duration: 0 }, "<");
            // }
            tl.to(matchingCompleteRef.current, { autoAlpha: 0, duration: 0.5 }, "+=2");
            tl.call(() => {
                setMatchReady(true);
            }, undefined, ">=-0.5");
            tl.play();
        }
    }, [playerMatch, tournament, progress]);


    useEffect(() => {
        const joinTournament = async () => {
            try {
                if (tournament && convex) {
                    const result = await convex.mutation(api.service.tournament.tournamentService.join, { uid: "kkk", tournamentId: tournament.tournamentId, typeId: tournament.typeId });
                    console.log("tournament play join result", result);
                    if (result.ok && result.playerMatch) {
                        setPlayerMatch(result.playerMatch);
                    }
                }
            } catch (error) {
                console.error("tournament play join error", error);
            }
        }
        if (tournament) {
            joinTournament();
        }
    }, [tournament]);

    const renderContent = useMemo(() => {

        return (
            <div className="match-play-container">
                {matchReady ? <MatchHome match={playerMatch} onGameLoadComplete={onGameLoadComplete} onScoreSubmit={onScoreSubmit} /> : null}
            </div>

        )
    }, [playerMatch, matchReady]);
    return <>

        <div ref={matchingCompleteRef} className="battle-complete">
            <span>Matching Complete</span>
        </div>
        <div ref={loadingRef} className="tournament-loading">
            <div>Match Loading...</div>
        </div>
        <div ref={matchingRef} className="match-in-progress">
            <span>Matching...</span>
        </div>
        {renderContent}
    </>

};
const TournamentPlay: React.FC<PageProp> = ({ visible, data }) => {

    const client = React.useMemo(() => new ConvexReactClient(convex_url), [convex_url]);

    return (
        <>
            <ConvexProvider client={client}>
                <div className="tournament-play-container">
                    {data ? <TournamentMain tournament={data} /> : null}
                </div>
            </ConvexProvider>
        </>
    );
};

export default TournamentPlay;