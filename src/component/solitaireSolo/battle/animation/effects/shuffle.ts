import gsap from "gsap";
import { SoloCard } from "../../types/SoloTypes";

export const shuffle = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {

    const { cards, boardDimension } = data;

    if (boardDimension && cards) {
        const centerX = (boardDimension.width - boardDimension.cardWidth) / 2;
        const centerY = (boardDimension.height - boardDimension.cardHeight) / 2;
        const tl = gsap.timeline({
            onStart: () => {
                console.log("whole start")
            }
        });
        const ctl = gsap.timeline({
            onStart: () => {
                console.log("center start")
            },
            onComplete: () => {
                console.log("center complete")
            }
        });
        const eles = cards.map((card: SoloCard) => card.ele);
        cards.forEach((card: SoloCard, index: number) => {
            if (card.ele) {
                gsap.set(card.ele, { x: centerX, y: centerY, autoAlpha: 0 });
                ctl.to(card.ele, {
                    autoAlpha: 1,
                    duration: 0.2,
                    ease: "power2.out"
                }, "<");
            }
        });

        const stl = gsap.timeline({
            onStart: () => {
                console.log("shuffle start")
            }
        });
        stl.to(eles, {
            x: () => centerX + Math.random() * 600 - 300, // 随机 x 位移 (-300 到 300)
            y: () => centerY + Math.random() * 400 - 200, // 随机 y 位移 (-200 到 200)
            rotation: () => Math.random() * 360, // 随机旋转
            duration: 0.5,
            stagger: 0.01, // 每张牌依次动画
            ease: "power2.out",
        });
        stl.to(eles, {
            x: centerX, // 收集到的 x 坐标
            y: centerY, // 收集到的 y 坐标
            rotation: 0,
            duration: 0.5,
            stagger: 0.01,
            ease: "power2.in",
        });
        const ftl = gsap.timeline();
        ftl.to(eles, {
            x: boardDimension.width - 100,
            y: 100,
            duration: 0.5,
            ease: "power2.out",
        });
        tl.add(ctl, ">=+0.2");
        tl.add(stl, "+=0");
        tl.add(ftl, ">=+0.5");
        tl.play();
    }
    return;
}