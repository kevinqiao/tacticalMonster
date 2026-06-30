import fs from "fs";
import path from "path";
const root = "c:/selfhome/development/projects/tacticalMonster";

function write(rel, content) {
  const full = path.join(root, rel.replace(/\//g, path.sep));
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log("wrote", rel);
}

write("src/host/service/PartnerManager.tsx", String.raw`PLACEHOLDER`);
