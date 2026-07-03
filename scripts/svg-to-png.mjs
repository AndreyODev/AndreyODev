import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";
import { Resvg } from "@resvg/resvg-js";

const assetsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");
const files = readdirSync(assetsDir).filter((f) => f.endsWith(".svg"));

for (const file of files) {
  const svg = readFileSync(join(assetsDir, file), "utf8").replace(/&nbsp;/g, " ");
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  const png = resvg.render().asPng();
  const out = join(assetsDir, basename(file, ".svg") + ".png");
  writeFileSync(out, png);
  console.log(`OK ${file} -> ${basename(out)} (${png.length} bytes)`);
}
