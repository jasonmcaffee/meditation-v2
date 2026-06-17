import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MeditationSession from '../src/components/meditation-sessions-page/MeditationSession';
import IMeditationSession from '../src/models/IMeditationSession';

function makeSession(overrides: Partial<IMeditationSession> = {}): IMeditationSession {
  return {
    id: 'sess-1',
    dateMs: new Date('2024-01-15T10:00:00').getTime(),
    durationMs: 10 * 60 * 1000,
    notes: '',
    rating: 4,
    ...overrides,
  };
}

describe('MeditationSession photos', () => {
  it('renders one thumbnail per photo', () => {
    const session = makeSession({ photos: ['a.jpg', 'b.jpg'] });
    const { getByTestId } = render(
      <MeditationSession meditationSession={session} onDeleteClick={jest.fn()} />
    );
    expect(getByTestId('session-thumbnail-0')).toBeTruthy();
    expect(getByTestId('session-thumbnail-1')).toBeTruthy();
  });

  it('renders no thumbnails when the session has no photos', () => {
    const session = makeSession({ photos: [] });
    const { queryByTestId } = render(
      <MeditationSession meditationSession={session} onDeleteClick={jest.fn()} />
    );
    expect(queryByTestId('session-thumbnail-0')).toBeNull();
  });

  it('renders no thumbnails when photos is undefined (legacy session)', () => {
    const session = makeSession();
    delete (session as any).photos;
    const { queryByTestId } = render(
      <MeditationSession meditationSession={session} onDeleteClick={jest.fn()} />
    );
    expect(queryByTestId('session-thumbnail-0')).toBeNull();
  });

  it('opens the full-screen viewer when a thumbnail is tapped, and closes it', () => {
    const session = makeSession({ photos: ['a.jpg'] });
    const { getByTestId, queryByTestId } = render(
      <MeditationSession meditationSession={session} onDeleteClick={jest.fn()} />
    );

    expect(queryByTestId('fullscreen-photo-viewer')).toBeNull();

    fireEvent.press(getByTestId('session-thumbnail-0'));
    expect(getByTestId('fullscreen-photo-viewer')).toBeTruthy();

    fireEvent.press(getByTestId('fullscreen-photo-close'));
    expect(queryByTestId('fullscreen-photo-viewer')).toBeNull();
  });
});
