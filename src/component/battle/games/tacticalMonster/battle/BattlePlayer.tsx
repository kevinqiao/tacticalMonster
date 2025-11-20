/**
 * Tactical Monster 战斗主界面组件
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useUserManager } from "service/UserManager";
import useCombatActHandler from "./service/handler/useCombatActHandler";
import useEventListener from "./service/useEventListener";
import { Skill } from "./types/CharacterTypes";
import { useCombatManager } from "./service/CombatManager";
import CharacterGrid from "./view/CharacterGrid";
import GridGround from "./view/GridGround";
import ObstacleGrid from "./view/ObstacleGrid";
import "./style.css";

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
    const { user } = useUserManager();
    const { challengee } = useCombatManager();
    return (
        <div className="plaza-container" style={{ transform: `scaleX(${user && user.uid === challengee ? -1 : 1})` }}>
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
    useEventListener();

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
}

const BattlePlayer: React.FC<BattlePlayerProps> = ({ gameId }) => {
    if (!gameId) return null;

    return <BattleVenue />;
};

export default BattlePlayer;


