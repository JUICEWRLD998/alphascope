#!/usr/bin/env node

/**
 * scripts/test-cron.mjs — Manually test the cron notification endpoint
 * 
 * Run: node scripts/test-cron.mjs
 * 
 * This simulates what Vercel will do every 5 minutes.
 */

import fs from 'fs';
import path from 'path';

// Load .env.local manually (Node doesn't do this automatically)
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET not set in .env.local');
  process.exit(1);
}

console.log(`🔔 Testing cron endpoint: ${BASE_URL}/api/cron/notifications`);
console.log(`⏰ Timestamp: ${new Date().toISOString()}\n`);

fetch(`${BASE_URL}/api/cron/notifications`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
  },
})
  .then((res) => {
    console.log(`Status: ${res.status} ${res.statusText}`);
    return res.json();
  })
  .then((data) => {
    console.log('\n✅ Response:', JSON.stringify(data, null, 2));
    if (data.error) {
      console.error('\n❌ Error:', data.error);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('\n❌ Request failed:', err.message);
    process.exit(1);
  });
