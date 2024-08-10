import { BATTLE_LOAD } from "model/Constants";
import React, { useEffect, useRef, useState } from "react";
import { useUserManager } from "service/UserManager";
import { useBattleManager } from "../../../service/BattleManager";
import { useSceneManager } from "../../../service/SceneManager";

const TimeCount = () => {
  const { user } = useUserManager();
  const { visible } = useSceneManager();
  const { load, battle, timeout } = useBattleManager();
  const pauseTimeRef = useRef(-1);
  const [timeLeft, setTimeLeft] = useState<number>(-1);

  useEffect(() => {
    if (!battle || !user || !visible) return;

    if (load === BATTLE_LOAD.REPLAY) {
      if (!visible) pauseTimeRef.current = timeLeft;
      else {
        pauseTimeRef.current >= 0 ? setTimeLeft(pauseTimeRef.current) : setTimeLeft(Math.ceil(battle.duration / 1000));
      }
    } else {
      const time = Math.ceil((battle.duration + ((battle.startTime ?? 0) - Date.now() - user.timelag)) / 1000);
      if (time > 0) setTimeLeft(time);
    }
  }, [load, visible, battle, user]);

  useEffect(() => {
    if (timeLeft < 0) return;
    const timer = setInterval(() => {
      setTimeLeft((pre) => pre - 1);
    }, 1000);

    if (timeLeft === 0) {
      clearInterval(timer);
      timeout();
    }

    // 清除计时器
    return () => clearInterval(timer);
  }, [timeLeft]); // 每次 timeLeft 更新时重新执行

  const formatTime = (time: number): string => {
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: 60,
        height: 25,
        margin: 0,
        borderRadius: 0,
        color: "white",
      }}
    >
      <div>{timeLeft > 0 ? formatTime(timeLeft) : "00:00"}</div>
    </div>
  );
};

export default TimeCount;
