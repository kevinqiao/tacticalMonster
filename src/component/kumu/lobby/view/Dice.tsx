// Dice.tsx
import { useCombatManager } from 'component/ludo/battle/service/CombatManager';
import useCombatAct from 'component/ludo/battle/service/useCombatAct';
import { gsap } from 'gsap';
import React, { useMemo, useRef } from 'react';
import './dice.css';

// 定义各个骰子面对应的目标旋转角度（单位：度）
// 这里只定义 X 与 Y 轴旋转角度，实际动画中可以额外加入全圈旋转让动画更自然
const faceTransforms: { [key: number]: { rotationX: number; rotationY: number } } = {
    1: { rotationX: 0, rotationY: 0 },
    2: { rotationX: 0, rotationY: -90 },
    3: { rotationX: 0, rotationY: -180 },
    4: { rotationX: 0, rotationY: 90 },
    5: { rotationX: -90, rotationY: 0 },
    6: { rotationX: 90, rotationY: 0 },
};

const Dice: React.FC<{ seatNo: number, size: number }> = ({ seatNo, size }) => {
    const cubeRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<gsap.core.Timeline | null>(null);
    const currentRotationRef = useRef({ x: 0, y: 0 }); // 跟踪当前旋转值
    const { game } = useCombatManager();
    const { roll } = useCombatAct();
    console.log(seatNo, size)
    const seat = useMemo(() => game?.seats.find((s: any) => s.no === seatNo), [game, seatNo]);
    console.log("seat", seat)
    const rollDice = () => {
        if (animationRef.current) {
            const rotationX = gsap.getProperty(cubeRef.current, "rotationX") as number;
            const rotationY = gsap.getProperty(cubeRef.current, "rotationY") as number;
            currentRotationRef.current = {
                x: rotationX,
                y: rotationY
            };

            animationRef.current.kill();
            animationRef.current = null;
            stopAtValue(Math.floor(Math.random() * 6) + 1);
            return;
        }

        if (!cubeRef.current) return;

        // 重置当前位置，确保新动画从当前位置开始
        const currentX = gsap.getProperty(cubeRef.current, "rotationX") as number;
        const currentY = gsap.getProperty(cubeRef.current, "rotationY") as number;
        gsap.set(cubeRef.current, {
            rotationX: currentX % 360,
            rotationY: currentY % 360
        });

        const tl = gsap.timeline({
            repeat: -1,
            repeatDelay: 0,
            ease: 'none',
            onUpdate: () => {
                const rotationX = gsap.getProperty(cubeRef.current, "rotationX") as number;
                const rotationY = gsap.getProperty(cubeRef.current, "rotationY") as number;
                currentRotationRef.current = {
                    x: rotationX,
                    y: rotationY
                };
            }
        });

        tl.to(cubeRef.current, {
            duration: 2,
            rotationX: '+=720',
            rotationY: '+=720'
        });

        animationRef.current = tl;
    };

    const stopAtValue = (value: number) => {
        if (!cubeRef.current) return;

        const finalRotation = faceTransforms[value];
        const { x, y } = currentRotationRef.current;

        // 计算最近的完整旋转圈数
        const fullRotationsX = Math.floor(x / 360) * 360;
        const fullRotationsY = Math.floor(y / 360) * 360;

        // 确保最终旋转至少多转一圈
        gsap.to(cubeRef.current, {
            duration: 1.5,
            rotationX: fullRotationsX + finalRotation.rotationX + 360,
            rotationY: fullRotationsY + finalRotation.rotationY + 360,
            ease: "power3.out"
        });
    };

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
