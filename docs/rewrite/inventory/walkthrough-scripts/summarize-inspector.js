const r = require('../inspector.json');
const BL = /Normal \| Darken \| Multiply[^]*?Sine \*( \| Mask \| Inverse Mask)?/g;
for (const k of Object.keys(r)) {
  if (!r[k] || !r[k].panels) continue;
  console.log('## ' + k + ' sel=' + JSON.stringify(r[k].selection));
  for (const p of r[k].panels) {
    const t = p.text.replace(BL, '[blend modes]');
    const inputs = p.inputs.map(i => i.replace(/\{Normal\|Darken[^}]*\}/, '{blend modes}'));
    if (!t && !inputs.length) continue;
    console.log('  - ' + p.cls.replace(/properties-panel |toolbar |appearance-panel-toggle-btn |accordion/g, '').trim() + ' :: ' + t + (inputs.length ? '\n      inputs: ' + inputs.join(', ') : ''));
  }
}
