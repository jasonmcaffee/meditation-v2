/**
 * Storage tests against the real inillucent engine (its C library loaded into Node as an addon) and
 * real files in a temporary documents folder. They cover the conversion of sessions.txt, the
 * repository, and the Data screen actions.
 */
import fs from 'fs';
import {NativeModules, Share} from 'react-native';
import {createNodeInillucent} from '../support/nodeInillucent';
import {bootstrapStorage} from '../../services/storage/storageBootstrap';
import {importLegacyFile} from '../../services/storage/legacyMigration';
import {InillucentDb} from '../../services/storage/inillucentDb';
import {applySchema} from '../../repository/sessionSchema';
import {canonicalSession} from '../../repository/sessionRows';
import {BACKUP_DIR, DATABASE_PATH, LEGACY_SESSIONS_PATH, STORAGE_REPORT_PATH} from '../../services/storage/storagePaths';
import meditationSessionRepository from '../../repository/meditationSessionRepository';
import {importBackup, switchToInillucent, switchToJson, exportSessions} from '../../services/storage/storageActions';
import IMeditationSession from '../../models/IMeditationSession';

jest.mock('react-native-fs', () => require('../support/fakeRnfs').createFakeRnfs());
jest.mock('../../services/mediaService', () => ({__esModule: true, default: {deleteMedia: jest.fn(() => Promise.resolve())}}));

const RNFS = require('react-native-fs');
const {realisticSessions, awkwardSessions, legacyFileText} = require('../../../e2e/fixtures/legacySessions');

let native: ReturnType<typeof createNodeInillucent>;

beforeEach(async () => {
    await meditationSessionRepository['active']?.then(a => a.db?.close()).catch(() => undefined);
    (meditationSessionRepository as any).active = undefined;
    RNFS.__reset();
    native = createNodeInillucent();
    (NativeModules as any).Inillucent = native;
});

afterAll(async () => {
    await meditationSessionRepository['active']?.then(a => a.db?.close()).catch(() => undefined);
    RNFS.__dispose();
});

/**
 * Writes a legacy sessions.txt.
 * @param sessions - the sessions, newest first
 */
function seedLegacy(sessions: unknown[]){
    fs.writeFileSync(LEGACY_SESSIONS_PATH, legacyFileText(sessions), 'utf8');
}

/** The files in the backup folder. */
function backups(){
    return fs.existsSync(BACKUP_DIR) ? fs.readdirSync(BACKUP_DIR) : [];
}

/**
 * Canonical forms of sessions, for comparing lists.
 * @param sessions - the sessions
 */
function canon(sessions: unknown[]){
    return sessions.map(s => canonicalSession(s as any));
}

describe('converting sessions.txt on the first launch', () => {
    it('converts a realistic history field for field, keeps the order, and moves the file into the backup folder', async () => {
        const legacy = realisticSessions(40);
        seedLegacy(legacy);
        const originalText = fs.readFileSync(LEGACY_SESSIONS_PATH, 'utf8');

        const active = await bootstrapStorage(native);

        expect(active.report.mode).toBe('inillucent');
        expect(active.report.legacyImport).toMatchObject({outcome: 'ok', sessionsInFile: 40, inserted: 40, quarantined: 0, renamedIds: 0});
        expect(canon(await active.store.getMeditationSessions())).toEqual(canon(legacy));
        expect(fs.existsSync(LEGACY_SESSIONS_PATH)).toBe(false);
        const kept = backups().filter(f => f.startsWith('sessions-'));
        expect(kept).toHaveLength(1);
        expect(fs.readFileSync(`${BACKUP_DIR}/${kept[0]}`, 'utf8')).toBe(originalText);
        expect(JSON.parse(fs.readFileSync(STORAGE_REPORT_PATH, 'utf8'))).toMatchObject({mode: 'inillucent', sessionCount: 40, legacyFilePresent: false});
    });

    it('keeps every field of awkward records and quarantines records that are not objects', async () => {
        const legacy = awkwardSessions();
        seedLegacy(legacy);

        const active = await bootstrapStorage(native);
        const stored = await active.store.getMeditationSessions() as unknown as Record<string, unknown>[];

        expect(active.report.legacyImport).toMatchObject({outcome: 'ok', sessionsInFile: 20, inserted: 17, quarantined: 3, renamedIds: 3});
        expect(active.report.quarantined).toBe(3);
        const objects = legacy.filter((r: unknown) => r !== null && typeof r === 'object' && !Array.isArray(r));
        expect(stored).toHaveLength(objects.length);
        const odd = stored.find(s => s.id === 'odd-types');
        expect(odd).toEqual({id: 'odd-types', dateMs: '1672650000000', durationMs: 600000, notes: null, rating: '5', mood: 'happy'});
        const duplicate = stored.find(s => s.notes === 'duplicate id');
        expect(duplicate?.legacyId).toBe(legacy[0].id);
        expect(duplicate?.id).not.toBe(legacy[0].id);
        expect(stored.find(s => s.notes === 'no id at all')?.id).toMatch(/^legacy-/);
        expect(stored.find(s => s.notes === 'numeric id')).toMatchObject({id: '1670000000000', legacyId: 1670000000000});
        expect(stored.find(s => s.id === 'media-odd')).toEqual(legacy.find((r: any) => r?.id === 'media-odd'));
        const quarantine = await active.db!.query('SELECT raw_json FROM legacy_quarantine ORDER BY id');
        expect(quarantine.map(r => r.raw_json)).toEqual(['null', '"a string where a session should be"', '[1,2,3]']);
    });

    it('changes nothing on the next launch', async () => {
        seedLegacy(realisticSessions(10));
        const first = await bootstrapStorage(native);
        const before = canon(await first.store.getMeditationSessions());
        await first.db!.close();

        const second = await bootstrapStorage(native);

        expect(second.report.legacyImport).toBeUndefined();
        expect(canon(await second.store.getMeditationSessions())).toEqual(before);
    });

    it('finishes a conversion that crashed between the commit and the move without importing twice', async () => {
        seedLegacy(realisticSessions(10));
        const first = await bootstrapStorage(native);
        await first.db!.close();
        const backup = backups().find(f => f.startsWith('sessions-'))!;
        fs.copyFileSync(`${BACKUP_DIR}/${backup}`, LEGACY_SESSIONS_PATH);

        const second = await bootstrapStorage(native);

        expect(second.report.legacyImport).toMatchObject({outcome: 'skipped', reason: 'already-imported'});
        expect(await second.store.getMeditationSessions()).toHaveLength(10);
        expect(fs.existsSync(LEGACY_SESSIONS_PATH)).toBe(false);
    });

    it('keeps an unreadable file in place, copies it, and still lets the app save', async () => {
        fs.writeFileSync(LEGACY_SESSIONS_PATH, '{"meditationSessions": [{"id": "1", "notes": "trunc', 'utf8');

        const active = await bootstrapStorage(native);

        expect(active.report.mode).toBe('inillucent');
        expect(active.report.legacyImport).toMatchObject({outcome: 'failed', reason: 'unreadable'});
        expect(fs.existsSync(LEGACY_SESSIONS_PATH)).toBe(true);
        expect(backups().filter(f => f.startsWith('sessions-'))).toHaveLength(1);
        await active.store.saveMeditationSession({id: 'new', dateMs: 1, durationMs: 2, notes: 'after', rating: 5});
        expect(await active.store.getMeditationSessions()).toHaveLength(1);
    });

    it('rolls the whole conversion back when a stored session differs from the file', async () => {
        seedLegacy(realisticSessions(8));
        const db = await InillucentDb.open(native, DATABASE_PATH);
        await applySchema(db);

        const result = await importLegacyFile(db, LEGACY_SESSIONS_PATH, {
            kind: 'legacy-import', mode: 'merge',
            alterReadBack: s => s.id === realisticSessions(8)[3].id ? {...s, notes: 'changed'} : s,
        });

        expect(result).toMatchObject({outcome: 'failed', reason: 'verify-mismatch', mismatches: [realisticSessions(8)[3].id]});
        expect(await db.query('SELECT COUNT(*) AS n FROM session')).toEqual([{n: 0}]);
        expect(await db.query("SELECT outcome FROM migration_log WHERE kind = 'legacy-import'")).toEqual([{outcome: 'failed'}]);
        expect(fs.existsSync(LEGACY_SESSIONS_PATH)).toBe(true);
    });

    it('runs on the JSON file, with every session, when the database rejects the conversion', async () => {
        const legacy = realisticSessions(6);
        seedLegacy(legacy);
        const failing = {...native, execute: (id: number, sql: string, params: any[]) =>
            sql.startsWith('INSERT INTO session ') ? Promise.reject(Object.assign(new Error('disk full'), {code: 'FULL'})) : native.execute(id, sql, params)};

        const active = await bootstrapStorage(failing);

        expect(active.report).toMatchObject({mode: 'json', jsonReason: 'import-failed', sessionCount: 6});
        expect(canon(await active.store.getMeditationSessions())).toEqual(canon(legacy));
        expect(fs.existsSync(LEGACY_SESSIONS_PATH)).toBe(true);
    });

    it('runs on the JSON file when the app was built without the native module', async () => {
        seedLegacy(realisticSessions(3));

        (NativeModules as any).Inillucent = undefined;

        const active = await bootstrapStorage();

        expect(active.report).toMatchObject({mode: 'json', jsonReason: 'no-native-module', sessionCount: 3});
    });
});

describe('the inillucent sessions store', () => {
    it('saves new sessions at the top and deletes them with their media rows', async () => {
        seedLegacy(realisticSessions(3));
        const active = await bootstrapStorage(native);
        const session: IMeditationSession = {id: 'fresh', dateMs: Date.now(), durationMs: 900000, notes: 'new 🙂', rating: 4.5,
            media: [{fileName: 'a.jpg', type: 'photo'}, {fileName: 'b.m4a', type: 'audio'}]};

        await active.store.saveMeditationSession(session);
        const afterSave = await active.store.getMeditationSessions();
        expect(afterSave).toHaveLength(4);
        expect(canonicalSession(afterSave[0])).toBe(canonicalSession(session));

        await active.store.deleteMeditationSession(afterSave[0]);
        expect((await active.store.getMeditationSessions()).map(s => s.id)).not.toContain('fresh');
        expect(await active.db!.query("SELECT COUNT(*) AS n FROM session_media WHERE session_id = 'fresh'")).toEqual([{n: 0}]);
    });
});

describe('the Data screen actions', () => {
    it('re-imports a backup to bring back a deleted session without duplicating the rest', async () => {
        const legacy = realisticSessions(5);
        seedLegacy(legacy);
        const active = await meditationSessionRepository.start();
        await meditationSessionRepository.deleteMeditationSession(legacy[2]);
        expect(await meditationSessionRepository.getMeditationSessions()).toHaveLength(4);
        const backup = backups().find(f => f.startsWith('sessions-'))!;

        const result = await importBackup(`${BACKUP_DIR}/${backup}`);

        expect(result).toMatchObject({outcome: 'ok', inserted: 1, alreadyPresent: 4, differentFromDatabase: 0});
        expect((await active.store.getMeditationSessions()).map(s => s.id).sort()).toEqual(legacy.map((s: any) => s.id).sort());
    });

    it('switches to the JSON file and back without losing a session', async () => {
        seedLegacy(realisticSessions(5));
        await meditationSessionRepository.start();

        const onJson = await switchToJson();
        expect(onJson).toMatchObject({mode: 'json', jsonReason: 'chosen', sessionCount: 5});
        await meditationSessionRepository.saveMeditationSession({id: 'while-on-json', dateMs: 5, durationMs: 6, notes: 'json', rating: 3});
        const onJsonList = await meditationSessionRepository.getMeditationSessions();
        await meditationSessionRepository.deleteMeditationSession(onJsonList[3]);
        const expected = canon(await meditationSessionRepository.getMeditationSessions());
        expect(backups().some(f => f.endsWith('.rdb'))).toBe(true);

        const back = await switchToInillucent();

        expect(back).toMatchObject({mode: 'inillucent', sessionCount: 5, legacyImport: {kind: 'replace-from-json', outcome: 'ok'}});
        expect(canon(await meditationSessionRepository.getMeditationSessions())).toEqual(expected);
        expect(fs.existsSync(LEGACY_SESSIONS_PATH)).toBe(false);
    });

    it('exports every session in the old file format', async () => {
        const legacy = realisticSessions(4);
        seedLegacy(legacy);
        await meditationSessionRepository.start();
        const share = jest.spyOn(Share, 'share').mockResolvedValue({action: 'sharedAction'} as any);

        await exportSessions();

        const message = JSON.parse((share.mock.calls[0][0] as any).message);
        expect(canon(message.meditationSessions)).toEqual(canon(legacy));
    });
});
