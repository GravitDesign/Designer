/**
 * Variable Renaming Pass
 * 
 * Improves code readability by renaming common minified variables
 * to more meaningful names based on their usage patterns.
 * 
 * Usage: node rename-variables.cjs
 */

const fs = require('fs-extra');
const path = require('path');
const vm = require('vm');

const RECONSTRUCTED_DIR = path.join(__dirname, 'reconstructed');

// Common patterns for variable renaming
const RENAME_PATTERNS = [
  // Boolean returns
  { pattern: /return !0;/g, replace: 'return true;' },
  { pattern: /return !1;/g, replace: 'return false;' },
  { pattern: /=\s*!0/g, replace: '= true' },
  { pattern: /=\s*!1/g, replace: '= false' },
  
  // void 0 -> undefined
  { pattern: /void 0/g, replace: 'undefined' },
  
  // Common method parameter names based on usage
  // e is often 'event' in handlers, but could be 'element' elsewhere
  // We'll be conservative here
];

// Context-based renaming rules
const CONTEXT_RENAMES = {
  // If method name contains these patterns, rename params accordingly
  'Event': { 'e': 'event' },
  'Click': { 'e': 'event' },
  'Mouse': { 'e': 'event' },
  'Key': { 'e': 'event' },
  'Handler': { 'e': 'event' },
  
  'Element': { 'e': 'element' },
  'Node': { 'e': 'node', 'n': 'node' },
  
  'Point': { 'p': 'point', 'e': 'point' },
  'Rect': { 'r': 'rect' },
  'Transform': { 't': 'transform' },
  
  'Color': { 'c': 'color' },
  'Paint': { 'p': 'paint' },
  
  'Index': { 'i': 'index' },
  'Count': { 'n': 'count' },
  'Length': { 'l': 'length' },
  
  'get': { 'e': 'value' },
  'set': { 'e': 'value' },
  
  'render': { 'e': 'context', 'c': 'context' },
  'draw': { 'e': 'context', 'c': 'context' },
};

async function main() {
  console.log('📝 Variable Renaming Pass');
  console.log('==========================\n');
  
  let modified = 0;
  let unchanged = 0;
  
  async function processDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processDir(fullPath);
      } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
        const wasModified = await renameInFile(fullPath);
        if (wasModified) {
          modified++;
        } else {
          unchanged++;
        }
      }
    }
  }
  
  await processDir(RECONSTRUCTED_DIR);
  
  console.log(`\n✅ Modified: ${modified}`);
  console.log(`⏭️ Unchanged: ${unchanged}`);
}

async function renameInFile(filePath) {
  let content = await fs.readFile(filePath, 'utf8');
  const originalContent = content;
  
  // Apply global patterns
  for (const { pattern, replace } of RENAME_PATTERNS) {
    content = content.replace(pattern, replace);
  }
  
  // If changed, verify syntax is still valid
  if (content !== originalContent) {
    try {
      new vm.Script(content);
      await fs.writeFile(filePath, content);
      return true;
    } catch (e) {
      // Revert changes - they broke syntax
      return false;
    }
  }
  
  return false;
}

main().catch(console.error);
