import { useConvex } from "convex/react";
import React, { useEffect } from "react";
import { SSAProvider } from "service/SSAManager";
import { useUserManager } from "service/UserManager";
import { api } from "../../convex/ludo/convex/_generated/api";

const TacticalMonsterLauncherMain: React.FC<{ open: () => void, game: { name: string; id: string; status: number } }> = ({ open, game }) => {
  const { user, updateLoaded } = useUserManager();
  const convex = useConvex();


  useEffect(() => {

    const fetchGame = async (gameId: string) => {
      if (gameId) {
        const gameObj = await convex.query(api.dao.gameDao.find, {
          gameId: user.game.id, uid: user.uid,
          token: "test-token"
        });
        if (gameObj && !gameObj.status) {
          open();
        } else {
          updateLoaded();
        }
      }
    }
    if (game && !location.pathname.includes("/play/map")) fetchGame(game.id);
  }, [user, updateLoaded]);
  return <></>

};
const TacticalMonsterLauncher: React.FC<{ game: { name: string; id: string; status: number }, open: () => void }> = ({ game, open }) => {
  return (
    <SSAProvider app="tacticalMonster">
      <TacticalMonsterLauncherMain open={open} game={game} />
    </SSAProvider>
  );
};

export default TacticalMonsterLauncher;
