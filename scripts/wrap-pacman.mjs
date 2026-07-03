#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = join(rootDir, "dist", "pacman-contribution-graph-dark.svg");
const outputPath = inputPath;

function parseSvgMetrics(svg) {
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/i);
  const widthMatch = svg.match(/\bwidth="([\d.]+)/i);
  const heightMatch = svg.match(/\bheight="([\d.]+)/i);

  if (viewBoxMatch) {
    const [, , , width, height] = viewBoxMatch[1].split(/\s+/).map(Number);
    return { width, height };
  }

  return {
    width: Number(widthMatch?.[1] || 900),
    height: Number(heightMatch?.[1] || 180),
  };
}

function extractInnerSvg(svg) {
  return svg.replace(/^[\s\S]*?<svg[^>]*>/i, "").replace(/<\/svg>\s*$/i, "");
}

async function main() {
  const source = await readFile(inputPath, "utf8");
  const { width, height } = parseSvgMetrics(source);
  const inner = extractInnerSvg(source);

  const cardPaddingX = 64;
  const headerHeight = 118;
  const footerPadding = 32;
  const availableWidth = 1200 - cardPaddingX * 2;
  const scale = Math.min(1, availableWidth / width);
  const graphWidth = width * scale;
  const graphHeight = height * scale;
  const graphX = (1200 - graphWidth) / 2;
  const graphY = 24 + headerHeight;
  const cardHeight = headerHeight + graphHeight + footerPadding;
  const totalHeight = cardHeight + 48;

  const wrapped = `<svg width="1200" height="${totalHeight}" viewBox="0 0 1200 ${totalHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="${totalHeight}" fill="#000000"/>
  <rect x="24" y="24" width="1152" height="${cardHeight}" rx="14" fill="#0A0A0B" stroke="#1E1E22" stroke-width="1.5"/>
  <path d="M44 40 H70 M44 40 V66" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
  <path d="M1156 40 H1130 M1156 40 V66" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
  <path d="M44 ${cardHeight + 8} H70 M44 ${cardHeight + 8} V${cardHeight - 18}" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
  <path d="M1156 ${cardHeight + 8} H1130 M1156 ${cardHeight + 8} V${cardHeight - 18}" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
  <text x="64" y="72" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22" font-weight="600" fill="#F2F2F3">Atividade</text>
  <line x1="64" y1="84" x2="176" y2="84" stroke="#92732D" stroke-width="2.5" stroke-linecap="round"/>
  <text x="64" y="114" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14.5" fill="#6E7076" font-style="italic">Ultimo ano de contribuicoes no GitHub.</text>
  <svg x="${graphX}" y="${graphY}" width="${graphWidth}" height="${graphHeight}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
    ${inner}
  </svg>
</svg>`;

  await writeFile(outputPath, wrapped, "utf8");
  console.log(`Pac-Man encapsulado em ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
