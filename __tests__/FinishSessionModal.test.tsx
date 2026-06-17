import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import FinishSessionModal from '../src/components/time-page/FinishSessionModal';
import IMeditationSession, { IMediaItem } from '../src/models/IMeditationSession';

jest.mock('../src/services/mediaService', () => ({
  __esModule: true,
  default: {
    capturePhoto: jest.fn(),
    pickPhoto: jest.fn(),
    captureVideo: jest.fn(),
    pickVideo: jest.fn(),
    saveRecordedAudio: jest.fn(),
    deleteMedia: jest.fn(() => Promise.resolve()),
  },
}));

const mediaService = require('../src/services/mediaService').default;

const photoItem: IMediaItem = { fileName: 'photo-1.jpg', type: 'photo' };

beforeEach(() => {
  jest.clearAllMocks();
});

/** Build a minimal IMeditationSession for test purposes. */
function makeSession(overrides: Partial<IMeditationSession> = {}): IMeditationSession {
  return {
    id: 'test-id-1',
    dateMs: new Date('2024-01-15T10:00:00').getTime(),
    durationMs: 10 * 60 * 1000, // 10 minutes
    notes: '',
    rating: 0,
    ...overrides,
  };
}

/** Open the media picker and attach a photo via the camera, returning the render result. */
async function attachPhotoViaCamera(utils: ReturnType<typeof render>) {
  await act(async () => {
    fireEvent.press(utils.getByTestId('new-media-button'));
  });
  await act(async () => {
    fireEvent.press(utils.getByTestId('media-take-photo-button'));
  });
}

describe('FinishSessionModal', () => {
  it('renders session duration', () => {
    const session = makeSession({ durationMs: 10 * 60 * 1000 });
    const { getByText } = render(
      <FinishSessionModal meditationSession={session} />
    );
    // 10 minutes = 00:10:00
    expect(getByText('00:10:00')).toBeTruthy();
  });

  it('renders notes text input with placeholder', () => {
    const session = makeSession();
    const { getByPlaceholderText } = render(
      <FinishSessionModal meditationSession={session} />
    );
    expect(getByPlaceholderText('Notes about your session')).toBeTruthy();
  });

  it('pre-fills notes input if session already has notes', () => {
    const session = makeSession({ notes: 'Pre-existing note' });
    const { getByDisplayValue } = render(
      <FinishSessionModal meditationSession={session} />
    );
    expect(getByDisplayValue('Pre-existing note')).toBeTruthy();
  });

  it('calls onSaveClick with edited notes when Save is pressed', () => {
    const onSaveClick = jest.fn();
    const session = makeSession();
    const { getByPlaceholderText, getByText } = render(
      <FinishSessionModal meditationSession={session} onSaveClick={onSaveClick} />
    );

    const notesInput = getByPlaceholderText('Notes about your session');
    fireEvent.changeText(notesInput, 'Felt very calm today');

    const saveButton = getByText('Save');
    fireEvent.press(saveButton);

    expect(onSaveClick).toHaveBeenCalledTimes(1);
    expect(onSaveClick).toHaveBeenCalledWith('Felt very calm today', expect.any(Number), []);
  });

  it('calls onSaveClick with empty notes when nothing is typed', () => {
    const onSaveClick = jest.fn();
    const session = makeSession();
    const { getByText } = render(
      <FinishSessionModal meditationSession={session} onSaveClick={onSaveClick} />
    );

    fireEvent.press(getByText('Save'));

    expect(onSaveClick).toHaveBeenCalledWith('', expect.any(Number), []);
  });

  it('calls onCloseClick when the close (X) button is pressed', () => {
    const onCloseClick = jest.fn();
    const session = makeSession();
    const { getAllByText } = render(
      <FinishSessionModal meditationSession={session} onCloseClick={onCloseClick} />
    );
    // The modal close button is the first MaterialCommunityIcons 'icon' rendered.
    const iconElements = getAllByText('icon');
    fireEvent.press(iconElements[0]);

    expect(onCloseClick).toHaveBeenCalledTimes(1);
  });

  it('modal window area tap does NOT trigger close (backdrop isolation fix)', () => {
    const onCloseClick = jest.fn();
    const session = makeSession();
    const { getByText } = render(
      <FinishSessionModal meditationSession={session} onCloseClick={onCloseClick} />
    );

    // Tapping the duration text (inside modal window, not a button) should NOT close
    fireEvent.press(getByText('00:10:00'));

    // onCloseClick should not be called because Modal window now has its own onClick handler
    expect(onCloseClick).not.toHaveBeenCalled();
  });

  describe('media', () => {
    it('shows a thumbnail after capturing a photo with the camera', async () => {
      mediaService.capturePhoto.mockResolvedValue(photoItem);
      const utils = render(<FinishSessionModal meditationSession={makeSession()} />);

      await attachPhotoViaCamera(utils);

      await waitFor(() => expect(utils.getByTestId('finish-media-0')).toBeTruthy());
    });

    it('shows a thumbnail after attaching a photo from the gallery', async () => {
      mediaService.pickPhoto.mockResolvedValue({ fileName: 'photo-2.jpg', type: 'photo' });
      const utils = render(<FinishSessionModal meditationSession={makeSession()} />);

      await act(async () => {
        fireEvent.press(utils.getByTestId('new-media-button'));
      });
      await act(async () => {
        fireEvent.press(utils.getByTestId('media-add-photo-button'));
      });

      await waitFor(() => expect(utils.getByTestId('finish-media-0')).toBeTruthy());
    });

    it('shows a tile after recording audio', async () => {
      mediaService.saveRecordedAudio.mockResolvedValue({ fileName: 'audio-1.m4a', type: 'audio' });
      const utils = render(<FinishSessionModal meditationSession={makeSession()} />);

      await act(async () => {
        fireEvent.press(utils.getByTestId('new-media-button'));
      });
      await act(async () => {
        fireEvent.press(utils.getByTestId('media-record-audio-button'));
      });
      await act(async () => {
        fireEvent.press(utils.getByTestId('audio-stop-button'));
      });
      await act(async () => {
        fireEvent.press(utils.getByTestId('audio-save-button'));
      });

      await waitFor(() => expect(utils.getByTestId('finish-media-0')).toBeTruthy());
    });

    it('passes attached media to onSaveClick', async () => {
      mediaService.capturePhoto.mockResolvedValue(photoItem);
      const onSaveClick = jest.fn();
      const utils = render(
        <FinishSessionModal meditationSession={makeSession()} onSaveClick={onSaveClick} />
      );

      await attachPhotoViaCamera(utils);
      await waitFor(() => expect(utils.getByTestId('finish-media-0')).toBeTruthy());

      fireEvent.press(utils.getByTestId('save-button'));

      expect(onSaveClick).toHaveBeenCalledWith('', expect.any(Number), [photoItem]);
    });

    it('does not add a thumbnail when the picker is cancelled', async () => {
      mediaService.capturePhoto.mockResolvedValue(null);
      const utils = render(<FinishSessionModal meditationSession={makeSession()} />);

      await attachPhotoViaCamera(utils);

      expect(utils.queryByTestId('finish-media-0')).toBeNull();
    });

    it('removes media and deletes its file when the remove badge is tapped', async () => {
      mediaService.capturePhoto.mockResolvedValue(photoItem);
      const utils = render(<FinishSessionModal meditationSession={makeSession()} />);

      await attachPhotoViaCamera(utils);
      await waitFor(() => expect(utils.getByTestId('finish-media-0')).toBeTruthy());

      await act(async () => {
        fireEvent.press(utils.getByTestId('finish-media-remove-0'));
      });

      expect(mediaService.deleteMedia).toHaveBeenCalledWith([photoItem]);
      expect(utils.queryByTestId('finish-media-0')).toBeNull();
    });

    it('deletes unsaved media when the modal is closed without saving', async () => {
      mediaService.capturePhoto.mockResolvedValue(photoItem);
      const onCloseClick = jest.fn();
      const utils = render(
        <FinishSessionModal meditationSession={makeSession()} onCloseClick={onCloseClick} />
      );

      await attachPhotoViaCamera(utils);
      await waitFor(() => expect(utils.getByTestId('finish-media-0')).toBeTruthy());

      // Press the modal close (X) button — rendered as the first MaterialCommunityIcons 'icon'.
      await act(async () => {
        fireEvent.press(utils.getAllByText('icon')[0]);
      });

      expect(mediaService.deleteMedia).toHaveBeenCalledWith([photoItem]);
      expect(onCloseClick).toHaveBeenCalledTimes(1);
    });

    it('does NOT delete media when the modal is saved', async () => {
      mediaService.capturePhoto.mockResolvedValue(photoItem);
      const utils = render(<FinishSessionModal meditationSession={makeSession()} onSaveClick={jest.fn()} />);

      await attachPhotoViaCamera(utils);
      await waitFor(() => expect(utils.getByTestId('finish-media-0')).toBeTruthy());

      fireEvent.press(utils.getByTestId('save-button'));

      expect(mediaService.deleteMedia).not.toHaveBeenCalled();
    });
  });
});
