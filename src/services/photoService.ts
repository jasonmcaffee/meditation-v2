import {launchCamera, launchImageLibrary, Asset, ImagePickerResponse} from 'react-native-image-picker';
import fileSystem from "./fileSystem";
import {PHOTOS_DIR, getPhotoPath} from "../models/IMeditationSession";

/**
 * Launch the device camera, copy the captured image into the app data dir,
 * and return the stored file name. Returns null if the user cancels or an error occurs.
 */
async function capturePhoto(): Promise<string | null> {
    const response = await launchCamera({mediaType: 'photo', saveToPhotos: false, quality: 0.9});
    return handlePickerResponse(response);
}

/**
 * Launch the gallery picker, copy the chosen image into the app data dir,
 * and return the stored file name. Returns null if the user cancels or an error occurs.
 */
async function pickPhoto(): Promise<string | null> {
    const response = await launchImageLibrary({mediaType: 'photo', selectionLimit: 1, quality: 0.9});
    return handlePickerResponse(response);
}

/**
 * Normalize an image-picker response: handle cancel/error, then copy the asset into the data dir.
 * @param response - the result returned by launchCamera / launchImageLibrary
 */
async function handlePickerResponse(response: ImagePickerResponse): Promise<string | null> {
    if (response.didCancel) { return null; }
    if (response.errorCode) {
        console.error('[photoService] picker error:', response.errorCode, response.errorMessage);
        return null;
    }
    const asset: Asset | undefined = response.assets && response.assets[0];
    if (!asset || !asset.uri) { return null; }
    try {
        return await copyIntoDataDir(asset.uri, asset.fileName);
    } catch (e) {
        console.error('[photoService] failed to copy photo into data dir:', e);
        return null;
    }
}

/**
 * Copy a source uri into the app photos directory under a unique file name.
 * @param sourceUri - the uri of the source image (camera roll / temp capture)
 * @param originalName - optional original file name, used to derive the extension
 */
async function copyIntoDataDir(sourceUri: string, originalName?: string | null): Promise<string> {
    await fileSystem.mkDir(PHOTOS_DIR);
    const fileName = generatePhotoFileName(originalName, sourceUri);
    await fileSystem.copyFile(sourceUri, getPhotoPath(fileName));
    return fileName;
}

/**
 * Delete the copied files backing the given photo file names. Best-effort; missing files are ignored.
 * @param fileNames - photo file names previously returned by capturePhoto/pickPhoto
 */
async function deletePhotos(fileNames: string[] = []): Promise<void> {
    for (const fileName of fileNames) {
        await fileSystem.unlink(getPhotoPath(fileName));
    }
}

/**
 * Build a unique photo file name preserving the source extension.
 * @param originalName - original file name (may contain an extension)
 * @param sourceUri - source uri, used as an extension fallback
 */
function generatePhotoFileName(originalName: string | null | undefined, sourceUri: string): string {
    const ext = extractExtension(originalName) || extractExtension(sourceUri) || 'jpg';
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

const photoService = {capturePhoto, pickPhoto, copyIntoDataDir, deletePhotos};
export default photoService;
