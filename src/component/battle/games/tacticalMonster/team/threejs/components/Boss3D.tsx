/**
 * Boss3D 组件
 * Boss 的 3D 表示
 */

import React, { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createHexagonExtrudeGeometry, createHexagonMaterial } from "../utils/hex3DUtils";

interface Boss3DProps {
    q: number; // 列坐标（视图坐标）
    r: number; // 行坐标（视图坐标）
    width: number; // 六边形宽度
    height: number; // 六边形高度
    position: [number, number, number]; // 3D 位置 [x, y, z]
    bossId: string; // Boss ID
    onClick?: () => void;
}

const Boss3D: React.FC<Boss3DProps> = ({
    q,
    r,
    width,
    height,
    position,
    bossId,
    onClick,
}) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // 创建几何体和材质
    const geometry = useMemo(() => createHexagonExtrudeGeometry(width, 0.3), [width]);
    const material = useMemo(
        () => createHexagonMaterial(0x1bbef0, 1.0), // 蓝色，不透明
        []
    );

    // 脉冲动画
    useFrame(({ clock }) => {
        if (meshRef.current) {
            const scale = 1 + Math.sin(clock.elapsedTime * 2) * 0.1;
            meshRef.current.scale.set(scale, 1, scale);
        }
    });

    return (
        <mesh
            ref={meshRef}
            position={position}
            geometry={geometry}
            material={material}
            onClick={onClick}
            receiveShadow
            castShadow
        >
            {/* 可以在这里添加 Boss 的 3D 模型或纹理 */}
        </mesh>
    );
};

export default Boss3D;
