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

            // 优化1: 添加初始状态设置，确保平滑过渡
            slides.forEach((c, index) => {
                if (c.ele) {
                    // 设置初始状态
                    gsap.set(c.ele, {
                        autoAlpha: 1,
                        force3D: true, // 启用硬件加速
                        willChange: "transform" // 提示浏览器优化
                    });
                }
            });

            // 优化2: 使用更平滑的缓动和更合理的时长
            slides.forEach((c, index) => {
                if (c.ele) {
                    const elementOffset = index - center;
                    const targetX = `${(elementOffset - offset) * 100}%`;

                    // 优化3: 添加轻微的延迟，创造波浪效果
                    const delay = Math.abs(index - cindex) * 0.05;

                    timeline.to(c.ele, {
                        x: targetX,
                        duration: 0.8,
                        ease: "power3.out",
                        delay: delay
                    }, "<"); // 所有元素同时开始，但有不同的延迟
                }
            });

            // 优化4: 添加微妙的缩放效果
            timeline.to(container.ele, {
                scale: 1.02,
                duration: 0.4,
                ease: "power2.out",
                yoyo: true,
                repeat: 1
            }, "<0.2"); // 在动画进行到20%时开始缩放
        }

        return timeline;
    }
};
