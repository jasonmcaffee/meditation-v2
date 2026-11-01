import {NativeModules} from 'react-native';

/** A value the bridge binds: the types JSON and both native halves agree on. */
export type SqlValue = null | number | string | boolean;

/** What one statement produced, as the native module resolves it. */
export interface NativeResult{
    columns: string[],
    rows: unknown[][],
    changes: number | null, //rows changed, or null for a query
}

/** The native module's methods (modules/react-native-inillucent, Android and iOS). */
export interface InillucentNative{
    version(): Promise<string>,
    open(path: string, key: string | null): Promise<number>,
    execute(id: number, sql: string, params: SqlValue[]): Promise<NativeResult>,
    executeBatch(id: number, sql: string): Promise<null>,
    backupTo(id: number, path: string): Promise<null>,
    integrityCheck(id: number): Promise<null>,
    close(id: number): Promise<null>,
}

/** A row as a map from column name to value. */
export type Row = Record<string, unknown>;

/**
 * The native module, or undefined when the app was built without it (an old build, or a test).
 */
export function getNativeInillucent(): InillucentNative | undefined{
    return NativeModules.Inillucent as InillucentNative | undefined;
}

/**
 * One open inillucent database. Every call goes through one queue, so a transaction's statements
 * are never interleaved with a statement from somewhere else in the app.
 */
export class InillucentDb{
    private queue: Promise<unknown> = Promise.resolve();

    constructor(private native: InillucentNative, private id: number, readonly path: string) {}

    /**
     * Opens (and creates when absent) a database file.
     * @param native - the native module
     * @param path - the database file
     * @param key - an encryption key, or null for a plaintext file
     */
    static async open(native: InillucentNative, path: string, key: string | null = null){
        const id = await native.open(path, key);
        return new InillucentDb(native, id, path);
    }

    /**
     * Runs a query and resolves its rows as objects keyed by column name.
     * @param sql - the statement, with ?1, ?2 ... for parameters
     * @param params - the values for the parameters
     */
    query(sql: string, params: SqlValue[] = []): Promise<Row[]>{
        return this.enqueue(() => this.rawQuery(sql, params));
    }

    /**
     * Runs a statement for its effect and resolves the number of rows it changed.
     * @param sql - the statement
     * @param params - the values for the parameters
     */
    execute(sql: string, params: SqlValue[] = []): Promise<number>{
        return this.enqueue(() => this.rawExecute(sql, params));
    }

    /**
     * Runs several statements separated by semicolons.
     * @param sql - the statements
     */
    batch(sql: string): Promise<void>{
        return this.enqueue(async () => { await this.native.executeBatch(this.id, sql); });
    }

    /**
     * Runs work inside BEGIN ... COMMIT. A throw from the work rolls back and rethrows. Nothing
     * else runs on this database until the transaction ends.
     * @param work - receives a handle whose query/execute run inside the transaction
     */
    transaction<T>(work: (txn: TransactionHandle) => Promise<T>): Promise<T>{
        return this.enqueue(async () => {
            await this.native.execute(this.id, 'BEGIN', []);
            const txn: TransactionHandle = {
                query: (sql, params = []) => this.rawQuery(sql, params),
                execute: (sql, params = []) => this.rawExecute(sql, params),
            };
            try{
                const result = await work(txn);
                await this.native.execute(this.id, 'COMMIT', []);
                return result;
            }catch(e){
                await this.native.execute(this.id, 'ROLLBACK', []).catch(rollbackError => {
                    console.warn('[inillucentDb] rollback failed', rollbackError);
                });
                throw e;
            }
        });
    }

    /**
     * Copies the database to another file; the engine opens and checks the copy.
     * @param path - the copy's file
     */
    backupTo(path: string): Promise<void>{
        return this.enqueue(async () => { await this.native.backupTo(this.id, path); });
    }

    /** Reads every page and rejects with the first problem found. */
    integrityCheck(): Promise<void>{
        return this.enqueue(async () => { await this.native.integrityCheck(this.id); });
    }

    /** Closes the database. */
    close(): Promise<void>{
        return this.enqueue(async () => { await this.native.close(this.id); });
    }

    /**
     * Runs one statement now, outside the queue, and maps its rows to objects.
     * @param sql - the statement
     * @param params - the values
     */
    private async rawQuery(sql: string, params: SqlValue[]): Promise<Row[]>{
        const result = await this.native.execute(this.id, sql, params);
        return result.rows.map(cells => {
            const row: Row = {};
            result.columns.forEach((name, i) => { row[name] = cells[i]; });
            return row;
        });
    }

    /**
     * Runs one statement now, outside the queue, and resolves the rows it changed.
     * @param sql - the statement
     * @param params - the values
     */
    private async rawExecute(sql: string, params: SqlValue[]): Promise<number>{
        const result = await this.native.execute(this.id, sql, params);
        return result.changes ?? 0;
    }

    /**
     * Runs work after everything queued before it, and keeps the queue going if it fails.
     * @param work - the call to make
     */
    private enqueue<T>(work: () => Promise<T>): Promise<T>{
        const next = this.queue.then(work, work);
        this.queue = next.catch(() => undefined);
        return next;
    }
}

/** The statements a transaction's work can run. */
export interface TransactionHandle{
    query(sql: string, params?: SqlValue[]): Promise<Row[]>,
    execute(sql: string, params?: SqlValue[]): Promise<number>,
}
