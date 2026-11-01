import fileSystem from "../fileSystem";
import {InillucentDb, TransactionHandle} from "./inillucentDb";
import {legacyBackupPath} from "./storagePaths";
import {canonicalSession, isPlainObject, SessionJson} from "../../repository/sessionRows";
import {insertSession, readAllSessions} from "../../repository/inillucentSessionRepository";
import {logMigration, readMeta, writeMeta} from "../../repository/sessionSchema";
import IMeditationSession from "../../models/IMeditationSession";

/** Why an import did not happen. */
export type ImportFailure = 'unreadable' | 'unexpected-shape' | 'verify-mismatch' | 'error';

/** What one import of a legacy JSON file did. */
export interface ImportResult{
    kind: 'legacy-import' | 'backup-import' | 'replace-from-json',
    outcome: 'ok' | 'failed' | 'skipped',
    reason?: ImportFailure | 'already-imported',
    error?: string,
    sourcePath: string,
    sourceHash: string,
    sourceCharacters: number,
    backupPath?: string,
    sessionsInFile: number,
    inserted: number,
    alreadyPresent: number,
    differentFromDatabase: number, //ids already present whose stored copy differs; the stored copy is kept
    renamedIds: number,
    quarantined: number,
    mismatches: string[],
    elapsedMs: number,
}

/** How to import: add sessions not already present, or replace every session with the file's. */
export interface ImportOptions{
    kind: ImportResult['kind'],
    mode: 'merge' | 'replace',
    /** Tests only: changes what the check reads back, to prove a difference rolls everything back. */
    alterReadBack?: (session: IMeditationSession) => IMeditationSession,
}

/** A planned session: the record from the file, with a usable string id. */
interface PlannedSession{
    index: number,
    session: SessionJson,
}

/** The meta key holding the hashes of every legacy file already imported. */
export const IMPORTED_HASHES_KEY = 'legacy_imported_hashes';

/** Thrown inside the import transaction when a stored session differs from the file. */
class VerifyMismatch extends Error{
    constructor(readonly mismatches: string[]) { super(`${mismatches.length} sessions differ after import`); }
}

/**
 * Imports a legacy sessions file into the database, checking every stored session against the file
 * before committing. Never changes or removes the source file.
 * @param db - the open database
 * @param sourcePath - the JSON file
 * @param options - merge or replace, and the kind recorded in the log
 */
export async function importLegacyFile(db: InillucentDb, sourcePath: string, options: ImportOptions): Promise<ImportResult>{
    const started = Date.now();
    const result = emptyResult(options.kind, sourcePath);
    try{
        result.sourceHash = await fileSystem.hash(sourcePath);
        const text = await fileSystem.readFile(sourcePath);
        result.sourceCharacters = text.length;
        result.backupPath = await ensureBackupCopy(sourcePath, result.sourceHash);
        const parsed = parseLegacyText(text);
        if('failure' in parsed){ return await finish(db, result, started, 'failed', parsed.failure, parsed.message); }
        const plan = planSessions(parsed.records, result.sourceHash);
        result.sessionsInFile = parsed.records.length;
        result.renamedIds = plan.renamed;
        result.quarantined = plan.quarantine.length;
        await db.transaction(txn => writeAndVerify(txn, plan, parsed.topLevelExtra, result, options));
        return await finish(db, result, started, 'ok');
    }catch(e: any){
        if(e instanceof VerifyMismatch){
            result.mismatches = e.mismatches.slice(0, 20);
            return await finish(db, result, started, 'failed', 'verify-mismatch', e.message);
        }
        return await finish(db, result, started, 'failed', 'error', String(e?.message ?? e));
    }
}

/**
 * A result with nothing counted yet.
 * @param kind - the kind of import
 * @param sourcePath - the file
 */
function emptyResult(kind: ImportResult['kind'], sourcePath: string): ImportResult{
    return {
        kind, outcome: 'failed', sourcePath, sourceHash: '', sourceCharacters: 0, sessionsInFile: 0, inserted: 0,
        alreadyPresent: 0, differentFromDatabase: 0, renamedIds: 0, quarantined: 0, mismatches: [], elapsedMs: 0,
    };
}

/**
 * Sets the outcome and timing, writes the migration log row, and returns the result.
 * @param db - the database
 * @param result - the result so far
 * @param started - when the import started
 * @param outcome - ok or failed
 * @param reason - why it failed
 * @param error - the error text
 */
async function finish(db: InillucentDb, result: ImportResult, started: number, outcome: ImportResult['outcome'], reason?: ImportFailure, error?: string){
    result.outcome = outcome;
    result.reason = reason;
    result.error = error;
    result.elapsedMs = Date.now() - started;
    const {mismatches, ...detail} = result;
    await logMigration(db, result.kind, outcome, {...detail, mismatches: mismatches.slice(0, 5)}).catch(e => console.warn('[migration] log failed', e));
    console.log(`[migration] ${result.kind} ${outcome}${reason ? ` (${reason})` : ''}: ${result.inserted} inserted, ${result.alreadyPresent} present, ${result.quarantined} quarantined, ${result.elapsedMs} ms`);
    return result;
}

/**
 * Copies the source into the backup folder under its hash, unless that copy already exists, and
 * checks the copy's hash. Resolves the copy's path.
 * @param sourcePath - the file
 * @param hash - its sha256
 */
export async function ensureBackupCopy(sourcePath: string, hash: string): Promise<string>{
    const backupPath = legacyBackupPath(hash);
    if(backupPath === sourcePath){ return backupPath; }
    if(await fileSystem.exists(backupPath) && await fileSystem.hash(backupPath) === hash){ return backupPath; }
    await fileSystem.mkDir(backupPath.slice(0, backupPath.lastIndexOf('/')));
    await fileSystem.copyFile(sourcePath, backupPath);
    const copied = await fileSystem.hash(backupPath);
    if(copied !== hash){ throw new Error(`the backup copy of ${sourcePath} does not match it (${copied} != ${hash})`); }
    return backupPath;
}

/**
 * Parses a legacy file: {"meditationSessions": [...]} (any other top level keys are kept), or a bare
 * array of sessions.
 * @param text - the file's text
 */
export function parseLegacyText(text: string): {records: unknown[], topLevelExtra: Record<string, unknown>} | {failure: ImportFailure, message: string}{
    let value: unknown;
    try{
        value = JSON.parse(text);
    }catch(e: any){
        return {failure: 'unreadable', message: `the file is not valid JSON: ${e?.message ?? e}`};
    }
    if(Array.isArray(value)){ return {records: value, topLevelExtra: {}}; }
    if(isPlainObject(value) && Array.isArray(value.meditationSessions)){
        const {meditationSessions, ...topLevelExtra} = value;
        return {records: meditationSessions as unknown[], topLevelExtra};
    }
    return {failure: 'unexpected-shape', message: 'the file has no meditationSessions list'};
}

/**
 * Gives every record a usable, unique string id and sets aside records that are not objects. A
 * changed id keeps the original in `legacyId`.
 * @param records - the sessions from the file, newest first
 * @param hash - the file's hash, used to make generated ids unique to the file
 */
export function planSessions(records: unknown[], hash: string): {sessions: PlannedSession[], quarantine: {index: number, raw: string}[], renamed: number}{
    const sessions: PlannedSession[] = [];
    const quarantine: {index: number, raw: string}[] = [];
    const seen = new Set<string>();
    let renamed = 0;
    records.forEach((record, index) => {
        if(!isPlainObject(record)){ quarantine.push({index, raw: JSON.stringify(record) ?? 'undefined'}); return; }
        const session: SessionJson = {...record};
        let id = typeof record.id === 'string' && record.id !== '' ? record.id : typeof record.id === 'number' ? String(record.id) : undefined;
        if(id === undefined || seen.has(id)){ id = `legacy-${hash.slice(0, 8)}-${index}`; }
        if(id !== record.id){
            renamed++;
            if(record.id !== undefined){ session.legacyId = record.id; }
        }
        session.id = id;
        seen.add(id);
        sessions.push({index, session});
    });
    return {sessions, quarantine, renamed};
}

/**
 * Inside the import transaction: writes the sessions not already present, quarantines what cannot be
 * a session, then reads everything back and compares it with the file. A difference throws, which
 * rolls the transaction back.
 * @param txn - the open transaction
 * @param plan - the planned sessions and quarantine
 * @param topLevelExtra - top level keys of the file other than meditationSessions
 * @param result - the result to fill in
 * @param options - merge or replace
 */
async function writeAndVerify(txn: TransactionHandle, plan: ReturnType<typeof planSessions>, topLevelExtra: Record<string, unknown>, result: ImportResult, options: ImportOptions){
    if(options.mode === 'replace'){
        await txn.execute('DELETE FROM session_media');
        await txn.execute('DELETE FROM session');
    }
    const existing = new Set((await txn.query('SELECT id FROM session')).map(r => String(r.id)));
    const bottom = await txn.query('SELECT MIN(seq) AS bottom FROM session');
    const base = existing.size ? Number(bottom[0].bottom) - plan.sessions.length - 1 : 0;
    const count = plan.sessions.length;
    const inserted: PlannedSession[] = [];
    const present: PlannedSession[] = [];
    for(const [position, planned] of plan.sessions.entries()){
        if(existing.has(planned.session.id as string)){ present.push(planned); continue; }
        await insertSession(txn, planned.session, base + (count - position));
        inserted.push(planned);
    }
    for(const q of plan.quarantine){
        await txn.execute('INSERT INTO legacy_quarantine (found_at_ms, source, reason, raw_json) VALUES (?1, ?2, ?3, ?4)',
            [Date.now(), `${result.sourcePath} ${result.sourceHash.slice(0, 16)} #${q.index}`, 'not a JSON object', q.raw]);
    }
    if(Object.keys(topLevelExtra).length){ await writeMeta(txn, `legacy_top_level_${result.sourceHash.slice(0, 16)}`, JSON.stringify(topLevelExtra)); }
    result.inserted = inserted.length;
    result.alreadyPresent = present.length;
    await verifyStored(txn, inserted, present, result, options);
    await rememberImportedHash(txn, result.sourceHash);
}

/**
 * Reads every session back and compares the inserted ones with the file. An id that was already
 * present is compared too, but a difference there only counts: the stored copy is kept.
 * @param txn - the open transaction
 * @param inserted - sessions this import wrote
 * @param present - sessions whose id was already stored
 * @param result - the result to fill in
 * @param options - holds the test hook that alters the read back
 */
async function verifyStored(txn: TransactionHandle, inserted: PlannedSession[], present: PlannedSession[], result: ImportResult, options: ImportOptions){
    const stored = new Map((await readAllSessions(txn)).map(s => [String(s.id), options.alterReadBack ? options.alterReadBack(s) : s]));
    const mismatches: string[] = [];
    for(const planned of inserted){
        const back = stored.get(planned.session.id as string);
        if(!back || canonicalSession(back) !== canonicalSession(planned.session)){ mismatches.push(String(planned.session.id)); }
    }
    for(const planned of present){
        const back = stored.get(planned.session.id as string);
        if(!back || canonicalSession(back) !== canonicalSession(planned.session)){ result.differentFromDatabase++; }
    }
    if(mismatches.length){ throw new VerifyMismatch(mismatches); }
}

/**
 * Adds a file hash to the list of imported hashes in meta.
 * @param txn - the open transaction
 * @param hash - the file's hash
 */
async function rememberImportedHash(txn: TransactionHandle, hash: string){
    const hashes = await importedHashes(txn);
    if(!hashes.includes(hash)){ hashes.push(hash); }
    await writeMeta(txn, IMPORTED_HASHES_KEY, JSON.stringify(hashes));
}

/**
 * The hashes of every legacy file already imported.
 * @param db - the database or a transaction
 */
export async function importedHashes(db: Pick<InillucentDb, 'query'> | TransactionHandle): Promise<string[]>{
    const value = await readMeta(db as Pick<InillucentDb, 'query'>, IMPORTED_HASHES_KEY);
    return value ? JSON.parse(value) as string[] : [];
}
