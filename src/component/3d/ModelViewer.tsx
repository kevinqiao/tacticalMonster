/**
 * 3D 模型查看器
 * 可浏览 public/assets/3d/glb/characters 下所有角色 GLB 模型
 */

import { OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { Suspense, useMemo, useState } from "react";
import * as THREE from "three";
import { CHARACTER_LIST, getGlbPath } from "./characterList";

const ModelScene: React.FC<{ glbPath: string }> = ({ glbPath }) => {
    const { scene } = useGLTF(glbPath);

    const { clone, scale } = useMemo(() => {
        if (!scene) return { clone: null, scale: 1 };

        const c = scene.clone(true);

        c.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
        });

        const box = new THREE.Box3().setFromObject(c);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 1);
        const s = 2 / maxDim;

        c.position.set(-center.x * s, -center.y * s, -center.z * s);
        c.scale.setScalar(s);

        return { clone: c, scale: s };
    }, [scene]);

    if (!clone) return null;

    return <primitive object={clone} />;
};

const Fallback: React.FC = () => (
    <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#555" wireframe />
    </mesh>
);

const ViewerCanvas: React.FC<{ glbPath: string }> = ({ glbPath }) => (
    <Canvas
        shadows
        style={{ width: "100%", height: "100%", background: "#1a1a2e" }}
        camera={{ position: [2, 1.5, 2], fov: 45, near: 0.1, far: 1000 }}
    >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <Suspense fallback={<Fallback />}>
            <ModelScene key={glbPath} glbPath={glbPath} />
        </Suspense>
        <OrbitControls
            enablePan
            enableZoom
            enableRotate
            minDistance={0.5}
            maxDistance={20}
        />
    </Canvas>
);

const ModelViewer: React.FC = () => {
    const [slug, setSlug] = useState(CHARACTER_LIST[0]?.slug ?? "tiger");
    const glbPath = getGlbPath(slug);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 400 }}>
            <div
                style={{
                    padding: 12,
                    background: "#252540",
                    borderBottom: "1px solid #444",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                }}
            >
                <label style={{ color: "#ccc", fontWeight: 600 }}>角色模型：</label>
                <select
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    style={{
                        padding: "8px 12px",
                        minWidth: 200,
                        background: "#1a1a2e",
                        color: "#eee",
                        border: "1px solid #555",
                        borderRadius: 6,
                        fontSize: 14,
                    }}
                >
                    {CHARACTER_LIST.map((c) => (
                        <option key={c.slug} value={c.slug}>
                            {c.name}
                        </option>
                    ))}
                </select>
                <span style={{ color: "#888", fontSize: 12 }}>{glbPath}</span>
            </div>
            <div style={{ flex: 1, minHeight: 360 }}>
                <ViewerCanvas glbPath={glbPath} />
            </div>
        </div>
    );
};

export default ModelViewer;
