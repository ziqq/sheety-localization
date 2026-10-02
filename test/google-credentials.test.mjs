import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@jest/globals';

import { repoRoot } from './runtime-target.mjs';

const script = path.join(repoRoot, '.github/scripts/configure-google-credentials.mjs');
const synthetic = JSON.stringify({
  type: 'service_account',
  client_email: 'test@example.invalid',
  private_key: 'test-only-private-key-marker',
});

function configure(raw, check) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sheety-credentials-test-'));
  const envFile = path.join(directory, 'github-env');
  const keyFile = path.join(directory, 'sheety-google-credentials.json');
  const run = () => spawnSync(process.execPath, [script], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GOOGLE_SERVICE_ACCOUNT_JSON: raw,
      RUNNER_TEMP: directory,
      GITHUB_ENV: envFile,
    },
  });
  try {
    check({ run, envFile, keyFile });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('Google secret setup keeps credentials outside the workspace with restrictive permissions', () => {
  configure(synthetic, ({ run, envFile, keyFile }) => {
    const result = run();
    expect(result.status).toBe(0);
    expect(fs.readFileSync(keyFile, 'utf8')).toBe(synthetic);
    expect(fs.statSync(keyFile).mode & 0o777).toBe(0o600);
    expect(fs.readFileSync(envFile, 'utf8')).toBe(`SHEETY_GOOGLE_CREDENTIALS_FILE=${keyFile}\n`);
    expect(result.stdout + result.stderr).not.toContain('test-only-private-key-marker');
    expect(result.stdout + result.stderr).not.toContain('test@example.invalid');
    expect(run().status).not.toBe(0);
    expect(fs.readFileSync(keyFile, 'utf8')).toBe(synthetic);
  });
});

test('Google secret setup fails on missing or malformed credentials without leaking input', () => {
  for (const raw of ['', 'broken-secret-marker{', '{"type":"wrong","private_key":"secret-marker"}']) {
    configure(raw, ({ run, keyFile }) => {
      const result = run();
      expect(result.status).not.toBe(0);
      expect(fs.existsSync(keyFile)).toBe(false);
      expect(result.stdout + result.stderr).not.toContain('broken-secret-marker');
      expect(result.stdout + result.stderr).not.toContain('secret-marker');
    });
  }
});
