import { useEffect, useRef, useState } from "react";

export const useDivVisibility = (elementRef: any) => {
  const [isVisible, setIsVisible] = useState(false);

  const callback = (entries: any) => {
    console.log("observing...");
    entries.forEach((entry: any) => {
      if (entry.isIntersecting) {
        console.log("visable");
        setIsVisible(true);
      } else {
        console.log("invisible");
        setIsVisible(false);
      }
    });
  };

  const observer = useRef(new IntersectionObserver(callback));

  useEffect(() => {
    const currentObserver = observer.current;
    currentObserver.disconnect(); // 断开之前的观察
    currentObserver.observe(elementRef.current);

    return () => {
      currentObserver.disconnect(); // 在组件卸载时停止观察
    };
  }, [elementRef]);

  return isVisible;
};

export const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      console.log("visible changed");
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return (): void => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isVisible;
};
