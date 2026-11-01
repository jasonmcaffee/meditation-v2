import React from "react";
import {ActivityIndicator, ScrollView, Text} from "react-native";
// @ts-ignore
import * as styles from "../../style/components/data-page/data-modal.scss";
import Modal from "../../common-components/Modal";
import Div from "../../common-components/Div";
import Button from "../../common-components/Button";
import {StorageStatusState, useStorageStatus} from "../../hooks/useStorageStatus";
import {StorageReport} from "../../services/storage/storageBootstrap";
import {MigrationLogEntry, StorageStatus} from "../../services/storage/storageActions";

type Props = {
    onCloseClick: () => void,
};

/**
 * The Data screen: where the sessions are stored, what the conversion from sessions.txt did, and the
 * ways out when something went wrong (retry, re-import a backup, share, export, switch storage).
 */
function DataModal({onCloseClick}: Props){
    const state = useStorageStatus();
    const status = state.status;
    return <Modal onCloseClick={onCloseClick} windowClassName={styles.window}>
        <ScrollView testID="data-modal" contentContainerStyle={styles.content}>
            <Text style={styles.title}>Your data</Text>
            {status ? <StatusCard status={status}/> : <ActivityIndicator color="#ffffff"/>}
            {status ? <Warnings report={status.report}/> : null}
            {state.busy ? <ActivityIndicator color="#ffffff" style={styles.busy}/> : null}
            {state.message ? <Text testID="data-message" style={styles.message}>{state.message}</Text> : null}
            {state.error ? <Text testID="data-error" style={styles.error}>{state.error}</Text> : null}
            {status ? <Actions status={status} state={state}/> : null}
            {status ? <Backups status={status} state={state}/> : null}
        </ScrollView>
    </Modal>;
}

/**
 * One label and value line.
 * @param label - what the value is
 * @param value - the value
 * @param testID - for the device tests
 */
function Line({label, value, testID}: {label: string, value: string, testID?: string}){
    return <Div className={styles.line}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} testID={testID}>{value}</Text>
    </Div>;
}

/**
 * Where the sessions are and what the last conversion did.
 * @param status - the storage status
 */
function StatusCard({status}: {status: StorageStatus}){
    const report = status.report;
    const converted = lastConversion(status.log);
    return <Div className={styles.card}>
        <Line label="Stored in" value={report.mode === 'inillucent' ? 'inillucent database' : 'sessions.txt (JSON file)'} testID="data-storage-mode"/>
        {report.engineVersion ? <Line label="Engine" value={`inillucent ${report.engineVersion}`}/> : null}
        <Line label="Sessions" value={String(report.sessionCount)} testID="data-session-count"/>
        <Line label="Converted from sessions.txt" value={converted} testID="data-conversion"/>
        {report.quarantined ? <Line label="Set aside" value={`${report.quarantined} records`}/> : null}
    </Div>;
}

/**
 * The newest successful conversion, as a sentence.
 * @param log - the newest migration log rows
 */
function lastConversion(log: MigrationLogEntry[]){
    const entry = log.find(l => (l.kind === 'legacy-import' || l.kind === 'replace-from-json') && l.outcome === 'ok');
    if(!entry){ return 'not yet'; }
    const when = new Date(entry.atMs).toLocaleString();
    return `${when}: ${entry.detail.inserted} sessions`;
}

/**
 * Plain explanations of anything that went wrong.
 * @param report - the storage report
 */
function Warnings({report}: {report: StorageReport}){
    const lines: string[] = [];
    if(report.mode === 'json' && report.jsonReason !== 'chosen'){
        lines.push(`The database could not be used (${report.jsonReason}${report.error ? `: ${report.error}` : ''}). Your sessions are kept in sessions.txt, as before, and nothing was changed.`);
    }
    const legacy = report.legacyImport;
    if(legacy?.outcome === 'failed' && report.mode === 'inillucent'){
        lines.push(`sessions.txt could not be converted (${legacy.reason}: ${legacy.error}). It has not been changed, and a copy is in the backup list below.`);
    }
    if(report.quarantined){
        lines.push(`${report.quarantined} records in sessions.txt were not sessions. They were set aside with their original text, and nothing else was affected.`);
    }
    if(!lines.length){ return null; }
    return <Div className={styles.warning} testID="data-warning">
        {lines.map(line => <Text key={line} style={styles.warningText}>{line}</Text>)}
    </Div>;
}

/**
 * A small button.
 * @param text - the label
 * @param onClick - what it does
 * @param testID - for the device tests
 */
function SmallButton({text, onClick, testID}: {text: string, onClick: () => void, testID?: string}){
    return <Button style2 className={styles.smallButton} onClick={onClick} testID={testID}>
        <Text style={styles.smallButtonText}>{text}</Text>
    </Button>;
}

/**
 * The actions that apply to the storage in use.
 * @param status - the storage status
 * @param state - the hook's actions
 */
function Actions({status, state}: {status: StorageStatus, state: StorageStatusState}){
    const report = status.report;
    const onDatabase = report.mode === 'inillucent';
    return <Div className={styles.actions}>
        {onDatabase && report.legacyFilePresent ? <SmallButton text="Retry conversion" onClick={state.retry} testID="data-retry-button"/> : null}
        {report.legacyFilePresent ? <SmallButton text="Share sessions.txt" onClick={state.shareLegacyFile} testID="data-share-legacy-button"/> : null}
        <SmallButton text="Export sessions" onClick={state.exportAll} testID="data-export-button"/>
        {onDatabase
            ? <SmallButton text="Use sessions.txt instead" onClick={state.useJson} testID="data-use-json-button"/>
            : <SmallButton text="Use the database" onClick={state.useInillucent} testID="data-use-inillucent-button"/>}
    </Div>;
}

/**
 * The files in the backup folder, each with share and (for session files, on the database) re-import.
 * @param status - the storage status
 * @param state - the hook's actions
 */
function Backups({status, state}: {status: StorageStatus, state: StorageStatusState}){
    if(!status.backups.length){ return null; }
    return <Div className={styles.card}>
        <Text style={styles.heading}>Backups</Text>
        {status.backups.map(file => <Div key={file.path} className={styles.backup}>
            <Text style={styles.backupName}>{file.name}</Text>
            <Text style={styles.label}>{`${new Date(file.mtimeMs).toLocaleString()} · ${Math.ceil(file.size / 1024)} KB`}</Text>
            <Div className={styles.backupActions}>
                {file.name.endsWith('.json') ? <SmallButton text="Share" onClick={() => state.share(file.path, file.name)}/> : null}
                {file.name.endsWith('.json') && status.report.mode === 'inillucent'
                    ? <SmallButton text="Re-import" onClick={() => state.reimport(file.path)} testID={`data-reimport-${file.name}`}/>
                    : null}
            </Div>
        </Div>)}
    </Div>;
}

export default DataModal;
