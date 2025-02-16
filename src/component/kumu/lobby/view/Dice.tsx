// Dice.tsx
import { useCombatManager } from 'component/ludo/battle/service/CombatManager';
import { gsap } from 'gsap';
import React, { useCallback, useMemo, useRef } from 'react';
import './dice.css';
// 定义每个骰子面对应的最终旋转角度（单位：度）
// 注意：这里只定义 X 与 Y 轴旋转角度，实际动画中还可以添加额外的全旋转效果
const faceTransforms: { [key: number]: { rotationX: number; rotationY: number } } = {
    1: { rotationX: 0, rotationY: 0 },
    2: { rotationX: 0, rotationY: -90 },
    3: { rotationX: 0, rotationY: -180 },
    4: { rotationX: 0, rotationY: 90 },
    5: { rotationX: -90, rotationY: 0 },
    6: { rotationX: 90, rotationY: 0 },
};

const Dice: React.FC<{ size: number, seatNo: number }> = ({ size, seatNo }) => {
    const cubeRef = useRef<HTMLDivElement>(null);
    const { game } = useCombatManager();
    const seat = useMemo(() => {
        return game?.seats.find(seat => seat.no === seatNo);
    }, [game, seatNo]);
    const rollDice = useCallback(() => {
        // if (!cubeRef.current) return;
        if (!seat?.diceEle) return;

        // 随机生成结果 1 ~ 6
        const randomResult: number = Math.floor(Math.random() * 6) + 1;
        const finalRotation = faceTransforms[randomResult];

        // 使用 GSAP 创建动画时间轴
        const tl = gsap.timeline({
            onComplete: () => {
                // 动画结束后，更新状态，允许再次点击
            }
        });

        // 第一阶段：快速摇动（旋转两圈以上，可根据需要调整角度与持续时间）
        tl.to(seat.diceEle, {
            duration: 2,
            rotationX: "+=720", // 累计旋转720度
            rotationY: "+=720",
            ease: "power3.inOut"
        });

        // 第二阶段：缓慢旋转到目标角度
        // 此处在目标角度上再加上额外的全圈旋转，让动画看起来更自然
        // tl.to(seat.diceEle, {
        //     duration: 1,
        //     rotationX: finalRotation.rotationX + 720, // 最终旋转角度 + 补充旋转
        //     rotationY: finalRotation.rotationY + 720,
        //     ease: "power3.out"
        // });
    }, [seat]);

    return (
        <div
            style={
                {
                    '--dice-size': `${size}px`,
                    '--dot-size': `${Math.max(10, size * 0.13)}px`
                } as React.CSSProperties
            }
            onClick={rollDice}
        >

            {seat && <div className="scene">
                <div className="cube" ref={el => seat.diceEle = el}>
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
                </div>
            </div>}

        </div>
    );
};

export default Dice;
