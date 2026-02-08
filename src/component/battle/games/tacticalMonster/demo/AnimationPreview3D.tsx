/**
 * AnimationPreview3D - 仅负责播动画的独立 3D 场景
 * 用于排查「primitive + useAnimations」下模型可见性，与主场景隔离
 */

import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const DEFAULT_GLB = "/assets/3d/glb/characters/tiger/model/tiger.glb";

const PRESETS: { label: string; path: string }[] = [
    { label: "tiger", path: "/assets/3d/glb/characters/tiger/model/tiger.glb" },
    { label: "悟空", path: "/assets/3d/characters/wukong/model/wukong.glb" },
];

type AnimationApi = { names: string[]; play: (name: string) => void };

/** 场景内的模型 + 动画根。直接用 scene（不克隆），动画 clip 绑定的才是同一批节点 */
const AnimatedModel: React.FC<{ url: string; onReady?: (api: AnimationApi) => void }> = ({ url, onReady }) => {
    const { scene, animations } = useGLTF(url);
    const clips = Array.isArray(animations) ? animations : [];

    const centered = useMemo(() => {
        scene.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
        });
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        scene.position.set(-center.x, -center.y + size.y / 2, -center.z);
        return scene;
    }, [scene]);

    const { actions, names } = useAnimations(clips, centered);
    const actionsRef = useRef(actions);
    actionsRef.current = actions;

    const play = useCallback((name: string) => {
        const action = actionsRef.current[name];
        if (action) {
            action.reset().fadeIn(0.2).play();
        }
    }, []);

    useEffect(() => {
        onReady?.({ names, play });
    }, [names, onReady, play]);

    useEffect(() => {
        if (names.length === 0) return;
        const name =
            names.find((n) => /idle|Idle|stand|Stand|wait|Wait/i.test(n)) ||
            names[0];
        play(name);
    }, [names]); // 仅在有动画名时自动播一次，不依赖 play 避免循环

    const scale = useMemo(() => {
        const box = new THREE.Box3().setFromObject(centered);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        return maxDim > 0 ? 80 / maxDim : 1;
    }, [centered]);

    return (
        <group scale={[scale, scale, scale]} position={[0, 0, 0]}>
            <primitive object={centered} />
        </group>
    );
};

/** 仅负责播动画的 Canvas 场景。输入框仅编辑，点「加载」后才用新路径加载，避免输入时 useGLTF 收到半路径崩溃。 */
const AnimationPreview3D: React.FC = () => {
    const [inputValue, setInputValue] = useState(DEFAULT_GLB);
    const [loadUrl, setLoadUrl] = useState(DEFAULT_GLB);
    const [key, setKey] = useState(0);
    const [names, setNames] = useState<string[]>([]);
    const [selectedName, setSelectedName] = useState("");
    const playRef = useRef<(name: string) => void>(() => { });

    const handleReady = useCallback((api: AnimationApi) => {
        setNames(api.names);
        playRef.current = api.play;
        if (api.names.length > 0) {
            const defaultName =
                api.names.find((n) => /idle|Idle|stand|Stand|wait|Wait/i.test(n)) ||
                api.names[0];
            setSelectedName(defaultName);
        } else {
            setSelectedName("");
        }
    }, []);

    const handlePlay = useCallback(() => {
        const toPlay = selectedName || names[0];
        if (toPlay) playRef.current(toPlay);
    }, [selectedName, names]);

    const handleLoad = useCallback(() => {
        const url = inputValue.trim() || DEFAULT_GLB;
        setLoadUrl(url);
        setKey((k) => k + 1);
    }, [inputValue]);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            <div
                style={{
                    padding: 8,
                    background: "#1a1a2e",
                    color: "#eee",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                }}
            >
                <label>
                    GLB 路径:
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleLoad()}
                        placeholder={DEFAULT_GLB}
                        style={{ marginLeft: 4, width: 320 }}
                    />
                </label>
                <button type="button" onClick={handleLoad}>
                    加载
                </button>
                {PRESETS.map(({ label, path }) => (
                    <button
                        key={path}
                        type="button"
                        onClick={() => {
                            setInputValue(path);
                            setLoadUrl(path);
                            setKey((k) => k + 1);
                        }}
                    >
                        {label}
                    </button>
                ))}
                {names.length === 0 && loadUrl && (
                    <span style={{ color: "#f88" }}>该模型无动画片段</span>
                )}
                {names.length > 0 && (
                    <>
                        <label>
                            动画:
                            <select
                                value={selectedName}
                                onChange={(e) => setSelectedName(e.target.value)}
                                style={{ marginLeft: 4 }}
                            >
                                {names.map((n) => (
                                    <option key={n} value={n}>
                                        {n}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button type="button" onClick={handlePlay}>
                            播放
                        </button>
                    </>
                )}
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
                <Canvas
                    key={key}
                    camera={{ position: [0, 60, 120], fov: 40 }}
                    shadows
                    gl={{ antialias: true }}
                >
                    <ambientLight intensity={0.7} />
                    <directionalLight
                        position={[80, 80, 80]}
                        intensity={1.2}
                        castShadow
                    />
                    <AnimatedModel key={loadUrl} url={loadUrl} onReady={handleReady} />
                    <OrbitControls
                        enablePan
                        enableZoom
                        enableRotate
                        target={[0, 0, 0]}
                    />
                </Canvas>
            </div>
        </div>
    );
};

export default AnimationPreview3D;
