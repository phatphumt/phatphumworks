#!/usr/bin/env node
/**
 * Posts a phase update to the Discord webhook.
 * Usage: node scripts/notify.mjs "ข้อความ"
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

function readEnv(file) {
  try {
    const raw = readFileSync(file, "utf8");
    const out = {};
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
    return out;
  } catch {
    return {};
  }
}

const env = { ...readEnv(join(here, "..", ".env.local")), ...process.env };
const url = env.DISCORD_WEBHOOK_URL;
const content = process.argv.slice(2).join(" ").trim();

if (!url) {
  console.error("DISCORD_WEBHOOK_URL is not set");
  process.exit(1);
}
if (!content) {
  console.error("Usage: node scripts/notify.mjs \"message\"");
  process.exit(1);
}

const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
});

const ok = response.ok;
console.log(`${ok ? "sent" : "failed"} (${response.status})`);
if (!ok) {
  console.log(await response.text());
  process.exit(1);
}
