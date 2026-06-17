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

describe('MeditationSession media', () => {
  it('renders one tile per media item', () => {
    const session = makeSession({ media: [{ fileName: 'a.jpg', type: 'photo' }, { fileName: 'v.mp4', type: 'video' }] });
    const { getByTestId } = render(
      <MeditationSession meditationSession={session} onDeleteClick={jest.fn()} />
    );
    expect(getByTestId('session-media-0')).toBeTruthy();
    expect(getByTestId('session-media-1')).toBeTruthy();
  });

  it('renders legacy session.photos as photo tiles', () => {
    const session = makeSession({ photos: ['a.jpg', 'b.jpg'] });
    const { getByTestId } = render(
      <MeditationSession meditationSession={session} onDeleteClick={jest.fn()} />
    );
    expect(getByTestId('session-media-0')).toBeTruthy();
    expect(getByTestId('session-media-1')).toBeTruthy();
  });

  it('renders no tiles when the session has no media', () => {
    const session = makeSession({ media: [] });
    const { queryByTestId } = render(
      <MeditationSession meditationSession={session} onDeleteClick={jest.fn()} />
    );
    expect(queryByTestId('session-media-0')).toBeNull();
  });

  it('renders no tiles when media/photos are undefined (legacy session)', () => {
    const session = makeSession();
    delete (session as any).photos;
    const { queryByTestId } = render(
      <MeditationSession meditationSession={session} onDeleteClick={jest.fn()} />
    );
    expect(queryByTestId('session-media-0')).toBeNull();
  });

  it('opens the full-screen viewer when a tile is tapped, and closes it', () => {
    const session = makeSession({ media: [{ fileName: 'a.jpg', type: 'photo' }] });
    const { getByTestId, queryByTestId } = render(
      <MeditationSession meditationSession={session} onDeleteClick={jest.fn()} />
    );

    expect(queryByTestId('media-viewer')).toBeNull();

    fireEvent.press(getByTestId('session-media-0'));
    expect(getByTestId('media-viewer')).toBeTruthy();

    fireEvent.press(getByTestId('media-viewer-close'));
    expect(queryByTestId('media-viewer')).toBeNull();
  });
});
