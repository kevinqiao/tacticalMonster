import MatchHome from "component/battle/MatchHome";
import { useQuery } from "convex/react";
import { api } from "convex/tournament/convex/_generated/api";
import gsap from "gsap";
import React, { useCallback, useEffect, useRef, useState } from "react";
import "./style.css";

const TournamentPlay: React.FC<{ tournament: any }> = (props) => {
    const loadingRef = useRef<HTMLDivElement | null>(null);
    const matchingRef = useRef<HTMLDivElement | null>(null);
    const matchingCompleteRef = useRef<HTMLDivElement | null>(null);
    const matchPlayRef = useRef<HTMLDivElement | null>(null);
    const [matchReady, setMatchReady] = useState(true);

    const matchingResult = useQuery(api.service.tournament.matchManager.findMatch, { tournamentType: props.tournament?.typeId, uid: "kkk" });
    const onGameLoadComplete = useCallback(() => {
        console.log("onGameLoadComplete");

        const tl = gsap.timeline();
        tl.to(matchingCompleteRef.current, { autoAlpha: 0, duration: 1 });
        tl.to(matchPlayRef.current, { autoAlpha: 1, duration: 1 }, "<");
        tl.play();
    }, []);
    useEffect(() => {
        if (props.tournament.config) {
            const maxPlayers = props.tournament.config.maxPlayers;
            if (maxPlayers > 1) {
                gsap.set(matchingRef.current, { autoAlpha: 1 });
            } else {
                gsap.set(loadingRef.current, { autoAlpha: 1 });
            }
        }

    }, [props.tournament]);
    useEffect(() => {
        if (matchingResult?.ok) {
            const match = matchingResult?.match;
            console.log("match", match);
            // gsap.set(matchPlayRef.current, { autoAlpha: 1 });
            const tl = gsap.timeline({
                onComplete: () => {
                    setMatchReady(true);
                }
            });
            tl.to(matchingCompleteRef.current, { autoAlpha: 1, duration: 1 }, ">=+2");
            // tl.to(matchingRef.current, { autoAlpha: 0, duration: 1 });
            // tl.to(loadingRef.current, { autoAlpha: 0, duration: 1 }, "<");
            tl.play();
        }
    }, [matchingResult]);

    return (
        <>
            <div ref={loadingRef} className="match-loading">
                <div>Loading...</div>
            </div>
            <div ref={matchingRef} className="match-in-progress">
                <span>Matching...</span>
            </div>
            <div ref={matchingCompleteRef} className="match-complete">
                <span>Matching Complete</span>
            </div>
            <div ref={matchPlayRef} className="match-play">
                {matchReady && <MatchHome match={matchingResult?.match} onGameLoadComplete={onGameLoadComplete} />}
            </div>
        </>
    );
};

export default TournamentPlay;