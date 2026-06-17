const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2 });
  const file = path.resolve(__dirname, '..', '..', 'ux-design', 'new-design.html');
  await pg.goto('file:///' + file.split(path.sep).join('/'));
  await pg.waitForTimeout(3500);
  await pg.screenshot({ path: path.join(__dirname, 'design_rest.png') });

  await pg.click('button.scp0');
  await pg.waitForTimeout(5000);
  await pg.screenshot({ path: path.join(__dirname, 'design_run1.png') });
  await pg.waitForTimeout(5000);
  await pg.screenshot({ path: path.join(__dirname, 'design_run2.png') });
  console.log('done');
  await b.close();
})();
