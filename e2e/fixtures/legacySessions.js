/**
 * Legacy sessions.txt contents for the storage tests: the jest tests and the Android and iOS device
 * tests seed the same data, so a conversion checked in Node is the conversion checked on a phone.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const START_MS = Date.UTC(2023, 0, 2, 6, 30);

const NOTES = [
  'Calm. Breath settled after ten minutes.',
  'Busy mind 🙂 kept returning to work emails',
  'Méditation très profonde — sensation de légèreté',
  'Line one\nLine two\n\twith a tab and "quotes" and a backslash \\',
  '静かな朝。呼吸に集中した。',
  'Noisy neighbours; still okay',
  '',
  'Body scan, shoulders tight 💆‍♂️🧘',
];

/**
 * A realistic history of `count` sessions, newest first, as every version before task-2445 wrote it:
 * some with media, some with photos from the photos-only version, some from before ratings existed.
 * @param count - how many sessions
 */
function realisticSessions(count = 40) {
  const sessions = [];
  for (let i = 0; i < count; i++) {
    const dateMs = START_MS + (count - i) * DAY_MS + i * 137000;
    const session = {
      id: String(dateMs + 1234),
      dateMs,
      durationMs: (10 + (i % 7) * 5) * 60000 + i * 1000,
      notes: `${NOTES[i % NOTES.length]} #${count - i}`,
      rating: [5, 4.5, 4, 3, 2.5, 1][i % 6],
    };
    if (i % 5 === 1) { session.media = [{ fileName: `${dateMs}-a1.jpg`, type: 'photo' }, { fileName: `${dateMs}-b2.mp4`, type: 'video' }]; }
    if (i % 5 === 3) { session.media = [{ fileName: `${dateMs}-c3.m4a`, type: 'audio' }]; }
    if (i % 9 === 4) { session.photos = [`${dateMs}-old1.jpg`, `${dateMs}-old2.jpg`]; }
    if (i % 11 === 6) { session.media = []; }
    if (i >= count - 3) { delete session.rating; }
    sessions.push(session);
  }
  return sessions;
}

/**
 * The realistic history plus every awkward record a real file could hold: odd types, unknown fields,
 * a duplicate id, a missing id, a numeric id, a media item with an extra key, and records that are
 * not objects at all.
 */
function awkwardSessions() {
  const sessions = realisticSessions(12);
  sessions.push({ id: 'odd-types', dateMs: '1672650000000', durationMs: 600000, notes: null, rating: '5', mood: 'happy' });
  sessions.push({ id: sessions[0].id, dateMs: 1672000000000, durationMs: 1000, notes: 'duplicate id', rating: 1 });
  sessions.push({ dateMs: 1671000000000, durationMs: 2000, notes: 'no id at all', rating: 2 });
  sessions.push({ id: 1670000000000, dateMs: 1670000000000, durationMs: 3000, notes: 'numeric id', rating: 3 });
  sessions.push({ id: 'media-odd', dateMs: 1669000000000, durationMs: 4000, notes: 'media item extras', rating: 4,
    media: [{ fileName: 'x.jpg', type: 'photo', legacy: true, caption: 'sunrise' }, { fileName: 7, type: 'photo' }], photos: 'not-a-list' });
  sessions.push(null);
  sessions.push('a string where a session should be');
  sessions.push([1, 2, 3]);
  return sessions;
}

/**
 * The file text, as the old app wrote it.
 * @param sessions - the sessions, newest first
 */
function legacyFileText(sessions) {
  return JSON.stringify({ meditationSessions: sessions });
}

module.exports = { realisticSessions, awkwardSessions, legacyFileText };
