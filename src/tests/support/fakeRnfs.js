/**
 * A react-native-fs stand in for jest that reads and writes a real temporary folder, so storage tests
 * exercise real files: hashes, copies, moves and directory listings.
 *
 *   jest.mock('react-native-fs', () => require('../support/fakeRnfs').createFakeRnfs());
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

/**
 * Builds an error the way RNFS reports a missing file on Android.
 * @param file - the path that was not found
 */
function notFound(file) {
  const error = new Error(`ENOENT: no such file or directory, open '${file}'`);
  error.code = 'ENOENT';
  return error;
}

/** A fake RNFS whose DocumentDirectoryPath is a new temporary folder. */
function createFakeRnfs() {
  const documents = fs.mkdtempSync(path.join(os.tmpdir(), 'meditation-docs-')).split(path.sep).join('/');
  return {
    DocumentDirectoryPath: documents,
    /** Removes the documents folder itself, when the tests are done. */
    __dispose() {
      fs.rmSync(documents, { recursive: true, force: true });
    },
    /** Removes everything in the documents folder, for a clean test. */
    __reset() {
      fs.rmSync(documents, { recursive: true, force: true });
      fs.mkdirSync(documents, { recursive: true });
    },
    writeFile: async (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, data, 'utf8'); },
    readFile: async (file) => { if (!fs.existsSync(file)) { throw notFound(file); } return fs.readFileSync(file, 'utf8'); },
    mkdir: async (dir) => { fs.mkdirSync(dir, { recursive: true }); },
    stat: async (file) => ({ size: fs.statSync(file).size }),
    exists: async (file) => fs.existsSync(file),
    unlink: async (file) => { if (!fs.existsSync(file)) { throw notFound(file); } fs.rmSync(file, { recursive: true }); },
    copyFile: async (from, to) => { fs.copyFileSync(from, to); },
    moveFile: async (from, to) => { fs.renameSync(from, to); },
    hash: async (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
    readDir: async (dir) => fs.readdirSync(dir).map(name => {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      return { name, path: full.split(path.sep).join('/'), size: stat.size, mtime: stat.mtime, isFile: () => stat.isFile() };
    }),
  };
}

module.exports = { createFakeRnfs };
