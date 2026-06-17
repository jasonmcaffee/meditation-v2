import { MeditationSessionRepository } from '../../repository/meditationSessionRepository';
import IMeditationSession from '../../models/IMeditationSession';
import photoService from '../../services/photoService';

jest.mock('../../services/photoService', () => ({
  __esModule: true,
  default: {
    deletePhotos: jest.fn(() => Promise.resolve()),
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
  it('deletes the copied photo files for the session being removed', async () => {
    const repo = new MeditationSessionRepository();
    const session = makeSession({ photos: ['a.jpg', 'b.jpg'] });
    repo.dataContainer = { meditationSessions: [session] };

    await repo.deleteMeditationSession(session);

    expect(photoService.deletePhotos).toHaveBeenCalledWith(['a.jpg', 'b.jpg']);
    expect(repo.dataContainer.meditationSessions).toHaveLength(0);
  });

  it('does not call deletePhotos for a session without photos', async () => {
    const repo = new MeditationSessionRepository();
    const session = makeSession();
    repo.dataContainer = { meditationSessions: [session] };

    await repo.deleteMeditationSession(session);

    expect(photoService.deletePhotos).not.toHaveBeenCalled();
    expect(repo.dataContainer.meditationSessions).toHaveLength(0);
  });
});
