
import { useCallback } from "react";
export interface RegisterAnimateProps {
    productRef: React.MutableRefObject<HTMLDivElement | null>;
    cartRef: React.MutableRefObject<HTMLDivElement | null>;
    lineItemRef: React.MutableRefObject<HTMLDivElement | null>;
}

const useRegisterAnimate = ({ productRef, cartRef, lineItemRef }: RegisterAnimateProps) => {


    const playReview = useCallback((timeline: any, canClose: boolean) => {

        return;
    }, []);


    const playLineItem = useCallback((timeline: any) => {
        return
    }, []);


    return { playReview, playLineItem }
}
export default useRegisterAnimate