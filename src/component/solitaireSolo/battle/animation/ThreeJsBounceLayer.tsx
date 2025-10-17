/**
 * Three.js 3D弹跳轨迹图层
 * 叠加在游戏上方，背景透明，实现立体弹跳效果
 */

import gsap from 'gsap';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SoloBoardDimension, SoloCard } from '../types/SoloTypes';

interface ThreeJsBounceLayerProps {
    boardDimension: SoloBoardDimension;
    onAnimationComplete?: () => void;
}

interface BounceCardData {
    card: SoloCard;
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    gravity: number;
    bounceCount: number;
    maxBounces: number;
    trail: THREE.Mesh[];
}

export const ThreeJsBounceLayer: React.FC<ThreeJsBounceLayerProps> = ({
    boardDimension,
    onAnimationComplete
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.Camera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const bounceCardsRef = useRef<BounceCardData[]>([]);
    const trailIntervalRef = useRef<number>(0);
    const hasCompletedRef = useRef<boolean>(false);
    const textureCache = useRef<Map<string, THREE.Texture>>(new Map());
    const tickerFuncRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // 初始化Three.js场景
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // 使用透视相机看到Z轴深度效果
        const aspect = boardDimension.width / boardDimension.height;

        const camera = new THREE.PerspectiveCamera(
            45,      // FOV
            aspect,  // aspect ratio
            0.1,     // near
            3000     // far
        );

        // 相机从后方观察（Z=1200），卡牌从Z=-800向前飞到Z=500左右
        camera.position.set(0, 0, 1200);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera as any;

        console.log('Camera setup (perspective):', {
            position: camera.position.toArray(),
            fov: 45,
            aspect
        });

        // 创建渲染器（透明背景，关闭抗锯齿提升性能）
        const renderer = new THREE.WebGLRenderer({
            canvas: canvasRef.current,
            alpha: true,
            antialias: false, // 关闭抗锯齿
            preserveDrawingBuffer: false,
            powerPreference: 'high-performance' // 优先性能
        });
        renderer.setSize(boardDimension.width, boardDimension.height);
        renderer.setClearColor(0x000000, 0); // 完全透明背景
        renderer.setPixelRatio(window.devicePixelRatio);
        rendererRef.current = renderer;

        console.log('Renderer initialized:', {
            size: [boardDimension.width, boardDimension.height],
            pixelRatio: renderer.getPixelRatio()
        });

        // 只使用环境光（减少光照计算）
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        scene.add(ambientLight);

        // 测试方块已移除，坐标系统已验证正常

        console.log('✅ Three.js layer initialized', {
            cameraPosition: camera.position.toArray(),
            boardSize: [boardDimension.width, boardDimension.height]
        });

        // 使用GSAP ticker（降低帧率到30fps）
        let frameSkip = 0;
        const tickerFunc = () => {
            // 每2帧更新一次（30fps）
            frameSkip++;
            if (frameSkip % 2 !== 0) return;

            const deltaTime = (gsap.ticker.deltaRatio() / 60) * 2; // 补偿跳帧

            if (deltaTime > 0 && deltaTime < 0.2) {
                updateBounceCards(deltaTime);
            }

            renderer.render(scene, camera);
        };

        tickerFuncRef.current = tickerFunc;
        gsap.ticker.add(tickerFunc);
        gsap.ticker.fps(60);

        // 清理
        return () => {
            if (tickerFuncRef.current) {
                gsap.ticker.remove(tickerFuncRef.current);
            }
            // 清理纹理缓存
            textureCache.current.forEach(texture => texture.dispose());
            textureCache.current.clear();
            renderer.dispose();
            scene.clear();
        };
    }, [boardDimension]);

    // 更新弹跳卡牌
    const updateBounceCards = (deltaTime: number) => {
        const scene = sceneRef.current;
        if (!scene) return;

        trailIntervalRef.current += deltaTime;
        const shouldCreateTrail = trailIntervalRef.current >= 0.016; // 每16ms创建一次轨迹（更密集）
        if (shouldCreateTrail) {
            trailIntervalRef.current = 0;
        }

        // 批量更新（减少filter调用）
        const toRemove: number[] = [];
        bounceCardsRef.current.forEach((bounceCard, idx) => {
            if (!updateSingleCard(bounceCard, deltaTime, shouldCreateTrail)) {
                toRemove.push(idx);
            }
        });

        // 批量移除
        if (toRemove.length > 0) {
            toRemove.reverse().forEach(idx => {
                const bounceCard = bounceCardsRef.current[idx];
                cleanupCard(bounceCard);
                bounceCardsRef.current.splice(idx, 1);
            });
        }

        // 所有卡牌都完成了（只触发一次）
        if (bounceCardsRef.current.length === 0 && onAnimationComplete && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            onAnimationComplete();
        }
    };

    // 更新单张卡牌
    const updateSingleCard = (bounceCard: BounceCardData, deltaTime: number, shouldCreateTrail: boolean): boolean => {
        const scene = sceneRef.current;
        if (!scene) return false;

        const { mesh, velocity, gravity, trail, maxBounces } = bounceCard;

        // 更新速度（重力）
        velocity.y += gravity * deltaTime;

        // 更新位置
        mesh.position.x += velocity.x * deltaTime;
        mesh.position.y += velocity.y * deltaTime;
        mesh.position.z += velocity.z * deltaTime;

        // 创建轨迹（整个过程都创建，不限制数量）
        if (shouldCreateTrail && trail.length < 200) {
            createTrailMesh(bounceCard);
        }

        // 地面检测（Three.js坐标：负Y是下方）
        const groundY = -boardDimension.height / 2 + 100; // 底部往上100px
        if (mesh.position.y <= groundY && velocity.y < 0) {
            mesh.position.y = groundY;
            const prevVelY = velocity.y;
            velocity.y *= -0.7; // 弹跳衰减（反转方向）
            velocity.x *= 0.95; // X轴轻微衰减
            velocity.z *= 0.95;
            bounceCard.bounceCount++;

            console.log(`🏀 Bounce ${bounceCard.bounceCount}/${maxBounces}`, {
                pos: mesh.position.toArray(),
                velX: velocity.x.toFixed(0),
                velYBefore: prevVelY.toFixed(0),
                velYAfter: velocity.y.toFixed(0)
            });

            // 达到最大弹跳次数，停止
            if (bounceCard.bounceCount >= maxBounces) {
                console.log('✅ Card finished (max bounces)');
                return false;
            }
        }

        // 检查是否超出屏幕（只检查Y轴，允许X轴自由移动）
        const hh = boardDimension.height / 2;

        // 只有掉到屏幕底部很远才移除
        if (mesh.position.y < -hh - 300) {
            console.log('❌ Card removed (fell too far):', mesh.position.toArray());
            return false;
        }

        return true;
    };

    // 清理单张卡牌
    const cleanupCard = (bounceCard: BounceCardData) => {
        const scene = sceneRef.current;
        if (!scene) return;

        const { mesh, trail } = bounceCard;

        console.log(`Cleaning up card, had ${trail.length} trail meshes`);

        // 清理主mesh
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();

        // 不清理轨迹，让它们留在场景中
        // trail.forEach(t => {
        //     scene.remove(t);
        //     (t.material as THREE.Material).dispose();
        // });
    };

    // 创建轨迹网格（优化版）
    const createTrailMesh = (bounceCard: BounceCardData) => {
        const scene = sceneRef.current;
        if (!scene) return;

        const { mesh, trail } = bounceCard;

        // 复用几何体，只克隆材质
        const trailMesh = new THREE.Mesh(
            mesh.geometry, // 复用几何体
            (mesh.material as THREE.Material).clone() // 只克隆材质
        );

        // 复制位置、旋转（完全复制，包括Z）
        trailMesh.position.copy(mesh.position);
        trailMesh.rotation.copy(mesh.rotation);

        // 根据高度调整透明度和缩放（Three.js坐标：Y越大越高）
        const groundY = -boardDimension.height / 2 + 100;
        const topY = boardDimension.height / 2;
        const normalizedY = Math.max(0, Math.min(1, (trailMesh.position.y - groundY) / (topY - groundY)));

        // 统一透明度，不要太透明
        const alpha = 0.8;

        // 统一尺寸，高处稍大
        const scale = 0.85 + normalizedY * 0.15; // 0.85到1.0

        (trailMesh.material as THREE.MeshBasicMaterial).opacity = alpha;
        (trailMesh.material as THREE.MeshBasicMaterial).transparent = true;
        trailMesh.scale.set(scale, scale, 1);

        if (trail.length % 20 === 0) {
            console.log(`Trail #${trail.length}: y=${trailMesh.position.y.toFixed(0)}, z=${trailMesh.position.z.toFixed(0)}, alpha=${alpha}, scale=${scale.toFixed(2)}`);
        }

        scene.add(trailMesh);
        trail.push(trailMesh);
    };

    // 启动弹跳动画
    const startBounceAnimation = (cards: SoloCard[]) => {
        const scene = sceneRef.current;
        if (!scene) return;

        console.log(`🎰 Starting Three.js bounce animation (single card test)`);

        // 重置完成标志
        hasCompletedRef.current = false;

        // 清理之前的动画
        bounceCardsRef.current.forEach(bounceCard => {
            scene.remove(bounceCard.mesh);
            bounceCard.trail.forEach(t => scene.remove(t));
        });
        bounceCardsRef.current = [];

        // 只用第一张卡测试
        const testCard = cards[0];
        if (!testCard || !testCard.ele) {
            console.warn('No card to animate');
            return;
        }

        setTimeout(() => {
            const card = testCard;
            if (!card.ele) return;

            const rect = card.ele.getBoundingClientRect();
            const containerRect = card.ele.parentElement?.getBoundingClientRect();
            if (!containerRect) return;

            console.log('Creating 3D card mesh...', { rect, containerRect });

            // 创建卡牌几何体（放大2倍更明显）
            const geometry = new THREE.PlaneGeometry(
                boardDimension.cardWidth * 2,
                boardDimension.cardHeight * 2
            );

            // 创建高对比度纹理
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 384;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // 亮黄色背景（最明显）
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 黑色粗边框
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 8;
                ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

                // 大号黑色文字
                ctx.fillStyle = '#000000';
                ctx.font = 'bold 64px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('BOUNCE', canvas.width / 2, canvas.height / 2 - 30);
                ctx.fillText('3D', canvas.width / 2, canvas.height / 2 + 40);
            }

            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                side: THREE.DoubleSide,
                transparent: false
            });

            const mesh = new THREE.Mesh(geometry, material);

            // 转换CSS坐标到Three.js坐标（中心在0,0）
            const cssX = rect.left - containerRect.left + boardDimension.cardWidth / 2;
            const cssY = rect.top - containerRect.top + boardDimension.cardHeight / 2;

            // Three.js坐标：中心(0,0)，Y向上
            const threeX = cssX - boardDimension.width / 2;
            const threeY = boardDimension.height / 2 - cssY; // Y轴翻转
            const threeZ = -800; // 初始Z位置（远离观众）

            console.log('Position conversion:', {
                css: [cssX, cssY],
                three: [threeX, threeY, threeZ],
                groundY: -boardDimension.height / 2 + 100
            });

            // 如果初始位置低于地面，提升到地面上方
            const groundY = -boardDimension.height / 2 + 100;
            const startY = Math.max(threeY, groundY + 10);

            mesh.position.set(threeX, startY, threeZ); // 从远处开始

            console.log('Adjusted start position:', [threeX, startY, threeZ]);

            // 设置初始速度（直接下落，不向上弹）
            const velocity = new THREE.Vector3(
                80,     // X: 轻微向右移动
                0,      // Y: 不向上，直接受重力下落
                300     // Z: 向前（朝向观众）
            );

            console.log('Initial velocity (drop down):', velocity.toArray());

            scene.add(mesh);

            bounceCardsRef.current.push({
                card,
                mesh,
                velocity,
                gravity: -1000, // 降低重力，让弹跳更高
                bounceCount: 0,
                maxBounces: 4,
                trail: []
            });

            // 强制渲染一次以显示
            if (rendererRef.current && cameraRef.current) {
                rendererRef.current.render(scene, cameraRef.current);
            }

            console.log('✅ 3D card added to scene', {
                position: mesh.position.toArray(),
                velocity: velocity.toArray(),
                groundY: -boardDimension.height / 2 + 100,
                bounds: {
                    x: [-boardDimension.width / 2 - 200, boardDimension.width / 2 + 200],
                    y: [-boardDimension.height / 2 - 200, boardDimension.height / 2 + 200]
                }
            });
        }, 100); // 100ms后启动
    };

    // 暴露启动方法
    useEffect(() => {
        (window as any).__startThreeJsBounce = startBounceAnimation;
        return () => {
            delete (window as any).__startThreeJsBounce;
        };
    }, [boardDimension]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: boardDimension.width,
                height: boardDimension.height,
                pointerEvents: 'none',
                zIndex: 10000
            }}
        />
    );
};

