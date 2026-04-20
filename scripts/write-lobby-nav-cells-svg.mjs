/**
 * 根据 lobbyNavShape.mjs 几何写入 lobby-nav-cells.svg（美术可替换该文件保留 id）
 * 运行: node scripts/write-lobby-nav-cells-svg.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { W, H, COLS, navCellPathD } from "./lobbyNavShape.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(
  __dirname,
  "../src/component/lobby/control/assets/lobby-nav-cells.svg"
);

const paths = [];
for (let i = 0; i < COLS; i++) {
  const d = navCellPathD(i);
  paths.push(`  <path id="lobby-nav-cell-${i}" fill="none" d="${d}" />`);
}

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!-- 热区真源：可由美术从 Figma/AI 导出替换；须保留 id="lobby-nav-cell-0" … "-5" 与 viewBox -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
${paths.join("\n")}
</svg>
`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, svg, "utf8");
console.log("wrote", outPath);
