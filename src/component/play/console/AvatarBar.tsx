import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBattleManager } from "service/BattleManager";
import { SCENE_NAME } from "../../../model/Match3Constants";
import { GameConsoleScene } from "../../../model/SceneModel";
import { useSceneManager } from "../../../service/SceneManager";
import * as GameUtils from "../../../util/MatchGameUtils";
import useDimension from "../../../util/useDimension";
import Avatar from "../common/Avatar";

interface Props {
  layout: number;
  game: { uid: string; avatar?: number; gameId: string; data?: any };
}
//layout--0:left 1--right
const AvatarBar: React.FC<Props> = ({ layout, game }) => {
  const sceneContainerRef = useRef<HTMLDivElement | null>(null);
  const { battle } = useBattleManager();
  const { width, height } = useDimension(sceneContainerRef);
  const { scenes } = useSceneManager();
  const [score, setScore] = useState<number>(0);

  const player = useMemo(() => {
    if (battle?.players) {
      const p = battle.players.find((g) => g.gameId === game.gameId);
      return p;
    }
    return null;
  }, [battle, game]);

  const gameConsoleScene = useMemo(() => {
    let consoleScene: GameConsoleScene | null = null;
    const gameConsoleScenes = scenes?.get(SCENE_NAME.GAME_CONSOLE_SCENES);
    if (gameConsoleScenes) {
      consoleScene = gameConsoleScenes?.find((s: GameConsoleScene) => s.gameId === game.gameId);
      if (!consoleScene) {
        consoleScene = { gameId: game.gameId };
        gameConsoleScenes.push(consoleScene);
      }
    }
    return consoleScene;
  }, [scenes, game]);

  const loadAvatar = useCallback(
    (el: HTMLElement | null) => {
      if (el && gameConsoleScene) {
        gameConsoleScene.avatar = el;
      }
    },
    [game, gameConsoleScene]
  );
  const loadBar = useCallback(
    (el: HTMLElement | null) => {
      if (el && gameConsoleScene) {
        gameConsoleScene.bar = el;
      }
    },
    [game, gameConsoleScene]
  );
  const loadScore = useCallback(
    (el: HTMLElement | null) => {
      if (el && gameConsoleScene) {
        gameConsoleScene.score = el;
      }
    },
    [game, gameConsoleScene]
  );
  const loadPlus = useCallback(
    (el: HTMLElement | null) => {
      if (el && gameConsoleScene) {
        gameConsoleScene.plus = el;
      }
    },
    [game, gameConsoleScene]
  );

  useEffect(() => {
    if (game) {
      const s = GameUtils.countBaseScore(game.data.matched);
      setScore(s);
    }
  }, [game]);

  return (
    <div
      ref={sceneContainerRef}
      style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "transparent" }}
    >
      <div
        ref={loadBar}
        style={{
          display: "flex",
          justifyContent: layout === 1 ? "flex-end" : "flex-start",
          position: "absolute",
          top: 0,
          left: 0,
          width: width - height * 0.5,
          height: height * 0.6,
          backgroundColor: "red",
          borderRadius: 5,
        }}
      >
        <div style={{ position: "relative", top: 0, left: 0 }}>
          <span ref={loadScore}>{score}</span>
        </div>
        <div
          ref={loadPlus}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "transparent",
            color: "white",
          }}
        ></div>
      </div>
      <div
        ref={loadAvatar}
        style={{ position: "absolute", top: -10, left: layout === 1 ? -height * 0.3 : width - height * 0.8 }}
      >
        {/* <div style={avatarSheetStyle}></div> */}
        {player ? (
          <div style={{ width: 40, height: 40 }}>
            <Avatar player={player} mode={layout} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AvatarBar;
