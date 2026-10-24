/**
 * Build designer.browser.js from extracted modules
 * Reassembles modules into a working bundle
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SRC_DIR = path.join(__dirname, 'src');
const MODULES_DIR = path.join(SRC_DIR, 'modules');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'designer.browser.dev.js');

// Strip JSDoc header from module file
function stripHeader(code) {
    return code.replace(/^\/\*\*[\s\S]*?\*\/\s*\n?/, '');
}

// Main build function
function build() {
    console.log('Building designer.browser.dev.js...\n');
    
    // Load module map
    const mapPath = path.join(SRC_DIR, 'module-map.json');
    if (!fs.existsSync(mapPath)) {
        throw new Error('module-map.json not found. Run extract-all-modules.cjs first.');
    }
    const moduleMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    
    // Load runtime
    const runtimePath = path.join(SRC_DIR, 'runtime.js');
    if (!fs.existsSync(runtimePath)) {
        throw new Error('runtime.js not found. Run extract-all-modules.cjs first.');
    }
    const runtime = fs.readFileSync(runtimePath, 'utf8');
    
    // Get module IDs
    const moduleIds = Object.keys(moduleMap).map(Number).sort((a, b) => a - b);
    const maxId = Math.max(...moduleIds);
    
    console.log(`Building from ${moduleIds.length} modules (max ID: ${maxId})`);
    
    // Build modules array
    const moduleStrings = [];
    let loaded = 0;
    let missing = 0;
    
    for (let i = 0; i <= maxId; i++) {
        if (moduleMap[i]) {
            const modulePath = path.join(MODULES_DIR, moduleMap[i].filename);
            if (fs.existsSync(modulePath)) {
                let code = fs.readFileSync(modulePath, 'utf8');
                code = stripHeader(code);
                moduleStrings[i] = code;
                loaded++;
            } else {
                console.warn(`Missing: ${moduleMap[i].filename}`);
                moduleStrings[i] = null;
                missing++;
            }
        } else {
            // Sparse slot
            moduleStrings[i] = null;
        }
    }
    
    console.log(`Loaded ${loaded} modules, ${missing} missing`);
    
    // Build the array string
    // For null entries, we use just a comma (sparse array syntax)
    // For function entries, we include the full code
    const arrayElements = moduleStrings.map(m => m === null ? '' : m);
    const modulesArrayCode = arrayElements.join(',\n');
    
    // Assemble final bundle
    const bundle = `${runtime}[\n${modulesArrayCode}\n]);`;
    
    // Write output
    fs.writeFileSync(OUTPUT_FILE, bundle);
    
    const sizeKB = (bundle.length / 1024).toFixed(1);
    const sizeMB = (bundle.length / 1024 / 1024).toFixed(2);
    
    console.log(`\nWrote: ${OUTPUT_FILE}`);
    console.log(`Size: ${sizeMB} MB (${sizeKB} KB)`);
    
    return bundle;
}

// Verify bundle syntax
function verify(code) {
    console.log('\nVerifying syntax...');
    try {
        new Function(code);
        console.log('✓ Syntax OK');
        return true;
    } catch (e) {
        console.error('✗ Syntax error:', e.message);
        
        // Try to find the error location
        const match = e.message.match(/position (\d+)/);
        if (match) {
            const pos = parseInt(match[1]);
            const context = code.slice(Math.max(0, pos - 100), pos + 100);
            console.log('\nContext around error:');
            console.log(context);
        }
        
        return false;
    }
}

// Run
try {
    const bundle = build();
    const valid = verify(bundle);
    
    if (valid) {
        console.log('\n✓ Build successful!');
        console.log('\nTo use the development bundle:');
        console.log('1. Back up designer.browser.js');
        console.log('2. Copy designer.browser.dev.js to designer.browser.js');
        console.log('3. Refresh the app');
        console.log('\nOr run: npm run use-dev (if you set up the script)');
    } else {
        console.log('\n✗ Build has syntax errors');
        process.exit(1);
    }
} catch (e) {
    console.error('Build failed:', e.message);
    process.exit(1);
}
