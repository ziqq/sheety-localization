import fs from 'node:fs';
import path from 'node:path';

const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
if (!raw || !process.env.RUNNER_TEMP || !process.env.GITHUB_ENV) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON and GitHub runner paths are required.');
}

let credentials;
try {
  credentials = JSON.parse(raw);
} catch {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must be valid JSON.');
}
if (
  credentials?.type !== 'service_account' ||
  typeof credentials.private_key !== 'string' ||
  typeof credentials.client_email !== 'string'
) {
  throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must contain a service account key.');
}

const credentialsPath = path.join(process.env.RUNNER_TEMP, 'sheety-google-credentials.json');
fs.writeFileSync(credentialsPath, raw, { mode: 0o600, flag: 'wx' });
fs.appendFileSync(process.env.GITHUB_ENV, `SHEETY_GOOGLE_CREDENTIALS_FILE=${credentialsPath}\n`);
console.log('Read-only Google Sheets test credentials configured.');
