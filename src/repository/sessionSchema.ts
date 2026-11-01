import {InillucentDb} from "../services/storage/inillucentDb";

/**
 * The database's schema, as numbered steps. A database records the last step it ran in
 * `meta.schema_version`; opening one runs every later step in one transaction. A new step is added at
 * the end and never edited once it has shipped.
 */
const SCHEMA_STEPS: string[][] = [
    // 1: task-2445, the first inillucent schema.
    [
        `CREATE TABLE session (
            id TEXT PRIMARY KEY,
            seq INTEGER NOT NULL,
            date_ms INTEGER,
            duration_ms INTEGER,
            notes TEXT,
            rating REAL,
            extra_json TEXT
        )`,
        'CREATE INDEX session_seq ON session (seq)',
        `CREATE TABLE session_media (
            session_id TEXT NOT NULL,
            list TEXT NOT NULL,
            position INTEGER NOT NULL,
            file_name TEXT,
            media_type TEXT,
            legacy INTEGER,
            extra_json TEXT,
            PRIMARY KEY (session_id, list, position)
        )`,
        `CREATE TABLE legacy_quarantine (
            id INTEGER PRIMARY KEY,
            found_at_ms INTEGER NOT NULL,
            source TEXT NOT NULL,
            reason TEXT NOT NULL,
            raw_json TEXT NOT NULL
        )`,
        `CREATE TABLE migration_log (
            id INTEGER PRIMARY KEY,
            at_ms INTEGER NOT NULL,
            kind TEXT NOT NULL,
            outcome TEXT NOT NULL,
            detail TEXT NOT NULL
        )`,
    ],
];

/** The schema version this build of the app writes. */
export const SCHEMA_VERSION = SCHEMA_STEPS.length;

/**
 * Brings a database up to SCHEMA_VERSION and resolves the version it was at before.
 * @param db - the open database
 */
export async function applySchema(db: InillucentDb): Promise<number>{
    await db.execute('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    const rows = await db.query("SELECT value FROM meta WHERE key = 'schema_version'");
    const current = rows.length ? Number(rows[0].value) : 0;
    if(current > SCHEMA_VERSION){
        throw new Error(`the database is at schema version ${current}, newer than this app's ${SCHEMA_VERSION}`);
    }
    if(current === SCHEMA_VERSION){ return current; }
    await db.transaction(async txn => {
        for(const step of SCHEMA_STEPS.slice(current)){
            for(const statement of step){ await txn.execute(statement); }
        }
        await txn.execute("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?1)", [String(SCHEMA_VERSION)]);
    });
    return current;
}

/**
 * Reads one value from the meta table.
 * @param db - the open database
 * @param key - the key
 */
export async function readMeta(db: Pick<InillucentDb, 'query'>, key: string): Promise<string | undefined>{
    const rows = await db.query('SELECT value FROM meta WHERE key = ?1', [key]);
    return rows.length ? String(rows[0].value) : undefined;
}

/**
 * Writes one value to the meta table.
 * @param db - the open database, or a transaction
 * @param key - the key
 * @param value - the value
 */
export async function writeMeta(db: Pick<InillucentDb, 'execute'>, key: string, value: string){
    await db.execute('INSERT OR REPLACE INTO meta (key, value) VALUES (?1, ?2)', [key, value]);
}

/**
 * Appends a row to the migration log.
 * @param db - the open database, or a transaction
 * @param kind - what ran: 'legacy-import', 'switch-to-json', ...
 * @param outcome - 'ok', 'failed', 'skipped'
 * @param detail - a JSON object with the counts and any error
 */
export async function logMigration(db: Pick<InillucentDb, 'execute'>, kind: string, outcome: string, detail: Record<string, unknown>){
    await db.execute('INSERT INTO migration_log (at_ms, kind, outcome, detail) VALUES (?1, ?2, ?3, ?4)', [Date.now(), kind, outcome, JSON.stringify(detail)]);
}
