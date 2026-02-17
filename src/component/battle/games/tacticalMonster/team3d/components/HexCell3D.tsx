/**
 * HexCell3D 组件
 * 单个六边形单元格的 3D 表示
 */

import { useFrame } from "@react-three/fiber";
import React, { useMemo, useRef } from "react";
import * as THREE from "three";

interface HexCell3DProps {
    q: number; // 列坐标（视图坐标）
    r: number; // 行坐标（视图坐标）
    width: number; // 六边形宽度
    height: number; // 六边形高度
    position: [number, number, number]; // 3D 位置 [x, y, z]
    geometry: THREE.ExtrudeGeometry; // 共享的几何体（从父组件传入）
    state?: "normal" | "highlighted" | "disabled" | "deployable"; // 单元格状态
    onClick?: () => void;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
}

const HexCell3D: React.FC<HexCell3DProps> = ({
    q,
    r,
    width,
    height,
    position,
    geometry, // 从父组件传入的共享几何体
    state = "normal",
    onClick,
    onPointerEnter,
    onPointerLeave,
}) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // 根据状态确定 Y 偏移量（用于避免 Z-fighting）
    const stateBaseOffset = useMemo(() => {
        switch (state) {
            case "deployable":
                return 5;  // 可部署区域
            case "disabled":
                return 4;  // 禁用区域
            case "highlighted":
                return 6;  // 高亮区域（更高）
            default:
                return 0;  // 普通格子
        }
    }, [state]);

    // 给每个格子一个微小的 Y 偏移，避免 Z-fighting
    const yOffset = useMemo(() => stateBaseOffset + (q * 0.001 + r * 0.0001), [q, r, stateBaseOffset]);

    const material = useMemo(() => {
        let color: string | number;
        let opacity: number;
        let metalness: number;
        let roughness: number;

        switch (state) {
            case "highlighted":
                color = 0x4CAF50; // 绿色
                opacity = 0.9;
                metalness = 0.3;
                roughness = 0.4;
                break;
            case "disabled":
                color = 0x606060; // 深灰色
                opacity = 0.7;
                metalness = 0.1;
                roughness = 0.8;
                break;
            case "deployable":
                color = 0x00CC00; // 绿色
                opacity = 0.6;
                metalness = 0.2;
                roughness = 0.5;
                break;
            default:
                color = 0x8899aa; // 蓝灰色
                opacity = 0.85;
                metalness = 0.2;
                roughness = 0.6;
        }

        return new THREE.MeshStandardMaterial({
            color,
            opacity,
            transparent: opacity < 1,
            metalness,
            roughness,
            side: THREE.FrontSide,
        });
    }, [state]);

    // 动画：高亮状态时轻微上下浮动
    useFrame(({ clock }) => {
        if (meshRef.current && state === "highlighted") {
            const baseY = position[1] + yOffset;
            meshRef.current.position.y = baseY + Math.sin(clock.elapsedTime * 2) * 0.02;
        } else if (meshRef.current) {
            // 确保非高亮状态时位置正确，包含 yOffset
            meshRef.current.position.y = position[1] + yOffset;
        }
    });

    // 应用 yOffset 到位置
    const adjustedPosition: [number, number, number] = [
        position[0],
        position[1] + yOffset,
        position[2]
    ];

    return (
        <mesh
            ref={meshRef}
            position={adjustedPosition}
            rotation={[-Math.PI / 2, 0, 0]} // 旋转使六边形平躺在 XZ 平面上
            geometry={geometry}
            material={material}
            onClick={onClick}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            receiveShadow
            castShadow
        />
    );
};

export default HexCell3D;
