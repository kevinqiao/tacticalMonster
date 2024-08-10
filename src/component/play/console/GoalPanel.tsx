import React, { useCallback, useEffect, useState } from "react";
import { GAME_GOAL, SCENE_NAME } from "../../../model/Match3Constants";
import { GameConsoleScene } from "../../../model/SceneModel";
import { useBattleManager } from "../../../service/BattleManager";
import { useSceneManager } from "../../../service/SceneManager";
import GoalCandy from "./GoalCandy";
interface Props {
  layout: number;
  game: { uid: string; avatar?: number; gameId: string; data?: any };
}

const GoalPanel: React.FC<Props> = ({ layout, game }) => {
  // const sceneContainerRef = useRef<HTMLDivElement | null>(null);
  const { battle } = useBattleManager();
  const [goals, setGoals] = useState<{ asset: number; quantity: number }[][]>([]);
  const { scenes } = useSceneManager();
  useEffect(() => {
    if (battle?.data.goal) {
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
        const rows: { asset: number; quantity: number }[][] = [];
        let i = 0;
        for (const goal of goalList) {
          const r = Math.floor(i / 2);
          if (!rows[r]) rows[r] = [];
          layout === 1 ? rows[r].push(goal) : rows[r].unshift(goal);
          i++;
        }
        setGoals(rows);
      }
    }
  }, [battle, game]);

  const loadGoal = useCallback(
    (type: number, el: HTMLElement | HTMLDivElement, goal: { asset: number; quantity: number }) => {
      if (scenes && game) {
        const gameConsoleScenes = scenes?.get(SCENE_NAME.GAME_CONSOLE_SCENES);
        const gameConsoleScene = gameConsoleScenes.find((s: GameConsoleScene) => s.gameId === game.gameId);

        if (gameConsoleScene) {
          if (!gameConsoleScene.goals) {
            gameConsoleScene.goals = [];
          }
          let item = gameConsoleScene.goals.find((g: any) => g.asset === goal.asset);
          if (!item) {
            item = { asset: goal.asset, iconEle: null, qtyEle: null };
            gameConsoleScene.goals.push(item);
          }
          if (type === 0) item.qtyEle = el;
          else if (type === 1) item.iconEle = el;
        }
      }
    },
    []
  );

  return (
    <div>
      {goals.map((r, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent: layout === 1 ? "flex-start" : "flex-end",
            width: "100%",
            backgroundColor: "blue",
            marginTop: 5,
          }}
        >
          {r.map((a) => (
            <div
              key={a.asset}
              style={{
                display: "flex",
                justifyContent: layout === 1 ? "flex-start" : "flex-end",
                width: "50%",
                backgroundColor: "transparent",
              }}
            >
              <div style={{ position: "relative" }}>
                <div ref={(el: HTMLDivElement) => loadGoal(1, el, a)} style={{ width: 25, height: 25 }}>
                  <GoalCandy asset={a.asset} />
                </div>
                <div style={{ position: "absolute", top: -8, left: layout === 1 ? -6 : 20, color: "white" }}>
                  <span ref={(el: HTMLElement) => loadGoal(0, el, a)} style={{ fontSize: 15 }}>
                    {a.quantity > 0 ? a.quantity : "✔️"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default GoalPanel;
