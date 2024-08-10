import { useSlideNavManager } from "component/SlideNavManager";
import { useConvex } from "convex/react";
import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { api } from "../../convex/_generated/api";
import useCoord from "../../service/TerminalManager";
import { useUserManager } from "../../service/UserManager";
import RecordItem from "./RecordItem";
import "./battle.css";
interface ContainerProps {
  height: string;
}
const Container = styled.div<ContainerProps>`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  height: ${(props) => props.height};
  overflow-y: auto;
  overflow-x: hidden;
`;

const RecordListHome: React.FC = () => {
  const battleRef = useRef<HTMLDivElement | null>(null);
  const { width, height, headH, LobbyMenuH } = useCoord();
  const { user } = useUserManager();
  const { menuIndex } = useSlideNavManager();
  const [battles, setBattles] = useState<any>(null);
  const convex = useConvex();

  useEffect(() => {
    const getList = async () => {
      const history = await convex.action(api.battle.findMyBattles, { uid: user.uid, token: user.token });
      if (history) {
        history.sort((a: any, b: any) => b.time - a.time);
        setBattles(history);
      } else setBattles([]);
    };
    if (!user || !convex || menuIndex !== 2) return;
    getList();
  }, [user, convex, menuIndex]);

  return (
    <>
      <Container height={`${height}px`}>
        <div
          ref={battleRef}
          style={{
            width: "100%",
            height: "100%",
          }}
        >
          <div style={{ height: headH }}></div>
          {battles && battles.map((t: any, index: number) => <RecordItem key={t.battleId} {...t} />)}
        </div>
      </Container>
    </>
  );
};

export default RecordListHome;
