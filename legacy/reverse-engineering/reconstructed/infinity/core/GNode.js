/**
 * GNode
 * 
 * Base class for tree node structures in Gravit Designer.
 * Provides parent-child relationships, traversal, and properties.
 * 
 * Reconstructed from minified source
 */

var GObject = require('./GObject');

/**
 * @constructor GNode - Base tree node class
 */
function GNode() {
  this._parent = null;
  this._children = [];
  this._properties = {};
  this._flags = 0;
}

GObject.inherit(GNode, GObject);

// Node flags
GNode.Flag = {
  Selected: 1,
  Highlighted: 2,
  Active: 4,
  Expanded: 8,
  Hidden: 16,
  Locked: 32
};

/**
 * Get the parent node
 * @returns {GNode|null}
 */
GNode.prototype.getParent = function() {
  return this._parent;
};

/**
 * Get children array
 * @returns {Array<GNode>}
 */
GNode.prototype.getChildren = function() {
  return this._children;
};

/**
 * Get first child
 * @returns {GNode|null}
 */
GNode.prototype.getFirstChild = function() {
  return this._children.length > 0 ? this._children[0] : null;
};

/**
 * Get last child
 * @returns {GNode|null}
 */
GNode.prototype.getLastChild = function() {
  return this._children.length > 0 ? this._children[this._children.length - 1] : null;
};

/**
 * Get next sibling
 * @returns {GNode|null}
 */
GNode.prototype.getNext = function() {
  if (this._parent) {
    var idx = this._parent._children.indexOf(this);
    if (idx >= 0 && idx < this._parent._children.length - 1) {
      return this._parent._children[idx + 1];
    }
  }
  return null;
};

/**
 * Get previous sibling
 * @returns {GNode|null}
 */
GNode.prototype.getPrevious = function() {
  if (this._parent) {
    var idx = this._parent._children.indexOf(this);
    if (idx > 0) {
      return this._parent._children[idx - 1];
    }
  }
  return null;
};

/**
 * Check if this node is a child (direct or indirect) of another node
 * @param {GNode} node - Potential ancestor
 * @returns {boolean}
 */
GNode.prototype.isChildOf = function(node) {
  var parent = this._parent;
  while (parent) {
    if (parent === node) return true;
    parent = parent._parent;
  }
  return false;
};

/**
 * Get a property value
 * @param {string} name - Property name
 * @returns {*} Property value
 */
GNode.prototype.getProperty = function(name) {
  return this._properties[name];
};

/**
 * Set a property value
 * @param {string} name - Property name
 * @param {*} value - Property value
 */
GNode.prototype.setProperty = function(name, value) {
  this._properties[name] = value;
};

/**
 * Check if a flag is set
 * @param {number} flag - Flag to check
 * @returns {boolean}
 */
GNode.prototype.hasFlag = function(flag) {
  return (this._flags & flag) !== 0;
};

/**
 * Set a flag
 * @param {number} flag - Flag to set
 */
GNode.prototype.setFlag = function(flag) {
  this._flags |= flag;
};

/**
 * Remove a flag
 * @param {number} flag - Flag to remove
 */
GNode.prototype.removeFlag = function(flag) {
  this._flags &= ~flag;
};

/**
 * Toggle a flag
 * @param {number} flag - Flag to toggle
 */
GNode.prototype.toggleFlag = function(flag) {
  this._flags ^= flag;
};

/**
 * Add a child node
 * @param {GNode} child - Child to add
 * @param {GNode} [reference] - Insert before this node
 */
GNode.prototype.appendChild = function(child, reference) {
  if (child._parent) {
    child._parent.removeChild(child);
  }
  
  child._parent = this;
  
  if (reference) {
    var idx = this._children.indexOf(reference);
    if (idx >= 0) {
      this._children.splice(idx, 0, child);
      return;
    }
  }
  
  this._children.push(child);
};

/**
 * Remove a child node
 * @param {GNode} child - Child to remove
 */
GNode.prototype.removeChild = function(child) {
  var idx = this._children.indexOf(child);
  if (idx >= 0) {
    this._children.splice(idx, 1);
    child._parent = null;
  }
};

/**
 * Accept a visitor
 * @param {Function} visitor - Visitor function(node)
 * @param {boolean} [reverse] - Visit in reverse order
 */
GNode.prototype.accept = function(visitor, reverse) {
  if (visitor(this) === false) return false;
  
  var children = this._children;
  if (reverse) {
    for (var i = children.length - 1; i >= 0; i--) {
      if (children[i].accept(visitor, reverse) === false) return false;
    }
  } else {
    for (var i = 0; i < children.length; i++) {
      if (children[i].accept(visitor, reverse) === false) return false;
    }
  }
  
  return true;
};

/**
 * String representation
 * @returns {string}
 */
GNode.prototype.toString = function() {
  return '[Object GNode]';
};

module.exports = GNode;
