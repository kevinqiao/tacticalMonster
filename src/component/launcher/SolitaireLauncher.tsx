import { useConvex } from "convex/react";
import React, { useEffect } from "react";
import { usePageManager } from "service/PageManager";
import { SSAProvider } from "service/SSAManager";
import { useUserManager } from "service/UserManager";
const SolitaireLauncherMain: React.FC<{ open: () => void, game: { name: string; id: string; status: number } }> = ({ open, game }) => {
  const { user } = useUserManager();
  const convex = useConvex();
  const { openPage } = usePageManager();

  useEffect(() => {

    const fetchGame = async (gameId: string) => {

      if (gameId) {

        console.log("open game", game);
        openPage({ uri: "/play/lobby/c3", data: { gameId: game.id } })
      }
    }
    if (game?.id) fetchGame(game.id);
  }, [game]);
  return <></>

};
const SolitaireLauncher: React.FC<{ game: { name: string; id: string; status: number }, open: () => void }> = ({ game, open }) => {
  return (
    <SSAProvider app="solitaire">
      <SolitaireLauncherMain open={open} game={game} />
    </SSAProvider>
  );
};

export default SolitaireLauncher;
