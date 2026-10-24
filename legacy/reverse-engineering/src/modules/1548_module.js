/**
 * Webpack Module #1548
 * Type: unknown
 */

function (e, t, n) {
    "use strict";
    n(8), n(196), n(4), n(13), n(38);
    const o = n(156);
    function i(e, t, n) {
      var o;
      (this._folder = e),
        (this._isRootFolder = n),
        (this._container = $("<div/>").addClass("g-container").data("node", e)),
        (this._element = o =
          $("<div/>")
            .addClass("g-gravit-folder")
            .addClass("g-cloud-element")
            .attr("data-title", e.name)
            .data("node", e)
            .appendTo(this._container)),
        (this._childrenContainer = $("<div/>")
          .addClass("g-children")
          .appendTo(this._container)),
        (this._folderContainer = $("<div/>")
          .addClass("folder-container")
          .appendTo(o)),
        (this._folderState = $("<div />")
          .addClass("folder-state-icon")
          .appendTo(this._folderContainer)),
        (this._folderIcon = $("<div />")
          .addClass("folder-icon")
          .appendTo(this._folderContainer)),
        $("<div />")
          .addClass("name")
          .text(e.name)
          .appendTo(this._folderContainer),
        $("<input />")
          .attr("type", "text")
          .css("display", "none")
          .addClass("folder-name")
          .css("width", this._folderContainer.find(".name").outerWidth())
          .val(e.name)
          .appendTo(this._folderContainer),
        (this._parent = t),
        (this._folderContext = $("<div/>")
          .addClass("folder-context")
          .append(
            $("<span />")
              .addClass("icon")
              .addClass("gravit-icon-w-kebab")
              .on("mouseover", function (e) {
                e.stopPropagation();
              })
          )
          .on("mouseover", function (e) {
            e.stopPropagation();
          })
          .appendTo(o)),
        this._update();
    }
    (i.prototype._isRootFolder = !1),
      (i.prototype._parent = null),
      (i.prototype._container = null),
      (i.prototype._element = null),
      (i.prototype._folderContainer = null),
      (i.prototype._folderContext = null),
      (i.prototype._folder = null),
      (i.prototype._loading = !1),
      (i.prototype._children = null),
      (i.prototype._isOpen = !1),
      (i.prototype._done = !1),
      (i.prototype.isRootFolder = function () {
        return this._isRootFolder;
      }),
      (i.prototype.isLoading = function () {
        return this._loading;
      }),
      (i.prototype.getFolder = function () {
        return this._folder;
      }),
      (i.prototype.getParent = function () {
        return this._parent;
      }),
      (i.prototype.setLoading = function (e) {
        this._loading !== e && ((this._loading = e), this._update());
      }),
      (i.prototype.onToggle = function (e) {
        return (this._onToggle = e), this;
      }),
      (i.prototype.toggleState = function () {
        gDesigner.stats("filespanel_expand-collapse_cloudfolder"),
          this._folderState.removeClass("open"),
          this._folderState.removeClass("closed"),
          (this._isOpen = !this._isOpen),
          this._update(),
          this._onToggle && this._onToggle(this._isOpen);
      }),
      (i.prototype.isStateOpen = function () {
        return this._isOpen;
      }),
      (i.prototype.update = function () {
        this._update();
      }),
      (i.prototype.setRefreshHandler = function (e) {
        return (this._refreshCallback = e), this;
      }),
      (i.prototype.isDone = function () {
        return this._done;
      }),
      (i.prototype.loadChildrenOnDemand = function (e) {
        this.setLoading(!0);
        const t = (this._children || []).length;
        return e(this._folder, 100, t)
          .then((e) => {
            (this._done = e.length < 100),
              e.length &&
                (this._childrenContainer.append(
                  e.map((e) => e.getHTMLContainer())
                ),
                (this._children = this._children.concat(e))),
              this.update();
          })
          .finally(() => {
            this.setLoading(!1);
          });
      }),
      (i.prototype.refresh = function () {
        return (
          this.setChildren([]),
          this.update(),
          this._refreshCallback && this._refreshCallback(this)
        );
      }),
      (i.prototype._update = function () {
        this._children && this._children.length
          ? (this._folderState.addClass(this._isOpen ? "open" : "closed"),
            this._isOpen
              ? this._childrenContainer.show()
              : this._childrenContainer.hide())
          : this._childrenContainer.hide(),
          this._folderIcon.empty(),
          this._folderIcon.append(
            $("<div />")
              .addClass("icon")
              .addClass(
                this._loading
                  ? "loading"
                  : this._folder.getIcon() || "gravit-icon-w-folder"
              )
          );
      }),
      (i.prototype.onClick = function (e) {
        return (
          this._folderContainer.on("click", (t) => {
            t.stopPropagation(), e(this._folder, this.getHTMLElement());
          }),
          this
        );
      }),
      (i.prototype.onDoubleClick = function (e) {
        return (
          this._folderContainer.on("dblclick", (t) => {
            t.stopPropagation(), e(this._folder, this.getHTMLElement());
          }),
          this
        );
      }),
      (i.prototype.onFolderStateClick = function (e) {
        return (
          this._folderState.on("click", (t) => {
            t.stopPropagation(), e(this._folder, this.getHTMLElement());
          }),
          this
        );
      }),
      (i.prototype.onContext = function (e) {
        return (
          this._folderContext &&
            (this._element.on("contextmenu", (t) => {
              t.stopPropagation(), e(this._folder, this.getHTMLElement(), t);
            }),
            this._folderContext.on("click", (t) => {
              t.stopPropagation(), e(this._folder, this.getHTMLElement(), t);
            })),
          this
        );
      }),
      (i.prototype.onFileDrop = function (e) {
        let t = null,
          n = this;
        return (
          this._element
            .on("drop", async function (t) {
              $(this).removeClass("drag-over");
              const i = t.originalEvent.dataTransfer,
                a = JSON.parse(i.getData("text"));
              var r = o.from(a);
              e(r, n._folder);
            })
            .on("dragover", function (e) {
              $(this).addClass("drag-over"),
                t ||
                  (t = setTimeout(() => {
                    n._isOpen || n._folderState.trigger("click");
                  }, 1e3));
            })
            .on("dragleave", function (e) {
              $(this).removeClass("drag-over"),
                t && clearTimeout(t),
                (t = null);
            }),
          this
        );
      }),
      (i.prototype.getHTMLContainer = function () {
        return this._container;
      }),
      (i.prototype.setChildren = function (e) {
        (this._children = e),
          this._childrenContainer.empty(),
          (this._children && this._children.length) || (this._isOpen = !1),
          this._children &&
            this._children.length &&
            this._childrenContainer.append(e.map((e) => e.getHTMLContainer()));
      }),
      (i.prototype.getChildren = function () {
        return this._children;
      }),
      (i.prototype.getHTMLElement = function () {
        return this._element;
      }),
      (e.exports = i);
  }