/**
 * Verify Reconstructed Code
 * 
 * Tests that all reconstructed modules can be loaded without syntax errors.
 * 
 * Usage: node verify-build.cjs
 */

const fs = require('fs-extra');
const path = require('path');
const vm = require('vm');

const RECONSTRUCTED_DIR = path.join(__dirname, 'reconstructed');

async function main() {
  console.log('🔍 Verifying Reconstructed Code');
  console.log('================================\n');
  
  let passed = 0;
  let failed = 0;
  const errors = [];
  
  async function verifyDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await verifyDir(fullPath);
      } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
        const relPath = path.relative(RECONSTRUCTED_DIR, fullPath);
        
        try {
          const code = await fs.readFile(fullPath, 'utf8');
          
          // Check syntax by parsing
          new vm.Script(code, { filename: relPath });
          passed++;
        } catch (err) {
          failed++;
          errors.push({
            file: relPath,
            error: err.message,
            line: err.stack?.match(/:(\d+):/)?.[1] || 'unknown'
          });
        }
      }
    }
  }
  
  await verifyDir(RECONSTRUCTED_DIR);
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (errors.length > 0) {
    console.log('\n⚠️ Files with syntax errors:\n');
    for (const err of errors.slice(0, 20)) {
      console.log(`   ${err.file} (line ${err.line})`);
      console.log(`      ${err.error.split('\n')[0]}`);
    }
    if (errors.length > 20) {
      console.log(`\n   ... and ${errors.length - 20} more`);
    }
  }
  
  // Generate detailed report
  const report = {
    total: passed + failed,
    passed,
    failed,
    errors: errors.map(e => ({ file: e.file, line: e.line, error: e.error.split('\n')[0] }))
  };
  
  await fs.writeFile(
    path.join(__dirname, 'verification-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📋 Full report saved to verification-report.json');
  
  return failed === 0;
}

main().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
