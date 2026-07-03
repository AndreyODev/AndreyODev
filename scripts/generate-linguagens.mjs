#!/usr/bin/env node

const USERNAME = process.env.GITHUB_USERNAME || "AndreyODev";
const TOKEN = process.env.GITHUB_TOKEN || process.env.METRICS_TOKEN;
const IGNORED = new Set(["html", "css"]);
const LIMIT = 6;

if (!TOKEN) {
  console.error("GITHUB_TOKEN ou METRICS_TOKEN nao definido.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function graphql(query, variables = {}) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return payload.data;
}

async function fetchLanguages() {
  const totals = new Map();
  let after = null;

  do {
    const data = await graphql(
      `
        query ($login: String!, $after: String) {
          user(login: $login) {
            repositories(first: 100, ownerAffiliations: OWNER, privacy: PUBLIC, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
                  edges {
                    size
                    node {
                      name
                      color
                    }
                  }
                }
              }
            }
          }
        }
      `,
      { login: USERNAME, after },
    );

    for (const repo of data.user.repositories.nodes) {
      for (const edge of repo.languages.edges) {
        const name = edge.node.name;
        if (IGNORED.has(name.toLowerCase())) continue;

        const current = totals.get(name) || { size: 0, color: edge.node.color || "#8B949E" };
        current.size += edge.size;
        totals.set(name, current);
      }
    }

    if (!data.user.repositories.pageInfo.hasNextPage) break;
    after = data.user.repositories.pageInfo.endCursor;
  } while (after);

  const grandTotal = [...totals.values()].reduce((sum, item) => sum + item.size, 0);
  if (!grandTotal) return [];

  return [...totals.entries()]
    .map(([name, { size, color }]) => ({
      name,
      color: color.startsWith("#") ? color : `#${color}`,
      percent: (size / grandTotal) * 100,
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, LIMIT);
}

function formatPercent(value) {
  return `${value.toFixed(2).replace(".", ",")}%`;
}

function buildBar(languages, barWidth) {
  let offset = 0;
  return languages
    .map((language) => {
      const width = (language.percent / 100) * barWidth;
      const rect = `<rect x="${offset}" y="0" width="${width}" height="10" rx="5" fill="${language.color}"/>`;
      offset += width;
      return rect;
    })
    .join("\n    ");
}

function buildLanguageRows(languages) {
  const columns = 3;
  const cellWidth = 360;
  const cellHeight = 34;

  return languages
    .map((language, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = 64 + col * cellWidth;
      const y = 188 + row * cellHeight;

      return `
  <circle cx="${x}" cy="${y - 4}" r="5" fill="${language.color}"/>
  <text x="${x + 16}" y="${y}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="15" fill="#F2F2F3">${language.name}</text>
  <text x="${x + 250}" y="${y}" font-family="SFMono-Regular, Consolas, monospace" font-size="13" fill="#92732D" text-anchor="end">${formatPercent(language.percent)}</text>`;
    })
    .join("");
}

function buildSvg(languages) {
  const barWidth = 1072;
  const rows = Math.ceil(languages.length / 3);
  const height = 150 + rows * 34 + 40;

  return `<svg width="1200" height="${height}" viewBox="0 0 1200 ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="brass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#92732D"/>
      <stop offset="1" stop-color="#6B5420"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="${height}" fill="#000000"/>

  <g>
    <rect x="24" y="24" width="1152" height="${height - 48}" rx="14" fill="#0A0A0B" stroke="#1E1E22" stroke-width="1.5"/>
    <path d="M44 40 H70 M44 40 V66" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
    <path d="M1156 40 H1130 M1156 40 V66" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
    <path d="M44 ${height - 40} H70 M44 ${height - 40} V${height - 66}" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>
    <path d="M1156 ${height - 40} H1130 M1156 ${height - 40} V${height - 66}" stroke="#92732D" stroke-width="2" stroke-linecap="round"/>

    <text x="64" y="72" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="22" font-weight="600" fill="#F2F2F3">Linguagens</text>
    <line x1="64" y1="84" x2="186" y2="84" stroke="#92732D" stroke-width="2.5" stroke-linecap="round"/>
    <text x="64" y="114" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="14.5" fill="#6E7076" font-style="italic">Distribuicao por repositorios publicos.</text>
  </g>

  <rect x="64" y="136" width="${barWidth}" height="10" rx="5" fill="#1A1A1C"/>
  <g transform="translate(64, 136)">
    ${buildBar(languages, barWidth)}
  </g>
  ${buildLanguageRows(languages)}
</svg>
`;
}

async function main() {
  const languages = await fetchLanguages();
  if (!languages.length) {
    throw new Error("Nenhuma linguagem encontrada para gerar linguagens.svg");
  }

  const svg = buildSvg(languages);
  const outputPath = new URL("../assets/linguagens.svg", import.meta.url);
  await import("node:fs/promises").then(({ writeFile }) => writeFile(outputPath, svg, "utf8"));

  console.log(`linguagens.svg gerado para ${USERNAME}:`, languages);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
