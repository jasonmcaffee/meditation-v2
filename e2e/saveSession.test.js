/**
 * E2E test: full save-session flow on the Android emulator.
 *
 * Verifies:
 *  1. User can tap Finish to open the session modal.
 *  2. User can type a note in the notes input.
 *  3. User can tap Save and the modal dismisses.
 *  4. The saved session appears on the Sessions page with the correct note.
 */

const NOTE_TEXT = 'E2E test session note';

describe('Save Session Flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should save a session and show it on the Sessions page', async () => {
    // ── Step 1: Tap Finish to open the modal ──────────────────────────────
    await element(by.id('finish-button')).tap();

    // ── Step 2: Verify the modal is visible ───────────────────────────────
    await waitFor(element(by.id('notes-input')))
      .toBeVisible()
      .withTimeout(5000);

    // ── Step 3: Type a note ───────────────────────────────────────────────
    await element(by.id('notes-input')).clearText();
    await element(by.id('notes-input')).typeText(NOTE_TEXT);

    // ── Step 4: Tap Save ──────────────────────────────────────────────────
    await element(by.id('save-button')).tap();

    // ── Step 5: Verify the modal has dismissed ────────────────────────────
    await waitFor(element(by.id('notes-input')))
      .not.toBeVisible()
      .withTimeout(5000);

    // ── Step 6: Navigate to the Sessions tab ──────────────────────────────
    await element(by.id('sessions-tab')).tap();

    // ── Step 7: Verify the session note appears in the list ───────────────
    await waitFor(element(by.text(NOTE_TEXT)))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show the saved session duration on the Sessions page', async () => {
    // Start the timer briefly so we have a non-zero duration
    await element(by.id('start-pause-button')).tap();
    await new Promise(r => setTimeout(r, 2000)); // let 2 seconds elapse

    // Finish the session
    await element(by.id('finish-button')).tap();
    await waitFor(element(by.id('notes-input'))).toBeVisible().withTimeout(5000);

    await element(by.id('notes-input')).typeText('Duration test note');

    await element(by.id('save-button')).tap();
    await waitFor(element(by.id('notes-input'))).not.toBeVisible().withTimeout(5000);

    // Navigate to Sessions
    await element(by.id('sessions-tab')).tap();

    // The duration should be non-zero (at least 00:00:02)
    await waitFor(element(by.text('Duration test note'))).toBeVisible().withTimeout(5000);
    // Duration formatted as HH:MM:SS — session was ~2s so we just check it exists
    await expect(element(by.text('00:00:02'))).toBeVisible();
  });
});
