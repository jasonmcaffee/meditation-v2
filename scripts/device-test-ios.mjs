#!/usr/bin/env node
/**
 * Checks the conversion of sessions.txt into inillucent on an iOS simulator. The iOS twin of
 * scripts/device-test-android.mjs, with the same fixture and the same checks.
 *
 *   node scripts/device-test-ios.mjs --app <path to meditation.app> [--device <udid>] [--count 40]
 *
 * 1. boots the simulator (the newest available iPhone unless --device names one),
 * 2. installs the app fresh, and writes a legacy sessions.txt into its Documents folder,
 * 3. launches it and waits for storage-report.json,
 * 4. checks: on inillucent, every session converted and none set aside, sessions.txt gone from
 *    Documents and a byte identical copy in legacy-backup, and the database file exists.
 *
 * Needs a Mac with Xcode. Build the app for the simulator in Release first, so the JavaScript is
 * bundled. Results go to _agent_output/device-test-ios.json. Exits 1 when a check fails.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { realisticSessions, legacyFileText } = require(path.join(appRoot, 'e2e', 'fixtures', 'legacySessions.js'));
const BUNDLE_ID = 'com.jasonmcaffee.meditation';

/**
 * Reads the command line options.
 * @param argv - process.argv after the script name
 */
function readOptions(argv) {
  const options = { app: undefined, device: undefined, count: 40, timeoutMs: 180000 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--app') { options.app = argv[++i]; }
    else if (argv[i] === '--device') { options.device = argv[++i]; }
    else if (argv[i] === '--count') { options.count = Number(argv[++i]); }
    else { throw new Error(`unknown option ${argv[i]}`); }
  }
  if (!options.app) { throw new Error('--app <path to meditation.app> is required'); }
  return options;
}

/**
 * Runs `xcrun simctl` and returns its output.
 * @param args - simctl's arguments
 * @param allowFailure - return the output instead of throwing
 */
function simctl(args, allowFailure = false) {
  const result = spawnSync('xcrun', ['simctl', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0 && !allowFailure) { throw new Error(`simctl ${args.join(' ')} failed: ${result.stderr}`); }
  return result.stdout.trim();
}

/** The udid of the newest available iPhone simulator. */
function newestIphone() {
  const devices = JSON.parse(simctl(['list', 'devices', 'available', '--json'])).devices;
  let best;
  for (const [runtime, list] of Object.entries(devices)) {
    const match = /iOS-(\d+)-(\d+)/.exec(runtime);
    if (!match) { continue; }
    const version = Number(match[1]) * 100 + Number(match[2]);
    for (const device of list) {
      if (device.name.startsWith('iPhone') && (!best || version > best.version)) { best = { version, udid: device.udid, name: device.name }; }
    }
  }
  if (!best) { throw new Error('no iPhone simulator is available'); }
  console.log(`using ${best.name} (${best.udid})`);
  return best.udid;
}

/**
 * Boots the simulator, installs the app fresh and writes the legacy file into its Documents folder.
 * @param device - the simulator's udid
 * @param app - the .app folder
 * @param text - the legacy file's text
 */
function installAndSeed(device, app, text) {
  simctl(['boot', device], true);
  simctl(['bootstatus', device, '-b']);
  simctl(['uninstall', device, BUNDLE_ID], true);
  simctl(['install', device, app]);
  const data = simctl(['get_app_container', device, BUNDLE_ID, 'data']);
  const documents = path.join(data, 'Documents');
  fs.mkdirSync(documents, { recursive: true });
  fs.writeFileSync(path.join(documents, 'sessions.txt'), text, 'utf8');
  return documents;
}

/**
 * Launches the app and waits for storage-report.json.
 * @param device - the simulator
 * @param documents - the app's Documents folder
 * @param timeoutMs - how long to wait
 */
function launchAndWaitForReport(device, documents, timeoutMs) {
  simctl(['launch', device, BUNDLE_ID]);
  const reportPath = path.join(documents, 'storage-report.json');
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (fs.existsSync(reportPath)) {
      try { return { report: JSON.parse(fs.readFileSync(reportPath, 'utf8')), waitedMs: Date.now() - started }; } catch { /* still being written */ }
    }
    spawnSync('sleep', ['1']);
  }
  throw new Error(`no storage-report.json after ${timeoutMs} ms`);
}

/**
 * Checks what the app did, one entry per check.
 * @param documents - the app's Documents folder
 * @param report - the app's storage report
 * @param text - the seeded file's text
 * @param count - how many sessions were seeded
 */
function check(documents, report, text, count) {
  const hash = crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
  const backup = path.join(documents, 'legacy-backup', `sessions-${hash.slice(0, 16)}.json`);
  const backupHash = fs.existsSync(backup) ? crypto.createHash('sha256').update(fs.readFileSync(backup)).digest('hex') : 'missing';
  return [
    { name: 'the app is on the inillucent database', pass: report.mode === 'inillucent', actual: report.mode },
    { name: 'the conversion succeeded', pass: report.legacyImport?.outcome === 'ok', actual: report.legacyImport?.outcome },
    { name: `all ${count} sessions were converted`, pass: report.legacyImport?.inserted === count && report.sessionCount === count, actual: { inserted: report.legacyImport?.inserted, sessionCount: report.sessionCount } },
    { name: 'no record was set aside', pass: report.quarantined === 0, actual: report.quarantined },
    { name: 'sessions.txt is gone from Documents', pass: !fs.existsSync(path.join(documents, 'sessions.txt')), actual: fs.readdirSync(documents) },
    { name: 'a byte identical copy is in legacy-backup', pass: backupHash === hash, actual: backupHash },
    { name: 'the database file exists', pass: fs.existsSync(path.join(documents, 'db', 'meditation.rdb')), actual: fs.existsSync(path.join(documents, 'db')) ? fs.readdirSync(path.join(documents, 'db')) : [] },
  ];
}

/** Seeds, launches and checks, then writes the results. */
function main() {
  const options = readOptions(process.argv.slice(2));
  const device = options.device || newestIphone();
  const text = legacyFileText(realisticSessions(options.count));
  const documents = installAndSeed(device, options.app, text);
  const { report, waitedMs } = launchAndWaitForReport(device, documents, options.timeoutMs);
  const checks = check(documents, report, text, options.count);
  const out = path.join(appRoot, '_agent_output', 'device-test-ios.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ device, waitedMs, checks, report }, null, 2));
  for (const c of checks) { console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.pass ? '' : `  (got ${JSON.stringify(c.actual)})`}`); }
  console.log(`conversion took ${report.legacyImport?.elapsedMs} ms in the app; report after ${waitedMs} ms; results in ${out}`);
  fs.writeFileSync(path.join(appRoot, '_agent_output', 'ios-device-udid.txt'), device);
  process.exit(checks.every(c => c.pass) ? 0 : 1);
}

main();
