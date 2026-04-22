/**
 * scripts/test-telegram.mjs
 *
 * Standalone smoke-test for Telegram delivery.
 * Reads credentials from .env.local, sends two test messages (one trending-breakout
 * and one new-opportunity) to the configured chat, and exits with code 0 on
 * success or 1 on failure.
 *
 * Usage:
 *   node scripts/test-telegram.mjs
 *
 * Requires Node.js 18+ (native fetch).
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ─── Load .env.local manually (no dotenv dependency needed) ──────────────────

function loadEnv(file) {
  try {
    const raw = readFileSync(file, 'utf-8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // file not found — rely on actual env vars
  }
}

loadEnv(resolve(ROOT, '.env.local'));
loadEnv(resolve(ROOT, '.env'));

// ─── Validate config ──────────────────────────────────────────────────────────

const TOKEN  = process.env.TELEGRAM_BOT_TOKEN;
const CHAT   = process.env.TELEGRAM_CHAT_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://alphascope-psi.vercel.app';

if (!TOKEN || !CHAT) {
  console.error('❌  Missing env vars. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local');
  process.exit(1);
}

const DEMO_ADDRESS = 'So11111111111111111111111111111111111111112'; // SOL

// ─── MarkdownV2 escaping ──────────────────────────────────────────────────────

function esc(text) {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

// ─── Message builders ─────────────────────────────────────────────────────────

function breakoutMessage() {
  const url = `${APP_URL}/token/${DEMO_ADDRESS}`;
  return [
    `⚡ *Test Breakout — ${esc('BONK')}*`,
    ``,
    `Vol \\+182% · Price \\+45\\.2% · Rank \\#3`,
    ``,
    `[View token ›](${url})`,
  ].join('\n');
}

function opportunityMessage() {
  const url = `${APP_URL}/token/${DEMO_ADDRESS}`;
  const score = 78;
  const bar = '█'.repeat(Math.round(score / 10)) + '░'.repeat(10 - Math.round(score / 10));
  return [
    `🟢 *Test Opportunity — ${esc('BONK')}*`,
    ``,
    `Score: *${esc(score)}/100* ${bar}`,
    esc(`Score 78/100 · Strong opportunity signal backed by healthy risk profile.`),
    ``,
    `[Analyse token ›](${url})`,
  ].join('\n');
}

// ─── Send helper ──────────────────────────────────────────────────────────────

async function sendMessage(text, label) {
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT,
      text,
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
    }),
  });

  if (res.ok) {
    console.log(`✅  ${label} sent successfully`);
    return true;
  }

  const body = await res.text().catch(() => '');
  console.error(`❌  ${label} failed: HTTP ${res.status} — ${body}`);
  return false;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n🚀  AlphaScope · Telegram smoke-test`);
console.log(`    Bot token : ${TOKEN.slice(0, 10)}…`);
console.log(`    Chat ID   : ${CHAT}`);
console.log(`    App URL   : ${APP_URL}\n`);

const results = await Promise.all([
  sendMessage(breakoutMessage(),    'Breakout message'),
  sendMessage(opportunityMessage(), 'Opportunity message'),
]);

const allOk = results.every(Boolean);

if (allOk) {
  console.log('\n✅  Both test messages delivered — check your Telegram group.\n');
  process.exit(0);
} else {
  console.error('\n❌  One or more messages failed — see errors above.\n');
  process.exit(1);
}
