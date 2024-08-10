import { useEffect, useState } from 'react';

const useSleep = (initialCount: number, delay: number): number => {
    const [count, setCount] = useState<number>(initialCount);

    useEffect(() => {
        const timer = setTimeout(() => {
            setCount(count + 1);
        }, delay);

        return () => clearTimeout(timer);
    }, [count, delay]);

    return count;
};
export default useSleep
