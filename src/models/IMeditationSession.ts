import {baseDirectory} from "../services/fileSystem";

// Legacy directory used by the original photos-only implementation. Kept so previously
// saved photos (session.photos[]) still resolve. All new media is written to MEDIA_DIR.
export const PHOTOS_DIR = baseDirectory + '/photos';
export const MEDIA_DIR = baseDirectory + '/media';

export type MediaType = 'photo' | 'video' | 'audio';

/**
 * A single piece of media attached to a session. Only the file name is persisted; the
 * absolute path is resolved at render time (paths change across reinstall/OS updates).
 * `legacy` marks photos saved under the old PHOTOS_DIR so they keep resolving.
 */
export interface IMediaItem{
    fileName: string, //e.g. "1718600000000-ab12.jpg"
    type: MediaType,
    legacy?: boolean, //true => resolve against PHOTOS_DIR instead of MEDIA_DIR
}

export default interface IMeditationSession{
    id: string, //todo: generate UUID
    dateMs: number,
    durationMs: number,
    notes: string, //description of how the meditation went
    rating: number,
    media?: IMediaItem[], //photos, videos, audio attached to the session
    photos?: string[], //legacy: file names of photos saved before media was generalized
}

/**
 * Resolve a media item to its absolute on-disk path under the app data dir.
 * @param item - the media item persisted on the session
 */
export function getMediaPath(item: IMediaItem){
    const dir = item.legacy ? PHOTOS_DIR : MEDIA_DIR;
    return `${dir}/${item.fileName}`;
}

/**
 * Resolve a media item to a file:// uri suitable for Image / Video / audio player sources.
 * @param item - the media item persisted on the session
 */
export function getMediaUri(item: IMediaItem){
    return `file://${getMediaPath(item)}`;
}

/**
 * Normalize a session's media into a single list, folding legacy session.photos[] entries
 * into media items so old and new sessions render through the same components.
 * @param session - the session whose media should be resolved
 */
export function getSessionMedia(session: Pick<IMeditationSession, 'media' | 'photos'>): IMediaItem[]{
    const media = session.media ? [...session.media] : [];
    const legacyPhotos = (session.photos ?? []).map(fileName => ({fileName, type: 'photo' as MediaType, legacy: true}));
    return [...legacyPhotos, ...media];
}

/**
 * Resolve a stored photo file name to its absolute on-disk path. Retained for the legacy
 * photos directory; new code should prefer getMediaPath.
 * @param fileName - the photo file name persisted on the session
 */
export function getPhotoPath(fileName: string){
    return `${MEDIA_DIR}/${fileName}`;
}

/**
 * Resolve a stored photo file name to a file:// uri. Retained for compatibility.
 * @param fileName - the photo file name persisted on the session
 */
export function getPhotoUri(fileName: string){
    return `file://${getPhotoPath(fileName)}`;
}

export function getFormattedDate(dateMs: number){
    const d = new Date(dateMs);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    const minutes = d.getMinutes();
    return `${month}/${day}/${year} ${zeroFormat(hour)}:${zeroFormat(minutes)}`;
}

export function getFormattedDuration(durationMs: number) {
    const durationSeconds = durationMs / 1000;
    // const days = Math.floor(durationSeconds / 86400);
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor(durationSeconds / 60) % 60;
    const seconds = Math.floor(durationSeconds % 60);
    return  `${zeroFormat(hours)}:${zeroFormat(minutes)}:${zeroFormat(seconds)}`;
}

function zeroFormat(time: number){
    return time > 9 ? time : `0${time}`;
}