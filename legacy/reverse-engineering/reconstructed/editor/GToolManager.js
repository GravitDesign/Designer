/**
     * The manager for tools
     * @class GToolManager
     * @extends IFObject
     * @mixes GEventTarget
     * @constructor
     * @version 1.0
     */

function GToolManager() {
  // Constructor (reconstructed)
}

// Prototype methods
/**
     * @private
     */
GToolManager.prototype._addActiveToolToView = function () {
          this._activeTool &&
            this._view &&
            (this._activeTool.activate(this._view),
            this._updateActiveToolCursor());
        }

/**
     * @private
     */
    IFToolManager.prototype._addActiveToolToView = function () {
        if (this._activeTool && this._view) {
            // Let tool activate on the view
            this._activeTool.activate(this._view);

            // Update view's cursor
            this._updateActiveToolCursor();
        }
    };

    /**
     * @private
     */
GToolManager.prototype._removeActiveToolFromView = function (e) {
          this._activeTool &&
            this._view &&
            (this._activeTool.deactivate(this._view, e),
            this._view.setCursor(null),
            this._view.getEditor().closeInlineEditor());
        }

/**
     * Enforce a cursor update for the current view and tool.
     * This is usually called from the tools
     * @private
     */
GToolManager.prototype._updateActiveToolCursor = function () {
          this._activeTool &&
            this._view &&
            this._view.setCursor(this._activeTool.getCursor());
        }

GToolManager.prototype._updateInlineHint = function (e, t, i) {
          if (this._activeTool && this._view)
            if (e && t) {
              var n = this._view
                .getWorldTransform(this._view.getScene().getActivePage())
                .mapPoint(t);
              this._view.updateInlineHint(e, new l(n.getX(), n.getY()), i);
            } else this._view.updateInlineHint(null);
        }

/**
     * Invalidate and request a repaint of active tool area
     * @param {IFRect} [area] the area of invalidation, if not provided
     * or null, invalidates the whole area
     * @private
     */
GToolManager.prototype._invalidateActiveToolArea = function (area) {
          this.hasEventListeners(V.InvalidationRequestEvent) &&
            this._activeTool &&
            this._view &&
            this.trigger(new V.InvalidationRequestEvent(this, e));
        }

GToolManager.prototype.paint = function (e) {
          this._activeTool && this._activeTool.paint(e);
        }

/**
     * Called when this toolmanager should paint itself.
     * @param {IFPaintContext} context
     * @version 1.0
     */
    IFToolManager.prototype._paint = function (context) {
        if (this._activeTool) {
            this._activeTool.paint(context);
        }
    };

    /**
     * @private
     */
GToolManager.prototype._updateTemporaryTool = function (e) {
          if (!this._view.getEditor().isInlineEditing()) {
            var t = this.getTool(this.indexOf(g)),
              i = this.getTool(this.indexOf(F)),
              r = null;
            if (
              ((n.modifiers.spaceKey || n.modifiers.middleButton) &&
              this._temporaryActiveTool !== t
                ? (r = t)
                : this._temporaryActiveTool &&
                  this._tempActivationTime &&
                  !(
                    ((e.spaceKey || e.middleButton) && this._activeTool == t) ||
                    (!n.modifiers.metaKey && e.metaKey && this._activeTool == i)
                  ) &&
                  (r = this._activeTool),
              r ||
                !t ||
                t.isDeactivatable() ||
                this._view.trigger(new D.DragEnd()),
              n.modifiers.metaKey &&
                (r === t || this._activeTool instanceof g) &&
                !this._tempActivationTime &&
                (r = i),
              !r && this._temporaryActiveTool)
            )
              this._activateTool(this._temporaryActiveTool) &&
                ((this._temporaryActiveTool = null),
                (this._tempActivationTime = null));
            else if (r && r !== this._activeTool) {
              var o = this._activeTool;
              this._activateTool(r, null, !0) &&
                (this._temporaryActiveTool || (this._temporaryActiveTool = o));
            }
          }
        }

/**
     * @param {GUIPlatform.ModifiersChangedEvent} event
     * @private
     */
GToolManager.prototype._modifiersChanged = function (event) {
          this._updateTemporaryTool(e.changed);
        }

/**
     * @param {GUIPlatform.ModifiersChangedEvent} event
     * @private
     */
    IFToolManager.prototype._modifiersChanged = function (event) {
        // Update temporary tool
        this._updateTemporaryTool();
    };

    /** override */
GToolManager.prototype.toString = function () {
          return "[Object GToolManager]";
        }

module.exports = GToolManager;
