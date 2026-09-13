// Permanent, documented WP-102 test harness. Never uses an existing database.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync, existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const bin = process.env.PG_BIN;
if (!bin) throw new Error('Set PG_BIN to PostgreSQL bin directory. No existing database is used.');
const exe = name => join(bin, name + (process.platform === 'win32' ? '.exe' : ''));
for (const name of ['initdb', 'pg_ctl', 'psql']) if (!existsSync(exe(name))) throw new Error(`Missing PostgreSQL tool: ${name}`);
const port = await new Promise((resolvePort, reject) => {
  const server = createServer(); server.on('error', reject);
  server.listen(0, '127.0.0.1', () => { const address = server.address(); server.close(() => resolvePort(address.port)); });
});
const temporaryRoot = realpathSync(tmpdir());
const folder = mkdtempSync(join(temporaryRoot, 'nexguardian-wp102-'));
const data = join(folder, 'data');
const passwordFile = join(folder, 'password');
const password = randomBytes(32).toString('hex');
writeFileSync(passwordFile, password, { mode: 0o600 });
let started = false;
let phase = 'initdb';
const adminEnv = { ...process.env, PGPASSWORD: password };
const run = (file, args, options = {}) => execFileSync(file, args, {
  cwd: root, windowsHide: true, timeout: 60000, stdio: 'pipe', ...options,
});
try {
  run(exe('initdb'), ['-D', data, '-U', 'wp102_admin', '--auth=scram-sha-256', '--pwfile', passwordFile, '--encoding=UTF8', '--locale=C']);
  phase = 'postgres startup';
  started = true;
  run(exe('pg_ctl'), ['-D', data, '-l', join(folder, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', '-t', '30', 'start'], { stdio: 'ignore' });
  console.log('Isolated PostgreSQL started.');
  phase = 'test database creation';
  run(exe('psql'), ['-h', '127.0.0.1', '-p', String(port), '-U', 'wp102_admin', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], {
    env: adminEnv,
    input: `CREATE ROLE wp102_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password}';\nCREATE DATABASE wp102_test OWNER wp102_app;\n`,
  });
  const url = `postgresql://wp102_app:${password}@127.0.0.1:${port}/wp102_test`;
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: url, WP102_DATABASE_URL: url, WP102_EPHEMERAL: '1' };
  const prisma = join(root, 'node_modules/prisma/build/index.js');
  for (const args of [['migrate', 'deploy'], ['migrate', 'deploy'], ['migrate', 'status']]) {
    phase = 'prisma ' + args.join(' ');
    run(process.execPath, [prisma, ...args], { env });
    console.log('PASS:', phase);
  }
  phase = 'integration tests';
  run(process.execPath, ['--experimental-vm-modules', join(root, 'node_modules/jest/bin/jest.js'), '--config', 'jest.integration.config.cjs', '--runInBand'], { env, stdio: 'inherit' });
  console.log('PASS: real PostgreSQL migration and workspace isolation');
} catch (error) {
  const detail = String(error.stderr ?? error.message ?? '').replaceAll(password, '[REDACTED]');
  console.error(detail);
  // Temporary credentials are redacted from diagnostics.
  console.error(`WP-102 failed during ${phase}; no external database touched.`);
  process.exitCode = 1;
} finally {
  let stopped = !started;
  if (started) {
    try { run(exe('pg_ctl'), ['-D', data, '-m', 'fast', '-w', '-t', '30', 'stop'], { stdio: 'ignore' }); stopped = true; }
    catch { console.error('Could not stop the isolated PostgreSQL cluster; inspect temporary directory.'); process.exitCode = 1; }
  }
  // Verify resolved absolute path before recursive removal, within our temp root.
  const target = realpathSync(folder);
  if (stopped && target.startsWith(temporaryRoot + sep) && resolve(target) === resolve(folder)) {
    rmSync(target, { recursive: true, force: true });
    console.log('Temporary PostgreSQL cluster and credentials removed.');
  }
}
