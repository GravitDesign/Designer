// Walks every main menu (and submenus) through the DOM, in two states:
// nothing selected and one rectangle selected. Writes menus-<state>.json.
const { launch, shot, URL, ROOT } = require('./common');
const HARNESS = require('./harness');
const fs = require('fs');

async function readOpenMenu(page, depth) {
  // returns the items of the last opened (deepest) non-root menu
  return page.evaluate((depth) => {
    const menus = [...document.querySelectorAll('ul.g-menu:not(.g-menu-root)')].filter(m => m.offsetParent !== null);
    const m = menus[depth];
    if (!m) return null;
    return [...m.children].map((li, i) => ({
      i,
      divider: li.classList.contains('g-menu-item-divider'),
      caption: (li.querySelector(':scope > .g-menu-item-caption') || {}).textContent || '',
      shortcut: (li.querySelector(':scope > .g-menu-item-shortcut') || {}).textContent || '',
      info: (li.querySelector(':scope > .g-menu-item-info') || {}).textContent || '',
      sub: li.classList.contains('g-menu-item-menu'),
      disabled: li.classList.contains('g-disabled'),
      checked: li.classList.contains('g-checked') || !!li.querySelector('.g-menu-item-icon.gravit-icon-checkmark, .g-checked'),
      cls: li.className,
      hidden: li.offsetParent === null,
    }));
  }, depth);
}

async function walk(page, depth, prefix) {
  const items = await readOpenMenu(page, depth);
  if (!items) return [];
  for (const it of items) {
    if (it.sub && !it.disabled && !it.hidden) {
      const handle = await page.evaluateHandle(({ depth, i }) => {
        const menus = [...document.querySelectorAll('ul.g-menu:not(.g-menu-root)')].filter(m => m.offsetParent !== null);
        return menus[depth].children[i];
      }, { depth, i: it.i });
      await handle.asElement().hover();
      await page.waitForTimeout(350);
      if (depth === 0) await shot(page, `11-${prefix}-${it.caption.replace(/[^a-z0-9]+/gi, '_')}`);
      it.children = await walk(page, depth + 1, prefix);
    }
  }
  return items;
}

(async () => {
  const { browser, page, logs } = await launch();
  await page.goto(URL); await page.waitForTimeout(5000);
  await page.click('text=Create!'); await page.waitForTimeout(2000);
  await page.evaluate(HARNESS);
  const result = {};
  for (const state of ['empty', 'rect']) {
    if (state === 'rect') {
      await page.evaluate(() => {
        const ed = gDesigner.getActiveDocument().getEditor();
        const r = new G.GRectangle();
        r.setProperty('trf', new G.GTransform(100, 0, 0, 60, 300, 200));
        ed.insertElements([r]); window.__r = r;
      });
      await page.waitForTimeout(500);
    }
    const tops = await page.$$eval('nav.g-menu-bar > ul > li > .g-menu-item-caption', els => els.map(e => e.textContent));
    result[state] = {};
    for (const top of tops) {
      await page.keyboard.press('Escape');
      await page.evaluate(() => { if (window.__r) gDesigner.getActiveDocument().getEditor().updateSelection(false, [window.__r]); });
      await page.click(`nav.g-menu-bar >> text="${top}"`);
      await page.waitForTimeout(400);
      await shot(page, `10-${state}-menu-${top}`);
      result[state][top] = await walk(page, 0, `${state}-${top}`);
      await page.keyboard.press('Escape');
      await page.mouse.click(1000, 18);
      await page.waitForTimeout(200);
    }
  }
  fs.writeFileSync(ROOT + '/menus.json', JSON.stringify(result, null, 1));
  console.log('done', Object.keys(result.empty));
  await browser.close();
})();
