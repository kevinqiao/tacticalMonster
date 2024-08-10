import React, { useEffect, useState } from "react";
import { useUserManager } from "service/UserManager";
interface Props {
  closeTime?: number;
  onOver: () => void;
}
const CountDown: React.FC<Props> = ({ closeTime, onOver }) => {
  // const leftTimeRef = useRef<number>(0);
  const { user } = useUserManager();
  const [visible, setVisible] = useState(true);
  const [counter, setCounter] = useState<string | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  useEffect(() => {
    const formatTime = (time: number): string => {
      const hours = Math.floor(time / 3600000);
      const minutes = Math.floor((time % 3600000) / 60000);
      const seconds = Math.floor((time - hours * 3600000 - minutes * 60000) / 1000);
      return `${hours < 10 ? "0" : ""}${hours}:${minutes < 10 ? "0" : ""}${minutes}:${
        seconds < 10 ? "0" : ""
      }${seconds}`;
    };
    if (!closeTime || !visible || !user) return;

    const timer = setInterval(() => {
      const time = closeTime - Date.now() - user.timelag;
      if (time < 0) {
        onOver();
        clearInterval(timer);
      } else {
        setCounter(formatTime(time));
      }
    }, 1000);

    const time = closeTime - Date.now() + user.timelag;
    if (time < 0) {
      onOver();
      clearInterval(timer);
    } else {
      setCounter(formatTime(time));
    }

    // 清除计时器
    return () => clearInterval(timer);
  }, [user, closeTime, visible]); // 每次 timeLeft 更新时重新执行

  return <div>{counter}</div>;
};

export default CountDown;
