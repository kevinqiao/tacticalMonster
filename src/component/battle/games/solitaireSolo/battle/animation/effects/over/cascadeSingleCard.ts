import gsap from "gsap";
import { SoloCard, ZoneType } from "../../../types/SoloTypes";

/**
 * 单卡测试 - 测试弹跳球效果
 */
export const cascadeSingleCard = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { cards, boardDimension } = data;

    if (!cards || cards.length === 0) {
        onComplete?.();
        return;
    }

    const foundationCards = cards.filter((c: SoloCard) => c.zone === ZoneType.FOUNDATION);
    if (foundationCards.length === 0) {
        onComplete?.();
        return;
    }

    // 只取第一张卡测试
    const testCard = foundationCards[0];
    if (!testCard.ele) {
        onComplete?.();
        return;
    }

    console.log('🧪 Testing single card bounce with afterimages');

    const currentX = gsap.getProperty(testCard.ele, "x") as number;
    const currentY = gsap.getProperty(testCard.ele, "y") as number;
    const groundY = boardDimension.height * 0.8;

    console.log('Starting from:', { x: currentX, y: currentY });
    console.log('Ground at:', groundY);

    // 给父容器添加3D透视，实现向前方弹跳
    if (testCard.ele?.parentElement) {
        gsap.set(testCard.ele.parentElement, {
            perspective: 1000,
            perspectiveOrigin: '50% 50%',
            transformStyle: 'preserve-3d'
        });
    }

    gsap.set(testCard.ele, {
        zIndex: 9999,
        boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
        transformStyle: 'preserve-3d'
    });

    // 副本计数器
    let cloneCount = 0;

    // 弹跳参数
    const bounceHeight = boardDimension.height * 0.75; // 弹跳高度75%
    const topY = currentY - bounceHeight; // 理论最高点
    const bottomY = groundY; // 地面位置

    // 创建快照（留下弹跳轨迹）- 根据高度和Z轴位置计算缩放，形成立体透视效果
    const createSnapshot = (x: number, y: number, z: number) => {
        const clone = testCard.ele!.cloneNode(true) as HTMLDivElement;
        testCard.ele!.parentElement?.appendChild(clone);

        // 根据Y位置计算基础缩放
        const minScale = 0.7;
        const maxScale = 1.0;
        const normalizedY = (y - topY) / (bottomY - topY); // 0 (顶点) 到 1 (地面)
        const yScale = maxScale - (maxScale - minScale) * normalizedY; // 顶点1.0，地面0.7

        // Z轴越大（向前），scale应该更大（透视已经处理，这里保持一致）
        const scale = yScale;

        gsap.set(clone, {
            x, y,
            z: z, // Z轴位置（向前）
            width: boardDimension.cardWidth * scale,
            height: boardDimension.cardHeight * scale,
            opacity: 1.0,
            zIndex: 8000 + cloneCount,
            position: 'absolute',
            pointerEvents: 'none',
            visibility: 'visible',
            display: 'block',
            boxShadow: `0 ${4 * scale}px ${8 * scale}px rgba(0,0,0,${0.3 * scale})`,
            transformOrigin: 'center center',
            transformStyle: 'preserve-3d'
        });

        cloneCount++;
    };

    const tl = gsap.timeline({
        onComplete: () => {
            console.log('✅ Single card bounce complete');
            onComplete?.();
        }
    });

    // 动态弹跳参数
    let currentBounceHeight = bounceHeight; // 使用上面定义的bounceHeight
    let forwardStep = 300; // Z轴前进距离
    let currentPosX = currentX;
    let currentZ = 0; // 当前Z轴位置
    const damping = 0.7; // 稍微降低衰减，保持后续弹跳高度
    const zDamping = 0.8; // Z轴前进衰减

    let frameCount = 0;

    console.log('🎰 Windows Solitaire Bounce: 向正前方弹跳 + 超密集快照！');

    // 初始抛出（改为抛物线：先上升再下落）
    // 确保顶点低于屏幕顶部：currentY位置往上最多到屏幕高度的40%
    const maxInitialHeight = Math.min(currentBounceHeight * 0.6, currentY * 0.6);
    const initialArcHeight = maxInitialHeight; // 初始抛物线高度

    console.log(`初始顶点高度: ${initialArcHeight.toFixed(0)}px, 位置Y: ${(currentY - initialArcHeight).toFixed(0)}px`);

    // 第一段：向上抛（同时向前移动）
    frameCount = 0;
    currentZ += forwardStep * 0.5;
    tl.to(testCard.ele, {
        x: currentPosX,
        y: currentY - initialArcHeight,
        z: currentZ,
        width: boardDimension.cardWidth,
        height: boardDimension.cardHeight,
        duration: 0.4,
        ease: "power2.out",
        onStart: () => {
            frameCount = 0;
        },
        onUpdate: function () {
            if (testCard.ele) { // 每帧创建2个快照，增加密度
                const x = gsap.getProperty(testCard.ele, "x") as number;
                const y = gsap.getProperty(testCard.ele, "y") as number;
                const z = gsap.getProperty(testCard.ele, "z") as number;
                createSnapshot(x, y, z);
                createSnapshot(x, y, z); // 同一位置创建两次，形成更密集的效果
            }
        }
    });

    // 第二段：落到地面（继续向前移动）
    currentZ += forwardStep * 0.5;
    tl.to(testCard.ele, {
        x: currentPosX,
        y: groundY,
        z: currentZ,
        width: boardDimension.cardWidth,
        height: boardDimension.cardHeight,
        duration: 0.4,
        ease: "power2.in",
        onUpdate: function () {
            if (testCard.ele) { // 每帧创建2个快照，增加密度
                const x = gsap.getProperty(testCard.ele, "x") as number;
                const y = gsap.getProperty(testCard.ele, "y") as number;
                const z = gsap.getProperty(testCard.ele, "z") as number;
                createSnapshot(x, y, z);
                createSnapshot(x, y, z); // 同一位置创建两次，形成更密集的效果
            }
        }
    });

    // 4次弹跳（向正前方）
    for (let i = 0; i < 4; i++) {
        // 确保弹跳顶点不超过屏幕顶部
        const bounceTopY = groundY - currentBounceHeight;
        const clampedTopY = Math.max(bounceTopY, boardDimension.height * 0.1); // 最高不超过屏幕顶部10%位置
        const actualBounceHeight = groundY - clampedTopY;

        console.log(`Bounce ${i + 1}: height=${actualBounceHeight.toFixed(0)}px, topY=${clampedTopY.toFixed(0)}px, z=${currentZ.toFixed(0)}px`);

        // 弹起（同时向前移动）
        frameCount = 0;
        currentZ += forwardStep * 0.5;
        tl.to(testCard.ele, {
            x: currentPosX,
            y: clampedTopY,
            z: currentZ,
            width: boardDimension.cardWidth,
            height: boardDimension.cardHeight,
            duration: Math.sqrt(actualBounceHeight / 400) * 0.5,
            ease: "power2.out",
            onUpdate: function () {
                if (testCard.ele) { // 每帧创建2个快照，增加密度
                    const x = gsap.getProperty(testCard.ele, "x") as number;
                    const y = gsap.getProperty(testCard.ele, "y") as number;
                    const z = gsap.getProperty(testCard.ele, "z") as number;
                    createSnapshot(x, y, z);
                    createSnapshot(x, y, z); // 同一位置创建两次，形成更密集的效果
                }
            }
        });

        // 落下（继续向前移动）
        currentZ += forwardStep * 0.5;
        tl.to(testCard.ele, {
            x: currentPosX,
            y: groundY,
            z: currentZ,
            width: boardDimension.cardWidth,
            height: boardDimension.cardHeight,
            duration: Math.sqrt(actualBounceHeight / 400) * 0.5,
            ease: "power2.in",
            onUpdate: function () {
                if (testCard.ele) { // 每帧创建2个快照，增加密度
                    const x = gsap.getProperty(testCard.ele, "x") as number;
                    const y = gsap.getProperty(testCard.ele, "y") as number;
                    const z = gsap.getProperty(testCard.ele, "z") as number;
                    createSnapshot(x, y, z);
                    createSnapshot(x, y, z); // 同一位置创建两次，形成更密集的效果
                }
            },
            onComplete: () => {
                console.log(`  ✓ Bounce ${i + 1}, z=${currentZ.toFixed(0)}, snapshots: ${cloneCount}`);
            }
        });

        // 衰减
        currentBounceHeight *= damping;
        forwardStep *= zDamping;
    }

    tl.play();
};

