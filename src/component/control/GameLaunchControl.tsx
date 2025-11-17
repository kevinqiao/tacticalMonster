import React, { lazy, Suspense, useMemo } from "react";
import { useUserManager } from "service/UserManager";


const GAME_PROVIDER: { [key: string]: string } = {
  SOLITAIRE: "SolitaireArenaLauncher",
  LUDO: "LudoArenaLauncher",
  TACTICAL_MONSTER: "TacticalMonsterArenaLauncher",
}

// 优化的主渲染组件
const GameLaunchControl: React.FC = () => {
  const { user } = useUserManager();

  const SelectedComponent = useMemo(() => {

    if (user && user.data?.game?.gameId) {
      const name: string = user.data.game?.name?.toLowerCase() ?? 'solitaire';
      console.log("GameLaunchControl:", name);
      if (GAME_PROVIDER[name.toUpperCase()]) {
        const path = `./provider/${GAME_PROVIDER[name.toUpperCase()]}`;
        return lazy(() => import(`${path}`));
      }
    }
    return null;
  }, [user]);

  return (
    <>
      {user && SelectedComponent && <Suspense fallback={<div />}>
        <SelectedComponent gameId={user.data.game?.gameId} />
      </Suspense>}
    </>
  );
};

export default GameLaunchControl;
