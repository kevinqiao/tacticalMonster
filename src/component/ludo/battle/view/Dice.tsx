// Dice.tsx
import useCombatAct from 'component/ludo/battle/service/useCombatAct';
import gsap from 'gsap';
import React, { useEffect } from 'react';
import { faceTransforms } from '../animation/useDiceAnimate';
import { Seat } from '../types/CombatTypes';
import './dice.css';
const strokeWidth = 4;
const CountDownDice: React.FC<{ seat: Seat, size: number }> = ({ seat, size }) => {
    const side = size - strokeWidth;
    const perimeter = 4 * side;
    const x = strokeWidth / 2;
    const y = strokeWidth / 2;

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, pointerEvents: 'none' }}>
            {seat?.tokens && seat.tokens.length > 0 && <svg width={size} height={size}>
                <path
                    ref={el => seat.countDownEle = el}
                    d={`M ${x} ${y} 
                       h ${side} 
                       v ${side} 
                       h ${-side} 
                       v ${-side}`}
                    fill="none"
                    stroke="red"
                    strokeWidth={strokeWidth}
                    strokeDasharray={perimeter}
                    strokeDashoffset={perimeter}
                />
            </svg>}
        </div>
    );
};
const DiceCore: React.FC<{ seat: Seat, size: number }> = ({ seat, size }) => {
    const { roll } = useCombatAct();
    useEffect(() => {
        if (seat.diceEle) {
            const finalRotation = faceTransforms[seat.dice ?? 1];
            gsap.set(seat.diceEle, {
                rotationX: finalRotation.rotationX,
                rotationY: finalRotation.rotationY
            });
            console.log("seat.diceEle loaded", seat.no)
        }
    }, [seat]);
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

const Dice: React.FC<{ seat: Seat, size: number }> = ({ seat, size }) => {


    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <DiceCore seat={seat} size={size} />
            <CountDownDice seat={seat} size={size} />
        </div>
    );
};

export default Dice;
