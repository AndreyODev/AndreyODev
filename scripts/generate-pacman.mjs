#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PacmanRenderer, PlayerStyle } from "pacman-contribution-graph";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = join(rootDir, "dist");
const outputPath = join(outputDir, "pacman-contribution-graph-dark.svg");

const USERNAME = process.env.GITHUB_USERNAME || "AndreyODev";
const TOKEN = process.env.GITHUB_TOKEN || process.env.METRICS_TOKEN;
const YEAR = Number(process.env.CONTRIBUTION_YEAR || 2026);

if (!TOKEN) {
  console.error("GITHUB_TOKEN ou METRICS_TOKEN nao definido.");
  process.exit(1);
}

const CONTRIBUTIONS_QUERY = `
  query ($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
              color
              contributionLevel
            }
          }
        }
      }
    }
  }
`;

async function fetchContributionsForYear() {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: {
        login: USERNAME,
        from: `${YEAR}-01-01T00:00:00Z`,
        to: `${YEAR + 1}-01-01T00:00:00Z`,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL HTTP ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return payload;
}

const originalFetch = globalThis.fetch;
let cachedContributionsPayload = null;

globalThis.fetch = async (url, options) => {
  const target = typeof url === "string" ? url : url?.url;

  if (target?.includes("api.github.com/graphql") && options?.body) {
    const body = JSON.parse(options.body);

    if (body.query?.includes("contributionsCollection")) {
      if (!cachedContributionsPayload) {
        cachedContributionsPayload = await fetchContributionsForYear();
      }

      return new Response(JSON.stringify(cachedContributionsPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return originalFetch(url, options);
};

async function main() {
  let svg = "";

  const renderer = new PacmanRenderer({
    platform: "github",
    username: USERNAME,
    outputFormat: "svg",
    gameTheme: "github-dark",
    enableSounds: false,
    gameSpeed: 1,
    githubSettings: { accessToken: TOKEN },
    playerStyle: PlayerStyle?.OPPORTUNISTIC ?? "opportunistic",
    svgCallback: (content) => {
      svg = content;
    },
    gameOverCallback: () => {},
    pointsIncreasedCallback: () => {},
  });

  await renderer.start();

  if (!svg) {
    throw new Error("Pac-Man nao retornou SVG.");
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, svg, "utf8");
  console.log(`pacman-contribution-graph-dark.svg gerado com contribuicoes de ${YEAR}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    globalThis.fetch = originalFetch;
  });
