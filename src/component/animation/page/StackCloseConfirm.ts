
import gsap from "gsap";
import { useCallback } from "react";
interface Props {
    closeMask: any;
    confirmDiv: any;
}
const useStackCloseConfirm = ({ closeMask, confirmDiv }: Props) => {

    const openConfirm = useCallback(() => {
        const tl = gsap.timeline({
            onComplete: () => {
                tl.kill();
            },
        });
        tl.to(closeMask.current, { autoAlpha: 0.6, duration: 0.7 }).to(
            confirmDiv.current,
            { scale: 1, autoAlpha: 1, duration: 0.7 },
            "<"
        );
        tl.play();
    }, [closeMask, confirmDiv])


    return { openConfirm }
}
export default useStackCloseConfirm