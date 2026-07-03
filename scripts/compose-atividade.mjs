#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = join(rootDir, "dist", "pacman-contribution-graph-dark.svg");
const outputPath = join(rootDir, "assets", "atividade-pacman.svg");

function parseSvgMetrics(svg) {
  const rootMatch = svg.match(/^[\s\S]*?<svg\b([^>]*)>/i);
  const attrs = rootMatch?.[1] || "";
  const viewBoxMatch = attrs.match(/viewBox="([^"]+)"/i);
  const widthMatch = attrs.match(/\bwidth="([\d.]+)/i);
  const heightMatch = attrs.match(/\bheight="([\d.]+)/i);

  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].split(/\s+/).map(Number);
    return { width: parts[2], height: parts[3] };
  }

  return {
    width: Number(widthMatch?.[1] || 1166),
    height: Number(heightMatch?.[1] || 184),
  };
}

function extractInnerSvg(svg) {
  return svg
    .replace(/^[\s\S]*?<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .trim();
}

async function main() {
  const source = await readFile(inputPath, "utf8");
  const { width, height } = parseSvgMetrics(source);
  const inner = extractInnerSvg(source);

  const contentLeft = 64;
  const contentWidth = 1048;
  const headerHeight = 118;
  const footerPadding = 28;
  const scale = contentWidth / width;
  const graphHeight = height * scale;
  const graphX = contentLeft;
  const graphY = 24 + headerHeight;
  const cardHeight = headerHeight + graphHeight + footerPadding;
  const totalHeight = cardHeight + 48;

  const composed = `<svg width="1200" height="${totalHeight.toFixed(0)}" viewBox="0 0 1200 ${totalHeight.toFixed(0)}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="${totalHeight.toFixed(0)}" fill="#000000"/>
  <rect x="24" y="24" width="1152" height="${cardHeight.toFixed(0)}" rx="14" fill="#0A0A0B" stroke="#1E1E22" stroke-width="1.5"/>
  <path d="M44 40 H70 M44 40 V66" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
  <path d="M1156 40 H1130 M1156 40 V66" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
  <path d="M44 ${cardHeight + 8} H70 M44 ${cardHeight + 8} V${cardHeight - 18}" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
  <path d="M1156 ${cardHeight + 8} H1130 M1156 ${cardHeight + 8} V${cardHeight - 18}" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
  <text x="64" y="72" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22" font-weight="600" fill="#F2F2F3">Atividade</text>
  <line x1="64" y1="84" x2="176" y2="84" stroke="#92732D" stroke-width="2.5" stroke-linecap="round"/>
  <text x="64" y="114" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14.5" fill="#6E7076" font-style="italic">Ultimo ano de contribuicoes no GitHub.</text>
  <g transform="translate(${graphX.toFixed(2)} ${graphY.toFixed(2)}) scale(${scale.toFixed(4)})">
    ${inner}
  </g>
</svg>`;

  await writeFile(outputPath, composed, "utf8");
  console.log(`atividade-pacman.svg gerado em ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
