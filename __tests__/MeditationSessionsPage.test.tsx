import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import MeditationSessionsPage from '../src/components/meditation-sessions-page/MeditationSessionsPage';
import IMeditationSession from '../src/models/IMeditationSession';
import appEventBus from '../src/services/appEventBus';

// __esModule: true is required so Babel's interop treats the default export correctly
jest.mock('../src/services/meditationSession', () => ({
  __esModule: true,
  default: {
    getMeditationSessions: jest.fn(),
    deleteMeditationSession: jest.fn(),
  },
}));

const meditationSessionService = require('../src/services/meditationSession').default;

function makeSession(overrides: Partial<IMeditationSession> = {}): IMeditationSession {
  return {
    id: `id-${Math.random()}`,
    dateMs: new Date('2024-03-10T08:30:00').getTime(),
    durationMs: 20 * 60 * 1000,
    notes: '',
    rating: 3,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  meditationSessionService.getMeditationSessions.mockResolvedValue([]);
  meditationSessionService.deleteMeditationSession.mockResolvedValue(undefined);
  // Navigate to Sessions page so Page component doesn't hide content with display:none
  appEventBus.navigation.goToPage().set('Sessions');
});

afterEach(() => {
  // Reset navigation back to Timer
  appEventBus.navigation.goToPage().set('Timer');
});

describe('MeditationSessionsPage', () => {
  it('renders without crashing with no sessions', async () => {
    const { toJSON } = render(<MeditationSessionsPage />);
    await waitFor(() => {
      expect(meditationSessionService.getMeditationSessions).toHaveBeenCalledTimes(1);
    });
    expect(toJSON()).toBeTruthy();
  });

  it('displays sessions loaded on mount', async () => {
    const sessions = [
      makeSession({ id: 'a', notes: 'First session', durationMs: 10 * 60 * 1000 }),
      makeSession({ id: 'b', notes: 'Second session', durationMs: 30 * 60 * 1000 }),
    ];
    meditationSessionService.getMeditationSessions.mockResolvedValue(sessions);

    const { getByText } = render(<MeditationSessionsPage />);

    await waitFor(() => {
      expect(getByText('First session')).toBeTruthy();
    });
    expect(getByText('Second session')).toBeTruthy();
  });

  it('displays session duration in HH:MM:SS format', async () => {
    const sessions = [makeSession({ id: 'c', durationMs: 25 * 60 * 1000 })];
    meditationSessionService.getMeditationSessions.mockResolvedValue(sessions);

    const { getByText } = render(<MeditationSessionsPage />);

    await waitFor(() => {
      expect(getByText('00:25:00')).toBeTruthy();
    });
  });

  it('displays session date', async () => {
    const dateMs = new Date('2024-03-10T08:30:00').getTime();
    const sessions = [makeSession({ id: 'd', dateMs })];
    meditationSessionService.getMeditationSessions.mockResolvedValue(sessions);

    const { getByText } = render(<MeditationSessionsPage />);

    await waitFor(() => {
      expect(getByText(/3\/10\/2024/)).toBeTruthy();
    });
  });

  it('updates the list when meditationSessionsChanged event fires', async () => {
    meditationSessionService.getMeditationSessions.mockResolvedValue([]);
    const { queryByText, getByText } = render(<MeditationSessionsPage />);

    await waitFor(() => {
      expect(meditationSessionService.getMeditationSessions).toHaveBeenCalled();
    });
    expect(queryByText('New session notes')).toBeNull();

    const newSession = makeSession({ id: 'new', notes: 'New session notes' });
    await act(async () => {
      appEventBus.meditationSessionRepository.meditationSessionsChanged().set([newSession]);
    });

    expect(getByText('New session notes')).toBeTruthy();
  });

  it('shows multiple sessions added via event bus', async () => {
    meditationSessionService.getMeditationSessions.mockResolvedValue([]);
    const { getByText } = render(<MeditationSessionsPage />);

    await waitFor(() => {
      expect(meditationSessionService.getMeditationSessions).toHaveBeenCalled();
    });

    const sessions = [
      makeSession({ id: 's1', notes: 'Morning sit', durationMs: 15 * 60 * 1000 }),
      makeSession({ id: 's2', notes: 'Evening sit', durationMs: 45 * 60 * 1000 }),
    ];
    await act(async () => {
      appEventBus.meditationSessionRepository.meditationSessionsChanged().set(sessions);
    });

    expect(getByText('Morning sit')).toBeTruthy();
    expect(getByText('Evening sit')).toBeTruthy();
    expect(getByText('00:15:00')).toBeTruthy();
    expect(getByText('00:45:00')).toBeTruthy();
  });

  it('shows session notes when present', async () => {
    const sessions = [makeSession({ id: 'e', notes: 'Peaceful and focused' })];
    meditationSessionService.getMeditationSessions.mockResolvedValue(sessions);

    const { getByText } = render(<MeditationSessionsPage />);

    await waitFor(() => {
      expect(getByText('Peaceful and focused')).toBeTruthy();
    });
  });

  it('does not render a notes element for sessions with empty notes', async () => {
    const sessions = [makeSession({ id: 'f', notes: '' })];
    meditationSessionService.getMeditationSessions.mockResolvedValue(sessions);

    const { queryAllByText, getByText } = render(<MeditationSessionsPage />);

    // Wait for the session to load (duration should be present)
    await waitFor(() => {
      expect(getByText('00:20:00')).toBeTruthy();
    });
    // The session's notes row should not render empty text
    const emptyTexts = queryAllByText('');
    expect(emptyTexts).toHaveLength(0);
  });
});
