/**
 * Extract webpack modules using AST parsing with Acorn
 */

const fs = require('fs');
const path = require('path');
const acorn = require('./src/node_modules/acorn');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const OUTPUT_DIR = path.join(__dirname, 'src');
const MODULES_DIR = path.join(OUTPUT_DIR, 'modules');

function parseBundle() {
    console.log('Reading designer.browser.js...');
    const code = fs.readFileSync(path.join(PUBLIC_DIR, 'designer.browser.js'), 'utf8');
    console.log(`Bundle size: ${(code.length / 1024 / 1024).toFixed(2)} MB\n`);
    
    console.log('Parsing with Acorn (this may take a moment)...');
    const ast = acorn.parse(code, {
        ecmaVersion: 2020,
        sourceType: 'script',
        locations: true,
        ranges: true
    });
    
    console.log('AST parsed successfully\n');
    
    // The bundle structure is:
    // var GravitDesigner = (function(e) { ... })([module0, module1, ...]);
    // Find the IIFE with the modules array
    
    let runtime = null;
    let modulesArray = null;
    let runtimeEndPos = 0;
    
    // Walk the AST to find the modules array
    function findModules(node) {
        if (node.type === 'VariableDeclaration') {
            for (const decl of node.declarations) {
                if (decl.id.name === 'GravitDesigner' && 
                    decl.init && 
                    decl.init.type === 'CallExpression') {
                    
                    // The callee is the IIFE function
                    const iife = decl.init.callee;
                    // The argument is the modules array
                    if (decl.init.arguments.length > 0) {
                        const arg = decl.init.arguments[0];
                        if (arg.type === 'ArrayExpression') {
                            modulesArray = arg;
                            // Runtime is everything up to the array
                            runtimeEndPos = arg.start;
                        }
                    }
                }
            }
        }
        
        // Recurse
        for (const key of Object.keys(node)) {
            if (node[key] && typeof node[key] === 'object') {
                if (Array.isArray(node[key])) {
                    for (const child of node[key]) {
                        if (child && typeof child === 'object' && child.type) {
                            findModules(child);
                        }
                    }
                } else if (node[key].type) {
                    findModules(node[key]);
                }
            }
        }
    }
    
    findModules(ast);
    
    if (!modulesArray) {
        throw new Error('Could not find modules array');
    }
    
    runtime = code.slice(0, runtimeEndPos);
    console.log(`Runtime: ${runtime.length} chars`);
    console.log(`Modules array has ${modulesArray.elements.length} elements`);
    
    // Extract module code
    const modules = [];
    let nonEmpty = 0;
    
    for (let i = 0; i < modulesArray.elements.length; i++) {
        const element = modulesArray.elements[i];
        if (element === null) {
            modules[i] = null;
        } else {
            const moduleCode = code.slice(element.start, element.end);
            modules[i] = moduleCode;
            nonEmpty++;
        }
    }
    
    console.log(`Non-empty modules: ${nonEmpty}\n`);
    
    return { runtime, modules, code };
}

// Identify module type
function identifyModule(code) {
    if (!code) return { type: 'sparse', name: null };
    
    const classMatch = code.match(/\[Object\s+([A-Z][a-zA-Z0-9_]+)\]/);
    if (classMatch) return { type: 'class', name: classMatch[1] };
    
    const funcMatch = code.match(/function\s+([A-Z][a-zA-Z0-9]+)\s*\(/);
    if (funcMatch) return { type: 'class', name: funcMatch[1] };
    
    const actionMatch = code.match(/\.ID\s*=\s*["']([^"']+)["']/);
    if (actionMatch) return { type: 'action', name: 'Action_' + actionMatch[1].replace(/[.-]/g, '_') };
    
    const exportMatch = code.match(/e\.exports\s*=\s*\{[\s\S]{0,200}(G[A-Z][a-zA-Z]+)/);
    if (exportMatch) return { type: 'exports', name: 'Exports_' + exportMatch[1] };
    
    return { type: 'unknown', name: null };
}

// Main
function main() {
    const { runtime, modules, code } = parseBundle();
    
    // Create directories
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    if (fs.existsSync(MODULES_DIR)) fs.rmSync(MODULES_DIR, { recursive: true });
    fs.mkdirSync(MODULES_DIR);
    
    // Write runtime
    fs.writeFileSync(path.join(OUTPUT_DIR, 'runtime.js'), runtime);
    console.log('Wrote runtime.js');
    
    // Write modules
    const moduleMap = {};
    const stats = { class: 0, action: 0, exports: 0, unknown: 0, sparse: 0 };
    let totalSize = 0;
    
    for (let i = 0; i < modules.length; i++) {
        const code = modules[i];
        if (!code) {
            stats.sparse++;
            continue;
        }
        
        const identity = identifyModule(code);
        stats[identity.type] = (stats[identity.type] || 0) + 1;
        
        const filename = identity.name 
            ? `${String(i).padStart(4, '0')}_${identity.name}.js`
            : `${String(i).padStart(4, '0')}_module.js`;
        
        const header = `/**
 * Webpack Module #${i}
 * Type: ${identity.type}${identity.name ? '\n * Name: ' + identity.name : ''}
 */

`;
        fs.writeFileSync(path.join(MODULES_DIR, filename), header + code);
        
        moduleMap[i] = {
            filename,
            type: identity.type,
            name: identity.name,
            size: code.length
        };
        totalSize += code.length;
    }
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'module-map.json'), JSON.stringify(moduleMap, null, 2));
    
    console.log('Wrote module-map.json');
    console.log(`\nTotal modules code: ${(totalSize/1024/1024).toFixed(2)} MB`);
    console.log(`\nExtraction summary:`);
    console.log(`  Classes: ${stats.class}`);
    console.log(`  Actions: ${stats.action}`);
    console.log(`  Exports: ${stats.exports}`);
    console.log(`  Unknown: ${stats.unknown}`);
    console.log(`  Sparse: ${stats.sparse}`);
    
    // Show largest
    const sorted = Object.entries(moduleMap).sort((a, b) => b[1].size - a[1].size).slice(0, 10);
    console.log('\nLargest modules:');
    for (const [id, info] of sorted) {
        console.log(`  #${id}: ${info.filename} (${(info.size/1024).toFixed(1)} KB)`);
    }
}

main();
