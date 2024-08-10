import { SCENE_NAME } from "model/Match3Constants";
import { GameConsoleScene } from "model/SceneModel";
import React, { useCallback, useMemo } from "react";
import { useSceneManager } from "service/SceneManager";
import { useUserManager } from "service/UserManager";
import { useBattleManager } from "../../../service/BattleManager";
import AvatarBar from "./AvatarBar";
import GoalPanel from "./GoalPanel";
import SoloConsole from "./SoloConsole";
import TimeCount from "./TimeCount";

const BattleConsole: React.FC = () => {
  const { user } = useUserManager();
  const { battle, containerBound } = useBattleManager();

  const { scenes } = useSceneManager();

  const mode = useMemo(() => {
    if (battle?.games) {
      return battle.games.length === 1 ? 1 : 2;
    }
    return 0;
  }, [battle]);

  const bound = useMemo(() => {
    if (battle?.games && containerBound) {
      const { width, height } = containerBound;
      const b = { top: 50, left: 0, width, height: 80 };
      if (mode > 1) {
        if (width < height) b.width = width / 2;
        b.height = height * 0.2;
      }
      return b;
    }
  }, [battle, containerBound]);

  const playerGame = useMemo(() => {
    if (user && battle?.games) {
      const game = battle.games.find((g) => g.uid === user.uid);
      return game;
    }
    return null;
  }, [battle, user]);
  const opponentGame = useMemo(() => {
    if (user && battle?.games) {
      const game = battle.games.find((g) => g.uid !== user.uid);
      return game;
    }
    return null;
  }, [battle, user]);

  const load = useCallback(
    (ele: HTMLDivElement | null) => {
      if (ele && bound && scenes) {
        const consoleScene = {
          app: ele,
          x: bound.left,
          y: bound.top,
          width: bound.width,
          height: bound.height,
        };
        scenes.set(SCENE_NAME.BATTLE_CONSOLE, consoleScene);
      }
    },
    [bound, scenes]
  );

  const loadMove = useCallback(
    (gameId: string, ele: HTMLElement | null) => {
      const gameConsoleScenes = scenes?.get(SCENE_NAME.GAME_CONSOLE_SCENES);
      const gameConsoleScene = gameConsoleScenes?.find((s: GameConsoleScene) => s.gameId === gameId);
      if (gameConsoleScene) gameConsoleScene.moves = ele;
    },
    [bound, scenes]
  );

  return (
    <>
      {bound && battle ? (
        <div
          ref={load}
          style={{
            display: "flex",
            justifyContent: "center",
            position: "absolute",
            top: bound.top,
            left: bound.left,
            width: bound.width,
            height: bound.height,
          }}
        >
          {mode === 1 ? (
            <div
              id="solo-console"
              style={{
                display: "flex",
                justifyContent: "center",
                width: "80%",
                height: "100%",
                maxWidth: 500,
              }}
            >
              <SoloConsole />
            </div>
          ) : (
            <>
              <div style={{ position: "fixed", top: 0, left: 0 }}>
                <TimeCount />
              </div>
              <div id="dual-console" style={{ display: "flex", justifyContent: "center", width: "80%", maxWidth: 500 }}>
                {playerGame && battle?.data ? (
                  <div
                    id="player_console"
                    style={{
                      width: "50%",
                      height: 45,
                    }}
                  >
                    <AvatarBar key="player" layout={1} game={playerGame} />
                    <GoalPanel layout={1} game={playerGame} />

                    <div style={{ fontSize: 15, color: "white" }}>
                      Move:
                      <span ref={(el) => loadMove(playerGame.gameId, el)}>
                        {battle.data ? (battle.data.steps ?? 0) - (playerGame.data.move ?? 0) : null}
                      </span>
                    </div>
                  </div>
                ) : null}
                {opponentGame ? (
                  <div
                    id="opponent_console"
                    style={{
                      width: "50%",
                      height: 45,
                    }}
                  >
                    <AvatarBar key="player" layout={2} game={opponentGame} />
                    <GoalPanel layout={2} game={opponentGame} />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        width: "100%",
                        fontSize: 15,
                        color: "white",
                      }}
                    >
                      Move:
                      <span ref={(el) => loadMove(opponentGame.gameId, el)}>
                        {battle.data ? (battle?.data.steps ?? 0) - (opponentGame.data.move ?? 0) : null}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </>
  );
};

export default BattleConsole;
