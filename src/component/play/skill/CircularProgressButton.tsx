import { gsap } from "gsap";
import React, { FunctionComponent, useCallback, useEffect } from "react";
import { useBattleManager } from "service/BattleManager";
import { useGameManager } from "service/GameManager";
import styled from "styled-components";
interface Props {
  degree: number;
}
const Eject = styled.div`
  width: 100%;
  height: 100%;
  background-image: url("icons/eject-button-outline-svgrepo-com.svg");
  background-size: cover;
`;
const Hammer = styled.div`
  width: 100%;
  height: 100%;
  background-image: url("icons/hammer-outline-svgrepo-com.svg");
  background-size: cover;
`;
const Shovel = styled.div<Props>`
  width: 100%;
  height: 100%;
  background-image: url("icons/shovel-svgrepo-com.svg");
  background-size: cover;
  transform: ${(props) => `rotate(${props.degree}deg)`};
`;
interface CircularProgressButtonProps {
  skill: number;
  progress?: number;
  onClick: () => void;
}

export const CircularProgressButton: FunctionComponent<CircularProgressButtonProps> = ({ skill, onClick }) => {
  const { currentSkill } = useBattleManager();
  const { game, gameEvent } = useGameManager();
  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const pid = "#skill" + skill + " #progress" + skill;
  // const strokeDashoffset = circumference - (80 / 100) * circumference;
  const toggle = useCallback(() => {
    if (game && game.data.skillBuff) {
      const sbuff = game?.data.skillBuff.find((s: { skill: number; progress: number }) => s.skill === skill);
      if (sbuff && sbuff.progress >= 100) {
        onClick();
      }
    }
  }, [onClick, game]);
  useEffect(() => {
    if (game && game.data?.skillBuff) {
      const sbuff = game.data.skillBuff.find((s: { skill: number; progress: number }) => s.skill === skill);
      if (sbuff) {
        const strokeDashoffset = circumference - (sbuff.progress / 100) * circumference;
        if (strokeDashoffset < circumference)
          gsap.to(pid, {
            strokeDashoffset: strokeDashoffset,
            duration: 0.8,
            ease: "power2.out",
          });
      }
    }
  }, [game]);
  useEffect(() => {
    if (skill && gameEvent && gameEvent.data?.gameData) {
      const { skillBuff } = gameEvent.data.gameData;
      if (skillBuff) {
        const sbuff = skillBuff.find((s: { skill: number; progress: number }) => s.skill === skill);
        if (sbuff) {
          const strokeDashoffset = circumference - (sbuff.progress / 100) * circumference;
          // console.log(skill + ":" + strokeDashoffset + ":" + circumference);

          gsap.to(pid, {
            strokeDasharray: circumference,
            strokeDashoffset: strokeDashoffset,
            duration: 0.8,
            ease: "power2.out",
          });
        }
      }
    }
  }, [skill, gameEvent]);
  return (
    <div style={{ position: "relative", top: 0, left: 0, width: 80, height: 80 }} onClick={toggle}>
      <svg id={"skill" + skill} width="100%" height="100%" viewBox="0 0 210 210">
        <circle cx="105" cy="105" r={radius} fill="transparent" stroke="#c3c4c7" strokeWidth="10" />
        <circle
          id={"progress" + skill}
          cx="105"
          cy="105"
          r={radius}
          fill={currentSkill === skill ? "white" : "grey"}
          stroke="tomato"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          strokeLinecap="round"
          transform="rotate(-90 105 105)"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
        }}
      >
        {skill === 1 ? (
          <div
            style={{
              width: "60%",
              height: "60%",
            }}
          >
            <Hammer />
          </div>
        ) : null}
        {skill === 2 ? (
          <div style={{ display: "flex", alignItems: "center", width: "100%", height: "100%" }}>
            <div style={{ position: "relative", left: 5, width: "50%", height: "50%" }}>
              <Shovel degree={0} />
            </div>
            <div style={{ position: "relative", left: -5, width: "50%", height: "50%" }}>
              <Shovel degree={180} />
            </div>
          </div>
        ) : null}
        {skill === 3 ? (
          <div
            style={{
              width: "60%",
              height: "60%",
            }}
          >
            <Eject />
          </div>
        ) : null}
      </div>
    </div>
  );
};
