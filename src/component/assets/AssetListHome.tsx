import React, { useEffect, useState } from "react";
import useEventSubscriber from "service/EventManager";
import { useUserManager } from "service/UserManager";
import styled from "styled-components";
import useCoord from "../../service/TerminalManager";
interface ContainerProps {
  height: string;
}
const Container = styled.div<ContainerProps>`
  display: flex;
  flexdirection: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  height: ${(props) => props.height};
  background-color: white;
  overflow-y: auto;
  overflow-x: hidden;
`;
const AssetListHome: React.FC = () => {
  const { width, height, headH, LobbyMenuH } = useCoord();
  const { user } = useUserManager();
  const [assets, setAssets] = useState<{ asset: number; amount: number }[]>([]);
  const { createEvent } = useEventSubscriber([], []);
  useEffect(() => {
    if (user?.assets) setAssets(user.assets);
  }, [user]);
  return (
    <Container height={`${height - headH}px`}>
      <div style={{ width: "100%", height: "100%" }}>
        <div style={{ height: width < height ? LobbyMenuH : headH }}></div>
        {assets.map((asset) => (
          <div
            key={asset.asset}
            style={{ cursor: "pointer", width: 400, height: 40, backgroundColor: "red", marginBottom: 20 }}
            onClick={() =>
              createEvent({ name: "assetClaimed", topic: "asset", data: { asset: asset.asset, amount: 40 }, delay: 0 })
            }
          >
            {asset.asset}:{asset.amount}
          </div>
        ))}
      </div>
    </Container>
  );
};

export default AssetListHome;
