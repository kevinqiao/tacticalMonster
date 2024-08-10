import { BATTLE_LOAD } from "model/Constants";
import { SCENE_ID, SCENE_NAME } from "model/Match3Constants";
import { GameConsoleScene } from "model/SceneModel";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useBattleManager } from "service/BattleManager";
import { useGameManager } from "service/GameManager";
import { useSceneManager } from "service/SceneManager";
import { useUserManager } from "service/UserManager";
import { getGameConsoleBound } from "util/BattleBoundUtil";
import AvatarBar from "./AvatarBar";
import GoalPanel from "./GoalPanel";

const GameConsole: React.FC = () => {
  const { user } = useUserManager();
  const { load, battle, containerBound } = useBattleManager();
  const { createScene, scenes } = useSceneManager();
  const { game } = useGameManager();
  const [bound, setBound] = useState<{ x: number; y: number; width: number; height: number; mode: number } | null>(
    null
  );

  useEffect(() => {
    if (!battle || !game || !scenes || !containerBound || !user) return;

    const { width, height } = containerBound;
    const mode = battle.games?.length === 1 || load === BATTLE_LOAD.REPLAY ? 0 : game.uid === user.uid ? 1 : 2;
    const gameConsoleScenes = scenes.get(SCENE_NAME.GAME_CONSOLE_SCENES);
    const gameConsoleScene = gameConsoleScenes?.find((s: GameConsoleScene) => s.gameId === game.gameId);
    const nbound = getGameConsoleBound(width, height, mode);
    if (nbound) {
      if (!gameConsoleScene) {
        const consoleScene = {
          gameId: game.gameId,
          app: null,
          x: nbound.left,
          y: nbound.top,
          width: nbound.width,
          height: nbound.height,
          mode,
        };
        createScene(SCENE_ID.GAME_CONSOLE_SCENE, consoleScene);
      }
      setBound({
        x: nbound.left,
        y: nbound.top,
        width: nbound.width,
        height: nbound.height,
        mode: mode,
      });
    }
  }, [containerBound, scenes, game, user, battle]);
  const loadMove = useCallback(
    (el: HTMLElement | null) => {
      if (el && scenes && game && bound) {
        const gameConsoleScenes = scenes.get(SCENE_NAME.GAME_CONSOLE_SCENES);
        const gameConsoleScene = gameConsoleScenes?.find((s: GameConsoleScene) => s.gameId === game.gameId);
        if (gameConsoleScene) {
          gameConsoleScene.moveDiv = el;
        }
      }
    },
    [game, scenes, bound]
  );

  const moves = useMemo(() => {
    if (battle && game) {
      return battle.data.steps - game.data.move;
    }
    return null;
  }, [battle, game]);
  const render = useMemo(() => {
    return (
      <>
        <div
          // ref={sceneRef}
          style={{
            position: "absolute",
            top: bound?.y,
            left: bound?.x,
            width: bound?.width,
            height: bound?.height,
            margin: 0,
            borderRadius: 0,
            backgroundColor: "transparent",
          }}
        >
          {bound && bound.mode > 0 ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: bound?.mode === 1 ? "flex-start" : "flex-end",
              }}
            >
              <div style={{ width: "80%", height: 45 }}>
                {bound && game ? <AvatarBar key="player" layout={bound.mode} game={game} /> : null}
              </div>
              <div style={{ position: "relative", left: -10, width: "80%" }}>
                {bound && game ? <GoalPanel layout={bound.mode} game={game} /> : null}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", width: "80%", height: 45 }}>
                {bound && game ? (
                  <div style={{ fontSize: 15, color: "white" }}>
                    Move:<span ref={loadMove}>{moves}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </>
    );
  }, [bound, game, battle]);
  return <>{render}</>;
};

export default GameConsole;
