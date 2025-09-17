import gsap from "gsap";
import { PageContainer } from "service/PageManager";

interface OpenEffect {
    (args: { container: PageContainer; parent?: PageContainer; containers?: PageContainer[]; duration?: number; tl?: gsap.core.Timeline }): gsap.core.Timeline | null;
}

interface OpenEffects {
    [key: string]: OpenEffect;
}

export const OpenEffects: OpenEffects = {

    fadeIn: ({ container, duration, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();
        timeline.to(container.ele,
            { autoAlpha: 1, duration }
        );
        return timeline;
    },
    popCenterIn: ({ container, duration, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
        // gsap.set(container.ele, { width: "80%", height: "80%" })
        const timeline = tl ?? gsap.timeline();
        gsap.set(container.ele, { autoAlpha: 1 })
        timeline.fromTo(container.ele,
            { scale: 0.5, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.5, ease: "power2.inOut" }
        );

        if (container.mask) {
            timeline.to(container.mask, { autoAlpha: 0.4, duration: 0.5 }, "<")
        }
        return timeline;
    },
    popRightIn: ({ container, duration, tl }) => {
        if (!container.ele) return null;

        const timeline = tl ?? gsap.timeline();

        // 设置初始状态
        gsap.set(container.ele, {
            autoAlpha: 1,
            right: 0
        });

        // 简单的从右侧滑入动画
        timeline.to(container.ele, {
            x: "-100%",
            duration: 0.5,
            ease: "power2.out"
        });

        // 遮罩层动画
        if (container.mask) {
            gsap.set(container.mask, {
                autoAlpha: 0
            });
            timeline.to(container.mask, {
                autoAlpha: 0.3,
                duration: 0.3,
                ease: "power2.out"
            }, "<");
        }

        return timeline;
    },
    popIn: ({ container, duration, tl }) => {
        // console.log("container", container)
        if (!container.ele) return null;
        const timeline = tl ?? gsap.timeline();
        timeline.fromTo(container.ele,
            { autoAlpha: 0, scale: 0.2 },
            { autoAlpha: 1, scale: 0.7, duration: 1.2, ease: "power2.inOut" }
        );

        if (container.mask) {
            timeline.to(container.mask, { autoAlpha: 0.2, duration: 1.2 }, "<")
        }
        return timeline;
    },
    slideIn: ({ container, containers, duration, tl }) => {
        const timeline = tl ?? gsap.timeline();

        const parent = containers?.find((c) => c.uri === container.parentURI);
        if (!parent || !container.ele) return null;
        const slides = parent.children?.filter((c) => c.init === "slide");

        if (!slides || slides.length === 0) {
            console.log("slideIn - 没有找到slide元素");
            return null;
        }

        let cindex = slides.findIndex((c) => c.name === container.name);
        if (cindex >= 0) {
            const center = Math.floor(slides.length / 2);
            const offset = cindex - center;

            // 优化1: 启用硬件加速和性能优化
            slides.forEach((c, index) => {
                if (c.ele) {
                    // 强制启用硬件加速和性能优化
                    gsap.set(c.ele, {
                        autoAlpha: 1,
                        force3D: true,                    // 强制GPU加速
                        willChange: "transform",          // 告诉浏览器优化transform
                        backfaceVisibility: "hidden",    // 防止3D变换闪烁
                        transformStyle: "preserve-3d",   // 保持3D变换
                        WebkitBackfaceVisibility: "hidden", // Safari兼容
                        WebkitTransformStyle: "preserve-3d" // Safari兼容
                    });
                }
            });

            // 优化2: 所有slide元素作为整体一起移动
            slides.forEach((c, index) => {
                if (c.ele) {
                    // 所有元素移动相同的距离，保持相对位置关系
                    const moveDistance = `${-offset * 100}%`;

                    timeline.to(c.ele, {
                        x: moveDistance,
                        duration: 1.0,
                        ease: "power2.inOut",           // 平滑缓动
                        force3D: true,                  // 确保动画过程中GPU加速
                        transformOrigin: "center center" // 设置变换中心点
                    }, "<"); // 所有元素同时开始移动
                }
            });

            // 优化3: 动画结束后清理GPU资源
            timeline.call(() => {
                slides.forEach((c) => {
                    if (c.ele) {
                        // 保留必要的硬件加速，清理临时优化
                        gsap.set(c.ele, {
                            willChange: "auto",              // 重置willChange释放GPU资源
                            // 保留force3D和backfaceVisibility，因为可能还会有后续动画
                        });
                    }
                });
                console.log("slideIn动画完成，GPU资源已优化"); // 调试信息
            });
        }

        return timeline;
    }
};
