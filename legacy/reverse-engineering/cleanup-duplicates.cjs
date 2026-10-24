/**
 * Cleanup Duplicates
 * 
 * Remove duplicate files from the reconstructed folder,
 * keeping only the one in the most appropriate location.
 * 
 * Usage: node cleanup-duplicates.cjs
 */

const fs = require('fs-extra');
const path = require('path');

const RECONSTRUCTED_DIR = path.join(__dirname, 'reconstructed');

// Priority order for folders (higher = better location)
const FOLDER_PRIORITY = {
  'application/action': 10,
  'application/event': 9,
  'application/properties': 9,
  'application/sidebar': 9,
  'application/panel': 9,
  'application/annotation': 9,
  'application/cloud': 9,
  'application': 8,
  'infinity/core': 10,
  'infinity/scene': 9,
  'infinity/geometry': 9,
  'infinity/paint': 9,
  'infinity/effects': 9,
  'infinity/vertex': 9,
  'infinity/event': 8,
  'infinity/other': 1,
  'editor': 8
};

function getFolderPriority(filePath) {
  const relPath = path.relative(RECONSTRUCTED_DIR, path.dirname(filePath)).replace(/\\/g, '/');
  return FOLDER_PRIORITY[relPath] || 0;
}

async function main() {
  console.log('🧹 Cleaning Up Duplicates');
  console.log('==========================\n');
  
  // Gather all files
  const files = [];
  
  async function scanDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await scanDir(fullPath);
      } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
        files.push(fullPath);
      }
    }
  }
  
  await scanDir(RECONSTRUCTED_DIR);
  
  // Group by filename
  const groups = {};
  for (const file of files) {
    const name = path.basename(file);
    if (!groups[name]) {
      groups[name] = [];
    }
    groups[name].push(file);
  }
  
  // Remove duplicates
  let removed = 0;
  for (const [name, paths] of Object.entries(groups)) {
    if (paths.length > 1) {
      // Sort by priority (highest first)
      paths.sort((a, b) => getFolderPriority(b) - getFolderPriority(a));
      
      // Keep the first (highest priority), remove the rest
      console.log(`📄 ${name}`);
      console.log(`   ✓ Keep: ${path.relative(RECONSTRUCTED_DIR, paths[0])}`);
      
      for (let i = 1; i < paths.length; i++) {
        console.log(`   ✗ Remove: ${path.relative(RECONSTRUCTED_DIR, paths[i])}`);
        await fs.remove(paths[i]);
        removed++;
      }
    }
  }
  
  console.log(`\n✅ Removed ${removed} duplicate files`);
  
  // Regenerate index
  console.log('\n📋 Regenerating index...');
  
  const indexFiles = [];
  await scanDir(RECONSTRUCTED_DIR);
  
  async function rescanDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await rescanDir(fullPath);
      } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
        indexFiles.push({
          name: entry.name.replace('.js', ''),
          path: path.relative(RECONSTRUCTED_DIR, fullPath).replace(/\\/g, '/')
        });
      }
    }
  }
  
  await rescanDir(RECONSTRUCTED_DIR);
  
  let indexContent = `/**
 * Gravit Designer - Reconstructed Source Index
 * Auto-generated
 */

`;

  for (const file of indexFiles.sort((a, b) => a.name.localeCompare(b.name))) {
    indexContent += `exports.${file.name} = require('./${file.path}');\n`;
  }
  
  await fs.writeFile(path.join(RECONSTRUCTED_DIR, 'index.js'), indexContent);
  console.log('✅ Index regenerated');
  
  // Final count
  const finalCount = indexFiles.length;
  console.log(`\n📊 Final count: ${finalCount} unique classes`);
}

main().catch(console.error);
