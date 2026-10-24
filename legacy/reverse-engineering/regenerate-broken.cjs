/**
 * Regenerate Broken Files
 * 
 * For files that are syntactically broken beyond simple fixes,
 * regenerate them with just the essential structure:
 * - Constructor stub
 * - Proper inheritance
 * - Method stubs from the minified source
 * 
 * Usage: node regenerate-broken.cjs
 */

const fs = require('fs-extra');
const path = require('path');
const vm = require('vm');

const RECONSTRUCTED_DIR = path.join(__dirname, 'reconstructed');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Read bundles
let vendorCode, designerCode;

// Inheritance map from fix-parent-refs.cjs
const INHERITANCE_MAP = {
  'GAction': 'GObject',
  'GArrangeAction': 'GAction',
  'GCancelCropAction': 'GAction',
  'GClipAction': 'GAction',
  'GConvertToImageAction': 'GAction',
  'GConvertToPathAction': 'GAction',
  'GConvertToRawPathAction': 'GAction',
  'GCreateSymbolAction': 'GAction',
  'GCropAction': 'GAction',
  'GDeleteAction': 'GAction',
  'GDetachFromPathAction': 'GAction',
  'GDetachSymbolAction': 'GAction',
  'GDuplicateAction': 'GAction',
  'GExportAction': 'GAction',
  'GFitAllAction': 'GAction',
  'GGroupAction': 'GAction',
  'GJoinPathsAction': 'GAction',
  'GLinkImageAction': 'GAction',
  'GMagnificationAction': 'GAction',
  'GMaskWithShapeAction': 'GAction',
  'GCloudSynchronizationInfoAction': 'GAction',
  // Add more as needed
};

async function main() {
  console.log('🔄 Regenerating Broken Files');
  console.log('=============================\n');
  
  vendorCode = await fs.readFile(path.join(PUBLIC_DIR, 'chunk.vendor.js'), 'utf8');
  designerCode = await fs.readFile(path.join(PUBLIC_DIR, 'designer.browser.js'), 'utf8');
  
  let regenerated = 0;
  let skipped = 0;
  
  async function processDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processDir(fullPath);
      } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
        const content = await fs.readFile(fullPath, 'utf8');
        
        // Check if valid
        try {
          new vm.Script(content);
          skipped++;
        } catch (e) {
          // Needs regeneration
          const className = entry.name.replace('.js', '');
          const success = await regenerateFile(fullPath, className);
          if (success) {
            regenerated++;
          }
        }
      }
    }
  }
  
  await processDir(RECONSTRUCTED_DIR);
  
  console.log(`\n✅ Regenerated: ${regenerated}`);
  console.log(`⏭️ Skipped (already valid): ${skipped}`);
}

async function regenerateFile(filePath, className) {
  // Find class in bundles
  const code = designerCode.includes(`[Object ${className}]`) ? designerCode : vendorCode;
  
  // Find the toString pattern
  const toStringMatch = code.match(new RegExp(`\\[Object ${className}\\]`));
  if (!toStringMatch) {
    console.log(`   ⚠️ ${className}: Pattern not found`);
    return false;
  }
  
  const toStringPos = toStringMatch.index;
  
  // Extract a region around this pattern
  const start = Math.max(0, toStringPos - 50000);
  const end = Math.min(code.length, toStringPos + 20000);
  const region = code.substring(start, end);
  
  // Find all prototype methods for this class
  const methods = [];
  const protoPattern = new RegExp(`(\\w+)\\.prototype\\.(\\w+)\\s*=\\s*function\\s*\\(([^)]*)\\)`, 'g');
  
  let match;
  while ((match = protoPattern.exec(region)) !== null) {
    const [, varName, methodName, params] = match;
    // Only include if it's likely our class (check if toString is nearby)
    const distance = Math.abs(match.index - (toStringPos - start));
    if (distance < 30000) {
      methods.push({ varName, methodName, params });
    }
  }
  
  // Get parent class
  const parent = INHERITANCE_MAP[className] || 'GObject';
  
  // Generate clean file
  let source = `/**
 * ${className}
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

function ${className}() {
  // Constructor - see original minified source for details
}

GObject.inherit(${className}, ${parent});

`;

  // Add method stubs
  const seenMethods = new Set();
  for (const m of methods) {
    if (seenMethods.has(m.methodName)) continue;
    seenMethods.add(m.methodName);
    
    // Clean up params (convert minified to more readable)
    const cleanParams = m.params
      .split(',')
      .map((p, i) => {
        p = p.trim();
        if (!p) return '';
        // Keep original single-letter param names
        return p;
      })
      .filter(p => p)
      .join(', ');
    
    source += `${className}.prototype.${m.methodName} = function(${cleanParams}) {
  // Method implementation - see minified source
  throw new Error('Not implemented: ${className}.${m.methodName}');
};

`;
  }
  
  // Add toString
  if (!seenMethods.has('toString')) {
    source += `${className}.prototype.toString = function() {
  return "[Object ${className}]";
};

`;
  }
  
  source += `module.exports = ${className};\n`;
  
  // Verify syntax
  try {
    new vm.Script(source);
    await fs.writeFile(filePath, source);
    return true;
  } catch (e) {
    console.log(`   ❌ ${className}: Generated code has syntax error`);
    return false;
  }
}

main().catch(console.error);
