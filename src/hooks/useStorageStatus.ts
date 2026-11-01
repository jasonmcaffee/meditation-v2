import {useCallback, useEffect, useState} from "react";
import {
    exportSessions, getStorageStatus, importBackup, retryConversion, shareFile, StorageStatus, switchToInillucent,
    switchToJson,
} from "../services/storage/storageActions";
import {LEGACY_SESSIONS_PATH} from "../services/storage/storagePaths";

/** The Data screen's state: the storage status, whether an action is running, and its outcome. */
export interface StorageStatusState{
    status?: StorageStatus,
    busy: boolean,
    message?: string,
    error?: string,
    retry: () => Promise<void>,
    reimport: (path: string) => Promise<void>,
    share: (path: string, title: string) => Promise<void>,
    shareLegacyFile: () => Promise<void>,
    exportAll: () => Promise<void>,
    useJson: () => Promise<void>,
    useInillucent: () => Promise<void>,
}

/**
 * Loads the storage status for the Data screen and runs its actions, one at a time, reloading the
 * status after each.
 */
export function useStorageStatus(): StorageStatusState{
    const [status, setStatus] = useState<StorageStatus>();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string>();
    const [error, setError] = useState<string>();

    const reload = useCallback(async () => setStatus(await getStorageStatus()), []);
    useEffect(() => { reload().catch(e => setError(String(e?.message ?? e))); }, [reload]);

    const run = useCallback(async (work: () => Promise<string | undefined>) => {
        setBusy(true);
        setError(undefined);
        setMessage(undefined);
        try{
            setMessage(await work());
        }catch(e: any){
            setError(String(e?.message ?? e));
        }finally{
            await reload().catch(() => undefined);
            setBusy(false);
        }
    }, [reload]);

    return {
        status, busy, message, error,
        retry: () => run(async () => describeReport((await retryConversion()).legacyImport?.outcome)),
        reimport: path => run(async () => {
            const result = await importBackup(path);
            return result.outcome === 'ok' ? `Added ${result.inserted} sessions; ${result.alreadyPresent} were already here.` : `The import failed: ${result.error}`;
        }),
        share: (path, title) => run(async () => { await shareFile(path, title); return undefined; }),
        shareLegacyFile: () => run(async () => { await shareFile(LEGACY_SESSIONS_PATH, 'sessions.txt'); return undefined; }),
        exportAll: () => run(async () => { await exportSessions(); return undefined; }),
        useJson: () => run(async () => { await switchToJson(); return 'The app now keeps your sessions in sessions.txt.'; }),
        useInillucent: () => run(async () => {
            const report = await switchToInillucent();
            return report.mode === 'inillucent' ? 'The app now keeps your sessions in the database.' : `Still on sessions.txt: ${report.error}`;
        }),
    };
}

/**
 * The message after a retried conversion.
 * @param outcome - the import's outcome, or undefined when there was no file to convert
 */
function describeReport(outcome?: string){
    if(outcome === undefined){ return 'There was no sessions.txt to convert.'; }
    return outcome === 'failed' ? 'The conversion failed again; your file is unchanged.' : 'The conversion finished.';
}
