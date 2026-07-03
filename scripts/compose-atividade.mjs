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
    .replace(/<rect\s+width="100%"\s+height="100%"\s+fill="#0d1117"\s*\/?>/i, "")
    .trim();
}

async function main() {
  const source = await readFile(inputPath, "utf8");
  const { width, height } = parseSvgMetrics(source);
  const inner = extractInnerSvg(source);

  const contributionYear = process.env.CONTRIBUTION_YEAR || "2026";
  const contentLeft = 64;
  const contentWidth = 1048;
  const headerTop = 56;
  const headerGap = 12;
  const subtitleGap = 28;
  const graphGap = 20;
  const titleSize = 22;
  const subtitleSize = 14;
  const headerHeight = headerTop + titleSize + headerGap + subtitleSize + subtitleGap;
  const footerPadding = 40;
  const graphWidth = contentWidth;
  const graphHeight = Math.ceil((height * graphWidth) / width);
  const graphX = contentLeft;
  const graphY = 24 + headerHeight + graphGap;
  const cardHeight = headerHeight + graphGap + graphHeight + footerPadding;
  const totalHeight = cardHeight + 48;
  const titleY = 24 + headerTop + titleSize;
  const lineY = titleY + headerGap;
  const subtitleY = lineY + subtitleGap;
  const bracketY = 24 + cardHeight + 8;
  const bracketInnerY = 24 + cardHeight - 18;

  const composed = `<svg width="1200" height="${totalHeight}" viewBox="0 0 1200 ${totalHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="${totalHeight}" fill="#000000"/>
  <rect x="24" y="24" width="1152" height="${cardHeight}" rx="14" fill="#0A0A0B" stroke="#1E1E22" stroke-width="1.5"/>
  <path d="M44 40 H70 M44 40 V66" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
  <path d="M1156 40 H1130 M1156 40 V66" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
  <path d="M44 ${bracketY} H70 M44 ${bracketY} V${bracketInnerY}" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
  <path d="M1156 ${bracketY} H1130 M1156 ${bracketY} V${bracketInnerY}" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
  <text x="64" y="${titleY}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${titleSize}" font-weight="600" fill="#F2F2F3">Atividade</text>
  <line x1="64" y1="${lineY}" x2="176" y2="${lineY}" stroke="#92732D" stroke-width="2.5" stroke-linecap="round"/>
  <text x="64" y="${subtitleY}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${subtitleSize}" fill="#6E7076" font-style="italic">Contribuicoes em ${contributionYear} no GitHub.</text>
  <svg x="${graphX}" y="${graphY}" width="${graphWidth}" height="${graphHeight}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
    ${inner}
  </svg>
</svg>`;

  await writeFile(outputPath, composed, "utf8");
  console.log(`atividade-pacman.svg gerado em ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
