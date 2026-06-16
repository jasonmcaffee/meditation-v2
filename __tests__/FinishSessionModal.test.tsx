import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FinishSessionModal from '../src/components/time-page/FinishSessionModal';
import IMeditationSession from '../src/models/IMeditationSession';

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
    expect(onSaveClick).toHaveBeenCalledWith('Felt very calm today', expect.any(Number));
  });

  it('calls onSaveClick with empty notes when nothing is typed', () => {
    const onSaveClick = jest.fn();
    const session = makeSession();
    const { getByText } = render(
      <FinishSessionModal meditationSession={session} onSaveClick={onSaveClick} />
    );

    fireEvent.press(getByText('Save'));

    expect(onSaveClick).toHaveBeenCalledWith('', expect.any(Number));
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
});
