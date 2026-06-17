import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import FinishSessionModal from '../src/components/time-page/FinishSessionModal';
import IMeditationSession from '../src/models/IMeditationSession';

jest.mock('../src/services/photoService', () => ({
  __esModule: true,
  default: {
    capturePhoto: jest.fn(),
    pickPhoto: jest.fn(),
    deletePhotos: jest.fn(() => Promise.resolve()),
  },
}));

const photoService = require('../src/services/photoService').default;

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
    const { getByTestId } = render(
      <FinishSessionModal meditationSession={session} onCloseClick={onCloseClick} />
    );
    // The Modal renders an IconButton with faClose; it wraps in a Div with accessible press
    // We fire on the first pressable element that is the close button (icon button)
    // Fall back: press the backdrop dismiss area by looking at all pressable elements
    // Since IconButton renders a Pressable via Div, we can test via accessible label
    // or we look at the text content 'icon' from our FontAwesomeIcon mock
    const closeButtons = getByTestId ? undefined : undefined; // testID not set, use query
    // The close icon renders as Text with content 'icon' via our mock
    // If multiple 'icon' texts exist, we want the first one (close button)
    const { getAllByText } = render(
      <FinishSessionModal meditationSession={session} onCloseClick={onCloseClick} />
    );
    const iconElements = getAllByText('icon');
    // The close button is the first icon in the modal
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

  describe('photos', () => {
    it('shows a thumbnail after capturing a photo with the camera', async () => {
      photoService.capturePhoto.mockResolvedValue('photo-1.jpg');
      const { getByTestId } = render(<FinishSessionModal meditationSession={makeSession()} />);

      await act(async () => {
        fireEvent.press(getByTestId('capture-photo-button'));
      });

      await waitFor(() => expect(getByTestId('session-thumbnail-0')).toBeTruthy());
    });

    it('shows a thumbnail after attaching a photo from the gallery', async () => {
      photoService.pickPhoto.mockResolvedValue('photo-2.jpg');
      const { getByTestId } = render(<FinishSessionModal meditationSession={makeSession()} />);

      await act(async () => {
        fireEvent.press(getByTestId('pick-photo-button'));
      });

      await waitFor(() => expect(getByTestId('session-thumbnail-0')).toBeTruthy());
    });

    it('passes attached photos to onSaveClick', async () => {
      photoService.capturePhoto.mockResolvedValue('photo-1.jpg');
      const onSaveClick = jest.fn();
      const { getByTestId } = render(
        <FinishSessionModal meditationSession={makeSession()} onSaveClick={onSaveClick} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('capture-photo-button'));
      });
      await waitFor(() => expect(getByTestId('session-thumbnail-0')).toBeTruthy());

      fireEvent.press(getByTestId('save-button'));

      expect(onSaveClick).toHaveBeenCalledWith('', expect.any(Number), ['photo-1.jpg']);
    });

    it('does not add a thumbnail when the picker is cancelled', async () => {
      photoService.capturePhoto.mockResolvedValue(null);
      const { getByTestId, queryByTestId } = render(<FinishSessionModal meditationSession={makeSession()} />);

      await act(async () => {
        fireEvent.press(getByTestId('capture-photo-button'));
      });

      expect(queryByTestId('session-thumbnail-0')).toBeNull();
    });

    it('removes a photo and deletes its file when the remove badge is tapped', async () => {
      photoService.capturePhoto.mockResolvedValue('photo-1.jpg');
      const { getByTestId, queryByTestId } = render(<FinishSessionModal meditationSession={makeSession()} />);

      await act(async () => {
        fireEvent.press(getByTestId('capture-photo-button'));
      });
      await waitFor(() => expect(getByTestId('session-thumbnail-0')).toBeTruthy());

      await act(async () => {
        fireEvent.press(getByTestId('session-thumbnail-remove-0'));
      });

      expect(photoService.deletePhotos).toHaveBeenCalledWith(['photo-1.jpg']);
      expect(queryByTestId('session-thumbnail-0')).toBeNull();
    });

    it('deletes unsaved photos when the modal is closed without saving', async () => {
      photoService.capturePhoto.mockResolvedValue('photo-1.jpg');
      const onCloseClick = jest.fn();
      const { getByTestId, getAllByText } = render(
        <FinishSessionModal meditationSession={makeSession()} onCloseClick={onCloseClick} />
      );

      await act(async () => {
        fireEvent.press(getByTestId('capture-photo-button'));
      });
      await waitFor(() => expect(getByTestId('session-thumbnail-0')).toBeTruthy());

      // Press the modal close (X) button — rendered as the first MaterialCommunityIcons 'icon'.
      await act(async () => {
        fireEvent.press(getAllByText('icon')[0]);
      });

      expect(photoService.deletePhotos).toHaveBeenCalledWith(['photo-1.jpg']);
      expect(onCloseClick).toHaveBeenCalledTimes(1);
    });

    it('does NOT delete photos when the modal is saved', async () => {
      photoService.capturePhoto.mockResolvedValue('photo-1.jpg');
      const { getByTestId } = render(<FinishSessionModal meditationSession={makeSession()} onSaveClick={jest.fn()} />);

      await act(async () => {
        fireEvent.press(getByTestId('capture-photo-button'));
      });
      await waitFor(() => expect(getByTestId('session-thumbnail-0')).toBeTruthy());

      fireEvent.press(getByTestId('save-button'));

      expect(photoService.deletePhotos).not.toHaveBeenCalled();
    });
  });
});
