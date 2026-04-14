import { URLS } from "@/service/TournamentManager";
import { PageProp } from "component/RenderApp";
import { ConvexHttpClient } from "convex/browser";

import React, { useEffect } from "react";

const Child2: React.FC<PageProp> = ({ visible, data }) => {
  // 开发环境：使用本地服务器；生产环境：使用远程服务器
  const tacticalMonsterUrl = process.env.NODE_ENV === 'development'
    ? URLS.tacticalMonster  // 本地开发服务器
    : URLS.tacticalMonster;     // 远程服务器

  const tacticalMonsterClient = React.useMemo(() => {
    console.log("tacticalMonsterUrl", tacticalMonsterUrl);
    return new ConvexHttpClient(tacticalMonsterUrl)
  }, [
    tacticalMonsterUrl
  ]);
  useEffect(() => {

    if (tacticalMonsterClient) {
      // loadMonster();
    }
    console.log("tacticamonst")
  }, [tacticalMonsterClient]);
  return (<div
    style={{
      width: "100%",
      height: "100%",
      backgroundColor: "yellow",
    }}
  >
    {/* <Character3DDemo /> */}
    {/* <CharacterWalkDemo /> */}
    {/* 仅播动画的独立 Canvas，用于排查 primitive 可见性：<AnimationPreview3D /> */}
    {/* <AnimationPreview3D /> */}
  </div>
  )
};
export default Child2;
