import path from 'path';
import {InillucentNative, NativeResult, SqlValue} from '../../services/storage/inillucentDb';

/**
 * The bridge's interface (NativeModules.Inillucent) implemented in Node over the real inillucent
 * engine, so jest tests run real SQL against a real database file. The `inillucent` npm package's
 * platform package ships the C library, which is also a Node addon.
 */

const OPEN_CREATE = 0x0001;

/** The addon's exports. */
interface Addon{
    open(path: string, flags: number): unknown,
    connect(db: unknown): unknown,
    query(conn: unknown, sql: string, params: SqlValue[], rowsAsArrays: boolean, readOnly: boolean): {columns: string[], rows: unknown[][], changes: number},
    batch(conn: unknown, sql: string): unknown,
    disconnect(conn: unknown): void,
    close(db: unknown): void,
}

let addon: Addon | undefined;

/** The platform package's C library for this machine. */
function libraryPath(): string{
    const pkg = {win32: 'cli-win32-x64', darwin: `cli-darwin-${process.arch}`, linux: `cli-linux-${process.arch}`}[process.platform as string];
    const file = {win32: 'inillucent_driver_capi.dll', darwin: 'libinillucent_driver_capi.dylib', linux: 'libinillucent_driver_capi.so'}[process.platform as string];
    const root = path.dirname(require.resolve(`@blackrainbowlabs/${pkg}/package.json`));
    return path.join(root, 'lib', file as string);
}

/** Loads the addon once per process. */
function loadAddon(): Addon{
    if(!addon){
        const module = {exports: {}} as {exports: Addon};
        process.dlopen(module, libraryPath());
        addon = module.exports;
    }
    return addon;
}

/**
 * Rejects the way the native module does: an Error with `code` set to the engine status.
 * @param why - what the addon threw
 */
function bridgeError(why: any): Error{
    const error = new Error(why?.message ?? String(why)) as Error & {code: string};
    error.code = String(why?.code ?? 'internal').toUpperCase();
    return error;
}

/** A Node implementation of the bridge. Each database id holds one database and one connection. */
export function createNodeInillucent(): InillucentNative & {openCount(): number}{
    const native = loadAddon();
    const open = new Map<number, {db: unknown, conn: unknown}>();
    let nextId = 1;
    const live = (id: number) => {
        const entry = open.get(id);
        if(!entry){ throw new Error(`database ${id} is not open`); }
        return entry;
    };
    const call = async <T>(work: () => T): Promise<T> => {
        try{ return work(); }catch(e){ throw bridgeError(e); }
    };
    return {
        version: async () => 'node-addon',
        open: (file: string) => call(() => {
            require('fs').mkdirSync(path.dirname(file), {recursive: true});
            const db = native.open(file, OPEN_CREATE);
            const id = nextId++;
            open.set(id, {db, conn: native.connect(db)});
            return id;
        }),
        execute: (id: number, sql: string, params: SqlValue[]) => call((): NativeResult => {
            const result = native.query(live(id).conn, sql, params, true, false);
            return {columns: result.columns, rows: result.rows, changes: result.changes};
        }),
        executeBatch: (id: number, sql: string) => call(() => { native.batch(live(id).conn, sql); return null; }),
        backupTo: (id: number, file: string) => call(() => {
            require('fs').mkdirSync(path.dirname(file), {recursive: true});
            native.query(live(id).conn, 'VACUUM INTO ?1', [file], true, false);
            return null;
        }),
        integrityCheck: (id: number) => call(() => { native.query(live(id).conn, 'PRAGMA integrity_check', [], true, false); return null; }),
        close: (id: number) => call(() => {
            const entry = open.get(id);
            if(entry){ open.delete(id); native.disconnect(entry.conn); native.close(entry.db); }
            return null;
        }),
        openCount: () => open.size,
    };
}
