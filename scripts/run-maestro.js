/**
 * Runs Maestro E2E tests against the Android emulator.
 *
 * Usage:  npm run test:maestro
 *
 * Prerequisites:
 *   1. Emulator (Medium_Phone_API_36.0) is running
 *   2. Metro bundler is running  (npm run start)
 *   3. App is installed  (npm run android  or  npm run test:e2e:build  then adb install ...)
 *
 * Maestro lives at %USERPROFILE%\.maestro\maestro\bin\maestro.bat (Windows).
 *
 * Known Windows quirk: Maestro's device detection requires the ADB server to be restarted
 * in the same process session before running. This script handles that automatically.
 */

const { spawnSync, execSync } = require('child_process');
const path = require('path');
const os = require('os');

const ANDROID_HOME = 'C:\\Users\\jason\\AppData\\Local\\Android\\Sdk';
const JAVA_HOME = 'C:\\Program Files\\Android\\Android Studio\\jbr';
const ADB = path.join(ANDROID_HOME, 'platform-tools', 'adb.exe');
const MAESTRO_BIN = path.join(os.homedir(), '.maestro', 'maestro', 'bin', 'maestro.bat');
const FLOWS_DIR = path.join(__dirname, '..', 'e2e', 'maestro');

const env = {
  ...process.env,
  ANDROID_HOME,
  ANDROID_SDK_ROOT: ANDROID_HOME,
  JAVA_HOME,
  MAESTRO_CLI_NO_ANALYTICS: '1',
  PATH: `${JAVA_HOME}\\bin;${ANDROID_HOME}\\platform-tools;${ANDROID_HOME}\\emulator;${process.env.PATH}`,
};

// Restart ADB so Maestro can detect the running emulator (Windows quirk)
console.log('Restarting ADB server...');
try { execSync(`"${ADB}" kill-server`, { env, shell: true }); } catch (_) {}
execSync(`"${ADB}" start-server`, { env, shell: true, stdio: 'inherit' });
execSync(`"${ADB}" devices`, { env, shell: true, stdio: 'inherit' });

const flows = [
  path.join(FLOWS_DIR, 'saveSession.yaml'),
  path.join(FLOWS_DIR, 'saveSessionWithTimer.yaml'),
];

let failed = 0;

for (const flow of flows) {
  const flowName = path.basename(flow);
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Running: ${flowName}`);
  console.log('─'.repeat(60));

  const result = spawnSync(MAESTRO_BIN, ['test', flow], {
    stdio: 'inherit',
    env,
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`\n❌  FAILED: ${flowName}`);
    failed++;
  } else {
    console.log(`\n✅  PASSED: ${flowName}`);
  }
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`Results: ${flows.length - failed}/${flows.length} passed`);
console.log('═'.repeat(60));

process.exit(failed > 0 ? 1 : 0);
