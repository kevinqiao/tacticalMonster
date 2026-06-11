import { describe, expect, it } from "vitest";

import type { Doc } from "../../../_generated/dataModel";
import {
  CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE,
  computeCasualAsyncTableBoardStable,
} from "../settle/casualRunSettlementFill";

type Row = Doc<"casual_run_player_matches">;

function row(partial: Partial<Row> & Pick<Row, "uid">): Row {
  return {
    matchId: "match_1",
    tournamentId: "run_1",
    templateId: "tpl",
    gameId: "game_1",
    gameType: "solitaire",
    status: "open",
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  } as Row;
}

describe("computeCasualAsyncTableBoardStable", () => {
  const now = 10_000;

  it("true when allHumansSettled", () => {
    expect(
      computeCasualAsyncTableBoardStable({
        rows: [row({ uid: "u1", status: "settled", score: 50 })],
        maxPlayers: 4,
        humanCountPlanned: 1,
        now,
        allHumansSettled: true,
      })
    ).toBe(true);
  });

  it("false when human still finished (再战窗口)", () => {
    const botUid = `${CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE}match_1:r1`;
    expect(
      computeCasualAsyncTableBoardStable({
        rows: [
          row({ uid: "u1", status: "finished", score: 50 }),
          row({
            uid: botUid,
            status: "settled",
            score: 40,
            revealAt: 0,
            duration: 1000,
          }),
        ],
        maxPlayers: 4,
        humanCountPlanned: 1,
        now,
      })
    ).toBe(false);
  });

  it("true when human confirmed and bots revealed and ended", () => {
    const bot0 = `${CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE}match_1:r1`;
    const bot1 = `${CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE}match_1:r2`;
    expect(
      computeCasualAsyncTableBoardStable({
        rows: [
          row({ uid: "u1", status: "confirmed", score: 50 }),
          row({
            uid: bot0,
            status: "settled",
            score: 40,
            revealAt: 1000,
            duration: 5000,
          }),
          row({
            uid: bot1,
            status: "settled",
            score: 30,
            revealAt: 2000,
            duration: 5000,
          }),
        ],
        maxPlayers: 4,
        humanCountPlanned: 1,
        now,
      })
    ).toBe(true);
  });

  it("false when bot still playing", () => {
    const botUid = `${CASUAL_ASYNC_VIRTUAL_BOT_UID_SOLITAIRE}match_1:r1`;
    expect(
      computeCasualAsyncTableBoardStable({
        rows: [
          row({ uid: "u1", status: "confirmed", score: 50 }),
          row({
            uid: botUid,
            status: "settled",
            score: 40,
            revealAt: 1000,
            duration: 5000,
          }),
        ],
        maxPlayers: 4,
        humanCountPlanned: 1,
        now: 4000,
      })
    ).toBe(false);
  });
});
