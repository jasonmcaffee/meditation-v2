import IMeditationSession, {getSessionMedia} from "../models/IMeditationSession";
import {InillucentDb, TransactionHandle} from "../services/storage/inillucentDb";
import appEventBus from "../services/appEventBus";
import mediaService from "../services/mediaService";
import {
    assembleSessions, INSERT_MEDIA_SQL, INSERT_SESSION_SQL, mediaParams, SELECT_MEDIA_SQL,
    SELECT_SESSIONS_SQL, SessionJson, sessionParams, sessionToRows,
} from "./sessionRows";

/** The methods every sessions store has, whichever storage is behind it. */
export interface SessionStore{
    getMeditationSessions(startDateMs?: number, limit?: number): Promise<IMeditationSession[]>,
    saveMeditationSession(meditationSession: IMeditationSession): Promise<void>,
    deleteMeditationSession(meditationSession: IMeditationSession): Promise<void>,
    deleteAll(): Promise<void>,
}

/**
 * Every session in the database, newest first.
 * @param db - the database, or an open transaction
 */
export async function readAllSessions(db: Pick<InillucentDb, 'query'> | TransactionHandle): Promise<IMeditationSession[]>{
    const sessionRows = await db.query(SELECT_SESSIONS_SQL);
    const mediaRows = await db.query(SELECT_MEDIA_SQL);
    return assembleSessions(sessionRows, mediaRows);
}

/**
 * Inserts a session and its media rows.
 * @param txn - an open transaction
 * @param session - the session; its id must be a string not already in the table
 * @param seq - its list position: higher is newer
 */
export async function insertSession(txn: TransactionHandle, session: SessionJson, seq: number){
    const rows = sessionToRows(session, seq);
    await txn.execute(INSERT_SESSION_SQL, sessionParams(rows.session));
    for(const media of rows.media){ await txn.execute(INSERT_MEDIA_SQL, mediaParams(media)); }
}

/**
 * The sessions store on the inillucent database. Each change is one transaction, and after each
 * change the new list is announced on appEventBus, as the JSON store does.
 */
export class InillucentSessionRepository implements SessionStore{
    constructor(private db: InillucentDb) {}

    /**
     * Sessions newest first; with startDateMs, only those that started at or after it, up to limit.
     * @param startDateMs - the earliest start time to include
     * @param limit - how many to return
     */
    async getMeditationSessions(startDateMs?: number, limit?: number): Promise<IMeditationSession[]>{
        const started = Date.now();
        const sessions = await readAllSessions(this.db);
        console.log(`[inillucent] read ${sessions.length} sessions in ${Date.now() - started} ms`);
        if(startDateMs == undefined){ return sessions; }
        return sessions.filter(s => s.dateMs >= startDateMs).slice(0, limit);
    }

    /**
     * Saves a new session at the top of the list. Saving a session whose id exists replaces it.
     * @param meditationSession - the session
     */
    async saveMeditationSession(meditationSession: IMeditationSession){
        await this.db.transaction(async txn => {
            const id = String(meditationSession.id);
            const top = await txn.query('SELECT MAX(seq) AS top FROM session');
            const seq = Number(top[0]?.top ?? 0) + 1;
            await txn.execute('DELETE FROM session_media WHERE session_id = ?1', [id]);
            await txn.execute('DELETE FROM session WHERE id = ?1', [id]);
            await insertSession(txn, {...meditationSession, id} as unknown as SessionJson, seq);
        });
        await this.announce();
    }

    /**
     * Deletes a session's media files, then its rows.
     * @param meditationSession - the session
     */
    async deleteMeditationSession(meditationSession: IMeditationSession){
        const id = String(meditationSession.id);
        const exists = await this.db.query('SELECT id FROM session WHERE id = ?1', [id]);
        if(!exists.length){ return console.log(`no meditation session exists.`); }
        const media = getSessionMedia(meditationSession);
        if(media.length){ await mediaService.deleteMedia(media); }
        await this.db.transaction(async txn => {
            await txn.execute('DELETE FROM session_media WHERE session_id = ?1', [id]);
            await txn.execute('DELETE FROM session WHERE id = ?1', [id]);
        });
        await this.announce();
    }

    /** Deletes every session row. Media files are left alone, as the JSON store leaves them. */
    async deleteAll(){
        await this.db.transaction(async txn => {
            await txn.execute('DELETE FROM session_media');
            await txn.execute('DELETE FROM session');
        });
        await this.announce();
    }

    /** Reads the list and announces it, so the Sessions page redraws. */
    private async announce(){
        const sessions = await readAllSessions(this.db);
        appEventBus.meditationSessionRepository.meditationSessionsChanged().set(sessions);
    }
}
