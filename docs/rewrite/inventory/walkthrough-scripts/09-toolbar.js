// Records each toolbar button: data-title, data-action, icon, hover tooltip, and dropdown menu items.
const { launch, shot, URL, ROOT } = require('./common');
const fs = require('fs');
(async () => {
  const { browser, page } = await launch();
  await page.goto(URL); await page.waitForTimeout(5000);
  await page.click('text=Create!'); await page.waitForTimeout(2000);
  const buttons = await page.$$eval('#toolbar .toolbar-button', els => els.map((el, idx) => {
    const ab = el.querySelector('.action-button');
    return {
      idx, section: el.parentElement.className.replace(/section|compound-section/g, '').trim(),
      cls: el.className, action: el.dataset.action || null,
      title: ab ? ab.dataset.title : null, icon: ab ? (ab.querySelector('.icon') || {}).className : null,
      caption: ab ? (ab.querySelector('.caption') || {}).textContent || '' : '',
      disabled: ab ? ab.classList.contains('g-disabled') : null, active: ab ? ab.classList.contains('g-active') : null,
      hasDropdown: !!el.querySelector('.dropdown-button'),
      shareSection: el.parentElement.querySelector('.share-section') ? el.parentElement.querySelector('.share-section').innerText : null,
    };
  }));
  for (const b of buttons) {
    const sel = `#toolbar .toolbar-button >> nth=${b.idx}`;
    const btn = page.locator(sel).locator('.action-button').first();
    if (await btn.count()) {
      const box = await btn.boundingBox();
      await page.mouse.move(box.x + 4, box.y + 4); await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
      await page.waitForTimeout(2200);
      b.tooltip = await page.evaluate(() => {
        const rich = [...document.querySelectorAll('.g-rich-tooltip-container')].find(t => t.offsetParent !== null);
        if (rich) return rich.innerText.trim().split(/\s*\n\s*/).join(' | ');
        const t = document.querySelector('.g-tooltip'); return t && getComputedStyle(t).display !== 'none' ? t.innerText.trim() : null; });
      if (b.idx === 9) await shot(page, '20-toolbar-tooltip-select');
      await page.mouse.move(800, 600); await page.waitForTimeout(300);
    }
    if (b.hasDropdown || (b.cls.includes('zoom-button'))) {
      const dd = b.hasDropdown && !b.cls.includes('export') ? page.locator(sel).locator('.dropdown-button') : page.locator(sel).locator('.action-button');
      try {
        await dd.click({ timeout: 2000 }); await page.waitForTimeout(400);
        b.menu = await page.evaluate(() => {
          const ms = [...document.querySelectorAll('ul.g-menu:not(.g-menu-root)')].filter(m => m.offsetParent !== null);
          const m = ms[ms.length - 1]; if (!m) return null;
          return [...m.children].filter(li => li.offsetParent !== null).map(li => li.classList.contains('g-menu-item-divider') ? '---' :
            ((li.querySelector('.g-menu-item-caption') || {}).textContent || '') +
            ((li.querySelector('.g-menu-item-shortcut') || {}).textContent ? ' [' + li.querySelector('.g-menu-item-shortcut').textContent + ']' : '') +
            (li.classList.contains('g-disabled') ? ' (disabled)' : '') + (li.classList.contains('g-menu-item-checked') ? ' (checked)' : '') + (li.classList.contains('g-menu-item-menu') ? ' >' : ''));
        });
        await shot(page, `21-toolbar-dd-${b.idx}-${(b.title || 'x').replace(/\W+/g, '_')}`);
      } catch (e) { b.menuErr = e.message.split('\n')[0]; }
      await page.keyboard.press('Escape'); await page.mouse.click(1000, 18); await page.waitForTimeout(200);
    }
  }
  fs.writeFileSync(ROOT + '/toolbar.json', JSON.stringify(buttons, null, 1));
  for (const b of buttons) console.log(b.idx, b.section, '|', b.title, '|', b.action, '|', b.icon, b.disabled ? '(disabled)' : '', '| tip:', JSON.stringify(b.tooltip), b.menu ? '\n    menu: ' + b.menu.join(' / ') : '', b.menuErr || '', b.shareSection ? 'share:' + JSON.stringify(b.shareSection) : '');
  await browser.close();
})();
