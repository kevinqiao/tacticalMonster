import { PageProp } from "component/RenderApp";
import React, { useMemo } from "react";

const Child4Main: React.FC<{ gameId: string }> = ({ gameId }) => {

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
const Child4: React.FC<PageProp> = ({ visible, data }) => {
  console.log("Child4", data)
  if (!data?.gameId)
    return <div style={{ position: "fixed", top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: "white" }}>
      Child4
    </div>
  const render = useMemo(() => {
    return (
      <Child4Main gameId={data.gameId} />
    )
  }, [visible, data])
  return render;
};

export default Child4;
