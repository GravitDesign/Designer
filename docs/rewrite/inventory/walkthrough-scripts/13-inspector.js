// Records right inspector panels for several selection states, plus the left sidebar tabs.
// Elements are created both through the API (rect/ellipse) and through real tool interaction (text, path, image).
const { launch, shot, panelDump, URL, ROOT } = require('./common');
const HARNESS = require('./harness');
const fs = require('fs');
const path = require('path');

(async () => {
  const { browser, page, logs } = await launch();
  const out = {};
  await page.goto(URL); await page.waitForTimeout(5000);
  await page.click('text=Create!'); await page.waitForTimeout(2000);
  await page.evaluate(HARNESS);
  const rec = async (name) => {
    await page.waitForTimeout(700);
    await shot(page, `30-inspector-${name}`);
    out[name] = { selection: await page.evaluate(() => H.selection().map(n => n.getNodeName())), panels: await panelDump(page, '.sidebar-container.sidebar-inspector') };
  };
  await rec('nothing-infinite');

  const rect = await page.evaluateHandle(() => H.rect(300, 150, 200, 120));
  await rec('rectangle');
  const ell = await page.evaluateHandle(() => H.ellipse(600, 150, 150, 150));
  await rec('ellipse');

  // Text via the text tool: click on the canvas, type, escape.
  await page.evaluate(() => { H.clear(); H.tool('GTextTool'); });
  await page.mouse.click(400, 500); await page.waitForTimeout(500);
  await page.keyboard.type('Hello Gravit'); await page.waitForTimeout(300);
  await shot(page, '30-text-editing');
  out['text-editing'] = { panels: await panelDump(page, '.sidebar-container.sidebar-inspector') };
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.evaluate(() => { H.tool('GPointerTool'); const t = H.scene().querySingle('text'); if (t) H.select([t]); });
  await rec('text');

  // Path via the pen tool: three clicks, then Enter to finish.
  await page.evaluate(() => { H.clear(); H.tool('GPenTool'); });
  for (const [x, y] of [[700, 500], [800, 650], [900, 500]]) { await page.mouse.click(x, y); await page.waitForTimeout(200); }
  await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  await page.evaluate(() => { H.tool('GPointerTool'); const p = H.scene().querySingle('path'); if (p) H.select([p]); });
  await rec('path');

  // Group of rect + ellipse via the modify.group action.
  await page.evaluate(() => { const r = H.scene().querySingle('rectangle'), e = H.scene().querySingle('ellipse'); H.select([r, e]); });
  await rec('multi-rect-ellipse');
  out.groupResult = await page.evaluate(() => { H.action('modify.group'); return H.selection().map(n => n.getNodeName()); });
  await rec('group');

  // Image via File > Import > Place Image (falls back to <input type=file id=file-input> because FSA is hidden).
  const img = path.join(ROOT, 'samples', 'test-image.png');
  if (!fs.existsSync(img)) await page.screenshot({ path: img, clip: { x: 0, y: 0, width: 120, height: 80 } });
  await page.evaluate(() => H.clear());
  const fcP = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
  await page.evaluate(() => H.action('file.place-import'));
  const fc = await fcP;
  out.placeImageFileChooser = !!fc;
  if (fc) { await fc.setFiles(img); await page.waitForTimeout(2500); }
  out.afterImage = await page.evaluate(() => H.selection().map(n => n.getNodeName()));
  await rec('image');

  // Polygon / star / line through tools by dragging.
  for (const [tool, name, from, to] of [['GPolygonTool', 'polygon', [300, 700], [400, 800]], ['GStarTool', 'star', [450, 700], [550, 800]], ['GLineTool', 'line', [600, 700], [700, 800]], ['GTriangleTool', 'triangle', [750, 700], [850, 800]]]) {
    await page.evaluate((t) => { H.clear(); H.tool(t); }, tool);
    await page.mouse.move(...from); await page.mouse.down(); await page.mouse.move(...to, { steps: 8 }); await page.mouse.up();
    await page.waitForTimeout(400);
    await rec(name);
  }
  await page.evaluate(() => { H.tool('GPointerTool'); });

  // Page selected (click page in pages list) — fixed-size doc to see page inspector.
  // Left sidebar tabs
  out.leftTabs = await page.$$eval('#left-sidebars .sidebar-selector .sidebar-option', e => e.map(x => x.innerText.trim()));
  out.rightTabs = await page.$$eval('#right-sidebars .sidebar-selector .sidebar-option', e => e.map(x => x.innerText.trim()));
  out.leftPanels = {};
  for (const [i, t] of out.leftTabs.entries()) {
    await page.locator('#left-sidebars .sidebar-selector .sidebar-option').nth(i).click(); await page.waitForTimeout(800);
    await shot(page, `31-left-${t}`);
    out.leftPanels[t] = await page.evaluate(() => { const c = [...document.querySelectorAll('#left-sidebars .sidebar-container')].find(e => e.offsetParent !== null); return c ? { cls: c.className, text: c.innerText.replace(/\s*\n\s*/g, ' | ').slice(0, 2500), buttons: [...c.querySelectorAll('button, [data-title], [title]')].filter(e => e.offsetParent).map(b => (b.dataset.title || b.title || b.innerText || b.className).trim().slice(0, 50)) } : null; });
  }
  await page.locator('#left-sidebars .sidebar-selector .sidebar-option').nth(0).click();
  out.rightPanels = {};
  for (const [i, t] of out.rightTabs.entries()) {
    await page.locator('#right-sidebars .sidebar-selector .sidebar-option').nth(i).click(); await page.waitForTimeout(800);
    await shot(page, `32-right-${t}`);
    out.rightPanels[t] = await page.evaluate(() => { const c = [...document.querySelectorAll('#right-sidebars .sidebar-container')].find(e => e.offsetParent !== null); return c ? { cls: c.className, text: c.innerText.replace(/\s*\n\s*/g, ' | ').slice(0, 2500) } : null; });
  }
  await page.locator('#right-sidebars .sidebar-selector .sidebar-option').nth(0).click();
  // layer tree + pages toolbar buttons
  out.layersToolbar = await page.evaluate(() => [...document.querySelectorAll('#left-sidebars .sidebar-outline .toolbar *')].filter(e => e.offsetParent && (e.dataset.title || e.title)).map(e => e.dataset.title || e.title));
  out.layersTree = await page.evaluate(() => document.querySelector('#left-sidebars .layers-container').innerText.replace(/\s*\n\s*/g, ' | '));
  out.serialized = await page.evaluate(() => H.serialize());
  out.nodes = await page.evaluate(() => H.nodes());
  out.logs = logs.filter(l => !/GL Driver|willReadFrequently|ERR_NAME_NOT_RESOLVED/.test(l));
  fs.writeFileSync(ROOT + '/inspector.json', JSON.stringify(out, null, 1));
  for (const k of Object.keys(out)) if (out[k] && out[k].panels) { console.log('##', k, JSON.stringify(out[k].selection)); for (const p of out[k].panels) console.log('  -', p.cls, '::', p.text.slice(0, 400)); }
  console.log(JSON.stringify({ groupResult: out.groupResult, placeImageFileChooser: out.placeImageFileChooser, afterImage: out.afterImage, leftTabs: out.leftTabs, rightTabs: out.rightTabs, layersToolbar: out.layersToolbar, layersTree: out.layersTree, nodes: out.nodes, logs: out.logs }, null, 1));
  await browser.close();
})();
