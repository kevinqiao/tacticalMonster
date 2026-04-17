/**
 * StageGrid 组件
 * 显示 stage 中的 obstacles、boss/minions 和 disables 区域
 */

import gsap from "gsap";
import React, { useEffect, useRef, useState } from "react";
import { useTeamDeployManager } from "../service/TeamDeployManager";
import { hexToPixel } from "../utils/coordinateUtils";

/**
 * 障碍物单元格
 */
const ObstacleCell: React.FC<{ q: number; r: number; type: number; asset: string }> = ({ q, r, type, asset }) => {
    const { mapDimension } = useTeamDeployManager();
    const [infoVisible, setInfoVisible] = useState(true);

    const position = React.useMemo(() => {
        if (!mapDimension) return { x: 0, y: 0 };
        const pixelPos = hexToPixel(q, r, mapDimension);
        if (pixelPos) {
            const x = pixelPos.x - mapDimension.hexWidth / 2;
            const y = pixelPos.y - mapDimension.hexHeight / 2;
            return { x, y };
        }
        return { x: 0, y: 0 };
    }, [q, r, mapDimension]);

    return (
        <div
            className="stage-obstacle-cell"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${mapDimension?.hexWidth || 0}px`,
                height: `${mapDimension?.hexHeight || 0}px`,
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                backgroundColor: "rgba(92, 41, 4, 0.7)", // 棕色半透明
                border: "2px solid rgb(22, 158, 9)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                transform: `translate(${position.x}px, ${position.y}px)`,
            }}
            onClick={() => setInfoVisible(!infoVisible)}
            onMouseEnter={() => setInfoVisible(true)}
            onMouseLeave={() => setInfoVisible(false)}
        >
            <span style={{ color: "white", fontSize: "12px", fontWeight: "bold" }}>障碍物 (类型: {type})</span>
        </div>
    );
};

/**
 * Boss 位置单元格
 */
const BossCell: React.FC<{ q: number; r: number; bossId: string }> = ({ q, r, bossId }) => {
    const { mapDimension } = useTeamDeployManager();

    const position = React.useMemo(() => {
        if (!mapDimension) return { x: 0, y: 0 };
        const pixelPos = hexToPixel(q, r, mapDimension);
        if (pixelPos) {
            const x = pixelPos.x - mapDimension.hexWidth / 2;
            const y = pixelPos.y - mapDimension.hexHeight / 2;
            return { x, y };
        }
        return { x: 0, y: 0 };
    }, [q, r, mapDimension]);

    return (
        <div
            className="stage-boss-cell"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${mapDimension?.hexWidth || 0}px`,
                height: `${mapDimension?.hexHeight || 0}px`,
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                backgroundColor: "rgba(27, 190, 240,1)",
                border: "4px solid rgb(241, 232, 232)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                transform: `translate(${position.x}px, ${position.y}px)`,
            }}
        >
            <span style={{ color: "white", fontSize: "12px", fontWeight: "bold" }}>BOSS</span>
        </div>
    );
};

/**
 * Minion 位置单元格
 */
const MinionCell: React.FC<{ q: number; r: number; minionId: string }> = ({ q, r, minionId }) => {
    const { mapDimension } = useTeamDeployManager();
    const [infoVisible, setInfoVisible] = useState(false);

    const position = React.useMemo(() => {
        if (!mapDimension) return { x: 0, y: 0 };
        const pixelPos = hexToPixel(q, r, mapDimension);
        if (pixelPos) {
            const x = pixelPos.x - mapDimension.hexWidth / 2;
            const y = pixelPos.y - mapDimension.hexHeight / 2;
            return { x, y };
        }
        return { x: 0, y: 0 };
    }, [q, r, mapDimension]);

    return (
        <div
            className="stage-minion-cell"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${mapDimension?.hexWidth || 0}px`,
                height: `${mapDimension?.hexHeight || 0}px`,
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                backgroundColor: "rgba(255, 165, 0, 0.5)", // 橙色半透明
                border: "2px solid #FFA500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "auto",
                transform: `translate(${position.x}px, ${position.y}px)`,
            }}
            onClick={() => setInfoVisible(!infoVisible)}
            onMouseEnter={() => setInfoVisible(true)}
            onMouseLeave={() => setInfoVisible(false)}
        >
            <span style={{ color: "white", fontSize: "10px" }}>MIN</span>
            {infoVisible && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        marginTop: "4px",
                        padding: "4px 8px",
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        color: "white",
                        fontSize: "10px",
                        borderRadius: "4px",
                        whiteSpace: "nowrap",
                        zIndex: 1000,
                    }}
                >
                    Minion: {minionId}
                </div>
            )}
        </div>
    );
};

/**
 * 禁用区域单元格
 */
const DisableCell: React.FC<{ q: number; r: number }> = ({ q, r }) => {
    const { mapDimension } = useTeamDeployManager();
    const [infoVisible, setInfoVisible] = useState(false);

    const position = React.useMemo(() => {
        if (!mapDimension) return { x: 0, y: 0 };
        const pixelPos = hexToPixel(q, r, mapDimension);
        if (pixelPos) {
            const x = pixelPos.x - mapDimension.hexWidth / 2;
            const y = pixelPos.y - mapDimension.hexHeight / 2;
            return { x, y };
        }
        return { x: 0, y: 0 };
    }, [q, r, mapDimension]);

    return (
        <div
            className="stage-disable-cell"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${mapDimension?.hexWidth || 0}px`,
                height: `${mapDimension?.hexHeight || 0}px`,
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                backgroundColor: "rgba(128, 128, 128, 0.4)", // 灰色半透明
                border: "1px dashed #808080",
                cursor: "pointer",
                pointerEvents: "auto",
                transform: `translate(${position.x}px, ${position.y}px)`,
            }}
            onClick={() => setInfoVisible(!infoVisible)}
            onMouseEnter={() => setInfoVisible(true)}
            onMouseLeave={() => setInfoVisible(false)}
        >
            {infoVisible && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        marginTop: "4px",
                        padding: "4px 8px",
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        color: "white",
                        fontSize: "10px",
                        borderRadius: "4px",
                        whiteSpace: "nowrap",
                        zIndex: 1000,
                    }}
                >
                    禁用区域
                </div>
            )}
        </div>
    );
};

/**
 * 可部署区域单元格
 * 显示玩家可以部署怪物的区域
 */
const DeployableCell: React.FC<{ q: number; r: number }> = ({ q, r }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { playerMonsters, mapDimension } = useTeamDeployManager();

    const position = React.useMemo(() => {
        if (!mapDimension) return { x: 0, y: 0, visible: false };
        const pixelPos = hexToPixel(q, r, mapDimension);
        if (pixelPos) {
            const x = pixelPos.x - mapDimension.hexWidth / 2;
            const y = pixelPos.y - mapDimension.hexHeight / 2;
            return { x, y, visible: true };
        }
        return { x: 0, y: 0, visible: false };
    }, [q, r, mapDimension]);
    useEffect(() => {
        if (!containerRef.current) return;

        // 检查该位置是否有怪物（使用逻辑坐标比较）
        const hasMonster = playerMonsters?.some(
            (monster) => monster.teamPosition?.q === q && monster.teamPosition?.r === r
        );

        // 可部署区域应该显示空的位置，如果已有怪物则隐藏
        if (hasMonster) {
            gsap.set(containerRef.current, { autoAlpha: 0 });
        } else {
            gsap.set(containerRef.current, { autoAlpha: 1 });
        }
    }, [playerMonsters, q, r]);
    return (
        <div
            ref={containerRef}
            className="stage-deployable-cell"
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${mapDimension?.hexWidth || 0}px`,
                height: `${mapDimension?.hexHeight || 0}px`,
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
                backgroundColor: "rgba(0, 255, 0, 0.3)", // 绿色半透明
                border: "2px solid #00FF00",
                cursor: "pointer",
                pointerEvents: "auto",
                transform: `translate(${position.x}px, ${position.y}px)`,
                opacity: 1, // 初始状态可见
                visibility: "visible", // 初始状态可见
            }}
        >

            <div
                style={{
                    position: "absolute",
                    top: "100%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    marginTop: "4px",
                    padding: "4px 8px",
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    color: "white",
                    fontSize: "10px",
                    borderRadius: "4px",
                    whiteSpace: "nowrap",
                }}
            >
                可部署区域 ({q}, {r})
            </div>

        </div>
    );
};

/**
 * StageGrid 主组件
 */
const StageGrid: React.FC = () => {
    const { stage, boss, mapDimension, deployables } = useTeamDeployManager();
    console.log("StageGrid", stage, boss, mapDimension);
    // 如果没有 stage 数据，不渲染
    if (!stage || !mapDimension) {
        return null;
    }
    // 计算可部署区域
    // deployables 可能是一个中心点，需要计算周围的可部署区域
    // 这里先实现显示单个可部署单元格，后续可以根据需求扩展为区域



    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none", // 容器不拦截事件，但子元素可以
            }}
        >
            {/* 显示障碍物 */}
            {stage.map.obstacles?.map((obstacle, index) => (
                <ObstacleCell
                    key={`obstacle-${obstacle.q}-${obstacle.r}-${index}`}
                    q={obstacle.q}
                    r={obstacle.r}
                    type={obstacle.type}
                    asset={obstacle.asset}
                />
            ))}

            {/* 显示禁用区域 */}
            {stage.map.disables?.map((disable, index) => (
                <DisableCell
                    key={`disable-${disable.q}-${disable.r}-${index}`}
                    q={disable.q}
                    r={disable.r}
                />
            ))}

            {/* 显示 Boss 位置 */}
            {boss?.position && (
                <BossCell
                    q={boss.position.q}
                    r={boss.position.r}
                    bossId={stage.bossId}
                />
            )}

            {/* 显示 Minions 位置 */}
            {boss?.minions?.map((minion, index) => (
                <MinionCell
                    key={`minion-${minion.position.q}-${minion.position.r}-${index}`}
                    q={minion.position.q}
                    r={minion.position.r}
                    minionId={minion.monsterId || `minion-${index}`}
                />
            ))}

            {/* 显示可部署区域 */}
            {deployables.map((deployable, index) => (
                <DeployableCell
                    key={`deployable-${deployable.q}-${deployable.r}-${index}`}
                    q={deployable.q}
                    r={deployable.r}
                />
            ))}

        </div>
    );
};

export default StageGrid;
