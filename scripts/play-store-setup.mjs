/**
 * Google Play Store setup automation using Playwright with saved Chrome session.
 * Navigates Play Console to check account status and guide app creation.
 */
import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHROME_USER_DATA_DIR = 'C:\\Users\\jason\\AppData\\Local\\Google\\Chrome\\User Data';
const PLAY_CONSOLE_URL = 'https://play.google.com/console/u/0/developers';
const SCREENSHOT_DIR = path.join(__dirname, '..', 'play-store-screenshots');

/** Ensures screenshot output directory exists */
function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

/** Takes and saves a named screenshot */
async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`Screenshot saved: ${filePath}`);
  return filePath;
}

/** Waits for navigation and takes a screenshot */
async function navigateAndScreenshot(page, url, name) {
  console.log(`Navigating to: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  return screenshot(page, name);
}

async function main() {
  ensureScreenshotDir();
  console.log('Launching Chrome with saved session...');

  const context = await chromium.launchPersistentContext(CHROME_USER_DATA_DIR, {
    headless: false,
    channel: 'chrome',
    viewport: { width: 1400, height: 900 },
    args: ['--no-first-run', '--no-default-browser-check'],
  });

  const page = await context.newPage();

  try {
    // Step 1: Check Play Console developer home
    console.log('\n=== Step 1: Checking Play Console developer account ===');
    await navigateAndScreenshot(page, PLAY_CONSOLE_URL, '01-developer-home');

    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    if (currentUrl.includes('accounts.google.com') || currentUrl.includes('signin')) {
      console.log('ERROR: Not logged in. Please log into Google in Chrome and re-run this script.');
      await context.close();
      return;
    }

    if (currentUrl.includes('signup') || currentUrl.includes('registration')) {
      console.log('INFO: Play Developer account signup needed ($25 one-time fee).');
      await screenshot(page, '01b-signup-required');
      console.log('Please complete signup at:', currentUrl);
      await context.close();
      return;
    }

    // Step 2: Check if Jhana Meditation app already exists
    console.log('\n=== Step 2: Checking for existing apps ===');
    await page.waitForTimeout(2000);
    const pageContent = await page.content();
    const hasJhana = pageContent.toLowerCase().includes('jhana');
    console.log('Jhana app found:', hasJhana);

    // Step 3: Navigate to create new app if not found
    if (!hasJhana) {
      console.log('\n=== Step 3: Looking for Create App button ===');

      // Try to find and click the Create App button
      const createBtnSelectors = [
        'button:has-text("Create app")',
        '[aria-label="Create app"]',
        'a:has-text("Create app")',
      ];

      let clicked = false;
      for (const selector of createBtnSelectors) {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await screenshot(page, '03-before-create');
          await btn.click();
          await page.waitForTimeout(2000);
          await screenshot(page, '03-create-app-dialog');
          clicked = true;
          break;
        }
      }

      if (!clicked) {
        console.log('Could not find Create App button. Taking screenshot for manual review.');
        await screenshot(page, '03-no-create-button');
      }
    } else {
      console.log('Jhana app already exists in Play Console.');
      await screenshot(page, '03-app-exists');
    }

    console.log('\n=== Done ===');
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    console.log('Review screenshots to see current Play Console state.');

  } catch (err) {
    console.error('Error:', err.message);
    await screenshot(page, 'error-state').catch(() => {});
  }

  // Keep browser open for manual interaction
  console.log('\nBrowser left open for manual inspection. Close it when done.');
  await page.waitForTimeout(60000 * 5); // keep open 5 min
  await context.close();
}

main().catch(console.error);
