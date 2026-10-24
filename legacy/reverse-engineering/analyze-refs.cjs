/**
 * Analyze references in reconstructed code to understand what imports are needed
 */

const fs = require('fs');
const path = require('path');

const RECONSTRUCTED_DIR = path.join(__dirname, 'reconstructed');

function getAllJsFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            files.push(...getAllJsFiles(fullPath));
        } else if (item.endsWith('.js') && item !== 'index.js') {
            files.push(fullPath);
        }
    }
    return files;
}

// Common patterns to look for
const patterns = [
    // Module references like r.gApi, l.default, i.GSystem
    /\b([a-z])\.([A-Z][a-zA-Z0-9]+)/g,
    // Direct class references
    /\bG[A-Z][a-zA-Z0-9]+\b/g,
    // gDesigner global
    /\bgDesigner\b/g,
    // jQuery
    /\$\(/g,
    // Promise patterns
    /Promise\.(resolve|reject|all)/g,
];

const references = {
    moduleRefs: new Map(),  // r.Something -> count
    classRefs: new Set(),   // GClassName
    globals: new Set(),     // gDesigner, $, etc.
};

const files = getAllJsFiles(RECONSTRUCTED_DIR);
console.log(`\nAnalyzing ${files.length} reconstructed files...\n`);

for (const file of files) {
    const code = fs.readFileSync(file, 'utf8');
    
    // Find module.property patterns (minified refs)
    const moduleRefPattern = /\b([a-z])\.([A-Z][a-zA-Z0-9]+)\b/g;
    let match;
    while ((match = moduleRefPattern.exec(code)) !== null) {
        const ref = `${match[1]}.${match[2]}`;
        references.moduleRefs.set(ref, (references.moduleRefs.get(ref) || 0) + 1);
    }
    
    // Find G-prefixed class names
    const classPattern = /\b(G[A-Z][a-zA-Z0-9]+)\b/g;
    while ((match = classPattern.exec(code)) !== null) {
        references.classRefs.add(match[1]);
    }
    
    // Find globals
    if (code.includes('gDesigner')) references.globals.add('gDesigner');
    if (code.includes('$(')) references.globals.add('jQuery/$');
    if (code.includes('Promise.')) references.globals.add('Promise');
    if (code.includes('console.')) references.globals.add('console');
}

// Sort and display module refs by frequency
console.log('=== Module References (minified) ===');
const sortedRefs = [...references.moduleRefs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50);
for (const [ref, count] of sortedRefs) {
    console.log(`  ${ref}: ${count}`);
}

console.log('\n=== Globals Used ===');
for (const g of references.globals) {
    console.log(`  ${g}`);
}

console.log('\n=== G-Classes Referenced (sample) ===');
const gClasses = [...references.classRefs].sort().slice(0, 30);
for (const c of gClasses) {
    console.log(`  ${c}`);
}

console.log(`\n  ... and ${references.classRefs.size - 30} more classes`);
