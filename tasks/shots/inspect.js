const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2 });
  const file = path.resolve(__dirname, '..', '..', 'ux-design', 'new-design.html');
  await pg.goto('file:///' + file.split(path.sep).join('/'));
  await pg.waitForTimeout(3000);

  const info = await pg.evaluate(() => {
    const out = [];
    document.querySelectorAll('*').forEach(e => {
      const txt = (e.childElementCount === 0 ? (e.textContent || '') : '').trim();
      const cls = e.className && e.className.toString ? e.className.toString() : '';
      const clickable = e.onclick || (e.style && e.style.cursor === 'pointer');
      if (txt || clickable || /btn|play|control/i.test(cls)) {
        out.push({ tag: e.tagName, cls: cls.slice(0, 40), txt: txt.slice(0, 20), clickable: !!clickable });
      }
    });
    return out.slice(0, 60);
  });
  console.log(JSON.stringify(info, null, 1));
  await b.close();
})();
