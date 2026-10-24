// Old: designer.browser.dev.js module 1718 ($.fn.gSymbolsPanel).
/**
 * The tiles of the Symbols sidebar: one tile per symbol master of the
 * scene, with its thumbnail, highlighted while the master is selected.
 * The sidebar (symbols-sidebar.ts) owns the element and calls the old
 * plugin methods: scene, relayout, newSymbolClick, isSelected,
 * removeSelected. A tile is draggable; dropping it on the canvas inserts
 * an instance (the view reads the serialized master under Node.MIME_TYPE).
 *
 * Plain DOM, like the old plugin: tiles come and go with scene events and
 * the thumbnails are the symbols' own canvases, moved into the tile.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import type { PaintCanvas } from "../../engine/paint/paint-canvas.ts";
import { Node } from "../../engine/scene/node.ts";
import { NodeFlag } from "../../engine/scene/node-change.ts";
import {
  AfterFlagChangeEvent,
  AfterPropertiesChangeEvent,
  AfterSpecialChangeEvent,
} from "../../engine/scene/node-events.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { Symbol, SymbolThumbnailEvent } from "../../engine/scene/symbol.ts";
import { CreateSymbolAction } from "../actions/modify/create-symbol-action.ts";
import { css, cssAll } from "../shell/dom.ts";
import { designer } from "../shell/globals.ts";
import { attachRichTooltip } from "../widgets/rich-tooltip.ts";
import { RichTooltipConfig } from "../widgets/rich-tooltip-config.ts";

export interface SymbolsPanelOptions {
  moveCallback?: ((...args: unknown[]) => void) | null;
  clickCallback?: ((symbol: Symbol) => void) | null;
  dblClickCallback?: ((symbol: Symbol) => void) | null;
  startDraggingCallback?: ((...args: unknown[]) => unknown) | null;
}

/** The thumbnail a symbol event or the scene's dictionary hands out. */
interface ThumbnailUpdate {
  symbol: Symbol;
  image: PaintCanvas;
}

export class SymbolsPanel {
  readonly options: SymbolsPanelOptions;
  /** The tiles' masters by multireference id. */
  symbolNodes = new Map<string, Symbol>();
  scene_: Scene | null = null;
  blockHandlers = false;
  dragNode: Symbol | null = null;
  currentFocus: unknown = null;

  private readonly _afterSpecialChange = (event: AfterSpecialChangeEvent): void =>
    this._specialChanged(event);
  private readonly _afterPropertiesChange = (): void => {
    // The old handler looked at the event and did nothing.
  };
  private readonly _afterFlagChange = (event: AfterFlagChangeEvent): void =>
    this._flagChanged(event);

  /** `$(element).gSymbolsPanel(options)`. */
  constructor(
    readonly element: HTMLElement,
    options?: SymbolsPanelOptions,
  ) {
    this.options = {
      moveCallback: null,
      clickCallback: null,
      dblClickCallback: null,
      startDraggingCallback: null,
      ...options,
    };
    element.classList.add("g-symbols-panel");
  }

  /** `gSymbolsPanel("relayout")`: re-centers every thumbnail in its tile. */
  relayout(): void {
    const images = this.element.querySelectorAll<HTMLElement>(".symbol-image");
    for (const image of images) {
      const canvas = image.querySelector("canvas");
      const height = canvas ? getComputedStyle(canvas).height || "0px" : "0px";
      centerImage(image, 0, Number(height.split("px")[0]));
    }
  }

  /**
   * `gSymbolsPanel("newSymbolClick")`: runs Create Symbol when it can.
   * Always returns false, so the sidebar never opens its accordion.
   */
  newSymbolClick(): boolean {
    if (designer().canExecuteAction(CreateSymbolAction.ID)) {
      designer().stats("symbol_click_createnewsymbol");
      designer().executeAction(CreateSymbolAction.ID, undefined, undefined, true);
    }
    return false;
  }

  /** `gSymbolsPanel("isSelected")`: a tile is highlighted. */
  isSelected(): boolean {
    return this.element.querySelectorAll(".g-highlighted").length > 0;
  }

  /** `gSymbolsPanel("removeSelected")`: removes the first highlighted tile's symbol. */
  removeSelected(): void {
    const highlighted = this.element.querySelector(".g-highlighted");
    const id =
      highlighted && highlighted.parentElement
        ? highlighted.parentElement.getAttribute("id") || ""
        : "";
    if (id) {
      const symbol = this.symbolNodes.get(id.split("_")[1] as string);
      if (symbol) this._removeSymbol(symbol);
    }
  }

  /** `gSymbolsPanel("scene")`: the shown scene. */
  getScene(): Scene | null {
    return this.scene_;
  }

  /** `gSymbolsPanel("scene", scene)`: shows the masters of another scene (null for none). */
  setScene(scene: Scene | null): void {
    if (scene === this.scene_) return;
    if (this.scene_) {
      this.scene_.removeEventListener(AfterSpecialChangeEvent, this._afterSpecialChange);
      this.scene_.removeEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange);
      this.scene_.removeEventListener(AfterFlagChangeEvent, this._afterFlagChange);
    }
    this._clear();
    this.scene_ = scene;
    if (!scene) return;
    scene.addEventListener(AfterSpecialChangeEvent, this._afterSpecialChange);
    scene.addEventListener(AfterPropertiesChangeEvent, this._afterPropertiesChange);
    scene.addEventListener(AfterFlagChangeEvent, this._afterFlagChange);
    const symbols = scene.getSymbols() as Symbol[] | null;
    if (symbols)
      symbols.forEach((symbol) => {
        this._addSymbol(symbol);
        const image = scene.getSymbolImage(symbol) as PaintCanvas | null;
        if (image) this._thumbnailUpdated({ symbol, image });
        else symbol.toBitmap();
      });
  }

  /** Adds a tile for a master the panel doesn't show yet. */
  private _addSymbol(symbol: Symbol): void {
    const id = symbol.getMultireferenceId();
    if (this.symbolNodes.get(id)) {
      if (symbol.isMaster() && !symbol.hasEventListeners(SymbolThumbnailEvent))
        symbol.addEventListener(SymbolThumbnailEvent, this._thumbnailListener());
    } else {
      const tile = this._createTile(symbol);
      if (tile) {
        this.element.appendChild(tile);
        this.symbolNodes.set(id, symbol);
      }
    }
  }

  /** Removes a master's tile; without `keepSymbol` also the symbol from the scene. */
  private _removeSymbol(symbol: Symbol, keepSymbol?: boolean): void {
    if (!symbol.isMaster()) return;
    const id = symbol.getMultireferenceId();
    const tile = this._tile(id);
    if (!tile) return;
    if (this.scene_) {
      const inScene = this._sceneSymbol(symbol);
      if (inScene) {
        // The old code removed an unbound listener here, so nothing came off.
        if (!keepSymbol) {
          const blocked = this.blockHandlers;
          this.blockHandlers = true;
          this.scene_.removeSymbol(inScene);
          this.blockHandlers = blocked;
        }
      }
    }
    this.symbolNodes.delete(id);
    tile.remove();
    if (0 === this.symbolNodes.size) this._addInfo();
  }

  /** The tile of a multireference id (the old `find("#symbol_" + id)`). */
  private _tile(id: string): HTMLElement | null {
    for (const child of this.element.children)
      if (child.getAttribute("id") === "symbol_" + id) return child as HTMLElement;
    return null;
  }

  /** A new listener for a symbol's thumbnail updates (the old code bound one per call). */
  private _thumbnailListener(): (event: SymbolThumbnailEvent) => void {
    return (event) => {
      if (event.symbol && event.image)
        this._thumbnailUpdated({ symbol: event.symbol, image: event.image });
    };
  }

  /** Puts a master's thumbnail into its tile, scaled into 85x85. */
  private _thumbnailUpdated(update: ThumbnailUpdate): void {
    const symbol = update.symbol;
    const frame = symbol.getFrame();
    if (!frame || !symbol.getPaintBBox()) return;
    const tile = this._tile(symbol.getMultireferenceId());
    const image = tile ? tile.querySelector<HTMLElement>(".symbol-image") : null;
    if (!tile || !image) return;
    image.replaceChildren();
    const ratio = frame.getHeight() / frame.getWidth();
    let width = 85;
    let height = width * ratio;
    if (height > 85) width = (height = 85) / ratio;
    centerImage(image, width, height);
    const canvas = update.image.getBitmap().getHTMLElement(true);
    cssAll(canvas, { width, height, margin: "5px" });
    if (symbol.hasFlag(NodeFlag.Selected))
      tile.querySelector(".symbol-title-group")?.classList.add("g-highlighted");
    image.appendChild(canvas);
  }

  private _createTile(symbol: Symbol): HTMLElement | null {
    if (!symbol.isMaster()) return null;
    if (!(symbol instanceof Symbol)) throw new Error("item not symbol");
    const info = this.element.querySelector(".symbol-panel-info");
    if (info && info.parentElement) info.parentElement.remove();
    const tile = document.createElement("div");
    tile.setAttribute("draggable", "false");
    tile.setAttribute("id", "symbol_" + symbol.getMultireferenceId());
    css(tile, "display", "inline");
    attachRichTooltip(
      tile,
      RichTooltipConfig.from({
        title: symbol.getProperty("name") as string,
        description: Locale.get(
          new LocaleKey("GCommonNames", "text.symbol-panel-symbol-tooltip-description"),
        ) as string,
        middle: false,
        learnMore: "",
      }),
    );
    const group = document.createElement("span");
    group.classList.add("symbol-title-group");
    tile.appendChild(group);
    symbol.addEventListener(SymbolThumbnailEvent, this._thumbnailListener());
    const image = document.createElement("span");
    image.classList.add("symbol-image");
    group.appendChild(image);
    group.setAttribute("draggable", "true");
    cssAll(group, {
      display: "inline-block",
      backgroundColor: "#eee",
      margin: "5px",
      height: "95px",
      width: "45%",
      textAlign: "center",
      lineHeight: "180px",
    });
    group.addEventListener("dragstart", (event) => {
      group.classList.add("g-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(Node.MIME_TYPE, Node.serialize(symbol) as string);
      }
      this.dragNode = symbol;
      setTimeout(() => group.classList.remove("g-dragging"), 0);
    });
    group.addEventListener("drop", () => {
      this.dragNode = null;
    });
    group.addEventListener("click", () => {
      designer().stats("symbol_click_select");
      const target = this._sceneSymbol(symbol);
      if (target) {
        if (target.getScene()) this.options.clickCallback?.(target);
        else group.classList.toggle("g-highlighted");
      }
    });
    group.addEventListener("dblclick", () => {
      designer().stats("symbol_click_focus");
      const target = this._sceneSymbol(symbol);
      if (target) this.options.dblClickCallback?.(target);
    });
    return tile;
  }

  /** The symbol itself when it is in a scene, else the scene's master with its id. */
  private _sceneSymbol(symbol: Symbol): Symbol | null {
    if (symbol.getScene()) return symbol;
    if (!this.scene_) return null;
    const symbols = (this.scene_.getSymbols() as Symbol[] | null) || [];
    for (const candidate of symbols)
      if (candidate.getMultireferenceId() === symbol.getMultireferenceId()) return candidate;
    return null;
  }

  /** A symbol was created or removed in the scene. */
  private _specialChanged(event: AfterSpecialChangeEvent): void {
    if (this.blockHandlers || !(event.node instanceof Symbol)) return;
    const data = event.data as { created?: boolean } | null;
    if (data && data.created) {
      this._addSymbol(event.node);
      const image = (this.scene_ as Scene).getSymbolImage(event.node) as PaintCanvas | null;
      if (image) this._thumbnailUpdated({ symbol: event.node, image });
      else event.node.toBitmap();
    } else this._removeSymbol(event.node, true);
  }

  /** Highlights a master's tile while it (or something inside it) is selected. */
  private _flagChanged(event: AfterFlagChangeEvent): void {
    let node: Node | null = event.node;
    while (node && !(node instanceof Symbol && node.isMaster())) node = node.getParent();
    if (this.blockHandlers || !node) return;
    const tile = this._tile(node.getMultireferenceId());
    const group = tile ? tile.querySelector(".symbol-title-group") : null;
    if (group && event.flag === NodeFlag.Selected) {
      if (event.set) group.classList.add("g-highlighted");
      else group.classList.remove("g-highlighted");
    }
  }

  private _clear(): void {
    this.symbolNodes = new Map();
    this.scene_ = null;
    this.element.replaceChildren();
    this._addInfo();
  }

  /** The "no symbols defined" note. */
  private _addInfo(): void {
    const wrapper = document.createElement("div");
    const info = document.createElement("div");
    info.classList.add("symbol-panel-info");
    const title = document.createElement("div");
    title.classList.add("symbol-panel-infotitle");
    title.textContent = Locale.get(
      new LocaleKey("GCreateSymbolAction", "common.nosymbolsdefined"),
    ) as string;
    const text = document.createElement("span");
    text.textContent = Locale.get(
      new LocaleKey("GCreateSymbolAction", "common.nosymbolsdefined-info"),
    ) as string;
    info.append(title, text);
    wrapper.appendChild(info);
    this.element.appendChild(wrapper);
  }
}

/** Moves the thumbnail so its middle sits at the tile's middle line. */
function centerImage(image: HTMLElement, _width: number, height: number): void {
  cssAll(image, { position: "relative", top: height / 2 - 42.5 + "px" });
}
