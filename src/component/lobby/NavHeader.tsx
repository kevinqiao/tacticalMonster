import AssetCollectAnimate from "component/lobby/AssetCollectAnimate";
import gsap from "gsap";
import React, { useEffect, useMemo, useRef, useState } from "react";
import useCoord from "service/TerminalManager";
import { useUserManager } from "service/UserManager";
import styled from "styled-components";
import MenuBar from "./menubar/MenuBar";
interface Props {
  height: string;
  width: string;
}
const CloseButton = styled.div`
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 35px;
  background-color: blue;
  border-radius: 0px 0px 0px 8px;
  color: white;
`;
const Mask = styled.div`
  position: fixed;
  z-index: 999;
  top: 0px;
  left: 0px;
  opacity: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
`;
const MenuPanel = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: fixed;
  z-index: 10000;
  top: 40px;
  right: -190px;
  height: 300px;
  width: 190px;
  background-color: white;
  border-radius: 8px 0px 0px 8px;
`;
const MenuList = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
`;
const MenuItem = styled.div`
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 80%;
  height: 35px;
  background-color: blue;
  border-radius: 4px;
  margin-top: 10px;
`;
const NavHead = styled.div<Props>`
  position: relative;
  left: 0px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: ${(props) => props.height};
  width: ${(props) => props.width};
  min-width: 400px;
  border-radius: 0px 0px 8px 8px;
`;
const Avatar = styled.div`
  width: 40px;
  height: 40px;
  background-image: url("/avatars/1.svg");
  background-size: cover;
`;
const AssetContainer = styled.div`
  marign-left: 50px;
  height: 100%;
  display: flex;
  align-items: center;
`;
const Asset = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  width: 60px;
  height: 25px;
  margin-left: 10px;
  background-color: grey;
  border-radius: 7px;
`;
const Diamond = styled.div`
  position: relative;
  left: -10px;
  width: 25px;
  height: 25px;
  background-image: url("icons/diamond_gold.svg");
  background-size: cover;
`;
const Coin = styled.div`
  position: relative;
  left: -12px;
  width: 25px;
  height: 25px;
  background-image: url("icons/coin.svg");
  background-size: cover;
`;
const MenuIcon = styled.div`
  cursor: pointer;
  width: 35px;
  height: 35px;
  margin-right: 10px;
  background-image: url("icons/list.svg");
  background-size: cover;
`;

const NavHeader = () => {
  const [menubarOpen, setMenubarOpen] = useState(false);
  const { user, userEvent } = useUserManager();
  const [assets, setAssets] = useState<{ asset: number; amount: number }[]>([]);
  const { headH } = useCoord();
  const maskRef = useRef<HTMLDivElement | null>(null);
  const diamondRef = useRef<HTMLDivElement | null>(null);
  const coinRef = useRef<HTMLDivElement | null>(null);
  const menuIconRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (userEvent && user) {
      console.log(userEvent);
      if (userEvent?.name === "assetUpdated") {
        // const { asset, amount } = userEvent.data;
        for (const item of userEvent.data) {
          const { asset, amount } = item;
          const as = user.assets.find((a: { asset: number; amount: number }) => a.asset === asset);
          if (as) as.amount = amount;
          else user.assets.push({ asset, amount });
          setAssets([...user.assets]);
        }
      }
    }
  }, [user, userEvent]);
  useEffect(() => {
    if (maskRef.current) gsap.to(maskRef.current, { autoAlpha: 0, duration: 0 });
    if (user?.assets) setAssets(user.assets);
  }, [user]);

  const openAsset = (asset: number) => {
    console.log("open asset:" + asset);
  };
  const toggleMenubar = () => {
    setMenubarOpen((pre) => !pre);
  };

  const diamond = useMemo(() => {
    const asset = assets?.find((a) => a.asset === 1);
    if (asset) return asset.amount;
    return 0;
  }, [assets]);
  const coin = useMemo(() => {
    const asset = assets.find((a) => a.asset === 2);
    if (asset) return asset.amount;
    return 0;
  }, [assets]);
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1000,
          width: "100%",
          opacity: 0.9,
          height: `${headH}px`,
          backgroundColor: "blue",
        }}
      ></div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1002,
          display: "flex",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <NavHead height={`${headH}px`} width={"100%"}>
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", height: "100%" }}>
            <Avatar></Avatar>
            <div style={{ width: 20 }} />
            <AssetContainer>
              <Asset ref={diamondRef} onClick={() => openAsset(1)}>
                <Diamond />
                <span style={{ color: "white", fontSize: 12 }}>{diamond}</span>
              </Asset>
              <div style={{ width: 40 }} />
              <Asset ref={coinRef} onClick={() => openAsset(2)}>
                <Coin />
                <span style={{ color: "white", fontSize: 12 }}>{coin}</span>
              </Asset>
            </AssetContainer>
          </div>
          <MenuIcon ref={menuIconRef} onClick={toggleMenubar} />
        </NavHead>
      </div>

      <AssetCollectAnimate diamondDivRef={diamondRef} coinDivRef={coinRef} assets={assets} />
      <MenuBar menuIconRef={menuIconRef} open={menubarOpen} onClose={() => setMenubarOpen(false)} />
    </>
  );
};

export default NavHeader;
