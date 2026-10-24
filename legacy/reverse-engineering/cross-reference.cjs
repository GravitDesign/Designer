/**
 * Cross-Reference with Original Source
 * 
 * Compares reconstructed code with original open-source code
 * to improve documentation and variable naming.
 * 
 * Usage: node cross-reference.cjs
 */

const fs = require('fs-extra');
const path = require('path');

const ORIGINAL_DIR = path.join(__dirname, '..', '..', 'gravit-original', 'src');
const RECONSTRUCTED_DIR = path.join(__dirname, 'reconstructed');

// Extract method info from original source
function parseOriginalClass(code, className) {
  const info = {
    className,
    extends_: null,
    methods: {},
    staticProps: {},
    jsdoc: null
  };
  
  // Find class JSDoc
  const classDocPattern = new RegExp(
    `/\\*\\*[^*]*\\*[^/]*@class\\s+${className}[\\s\\S]*?\\*/`,
    'm'
  );
  const classDocMatch = code.match(classDocPattern);
  if (classDocMatch) {
    info.jsdoc = classDocMatch[0];
  }
  
  // Find inheritance: IFObject.inherit(ClassName, ParentName)
  const inheritPattern = new RegExp(`IFObject\\.inherit\\s*\\(\\s*${className}\\s*,\\s*(\\w+)\\s*\\)`);
  const inheritMatch = code.match(inheritPattern);
  if (inheritMatch) {
    info.extends_ = inheritMatch[1];
  }
  
  // Find methods: ClassName.prototype.methodName = function...
  const methodPattern = new RegExp(
    `${className}\\.prototype\\.(\\w+)\\s*=\\s*function\\s*\\(([^)]*)\\)`,
    'g'
  );
  
  let match;
  while ((match = methodPattern.exec(code)) !== null) {
    const methodName = match[1];
    const params = match[2].split(',').map(p => p.trim()).filter(p => p);
    
    // Look for JSDoc before this method
    const methodPos = match.index;
    const beforeMethod = code.substring(Math.max(0, methodPos - 500), methodPos);
    const jsdocMatch = beforeMethod.match(/\/\*\*[\s\S]*?\*\/\s*$/);
    
    info.methods[methodName] = {
      params,
      jsdoc: jsdocMatch ? jsdocMatch[0].trim() : null
    };
  }
  
  // Find static properties: ClassName.PROPERTY = value
  const staticPattern = new RegExp(
    `${className}\\.(\\w+)\\s*=\\s*([^;]+);`,
    'g'
  );
  
  while ((match = staticPattern.exec(code)) !== null) {
    const propName = match[1];
    if (propName !== 'prototype') {
      info.staticProps[propName] = match[2].trim();
    }
  }
  
  return info;
}

// Find original source file for a class
async function findOriginalFile(className) {
  // Map G* prefix to IF* prefix (original used IF prefix)
  const ifClassName = className.replace(/^G/, 'IF');
  
  // Extract base name without prefix for file matching
  // GObject -> object, GNode -> node, GRectangle -> rectangle
  const baseName = className.replace(/^G/, '').toLowerCase();
  
  // Search the original directory
  async function searchDir(dir) {
    if (!(await fs.pathExists(dir))) return null;
    
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const found = await searchDir(fullPath);
        if (found) return found;
      } else if (entry.name.endsWith('.js')) {
        const lowerName = entry.name.toLowerCase().replace('.js', '');
        // Match: object.js for GObject, rectangle.js for GRectangle
        if (lowerName === baseName) {
          // Verify the file contains the class
          const content = await fs.readFile(fullPath, 'utf8');
          if (content.includes(`function ${ifClassName}`) || 
              content.includes(`function ${className}`) ||
              content.includes(`@class ${ifClassName}`) ||
              content.includes(`@class ${className}`)) {
            return fullPath;
          }
        }
      }
    }
    return null;
  }
  
  return searchDir(ORIGINAL_DIR);
}

// Update reconstructed file with original info
async function enhanceReconstructedFile(filePath, originalInfo) {
  let content = await fs.readFile(filePath, 'utf8');
  const className = path.basename(filePath, '.js');
  let modified = false;
  
  // Add class JSDoc if available and not present
  if (originalInfo.jsdoc && !content.includes('@class')) {
    content = content.replace(
      `/**\n * ${className}\n * \n * Part of the Gravit Designer core engine\n * Reconstructed from minified source\n */`,
      originalInfo.jsdoc.replace(/@class\s+IF/, '@class G')
    );
    modified = true;
  }
  
  // Add method parameter names from original
  for (const [methodName, methodInfo] of Object.entries(originalInfo.methods)) {
    if (methodInfo.params.length > 0) {
      // Replace minified params like (e, t, i) with original names
      const originalParams = methodInfo.params.join(', ');
      const methodRegex = new RegExp(
        `(${className}\\.prototype\\.${methodName}\\s*=\\s*function\\s*)\\([^)]*\\)`,
        'g'
      );
      
      const newContent = content.replace(methodRegex, `$1(${originalParams})`);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    }
    
    // Add JSDoc for methods if available
    if (methodInfo.jsdoc) {
      const methodPattern = new RegExp(
        `(${className}\\.prototype\\.${methodName}\\s*=)`,
        'g'
      );
      
      if (!content.includes(`/** @override */\n${className}.prototype.${methodName}`)) {
        const replacement = methodInfo.jsdoc + '\n$1';
        const newContent = content.replace(methodPattern, replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
        }
      }
    }
  }
  
  if (modified) {
    await fs.writeFile(filePath, content);
    return true;
  }
  
  return false;
}

async function main() {
  console.log('📚 Cross-Referencing with Original Source');
  console.log('==========================================\n');
  
  let processed = 0;
  let enhanced = 0;
  let noOriginal = 0;
  
  // Process all reconstructed files
  async function processDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processDir(fullPath);
      } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
        const className = entry.name.replace('.js', '');
        processed++;
        
        // Find corresponding original file
        const originalPath = await findOriginalFile(className);
        
        if (originalPath) {
          const originalCode = await fs.readFile(originalPath, 'utf8');
          const originalInfo = parseOriginalClass(originalCode, className);
          
          // Also check IF* version
          const ifClassName = className.replace(/^G/, 'IF');
          const ifOriginalInfo = parseOriginalClass(originalCode, ifClassName);
          
          // Merge info
          const mergedInfo = {
            ...originalInfo,
            methods: { ...ifOriginalInfo.methods, ...originalInfo.methods },
            staticProps: { ...ifOriginalInfo.staticProps, ...originalInfo.staticProps },
            jsdoc: originalInfo.jsdoc || ifOriginalInfo.jsdoc
          };
          
          const wasEnhanced = await enhanceReconstructedFile(fullPath, mergedInfo);
          if (wasEnhanced) {
            enhanced++;
            if (enhanced % 10 === 0) {
              console.log(`   Enhanced ${enhanced} files...`);
            }
          }
        } else {
          noOriginal++;
        }
      }
    }
  }
  
  await processDir(RECONSTRUCTED_DIR);
  
  console.log(`\n✅ Processed ${processed} files`);
  console.log(`   Enhanced: ${enhanced}`);
  console.log(`   No original source: ${noOriginal}`);
}

main().catch(console.error);
