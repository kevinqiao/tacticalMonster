/**
 * Three.js 3D弹跳轨迹图层
 * 叠加在游戏上方，背景透明，实现立体弹跳效果
 */

import gsap from 'gsap';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useEventManager } from '../service/EventProvider';
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
    const pendingCardsRef = useRef<SoloCard[]>([]);
    const isLaunchingRef = useRef<boolean>(false);
    const { nonBlockEvent } = useEventManager();

    useEffect(() => {
        if (!canvasRef.current) return;

        // 初始化Three.js场景
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        // 使用透视相机，调整FOV让Z=0的物体看起来和原始一样大
        const aspect = boardDimension.width / boardDimension.height;
        const fov = 30; // 降低FOV，减少透视变形

        const camera = new THREE.PerspectiveCamera(
            fov,     // FOV（更小=透视效果更弱）
            aspect,  // aspect ratio
            0.1,     // near
            3000     // far
        );

        // 相机距离要根据FOV计算，让Z=0的平面填满视口
        const distance = (boardDimension.height / 2) / Math.tan((fov / 2) * Math.PI / 180);
        camera.position.set(0, 0, distance);
        camera.lookAt(0, 0, 0);
        cameraRef.current = camera as any;

        console.log('Camera setup (perspective):', {
            position: camera.position.toArray(),
            fov,
            distance: distance.toFixed(0)
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
        if (bounceCardsRef.current.length === 0 &&
            pendingCardsRef.current.length === 0 &&
            onAnimationComplete &&
            !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            console.log('🎊 All cards completed, trails preserved in scene');
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

        // 保持原始尺寸1:1
        mesh.scale.set(1.0, 1.0, 1);

        // 创建轨迹（整个过程都创建，无数量限制）
        if (shouldCreateTrail) {
            createTrailMesh(bounceCard);
        }

        // 地面检测（Three.js坐标：负Y是下方）
        const groundY = -boardDimension.height / 2 + 100; // 底部往上100px
        if (mesh.position.y <= groundY && velocity.y < 0) {
            mesh.position.y = groundY;
            const prevVelY = velocity.y;
            velocity.y *= -0.8; // 弹跳衰减提高到80%（进一步减慢衰减）
            velocity.x *= 0.98; // X轴几乎不衰减
            velocity.z *= 0.98; // Z轴几乎不衰减
            bounceCard.bounceCount++;

            console.log(`🏀 Bounce ${bounceCard.bounceCount}/${maxBounces}`, {
                pos: mesh.position.toArray(),
                vel: [velocity.x.toFixed(0), velocity.y.toFixed(0), velocity.z.toFixed(0)]
            });

            // 达到最大弹跳次数，停止
            if (bounceCard.bounceCount >= maxBounces) {
                console.log('✅ Card finished (max bounces), launching next card...');

                // 启动下一张卡
                setTimeout(() => launchNextCard(), 200);

                return false;
            }
        }

        // 检查是否超出屏幕（只检查Y轴，允许X轴自由移动）
        const hh = boardDimension.height / 2;

        // 只有掉到屏幕底部很远或超出前方才移除
        if (mesh.position.y < -hh - 500 || mesh.position.z > 1000) {
            console.log('❌ Card removed (out of view):', {
                pos: mesh.position.toArray(),
                reason: mesh.position.z > 1000 ? 'z too far' : 'y too low'
            });
            return false;
        }

        return true;
    };

    // 清理单张卡牌
    const cleanupCard = (bounceCard: BounceCardData) => {
        const scene = sceneRef.current;
        if (!scene) return;

        const { mesh, trail } = bounceCard;

        console.log(`✅ Animation complete! Created ${trail.length} trail meshes (kept in scene)`);

        // 恢复原始DOM卡牌
        if (bounceCard.card.ele) {
            gsap.set(bounceCard.card.ele, { opacity: 1 });
        }

        // 只移除主mesh，保留所有轨迹在场景中
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();

        console.log(`🎨 Trail preserved: ${trail.length} meshes remain in scene`);
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

        // 根据高度调整透明度
        const groundY = -boardDimension.height / 2 + 100;
        const topY = boardDimension.height / 2;
        const normalizedY = Math.max(0, Math.min(1, (trailMesh.position.y - groundY) / (topY - groundY)));

        // 统一透明度，不要太透明
        const alpha = 0.8;

        // 保持和主卡牌一样的尺寸
        (trailMesh.material as THREE.MeshBasicMaterial).opacity = alpha;
        (trailMesh.material as THREE.MeshBasicMaterial).transparent = true;
        trailMesh.scale.set(1.0, 1.0, 1);

        if (trail.length % 50 === 0) {
            console.log(`Trail #${trail.length}: y=${trailMesh.position.y.toFixed(0)}, z=${trailMesh.position.z.toFixed(0)}`);
        }

        scene.add(trailMesh);
        trail.push(trailMesh);
    };

    // 启动下一张卡牌
    const launchNextCard = () => {
        if (isLaunchingRef.current) return;
        if (pendingCardsRef.current.length === 0) {
            console.log('🎊 All cards launched!');
            return;
        }

        isLaunchingRef.current = true;
        const card = pendingCardsRef.current.shift()!;
        const cardIndex = 13 - pendingCardsRef.current.length; // 当前是第几张

        console.log(`🚀 Launching card #${cardIndex}/13 (${card.rank}♥)`);

        setTimeout(() => {
            createBounceCard(card, cardIndex);
            isLaunchingRef.current = false;
        }, 100);
    };

    // 创建单张弹跳卡牌
    const createBounceCard = (card: SoloCard, cardIndex: number) => {
        const scene = sceneRef.current;
        if (!scene || !card.ele) return;

        const rect = card.ele.getBoundingClientRect();
        const containerRect = card.ele.parentElement?.getBoundingClientRect();
        if (!containerRect) return;

        console.log(`Creating 3D mesh for card #${cardIndex}...`);

        // 创建卡牌几何体（保持原始大小）
        const geometry = new THREE.PlaneGeometry(
            boardDimension.cardWidth,
            boardDimension.cardHeight
        );

        // 绘制真实卡牌外观
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            if (card.isRevealed && card.rank && card.suit) {
                // 正面：白色背景
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 灰色边框
                ctx.strokeStyle = '#333333';
                ctx.lineWidth = 4;
                ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

                // 卡牌颜色（红色或黑色）
                const cardColor = (card.suit === 'hearts' || card.suit === 'diamonds') ? '#dc2626' : '#000000';

                // 左上角：牌面
                ctx.fillStyle = cardColor;
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(card.rank, 20, 50);

                // 左上角：花色
                ctx.font = 'bold 40px Arial';
                const suitSymbol = card.suit === 'hearts' ? '♥' :
                    card.suit === 'diamonds' ? '♦' :
                        card.suit === 'clubs' ? '♣' : '♠';
                ctx.fillText(suitSymbol, 20, 95);

                // 中心：大号花色
                ctx.font = 'bold 120px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(suitSymbol, canvas.width / 2, canvas.height / 2);

                // 右下角（旋转180度）
                ctx.save();
                ctx.translate(canvas.width - 20, canvas.height - 50);
                ctx.rotate(Math.PI);
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(card.rank, 0, 0);
                ctx.restore();

                ctx.save();
                ctx.translate(canvas.width - 20, canvas.height - 95);
                ctx.rotate(Math.PI);
                ctx.font = 'bold 40px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(suitSymbol, 0, 0);
                ctx.restore();
            } else {
                // 背面：深绿色带图案
                ctx.fillStyle = '#1a3c34';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.strokeStyle = '#555555';
                ctx.lineWidth = 4;
                ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);

                // 对角线图案
                ctx.strokeStyle = '#5a8a82';
                ctx.lineWidth = 3;
                for (let i = 0; i < 20; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * 20, 0);
                    ctx.lineTo(i * 20 + canvas.height, canvas.height);
                    ctx.stroke();
                }
            }
        }

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: false
        });

        const mesh = new THREE.Mesh(geometry, material);

        // 获取卡牌相对于容器的位置（CSS坐标）
        const relativeLeft = rect.left - containerRect.left;
        const relativeTop = rect.top - containerRect.top;

        // 计算卡牌中心点（CSS坐标）
        const centerX = relativeLeft + boardDimension.cardWidth / 2;
        const centerY = relativeTop + boardDimension.cardHeight / 2;

        // 转换到Three.js坐标系（中心在0,0，Y向上）
        const threeX = centerX - boardDimension.width / 2;
        const threeY = boardDimension.height / 2 - centerY; // Y轴翻转
        const threeZ = 0; // 初始Z=0（和游戏平面一致）

        // 设置精确位置
        mesh.position.set(threeX, threeY, threeZ);

        // 设置初始速度（每张卡稍微不同）
        const velocity = new THREE.Vector3(
            80 + (Math.random() - 0.5) * 40,   // X: 60-100随机
            0,                                  // Y: 直接下落
            100 + (Math.random() - 0.5) * 40    // Z: 80-120随机
        );

        // 隐藏原始DOM卡牌
        gsap.set(card.ele, { opacity: 0 });

        scene.add(mesh);

        bounceCardsRef.current.push({
            card,
            mesh,
            velocity,
            gravity: -600,
            bounceCount: 0,
            maxBounces: 6,
            trail: []
        });

        console.log(`✅ Card #${cardIndex} (${card.rank}♥) added and will bounce`);
    };

    // 启动弹跳动画（顺序模式）
    const startBounceAnimation = (cards: SoloCard[]) => {
        const scene = sceneRef.current;
        if (!scene) return;

        // 只选择一个花色的卡牌（hearts）
        const heartsCards = cards.filter(card => card.suit === 'hearts');

        console.log(`🎰 Starting sequential bounce for ${heartsCards.length} hearts cards`);

        // 重置完成标志
        hasCompletedRef.current = false;
        isLaunchingRef.current = false;

        // 清理之前的动画（但保留轨迹）
        bounceCardsRef.current.forEach(bounceCard => {
            scene.remove(bounceCard.mesh);
            // 不清理轨迹！
        });
        bounceCardsRef.current = [];

        // 设置待发射队列
        pendingCardsRef.current = [...heartsCards];

        // 启动第一张卡
        launchNextCard();
    };

    // 暴露启动方法
    // useEffect(() => {
    //     (window as any).__startThreeJsBounce = startBounceAnimation;
    //     return () => {
    //         delete (window as any).__startThreeJsBounce;
    //     };
    // }, [boardDimension]);
    useEffect(() => {
        console.log('nonBlockEvent', nonBlockEvent);
        if (nonBlockEvent && nonBlockEvent.name === 'gameOver' && nonBlockEvent.data && nonBlockEvent.data.cards) {
            const cards = nonBlockEvent.data.cards;
            const heartsCards = cards.filter((card: SoloCard) => card.suit === 'hearts');
            startBounceAnimation(heartsCards);
        }
    }, [nonBlockEvent]);

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

