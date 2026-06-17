import mediaService from '../../services/mediaService';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import fileSystem from '../../services/fileSystem';
import { MEDIA_DIR } from '../../models/IMeditationSession';

jest.mock('../../services/fileSystem', () => ({
  __esModule: true,
  baseDirectory: '/mock/docs',
  default: {
    mkDir: jest.fn(() => Promise.resolve()),
    copyFile: jest.fn(() => Promise.resolve()),
    unlink: jest.fn(() => Promise.resolve()),
  },
}));

const mockedLaunchCamera = launchCamera as jest.Mock;
const mockedLaunchImageLibrary = launchImageLibrary as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('mediaService', () => {
  it('capturePhoto copies the asset into the media dir and returns a photo item', async () => {
    mockedLaunchCamera.mockResolvedValue({ assets: [{ uri: 'file:///tmp/IMG_1.heic', fileName: 'IMG_1.heic' }] });

    const item = await mediaService.capturePhoto();

    expect(item).toEqual({ fileName: expect.stringMatching(/\.heic$/), type: 'photo' });
    expect(fileSystem.mkDir).toHaveBeenCalledWith(MEDIA_DIR);
    expect(fileSystem.copyFile).toHaveBeenCalledWith('file:///tmp/IMG_1.heic', expect.stringContaining(MEDIA_DIR));
  });

  it('pickVideo returns a video item', async () => {
    mockedLaunchImageLibrary.mockResolvedValue({ assets: [{ uri: 'file:///tmp/MOV_1.mp4', fileName: 'MOV_1.mp4' }] });

    const item = await mediaService.pickVideo();

    expect(item).toEqual({ fileName: expect.stringMatching(/\.mp4$/), type: 'video' });
  });

  it('returns null when the picker is cancelled', async () => {
    mockedLaunchCamera.mockResolvedValue({ didCancel: true });
    expect(await mediaService.capturePhoto()).toBeNull();
    expect(fileSystem.copyFile).not.toHaveBeenCalled();
  });

  it('returns null when the picker reports an error', async () => {
    mockedLaunchImageLibrary.mockResolvedValue({ errorCode: 'permission', errorMessage: 'denied' });
    expect(await mediaService.pickPhoto()).toBeNull();
  });

  it('saveRecordedAudio copies the recording and returns an audio item', async () => {
    const item = await mediaService.saveRecordedAudio('file:///tmp/recording.m4a');

    expect(item).toEqual({ fileName: expect.stringMatching(/\.m4a$/), type: 'audio' });
    expect(fileSystem.copyFile).toHaveBeenCalledWith('file:///tmp/recording.m4a', expect.stringContaining(MEDIA_DIR));
  });

  it('deleteMedia unlinks each item file', async () => {
    await mediaService.deleteMedia([{ fileName: 'a.jpg', type: 'photo' }, { fileName: 'b.mp4', type: 'video' }]);

    expect(fileSystem.unlink).toHaveBeenCalledTimes(2);
    expect(fileSystem.unlink).toHaveBeenCalledWith(`${MEDIA_DIR}/a.jpg`);
    expect(fileSystem.unlink).toHaveBeenCalledWith(`${MEDIA_DIR}/b.mp4`);
  });

  it('deleteMedia resolves legacy photos against the legacy photos dir', async () => {
    await mediaService.deleteMedia([{ fileName: 'old.jpg', type: 'photo', legacy: true }]);

    expect(fileSystem.unlink).toHaveBeenCalledWith('/mock/docs/photos/old.jpg');
  });
});
