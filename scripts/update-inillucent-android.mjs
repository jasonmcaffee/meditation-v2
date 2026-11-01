#!/usr/bin/env node
/**
 * Rebuilds the inillucent Android library from an inillucent checkout and vendors it into the app's
 * local bridge module, modules/react-native-inillucent.
 *
 *   node scripts/update-inillucent-android.mjs [--inillucent <dir>] [--skip-build]
 *
 * - builds the release AAR (packages/android) for arm64-v8a, armeabi-v7a and x86_64,
 * - strips the native libraries' debug symbols (the AAR keeps them; the app does not need them),
 * - writes it as a one artifact Maven repository in modules/react-native-inillucent/android/libs/maven
 *   (version <engine version>-<commit>, recorded in android/inillucent.properties),
 * - copies inillucent_driver.h, the C header the iOS half compiles against,
 * - records the inillucent commit in modules/react-native-inillucent/INILLUCENT_COMMIT, which the iOS
 *   build and the GitHub workflow check out so both platforms run the same engine.
 *
 * Needs the Android SDK with NDK 27.1.12297006, Java 17 and Rust (see inillucent's
 * packages/android/README.md). --inillucent defaults to $INILLUCENT_DIR, then ../inillucent.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const moduleRoot = path.join(appRoot, 'modules', 'react-native-inillucent');
const NDK_VERSION = '27.1.12297006';

/**
 * Reads the command line options.
 * @param argv - process.argv after the script name
 */
function readOptions(argv) {
  const options = { inillucent: process.env.INILLUCENT_DIR || path.resolve(appRoot, '..', 'inillucent'), skipBuild: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--inillucent') { options.inillucent = path.resolve(argv[++i]); }
    else if (argv[i] === '--skip-build') { options.skipBuild = true; }
    else { throw new Error(`unknown option ${argv[i]}`); }
  }
  return options;
}

/**
 * Runs a program, streaming its output, and throws when it fails.
 * @param program - the program
 * @param args - its arguments
 * @param options - spawnSync options
 */
function run(program, args, options = {}) {
  const result = spawnSync(program, args, { stdio: 'inherit', ...options });
  if (result.status !== 0) { throw new Error(`${program} ${args.join(' ')} exited with ${result.status}`); }
  return result;
}

/** The Android SDK folder, from the environment or the default Windows/macOS/Linux location. */
function androidHome() {
  const fromEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (fromEnv) { return fromEnv; }
  if (process.platform === 'win32') { return path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'); }
  if (process.platform === 'darwin') { return path.join(os.homedir(), 'Library', 'Android', 'sdk'); }
  return path.join(os.homedir(), 'Android', 'Sdk');
}

/**
 * bsdtar, which reads and writes zip files: Windows ships it as System32\tar.exe (a Git Bash tar on the
 * PATH is GNU tar, which cannot), and it is the tar on macOS.
 */
function bsdtar() {
  return process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
}

/** The NDK's llvm-strip for this machine. */
function llvmStrip() {
  const host = { win32: 'windows-x86_64', darwin: 'darwin-x86_64', linux: 'linux-x86_64' }[process.platform];
  const exe = process.platform === 'win32' ? 'llvm-strip.exe' : 'llvm-strip';
  const tool = path.join(androidHome(), 'ndk', NDK_VERSION, 'toolchains', 'llvm', 'prebuilt', host, 'bin', exe);
  if (!fs.existsSync(tool)) { throw new Error(`llvm-strip not found at ${tool}; install NDK ${NDK_VERSION}`); }
  return tool;
}

/**
 * Builds the release AAR in the inillucent checkout.
 * @param inillucent - the checkout
 */
function buildAar(inillucent) {
  const android = path.join(inillucent, 'packages', 'android');
  const gradlew = path.join(android, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  run(gradlew, ['-p', android, '--no-daemon', ':inillucent:assembleRelease'], { shell: process.platform === 'win32' });
}

/**
 * Unpacks the AAR, strips every native library, and packs it again at the destination.
 * @param source - the AAR the inillucent build wrote
 * @param destination - where the stripped AAR goes
 */
function stripAar(source, destination) {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'inillucent-aar-'));
  try {
    run(bsdtar(), ['-xf', source, '-C', stage]);
    const strip = llvmStrip();
    for (const abi of fs.readdirSync(path.join(stage, 'jni'))) {
      for (const lib of fs.readdirSync(path.join(stage, 'jni', abi)).filter(f => f.endsWith('.so'))) {
        run(strip, ['--strip-unneeded', path.join(stage, 'jni', abi, lib)]);
      }
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    const packed = path.join(stage, '..', `${path.basename(stage)}.aar`);
    // The entries are named at the top level, not as ".", so they are stored as "AndroidManifest.xml"
    // rather than "./AndroidManifest.xml", which the Android Gradle plugin would not find.
    run(bsdtar(), ['--format', 'zip', '-cf', packed, '-C', stage, ...fs.readdirSync(stage)]);
    fs.copyFileSync(packed, destination);
    fs.rmSync(packed, { force: true });
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
}

/**
 * The commit the inillucent checkout is at.
 * @param inillucent - the checkout
 */
function commitOf(inillucent) {
  const result = spawnSync('git', ['-C', inillucent, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
  if (result.status !== 0) { throw new Error(`git rev-parse failed in ${inillucent}`); }
  return result.stdout.trim();
}

/**
 * The engine version the checkout builds, from the workspace Cargo.toml.
 * @param inillucent - the checkout
 */
function engineVersion(inillucent) {
  const match = /^version = "([^"]+)"/m.exec(fs.readFileSync(path.join(inillucent, 'Cargo.toml'), 'utf8'));
  if (!match) { throw new Error('no version in the inillucent Cargo.toml'); }
  return match[1];
}

/**
 * Writes the AAR as the only artifact of a local Maven repository, with a pom that has no
 * dependencies, and removes any other version so the repository holds exactly one.
 * @param built - the AAR the inillucent build wrote
 * @param version - the Maven version
 */
function writeMavenRepository(built, version) {
  const artifactDir = path.join(moduleRoot, 'android', 'libs', 'maven', 'com', 'blackrainbowlabs', 'inillucent', 'inillucent');
  fs.rmSync(artifactDir, { recursive: true, force: true });
  const versionDir = path.join(artifactDir, version);
  fs.mkdirSync(versionDir, { recursive: true });
  const aar = path.join(versionDir, `inillucent-${version}.aar`);
  stripAar(built, aar);
  fs.writeFileSync(path.join(versionDir, `inillucent-${version}.pom`), [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<project xmlns="http://maven.apache.org/POM/4.0.0">',
    '  <modelVersion>4.0.0</modelVersion>',
    '  <groupId>com.blackrainbowlabs.inillucent</groupId>',
    '  <artifactId>inillucent</artifactId>',
    `  <version>${version}</version>`,
    '  <packaging>aar</packaging>',
    '</project>',
    '',
  ].join('\n'));
  return aar;
}

/** Builds, strips and vendors the library, and records where it came from. */
function main() {
  const options = readOptions(process.argv.slice(2));
  if (!options.skipBuild) { buildAar(options.inillucent); }
  const built = path.join(options.inillucent, 'packages', 'android', 'inillucent', 'build', 'outputs', 'aar', 'inillucent-release.aar');
  const commit = commitOf(options.inillucent);
  const version = `${engineVersion(options.inillucent)}-${commit.slice(0, 8)}`;
  const vendored = writeMavenRepository(built, version);
  fs.writeFileSync(path.join(moduleRoot, 'android', 'inillucent.properties'), `# Written by scripts/update-inillucent-android.mjs.\nversion=${version}\n`);
  fs.copyFileSync(path.join(options.inillucent, 'drivers', 'inillucent-driver-capi', 'include', 'inillucent_driver.h'), path.join(moduleRoot, 'ios', 'inillucent_driver.h'));
  fs.writeFileSync(path.join(moduleRoot, 'INILLUCENT_COMMIT'), `${commit}\n`);
  console.log(`vendored ${vendored} (${fs.statSync(vendored).size} bytes), version ${version}`);
}

main();
