import { useEffect, useState } from "react";

const useDimension = (eleRef: React.MutableRefObject<HTMLDivElement | null>) => {
    const [dimension, setDimension] = useState<{ top: number; bottom: number; left: number; right: number; width: number; height: number }>({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 });
    useEffect(() => {
        const updateDimensions = () => {
            if (eleRef.current) {
                const rect = eleRef.current.getBoundingClientRect();
                const { top, left, right, bottom } = rect;
                setDimension({
                    width: eleRef.current.offsetWidth,
                    height: eleRef.current.offsetHeight,
                    top,
                    left,
                    bottom,
                    right
                });
            }
        };
        window.addEventListener("resize", updateDimensions);
        updateDimensions(); // Initial dimension setting
        return () => {
            window.removeEventListener("resize", updateDimensions);
        };
    }, [eleRef.current]);
    return dimension
}
export default useDimension;