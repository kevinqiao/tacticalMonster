import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const GENERATED_ASSET_DIR =
  "src/component/lobby/casual/view/town/assets/generated";
const CATALOG_TS_PATH =
  "src/component/lobby/casual/view/town/assets/casualTownAssetCatalog.ts";

const sheets = [
  {
    id: "tiles_and_bases",
    filename: "casualtown_tiles_and_bases_sheet.png",
    columns: 4,
    rows: 3,
    group: "tiles",
    assets: [
      "grass_placement_tile",
      "stone_plaza_tile",
      "curved_path_tile",
      "straight_path_tile",
      "flower_pedestal_base",
      "trophy_pedestal_base",
      "badge_display_base",
      "fountain_base",
      "home_nameplate_base",
      "garden_plot",
      "water_edge_platform",
      "season_banner_base",
    ],
  },
  {
    id: "decor_props",
    filename: "casualtown_decor_props_sheet.png",
    columns: 4,
    rows: 4,
    group: "decor",
    assets: [
      "golden_trophy_statue",
      "fountain",
      "badge_crystal_pedestal",
      "wooden_challenge_board",
      "flower_bed_cluster",
      "park_bench",
      "cat_statue",
      "dog_statue",
      "windmill_ornament",
      "purple_season_banner",
      "flower_arch",
      "street_lamp",
      "treasure_chest",
      "shop_canopy_stand",
      "heart_social_ornament",
      "white_picket_fence",
    ],
  },
  {
    id: "social_ui_icons",
    filename: "casualtown_social_ui_icons_sheet.png",
    columns: 4,
    rows: 3,
    group: "icons",
    assets: [
      "visit",
      "like",
      "challenge",
      "trophy",
      "badge_gem",
      "home",
      "edit_layout",
      "invite_friend",
      "history_scroll",
      "locked_decor",
      "season_banner",
      "share_link",
    ],
  },
];

function parseArgs(argv) {
  const args = {
    sourceDir: "assets",
    outDir: GENERATED_ASSET_DIR,
    catalogTs: CATALOG_TS_PATH,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--source-dir" && value) {
      args.sourceDir = value;
      i += 1;
    } else if (key === "--out-dir" && value) {
      args.outDir = value;
      i += 1;
    } else if (key === "--catalog-ts" && value) {
      args.catalogTs = value;
      i += 1;
    } else if (!key.startsWith("--")) {
      args.sourceDir = key;
    }
  }
  return args;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function averageCornerColor(data, width, height, channels) {
  const points = [];
  const sample = 10;
  for (let y = 0; y < sample; y += 1) {
    for (let x = 0; x < sample; x += 1) {
      points.push([x, y], [width - 1 - x, y], [x, height - 1 - y], [
        width - 1 - x,
        height - 1 - y,
      ]);
    }
  }
  const color = { r: 0, g: 0, b: 0 };
  for (const [x, y] of points) {
    const i = (y * width + x) * channels;
    color.r += data[i];
    color.g += data[i + 1];
    color.b += data[i + 2];
  }
  const n = points.length;
  return {
    r: Math.round(color.r / n),
    g: Math.round(color.g / n),
    b: Math.round(color.b / n),
  };
}

function colorDistance(a, r, g, b) {
  const dr = r - a.r;
  const dg = g - a.g;
  const db = b - a.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

async function extractTransparentCell(inputPath, crop, outPath) {
  const { data, info } = await sharp(inputPath)
    .extract(crop)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bg = averageCornerColor(data, info.width, info.height, info.channels);
  const transparentThreshold = 24;
  const featherThreshold = 52;

  for (let i = 0; i < data.length; i += info.channels) {
    const distance = colorDistance(bg, data[i], data[i + 1], data[i + 2]);
    if (distance < transparentThreshold) {
      data[i + 3] = 0;
    } else if (distance < featherThreshold) {
      const keep = (distance - transparentThreshold) / (featherThreshold - transparentThreshold);
      data[i + 3] = Math.round(data[i + 3] * keep);
    }
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

function writeCatalogTs(entries, catalogTsPath) {
  const lines = [
    "export type CasualTownAssetType = \"tiles\" | \"decor\" | \"icons\";",
    "",
    "export interface CasualTownAssetCatalogEntry {",
    "  id: string;",
    "  type: CasualTownAssetType;",
    "  src: string;",
    "  width: number;",
    "  height: number;",
    "  row: number;",
    "  column: number;",
    "  anchorX: number;",
    "  anchorY: number;",
    "}",
    "",
    "export const casualTownAssetCatalog = [",
  ];

  for (const entry of entries) {
    lines.push("  {");
    lines.push(`    id: "${entry.id}",`);
    lines.push(`    type: "${entry.type}",`);
    lines.push(
      `    src: new URL("./generated/${entry.file}", import.meta.url).href,`
    );
    lines.push(`    width: ${entry.width},`);
    lines.push(`    height: ${entry.height},`);
    lines.push(`    row: ${entry.row},`);
    lines.push(`    column: ${entry.column},`);
    lines.push(`    anchorX: ${entry.anchorX},`);
    lines.push(`    anchorY: ${entry.anchorY},`);
    lines.push("  },");
  }

  lines.push("] as const satisfies readonly CasualTownAssetCatalogEntry[];");
  lines.push("");
  lines.push("export type CasualTownAssetId = (typeof casualTownAssetCatalog)[number][\"id\"];");
  lines.push("");
  lines.push("export const casualTownAssetsById = Object.fromEntries(");
  lines.push("  casualTownAssetCatalog.map((asset) => [asset.id, asset])");
  lines.push(") as Record<CasualTownAssetId, CasualTownAssetCatalogEntry>;");
  lines.push("");

  ensureDir(path.dirname(catalogTsPath));
  fs.writeFileSync(catalogTsPath, `${lines.join("\n")}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceDir = path.resolve(args.sourceDir);
  const outDir = path.resolve(args.outDir);
  const sheetsOutDir = path.join(outDir, "sheets");
  const atlas = {
    generatedAt: new Date().toISOString(),
    sourceSheets: sheets.map((sheet) => sheet.filename),
    entries: [],
  };

  ensureDir(outDir);
  ensureDir(sheetsOutDir);

  for (const sheet of sheets) {
    const inputPath = path.join(sourceDir, sheet.filename);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Missing source sheet: ${inputPath}`);
    }

    const metadata = await sharp(inputPath).metadata();
    const cellWidth = Math.floor((metadata.width ?? 0) / sheet.columns);
    const cellHeight = Math.floor((metadata.height ?? 0) / sheet.rows);
    if (!cellWidth || !cellHeight) {
      throw new Error(`Invalid sheet dimensions: ${inputPath}`);
    }

    await sharp(inputPath)
      .png({ compressionLevel: 9 })
      .toFile(path.join(sheetsOutDir, sheet.filename));

    const groupDir = path.join(outDir, sheet.group);
    ensureDir(groupDir);

    for (let index = 0; index < sheet.assets.length; index += 1) {
      const id = sheet.assets[index];
      const row = Math.floor(index / sheet.columns);
      const column = index % sheet.columns;
      const file = `${sheet.group}/${id}.png`;
      const outPath = path.join(outDir, file);
      const crop = {
        left: column * cellWidth,
        top: row * cellHeight,
        width: cellWidth,
        height: cellHeight,
      };

      await extractTransparentCell(inputPath, crop, outPath);

      atlas.entries.push({
        id,
        type: sheet.group,
        file: toPosix(file),
        sourceSheet: sheet.filename,
        row,
        column,
        width: cellWidth,
        height: cellHeight,
        anchorX: 0.5,
        anchorY: sheet.group === "icons" ? 0.5 : 0.82,
      });
    }
  }

  fs.writeFileSync(
    path.join(outDir, "atlas.json"),
    `${JSON.stringify(atlas, null, 2)}\n`
  );
  writeCatalogTs(atlas.entries, path.resolve(args.catalogTs));

  console.log(`Generated ${atlas.entries.length} CasualTown assets.`);
  console.log(`Assets: ${outDir}`);
  console.log(`Catalog: ${path.resolve(args.catalogTs)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
