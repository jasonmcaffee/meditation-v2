import photoService from '../../services/photoService';
import fileSystem from '../../services/fileSystem';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

// PHOTOS_DIR resolves to '/mock/docs/photos' via the mocked RNFS DocumentDirectoryPath.
const PHOTOS_DIR = '/mock/docs/photos';

jest.mock('../../services/fileSystem', () => ({
  __esModule: true,
  default: {
    mkDir: jest.fn(() => Promise.resolve()),
    copyFile: jest.fn(() => Promise.resolve()),
    unlink: jest.fn(() => Promise.resolve()),
  },
  baseDirectory: '/mock/docs',
}));

const mockedCamera = launchCamera as jest.Mock;
const mockedLibrary = launchImageLibrary as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('photoService.copyIntoDataDir', () => {
  it('ensures the photos dir exists then copies the source into it, returning a unique name', async () => {
    const fileName = await photoService.copyIntoDataDir('file:///tmp/source.png', 'source.png');

    expect(fileSystem.mkDir).toHaveBeenCalledWith(PHOTOS_DIR);
    expect(fileSystem.copyFile).toHaveBeenCalledWith('file:///tmp/source.png', `${PHOTOS_DIR}/${fileName}`);
    // preserves the source extension
    expect(fileName.endsWith('.png')).toBe(true);
  });

  it('falls back to a jpg extension when none can be derived', async () => {
    const fileName = await photoService.copyIntoDataDir('content://media/1234', null);
    expect(fileName.endsWith('.jpg')).toBe(true);
  });
});

describe('photoService.capturePhoto', () => {
  it('copies the captured photo and returns the stored file name', async () => {
    mockedCamera.mockResolvedValue({ assets: [{ uri: 'file:///tmp/cam.jpg', fileName: 'cam.jpg' }] });

    const result = await photoService.capturePhoto();

    expect(fileSystem.copyFile).toHaveBeenCalledTimes(1);
    expect(result).toMatch(/\.jpg$/);
  });

  it('returns null when the user cancels', async () => {
    mockedCamera.mockResolvedValue({ didCancel: true });
    const result = await photoService.capturePhoto();
    expect(result).toBeNull();
    expect(fileSystem.copyFile).not.toHaveBeenCalled();
  });

  it('returns null when the picker reports an error', async () => {
    mockedCamera.mockResolvedValue({ errorCode: 'camera_unavailable', errorMessage: 'no camera' });
    const result = await photoService.capturePhoto();
    expect(result).toBeNull();
    expect(fileSystem.copyFile).not.toHaveBeenCalled();
  });
});

describe('photoService.pickPhoto', () => {
  it('copies the chosen photo and returns the stored file name', async () => {
    mockedLibrary.mockResolvedValue({ assets: [{ uri: 'file:///tmp/lib.heic', fileName: 'lib.heic' }] });

    const result = await photoService.pickPhoto();

    expect(fileSystem.copyFile).toHaveBeenCalledTimes(1);
    expect(result).toMatch(/\.heic$/);
  });

  it('returns null when cancelled', async () => {
    mockedLibrary.mockResolvedValue({ didCancel: true });
    expect(await photoService.pickPhoto()).toBeNull();
  });
});

describe('photoService.deletePhotos', () => {
  it('unlinks each photo by its resolved path', async () => {
    await photoService.deletePhotos(['a.jpg', 'b.jpg']);
    expect(fileSystem.unlink).toHaveBeenCalledWith(`${PHOTOS_DIR}/a.jpg`);
    expect(fileSystem.unlink).toHaveBeenCalledWith(`${PHOTOS_DIR}/b.jpg`);
    expect(fileSystem.unlink).toHaveBeenCalledTimes(2);
  });

  it('handles an empty/undefined list without throwing', async () => {
    await expect(photoService.deletePhotos()).resolves.toBeUndefined();
    expect(fileSystem.unlink).not.toHaveBeenCalled();
  });
});
