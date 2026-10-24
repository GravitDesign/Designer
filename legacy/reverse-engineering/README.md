# Gravit Designer Reverse Engineering Toolkit v2.0

A comprehensive toolkit for reverse engineering Gravit Designer, enabling you to understand, modify, and develop new features for the application.

## 🎯 Overview

This toolkit transforms the minified Gravit Designer production code into a readable, maintainable development environment. It extracts, analyzes, and reconstructs the source code while preserving all the original functionality.

## 🚀 Quick Start

```bash
# Install dependencies
cd reverse-engineering
npm install

# Run the complete build process
node build-all.js

# Or run individual steps
npm run beautify      # Format minified code
npm run extract       # Extract module mappings
npm run unbundle      # Extract individual modules
npm run analyze       # Analyze class structure
npm run reconstruct   # Reconstruct source code
npm run rename        # Improve variable names

# Start development server
npm run dev
```

## 📁 Project Structure

```
gravit-designer/
├── public/                    # Minified production code
│   ├── designer.browser.js   # Main application (~6.7 MB)
│   ├── chunk.vendor.js       # Core engine (~11.7 MB)
│   └── ...
├── reverse-engineering/       # This toolkit
│   ├── beautified/           # Formatted minified code
│   ├── extracted-modules/    # Module ID mappings
│   ├── modules/              # Extracted webpack modules
│   ├── analysis/             # Class analysis reports
│   ├── reconstructed/        # Reconstructed source code
│   ├── renamed/              # Code with improved variable names
│   ├── dev-server/           # Development server files
│   ├── comparison/           # Source comparison reports
│   │
│   ├── build-all.js          # Master build script
│   ├── beautify.js           # Code formatter
│   ├── extract-modules.js    # Module extractor
│   ├── unbundle.js           # Webpack unbundler
│   ├── analyze-classes.js    # Class analyzer
│   ├── reconstruct-source.js # Source reconstructor
│   ├── rename-variables.js   # Variable renamer
│   ├── compare-sources.js    # Source comparator
│   ├── webpack.config.js     # Development build config
│   └── package.json
└── server.js                 # Local server with license bypass

../gravit-original/           # Original open-source code (reference)
└── src/
    ├── infinity/             # Core rendering engine
    ├── infinity-editor/      # Editor tools
    ├── gravit/               # Application module
    └── application/          # App framework
```

## 🔑 Key Findings

### ✅ The Code IS Recoverable


Unlike many minified apps, Gravit Designer preserves:
- **All class names**: `GObject`, `GScene`, `GEditor`, `GPaintCanvas`, etc.
- **All method names**: `getBBox`, `transform`, `paint`, `hitTest`, etc.
- **All event names**: `GEditor.ModifiedEvent`, `GToolManager.ToolChangedEvent`, etc.
- **Property names**: Stored in string form
- **Inheritance structure**: Using `GObject.inherit()` pattern

### What's Changed Since Open Source

| Aspect | Old (2013) | New (2025) |
|--------|------------|------------|
| Prefix | `IF*` (IFObject) | `G*` (GObject) |
| Build | Grunt + Bower | Webpack |
| Module | Global namespace | CommonJS/ES modules |
| Variables | Readable | Minified (e, t, n, o, i, a) |
| Comments | Present | Removed |

## Usage

### 1. Extract Module Map
```bash
cd reverse-engineering
npm install
node extract-modules.js
```
Creates `extracted-modules/module-map.json` with class name → module ID mapping.

### 2. Compare Sources
```bash
node compare-sources.js
```
Creates a detailed comparison report in `comparison/`.

### 3. Search for Specific Code

**Find a class definition:**
```javascript
// In chunk.vendor.js, search for:
GObject.inherit(GScene,    // GScene inherits from...
```

**Find method implementations:**
```javascript
// Search for prototype methods:
GScene.prototype.getActivePage
GPath.prototype.rewindVertices
GPaintCanvas.prototype.fillRect
```

**Find event handling:**
```javascript
// Events are preserved:
GEditor.ModifiedEvent
GToolManager.ToolChangedEvent
```

## Module ID Reference

Core classes and their webpack module IDs:

| Class | Module | Description |
|-------|--------|-------------|
| GObject | 0 | Base class for everything |
| GNode | 2 | Scene graph node |
| GPoint | 5 | 2D point |
| GRect | 6 | Rectangle |
| GTransform | 7 | Transformation matrix |
| GPaintCanvas | 14 | Drawing context |
| GElement | 22 | Scene element |
| GPath | 60 | Vector path |
| GEvent | 72 | Event base |
| GEventTarget | 75 | Event emitter mixin |
| GPage | 83 | Document page |
| GScene | 160 | Document/scene |

See `extracted-modules/module-map.json` for the full list.

## Practical Examples

### Example 1: Understanding Path Drawing

1. Look at original: `gravit-original/src/infinity/scene/shape/path.js`
2. Find IFPath methods like `rewindVertices`, `readVertex`
3. Search in `chunk.vendor.js` for `GPath.prototype.rewindVertices`
4. The logic is the same, just with minified variable names

### Example 2: Adding a Feature

1. Find the relevant class (e.g., `GEditor` for editing features)
2. Search for `GEditor.prototype.` to see all methods
3. Identify hook points (events, callbacks)
4. Add your code that interacts with these preserved APIs

### Example 3: Debugging

1. In browser DevTools, set breakpoints on preserved class names
2. Objects will show properties with readable names
3. `hasMixin()`, `getTypeId()` work for runtime inspection

## 🛠️ Development Workflow

### Setting Up Development Environment

```bash
# 1. Install dependencies
npm install

# 2. Run the complete reverse engineering build
node build-all.js

# 3. Start the development server
npm run dev
```

### Using the Debug Helper

Inject the debug helper into Gravit Designer:

1. Open Gravit Designer in your browser
2. Open DevTools Console
3. Load the debug helper:

```javascript
// Paste contents of dev-server/debug-helper.js
// Or load it dynamically:
var script = document.createElement('script');
script.src = 'http://localhost:3001/debug-helper.js';
document.body.appendChild(script);
```

4. Use the debugging commands:

```javascript
GravitDebug.help()                    // Show all commands
GravitDebug.getApp()                  // Get application instance
GravitDebug.getScene()                // Get current scene
GravitDebug.listGClasses()            // List all G* classes
GravitDebug.inspectClass('GPath')     // Inspect a class
GravitDebug.findElements('Path')      // Find elements by type
GravitDebug.trace(obj, 'method')      // Trace method calls
```

### Making Code Changes

1. Find the module you want to modify in `reconstructed/`
2. Make your changes
3. Run `npm run build` to create a development bundle
4. Test in the development server

### Patching the Production App

To inject your changes into the production app:

```javascript
// Example: Override a method
GPath.prototype.rewindVertices = function() {
  console.log('Custom rewindVertices called');
  // Your implementation
};

// Example: Hook into events
GEditor.prototype.on('ModifiedEvent', function(event) {
  console.log('Document modified:', event);
});
```

## 📊 Architecture Overview

### Core Classes Hierarchy

```
GObject (Base class)
├── GNode (Scene graph node)
│   ├── GScene (Document)
│   ├── GElement (Visual element)
│   │   ├── GShape (Shape base)
│   │   │   ├── GPath (Vector path)
│   │   │   ├── GRectangle
│   │   │   ├── GEllipse
│   │   │   ├── GPolygon
│   │   │   ├── GText
│   │   │   └── GImage
│   │   ├── GBlock
│   │   │   ├── GLayer
│   │   │   └── GPage
│   │   └── GGroup
│   └── GItem
├── GEvent (Event system)
├── GPattern (Fill patterns)
│   ├── GGradient
│   │   ├── GLinearGradient
│   │   └── GRadialGradient
│   └── GColor
└── GSystem (Platform utilities)
```

### Key Mixins

- **GEventTarget** - Adds event handling to any class
- **GStylable** - Adds styling support (fills, borders, effects)
- **GActionable** - Adds undo/redo support

### Event System

Events are fully preserved and follow this pattern:

```javascript
// Define an event
GEditor.ModifiedEvent = function() { /* ... */ };
GObject.inherit(GEditor.ModifiedEvent, GEvent);

// Emit an event
this.trigger(new GEditor.ModifiedEvent(/* args */));

// Listen for events
element.on('modified', function(event) { /* ... */ });
```

## 🔍 Analysis Reports

After running `node analyze-classes.js`, find these reports in `analysis/`:

- **class-hierarchy.md** - Visual inheritance tree
- **class-methods.json** - All classes with their methods
- **events.json** - All event types
- **constants.json** - Static constants and enums
- **summary.json** - Statistics

## 💡 Tips & Tricks

1. **Start with Events**: Event names are fully preserved - great entry points
2. **Use DevTools**: Console has access to `GravitDesigner` global
3. **Read Original First**: The logic hasn't changed much
4. **Method Names Help**: Even with minified vars, method names reveal intent
5. **String Search**: Property names stored as strings are searchable
6. **Compare Files**: Use `reconstructed/` alongside `gravit-original/src/`
7. **Check Prototypes**: `Object.keys(GPath.prototype)` lists all methods

## 🧰 External Tools

- **webcrack** - Further deobfuscate webpack bundles
- **source-map-explorer** - If you ever get source maps  
- **AST Explorer** - For understanding code structure
- **grep/ripgrep** - Fast code searching

## ⚠️ Legal Note

This toolkit is for educational and interoperability purposes. The Gravit Designer code is proprietary to Corel Corporation. The original open-source Gravit was released under GPL.

## 📝 Changelog

### v2.0.0
- Added comprehensive source reconstruction
- Added AST-based variable renaming
- Added class analyzer with reports
- Added development webpack configuration
- Added debug helper for runtime inspection
- Added master build script

---

Happy reverse engineering! 🔧

