import { Coin, Diamond } from "component/icons/AssetIcons";
import WonIcon from "component/icons/WonIcon";
import React from "react";
import useEventSubscriber from "service/EventManager";
interface Props {
  reward: {
    battleId: string;
    collected: number; //0-to collect 1-collected
    assets: { asset: number; amount: number }[] | null;
  } | null;
}
const RewardItem: React.FC<Props> = ({ reward }) => {
  const { createEvent } = useEventSubscriber([], []);
  return (
    <div style={{ position: "relative", width: "100%", height: "75%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          height: "100%",
        }}
        // onClick={() =>
        //   createEvent({ name: "assetCollected", topic: "asset", data: [{ asset: 1, amount: 40 }], delay: 0 })
        // }
      >
        <WonIcon />
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "70%",
          fontSize: 12,
        }}
      >
        {reward?.assets?.map((a, index) => (
          <div key={a.asset} style={{ display: "flex", justifyContent: "center", width: "100%" }}>
            <div style={{ width: 15, height: 15, marginRight: 5 }}>
              {a.asset === 1 ? <Diamond /> : null}
              {a.asset === 2 ? <Coin /> : null}
            </div>
            <span>{a.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RewardItem;
