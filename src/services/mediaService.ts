import {launchCamera, launchImageLibrary, Asset, ImagePickerResponse} from 'react-native-image-picker';
import fileSystem from "./fileSystem";
import {MEDIA_DIR, getMediaPath, IMediaItem, MediaType} from "../models/IMeditationSession";

/**
 * Launch the device camera to take a photo, copy it into the app data dir, and return a media item.
 * Returns null if the user cancels or an error occurs.
 */
async function capturePhoto(): Promise<IMediaItem | null> {
    const response = await launchCamera({mediaType: 'photo', saveToPhotos: false, quality: 0.9});
    return handlePickerResponse(response, 'photo');
}

/**
 * Launch the gallery to pick an existing photo, copy it into the app data dir, and return a media item.
 * Returns null if the user cancels or an error occurs.
 */
async function pickPhoto(): Promise<IMediaItem | null> {
    const response = await launchImageLibrary({mediaType: 'photo', selectionLimit: 1, quality: 0.9});
    return handlePickerResponse(response, 'photo');
}

/**
 * Launch the device camera to record a video, copy it into the app data dir, and return a media item.
 * Returns null if the user cancels or an error occurs.
 */
async function captureVideo(): Promise<IMediaItem | null> {
    const response = await launchCamera({mediaType: 'video', saveToPhotos: false});
    return handlePickerResponse(response, 'video');
}

/**
 * Launch the gallery to pick an existing video, copy it into the app data dir, and return a media item.
 * Returns null if the user cancels or an error occurs.
 */
async function pickVideo(): Promise<IMediaItem | null> {
    const response = await launchImageLibrary({mediaType: 'video', selectionLimit: 1});
    return handlePickerResponse(response, 'video');
}

/**
 * Persist a freshly recorded audio file (sitting at a temp uri) into the app data dir.
 * @param sourceUri - the temp uri returned by the audio recorder
 */
async function saveRecordedAudio(sourceUri: string): Promise<IMediaItem | null> {
    try {
        const fileName = await copyIntoDataDir(sourceUri, sourceUri);
        return {fileName, type: 'audio'};
    } catch (e) {
        console.error('[mediaService] failed to copy recorded audio into data dir:', e);
        return null;
    }
}

/**
 * Normalize an image-picker response: handle cancel/error, then copy the asset into the data dir.
 * @param response - the result returned by launchCamera / launchImageLibrary
 * @param type - the media type to tag the resulting item with
 */
async function handlePickerResponse(response: ImagePickerResponse, type: MediaType): Promise<IMediaItem | null> {
    if (response.didCancel) { return null; }
    if (response.errorCode) {
        console.error('[mediaService] picker error:', response.errorCode, response.errorMessage);
        return null;
    }
    const asset: Asset | undefined = response.assets && response.assets[0];
    if (!asset || !asset.uri) { return null; }
    try {
        const fileName = await copyIntoDataDir(asset.uri, asset.fileName);
        return {fileName, type};
    } catch (e) {
        console.error('[mediaService] failed to copy media into data dir:', e);
        return null;
    }
}

/**
 * Copy a source uri into the app media directory under a unique file name and return that name.
 * @param sourceUri - the uri of the source file (camera roll / temp capture / recording)
 * @param originalName - optional original file name, used to derive the extension
 */
async function copyIntoDataDir(sourceUri: string, originalName?: string | null): Promise<string> {
    await fileSystem.mkDir(MEDIA_DIR);
    const fileName = generateMediaFileName(originalName, sourceUri);
    await fileSystem.copyFile(sourceUri, getMediaPath({fileName, type: 'photo'}));
    return fileName;
}

/**
 * Delete the copied files backing the given media items. Best-effort; missing files are ignored.
 * @param items - media items previously returned by the capture/pick/record helpers
 */
async function deleteMedia(items: IMediaItem[] = []): Promise<void> {
    for (const item of items) {
        await fileSystem.unlink(getMediaPath(item));
    }
}

/**
 * Build a unique file name preserving the source extension.
 * @param originalName - original file name (may contain an extension)
 * @param sourceUri - source uri, used as an extension fallback
 */
function generateMediaFileName(originalName: string | null | undefined, sourceUri: string): string {
    const ext = extractExtension(originalName) || extractExtension(sourceUri) || 'dat';
    const shortRandom = Math.floor(Math.random() * 1e6).toString(36);
    return `${Date.now()}-${shortRandom}.${ext}`;
}

/** Extract a lowercase file extension (without dot) from a name/uri, or undefined if none. */
function extractExtension(value?: string | null): string | undefined {
    if (!value) { return undefined; }
    const withoutQuery = value.split('?')[0];
    const match = withoutQuery.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1].toLowerCase() : undefined;
}

const mediaService = {capturePhoto, pickPhoto, captureVideo, pickVideo, saveRecordedAudio, copyIntoDataDir, deleteMedia};
export default mediaService;
