/**
 * 单人纸牌游戏卡牌动画Hook
 * 基于 solitaire 的多人版本，简化为单人玩法
 */

import gsap from 'gsap';
import { useCallback, useRef } from 'react';

interface CardAnimationOptions {
    duration?: number;
    ease?: string;
    delay?: number;
    onComplete?: () => void;
}

export const useSoloCardAnimate = () => {
    const timelineRef = useRef<gsap.core.Timeline | null>(null);

    /**
     * 卡牌移动动画
     */
    const animateCardMove = useCallback((
        cardElement: HTMLElement,
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        options: CardAnimationOptions = {}
    ) => {
        const {
            duration = 0.5,
            ease = 'power2.out',
            delay = 0,
            onComplete
        } = options;

        // 设置初始位置
        gsap.set(cardElement, {
            x: fromX,
            y: fromY,
            zIndex: 1000
        });

        // 创建移动动画
        const tl = gsap.timeline({
            delay,
            onComplete: () => {
                gsap.set(cardElement, { zIndex: 'auto' });
                onComplete?.();
            }
        });

        tl.to(cardElement, {
            x: toX,
            y: toY,
            duration,
            ease,
            onStart: () => {
                cardElement.style.pointerEvents = 'none';
            },
            onComplete: () => {
                cardElement.style.pointerEvents = 'auto';
            }
        });

        return tl;
    }, []);

    /**
     * 卡牌翻转动画
     */
    const animateCardFlip = useCallback((
        cardElement: HTMLElement,
        options: CardAnimationOptions = {}
    ) => {
        const {
            duration = 0.6,
            ease = 'power2.inOut',
            delay = 0,
            onComplete
        } = options;

        const tl = gsap.timeline({
            delay,
            onComplete
        });

        // 翻转动画
        tl.to(cardElement, {
            scaleX: 0,
            duration: duration / 2,
            ease: 'power2.in',
            onComplete: () => {
                // 这里可以切换卡牌内容
                cardElement.classList.toggle('face-down');
            }
        })
            .to(cardElement, {
                scaleX: 1,
                duration: duration / 2,
                ease: 'power2.out'
            });

        return tl;
    }, []);

    /**
     * 卡牌出现动画
     */
    const animateCardAppear = useCallback((
        cardElement: HTMLElement,
        options: CardAnimationOptions = {}
    ) => {
        const {
            duration = 0.3,
            ease = 'back.out(1.7)',
            delay = 0,
            onComplete
        } = options;

        // 设置初始状态
        gsap.set(cardElement, {
            scale: 0,
            rotation: 180,
            opacity: 0
        });

        const tl = gsap.timeline({
            delay,
            onComplete
        });

        tl.to(cardElement, {
            scale: 1,
            rotation: 0,
            opacity: 1,
            duration,
            ease
        });

        return tl;
    }, []);

    /**
     * 卡牌消失动画
     */
    const animateCardDisappear = useCallback((
        cardElement: HTMLElement,
        options: CardAnimationOptions = {}
    ) => {
        const {
            duration = 0.3,
            ease = 'back.in(1.7)',
            delay = 0,
            onComplete
        } = options;

        const tl = gsap.timeline({
            delay,
            onComplete
        });

        tl.to(cardElement, {
            scale: 0,
            rotation: 180,
            opacity: 0,
            duration,
            ease
        });

        return tl;
    }, []);

    /**
     * 卡牌选中动画
     */
    const animateCardSelect = useCallback((
        cardElement: HTMLElement,
        isSelected: boolean,
        options: CardAnimationOptions = {}
    ) => {
        const {
            duration = 0.2,
            ease = 'power2.out',
            delay = 0,
            onComplete
        } = options;

        const tl = gsap.timeline({
            delay,
            onComplete
        });

        if (isSelected) {
            tl.to(cardElement, {
                scale: 1.1,
                y: -10,
                duration,
                ease
            });
        } else {
            tl.to(cardElement, {
                scale: 1,
                y: 0,
                duration,
                ease
            });
        }

        return tl;
    }, []);

    /**
     * 卡牌提示动画
     */
    const animateCardHint = useCallback((
        cardElement: HTMLElement,
        options: CardAnimationOptions = {}
    ) => {
        const {
            duration = 1,
            ease = 'power2.inOut',
            delay = 0,
            onComplete
        } = options;

        const tl = gsap.timeline({
            delay,
            onComplete,
            repeat: -1,
            yoyo: true
        });

        tl.to(cardElement, {
            scale: 1.05,
            boxShadow: '0 0 20px #FFC107',
            duration: duration / 2,
            ease
        });

        return tl;
    }, []);

    /**
     * 卡牌拖拽动画
     */
    const animateCardDrag = useCallback((
        cardElement: HTMLElement,
        isDragging: boolean,
        options: CardAnimationOptions = {}
    ) => {
        const {
            duration = 0.2,
            ease = 'power2.out',
            delay = 0,
            onComplete
        } = options;

        const tl = gsap.timeline({
            delay,
            onComplete
        });

        if (isDragging) {
            tl.to(cardElement, {
                scale: 1.1,
                rotation: 5,
                zIndex: 1000,
                duration,
                ease
            });
        } else {
            tl.to(cardElement, {
                scale: 1,
                rotation: 0,
                zIndex: 'auto',
                duration,
                ease
            });
        }

        return tl;
    }, []);

    /**
     * 卡牌序列移动动画
     */
    const animateCardSequenceMove = useCallback((
        cardElements: HTMLElement[],
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        options: CardAnimationOptions = {}
    ) => {
        const {
            duration = 0.5,
            ease = 'power2.out',
            delay = 0,
            onComplete
        } = options;

        const tl = gsap.timeline({
            delay,
            onComplete
        });

        cardElements.forEach((cardElement, index) => {
            const offsetY = index * 20; // 卡牌间距
            tl.to(cardElement, {
                x: toX,
                y: toY + offsetY,
                duration,
                ease: ease as any,
                onStart: () => {
                    cardElement.style.pointerEvents = 'none';
                },
                onComplete: () => {
                    cardElement.style.pointerEvents = 'auto';
                }
            }, index * 0.1); // 错开动画时间
        });

        return tl;
    }, []);

    /**
     * 卡牌自动移动动画
     */
    const animateCardAutoMove = useCallback((
        cardElement: HTMLElement,
        fromX: number,
        fromY: number,
        toX: number,
        toY: number,
        options: CardAnimationOptions = {}
    ) => {
        const {
            duration = 0.8,
            ease = 'power2.inOut',
            delay = 0,
            onComplete
        } = options;

        // 设置初始位置
        gsap.set(cardElement, {
            x: fromX,
            y: fromY,
            zIndex: 1000
        });

        const tl = gsap.timeline({
            delay,
            onComplete: () => {
                gsap.set(cardElement, { zIndex: 'auto' });
                onComplete?.();
            }
        });

        // 创建弧形路径
        const midX = (fromX + toX) / 2;
        const midY = Math.min(fromY, toY) - 50;

        tl.to(cardElement, {
            motionPath: {
                path: `M${fromX},${fromY} Q${midX},${midY} ${toX},${toY}`,
                autoRotate: true
            },
            duration,
            ease: ease as any
        });

        return tl;
    }, []);

    /**
     * 停止所有动画
     */
    const stopAllAnimations = useCallback(() => {
        if (timelineRef.current) {
            timelineRef.current.kill();
            timelineRef.current = null;
        }
        gsap.killTweensOf('*');
    }, []);

    /**
     * 暂停所有动画
     */
    const pauseAllAnimations = useCallback(() => {
        if (timelineRef.current) {
            timelineRef.current.pause();
        }
    }, []);

    /**
     * 恢复所有动画
     */
    const resumeAllAnimations = useCallback(() => {
        if (timelineRef.current) {
            timelineRef.current.resume();
        }
    }, []);

    return {
        animateCardMove,
        animateCardFlip,
        animateCardAppear,
        animateCardDisappear,
        animateCardSelect,
        animateCardHint,
        animateCardDrag,
        animateCardSequenceMove,
        animateCardAutoMove,
        stopAllAnimations,
        pauseAllAnimations,
        resumeAllAnimations
    };
};

export default useSoloCardAnimate;
