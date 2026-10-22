// Theme switching (Settings dialog), language switching and persistence (localStorage, IndexedDB, cookies).
const { launch, shot, URL, ROOT } = require('./common');
const HARNESS = require('./harness');
const { clickMenu, dialogDump } = require('./menu');
const fs = require('fs');

const dumpStorage = page => page.evaluate(async () => {
  const ls = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = localStorage.getItem(k); }
  const ss = {}; for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); ss[k] = sessionStorage.getItem(k); }
  const idb = [];
  if (indexedDB.databases) {
    for (const d of await indexedDB.databases()) {
      const info = { name: d.name, version: d.version, stores: [] };
      try {
        const db = await new Promise((res, rej) => { const r = indexedDB.open(d.name); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        for (const s of db.objectStoreNames) {
          const tx = db.transaction(s, 'readonly'); const st = tx.objectStore(s);
          const keys = await new Promise(res => { const r = st.getAllKeys(); r.onsuccess = () => res(r.result); r.onerror = () => res([]); });
          const vals = await new Promise(res => { const r = st.getAll(null, 5); r.onsuccess = () => res(r.result); r.onerror = () => res([]); });
          info.stores.push({ name: s, keyPath: st.keyPath, count: keys.length, keys: keys.slice(0, 20).map(String), sample: vals.map(v => { try { const j = JSON.stringify(v); return j.length > 400 ? j.slice(0, 400) + '…' : j; } catch (e) { return String(v).slice(0, 200); } }) });
        }
        db.close();
      } catch (e) { info.error = String(e); }
      idb.push(info);
    }
  }
  const caches_ = (self.caches ? await caches.keys() : []);
  return { localStorage: ls, sessionStorage: ss, indexedDB: idb, cacheStorage: caches_, cookies: document.cookie };
});

(async () => {
  const { browser, context, page, logs } = await launch();
  page.setDefaultTimeout(8000);
  const userReqs = [];
  page.on('request', r => { if (/\/user(\?|$)|\/i18n/.test(r.url())) userReqs.push(r.method() + ' ' + r.url()); });
  const out = {};
  await page.goto(URL); await page.waitForTimeout(5000);
  out.storageAtStart = await dumpStorage(page);
  await page.click('text=Create!'); await page.waitForTimeout(2000);
  await page.evaluate(HARNESS);
  out.bodyClassLight = await page.evaluate(() => document.body.className);
  out.stylesheetsLight = await page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet], style[id]')].map(l => l.href || l.id));
  out.language = await page.evaluate(() => ({ current: G.GLocale.getLanguage(), available: G.GLocale.getAvailableLanguages ? G.GLocale.getAvailableLanguages() : null, enum: G.GLocaleLanguage, apiLang: gApi.getLanguage && gApi.getLanguage(), systemLang: G.GSystem.language, setting: gDesigner.getSetting('language') }));

  // Theme via Settings dialog
  await clickMenu(page, ['Edit', 'Settings...']); await page.waitForTimeout(800);
  const themeSel = page.locator('.g-settings-dialog').locator('text=Light Theme (default)').first();
  await themeSel.click(); await page.waitForTimeout(500);
  await shot(page, '50-theme-dropdown');
  out.themeOptions = await page.evaluate(() => [...document.querySelectorAll('ul.g-menu:not(.g-menu-root), .g-select-dropdown, .g-overlay')].filter(e => e.offsetParent).map(e => e.innerText.split(/\s*\n\s*/).join(' | ')));
  out.themeOptionHtml = await page.evaluate(() => { const e = [...document.querySelectorAll('*')].filter(x => x.children.length === 0 && x.textContent.trim() === 'Dark Theme' && x.offsetParent); return e.map(x => x.outerHTML + ' < ' + x.parentElement.className); });
  const dark = page.locator('*:visible', { hasText: /^Dark Theme$/ }).last();
  out.darkClicked = false;
  if (await dark.count()) { await dark.click(); out.darkClicked = true; await page.waitForTimeout(500); }
  await shot(page, '50-theme-dark-selected');
  await page.locator('.g-settings-dialog button:text-is("Save Changes")').click(); await page.waitForTimeout(1500);
  await shot(page, '51-theme-dark-applied');
  out.bodyClassDark = await page.evaluate(() => document.body.className);
  out.stylesheetsDark = await page.evaluate(() => [...document.querySelectorAll('link[rel=stylesheet], style[id]')].map(l => l.href || l.id));
  out.settingTheme = await page.evaluate(() => gDesigner.getSetting('theme'));
  out.storageAfterDark = await dumpStorage(page);

  // Reload: theme persisted?
  await page.reload(); await page.waitForTimeout(5000);
  await shot(page, '52-theme-dark-after-reload');
  out.themeAfterReload = await page.evaluate(() => ({ setting: gDesigner.getSetting('theme'), sheets: [...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href) }));

  // Language: the Help > Language actions are not registered in this build, so set the setting and reload.
  out.langActionRegistered = await page.evaluate(() => gDesigner.getActions().filter(a => /^language/.test(a.getId())).map(a => a.getId()));
  out.langTry = {};
  await page.evaluate(() => gDesigner.setSetting('language', 1));
  out.storageAfterLangSetting = (await dumpStorage(page)).localStorage['designer.settings'];
  await page.reload(); await page.waitForTimeout(5000);
  await page.evaluate(HARNESS);
  out.langTry.afterSettingReload = await page.evaluate(() => ({ lang: G.GLocale.getLanguage(), menu: [...document.querySelectorAll('nav.g-menu-bar .g-menu-item-caption')].map(e => e.textContent) }));
  await shot(page, '53-lang-after-setting');
  // Try the ?lang URL param used by the stub server
  for (const q of ['?lang=0', '?lang=de-DE', '?locale=de']) {
    await page.goto(URL + q); await page.waitForTimeout(5000);
    await page.evaluate(HARNESS);
    out.langTry[q] = await page.evaluate(() => ({ lang: G.GLocale.getLanguage(), menu: [...document.querySelectorAll('nav.g-menu-bar .g-menu-item-caption')].map(e => e.textContent) }));
  }
  // Direct switch through the translation manager / GLocale
  out.translationManager = await page.evaluate(() => { const t = gDesigner.getTranslationManager(); const s = new Set(); let p = t; while (p && p !== Object.prototype) { Object.getOwnPropertyNames(p).forEach(k => s.add(k)); p = Object.getPrototypeOf(p); } return [...s]; });
  out.userReqs = userReqs;
  out.storageEnd = await dumpStorage(page);
  out.logs = logs.filter(l => !/GL Driver|willReadFrequently|ERR_NAME_NOT_RESOLVED/.test(l));
  fs.writeFileSync(ROOT + '/theme-i18n.json', JSON.stringify(out, null, 1));
  const brief = { ...out }; delete brief.storageAtStart; delete brief.storageAfterDark; delete brief.storageEnd;
  console.log(JSON.stringify(brief, null, 1).slice(0, 9000));
  await browser.close();
})();
