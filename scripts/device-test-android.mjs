#!/usr/bin/env node
/**
 * Checks the conversion of sessions.txt into inillucent on an Android device or emulator.
 *
 *   node scripts/device-test-android.mjs [--serial emulator-5554] [--apk <path>] [--count 40] [--metro-host 10.0.2.2:8099]
 *
 * 1. installs the APK when one is given, and clears the app's data, which makes it a fresh install,
 * 2. writes a legacy sessions.txt (e2e/fixtures/legacySessions.js) into the app's files folder with
 *    `adb run-as`, which needs a debuggable build,
 * 3. launches the app and waits for it to write storage-report.json,
 * 4. checks: the app is on inillucent, every session converted and none set aside, sessions.txt is
 *    gone from the files folder and a byte identical copy is in legacy-backup, and the database
 *    file exists.
 *
 * A debug build loads its JavaScript from Metro, so Metro must be running and reachable from the
 * device (`adb reverse tcp:8081 tcp:<metro port>`). Results go to
 * _agent_output/device-test-android.json. Exits 1 when a check fails.
 */
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { realisticSessions, legacyFileText } = require(path.join(appRoot, 'e2e', 'fixtures', 'legacySessions.js'));
const PACKAGE = 'com.jasonmcaffee.meditation';
const ACTIVITY = 'com.meditation.MainActivity';

/**
 * Reads the command line options.
 * @param argv - process.argv after the script name
 */
function readOptions(argv) {
  const options = { serial: process.env.ANDROID_SERIAL || 'emulator-5554', apk: undefined, count: 40, timeoutMs: 120000, metroHost: undefined };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--serial') { options.serial = argv[++i]; }
    else if (argv[i] === '--metro-host') { options.metroHost = argv[++i]; }
    else if (argv[i] === '--apk') { options.apk = argv[++i]; }
    else if (argv[i] === '--count') { options.count = Number(argv[++i]); }
    else { throw new Error(`unknown option ${argv[i]}`); }
  }
  return options;
}

/**
 * Runs adb against the device and returns its standard output.
 * @param serial - the device
 * @param args - adb's arguments
 * @param allowFailure - return the output instead of throwing on a non zero exit
 */
function adb(serial, args, allowFailure = false) {
  const result = spawnSync('adb', ['-s', serial, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`adb ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return (result.stdout || '').replace(/\r\n/g, '\n');
}

/**
 * Runs a shell command as the app, in its data folder.
 * @param serial - the device
 * @param command - the shell command
 * @param allowFailure - return the output instead of throwing
 */
function runAs(serial, command, allowFailure = false) {
  return adb(serial, ['shell', `run-as ${PACKAGE} sh -c '${command}'`], allowFailure);
}

/**
 * Clears the app's data and writes the legacy sessions file into its files folder.
 * @param serial - the device
 * @param text - the file's text
 */
function seedLegacyFile(serial, text) {
  adb(serial, ['shell', 'am', 'force-stop', PACKAGE]);
  adb(serial, ['shell', 'pm', 'clear', PACKAGE]);
  const local = path.join(os.tmpdir(), `sessions-${process.pid}.txt`);
  fs.writeFileSync(local, text, 'utf8');
  adb(serial, ['push', local, '/data/local/tmp/meditation-sessions.txt']);
  adb(serial, ['shell', 'chmod', '644', '/data/local/tmp/meditation-sessions.txt']);
  runAs(serial, 'mkdir -p files && cp /data/local/tmp/meditation-sessions.txt files/sessions.txt');
  fs.rmSync(local, { force: true });
}

/**
 * Points a debug build at Metro on another host and port, through the `debug_http_host` setting
 * React Native's dev menu writes. Needed when Metro is not on the host's port 8081.
 * @param serial - the device
 * @param metroHost - host:port as the device sees it, such as 10.0.2.2:8099 on an emulator
 */
function setMetroHost(serial, metroHost) {
  const prefs = `<?xml version="1.0" encoding="utf-8" standalone="yes" ?><map><string name="debug_http_host">${metroHost}</string></map>`;
  const local = path.join(os.tmpdir(), `prefs-${process.pid}.xml`);
  fs.writeFileSync(local, prefs, 'utf8');
  adb(serial, ['push', local, '/data/local/tmp/meditation-prefs.xml']);
  adb(serial, ['shell', 'chmod', '644', '/data/local/tmp/meditation-prefs.xml']);
  runAs(serial, `mkdir -p shared_prefs && cp /data/local/tmp/meditation-prefs.xml shared_prefs/${PACKAGE}_preferences.xml`);
  fs.rmSync(local, { force: true });
}

/**
 * Launches the app and waits until it has written its storage report.
 * @param serial - the device
 * @param timeoutMs - how long to wait
 */
function launchAndWaitForReport(serial, timeoutMs) {
  adb(serial, ['shell', 'am', 'start', '-n', `${PACKAGE}/${ACTIVITY}`]);
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const text = runAs(serial, 'cat files/storage-report.json 2>/dev/null', true);
    if (text.trim().startsWith('{')) { return { report: JSON.parse(text), waitedMs: Date.now() - started }; }
    spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},1000)']);
  }
  throw new Error(`no storage-report.json after ${timeoutMs} ms`);
}

/**
 * Checks what the app did, returning one entry per check.
 * @param serial - the device
 * @param report - the app's storage report
 * @param text - the seeded file's text
 * @param count - how many sessions were seeded
 */
function check(serial, report, text, count) {
  const expectedHash = crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
  const files = runAs(serial, 'ls files files/legacy-backup files/db', true);
  const backupName = `sessions-${expectedHash.slice(0, 16)}.json`;
  const backupHash = runAs(serial, `sha256sum files/legacy-backup/${backupName}`, true).split(/\s+/)[0];
  return [
    { name: 'the app is on the inillucent database', pass: report.mode === 'inillucent', actual: report.mode },
    { name: 'the conversion succeeded', pass: report.legacyImport?.outcome === 'ok', actual: report.legacyImport?.outcome },
    { name: `all ${count} sessions were converted`, pass: report.legacyImport?.inserted === count && report.sessionCount === count, actual: { inserted: report.legacyImport?.inserted, sessionCount: report.sessionCount } },
    { name: 'no record was set aside', pass: report.quarantined === 0, actual: report.quarantined },
    { name: 'sessions.txt is gone from the files folder', pass: !/(^|\n)sessions\.txt(\n|$)/.test(files) && report.legacyFilePresent === false, actual: files },
    { name: 'a byte identical copy is in legacy-backup', pass: backupHash === expectedHash, actual: backupHash },
    { name: 'the database file exists', pass: /meditation\.rdb/.test(files), actual: files },
  ];
}

/** Seeds, launches and checks, then writes the results. */
function main() {
  const options = readOptions(process.argv.slice(2));
  if (options.apk) { adb(options.serial, ['install', '-r', options.apk]); }
  const text = legacyFileText(realisticSessions(options.count));
  seedLegacyFile(options.serial, text);
  if (options.metroHost) { setMetroHost(options.serial, options.metroHost); }
  const { report, waitedMs } = launchAndWaitForReport(options.serial, options.timeoutMs);
  const checks = check(options.serial, report, text, options.count);
  const out = path.join(appRoot, '_agent_output', 'device-test-android.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ serial: options.serial, waitedMs, checks, report }, null, 2));
  for (const c of checks) { console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}${c.pass ? '' : `  (got ${JSON.stringify(c.actual)})`}`); }
  console.log(`conversion took ${report.legacyImport?.elapsedMs} ms in the app; report after ${waitedMs} ms; results in ${out}`);
  process.exit(checks.every(c => c.pass) ? 0 : 1);
}

main();
