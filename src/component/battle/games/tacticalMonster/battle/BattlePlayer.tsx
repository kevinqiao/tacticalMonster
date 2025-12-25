/**
 * Tactical Monster 战斗主界面组件
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ReplayScoreDisplay } from "./components/ReplayScoreDisplay";
import { useScoreCalculation } from "./hooks/useScoreCalculation";
import { useCombatManager } from "./service/CombatManager";
import useCombatActHandler from "./service/handler/useCombatActHandler";
import useEventHandler from "./service/handler/useEventHandler";
import "./style.css";
import { Skill } from "./types/CharacterTypes";
import CharacterGrid from "./view/CharacterGrid";
import GridGround from "./view/GridGround";
import ObstacleGrid from "./view/ObstacleGrid";
import { ReplayControls } from "./view/ReplayControls";

const ScoreDisplay: React.FC = () => {
    const { score, gameReport, game, gameId, mode, processedEvents } = useCombatManager();

    // ✅ 使用共享计分服务（play/watch 模式）
    const {
        currentScore,
        checkGameResult,
        calculateFinalScore
    } = useScoreCalculation(
        gameId || null,
        game ? {
            team: game.characters?.filter(c => c.uid !== "boss").map(c => ({
                stats: { hp: c.stats?.hp }
            })) || [],
            boss: {
                stats: { hp: game.characters?.find(c => c.uid === "boss")?.stats?.hp },
                minions: game.characters?.filter(c => c.uid === "boss").slice(1).map(c => ({
                    stats: { hp: c.stats?.hp }
                })) || []
            },
            createdAt: (game as any).createdAt || new Date().toISOString(),
            scoringConfigVersion: (game as any).scoringConfigVersion
        } : null,
        (mode === 'watch' && processedEvents) ? processedEvents : [],  // ✅ Watch 模式：传递已处理的事件用于实时计算分数
        (mode || 'play') as 'play' | 'watch' | 'replay'
    );

    // ✅ 检查游戏结果
    const gameResult = game ? checkGameResult() : null;

    // ✅ 计算最终得分（如果游戏结束）
    const finalScore = (gameResult?.isGameOver && game) ? (() => {
        const gameStartTime = (game as any).createdAt
            ? new Date((game as any).createdAt).getTime()
            : Date.now();
        const timeElapsed = Date.now() - gameStartTime;
        const roundsUsed = game.currentRound?.no || 0;

        // 计算存活统计
        const team = game.characters?.filter(c => c.uid !== "boss") || [];
        const survivalStats = {
            totalCharacters: team.length,
            aliveCharacters: team.filter(c => (c.stats?.hp?.current || 0) > 0).length,
            deadCharacters: team.filter(c => (c.stats?.hp?.current || 0) <= 0).length,
            averageHpPercentage: team.length > 0
                ? team.reduce((sum, c) => {
                    const current = c.stats?.hp?.current || 0;
                    const max = c.stats?.hp?.max || 1;
                    return sum + (current / max);
                }, 0) / team.length
                : 0,
            minHpPercentage: team.length > 0
                ? Math.min(...team.map(c => {
                    const current = c.stats?.hp?.current || 0;
                    const max = c.stats?.hp?.max || 1;
                    return max > 0 ? current / max : 0;
                }))
                : 1.0,
            perfectSurvival: team.length > 0 && team.every(c => (c.stats?.hp?.current || 0) > 0)
        };

        return calculateFinalScore(
            currentScore || score,
            timeElapsed,
            roundsUsed,
            gameResult!.result,
            survivalStats
        );
    })() : null;

    return (
        <div style={{
            position: "absolute",
            top: 20,
            right: 20,
            padding: "10px 20px",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            color: "white",
            borderRadius: "8px",
            fontSize: "18px",
            fontWeight: "bold",
            zIndex: 1000,
            minWidth: "200px"
        }}>
            <div style={{ marginBottom: "8px" }}>
                <div>Score: <span style={{ color: "#4CAF50" }}>{currentScore || score}</span></div>
                {gameResult && gameResult.isGameOver && (
                    <div style={{ fontSize: "14px", marginTop: "5px", color: gameResult.result === 1 ? "#4CAF50" : "#f44336" }}>
                        {gameResult.reason}
                    </div>
                )}
            </div>

            {/* ✅ 显示最终得分详情（游戏结束时） */}
            {finalScore && gameResult && (
                <div style={{ marginTop: "10px", fontSize: "14px", borderTop: "1px solid rgba(255,255,255,0.3)", paddingTop: "10px" }}>
                    <div>Base: {finalScore.baseScore}</div>
                    {finalScore.timeBonus > 0 && <div>Time Bonus: +{finalScore.timeBonus}</div>}
                    {finalScore.roundBonus > 0 && <div>Round Bonus: +{finalScore.roundBonus}</div>}
                    {finalScore.survivalBonus > 0 && <div>Survival Bonus: +{finalScore.survivalBonus}</div>}
                    {finalScore.resultScore !== 0 && (
                        <div style={{ color: finalScore.resultScore > 0 ? "#4CAF50" : "#f44336" }}>
                            Result: {finalScore.resultScore > 0 ? '+' : ''}{finalScore.resultScore}
                        </div>
                    )}
                    <div style={{ marginTop: "5px", borderTop: "1px solid rgba(255,255,255,0.3)", paddingTop: "5px", fontWeight: "bold" }}>
                        Total: {finalScore.totalScore}
                    </div>
                </div>
            )}

            {/* ✅ 显示游戏报告（如果有） */}
            {gameReport && !finalScore && (
                <div style={{ marginTop: "10px", fontSize: "14px" }}>
                    <div>Base: {gameReport.baseScore}</div>
                    {gameReport.timeBonus && <div>Time Bonus: {gameReport.timeBonus}</div>}
                    {gameReport.completeBonus && <div>Complete Bonus: {gameReport.completeBonus}</div>}
                    <div style={{ marginTop: "5px", borderTop: "1px solid white", paddingTop: "5px" }}>
                        Total: {gameReport.totalScore}
                    </div>
                </div>
            )}
        </div>
    );
};

const CombatActPanel: React.FC = () => {
    const { activeSkill, currentRound, characters } = useCombatManager();
    const [activeListOpen, setActiveListOpen] = useState(false);
    const [activeSkills, setActiveSkills] = useState<Skill[] | null>(null);
    const { selectSkill, gameOver } = useCombatActHandler();

    const handleSelectSkill = useCallback((skill: Skill) => {
        setActiveListOpen(false);
        selectSkill(skill);
    }, [selectSkill]);

    useEffect(() => {
        if (currentRound && characters && activeSkill) {
            const currentTurn = currentRound?.turns?.find((t: any) => t.status >= 0 && t.status <= 2);
            if (currentTurn?.skills) {
                const character = characters.find((c) => c.uid === currentTurn.uid && c.character_id === currentTurn.character_id);
                if (character) {
                    const skills = character.skills?.filter((s) => currentTurn.skills?.includes(s.id));
                    if (skills && skills.length > 0) {
                        setActiveSkills(skills);
                    }
                }
            }
        }
    }, [activeSkill, characters, currentRound]);

    return (
        <div className="action-control" style={{ left: -40, bottom: -40, pointerEvents: "auto" }}>
            {activeSkill && (
                <div className="action-panel-item" onClick={() => setActiveListOpen((pre) => !pre)}>
                    {activeSkill.name}
                </div>
            )}
            <div className="action-panel-item">STANDBY</div>
            <div className="action-panel-item">DEFEND</div>
            {activeListOpen && activeSkills && (
                <div style={{ position: "absolute", top: 45, left: 0, width: "100%", height: 40 }}>
                    {activeSkills.filter((skill) => skill.id !== activeSkill?.id).map((skill, index) => (
                        <div className="action-panel-item" key={skill.id} onClick={() => handleSelectSkill(skill)}>
                            {skill.name}
                        </div>
                    ))}
                </div>
            )}
            <div className="action-panel-item" onClick={() => gameOver()}>GAME OVER</div>
        </div>
    );
};

const CombatPlaza: React.FC<{ position: { top: number; left: number; width: number; height: number } }> = ({ position }) => {
    return (
        <div className="plaza-container">
            {position && (
                <>
                    <div className="plaza-layer" style={{ top: 0, left: 0 }}>
                        {position && <ObstacleGrid position={position} />}
                    </div>
                    <div className="plaza-layer" style={{ top: 0, left: 0 }}>
                        {position && <GridGround position={position} />}
                    </div>
                    <div className="plaza-layer" style={{ top: 0, left: 0, pointerEvents: "none" }}>
                        {position && <CharacterGrid position={position} />}
                    </div>
                </>
            )}
        </div>
    );
};

const BattleVenue: React.FC = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [placePosition, setPlacePosition] = useState<{
        top: number;
        left: number;
        width: number;
        height: number;
    } | null>(null);
    const [mapPosition, setMapPosition] = useState<{
        top: number;
        left: number;
        width: number;
        height: number;
    } | null>(null);
    const [gridPosition, setGridPosition] = useState<{
        top: number;
        left: number;
        width: number;
        height: number;
    } | null>(null);

    const { map, changeCell } = useCombatManager();
    useEventHandler();

    useEffect(() => {
        if (!map || map.cols === 0 || map.rows === 0) return;
        const { rows, cols } = map;

        const mapRatio = ((cols + 0.5) * Math.sqrt(3)) / 2 / (2 + ((rows - 1) * 3) / 4);

        const updateMap = () => {
            if (containerRef.current) {
                const windowRatio = window.innerWidth / window.innerHeight;
                const plazaSize: { width: number; height: number } = { width: 0, height: 0 };

                if (mapRatio < windowRatio) {
                    plazaSize.width = window.innerHeight * mapRatio;
                    plazaSize.height = window.innerHeight;
                } else {
                    plazaSize.width = window.innerWidth;
                    plazaSize.height = window.innerWidth / mapRatio;
                }

                const mapHeight = plazaSize.height * 0.8;
                const hexHeight = mapHeight / (2 + ((rows - 1) * 3) / 4);
                const hexWidth = (hexHeight * Math.sqrt(3)) / 2;
                const mapWidth = hexWidth * (cols + 0.5);

                const mapLeft = (plazaSize.width - mapWidth) / 2 + 0.25 * hexWidth;
                const mapTop = (plazaSize.height - mapHeight) / 2;
                changeCell({ width: hexWidth, height: hexHeight });

                setMapPosition({
                    top: mapTop,
                    left: mapLeft,
                    width: mapWidth,
                    height: mapHeight
                });

                setGridPosition({
                    top: hexHeight / 2,
                    left: 0,
                    width: mapWidth,
                    height: mapHeight - hexHeight / 2
                });

                const plazaLeft = (window.innerWidth - plazaSize.width) / 2;
                const plazaTop = (window.innerHeight - plazaSize.height) / 2;
                setPlacePosition({ top: plazaTop, left: plazaLeft, width: plazaSize.width, height: plazaSize.height });
            }
        };

        updateMap();
        window.addEventListener("resize", updateMap);
        return () => window.removeEventListener("resize", updateMap);
    }, [map, changeCell]);

    return (
        <div className="battle-container">
            <ScoreDisplay />
            <div
                ref={containerRef}
                style={{
                    position: "absolute",
                    ...placePosition,
                }}
            >
                <div style={{ position: "absolute", ...mapPosition }}>
                    {gridPosition && <CombatPlaza position={gridPosition} />}
                </div>
                <div style={{ position: "absolute", ...mapPosition, pointerEvents: "none" }}>
                    <CombatActPanel />
                </div>
            </div>
        </div>
    );
};

interface BattlePlayerProps {
    gameId?: string;
    mode?: 'play' | 'watch' | 'replay';
}

const BattlePlayer: React.FC<BattlePlayerProps> = ({ gameId, mode = 'play' }) => {
    const { game, replay } = useCombatManager();
    const [currentEventIndex, setCurrentEventIndex] = useState(0);
    const [allEvents, setAllEvents] = useState<any[]>([]);

    // ✅ 监听重播状态变化，更新当前事件索引和事件列表
    useEffect(() => {
        if (mode === 'replay' && replay?.state) {
            setCurrentEventIndex(replay.state.currentIndex || 0);
            // ✅ 获取所有事件用于计分计算
            if (replay && 'getAllEvents' in replay && typeof replay.getAllEvents === 'function') {
                const events = replay.getAllEvents();
                setAllEvents(events);
            }
        }
    }, [mode, replay?.state?.currentIndex, replay]);

    if (!gameId) return null;

    return (
        <>
            <BattleVenue />
            {/* ✅ 重播控制 UI（仅在 replay 模式显示） */}
            {mode === 'replay' && <ReplayControls />}
            {/* ✅ 重播计分显示（仅在 replay 模式显示） */}
            {mode === 'replay' && game && allEvents.length > 0 && (
                <ReplayScoreDisplay
                    gameId={gameId}
                    game={{
                        team: game.characters?.filter(c => c.uid !== "boss").map(c => ({
                            stats: { hp: c.stats?.hp }
                        })) || [],
                        boss: {
                            stats: { hp: game.characters?.find(c => c.uid === "boss")?.stats?.hp },
                            minions: game.characters?.filter(c => c.uid === "boss").slice(1).map(c => ({
                                stats: { hp: c.stats?.hp }
                            })) || []
                        },
                        createdAt: (game as any).createdAt || new Date().toISOString(),
                        scoringConfigVersion: (game as any).scoringConfigVersion
                    }}
                    events={allEvents}
                    currentEventIndex={currentEventIndex}
                />
            )}
        </>
    );
};

export default BattlePlayer;


