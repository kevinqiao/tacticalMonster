#!/usr/bin/env node
/**
 * Ensure campaign poster guide PDF exists before Vite build.
 * Netlify/CI clones omit *.pdf (gitignored); MerchantCampaignListPage imports it via ?url.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const OUT_PATH = path.join(
  ROOT,
  "src/component/lobby/campaign/assets/poster-guide.pdf"
);

function writeStubPdf() {
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const stream = fs.createWriteStream(OUT_PATH);
  doc.pipe(stream);
  doc.fontSize(16).text("Campaign Landing Poster Guide", { lineGap: 4 });
  doc
    .fontSize(10)
    .fillColor("#444")
    .text(
      "Placeholder PDF for CI builds. Run node scripts/campaign/generate-poster-guide.mjs locally for the full Chinese design guide.",
      { lineGap: 3 }
    );
  doc.end();
  return new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function main() {
  if (fs.existsSync(OUT_PATH)) {
    return;
  }

  const genScript = path.join(__dirname, "generate-poster-guide.mjs");
  const r = spawnSync(process.execPath, [genScript], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (r.status === 0 && fs.existsSync(OUT_PATH)) {
    console.log("[ensure-poster-guide] generated via generate-poster-guide.mjs");
    return;
  }

  console.warn(
    "[ensure-poster-guide] full generator unavailable; writing stub PDF for build"
  );
  await writeStubPdf();
  console.log(`[ensure-poster-guide] wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error("[ensure-poster-guide] failed:", err);
  process.exit(1);
});
