/**
 * Fix Syntax Errors
 * 
 * Cleans up common syntax errors from extraction:
 * - Dangling commas in expressions like `= 500),`
 * - Incomplete code blocks
 * - Duplicate method definitions
 * 
 * Usage: node fix-syntax.cjs
 */

const fs = require('fs-extra');
const path = require('path');
const vm = require('vm');

const RECONSTRUCTED_DIR = path.join(__dirname, 'reconstructed');

// Common fix patterns
const FIXES = [
  // Fix dangling comma after assignments: = value), -> = value;
  { pattern: /=\s*([^,;]+)\),\s*$/gm, replace: '= $1;' },
  
  // Fix dangling comma at line end: ),$ -> );
  { pattern: /\),\s*$/gm, replace: ');' },
  
  // Fix incomplete function at end of file before module.exports
  { pattern: /return [^;]+\n\nmodule\.exports/g, replace: (m) => m.replace('\n\nmodule.exports', ';\n}\n\nmodule.exports') },
  
  // Remove duplicate static method definitions
  // Keep only the first occurrence of each static
];

async function main() {
  console.log('🔧 Fixing Syntax Errors');
  console.log('========================\n');
  
  let fixed = 0;
  let stillBroken = 0;
  const remaining = [];
  
  async function processDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processDir(fullPath);
      } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
        const wasFixed = await fixFile(fullPath);
        if (wasFixed === true) {
          fixed++;
        } else if (wasFixed === false) {
          stillBroken++;
          remaining.push(path.relative(RECONSTRUCTED_DIR, fullPath));
        }
      }
    }
  }
  
  async function fixFile(filePath) {
    let content = await fs.readFile(filePath, 'utf8');
    const originalContent = content;
    
    // First check if it's already valid
    try {
      new vm.Script(content);
      return null; // Already valid
    } catch (e) {
      // Needs fixing
    }
    
    // Apply fixes
    
    // 1. Remove code after module.exports that starts with dangling expressions
    const exportIndex = content.lastIndexOf('module.exports');
    if (exportIndex > 0) {
      // Find the export statement end
      const afterExport = content.substring(exportIndex);
      const exportMatch = afterExport.match(/module\.exports\s*=\s*\w+;?\s*/);
      if (exportMatch) {
        // Keep only up to and including the module.exports line
        content = content.substring(0, exportIndex + exportMatch[0].length);
      }
    }
    
    // 2. Remove duplicate method definitions (keep first occurrence)
    const seenMethods = new Set();
    const lines = content.split('\n');
    const cleanedLines = [];
    let skipUntilMethod = false;
    let braceCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for method definition
      const protoMatch = line.match(/(\w+)\.prototype\.(\w+)\s*=\s*function/);
      const staticMatch = line.match(/^(\w+)\.(\w+)\s*=\s*function/) && !line.includes('.prototype.');
      
      if (protoMatch) {
        const key = `proto.${protoMatch[2]}`;
        if (seenMethods.has(key)) {
          // Skip this duplicate method
          skipUntilMethod = true;
          braceCount = 0;
          continue;
        }
        seenMethods.add(key);
      }
      
      if (skipUntilMethod) {
        // Count braces to find end of function
        for (const char of line) {
          if (char === '{') braceCount++;
          else if (char === '}') braceCount--;
        }
        
        if (braceCount <= 0 && line.includes('}')) {
          skipUntilMethod = false;
        }
        continue;
      }
      
      // Check for invalid lines
      if (line.match(/^\s*\([a-z]\.[A-Z]/)) {
        // Line starting with (s.SOMETHING - likely broken comma expression
        continue;
      }
      
      if (line.match(/^\s*=\s*\d+\),/)) {
        // Line like "= 500)," - broken
        continue;
      }
      
      cleanedLines.push(line);
    }
    
    content = cleanedLines.join('\n');
    
    // 3. Fix any remaining dangling syntax
    content = content.replace(/\),\s*\n\s*\(/g, ');\n(');
    content = content.replace(/=\s*(\d+)\),/g, '= $1;');
    
    // 4. Remove lines that are just closing parens from comma expressions
    content = content
      .split('\n')
      .filter(line => !line.match(/^\s*\),?\s*$/))
      .filter(line => !line.match(/^\s*\(\s*$/))
      .join('\n');
    
    // 5. Ensure proper ending
    if (!content.trim().endsWith(';')) {
      content = content.trim() + '\n';
    }
    
    // Check if fixed
    try {
      new vm.Script(content);
      await fs.writeFile(filePath, content);
      return true;
    } catch (e) {
      // Still broken - try more aggressive cleanup
      
      // Remove all static properties section and just keep methods + export
      const staticIndex = content.indexOf('// Static methods and properties');
      if (staticIndex > 0) {
        const beforeStatic = content.substring(0, staticIndex);
        const className = path.basename(filePath, '.js');
        content = beforeStatic + `\nmodule.exports = ${className};\n`;
        
        try {
          new vm.Script(content);
          await fs.writeFile(filePath, content);
          return true;
        } catch (e2) {
          // Still broken
        }
      }
      
      // Last resort: if it was changed, save anyway for manual review
      if (content !== originalContent) {
        await fs.writeFile(filePath, content);
      }
      
      return false;
    }
  }
  
  await processDir(RECONSTRUCTED_DIR);
  
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`❌ Still broken: ${stillBroken}`);
  
  if (remaining.length > 0 && remaining.length <= 20) {
    console.log('\n⚠️ Files still needing manual fixes:');
    for (const file of remaining) {
      console.log(`   ${file}`);
    }
  }
}

main().catch(console.error);
