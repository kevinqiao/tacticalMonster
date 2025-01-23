import { PageProp } from "component/RenderApp";
import { useAction, useQuery } from "convex/react";
import React, { useEffect, useState } from "react";
import { usePageManager } from "service/PageManager";
import { SSAProvider } from "service/SSAManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../convex/tm/convex/_generated/api";
import "./map.css";
const PlayGroundMain: React.FC<PageProp> = (props) => {
  const [lastTime, setLastTime] = useState<number | undefined>(undefined);
  const { openPage } = usePageManager();
  const { authComplete } = useUserManager();
  const events = useQuery(api.dao.tmEventDao.find, { uid: "1", lastTime });
  const startGame = useAction(api.service.tmGameProxy.start);
  useEffect(() => {
    if (typeof events === "number") setLastTime((pre) => (!pre || pre !== events ? events : pre));
    else if (events && events.length > 0) {
      for (const event of events) {
        const gameEvent = event as { name: string; uid: string; time: number; data: any; id: string };
        if (gameEvent.name === "GameCreated") {
          openPage({ uri: "/play/map", data: gameEvent.data });
        }
      }
      setLastTime(events[events.length - 1]["time"]);
    }
  }, [events]);


  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%", backgroundColor: "red" }}>
        <div className="action-panel-item" onClick={() => startGame()}>
          START
        </div>
      </div>

    </>
  );
};
const PlayGround: React.FC<PageProp> = (props) => {
  return (
    <SSAProvider app="tacticalMonster">
      <PlayGroundMain {...props} />
    </SSAProvider>
  );
};

export default PlayGround;
