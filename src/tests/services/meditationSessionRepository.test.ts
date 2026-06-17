import { MeditationSessionRepository } from '../../repository/meditationSessionRepository';
import IMeditationSession from '../../models/IMeditationSession';
import mediaService from '../../services/mediaService';

jest.mock('../../services/mediaService', () => ({
  __esModule: true,
  default: {
    deleteMedia: jest.fn(() => Promise.resolve()),
  },
}));

function makeSession(overrides: Partial<IMeditationSession> = {}): IMeditationSession {
  return {
    id: 'sess-1',
    dateMs: 1700000000000,
    durationMs: 60000,
    notes: '',
    rating: 0,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MeditationSessionRepository.deleteMeditationSession', () => {
  it('deletes the copied media files for the session being removed', async () => {
    const repo = new MeditationSessionRepository();
    const session = makeSession({ media: [{ fileName: 'a.jpg', type: 'photo' }, { fileName: 'v.mp4', type: 'video' }] });
    repo.dataContainer = { meditationSessions: [session] };

    await repo.deleteMeditationSession(session);

    expect(mediaService.deleteMedia).toHaveBeenCalledWith([
      { fileName: 'a.jpg', type: 'photo' },
      { fileName: 'v.mp4', type: 'video' },
    ]);
    expect(repo.dataContainer.meditationSessions).toHaveLength(0);
  });

  it('deletes legacy photo files (session.photos) for the session being removed', async () => {
    const repo = new MeditationSessionRepository();
    const session = makeSession({ photos: ['a.jpg', 'b.jpg'] });
    repo.dataContainer = { meditationSessions: [session] };

    await repo.deleteMeditationSession(session);

    expect(mediaService.deleteMedia).toHaveBeenCalledWith([
      { fileName: 'a.jpg', type: 'photo', legacy: true },
      { fileName: 'b.jpg', type: 'photo', legacy: true },
    ]);
    expect(repo.dataContainer.meditationSessions).toHaveLength(0);
  });

  it('does not call deleteMedia for a session without media', async () => {
    const repo = new MeditationSessionRepository();
    const session = makeSession();
    repo.dataContainer = { meditationSessions: [session] };

    await repo.deleteMeditationSession(session);

    expect(mediaService.deleteMedia).not.toHaveBeenCalled();
    expect(repo.dataContainer.meditationSessions).toHaveLength(0);
  });
});
