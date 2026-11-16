// Uploads laraselector-chrome.zip to the Chrome Web Store (API v1.1) and optionally publishes it.
// Required env: CWS_EXTENSION_ID, CWS_CLIENT_ID, CWS_CLIENT_SECRET, CWS_REFRESH_TOKEN
// Flags: --publish (submit for review after upload), --target=trustedTesters, --zip=path
import { readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const zip = flag('zip') ?? new URL('./laraselector-chrome.zip', import.meta.url).pathname;
const env = Object.fromEntries(['CWS_EXTENSION_ID', 'CWS_CLIENT_ID', 'CWS_CLIENT_SECRET', 'CWS_REFRESH_TOKEN'].map((k) => [k, process.env[k]]));
const missing = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) { console.error(`Missing env: ${missing.join(', ')}`); process.exit(1); }
if (!existsSync(zip)) { console.error(`ZIP not found: ${zip} (run npm run package first)`); process.exit(1); }

const json = async (res) => { const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(JSON.stringify(j)); return j; };

const { access_token } = await json(await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: env.CWS_CLIENT_ID, client_secret: env.CWS_CLIENT_SECRET, refresh_token: env.CWS_REFRESH_TOKEN, grant_type: 'refresh_token' }),
}));
const headers = { Authorization: `Bearer ${access_token}`, 'x-goog-api-version': '2' };

const up = await json(await fetch(`https://www.googleapis.com/upload/chromewebstore/v1.1/items/${env.CWS_EXTENSION_ID}?uploadType=media`, { method: 'PUT', headers, body: readFileSync(zip) }));
if (up.uploadState !== 'SUCCESS') { console.error('Upload failed:', JSON.stringify(up)); process.exit(1); }
console.log('Uploaded:', up.id, up.crxVersion ?? '');

if (args.includes('--publish')) {
  const target = flag('target');
  const pub = await json(await fetch(`https://www.googleapis.com/chromewebstore/v1.1/items/${env.CWS_EXTENSION_ID}/publish${target ? `?publishTarget=${target}` : ''}`, { method: 'POST', headers }));
  console.log('Publish status:', JSON.stringify(pub.status), pub.statusDetail ?? '');
} else {
  console.log('Uploaded as draft. Re-run with --publish to submit for review.');
}
