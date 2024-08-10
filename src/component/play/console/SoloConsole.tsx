import { GAME_GOAL, SCENE_NAME } from "model/Match3Constants";
import { GameConsoleScene } from "model/SceneModel";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useBattleManager } from "../../../service/BattleManager";
import { useSceneManager } from "../../../service/SceneManager";
import * as GameUtils from "../../../util/MatchGameUtils";
import GoalCandy from "./GoalCandy";
import TimeCount from "./TimeCount";

const SoloConsole: React.FC = () => {
  const { battle } = useBattleManager();
  const [goals, setGoals] = useState<{ asset: number; quantity: number }[]>([]);
  const { scenes } = useSceneManager();
  useEffect(() => {
    if (battle && battle.data?.goal && battle.games) {
      const game = battle.games[0];
      const battleGoal = GAME_GOAL.find((g) => g.id === battle.data.goal);
      if (battleGoal) {
        let goalList = battleGoal.goal;
        if (game.data?.matched) {
          goalList = goalList.map((a) => {
            let quantity = a.quantity;
            if (game.data && game.data.matched) {
              const goal = game.data.matched.find((m: any) => m.asset === a.asset);
              if (goal) quantity = Math.max(quantity - goal.quantity, 0);
            }
            return { asset: a.asset, quantity };
          });
        }
        setGoals(goalList);
      }
    }
  }, [battle]);

  const gameConsoleScene = useMemo(() => {
    if (!battle || !battle.games) return;
    const game = battle.games[0];
    let consoleScene: GameConsoleScene | null = null;
    const gameConsoleScenes = scenes?.get(SCENE_NAME.GAME_CONSOLE_SCENES);
    if (gameConsoleScenes) {
      consoleScene = gameConsoleScenes?.find((s: GameConsoleScene) => s.gameId === game.gameId);
      if (!consoleScene) {
        consoleScene = { gameId: game.gameId, goals: [] };
        gameConsoleScenes.push(consoleScene);
      }
    }
    return consoleScene;
  }, [scenes, battle, goals]);

  const loadGoal = useCallback(
    (type: number, el: HTMLElement | HTMLDivElement, goal: { asset: number; quantity: number }) => {
      if (el && gameConsoleScene && gameConsoleScene.goals) {
        console.log("loading goal element");
        let item = gameConsoleScene.goals.find((g: any) => g.asset === goal.asset);
        if (!item) {
          item = { asset: goal.asset };
          gameConsoleScene.goals.push(item);
        }
        if (type === 0) item.qtyEle = el;
        else if (type === 1) item.iconEle = el;
      }
    },
    [battle, gameConsoleScene, goals]
  );
  const loadMove = useCallback(
    (el: HTMLElement | null) => {
      if (el && gameConsoleScene) gameConsoleScene.moves = el;
    },
    [battle, gameConsoleScene]
  );
  const loadScore = useCallback(
    (el: HTMLElement | null) => {
      if (el && gameConsoleScene) gameConsoleScene.score = el;
    },
    [battle, gameConsoleScene]
  );
  const moves = useMemo(() => {
    if (battle && battle.games && battle.data?.steps) {
      const game = battle.games[0];
      return battle.data.steps - game.data.move;
    }
    return null;
  }, [battle]);
  const score = useMemo(() => {
    if (battle?.games) {
      const game = battle.games[0];
      if (game.data?.matched) {
        const s = GameUtils.countBaseScore(game.data.matched);
        return s;
      }
    }
    return null;
  }, [battle]);

  return (
    <div style={{ display: "flex", width: "100%", height: 60, backgroundColor: "white" }}>
      <div
        id="timecount_down"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "20%",
          height: "100%",
          backgroundColor: "red",
        }}
      >
        <TimeCount />
      </div>
      <div style={{ width: "60%" }}>
        <div
          id="goal_container"
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            width: "100%",
            height: "50%",
          }}
        >
          {goals.map((a, index) => (
            <div key={a.asset} style={{ position: "relative", top: 10, width: 60, height: 60 }}>
              <div ref={(el: HTMLDivElement) => loadGoal(1, el, a)} style={{ width: 25, height: 25 }}>
                <GoalCandy asset={a.asset} />
              </div>
              <div style={{ position: "absolute", top: -8, left: 20, color: "blue" }}>
                <span ref={(el: HTMLElement) => loadGoal(0, el, a)} style={{ fontSize: 15 }}>
                  {a.quantity > 0 ? a.quantity : "✔️"}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", height: "50%" }}>
          <span style={{ fontSize: 13 }}>MOVES:</span>
          <span ref={loadMove} style={{ fontSize: 12, color: "blue" }}>
            {moves}
          </span>
        </div>
      </div>
      <div
        id="game_basescore"
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "20%",
          height: "100%",
          backgroundColor: "green",
          color: "white",
        }}
      >
        <span style={{ fontSize: 15 }}>SCORE:</span>
        <span ref={loadScore} style={{ fontSize: 15, color: "blue" }}>
          {score}
        </span>
      </div>
    </div>
  );
};

export default SoloConsole;
