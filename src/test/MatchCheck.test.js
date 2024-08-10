import { COLUMN } from "../model/Constants";
import candy_textures from "../model/candy_textures";
import * as gameEngine from "../service/GameEngine_bak";
import { cells } from "./data.js";
test("matches", () => {
  // console.log(cells);
  cells.sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    else return a.column - b.column;
  });
  console.log(JSON.parse(JSON.stringify(cells)));

  const candy = cells.find((c) => c.id === 65);
  const target = cells.find((c) => c.id === 44);

  if (candy && target) {
    [candy.row, target.row] = [target.row, candy.row];
    [candy.column, target.column] = [target.column, candy.column];

    const matches = gameEngine.getMatches(cells);
    // console.log(matches);
    const rs = gameEngine.processMatches(cells, matches);

    const toCreate = [];
    for (let i = 0; i < COLUMN; i++) {
      const size = rs.toRemove.filter((c) => c.column === i).length;
      for (let j = 0; j < size; j++) {
        const index = Math.floor(Math.random() * (candy_textures.length - 10));
        const asset = candy_textures[index]["id"] ?? 0;
        const cell = {
          asset,
          column: i,
          id: 0,
          row: j,
        };
        toCreate.push(cell);
      }
    }

    rs["toCreate"] = toCreate;
    console.log(rs);

    const ncells = gameEngine.applyMatches(cells, rs);
    ncells.sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      else return a.column - b.column;
    });
    console.log(JSON.parse(JSON.stringify(ncells)));
  }
});
