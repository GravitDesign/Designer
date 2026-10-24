/**
 * Gravit Designer - Reconstruct by Class Pattern
 * 
 * Finds classes via their [Object ClassName] toString pattern
 * and extracts the surrounding code block.
 * 
 * Usage: node reconstruct-by-pattern.cjs
 */

const fs = require('fs-extra');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ORIGINAL_DIR = path.join(__dirname, '..', '..', 'gravit-original', 'src');
const OUTPUT_DIR = path.join(__dirname, 'reconstructed');

// Category mapping
function getCategory(className) {
  if (!className) return 'infinity/other';
  
  // Core
  if (['GObject', 'GNode', 'GEvent', 'GEventTarget', 'GLocale', 'GUtil', 'GMath', 'GSystem', 'GLocaleKey', 'GLocaleLanguage', 'GActionable', 'GTransactionRecorder', 'GDictionary', 'GDate', 'GLength'].includes(className)) {
    return 'infinity/core';
  }
  
  // Application UI - Actions, Palettes, Panels, Sidebars, Properties
  if (className.match(/Action$/)) {
    return 'application/action';
  }
  if (className.match(/Palette$/)) {
    return 'application/palette';
  }
  if (className.match(/Panel$/)) {
    return 'application/panel';
  }
  if (className.match(/Sidebar$/)) {
    return 'application/sidebar';
  }
  if (className.match(/Properties$/)) {
    return 'application/properties';
  }
  
  // Application - Menus, Dialogs, Modules, etc.
  if (className.match(/^GMenu|^GDialog|^GContainer|^GView$|^GModule$|^GApplication|^GDocument/)) {
    return 'application';
  }
  
  // Cloud/Network
  if (className.match(/Cloud|Exception|Sharepoint|GoogleDrive|Storage/)) {
    return 'application/cloud';
  }
  
  // Events
  if (className.match(/Event$/)) {
    return 'application/event';
  }
  
  // Scene
  if (className.match(/Scene|Element|Layer|Page|Group|Block|Item|Symbol|Stylable|Style|Swatch|Background|Workspace|Annotable/)) {
    return 'infinity/scene';
  }
  
  // Vertex
  if (className.match(/Vertex/)) {
    return 'infinity/vertex';
  }
  
  // Shapes and paths
  if (className.match(/Path|Shape|Polygon|Ellipse|Rectangle|Compound|Connector|Slice|SimpleShape/)) {
    return 'infinity/scene';
  }
  
  // Geometry
  if (className.match(/Point|Rect|Transform|HitResult/)) {
    return 'infinity/geometry';
  }
  
  // Effects
  if (className.match(/Effect|Shadow|Blur|Glow|Mirror|Multi/)) {
    return 'infinity/effects';
  }
  
  // Paint/Rendering
  if (className.match(/Paint|Renderer|Canvas|Color|Gradient|Pattern|Bitmap|Image|WebGL/)) {
    return 'infinity/paint';
  }
  
  // Text
  if (className.match(/Text|Font|OpenType|TL/)) {
    return 'infinity/other';
  }
  
  // Annotations
  if (className.match(/Annotation|Comment/)) {
    return 'application/annotation';
  }
  
  // Editor
  if (className.match(/Editor|Guide|Tool/)) {
    return 'editor';
  }
  
  // Non-G* special classes
  if (className === 'License') {
    return 'application';
  }
  
  return 'infinity/other';
}

/**
 * Find all classes via their toString pattern and locate the exported variable
 */
function findClassesInCode(code) {
  const classes = [];
  
  // Find [Object ClassName] patterns - these are in toString methods
  // Capture both G* classes and other classes (CloudException, License, etc.)
  const toStringPattern = /\[Object ([A-Z][a-zA-Z]+)\]/g;
  let match;
  const foundNames = new Set();
  
  while ((match = toStringPattern.exec(code)) !== null) {
    const className = match[1];
    if (foundNames.has(className)) continue;
    foundNames.add(className);
    
    const pos = match.index;
    
    // Find the e.exports statement for this class (should be after the toString)
    // Search forward up to 10k chars for e.exports = varName
    const searchEnd = Math.min(code.length, pos + 20000);
    const afterCode = code.substring(pos, searchEnd);
    
    // Find the first e.exports in this region
    const exportMatch = afterCode.match(/e\.exports\s*=\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    
    if (exportMatch) {
      const exportedVar = exportMatch[1];
      const exportPos = pos + exportMatch.index;
      
      // Now find where this module starts - search backwards for the module function
      // Modules start with patterns like: function (e, t, i) {
      let moduleStart = pos;
      
      // Search backwards for the function header
      for (let i = pos; i > Math.max(0, pos - 50000); i--) {
        // Look for "function (e" or "function(e"
        if (code.substring(i, i + 11) === 'function (e' || 
            code.substring(i, i + 10) === 'function(e') {
          // Make sure this is a module function (has parameters like e, t or e, t, i)
          const funcHeader = code.substring(i, i + 30);
          if (funcHeader.match(/function\s*\(\s*e\s*,\s*t\s*(,\s*[a-z])?\s*\)/)) {
            moduleStart = i;
            break;
          }
        }
      }
      
      classes.push({
        name: className,
        toStringPos: pos,
        exportPos: exportPos,
        exportedVar: exportedVar,
        moduleStart: moduleStart
      });
    }
  }
  
  return classes;
}

/**
 * Extract the full class code by finding all references to the exported variable
 */
function extractClassCode(code, classInfo) {
  const { name, exportedVar, moduleStart, exportPos } = classInfo;
  
  // Extract from module start to export
  const moduleEnd = exportPos + 100; // A bit past the export
  let moduleCode = code.substring(moduleStart, moduleEnd);
  
  // Now collect all prototype and static methods for this variable
  const searchStart = Math.max(0, moduleStart - 1000);
  const searchEnd = Math.min(code.length, exportPos + 500);
  const fullSegment = code.substring(searchStart, searchEnd);
  
  const methods = [];
  const statics = [];
  
  // Find prototype methods: varName.prototype.methodName = function
  const protoPattern = new RegExp(
    `${exportedVar}\\.prototype\\.(\\w+)\\s*=\\s*function\\s*\\([^)]*\\)\\s*\\{`,
    'g'
  );
  
  let match;
  while ((match = protoPattern.exec(fullSegment)) !== null) {
    const methodName = match[1];
    const methodStart = match.index;
    
    // Find the end of the function
    let braceCount = 1;
    let pos = methodStart + match[0].length;
    
    while (pos < fullSegment.length && braceCount > 0) {
      const char = fullSegment[pos];
      
      // Skip strings
      if (char === '"' || char === "'" || char === '`') {
        const quote = char;
        pos++;
        while (pos < fullSegment.length) {
          if (fullSegment[pos] === '\\') {
            pos += 2;
            continue;
          }
          if (fullSegment[pos] === quote) {
            pos++;
            break;
          }
          pos++;
        }
        continue;
      }
      
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      pos++;
    }
    
    const methodCode = fullSegment.substring(methodStart, pos);
    methods.push({ name: methodName, code: methodCode });
  }
  
  // Find static methods: varName.staticName = function
  const staticPattern = new RegExp(
    `${exportedVar}\\.(\\w+)\\s*=\\s*function\\s*\\([^)]*\\)\\s*\\{`,
    'g'
  );
  
  while ((match = staticPattern.exec(fullSegment)) !== null) {
    const methodName = match[1];
    if (methodName === 'prototype') continue;
    
    const methodStart = match.index;
    let braceCount = 1;
    let pos = methodStart + match[0].length;
    
    while (pos < fullSegment.length && braceCount > 0) {
      const char = fullSegment[pos];
      
      if (char === '"' || char === "'" || char === '`') {
        const quote = char;
        pos++;
        while (pos < fullSegment.length) {
          if (fullSegment[pos] === '\\') {
            pos += 2;
            continue;
          }
          if (fullSegment[pos] === quote) {
            pos++;
            break;
          }
          pos++;
        }
        continue;
      }
      
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      pos++;
    }
    
    const methodCode = fullSegment.substring(methodStart, pos);
    statics.push({ name: methodName, code: methodCode });
  }
  
  // Find static properties
  const propPattern = new RegExp(
    `${exportedVar}\\.(\\w+)\\s*=\\s*(?!function)([^;]+);`,
    'g'
  );
  
  while ((match = propPattern.exec(fullSegment)) !== null) {
    const propName = match[1];
    if (propName === 'prototype') continue;
    
    statics.push({ 
      name: propName, 
      code: match[0],
      isProperty: true 
    });
  }
  
  // Find inheritance call
  let inheritance = null;
  const inheritPattern = new RegExp(
    `\\w+\\.inherit\\s*\\(\\s*${exportedVar}\\s*,\\s*(\\w+)\\s*\\)`,
    'g'
  );
  if ((match = inheritPattern.exec(fullSegment)) !== null) {
    inheritance = { type: 'inherit', parent: match[1] };
  }
  
  const mixPattern = new RegExp(
    `\\w+\\.inheritAndMix\\s*\\(\\s*${exportedVar}\\s*,\\s*(\\w+|null)\\s*,\\s*\\[([^\\]]+)\\]`,
    'g'
  );
  if ((match = mixPattern.exec(fullSegment)) !== null) {
    inheritance = { 
      type: 'inheritAndMix', 
      parent: match[1] !== 'null' ? match[1] : null,
      mixins: match[2].split(',').map(m => m.trim())
    };
  }
  
  // Find constructor
  let constructor = null;
  const constructorPattern = new RegExp(
    `function\\s+${exportedVar}\\s*\\([^)]*\\)\\s*\\{`,
    'g'
  );
  if ((match = constructorPattern.exec(fullSegment)) !== null) {
    const start = match.index;
    let braceCount = 1;
    let pos = start + match[0].length;
    
    while (pos < fullSegment.length && braceCount > 0) {
      const char = fullSegment[pos];
      
      if (char === '"' || char === "'" || char === '`') {
        const quote = char;
        pos++;
        while (pos < fullSegment.length) {
          if (fullSegment[pos] === '\\') {
            pos += 2;
            continue;
          }
          if (fullSegment[pos] === quote) {
            pos++;
            break;
          }
          pos++;
        }
        continue;
      }
      
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      pos++;
    }
    
    constructor = fullSegment.substring(start, pos);
  }
  
  return { constructor, inheritance, methods, statics };
}

/**
 * Rename minified variable to proper class name in code
 */
function renameVariableToClass(code, minifiedVar, className) {
  // Only replace if the variable is more than one character (single letter vars are too common)
  if (minifiedVar.length < 2) {
    // For single-letter vars, be very conservative - only replace clear patterns
    let result = code;
    
    // Constructor: function varName( -> function ClassName(
    result = result.replace(
      new RegExp(`function\\s+${minifiedVar}\\s*\\(`, 'g'),
      `function ${className}(`
    );
    
    // Prototype at word boundary: \bvarName.prototype
    result = result.replace(
      new RegExp(`([^a-zA-Z0-9_$])${minifiedVar}\\.prototype`, 'g'),
      `$1${className}.prototype`
    );
    
    // Starting with prototype
    result = result.replace(
      new RegExp(`^${minifiedVar}\\.prototype`, 'gm'),
      `${className}.prototype`
    );
    
    return result;
  }
  
  // For multi-character variables, do more replacements
  let result = code;
  
  // Constructor: function varName( -> function ClassName(
  result = result.replace(
    new RegExp(`function\\s+${minifiedVar}\\s*\\(`, 'g'),
    `function ${className}(`
  );
  
  // Prototype: varName.prototype -> ClassName.prototype (with word boundary)
  result = result.replace(
    new RegExp(`\\b${minifiedVar}\\.prototype`, 'g'),
    `${className}.prototype`
  );
  
  // Static references with word boundary: \bvarName.something -> ClassName.something
  result = result.replace(
    new RegExp(`\\b${minifiedVar}\\.(?!prototype)`, 'g'),
    `${className}.`
  );
  
  // In function calls with this class: (varName, -> (ClassName,
  result = result.replace(
    new RegExp(`\\(${minifiedVar},`, 'g'),
    `(${className},`
  );
  
  // In arrays: [varName] -> [ClassName]
  result = result.replace(
    new RegExp(`\\[${minifiedVar}\\]`, 'g'),
    `[${className}]`
  );
  
  // instanceof checks
  result = result.replace(
    new RegExp(`instanceof\\s+${minifiedVar}\\b`, 'g'),
    `instanceof ${className}`
  );
  
  return result;
}

/**
 * Generate reconstructed source file
 */
function generateSource(className, classData, exportedVar) {
  let source = `/**
 * ${className}
 * 
 * Part of the Gravit Designer core engine
 * Reconstructed from minified source
 */

`;

  // Constructor
  if (classData.constructor) {
    source += renameVariableToClass(classData.constructor, exportedVar, className);
    source += '\n\n';
  } else {
    source += `function ${className}() {\n  // Constructor (reconstructed)\n}\n\n`;
  }
  
  // Inheritance
  if (classData.inheritance) {
    if (classData.inheritance.type === 'inheritAndMix') {
      const parent = classData.inheritance.parent || 'null';
      const mixins = classData.inheritance.mixins.join(', ');
      source += `GObject.inheritAndMix(${className}, ${parent}, [${mixins}]);\n\n`;
    } else {
      source += `GObject.inherit(${className}, ${classData.inheritance.parent});\n\n`;
    }
  }
  
  // Prototype methods
  if (classData.methods.length > 0) {
    source += '// Prototype methods\n';
    for (const method of classData.methods) {
      source += renameVariableToClass(method.code, exportedVar, className);
      source += '\n\n';
    }
  }
  
  // Static methods and properties
  if (classData.statics.length > 0) {
    source += '// Static methods and properties\n';
    for (const stat of classData.statics) {
      source += renameVariableToClass(stat.code, exportedVar, className);
      source += '\n\n';
    }
  }
  
  // Export
  source += `module.exports = ${className};\n`;
  
  return source;
}

async function main() {
  console.log('🔧 Gravit Designer Pattern-Based Reconstructor');
  console.log('===============================================\n');
  
  // Create output directories
  const dirs = [
    'infinity/core', 'infinity/scene', 'infinity/geometry', 'infinity/vertex',
    'infinity/paint', 'infinity/effects', 'infinity/event', 'infinity/other',
    'editor', 'application', 'application/action', 'application/palette',
    'application/panel', 'application/sidebar', 'application/properties',
    'application/cloud', 'application/event', 'application/annotation'
  ];
  
  for (const dir of dirs) {
    await fs.ensureDir(path.join(OUTPUT_DIR, dir));
  }
  
  // Read vendor bundle
  const vendorPath = path.join(PUBLIC_DIR, 'chunk.vendor.js');
  const vendorCode = await fs.readFile(vendorPath, 'utf8');
  
  console.log(`📄 Loaded vendor bundle (${(vendorCode.length / 1024 / 1024).toFixed(2)} MB)`);
  
  // Find classes
  console.log('🔍 Finding classes by pattern...');
  const classes = findClassesInCode(vendorCode);
  console.log(`📊 Found ${classes.length} G* classes\n`);
  
  // Extract and reconstruct each class
  let reconstructed = 0;
  let failed = 0;
  
  for (const classInfo of classes) {
    try {
      const classData = extractClassCode(vendorCode, classInfo);
      
      // Only save if we found meaningful code
      if (classData.constructor || classData.methods.length > 0 || classData.statics.length > 0) {
        const source = generateSource(classInfo.name, classData, classInfo.exportedVar);
        
        const category = getCategory(classInfo.name);
        const outputPath = path.join(OUTPUT_DIR, category, `${classInfo.name}.js`);
        
        await fs.writeFile(outputPath, source);
        reconstructed++;
        
        if (reconstructed % 20 === 0) {
          console.log(`   Reconstructed ${reconstructed} classes...`);
        }
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
      // console.log(`   ⚠️ ${classInfo.name}: ${err.message}`);
    }
  }
  
  console.log(`\n✅ Reconstructed ${reconstructed} classes`);
  if (failed > 0) {
    console.log(`⚠️ ${failed} classes had insufficient code`);
  }
  
  // Also process designer bundle for additional classes
  console.log('\n📄 Processing designer bundle...');
  const designerPath = path.join(PUBLIC_DIR, 'designer.browser.js');
  const designerCode = await fs.readFile(designerPath, 'utf8');
  
  const designerClasses = findClassesInCode(designerCode);
  let designerReconstructed = 0;
  
  for (const classInfo of designerClasses) {
    // Skip if already processed from vendor
    const existingPath = path.join(OUTPUT_DIR, getCategory(classInfo.name), `${classInfo.name}.js`);
    if (await fs.pathExists(existingPath)) continue;
    
    try {
      const classData = extractClassCode(designerCode, classInfo);
      
      if (classData.constructor || classData.methods.length > 0 || classData.statics.length > 0) {
        const source = generateSource(classInfo.name, classData, classInfo.exportedVar);
        
        const category = getCategory(classInfo.name);
        const outputPath = path.join(OUTPUT_DIR, category, `${classInfo.name}.js`);
        
        await fs.writeFile(outputPath, source);
        designerReconstructed++;
      }
    } catch (err) {
      // Skip
    }
  }
  
  console.log(`✅ Reconstructed ${designerReconstructed} additional classes from designer bundle`);
  
  // Create index
  await createIndex();
  
  // Show output structure
  console.log('\n📁 Output structure:');
  for (const dir of dirs) {
    const dirPath = path.join(OUTPUT_DIR, dir);
    if (await fs.pathExists(dirPath)) {
      const files = await fs.readdir(dirPath);
      const jsFiles = files.filter(f => f.endsWith('.js'));
      if (jsFiles.length > 0) {
        console.log(`   ${dir}/  - ${jsFiles.length} files`);
      }
    }
  }
}

async function createIndex() {
  const files = [];
  
  async function scanDir(dir) {
    if (!(await fs.pathExists(dir))) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
        files.push({
          name: entry.name.replace('.js', ''),
          path: path.relative(OUTPUT_DIR, fullPath).replace(/\\/g, '/')
        });
      }
    }
  }
  
  await scanDir(OUTPUT_DIR);
  
  let indexContent = `/**
 * Gravit Designer - Reconstructed Source Index
 * Auto-generated
 */

`;

  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    indexContent += `exports.${file.name} = require('./${file.path}');\n`;
  }
  
  await fs.writeFile(path.join(OUTPUT_DIR, 'index.js'), indexContent);
  console.log('✅ Created index.js');
}

main().catch(console.error);
