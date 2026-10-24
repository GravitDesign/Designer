// Menu helpers: click a main-menu path like ['Edit', 'Settings...'] through the real DOM.
async function clickMenu(page, pathItems) {
  await page.keyboard.press('Escape').catch(() => {});
  await page.click(`nav.g-menu-bar >> text="${pathItems[0]}"`);
  await page.waitForTimeout(300);
  for (let d = 1; d < pathItems.length; d++) {
    const li = page.locator('ul.g-menu:not(.g-menu-root) > li.g-menu-item:visible', { has: page.locator(`:scope > .g-menu-item-caption:text-is("${pathItems[d]}")`) }).last();
    if (d < pathItems.length - 1) { await li.hover(); await page.waitForTimeout(350); }
    else { await li.click(); await page.waitForTimeout(800); }
  }
}

// Dump whatever dialogs / overlays are visible right now.
const dialogDump = page => page.evaluate(() => {
  const vis = e => e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().width > 0;
  const roots = [...document.querySelectorAll('.g-dialog, .g-modal, [class*=dialog-container].visible, .g-overlay')].filter(vis)
    .filter(e => !e.closest('#left-sidebars, #right-sidebars, #toolbar, #header'));
  const uniq = roots.filter(r => !roots.some(o => o !== r && o.contains(r)));
  return uniq.map(r => ({
    cls: r.className,
    text: r.innerText.split(/\s*\n\s*/).join(' | ').slice(0, 3000),
    inputs: [...r.querySelectorAll('input, select, textarea, button')].filter(vis).map(i => {
      const label = (i.closest('label, .g-property-row, tr, .row, .field') || {}).innerText;
      const lab = label ? label.split(/\s*\n\s*/)[0].slice(0, 40) : '';
      if (i.tagName === 'SELECT') return `select(${lab})=${i.options[i.selectedIndex] ? i.options[i.selectedIndex].text : ''} {${[...i.options].map(o => o.text).join('|')}}`;
      if (i.tagName === 'BUTTON') return `button[${(i.dataset.title || i.title || i.innerText || i.className).trim().slice(0, 40)}]`;
      return `${i.type}(${lab || i.name || i.placeholder})=${i.type === 'checkbox' || i.type === 'radio' ? i.checked : i.value}`;
    }),
  }));
});

module.exports = { clickMenu, dialogDump };
