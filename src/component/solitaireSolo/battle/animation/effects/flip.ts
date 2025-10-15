import gsap from "gsap";
import { popCard } from "./popCard";
export const flipCard = ({ data, onComplete }: { data: any; onComplete?: () => void }) => {
    const { card } = data;
    const tl = gsap.timeline({
        onComplete: () => {
            onComplete?.();
        }
    });
    if (card.ele) {
        popCard(card);
        tl.to(card.ele, {
            rotateY: 180,
            duration: 0.5,
            ease: "ease.out"
        });
    }
    tl.play();
    return;

}