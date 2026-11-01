import fileSystem from "../fileSystem";
import {getNativeInillucent, InillucentDb, InillucentNative} from "./inillucentDb";
import {
    BACKUP_DIR, DATABASE_PATH, databaseBackupPath, LEGACY_SESSIONS_PATH, legacyBackupPath, STORAGE_MODE_PATH,
    STORAGE_REPORT_PATH,
} from "./storagePaths";
import {ImportResult, importedHashes, importLegacyFile} from "./legacyMigration";
import {applySchema} from "../../repository/sessionSchema";
import {InillucentSessionRepository, SessionStore} from "../../repository/inillucentSessionRepository";
import {JsonSessionRepository} from "../../repository/jsonSessionRepository";

/** Which storage the app is running on. */
export type StorageMode = 'inillucent' | 'json';

/** Why the app is on the JSON file instead of inillucent. */
export type JsonReason = 'chosen' | 'no-native-module' | 'open-failed' | 'import-failed';

/** The person's choice on the Data screen, kept outside the database. */
export interface ModeFile{
    mode: StorageMode,
    replaceFromJson?: boolean, //set when switching back: the JSON file replaces the database's sessions
}

/** What the bootstrap decided and why. Written to storage-report.json and shown on the Data screen. */
export interface StorageReport{
    atMs: number,
    mode: StorageMode,
    jsonReason?: JsonReason,
    error?: string,
    engineVersion?: string,
    sessionCount: number,
    legacyFilePresent: boolean,
    legacyImport?: ImportResult,
    quarantined: number,
    databaseBackupPath?: string,
}

/** The storage the app is running on. */
export interface ActiveStorage{
    store: SessionStore,
    report: StorageReport,
    db?: InillucentDb,
}

/**
 * Opens the storage for this launch: the inillucent database, converting sessions.txt into it when
 * the file is there, or the JSON file when the person chose it or the database cannot be used.
 * @param native - the native module (a test passes one that runs on Node)
 */
export async function bootstrapStorage(native: InillucentNative | undefined = getNativeInillucent()): Promise<ActiveStorage>{
    const report: StorageReport = {atMs: Date.now(), mode: 'inillucent', sessionCount: 0, legacyFilePresent: false, quarantined: 0};
    const modeFile = await readModeFile();
    report.legacyFilePresent = await fileSystem.exists(LEGACY_SESSIONS_PATH);
    if(modeFile.mode === 'json'){ return useJson(report, 'chosen'); }
    if(!native){ return useJson(report, 'no-native-module'); }
    let db: InillucentDb;
    try{
        report.engineVersion = await native.version();
        db = await InillucentDb.open(native, DATABASE_PATH);
        await applySchema(db);
    }catch(e: any){
        return useJson(report, 'open-failed', String(e?.message ?? e));
    }
    if(report.legacyFilePresent){
        const imported = await importLegacyIntoDatabase(db, modeFile, report);
        if(imported.outcome === 'failed' && (imported.reason === 'verify-mismatch' || imported.reason === 'error')){
            await db.close().catch(() => undefined);
            return useJson(report, 'import-failed', imported.error);
        }
    }else if(modeFile.replaceFromJson){
        await writeModeFile({mode: 'inillucent'});
    }
    return useInillucent(db, report);
}

/**
 * Converts sessions.txt into the database (or replaces the database's sessions with it, after a
 * database backup), then moves the file into the backup folder when that worked.
 * @param db - the open database
 * @param modeFile - the person's storage choice
 * @param report - the report, which receives the import result
 */
async function importLegacyIntoDatabase(db: InillucentDb, modeFile: ModeFile, report: StorageReport): Promise<ImportResult>{
    const hash = await fileSystem.hash(LEGACY_SESSIONS_PATH);
    let result: ImportResult;
    if(modeFile.replaceFromJson){
        report.databaseBackupPath = databaseBackupPath(Date.now());
        await db.backupTo(report.databaseBackupPath);
        result = await importLegacyFile(db, LEGACY_SESSIONS_PATH, {kind: 'replace-from-json', mode: 'replace'});
    }else if((await importedHashes(db)).includes(hash)){
        result = skippedResult(hash);
    }else{
        result = await importLegacyFile(db, LEGACY_SESSIONS_PATH, {kind: 'legacy-import', mode: 'merge'});
    }
    report.legacyImport = result;
    if(result.outcome !== 'failed'){
        await retireLegacyFile(hash);
        report.legacyFilePresent = await fileSystem.exists(LEGACY_SESSIONS_PATH);
        if(modeFile.replaceFromJson){ await writeModeFile({mode: 'inillucent'}); }
    }
    return result;
}

/**
 * The result for a file whose exact content was imported before (a crash came between the commit
 * and the move).
 * @param hash - the file's hash
 */
function skippedResult(hash: string): ImportResult{
    return {
        kind: 'legacy-import', outcome: 'skipped', reason: 'already-imported', sourcePath: LEGACY_SESSIONS_PATH,
        sourceHash: hash, sourceCharacters: 0, backupPath: legacyBackupPath(hash), sessionsInFile: 0, inserted: 0,
        alreadyPresent: 0, differentFromDatabase: 0, renamedIds: 0, quarantined: 0, mismatches: [], elapsedMs: 0,
    };
}

/**
 * Moves sessions.txt out of the way once its content is in the database. The import already wrote a
 * copy checked by hash into the backup folder, so when that copy is there the original is removed;
 * otherwise the original is moved there.
 * @param hash - the file's hash
 */
async function retireLegacyFile(hash: string){
    const backup = legacyBackupPath(hash);
    if(await fileSystem.exists(backup) && await fileSystem.hash(backup) === hash){
        await fileSystem.unlink(LEGACY_SESSIONS_PATH);
        return;
    }
    await fileSystem.mkDir(BACKUP_DIR);
    await fileSystem.moveFile(LEGACY_SESSIONS_PATH, backup);
}

/**
 * Finishes on the inillucent database.
 * @param db - the open database
 * @param report - the report
 */
async function useInillucent(db: InillucentDb, report: StorageReport): Promise<ActiveStorage>{
    const store = new InillucentSessionRepository(db);
    report.mode = 'inillucent';
    report.sessionCount = (await store.getMeditationSessions()).length;
    const quarantined = await db.query('SELECT COUNT(*) AS n FROM legacy_quarantine');
    report.quarantined = Number(quarantined[0]?.n ?? 0);
    await writeReport(report);
    return {store, report, db};
}

/**
 * Finishes on the JSON file.
 * @param report - the report
 * @param reason - why
 * @param error - the error that caused it, if any
 */
async function useJson(report: StorageReport, reason: JsonReason, error?: string): Promise<ActiveStorage>{
    const store = new JsonSessionRepository();
    report.mode = 'json';
    report.jsonReason = reason;
    report.error = error;
    try{
        report.sessionCount = (await store.getMeditationSessions()).length;
    }catch(e: any){
        report.error = [error, `the JSON file could not be read: ${e?.message ?? e}`].filter(Boolean).join('; ');
    }
    if(reason !== 'chosen'){ console.warn(`[storage] using the JSON file: ${reason} ${error ?? ''}`); }
    await writeReport(report);
    return {store, report};
}

/** The person's storage choice; inillucent when there is no choice on file or it cannot be read. */
export async function readModeFile(): Promise<ModeFile>{
    try{
        if(!(await fileSystem.exists(STORAGE_MODE_PATH))){ return {mode: 'inillucent'}; }
        const value = JSON.parse(await fileSystem.readFile(STORAGE_MODE_PATH));
        return value?.mode === 'json' ? {mode: 'json'} : {mode: 'inillucent', replaceFromJson: value?.replaceFromJson === true};
    }catch(e){
        console.warn('[storage] storage-mode.json could not be read; using inillucent', e);
        return {mode: 'inillucent'};
    }
}

/**
 * Records the person's storage choice.
 * @param modeFile - the choice
 */
export async function writeModeFile(modeFile: ModeFile){
    await fileSystem.writeFile(JSON.stringify(modeFile), STORAGE_MODE_PATH);
}

/**
 * Writes the report file. A failure here is logged and does not stop the app.
 * @param report - the report
 */
async function writeReport(report: StorageReport){
    try{
        await fileSystem.writeFile(JSON.stringify(report, null, 2), STORAGE_REPORT_PATH);
    }catch(e){
        console.warn('[storage] storage-report.json could not be written', e);
    }
}

export {writeReport};
