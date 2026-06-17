import {baseDirectory} from "../services/fileSystem";

export const PHOTOS_DIR = baseDirectory + '/photos';

export default interface IMeditationSession{
    id: string, //todo: generate UUID
    dateMs: number,
    durationMs: number,
    notes: string, //description of how the meditation went
    rating: number,
    photos?: string[], //file names only (e.g. "1718600000000-ab12.jpg"); absolute path resolved via getPhotoPath
}

/**
 * Resolve a stored photo file name to its absolute on-disk path under the app data dir.
 * Storing only the file name keeps references stable across reinstall/OS path changes.
 * @param fileName - the photo file name persisted on the session
 */
export function getPhotoPath(fileName: string){
    return `${PHOTOS_DIR}/${fileName}`;
}

/**
 * Resolve a stored photo file name to a file:// uri suitable for React Native's Image source.
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