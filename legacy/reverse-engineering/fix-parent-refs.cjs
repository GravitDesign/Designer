/**
 * Gravit Designer - Fix Parent Class References
 * 
 * Maps minified parent class references (n, r, o, etc.) to their
 * proper class names using the module map and inheritance patterns.
 * 
 * Usage: node fix-parent-refs.cjs
 */

const fs = require('fs-extra');
const path = require('path');

const MODULE_MAP = require('./extracted-modules/module-map.json');
const RECONSTRUCTED_DIR = path.join(__dirname, 'reconstructed');

// Build reverse map: className -> moduleId
const CLASS_TO_MODULE = {};
for (const [moduleId, className] of Object.entries(MODULE_MAP)) {
  CLASS_TO_MODULE[className] = moduleId;
}

// Known inheritance hierarchy from original source
const INHERITANCE_MAP = {
  // Core hierarchy
  'GNode': 'GObject',
  'GEventTarget': 'GObject',
  'GEvent': 'GObject',
  'GLocale': 'GObject',
  'GLocaleKey': 'GObject',
  'GLocaleLanguage': 'GObject',
  
  // Scene hierarchy
  'GElement': 'GNode',
  'GItem': 'GElement',
  'GShape': 'GItem',
  'GBlock': 'GItem',
  'GGroup': 'GBlock',
  'GLayer': 'GBlock',
  'GPage': 'GBlock',
  'GScene': 'GNode',
  'GSymbol': 'GBlock',
  'GSlice': 'GItem',
  'GBackground': 'GItem',
  'GConnector': 'GItem',
  
  // Shape hierarchy
  'GPathBase': 'GShape',
  'GPath': 'GPathBase',
  'GCompoundPath': 'GPathBase',
  'GSimpleShape': 'GPathBase',
  'GRectangle': 'GSimpleShape',
  'GEllipse': 'GSimpleShape',
  'GPolygon': 'GSimpleShape',
  'GText': 'GShape',
  'GImage': 'GShape',
  'GCompoundShape': 'GShape',
  
  // Vertex hierarchy
  'GVertex': 'GObject',
  'GVertexSource': 'GObject',
  'GVertexContainer': 'GVertexSource',
  'GVertexTransformer': 'GVertexSource',
  'GVertexInfo': 'GObject',
  
  // Geometry hierarchy
  'GPoint': 'GObject',
  'GRect': 'GObject',
  'GTransform': 'GObject',
  'GHitResult': 'GObject',
  
  // Paint hierarchy
  'GPaintCanvas': 'GObject',
  'GPaintContext': 'GObject',
  'GColor': 'GObject',
  'GRGBColor': 'GColor',
  'GCMYKColor': 'GColor',
  'GPattern': 'GObject',
  'GGradient': 'GPattern',
  'GLinearGradient': 'GGradient',
  'GRadialGradient': 'GGradient',
  'GAngularGradient': 'GGradient',
  'GTexturePattern': 'GPattern',
  'GNoisePattern': 'GPattern',
  'GBitmap': 'GObject',
  
  // Effects hierarchy
  'GEffect': 'GObject',
  'GBlurEffect': 'GEffect',
  'GDropShadowEffect': 'GEffect',
  'GInnerShadowEffect': 'GEffect',
  'GWebGLEffect': 'GEffect',
  'GGLBlurEffect': 'GWebGLEffect',
  'GMultiEffect': 'GEffect',
  
  // Editor hierarchy
  'GEditor': 'GEventTarget',
  'GBaseEditor': 'GObject',
  'GElementEditor': 'GBaseEditor',
  'GBlockEditor': 'GElementEditor',
  'GItemEditor': 'GElementEditor',
  'GShapeEditor': 'GItemEditor',
  'GPathBaseEditor': 'GShapeEditor',
  'GPathEditor': 'GPathBaseEditor',
  'GSimpleShapeEditor': 'GShapeEditor',
  'GRectangleEditor': 'GSimpleShapeEditor',
  'GEllipseEditor': 'GSimpleShapeEditor',
  'GPolygonEditor': 'GSimpleShapeEditor',
  'GCompoundPathEditor': 'GPathBaseEditor',
  'GCompoundShapeEditor': 'GShapeEditor',
  'GTextEditor': 'GShapeEditor',
  'GImageEditor': 'GShapeEditor',
  'GGroupEditor': 'GBlockEditor',
  'GLayerEditor': 'GBlockEditor',
  'GPageEditor': 'GBlockEditor',
  'GSceneEditor': 'GElementEditor',
  'GSymbolEditor': 'GBlockEditor',
  'GSliceEditor': 'GItemEditor',
  'GBoxEditor': 'GBaseEditor',
  
  // Tools hierarchy  
  'GTool': 'GObject',
  'GSelectTool': 'GTool',
  'GSubSelectTool': 'GTool',
  'GShapeTool': 'GTool',
  'GSimpleShapeTool': 'GShapeTool',
  'GRectangleTool': 'GSimpleShapeTool',
  'GEllipseTool': 'GSimpleShapeTool',
  'GPolygonTool': 'GSimpleShapeTool',
  'GPathTool': 'GTool',
  'GPenTool': 'GPathTool',
  'GBezigonTool': 'GPathTool',
  'GLineTool': 'GTool',
  'GHandTool': 'GTool',
  'GZoomTool': 'GTool',
  'GFreehandTool': 'GTool',
  'GFillTool': 'GTool',
  'GKnifeTool': 'GTool',
  'GLassoTool': 'GTool',
  'GMagicTool': 'GTool',
  'GStarTool': 'GSimpleShapeTool',
  'GTriangleTool': 'GSimpleShapeTool',
  'GItemTool': 'GTool',
  'GLayerTool': 'GTool',
  
  // Guides
  'GGuide': 'GObject',
  'GBBoxGuide': 'GGuide',
  'GGridGuide': 'GGuide',
  'GPageGuide': 'GGuide',
  'GGuideLinesGuide': 'GGuide',
  'GLabelGuide': 'GGuide',
  'GActionGuide': 'GGuide',
  'GFullPixelsGuide': 'GGuide',
  'GPageLabelGuide': 'GLabelGuide',
  'GSymbolLabelGuide': 'GLabelGuide',
  
  // Annotations
  'GAnnotation': 'GItem',
  'GCommentAnnotation': 'GAnnotation',
  'GRectangleAnnotation': 'GAnnotation',
  'GEllipseAnnotation': 'GAnnotation',
  'GArrowAnnotation': 'GAnnotation',
  'GHighlighterAnnotation': 'GAnnotation',
  'GPencilAnnotation': 'GAnnotation',
  'GTextAnnotation': 'GAnnotation',
  'GCollaborativeTextAnnotation': 'GAnnotation',
  
  // Style
  'GStyle': 'GNode',
  'GStylable': 'GObject', // mixin
  
  // Actions hierarchy
  'GAction': 'GObject',
  'GElementAction': 'GAction',
  'GSubAction': 'GAction',
  'GMainAction': 'GAction',
  
  // Most actions inherit from GAction
  'GUndoAction': 'GAction',
  'GRedoAction': 'GAction',
  'GCutAction': 'GAction',
  'GCopyAction': 'GAction',
  'GPasteAction': 'GAction',
  'GDeleteAction': 'GAction',
  'GDuplicateAction': 'GAction',
  'GSelectAllAction': 'GAction',
  'GDeselectAllAction': 'GAction',
  'GInvertSelectionAction': 'GAction',
  'GGroupAction': 'GAction',
  'GArrangeAction': 'GAction',
  'GAlignAction': 'GAction',
  'GDistributeAction': 'GAction',
  'GTransformAction': 'GAction',
  'GZoomInAction': 'GAction',
  'GZoomOutAction': 'GAction',
  'GFitAllAction': 'GAction',
  'GFitSelectionAction': 'GAction',
  'GFitCurrentLayerAction': 'GAction',
  'GMagnificationAction': 'GAction',
  'GOriginalViewAction': 'GAction',
  'GShowGridAction': 'GAction',
  'GShowRulersAction': 'GAction',
  'GNewAction': 'GAction',
  'GOpenAction': 'GAction',
  'GSaveAction': 'GAction',
  'GSaveAsAction': 'GAction',
  'GSaveAllAction': 'GAction',
  'GExportAction': 'GAction',
  'GSettingsAction': 'GAction',
  'GQuitAction': 'GAction',
  'GSnapUnitAction': 'GAction',
  'GNewWindowAction': 'GAction',
  'GLockLayerAction': 'GAction',
  'GRenameLayerAction': 'GAction',
  'GCropAction': 'GAction',
  'GCancelCropAction': 'GAction',
  'GConvertToPathAction': 'GAction',
  'GCreateSymbolAction': 'GAction',
  'GDetachSymbolAction': 'GAction',
  'GConnectLinesAction': 'GAction',
  'GJoinPathsAction': 'GAction',
  'GSplitPathAction': 'GAction',
  'GSimplifyAction': 'GAction',
  'GOffsetAction': 'GAction',
  'GVectorizeBorderAction': 'GAction',
  'GConvertToImageAction': 'GAction',
  'GMergeMainAction': 'GAction',
  'GMergeSubAction': 'GAction',
  'GPasteInPlaceAction': 'GAction',
  'GPasteInsideAction': 'GAction',
  'GPasteHereAction': 'GAction',
  'GPasteStyleAction': 'GAction',
  'GPasteAndReplaceAction': 'GAction',
  'GClipAction': 'GAction',
  'GOutlineAction': 'GAction',
  'GAttachToPathAction': 'GAction',
  'GDetachFromPathAction': 'GAction',
  'GResetInstanceAction': 'GAction',
  'GSelectByAction': 'GAction',
  'GToggleSidebarAction': 'GAction',
  'GEnhancedTooltipsAction': 'GAction',
  'GToggleGuideAction': 'GAction',
  'GToggleSnapAction': 'GAction',
  'GToggleSnapZonesAction': 'GAction',
  'GShowGuideLinesAction': 'GAction',
  'GShowSlicesAction': 'GAction',
  'GShowSymbolLabelsAction': 'GAction',
  'GShowSelectionHandlesAction': 'GAction',
  'GShowEffectsAction': 'GAction',
  'GPixelPreviewAction': 'GAction',
  'GOutlineViewAction': 'GAction',
  'GToggleFullscreenAction': 'GAction',
  'GToggleTouchAction': 'GAction',
  'GToggleMultiPageModeAction': 'GAction',
  'GTogglePaintLayersVisibilityAction': 'GAction',
  'GSwapPaintLayersAction': 'GAction',
  'GToggleLayerVisibilityAction': 'GAction',
  'GEnterLayerGroupAction': 'GAction',
  'GCreateNewLayerAction': 'GAction',
  'GChangeActivePageAction': 'GAction',
  'GChangeActiveWindowAction': 'GAction',
  'GChangeOpacityAction': 'GAction',
  'GCheckForUpdatesAction': 'GAction',
  'GCloudSynchronizationAction': 'GAction',
  'GCloudSynchronizationInfoAction': 'GAction',
  'GCycleThroughLayersAction': 'GAction',
  'GEyeDropperAction': 'GAction',
  'GGravitCloudAction': 'GAction',
  'GImportFontsAction': 'GAction',
  'GImportImageFromIOSAction': 'GAction',
  'GInstallToDesktopAction': 'GAction',
  'GLinkImageAction': 'GAction',
  'GLogoutAction': 'GAction',
  'GNewClipboardAction': 'GAction',
  'GNewFromTemplateAction': 'GAction',
  'GOpenAccountSettingsAction': 'GAction',
  'GOpenLinkAction': 'GAction',
  'GOpenQuickHelpScreenAction': 'GAction',
  'GOpenRecentAction': 'GAction',
  'GOpenSharedFileAction': 'GAction',
  'GOpenWelcomeScreenAction': 'GAction',
  'GPlaceImportAction': 'GAction',
  'GPlayAction': 'GAction',
  'GPrintAction': 'GAction',
  'GReverseOrderAction': 'GAction',
  'GShareAction': 'GAction',
  'GSharePointCheckInAction': 'GAction',
  'GSharePointCheckOutAction': 'GAction',
  'GShowShortcutsAction': 'GAction',
  'GSplitAction': 'GAction',
  'GSplitLineAction': 'GAction',
  'GSwitchLanguageAction': 'GAction',
  'GSwitchWebcdrAction': 'GAction',
  'GToggleProBETALicenseAction': 'GAction',
  'GTranslationToolAction': 'GAction',
  'GUseCouponAction': 'GAction',
  'GVectorizeImageAction': 'GAction',
  'GVersionsHistoryAction': 'GAction',
  'GCloseActiveWindowAction': 'GAction',
  'GConvertToRawPathAction': 'GAction',
  'GCreateNestedCompoundAction': 'GAction',
  'GMaskWithShapeAction': 'GAction',
  'GEditElementActon': 'GAction',
  'GCutCopyAction': 'GAction',
  'GChangeAnchorPointsJointTypeMainAction': 'GAction',
  'GChangeAnchorPointsJointTypeSubAction': 'GAction',
  'GSelectByFontTypeAction': 'GAction',
  'GSelectByPaintLayerAction': 'GAction',
  'GSelectByBorderWidthAction': 'GAction',
  'GSelectByTransparencyAction': 'GAction',
  'GSelectByBlendModeAction': 'GAction',
  'GSelectByShapeAction': 'GAction',
  'GSelectByEffectAction': 'GAction',
  
  // Sidebars
  'GSidebar': 'GObject',
  'GAnnotationsSidebar': 'GSidebar',
  'GInspectorSidebar': 'GSidebar',
  'GOutlineSidebar': 'GSidebar',
  'GSymbolsSidebar': 'GSidebar',
  'GLibrarySidebar': 'GSidebar',
  
  // Panels
  'GPanel': 'GObject',
  'GEffectsPanel': 'GPanel',
  'GFilesPanel': 'GPanel',
  'GChangePasswordPanel': 'GPanel',
  'GSoftwareUpdatePanel': 'GPanel',
  'GNotificationPanel': 'GPanel',
  'GCollaborativeTextPanel': 'GPanel',
  'GDocumentNotificationsPanel': 'GPanel',
  
  // Properties
  'GProperties': 'GObject',
  'GAppearanceProperties': 'GProperties',
  'GEffectProperties': 'GProperties',
  'GBoolOpProperties': 'GProperties',
  'GEllipseProperties': 'GProperties',
  'GImageProperties': 'GProperties',
  'GPathProperties': 'GProperties',
  'GPolygonProperties': 'GProperties',
  'GRectangleProperties': 'GProperties',
  'GSliceProperties': 'GProperties',
  'GTextProperties': 'GProperties',
  'GAlignProperties': 'GProperties',
  'GDimensionProperties': 'GProperties',
  'GPageProperties': 'GProperties',
  'GExportProperties': 'GProperties',
  'GVersionHistoryProperties': 'GProperties',
  'GAnnotationProperties': 'GProperties',
  'GFrameProperties': 'GProperties',
  'GGroupFrameProperties': 'GProperties',
  'GItemProperties': 'GProperties',
  'GSymbolProperties': 'GProperties',
  'GSceneProperties': 'GProperties',
  'GTransformProperties': 'GProperties',
  
  // Menus
  'GMenu': 'GObject',
  'GMenuBar': 'GObject',
  'GMenuItem': 'GObject',
  'GContextMenu': 'GMenu',
  
  // Containers
  'GContainer': 'GObject',
  'GBrowserContainer': 'GContainer',
  
  // Dialogs
  'GSystemDialog': 'GObject',
  'GOfflineDialog': 'GObject',
  'GInstallPwaDialog': 'GObject',
  
  // Cloud
  'GCloudUser': 'GObject',
  'GCloudRole': 'GObject',
  'GSharePointClient': 'GObject',
  'CloudException': 'Error',
  'GoogleDriveException': 'Error',
  'SharepointException': 'Error',
  
  // Events
  'GDocumentEvent': 'GEvent',
  'GSettingChangedEvent': 'GEvent',
  'GDocumentStatusEvent': 'GEvent',
  'GNetworkAvailabilityChangedEvent': 'GEvent',
  'GCollaborationEvent': 'GEvent',
  'GSwatchesChangedEvent': 'GEvent',
  'GMenuOpenEvent': 'GEvent',
  'GMenuCloseEvent': 'GEvent',
  'GMenuActivateEvent': 'GEvent',
  'GApplicationStatusEvent': 'GEvent',
  'GUnloadEvent': 'GEvent',
  'GLongPressEvent': 'GEvent',
  
  // Module
  'GModule': 'GObject',
  'GView': 'GObject',
  'GInfo': 'GObject',
  'GSoftwareUpdateManager': 'GObject',
  'GElectronUpdateServiceClient': 'GObject',
  'GError': 'Error',
  'GInvalidationOptions': 'GObject',
  'GMarketingFileStorageItem': 'GObject',
  'GEffectsButton': 'GObject',
  'GAnnotations': 'GObject',
  
  // Other
  'GScenePaintConfiguration': 'GObject',
  'GSceneOptions': 'GObject',
  'GToolManager': 'GEventTarget',
  'GFont': 'GObject',
  'GWorkspace': 'GEventTarget',
  'GTransactionRecorder': 'GObject',
  'GRendererCtx': 'GObject',
  'GRendererConfig': 'GObject',
  'GComment': 'GNode',
  'GSwatch': 'GNode',
  'GDictionary': 'GObject',
  'GSystem': 'GObject',
  'GActionable': 'GObject', // mixin
  'GAnnotable': 'GObject', // mixin
};

// Common minified variable -> class mappings based on require() patterns
const COMMON_REQUIRES = {
  'n': ['GNode', 'GObject', 'GPaintContext'],
  'r': ['GRect', 'GNode', 'GElement'],
  'o': ['GObject', 'GElement', 'GPoint'],
  'a': ['GElement', 'GNode', 'GShape'],
  's': ['GShape', 'GStylable', 'GColor'],
  'l': ['GLayer', 'GLocale', 'GLength'],
  'h': ['GHitResult', 'GObject'],
  'u': ['GUtil', 'GObject'],
  'c': ['GColor', 'GObject'],
  'p': ['GPoint', 'GPath', 'GPaintCanvas'],
};

async function fixParentReferences() {
  console.log('🔧 Fixing Parent Class References');
  console.log('==================================\n');
  
  let fixed = 0;
  let total = 0;
  
  // Process all reconstructed files
  await processDirectory(RECONSTRUCTED_DIR);
  
  async function processDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processDirectory(fullPath);
      } else if (entry.name.endsWith('.js') && entry.name !== 'index.js') {
        total++;
        const wasFixed = await fixFile(fullPath);
        if (wasFixed) fixed++;
      }
    }
  }
  
  console.log(`\n✅ Fixed ${fixed} of ${total} files`);
}

async function fixFile(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  const fileName = path.basename(filePath, '.js');
  
  // Skip if not a G* class
  if (!fileName.startsWith('G')) return false;
  
  let modified = content;
  let hasChanges = false;
  
  // Check if this class has a known parent
  const knownParent = INHERITANCE_MAP[fileName];
  
  if (knownParent) {
    // Pattern 1: GObject.inherit(ClassName, minifiedVar)
    const inheritPattern = /GObject\.inherit\s*\(\s*(\w+)\s*,\s*([a-z])\s*\)/g;
    modified = modified.replace(inheritPattern, (match, className, minVar) => {
      if (className === fileName) {
        hasChanges = true;
        return `GObject.inherit(${className}, ${knownParent})`;
      }
      return match;
    });
    
    // Pattern 2: GObject.inheritAndMix(ClassName, minifiedVar, [...])
    const mixPattern = /GObject\.inheritAndMix\s*\(\s*(\w+)\s*,\s*([a-z])\s*,/g;
    modified = modified.replace(mixPattern, (match, className, minVar) => {
      if (className === fileName) {
        hasChanges = true;
        return `GObject.inheritAndMix(${className}, ${knownParent},`;
      }
      return match;
    });
  }
  
  // Fix require calls - replace minified requires with class names
  // Pattern: var n = i(0) means n = GObject (module 0)
  const requirePattern = /var\s+([a-z])\s*=\s*[a-z]\s*\(\s*(\d+)\s*\)/g;
  let match;
  const varMap = {};
  
  // First pass: build variable to class mapping
  let tempContent = content;
  while ((match = requirePattern.exec(tempContent)) !== null) {
    const [, varName, moduleId] = match;
    const className = MODULE_MAP[moduleId];
    if (className) {
      varMap[varName] = className;
    }
  }
  
  // Replace patterns like "instanceof n" with "instanceof ClassName"
  for (const [varName, className] of Object.entries(varMap)) {
    // instanceof checks
    const instanceofPattern = new RegExp(`instanceof\\s+${varName}\\b`, 'g');
    const newContent = modified.replace(instanceofPattern, `instanceof ${className}`);
    if (newContent !== modified) {
      hasChanges = true;
      modified = newContent;
    }
  }
  
  // Add dependency comments at the top
  if (Object.keys(varMap).length > 0 && !modified.includes('// Dependencies:')) {
    const deps = Object.entries(varMap)
      .map(([v, c]) => `//   ${v} = ${c}`)
      .join('\n');
    
    modified = modified.replace(
      /(\* Part of the Gravit Designer.*\n \*\/)/,
      `$1\n\n// Dependencies:\n${deps}`
    );
    hasChanges = true;
  }
  
  if (hasChanges) {
    await fs.writeFile(filePath, modified);
    return true;
  }
  
  return false;
}

fixParentReferences().catch(console.error);
