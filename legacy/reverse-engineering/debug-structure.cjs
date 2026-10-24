/**
 * Debug script - find module boundaries correctly
 */
const fs = require('fs');
const code = fs.readFileSync('../public/chunk.vendor.js', 'utf8');

const MODULE_MAP = require('./extracted-modules/module-map.json');

// Count true module transitions using: }, followed by optional whitespace and comma, then function
// This pattern marks the boundary between webpack modules
const pattern = /\}\s*,\s*\n?\s*function\s*\(/g;
let count = 0;
let match;
const boundaries = [0]; // First module starts at beginning

while ((match = pattern.exec(code)) !== null) {
  boundaries.push(match.index);
  count++;
  if (count <= 10) {
    console.log(`Module boundary ${count} at position ${match.index}:`, 
      code.substring(match.index, match.index + 50).replace(/\n/g, ' '));
  }
}

console.log(`\nTotal module transitions found: ${count}`);
console.log(`Expected modules from map: ${Object.keys(MODULE_MAP).length}`);

// Also count empty slots (,,)
const emptyPattern = /\}\s*,\s*,/g;
let emptyCount = 0;
while (emptyPattern.exec(code) !== null) {
  emptyCount++;
}
console.log(`Empty module slots: ${emptyCount}`);

// Try a simpler approach - look for e.exports patterns
console.log('\n\nSearching for module exports...');
const exportPattern = /e\.exports\s*=\s*(\w+)[;\s]/g;
const moduleExports = [];
while ((match = exportPattern.exec(code)) !== null) {
  moduleExports.push({ pos: match.index, varName: match[1] });
  if (moduleExports.length <= 10) {
    console.log(`Export at ${match.index}: e.exports = ${match[1]}`);
  }
}
console.log(`Total e.exports statements: ${moduleExports.length}`);

// Look for class toString patterns to find class definitions
console.log('\n\nSearching for class toString patterns...');
const toStringPattern = /\[Object (G\w+)\]/g;
const classes = [];
while ((match = toStringPattern.exec(code)) !== null) {
  if (!classes.find(c => c.name === match[1])) {
    classes.push({ name: match[1], pos: match.index });
  }
}
console.log(`Unique G* classes found: ${classes.length}`);
console.log('First 20:', classes.slice(0, 20).map(c => c.name).join(', '));
