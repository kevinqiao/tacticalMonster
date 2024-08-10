// hooks/useTimer.ts
import { useEffect, useState } from "react";

function useTimer(initialValue: number = 0): number {
  const [seconds, setSeconds] = useState<number>(initialValue);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prevSeconds) => prevSeconds + 1);
    }, 1000);

    // Cleanup function to clear the interval when the component using the hook is unmounted
    return () => clearInterval(interval);
  }, []); // Empty dependency array ensures the effect runs only once when the component mounts

  return seconds;
}

export default useTimer;
