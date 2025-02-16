import { useConvex } from "convex/react";
import React, { useEffect } from "react";
import { usePageManager } from "service/PageManager";
import { SSAProvider } from "service/SSAManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../convex/ludo/convex/_generated/api";
const LudoLauncherMain: React.FC<{ open: () => void, game: { name: string; id: string; status: number } }> = ({ open, game }) => {
  const { updateLoaded } = useUserManager();
  const convex = useConvex();
  const { openPage } = usePageManager();

  useEffect(() => {

    const fetchGame = async (gameId: string) => {

      if (gameId) {
        const gameObj = await convex.query(api.dao.gameDao.find, {
          gameId: gameId, uid: "1",
          token: "test-token"
        });
        if (!gameObj.status) {
          if (game.status > 0)
            open();
          else {
            console.log("open game", game);
            openPage({ uri: "/play/lobby/c1", data: { gameId: game.id } })
            updateLoaded();
          }
        }
      }
    }
    if (game?.id) fetchGame(game.id);
  }, [game]);
  return <></>

};
const LudoLauncher: React.FC<{ game: { name: string; id: string; status: number }, open: () => void }> = ({ game, open }) => {
  return (
    <SSAProvider app="ludo">
      <LudoLauncherMain open={open} game={game} />
    </SSAProvider>
  );
};

export default LudoLauncher;
