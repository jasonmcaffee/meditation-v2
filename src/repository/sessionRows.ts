import IMeditationSession from "../models/IMeditationSession";
import {Row, SqlValue} from "../services/storage/inillucentDb";

/**
 * How a session is held in the database: one `session` row and one `session_media` row for each
 * entry of its `media` and `photos` lists.
 *
 * Every field survives the trip. A known field whose JSON type matches its column goes in the
 * column; any other field, or a known field with an unexpected type, goes in `extra_json` and is put
 * back on read. A `media` or `photos` value that is not a well formed list is kept whole in
 * `extra_json` rather than split into rows.
 */

/** A session as plain JSON: the IMeditationSession fields plus anything an older version wrote. */
export type SessionJson = Record<string, unknown>;

/** The values for one `session` row, in column order. */
export interface SessionRowValues{
    id: string,
    seq: number,
    dateMs: number | null,
    durationMs: number | null,
    notes: string | null,
    rating: number | null,
    extraJson: string | null,
}

/** The values for one `session_media` row. */
export interface MediaRowValues{
    sessionId: string,
    list: 'media' | 'photos',
    position: number,
    fileName: string | null,
    mediaType: string | null,
    legacy: number | null,
    extraJson: string | null,
}

const NUMBER_COLUMNS = {dateMs: 'date_ms', durationMs: 'duration_ms', rating: 'rating'} as const;
const KNOWN_FIELDS = new Set(['id', 'dateMs', 'durationMs', 'notes', 'rating', 'media', 'photos']);

/**
 * Whether a value is a finite JSON number.
 * @param value - the value
 */
function isNumber(value: unknown): value is number{
    return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Whether a value is a plain JSON object (not an array, not null).
 * @param value - the value
 */
export function isPlainObject(value: unknown): value is Record<string, unknown>{
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Splits a session into its `session` row and its media rows.
 * @param session - the session; its `id` must already be a string
 * @param seq - the list position: higher is newer
 */
export function sessionToRows(session: SessionJson, seq: number): {session: SessionRowValues, media: MediaRowValues[]}{
    const id = session.id as string;
    const extra: Record<string, unknown> = {};
    for(const key of Object.keys(session)){
        if(!KNOWN_FIELDS.has(key)){ extra[key] = session[key]; }
    }
    const numberColumn = (key: keyof typeof NUMBER_COLUMNS) => {
        const value = session[key];
        if(value === undefined || isNumber(value)){ return (value as number | undefined) ?? null; }
        extra[key] = value;
        return null;
    };
    const dateMs = numberColumn('dateMs');
    const durationMs = numberColumn('durationMs');
    const rating = numberColumn('rating');
    let notes: string | null = null;
    if(typeof session.notes === 'string'){ notes = session.notes; }
    else if(session.notes !== undefined){ extra.notes = session.notes; }
    const media = mediaListToRows(id, 'media', session.media, extra);
    const photos = photoListToRows(id, session.photos, extra);
    const extraJson = Object.keys(extra).length ? JSON.stringify(extra) : null;
    return {session: {id, seq, dateMs, durationMs, notes, rating, extraJson}, media: [...media, ...photos]};
}

/**
 * The rows for a `media` list, or none with the value kept in `extra` when it is not a list.
 * @param sessionId - the session
 * @param list - the list's name
 * @param value - the session's `media` value
 * @param extra - the session's extra fields, which receives a value rows cannot hold
 */
function mediaListToRows(sessionId: string, list: 'media', value: unknown, extra: Record<string, unknown>): MediaRowValues[]{
    if(value === undefined){ return []; }
    if(!Array.isArray(value) || !value.every(isPlainObject)){ extra[list] = value; return []; }
    return value.map((item, position) => {
        const itemExtra: Record<string, unknown> = {};
        for(const key of Object.keys(item)){
            if(key !== 'fileName' && key !== 'type' && key !== 'legacy'){ itemExtra[key] = item[key]; }
        }
        const fileName = typeof item.fileName === 'string' ? item.fileName : null;
        if(item.fileName !== undefined && fileName === null){ itemExtra.fileName = item.fileName; }
        const mediaType = typeof item.type === 'string' ? item.type : null;
        if(item.type !== undefined && mediaType === null){ itemExtra.type = item.type; }
        const legacy = typeof item.legacy === 'boolean' ? (item.legacy ? 1 : 0) : null;
        if(item.legacy !== undefined && legacy === null){ itemExtra.legacy = item.legacy; }
        const extraJson = Object.keys(itemExtra).length ? JSON.stringify(itemExtra) : null;
        return {sessionId, list, position, fileName, mediaType, legacy, extraJson};
    });
}

/**
 * The rows for a legacy `photos` list of file names, or none with the value kept in `extra` when it
 * is not a list of strings.
 * @param sessionId - the session
 * @param value - the session's `photos` value
 * @param extra - the session's extra fields
 */
function photoListToRows(sessionId: string, value: unknown, extra: Record<string, unknown>): MediaRowValues[]{
    if(value === undefined){ return []; }
    if(!Array.isArray(value) || !value.every(v => typeof v === 'string')){ extra.photos = value; return []; }
    return value.map((fileName: string, position) => ({sessionId, list: 'photos', position, fileName, mediaType: null, legacy: null, extraJson: null}));
}

/**
 * Builds a session from its row and its media rows (in list, position order).
 * @param row - the `session` row
 * @param mediaRows - its `session_media` rows
 */
export function rowsToSession(row: Row, mediaRows: Row[]): IMeditationSession{
    const session: SessionJson = {id: row.id};
    if(row.date_ms !== null && row.date_ms !== undefined){ session.dateMs = row.date_ms; }
    if(row.duration_ms !== null && row.duration_ms !== undefined){ session.durationMs = row.duration_ms; }
    if(row.notes !== null && row.notes !== undefined){ session.notes = row.notes; }
    if(row.rating !== null && row.rating !== undefined){ session.rating = row.rating; }
    const media = mediaRows.filter(m => m.list === 'media').map(rowToMediaItem);
    const photos = mediaRows.filter(m => m.list === 'photos').map(m => m.file_name);
    if(media.length){ session.media = media; }
    if(photos.length){ session.photos = photos; }
    if(typeof row.extra_json === 'string'){ Object.assign(session, JSON.parse(row.extra_json)); }
    return session as unknown as IMeditationSession;
}

/**
 * Builds one media item from its row.
 * @param row - the `session_media` row
 */
function rowToMediaItem(row: Row){
    const item: Record<string, unknown> = {};
    if(row.file_name !== null && row.file_name !== undefined){ item.fileName = row.file_name; }
    if(row.media_type !== null && row.media_type !== undefined){ item.type = row.media_type; }
    if(row.legacy !== null && row.legacy !== undefined){ item.legacy = row.legacy === 1; }
    if(typeof row.extra_json === 'string'){ Object.assign(item, JSON.parse(row.extra_json)); }
    return item;
}

/**
 * The parameters for inserting a `session` row, in the order of INSERT_SESSION_SQL.
 * @param values - the row
 */
export function sessionParams(values: SessionRowValues): SqlValue[]{
    return [values.id, values.seq, values.dateMs, values.durationMs, values.notes, values.rating, values.extraJson];
}

/**
 * The parameters for inserting a `session_media` row, in the order of INSERT_MEDIA_SQL.
 * @param values - the row
 */
export function mediaParams(values: MediaRowValues): SqlValue[]{
    return [values.sessionId, values.list, values.position, values.fileName, values.mediaType, values.legacy, values.extraJson];
}

export const INSERT_SESSION_SQL = 'INSERT INTO session (id, seq, date_ms, duration_ms, notes, rating, extra_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)';
export const INSERT_MEDIA_SQL = 'INSERT INTO session_media (session_id, list, position, file_name, media_type, legacy, extra_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)';
export const SELECT_SESSIONS_SQL = 'SELECT id, seq, date_ms, duration_ms, notes, rating, extra_json FROM session ORDER BY seq DESC';
export const SELECT_MEDIA_SQL = 'SELECT session_id, list, position, file_name, media_type, legacy, extra_json FROM session_media ORDER BY session_id, list, position';

/**
 * Builds sessions from every session row and every media row, keeping the session rows' order.
 * @param sessionRows - rows from SELECT_SESSIONS_SQL
 * @param mediaRows - rows from SELECT_MEDIA_SQL
 */
export function assembleSessions(sessionRows: Row[], mediaRows: Row[]): IMeditationSession[]{
    const mediaBySession = new Map<unknown, Row[]>();
    for(const m of mediaRows){
        const list = mediaBySession.get(m.session_id) ?? [];
        list.push(m);
        mediaBySession.set(m.session_id, list);
    }
    return sessionRows.map(row => rowsToSession(row, mediaBySession.get(row.id) ?? []));
}

/**
 * A stable text form of a session for comparing two copies: object keys sorted, and an empty or
 * absent `media` / `photos` list dropped, because the app treats those the same.
 * @param session - the session
 */
export function canonicalSession(session: SessionJson | IMeditationSession): string{
    const copy: SessionJson = {...(session as SessionJson)};
    for(const list of ['media', 'photos']){
        if(Array.isArray(copy[list]) && (copy[list] as unknown[]).length === 0){ delete copy[list]; }
    }
    return canonicalJson(copy);
}

/**
 * JSON text with every object's keys in sorted order.
 * @param value - any JSON value
 */
export function canonicalJson(value: unknown): string{
    if(Array.isArray(value)){ return `[${value.map(canonicalJson).join(',')}]`; }
    if(isPlainObject(value)){
        const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
        return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}
