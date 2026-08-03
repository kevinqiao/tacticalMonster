/**
 * Obstacle3D 组件
 * 障碍物的 3D 表示
 */

import React, { useMemo } from "react";
import * as THREE from "three";
import { createHexagonExtrudeGeometry, createHexagonMaterial } from "../utils/hex3DUtils";

interface Obstacle3DProps {
    q: number; // 列坐标（视图坐标）
    r: number; // 行坐标（视图坐标）
    width: number; // 六边形宽度
    height: number; // 六边形高度
    position: [number, number, number]; // 3D 位置 [x, y, z]
    type: number; // 障碍物类型
    asset: string; // 障碍物资源路径
    onClick?: () => void;
}

const Obstacle3D: React.FC<Obstacle3DProps> = ({
    q,
    r,
    width,
    height,
    position,
    type,
    asset,
    onClick,
}) => {
    // 创建几何体和材质
    const geometry = useMemo(() => createHexagonExtrudeGeometry(width, 0.2), [width]);
    const material = useMemo(
        () => createHexagonMaterial(0x5c2904, 0.7), // 棕色半透明
        []
    );

    return (
        <mesh
            position={position}
            geometry={geometry}
            material={material}
            onClick={onClick}
            receiveShadow
            castShadow
        >
            {/* 可以在这里添加障碍物的 3D 模型或纹理 */}
        </mesh>
    );
};

export default Obstacle3D;
