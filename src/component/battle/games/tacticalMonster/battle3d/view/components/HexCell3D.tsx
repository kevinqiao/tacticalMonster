/**
 * 战斗 HexCell3D - 支持 walkable/attackable/path/selected 等战斗状态
 */

import { useFrame } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";

export type BattleCellState =
    | "normal"
    | "highlighted"
    | "disabled"
    | "walkable"
    | "walkable_dim"
    | "attackable"
    | "attackable_dim"
    | "attackable_focus"
    | "path"
    | "selected";

interface HexCell3DProps {
    q: number;
    r: number;
    width: number;
    height: number;
    position: [number, number, number];
    geometry: THREE.BufferGeometry;
    state?: BattleCellState;
    /** 可行走格与角色距离（用于近深远浅，Braveland 式） */
    walkableDistance?: number;
    /** 移动范围（与 walkableDistance 一起计算透明度） */
    moveRange?: number;
    /** 教学：施法步开始后短时加强攻击格脉冲 */
    pedagogyPulseBoost?: boolean;
    onClick?: () => void;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
}

export const HexCell3D: React.FC<HexCell3DProps> = ({
    position,
    geometry,
    state = "normal",
    walkableDistance,
    moveRange,
    pedagogyPulseBoost,
    onClick,
    onPointerEnter,
    onPointerLeave,
}) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // 交互高亮（walkable/attackable/path/selected）必须在 disabled 之上，
    // 否则点选亮区后 refreshWalkable 显示的灰区会被暗区（disabled）盖住
    const stateBaseOffset = useMemo(() => {
        switch (state) {
            case "normal":
                return 0;
            case "disabled":
                return 1;
            case "walkable":
            case "walkable_dim":
                return 2;
            case "attackable":
            case "attackable_dim":
                return 3;
            case "attackable_focus":
                return 4;
            case "path":
                return 5;
            case "selected":
                return 6;
            case "highlighted":
                return 7;
            default:
                return 0;
        }
    }, [state]);

    const yOffset = useMemo(
        () => stateBaseOffset * 0.01 + (position[0] * 0.0001 + position[2] * 0.00001),
        [stateBaseOffset, position]
    );

    const material = useMemo(() => {
        let color: number;
        let opacity: number;
        let metalness: number;
        let roughness: number;

        switch (state) {
            case "walkable": {
                metalness = 0.2;
                roughness = 0.5;
                // Braveland 式：近深远浅，亮区更亮、暗区更暗，区分更明显
                if (moveRange != null && moveRange > 0 && walkableDistance != null) {
                    const t = 1 - walkableDistance / moveRange; // 0=最远(暗区), 1=最近(亮区)
                    opacity = 0.2 + t * 0.75; // 暗区 0.2，亮区 0.95
                    const dark = new THREE.Color(0x546e7a);
                    const bright = new THREE.Color(0x2196f3);
                    dark.lerp(bright, Math.min(1, t * 2)); // 暗区偏灰蓝，越近越亮蓝
                    color = dark.getHex();
                } else {
                    color = 0x2196f3;
                    opacity = 0.7;
                }
                break;
            }
            case "walkable_dim": {
                metalness = 0.15;
                roughness = 0.55;
                if (moveRange != null && moveRange > 0 && walkableDistance != null) {
                    const t = 1 - walkableDistance / moveRange;
                    opacity = 0.08 + t * 0.22;
                    const dark = new THREE.Color(0x37474f);
                    const mid = new THREE.Color(0x546e7a);
                    dark.lerp(mid, Math.min(1, t * 1.2));
                    color = dark.getHex();
                } else {
                    color = 0x455a64;
                    opacity = 0.22;
                }
                break;
            }
            case "attackable":
                color = 0xf44336;
                opacity = 0.8;
                metalness = 0.3;
                roughness = 0.4;
                break;
            case "attackable_dim":
                color = 0x8d4a4a;
                opacity = 0.28;
                metalness = 0.2;
                roughness = 0.55;
                break;
            case "attackable_focus":
                color = 0xff5252;
                opacity = 0.95;
                metalness = 0.35;
                roughness = 0.35;
                break;
            case "path":
                color = 0xffeb3b;
                opacity = 0.8;
                metalness = 0.2;
                roughness = 0.5;
                break;
            case "selected":
                color = 0xffffff;
                opacity = 0.9;
                metalness = 0.4;
                roughness = 0.3;
                break;
            case "highlighted":
                color = 0x4caf50;
                opacity = 0.9;
                metalness = 0.3;
                roughness = 0.4;
                break;
            case "disabled":
                color = 0x606060;
                opacity = 0.7;
                metalness = 0.1;
                roughness = 0.8;
                break;
            default:
                color = 0x8899aa;
                opacity = 0.85;
                metalness = 0.2;
                roughness = 0.6;
        }

        const isInteractive =
            state === "walkable" ||
            state === "walkable_dim" ||
            state === "attackable" ||
            state === "attackable_dim" ||
            state === "attackable_focus" ||
            state === "path" ||
            state === "selected";
        const mat = new THREE.MeshStandardMaterial({
            color,
            opacity,
            transparent: opacity < 1,
            metalness,
            roughness,
            side: THREE.FrontSide,
            // 高亮格：depthTest=false 无条件画在地面/障碍物之上；depthWrite=false 不影响后续角色深度
            ...(isInteractive ? { depthTest: false, depthWrite: false } : {}),
        });
        return mat;
    }, [state, walkableDistance, moveRange]);

    useFrame(({ clock }) => {
        if (meshRef.current) {
            const baseY = position[1] + yOffset;
            if (
                state === "walkable" ||
                state === "walkable_dim" ||
                state === "attackable" ||
                state === "attackable_dim" ||
                state === "attackable_focus" ||
                state === "path" ||
                state === "selected"
            ) {
                const amp =
                    state === "attackable_focus"
                        ? pedagogyPulseBoost
                            ? 0.05
                            : 0.028
                        : state === "attackable_dim"
                          ? 0.006
                          : 0.015;
                const speed =
                    state === "attackable_focus" ? (pedagogyPulseBoost ? 3.5 : 2.8) : 2;
                meshRef.current.position.y = baseY + Math.sin(clock.elapsedTime * speed) * amp;
            } else {
                meshRef.current.position.y = baseY;
            }
        }
    });

    const adjustedPosition: [number, number, number] = [position[0], position[1] + yOffset, position[2]];
    // 高亮层 renderOrder=1，障碍物/角色 renderOrder=2，确保正确分层
    const renderOrder = ["normal", "disabled"].includes(state) ? 0 : 1;

    return (
        <mesh
            ref={meshRef}
            position={adjustedPosition}
            rotation={[-Math.PI / 2, 0, 0]}
            geometry={geometry}
            material={material}
            renderOrder={renderOrder}
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            receiveShadow
            castShadow
        />
    );
};

export default HexCell3D;
