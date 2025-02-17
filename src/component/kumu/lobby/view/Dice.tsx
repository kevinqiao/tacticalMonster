// Dice.tsx
import { useCombatManager } from 'component/ludo/battle/service/CombatManager';
import useCombatAct from 'component/ludo/battle/service/useCombatAct';
import React, { useMemo } from 'react';
import './dice.css';

const Dice: React.FC<{ seatNo: number, size: number }> = ({ seatNo, size }) => {
    const { game } = useCombatManager();
    const { roll } = useCombatAct();
    const seat = useMemo(() => game?.seats.find((s: any) => s.no === seatNo), [game, seatNo]);

    return (
        <div
            style={
                {
                    '--dice-size': `${size}px`,
                    '--dot-size': `${Math.max(10, size * 0.13)}px`
                } as React.CSSProperties
            }
            onClick={roll}
        >
            <div className="scene">
                {/* 使用 ref 绑定 cube 节点，动画由 GSAP 控制 */}
                {seat && <div className="cube" ref={el => seat.diceEle = el}>
                    {/* 面 1 */}
                    <div className="face face1">
                        <div className="dot-grid">
                            <span className="dot middle-center"></span>
                        </div>
                    </div>
                    {/* 面 2 */}
                    <div className="face face2">
                        <div className="dot-grid">
                            <span className="dot top-left"></span>
                            <span className="dot bottom-right"></span>
                        </div>
                    </div>
                    {/* 面 3 */}
                    <div className="face face3">
                        <div className="dot-grid">
                            <span className="dot top-left"></span>
                            <span className="dot middle-center"></span>
                            <span className="dot bottom-right"></span>
                        </div>
                    </div>
                    {/* 面 4 */}
                    <div className="face face4">
                        <div className="dot-grid">
                            <span className="dot top-left"></span>
                            <span className="dot top-right"></span>
                            <span className="dot bottom-left"></span>
                            <span className="dot bottom-right"></span>
                        </div>
                    </div>
                    {/* 面 5 */}
                    <div className="face face5">
                        <div className="dot-grid">
                            <span className="dot top-left"></span>
                            <span className="dot top-right"></span>
                            <span className="dot middle-center"></span>
                            <span className="dot bottom-left"></span>
                            <span className="dot bottom-right"></span>
                        </div>
                    </div>
                    {/* 面 6 */}
                    <div className="face face6">
                        <div className="dot-grid">
                            <span className="dot top-left"></span>
                            <span className="dot middle-left"></span>
                            <span className="dot bottom-left"></span>
                            <span className="dot top-right"></span>
                            <span className="dot middle-right"></span>
                            <span className="dot bottom-right"></span>
                        </div>
                    </div>
                </div>}
            </div>

        </div>
    );
};

export default Dice;
