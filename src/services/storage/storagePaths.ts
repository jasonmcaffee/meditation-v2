import {baseDirectory} from "../fileSystem";

/** The file every version before task-2445 kept all sessions in, as {"meditationSessions": [...]}. */
export const LEGACY_SESSIONS_PATH = baseDirectory + '/sessions.txt';

/** The inillucent database. It has a folder of its own because the engine writes its log beside it. */
export const DATABASE_PATH = baseDirectory + '/db/meditation.rdb';

/** Copies of the legacy file and of the database, kept so nothing is ever lost. */
export const BACKUP_DIR = baseDirectory + '/legacy-backup';

/** Which storage the person chose on the Data screen: {"mode": "json"} or {"mode": "inillucent"}. */
export const STORAGE_MODE_PATH = baseDirectory + '/storage-mode.json';

/** What the last bootstrap or Data screen action did, for the Data screen and the device tests. */
export const STORAGE_REPORT_PATH = baseDirectory + '/storage-report.json';

/**
 * The backup path for a copy of a legacy sessions file, named by its content hash so the same
 * content is only ever copied once.
 * @param hash - the file's sha256
 */
export function legacyBackupPath(hash: string){
    return `${BACKUP_DIR}/sessions-${hash.slice(0, 16)}.json`;
}

/**
 * The backup path for a copy of the database.
 * @param atMs - when the copy is made
 */
export function databaseBackupPath(atMs: number){
    return `${BACKUP_DIR}/meditation-${atMs}.rdb`;
}
