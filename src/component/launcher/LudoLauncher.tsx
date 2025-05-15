import { useConvex } from "convex/react";
import React, { useEffect } from "react";
import { usePageManager } from "service/PageManager";
import { SSAProvider } from "service/SSAManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../convex/ludo/convex/_generated/api";
const LudoLauncherMain: React.FC<{ open: () => void, game: { name: string; id: string; status: number } }> = ({ open, game }) => {
  const { 
     user } = useUserManager();
  const convex = useConvex();
  const { openPage } = usePageManager();

  useEffect(() => {

    const fetchGame = async (gameId: string) => {

      if (gameId) {
        const gameObj = await convex.query(api.dao.gameDao.find, {
          gameId: gameId, uid: "1",
          token: "test-token"
        });

        if (user && gameObj && gameObj.status <= 1 && !location.pathname.includes("/play/lobby/c1")) {
          if (user?.game?.status > 0)//1-loaded ever before
            open();
          else {
            console.log("open game", game);
            openPage({ uri: "/play/lobby/c1", data: { gameId: game.id } })
        
          }
        }
      }
    }
    if (game?.id) fetchGame(game.id);
  }, [game, user]);
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
