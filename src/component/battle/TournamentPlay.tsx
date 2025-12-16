import { PageProp } from "component/RenderApp";
import { ConvexProvider, ConvexReactClient, useConvex, useQuery } from "convex/react";
import { api as tacticalMonsterApi } from "convex/tacticalMonster/convex/_generated/api";
import { api as tournamentApi } from "convex/tournament/convex/_generated/api";
import gsap from "gsap";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MatchHome from "./MatchHome";
import { PlayerMatch } from "./MatchTypes";
import "./style.css";
const tournament_convex_url = "https://beloved-mouse-699.convex.cloud";
const tacticalMonster_convex_url = "https://shocking-leopard-487.convex.cloud";
const TournamentMain: React.FC<{ tournament: any }> = ({ tournament }) => {
    console.log("tournament play tournament", tournament);
    const loadingRef = useRef<HTMLDivElement | null>(null);
    const matchingRef = useRef<HTMLDivElement | null>(null);
    const matchingCompleteRef = useRef<HTMLDivElement | null>(null);
    // const matchPlayRef = useRef<HTMLDivElement | null>(null);
    const [progress, setProgress] = useState(0);
    const [matchReady, setMatchReady] = useState(false);
    const [playerMatch, setPlayerMatch] = useState<PlayerMatch | null>(null);
    const tournamentConvex = useConvex();
    const matchingResult = useQuery(tournamentApi.service.tournament.matchManager.findTournamentMatch, { typeId: tournament?.typeId, uid: "kkk" });
    const onGameLoadComplete = useCallback(() => {

    }, []);
    const onMatchOver = useCallback(() => {
        setTimeout(() => {
            setMatchReady(false);
            setPlayerMatch(null);
        }, 1000);
        history.back()
    }, []);
    useEffect(() => {
        console.log("tournament play matchingResult", matchingResult);
    }, [matchingResult]);
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
                if (tournament) {
                    // 使用 TacticalMonster 模块的客户端来加入锦标赛
                    // 注意：joinTournamentMatching 是 action，需要使用 action 调用
                    const tacticalMonsterClient = new ConvexReactClient(tacticalMonster_convex_url);
                    const result = await tacticalMonsterClient.action(
                        tacticalMonsterApi.service.game.gameMatchingService.joinTournamentMatching,
                        {
                            uid: "kkk", // TODO: 从用户上下文获取真实 uid
                            tournamentType: tournament.typeId,
                            tournamentId: tournament.tournamentId,
                            tier: undefined, // 可选，会被后端验证覆盖
                        }
                    );
                    console.log("tournament play join result", result);
                    if (result.ok) {
                        // TacticalMonster 返回 { ok, gameId, matchId, inQueue }
                        // 如果需要 playerMatch，从 Tournament 模块查询
                        if (result.gameId) {
                            try {
                                const matchResult = await tournamentConvex.query(
                                    tournamentApi.service.tournament.matchManager.findGameMatch,
                                    { gameId: result.gameId }
                                );
                                if (matchResult) {
                                    setPlayerMatch(matchResult as any);
                                }
                            } catch (queryError) {
                                console.warn("查询 match 详情失败，使用基本匹配信息:", queryError);
                                // 即使查询失败，也可以继续使用基本匹配信息
                            }
                        }
                    } else {
                        console.error("加入锦标赛失败:", result.error);
                    }
                }
            } catch (error) {
                console.error("tournament play join error", error);
            }
        }
        if (tournament) {
            joinTournament();
        }
    }, [tournament, tournamentConvex]);

    const renderContent = useMemo(() => {

        return (
            <div className="match-play-container">
                {matchReady ? <MatchHome match={playerMatch} onGameLoadComplete={onGameLoadComplete} onMatchOver={onMatchOver} /> : null}
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
    // Tournament 模块客户端（用于查询状态和匹配信息）
    const tournamentClient = React.useMemo(() => new ConvexReactClient(tournament_convex_url), []);

    return (
        <>
            {/* 使用 Tournament 客户端作为主 Provider（用于查询） */}
            <ConvexProvider client={tournamentClient}>
                <div className="tournament-play-container">
                    {data ? <TournamentMain tournament={data} /> : null}
                </div>
            </ConvexProvider>
        </>
    );
};

export default TournamentPlay;