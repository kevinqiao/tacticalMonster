/**
 * 3D 伤害数字 - 占位，后续可扩展为 3D 空间内的浮动文字
 */

import { Html } from "@react-three/drei";
import React from "react";

interface DamageNumber3DProps {
    position: [number, number, number];
    value: number;
    isHeal?: boolean;
}

export const DamageNumber3D: React.FC<DamageNumber3DProps> = ({ position, value, isHeal }) => {
    return (
        <Html position={position} center style={{ pointerEvents: "none" }}>
            <div
                style={{
                    fontSize: 24,
                    fontWeight: "bold",
                    color: isHeal ? "#4caf50" : "#ff4444",
                    textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
                }}
            >
                {isHeal ? "+" : "-"}
                {Math.abs(value)}
            </div>
        </Html>
    );
};
