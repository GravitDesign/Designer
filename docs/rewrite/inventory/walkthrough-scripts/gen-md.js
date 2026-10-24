// Generates markdown fragments (menus, toolbar, presets) from the JSON captures.
const fs = require('fs');
const menus = require('../menus.json');
const tb = require('../toolbar.json');
const presets = require('../presets.json');
let n = 0; const id = () => 'RUN-MENU-' + String(++n).padStart(3, '0');
const out = [];
function flat(items, path, emptyItems) {
  let sep = 0;
  for (let i = 0; i < (items || []).length; i++) {
    const it = items[i]; if (it.hidden) continue;
    if (it.divider) { sep++; continue; }
    const e = (emptyItems || []).find(x => !x.divider && !x.hidden && x.caption === it.caption) || (it.caption.startsWith('Undo') ? (emptyItems || []).find(x => (x.caption || '').startsWith('Undo')) : null);
    const p = path + ' > ' + it.caption;
    const bits = [];
    if (it.shortcut) bits.push('shortcut ' + it.shortcut);
    const dEmpty = e ? e.disabled : null, dRect = it.disabled;
    if (dEmpty && dRect) bits.push('disabled in both states');
    else if (dEmpty && !dRect) bits.push('disabled in the empty document, enabled with a selected rectangle');
    else if (!dEmpty && dRect) bits.push('enabled in the empty document, disabled with a selected rectangle');
    else bits.push('enabled');
    if (/checked/.test(it.cls)) bits.push('checked by default');
    if (it.sub) bits.push('submenu');
    if (sep) bits.push(`after a separator`);
    if (e && e.caption !== it.caption) bits.push(`label in the empty document: "${e.caption}"`);
    out.push(`- [ ] ${id()} ${p}: ${bits.join('; ')}`);
    sep = 0;
    if (it.children) flat(it.children, p, e && e.children);
  }
}
for (const top of Object.keys(menus.rect)) { out.push(`\n### ${top}\n`); flat(menus.rect[top], top, menus.empty[top]); }
fs.writeFileSync('../gen-menus.md', out.join('\n'));
// toolbar
let t = 0; const tid = () => 'RUN-SHELL-' + String(++t).padStart(3, '0');
const tbo = tb.map(b => `- [ ] ${tid()} Toolbar button "${b.title}": section ${b.section.replace(/-$/, '')}; ${b.action ? 'data-action ' + b.action + '; ' : ''}icon ${String(b.icon).split(' ').filter(c => c.startsWith('gravit-')).join(' ')}; ${b.disabled ? 'disabled in the empty document; ' : ''}${b.active ? 'active; ' : ''}tooltip "${b.tooltip}"${b.menu ? '; dropdown: ' + b.menu.join(' / ') : ''}`);
fs.writeFileSync('../gen-toolbar.md', tbo.join('\n'));
const po = Object.entries(presets).map(([k, v]) => `${k} (${v.list.length}): ${v.list.join('; ')}`);
fs.writeFileSync('../gen-presets.md', po.join('\n'));
console.log(n, 'menu items');
