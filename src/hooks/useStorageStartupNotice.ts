import {useEffect} from "react";
import {Alert} from "react-native";
import meditationSessionRepository from "../repository/meditationSessionRepository";
import {StorageReport} from "../services/storage/storageBootstrap";

/**
 * Starts the storage bootstrap when the app starts, and when this launch's storage has a problem the
 * person should know about, shows an alert that can open the Data screen.
 * @param onDetails - opens the Data screen
 */
export function useStorageStartupNotice(onDetails: () => void){
    useEffect(() => {
        meditationSessionRepository.start().then(active => {
            const problem = describeStartupProblem(active.report);
            if(!problem){ return; }
            Alert.alert('Your sessions', problem, [
                {text: 'Later', style: 'cancel'},
                {text: 'Details', onPress: onDetails},
            ]);
        }).catch(e => {
            Alert.alert('Your sessions', `Your sessions could not be loaded: ${e?.message ?? e}`);
        });
    }, []);
}

/**
 * A sentence about this launch's storage problem, or undefined when there is none.
 * @param report - what the bootstrap did
 */
export function describeStartupProblem(report: StorageReport): string | undefined{
    if(report.mode === 'json' && report.jsonReason !== 'chosen'){
        return 'The new database could not be used, so your sessions are still kept in sessions.txt and nothing was changed.';
    }
    const legacy = report.legacyImport;
    if(legacy?.outcome === 'failed'){
        return 'Your saved sessions file could not be converted. It has not been changed, and a copy has been kept.';
    }
    if(legacy?.outcome === 'ok' && legacy.quarantined > 0){
        return `${legacy.quarantined} records in your sessions file were not sessions. They were set aside with their original text.`;
    }
    return undefined;
}
