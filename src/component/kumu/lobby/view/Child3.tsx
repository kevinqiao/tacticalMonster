import { PageProp } from "component/RenderApp";
import React, { useMemo } from "react";

const Child3Main: React.FC<{ gameId: string }> = ({ gameId }) => {

  const render = useMemo(() => {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: "green" }} >
        {/* <BattlePlayer gameId={gameId} /> */}
      </div>
    )
  }, [gameId])
  return <>
    {render}
  </>
};
const Child3: React.FC<PageProp> = ({ visible, data }) => {

  if (!data?.gameId)
    return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: "white" }} >
    </div>
  const render = useMemo(() => {
    return (
      <Child3Main gameId={data.gameId} />
    )
  }, [visible, data])
  return render;
};

export default Child3;
