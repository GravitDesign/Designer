/**
 * GObject
 * 
 * The root class for all Gravit Designer objects.
 * Provides inheritance system, mixin support, and type information.
 * 
 * Reconstructed from minified source
 */

/**
 * @constructor GObject - Base object class
 */
function GObject() {}

// Internal type ID counter for inheritance tracking
GObject._internalTypeIdCounter = 1;

/**
 * Get the type ID of an object or class
 * @param {*} obj - Object or constructor function
 * @returns {number|null} The type ID or null
 */
GObject.getTypeId = function(obj) {
  return typeof obj === 'number' 
    ? obj 
    : typeof obj === 'function' && obj.prototype.hasOwnProperty('__gtype_id__')
      ? obj.prototype.__gtype_id__
      : obj && typeof obj.__gtype_id__ === 'number'
        ? obj.__gtype_id__
        : null;
};

/**
 * Get the name of an object or function
 * @param {*} obj - Object or function
 * @returns {string} The name
 */
GObject.getName = function(obj) {
  if (obj) {
    if (typeof obj === 'object') {
      obj = obj.constructor;
    }
    if (obj && typeof obj === 'function') {
      var match = /function (.{1,})\(/.exec(obj.toString());
      return match && match.length > 1 ? match[1].trim() : 'anonymous';
    }
    return obj.toString();
  }
  return '<null>';
};

/**
 * Set up inheritance between two classes
 * @param {Function} child - Child class constructor
 * @param {Function} parent - Parent class constructor
 */
GObject.inherit = function(child, parent) {
  child.prototype = Object.create(parent.prototype);
  child.prototype.__gtype_id__ = GObject._internalTypeIdCounter++;
  child.prototype.constructor = child;
  
  // Clear inherited mixins
  delete child.prototype.__gmixins__;
  
  // Copy parent's mixins
  if (parent.prototype.__gmixins__) {
    child.prototype.__gmixins__ = {};
    for (var key in parent.prototype.__gmixins__) {
      child.prototype.__gmixins__[key] = true;
    }
  }
  
  // Copy static methods from parent
  if (parent !== GObject) {
    for (var prop in parent) {
      if (prop && 
          prop.length > 0 && 
          prop !== 'constructor' && 
          prop !== '__gmixins__' && 
          prop !== 'toString' && 
          prop.charAt(0) !== '_' && 
          !child[prop]) {
        child[prop] = parent[prop];
      }
    }
  }
};

/**
 * Apply mixins to a class
 * @param {Function} target - Target class constructor
 * @param {Array<Function>} mixins - Array of mixin constructors
 */
GObject.mix = function(target, mixins) {
  GObject.inheritAndMix(target, null, mixins);
};

/**
 * Set up inheritance and apply mixins
 * @param {Function} child - Child class constructor
 * @param {Function|null} parent - Parent class constructor or null
 * @param {Array<Function>} mixins - Array of mixin constructors
 * @param {boolean} [override] - Whether mixins can override existing methods
 */
GObject.inheritAndMix = function(child, parent, mixins, override) {
  if (parent) {
    this.inherit(child, parent);
  }
  
  if (mixins) {
    if (!child.prototype.__gmixins__) {
      child.prototype.__gmixins__ = {};
    }
    
    for (var i = 0; i < mixins.length; i++) {
      var mixin = mixins[i].prototype;
      
      // Copy mixin methods
      for (var prop in mixin) {
        if (prop && 
            prop !== 'constructor' && 
            prop !== 'toString' && 
            prop !== '__gmixins__' && 
            prop !== '__gtype_id__' && 
            prop !== 'hasMixin') {
          if (prop in child.prototype) {
            if (!override) {
              throw new Error('Mixin ' + mixin + ' may not override ' + prop + ' in ' + child.prototype);
            }
            child.prototype[prop] = mixin[prop];
          } else {
            child.prototype[prop] = mixin[prop];
          }
        }
      }
      
      // Track mixin type
      if (!mixin.__gtype_id__) {
        mixin.__gtype_id__ = GObject._internalTypeIdCounter++;
      }
      child.prototype.__gmixins__[mixin.__gtype_id__] = true;
      
      // Copy static methods from mixin
      for (var staticProp in mixins[i]) {
        if (staticProp !== 'prototype' && !child[staticProp]) {
          child[staticProp] = mixins[i][staticProp];
        }
      }
    }
  }
};

/**
 * Check if an object has a specific mixin
 * @param {Object} obj - Object to check
 * @param {Function} mixin - Mixin constructor to check for
 * @returns {boolean} Whether the object has the mixin
 */
GObject.prototype.hasMixin = function(mixin) {
  if (this.__gmixins__) {
    var typeId = GObject.getTypeId(mixin);
    return typeId !== null && this.__gmixins__[typeId] === true;
  }
  return false;
};

/**
 * Get the class name of this object
 * @returns {string} The class name
 */
GObject.prototype.getClassName = function() {
  return GObject.getName(this);
};

/**
 * String representation
 * @returns {string}
 */
GObject.prototype.toString = function() {
  return '[Object GObject]';
};

module.exports = GObject;
