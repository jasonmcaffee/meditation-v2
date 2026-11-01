import {Share} from "react-native";
import fileSystem from "../fileSystem";
import meditationSessionRepository from "../../repository/meditationSessionRepository";
import {readAllSessions} from "../../repository/inillucentSessionRepository";
import {canonicalSession} from "../../repository/sessionRows";
import {ActiveStorage, StorageReport, writeModeFile, writeReport} from "./storageBootstrap";
import {ensureBackupCopy, ImportResult, importLegacyFile} from "./legacyMigration";
import {BACKUP_DIR, databaseBackupPath, LEGACY_SESSIONS_PATH} from "./storagePaths";
import appEventBus from "../appEventBus";

/** One line of the migration log, for the Data screen. */
export interface MigrationLogEntry{
    atMs: number,
    kind: string,
    outcome: string,
    detail: Record<string, unknown>,
}

/** What the Data screen shows. */
export interface StorageStatus{
    report: StorageReport,
    log: MigrationLogEntry[],
    backups: {name: string, path: string, size: number, mtimeMs: number}[],
}

/** The current storage report, the newest log rows and the backup files. */
export async function getStorageStatus(): Promise<StorageStatus>{
    const active = await meditationSessionRepository.start();
    const log: MigrationLogEntry[] = [];
    if(active.db){
        const rows = await active.db.query('SELECT at_ms, kind, outcome, detail FROM migration_log ORDER BY id DESC LIMIT 10');
        for(const r of rows){
            log.push({atMs: Number(r.at_ms), kind: String(r.kind), outcome: String(r.outcome), detail: safeParse(String(r.detail))});
        }
    }
    const backups = (await fileSystem.listFiles(BACKUP_DIR)).sort((a, b) => b.mtimeMs - a.mtimeMs);
    return {report: active.report, log, backups};
}

/**
 * Parses JSON text, or answers {} when it is not JSON.
 * @param text - the text
 */
function safeParse(text: string): Record<string, unknown>{
    try{ return JSON.parse(text); }catch{ return {}; }
}

/** Runs the bootstrap again, which converts sessions.txt if it is still there. */
export async function retryConversion(): Promise<StorageReport>{
    return (await meditationSessionRepository.restart()).report;
}

/**
 * Adds the sessions in a backup file that the database does not have yet. Sessions already there
 * are kept as they are.
 * @param path - a JSON file in the backup folder
 */
export async function importBackup(path: string): Promise<ImportResult>{
    const active = await requireDatabase();
    const result = await importLegacyFile(active.db, path, {kind: 'backup-import', mode: 'merge'});
    const sessions = await readAllSessions(active.db);
    active.report.sessionCount = sessions.length;
    await writeReport(active.report);
    appEventBus.meditationSessionRepository.meditationSessionsChanged().set(sessions);
    return result;
}

/**
 * Opens the share sheet with a file's text, so the person can keep a copy anywhere.
 * @param path - the file
 * @param title - the share sheet's title
 */
export async function shareFile(path: string, title: string){
    const text = await fileSystem.readFile(path);
    await Share.share({title, message: text});
}

/** Opens the share sheet with every session, in the format sessions.txt used. */
export async function exportSessions(){
    const sessions = await meditationSessionRepository.getMeditationSessions();
    await Share.share({title: 'Meditation sessions', message: JSON.stringify({meditationSessions: sessions})});
}

/**
 * Moves the app back to the JSON file: writes every session to sessions.txt (after keeping a copy of
 * any sessions.txt already there), checks the file reads back the same, backs up the database, and
 * restarts on the JSON file. The database is left as it was.
 */
export async function switchToJson(): Promise<StorageReport>{
    const active = await requireDatabase();
    const sessions = await readAllSessions(active.db);
    if(await fileSystem.exists(LEGACY_SESSIONS_PATH)){
        await ensureBackupCopy(LEGACY_SESSIONS_PATH, await fileSystem.hash(LEGACY_SESSIONS_PATH));
    }
    await fileSystem.writeFile(JSON.stringify({meditationSessions: sessions}), LEGACY_SESSIONS_PATH);
    const written = JSON.parse(await fileSystem.readFile(LEGACY_SESSIONS_PATH)).meditationSessions as unknown[];
    const same = written.length === sessions.length && written.every((s, i) => canonicalSession(s as any) === canonicalSession(sessions[i]));
    if(!same){ throw new Error('sessions.txt did not read back the same as the database; nothing was switched'); }
    await active.db.backupTo(databaseBackupPath(Date.now()));
    await writeModeFile({mode: 'json'});
    return (await meditationSessionRepository.restart()).report;
}

/**
 * Moves the app from the JSON file back to inillucent. sessions.txt holds the sessions the person
 * kept while on the JSON file, so it replaces the database's sessions, after a database backup.
 */
export async function switchToInillucent(): Promise<StorageReport>{
    await writeModeFile({mode: 'inillucent', replaceFromJson: true});
    return (await meditationSessionRepository.restart()).report;
}

/** The active storage, or an error when the app is on the JSON file. */
async function requireDatabase(): Promise<ActiveStorage & {db: NonNullable<ActiveStorage['db']>}>{
    const active = await meditationSessionRepository.start();
    if(!active.db){ throw new Error('the app is using the JSON file, not the inillucent database'); }
    return active as ActiveStorage & {db: NonNullable<ActiveStorage['db']>};
}
