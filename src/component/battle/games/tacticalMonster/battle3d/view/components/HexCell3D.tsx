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
    | "attackable"
    | "path"
    | "selected";

interface HexCell3DProps {
    q: number;
    r: number;
    width: number;
    height: number;
    position: [number, number, number];
    geometry: THREE.ExtrudeGeometry;
    state?: BattleCellState;
    onClick?: () => void;
    onPointerEnter?: () => void;
    onPointerLeave?: () => void;
}

const HexCell3D: React.FC<HexCell3DProps> = ({
    position,
    geometry,
    state = "normal",
    onClick,
    onPointerEnter,
    onPointerLeave,
}) => {
    const meshRef = useRef<THREE.Mesh>(null);

    const stateBaseOffset = useMemo(() => {
        switch (state) {
            case "walkable":
                return 1;
            case "attackable":
                return 2;
            case "path":
                return 3;
            case "selected":
                return 4;
            case "highlighted":
                return 5;
            case "disabled":
                return 6;
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
            case "walkable":
                color = 0x2196f3;
                opacity = 0.7;
                metalness = 0.2;
                roughness = 0.5;
                break;
            case "attackable":
                color = 0xf44336;
                opacity = 0.8;
                metalness = 0.3;
                roughness = 0.4;
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

        return new THREE.MeshStandardMaterial({
            color,
            opacity,
            transparent: opacity < 1,
            metalness,
            roughness,
            side: THREE.FrontSide,
        });
    }, [state]);

    useFrame(({ clock }) => {
        if (meshRef.current) {
            const baseY = position[1] + yOffset;
            if (state === "walkable" || state === "attackable" || state === "path" || state === "selected") {
                meshRef.current.position.y = baseY + Math.sin(clock.elapsedTime * 2) * 0.015;
            } else {
                meshRef.current.position.y = baseY;
            }
        }
    });

    const adjustedPosition: [number, number, number] = [position[0], position[1] + yOffset, position[2]];

    return (
        <mesh
            ref={meshRef}
            position={adjustedPosition}
            rotation={[-Math.PI / 2, 0, 0]}
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
