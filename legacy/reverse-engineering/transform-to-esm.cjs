/**
 * Transform reconstructed code to use proper imports
 * 
 * This script:
 * 1. Scans reconstructed files for minified references (a.GClass, b.Method, etc.)
 * 2. Creates import statements for known classes
 * 3. Resolves single-letter variable references to their actual module exports
 */

const fs = require('fs');
const path = require('path');

const RECONSTRUCTED_DIR = path.join(__dirname, 'reconstructed');
const OUTPUT_DIR = path.join(__dirname, 'src', 'modules');

// Map of known classes and their source modules
// Based on vendor chunk exports
const CORE_CLASSES = {
    // Core
    'GObject': 'core',
    'GEventTarget': 'core',
    'GEvent': 'core',
    
    // Locale
    'GLocale': 'locale',
    'GLocaleKey': 'locale',
    'GLocaleLanguage': 'locale',
    
    // System
    'GSystem': 'system',
    'GUtil': 'system',
    'GPlatform': 'system',
    
    // Math/Geometry
    'GMath': 'math',
    'GPoint': 'geometry',
    'GRect': 'geometry',
    'GMatrix': 'geometry',
    'GTransform': 'geometry',
    'GVertex': 'geometry',
    
    // Scene
    'GScene': 'scene',
    'GNode': 'scene',
    'GElement': 'scene',
    'GItem': 'scene',
    'GBlock': 'scene',
    'GImage': 'scene',
    'GPath': 'scene',
    'GGroup': 'scene',
    'GLayer': 'scene',
    'GPage': 'scene',
    'GText': 'scene',
    
    // Paint
    'GColor': 'paint',
    'GRGBColor': 'paint',
    'GCMYKColor': 'paint',
    'GPattern': 'paint',
    'GGradient': 'paint',
    'GBitmap': 'paint',
    
    // Editor
    'GEditor': 'editor',
    'GElementEditor': 'editor',
    'GSceneWidget': 'editor',
    'GScenePaintConfiguration': 'editor',
    
    // Input
    'GKey': 'input',
    'GMouseEvent': 'input',
    'GModifiers': 'input',
    
    // Font
    'GFont': 'font',
    'GFontManager': 'font',
    'GOpenTypeFont': 'font',
    
    // Workspace
    'GWorkspace': 'workspace',
};

// Map of enum/constant patterns to their parent classes
const ENUM_PATTERNS = {
    'Flag': 'GNode',
    'Side': 'GText',
    'Mode': ['GEditor', 'GPath'],
    'Position': 'GText',
    'ID': null, // Generic ID constant
    'TITLE': null, // Generic TITLE constant
    'EditMode': 'GSceneWidget',
    'PropertySet': 'GElement',
    'VisualProperties': 'GStylable',
    'GeometryProperties': 'GElement',
    'ColorMap': 'GColor',
    'Orientation': 'GText',
    'EmptyPattern': 'GPattern',
    'Transaction': 'GEditor',
    'Command': 'GKey',
    'ProgramLck': 'GPlatform',
};

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

function analyzeFile(filePath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const className = path.basename(filePath, '.js');
    
    // Find all G-class references
    const classRefs = new Set();
    const gClassPattern = /\b(G[A-Z][a-zA-Z0-9]+)\b/g;
    let match;
    while ((match = gClassPattern.exec(code)) !== null) {
        if (match[1] !== className) {
            classRefs.add(match[1]);
        }
    }
    
    // Find minified module references
    const moduleRefs = new Map();
    const modPattern = /\b([a-z])\.([A-Z][a-zA-Z0-9]+)\b/g;
    while ((match = modPattern.exec(code)) !== null) {
        const prefix = match[1];
        const name = match[2];
        if (!moduleRefs.has(prefix)) {
            moduleRefs.set(prefix, new Set());
        }
        moduleRefs.get(prefix).add(name);
    }
    
    return { className, classRefs, moduleRefs };
}

function transformFile(filePath, outputPath) {
    const code = fs.readFileSync(filePath, 'utf8');
    const className = path.basename(filePath, '.js');
    
    // Collect dependencies
    const analyses = analyzeFile(filePath);
    const imports = new Set();
    
    // Add imports for G-class references
    for (const ref of analyses.classRefs) {
        if (CORE_CLASSES[ref]) {
            imports.add(`import { ${ref} } from 'gravit-core/${CORE_CLASSES[ref]}';`);
        } else {
            // It's another reconstructed class
            imports.add(`import { ${ref} } from './${ref}';`);
        }
    }
    
    // Transform the code
    let transformedCode = code;
    
    // Replace minified module.property with direct references
    // e.g., o.GLocale -> GLocale, i.GKey -> GKey
    for (const [prefix, properties] of analyses.moduleRefs) {
        for (const prop of properties) {
            // If it's a G-class, just use the class directly
            if (prop.startsWith('G') && CORE_CLASSES[prop]) {
                const pattern = new RegExp(`\\b${prefix}\\.${prop}\\b`, 'g');
                transformedCode = transformedCode.replace(pattern, prop);
            }
            // If it's an enum/constant, try to map it
            else if (ENUM_PATTERNS[prop]) {
                const parentClass = ENUM_PATTERNS[prop];
                if (parentClass && typeof parentClass === 'string') {
                    const pattern = new RegExp(`\\b${prefix}\\.${prop}\\b`, 'g');
                    transformedCode = transformedCode.replace(pattern, `${parentClass}.${prop}`);
                    if (!analyses.classRefs.has(parentClass) && CORE_CLASSES[parentClass]) {
                        imports.add(`import { ${parentClass} } from 'gravit-core/${CORE_CLASSES[parentClass]}';`);
                    }
                }
            }
        }
    }
    
    // Build the output
    const importsStr = [...imports].sort().join('\n');
    const output = `${importsStr}\n\n${transformedCode}\n\nexport { ${className} };\n`;
    
    return output;
}

// Main
console.log('Transforming reconstructed code to ES modules...\n');

// Ensure output directory
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const files = getAllJsFiles(RECONSTRUCTED_DIR);
let transformed = 0;

for (const file of files) {
    try {
        const relativePath = path.relative(RECONSTRUCTED_DIR, file);
        const outputPath = path.join(OUTPUT_DIR, relativePath);
        
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // For now, just copy with analysis info
        const analysis = analyzeFile(file);
        console.log(`${analysis.className}: ${analysis.classRefs.size} class refs, ${analysis.moduleRefs.size} module refs`);
        transformed++;
    } catch (e) {
        console.error(`Error processing ${file}: ${e.message}`);
    }
}

console.log(`\nAnalyzed ${transformed} files`);
console.log('\nNote: Full transformation requires mapping all module references.');
console.log('See the analysis output above to understand dependencies.');
