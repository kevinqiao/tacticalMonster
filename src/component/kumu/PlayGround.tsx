import { PageProp } from "component/RenderApp";
import { useAction, useQuery } from "convex/react";
import React, { useEffect, useState } from "react";
import { usePageManager } from "service/PageManager";
import { api } from "../../convex/_generated/api";
import "./map.css";
const PlayGround: React.FC<PageProp> = (props) => {
  const [lastTime, setLastTime] = useState<number | undefined>(undefined);
  const { openPage } = usePageManager();
  const events = useQuery(api.dao.tmEventDao.find, { uid: "1", lastTime });
  const startGame = useAction(api.service.tmGameProxy.start);
  useEffect(() => {
    console.log(props);
    if (typeof events === "number") setLastTime((pre) => (!pre || pre !== events ? events : pre));
    else if (events && events.length > 0) {
      for (const event of events) {
        const gameEvent = event as { name: string; uid: string; time: number; data: any; id: string };
        if (gameEvent.name === "GameCreated") {
          // openPage({ name: "map", app: "playPlace", data: gameEvent.data });
        }
      }
      setLastTime(events[events.length - 1]["time"]);
    }
  }, [events]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100%" }}>
        <div className="action-panel-item" onClick={() => startGame()}>
          START
        </div>
      </div>
      <div className="action-panel" style={{ left: 0 }}>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/main/c1" })}>
          Child1
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/main/c2" })}>
          Child2
        </div>
        <div className="action-panel-item" onClick={() => openPage({ uri: "/play/main/c3" })}>
          Child3
        </div>
      </div>
    </>
  );
};

export default PlayGround;