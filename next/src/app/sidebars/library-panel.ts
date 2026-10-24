// Old: designer.browser.dev.js module 1663 (the library panel, unnamed class).
/**
 * The content of the Libraries sidebar: a search box and the category
 * tiles (library-elements.ts), three per row, each row followed by the
 * box its assets open in. Assets are tiles that insert an element on
 * click or on a drag to the canvas; photos are laid out in columns.
 *
 * The assets came from the marketplace and Unsplash APIs of the cloud
 * service, which the rewrite doesn't have. Every request fails the way
 * the old local app's failed (no API object), so a category or a search
 * opens an empty box; see "The library panel can't load assets any more"
 * in QUESTIONS.md. The asset code is kept for when a source comes back.
 *
 * Plain DOM, like the old panel: the boxes are filled, emptied and
 * reordered by the handlers.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Rect } from "../../engine/math/rect.ts";
import { Transform } from "../../engine/math/transform.ts";
import type { Node } from "../../engine/scene/node.ts";
import { Rectangle } from "../../engine/scene/rectangle.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { FillPaintLayer } from "../../engine/style/fill-paint-layer.ts";
import { TexturePattern } from "../../engine/style/texture-pattern.ts";
import { SVGImport } from "../../io/import/svg/svg-import.ts";
import type { Document } from "../document/document.ts";
import { css, cssAll } from "../shell/dom.ts";
import { container, designer } from "../shell/globals.ts";
import { debounce, stringToBase64String } from "../util/designer-util.ts";
import { LibraryElements, type LibraryCategory } from "./library-elements.ts";

/** An asset as the market listed it. */
export interface LibraryAsset {
  id?: string;
  name?: string;
  path: string;
  url?: string;
  url_t?: string;
  content?: string;
  type?: string;
  width?: number;
  height?: number;
  image?: { thumb: string; width: number; height: number };
  user?: { name: string; profile: string };
}

/** What a box is loading: a category, a sub category or a search text. */
type AssetQuery = LibraryCategory | { name: string; path?: string; tag?: string } | string;

type UpdateUI = (
  wrapper: HTMLElement,
  query: AssetQuery,
  assets: LibraryAsset[],
  search?: boolean,
  append?: boolean,
) => void;

/** The marketplace and Unsplash calls: there is no API object any more. */
function marketApi(): never {
  throw new TypeError("No marketplace API");
}

function div(className?: string): HTMLDivElement {
  const element = document.createElement("div");
  if (className) element.className = className;
  return element;
}

/** jQuery's `:visible`. */
function isVisible(element: HTMLElement): boolean {
  return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

function queryName(query: AssetQuery | null): string {
  if (!query) return "";
  if (typeof query === "string") return query;
  return query.name || query.path || "";
}

/** A wrapper with its inner photo column wrapper (for search results). */
function assetsBox(withImages: boolean): HTMLDivElement {
  const box = div("assets");
  css(box, "display", "none");
  const content = div("assets-content");
  const wrapper = div("assets-wrapper");
  if (withImages) wrapper.appendChild(div("assets-wrapper images"));
  content.append(div("indicator"), wrapper);
  box.appendChild(content);
  return box;
}

let scrollHandler: ((event: globalThis.Event) => void) | null = null;

export class LibraryPanel {
  _parent: HTMLElement;
  _libraryPanel: HTMLElement;
  _CURRENT_SKIP_COUNT = 0;
  _IMAGE_PAGE_COUNT = 1;
  _CURRENT_CATEGORY: AssetQuery | null = null;
  _CURRENT_ROOT_CATEGORY: AssetQuery | null = null;
  _IMAGE_ASSET_DRAINED = false;
  _LOADING = false;
  _wrapperWidth = 250;
  _debouncedResizeHandler: () => void;

  // Drag state.
  _clickCheckTime = 0;
  _dragging = false;
  _dragMoved = false;
  _dragOffset: { x: number; y: number } | null = null;
  _currentElement: HTMLElement | null = null;
  _currentItem: LibraryAsset | null = null;
  _previewSize: { w: number; h: number } = { w: 0, h: 0 };
  dragPreview: HTMLElement | null = null;
  _itemDragListener: ((event: MouseEvent) => void) | null = null;
  _itemDragEndListener: ((event: MouseEvent) => void) | null = null;

  constructor(parent: HTMLElement) {
    this._parent = parent;
    this._debouncedResizeHandler = debounce(() => {
      const wrappers = [...this._parent.querySelectorAll<HTMLElement>(".assets-wrapper")].filter(
        (wrapper) => wrapper.children.length,
      );
      const first = wrappers[0];
      const width = first ? getComputedStyle(first).width : "";
      const current = width ? parseInt(width.split("px")[0] as string) : 250;
      if (first && Math.abs(current - this._wrapperWidth) > 50) {
        this._wrapperWidth = current;
        this._initMasonryLayoutColumns(first, null, false, true);
      }
    }, 200);
    const panel = div("g-library-panel");
    parent.appendChild(panel);
    this._libraryPanel = panel;
    this._createSearch(panel);
    this._initElements(panel);
  }

  /** Fills a box: the sub category selector once, then the asset tiles. */
  _updateUI(
    wrapper: HTMLElement,
    query: AssetQuery,
    assets: LibraryAsset[],
    _search?: boolean,
    append?: boolean,
  ): void {
    const children =
      append || typeof query === "string"
        ? []
        : ((query as LibraryCategory).children as AssetQuery[] | undefined) || [];
    const images = wrapper.querySelector<HTMLElement>(".images");
    if (children.length > 0 && 0 === wrapper.querySelectorAll("select").length) {
      const select = document.createElement("select");
      select.classList.add("selector");
      const categories = new Map<HTMLOptionElement, AssetQuery>();
      select.addEventListener("change", () => {
        const chosen = categories.get(select.options[select.selectedIndex] as HTMLOptionElement);
        this._CURRENT_SKIP_COUNT = 0;
        this._IMAGE_PAGE_COUNT = 1;
        for (const tile of wrapper.querySelectorAll(".asset-container")) tile.remove();
        let name: string;
        if (chosen) {
          this._CURRENT_CATEGORY = chosen;
          name = queryName(this._CURRENT_ROOT_CATEGORY);
          if (name) name += "-";
          name += queryName(this._CURRENT_CATEGORY);
        } else {
          this._CURRENT_CATEGORY = query;
          this._CURRENT_ROOT_CATEGORY = query;
          name = queryName(this._CURRENT_CATEGORY);
          if (name) name += "-";
          name += "All";
        }
        designer().stats("librarypanel_change_category", name);
        this._loadAssets(wrapper, this._CURRENT_CATEGORY, this._updateUI.bind(this));
      });
      if ("element.image" === (query as LibraryCategory).path) select.classList.add("full-width");
      const content = wrapper.parentElement as HTMLElement;
      for (const old of content.querySelectorAll(".selector-container")) old.remove();
      const selectorContainer = div("selector-container");
      selectorContainer.appendChild(select);
      content.querySelector(".indicator")?.after(selectorContainer);
      const all = document.createElement("option");
      all.textContent = Locale.get(new LocaleKey("GCommonNames", "element.all")) as string;
      select.appendChild(all);
      for (const child of children as { name: string }[]) {
        const key = "element.child.name." + child.name.toLowerCase().trim().replace(/\s+/g, "-");
        const option = document.createElement("option");
        option.textContent = Locale.get(new LocaleKey("GCommonNames", key), child.name) as string;
        categories.set(option, child);
        select.appendChild(option);
      }
    }
    const photos: LibraryAsset[] = [];
    if (!append) for (const tile of wrapper.querySelectorAll(".asset")) tile.remove();
    for (const asset of assets) {
      const isPhoto = !!asset.path && asset.path.startsWith("element.image");
      const uri = this._getPreviewURI(asset);
      if (isPhoto) photos.push(asset);
      else {
        const tile = div("asset-container");
        tile.setAttribute("data-title", asset.name || "");
        const image = document.createElement("img");
        image.addEventListener("dragstart", (event) => event.preventDefault());
        image.setAttribute("draggable", "false");
        image.setAttribute("src", uri);
        image.addEventListener("mousedown", (event) => this._onItemDragStartHandler(asset, event));
        image.classList.add("asset");
        tile.appendChild(image);
        wrapper.appendChild(tile);
      }
    }
    this._initMasonryLayoutColumns(images || wrapper, photos, append);
  }

  /** Lays the photos out in columns of about 200px, each into the shortest column. */
  _initMasonryLayoutColumns(
    wrapper: HTMLElement,
    items: (LibraryAsset | HTMLElement)[] | null,
    append?: boolean,
    reflow?: boolean,
  ): void {
    let list = items || [];
    if (reflow) {
      const tiles: HTMLElement[] = [];
      for (const column of [...wrapper.querySelectorAll<HTMLElement>(".column")]) {
        tiles.push(...([...column.children] as HTMLElement[]));
        column.replaceWith(...column.childNodes);
      }
      list = tiles;
    }
    if (0 === list.length) return;
    const width = getComputedStyle(wrapper).width;
    this._wrapperWidth = width ? parseInt(width.split("px")[0] as string) : 250;
    let count = 2;
    count = Math.max(Math.ceil(this._wrapperWidth / 200), count);
    const columnWidth = this._wrapperWidth / count - 4 * (count - 1);
    const cssWidth = count > 2 ? (columnWidth / this._wrapperWidth) * 100 + "%" : "calc(50% - 4px)";
    let columns: HTMLElement[] = [];
    if (append) columns = [...wrapper.querySelectorAll<HTMLElement>(".column")];
    else
      for (let i = 0; i < count; i++) {
        const column = div("column");
        css(column, "width", cssWidth);
        if (i > 0) css(column, "margin-left", "4px");
        columns.push(column);
      }
    const heights = columns.map((column) => this._getChildrenHeight(column));
    const byColumn: HTMLElement[][] = [];
    for (const item of list) {
      let tile: HTMLElement;
      let asset: LibraryAsset;
      if (reflow) {
        tile = item as HTMLElement;
        asset = assetOf.get(tile) as LibraryAsset;
      } else {
        asset = item as LibraryAsset;
        const image = document.createElement("img");
        image.classList.add("asset");
        image.setAttribute("draggable", "false");
        image.setAttribute("src", this._getPreviewURI(asset));
        image.addEventListener("dragstart", (event) => event.preventDefault());
        if (designer().isTouchDevice())
          image.addEventListener("click", () => this._addAsset(asset));
        else
          image.addEventListener("mousedown", (event) =>
            this._onItemDragStartHandler(asset, event),
          );
        tile = div("asset-container image-asset");
        css(tile, "margin-bottom", "4px");
        assetOf.set(tile, asset);
        const credit = document.createElement("span");
        credit.textContent = asset.user ? asset.user.name : "";
        credit.setAttribute("draggable", "false");
        credit.addEventListener("click", (event) => {
          event.preventDefault();
          const url = new URL((asset.user as { profile: string }).profile);
          url.searchParams.append("utm_source", encodeURIComponent("Gravit Designer"));
          url.searchParams.append("utm_medium", "referral");
          container().openExternalLink(event, url.toString());
        });
        tile.append(credit, image);
      }
      const index = this._getSmallestColumnIndex(heights);
      const height = this._getThumbnailSize(asset).getHeight();
      heights[index] = (heights[index] || 0) + height;
      (byColumn[index] = byColumn[index] || []).push(tile);
    }
    columns.forEach((column, index) => column.append(...(byColumn[index] || [])));
    if (!append) wrapper.append(...columns);
  }

  /** Inserts an asset at `position` (scene coordinates), or centered. */
  _addAsset(asset: LibraryAsset, position?: { x: number; y: number; center?: boolean }): void {
    void (async () => {
      const document = designer().getActiveDocument() as unknown as Document;
      if (asset.content) {
        if (position) position.center = true;
        document.placeOrImport(
          new Blob([asset.content], { type: asset.type || "image/svg+xml" }),
          position,
          false,
          true,
        );
      } else if (asset.path.startsWith("element.ui.")) {
        try {
          const text = await fetch(asset.url as string).then((response) => {
            if (!response.ok) throw new Error();
            return response.text();
          });
          const xml = new DOMParser().parseFromString(text, "text/xml");
          if (xml.querySelector("parsererror")) throw new Error("Invalid XML");
          if (xml && "svg" === xml.documentElement.nodeName)
            document.placeOrImport(
              new Blob([text], { type: "image/svg+xml" }),
              position,
              false,
              true,
            );
        } catch {
          // As before: a failed download inserts nothing.
        }
      } else if (asset.path.startsWith("element.image.")) {
        // Unsplash photos came through the cloud API (gApi.getUnsplashPhotoUrl).
        try {
          marketApi();
        } catch {
          // Nothing inserted, as the old code did when the request failed.
        }
      } else this._addSvgAsset(asset, document, position);
    })();
  }

  /** A market SVG: imported at a third of the page (lines as a repeating fill). */
  _addSvgAsset(asset: LibraryAsset, document: Document, position?: { x: number; y: number }): void {
    const editor = document.getEditor();
    const scene = document.getScene() as Scene;
    const page = scene.getActivePage();
    if (!editor || !page) return;
    let width: number;
    let height: number;
    const box = page.getGeometryBBox();
    const pageWidth = box && page.isFixedSized() ? box.getWidth() : 800;
    const pageHeight = box && page.isFixedSized() ? box.getHeight() : 800;
    if (asset.path.startsWith("element.line.tile")) height = (width = 0.4 * pageWidth) / 10;
    else {
      width = asset.width as number;
      height = asset.height as number;
      const ratio = width / height;
      if ((width = pageWidth / 3) > 300) width = 300;
      height = width / ratio;
      width = Math.round(width);
      if ((height = Math.round(height)) > pageHeight) {
        const before = height;
        if ((height = pageHeight / 3) > 300) height = 300;
        width = (width / before) * height;
        width = Math.round(width);
        height = Math.round(height);
      }
    }
    const request = new XMLHttpRequest();
    request.open("GET", asset.url as string);
    request.onload = () => {
      SVGImport.import(
        request.responseText,
        { baseWidth: width, baseHeight: height, forceBaseSize: true },
        scene.getWorkspace()?.getFontManager() as Parameters<typeof SVGImport.import>[2],
        (_error, imported) => {
          if (!imported) return;
          editor.beginTransaction();
          try {
            if (asset.path.startsWith("element.line.tile")) {
              const pattern = new TexturePattern(
                imported as unknown as ConstructorParameters<typeof TexturePattern>[0],
                TexturePattern.RepeatMode.Horizontal,
              );
              pattern.setPosition(TexturePattern.PositionMode.Center);
              let x: number;
              let y: number;
              if (position) {
                x = position.x - width / 2;
                y = position.y - height / 2;
              } else {
                x = 0.3 * pageWidth;
                y = (pageHeight - height) / 2;
              }
              const line = new Rectangle();
              line.setProperty(
                "trf",
                new Transform(width / 2, 0, 0, height / 2, x + width / 2, y + height / 2),
              );
              line.setProperty("isLine", true, true, false);
              page.appendChild(line);
              line.getPaintLayers()?.insertChild(new FillPaintLayer(pattern), null);
              editor.updateSelection(false, [line]);
            } else {
              this._transformNode(imported as unknown as Node, position);
              document.insertElement(imported as unknown as Node, !position, true, false);
            }
          } finally {
            editor.commitTransaction("Add Element");
          }
        },
      );
    };
    request.send();
  }

  /** Moves the node's center to the drop position. */
  _transformNode(node: Node, position?: { x: number; y: number }): void {
    const element = node as unknown as {
      getGeometryBBox(): Rect | null;
      transform(transform: Transform, noTransform?: boolean): void;
      hasMixin(mixin: unknown): boolean;
    };
    if (!position || typeof element.transform !== "function") return;
    const box = element.getGeometryBBox();
    let x = box && box.getX() ? box.getX() : 0;
    let y = box && box.getY() ? box.getY() : 0;
    if (box) {
      x += box.getWidth() / 2;
      y += box.getHeight() / 2;
    }
    element.transform(new Transform(1, 0, 0, 1, position.x - x, position.y - y), true);
  }

  /** Shows "Back to top" while the library is scrolled down. */
  _createScrollEvent(): void {
    for (const scroller of document.querySelectorAll<HTMLElement>(".library-container")) {
      if (scrollHandler) scroller.removeEventListener("scroll", scrollHandler);
    }
    scrollHandler = (event) => {
      const target = event.currentTarget as HTMLElement;
      if (target.scrollTop > 50) {
        if (0 === target.querySelectorAll(".library-scroll-top").length) {
          const top = div("library-scroll-top");
          const inner = div("container");
          const text = document.createElement("span");
          text.textContent = Locale.get(
            new LocaleKey("GCommonNames", "text.back-to-top"),
          ) as string;
          const icon = document.createElement("span");
          icon.classList.add("gravit-icon-back-to-top");
          inner.append(text, icon);
          top.appendChild(inner);
          top.addEventListener("click", () => {
            designer().stats("librarypanel_click_backtotop");
            for (const scroller of document.querySelectorAll<HTMLElement>(".library-container"))
              scroller.scrollTo({ top: 0, behavior: "smooth" });
          });
          target.appendChild(top);
        }
      } else for (const top of target.querySelectorAll(".library-scroll-top")) top.remove();
    };
    for (const scroller of document.querySelectorAll<HTMLElement>(".library-container"))
      scroller.addEventListener("scroll", scrollHandler);
  }

  _createSearch(panel: HTMLElement): void {
    const search = div();
    const results = div();
    const run = (text: string): void => {
      for (const category of this._libraryPanel.querySelectorAll(".category-row > .category"))
        category.classList.remove("active");
      for (const box of this._libraryPanel.querySelectorAll<HTMLElement>(".assets"))
        css(box, "display", "none");
      this._CURRENT_SKIP_COUNT = 0;
      this._IMAGE_PAGE_COUNT = 1;
      this._CURRENT_CATEGORY = text;
      this._CURRENT_ROOT_CATEGORY = null;
      for (const span of search.querySelectorAll("span")) {
        span.classList.toggle("gravit-icon-search", !text || !text.trim());
        span.classList.toggle("gravit-icon-close", !!text && !!text.trim());
      }
      const wrapper = results.querySelector<HTMLElement>(".assets-wrapper") as HTMLElement;
      wrapper.replaceChildren();
      wrapper.appendChild(div("assets-wrapper images"));
      if (text && text.trim()) {
        css(results, "display", "block");
        this._createScrollEvent();
        this._loadAssets(wrapper, text, this._updateUI.bind(this), true);
      }
    };
    search.classList.add("library-search");
    const input = document.createElement("input");
    input.setAttribute("type", "text");
    input.classList.add("g-input");
    input.setAttribute(
      "placeholder",
      (Locale.get(new LocaleKey("GCommonNames", "element.search")) as string) + "...",
    );
    input.addEventListener("keypress", (event) => {
      if (13 === event.keyCode) run(input.value);
    });
    const icon = document.createElement("span");
    icon.classList.add("gravit-icon-search");
    icon.addEventListener("click", () => {
      designer().stats("librarypanel_click_search", input.value);
      if (isVisible(results)) {
        for (const wrapper of results.querySelectorAll(".assets-wrapper"))
          wrapper.replaceChildren();
        css(results, "display", "none");
        input.value = "";
        icon.classList.remove("gravit-icon-close");
        icon.classList.add("gravit-icon-search");
      } else run(input.value);
    });
    search.append(input, icon);
    panel.appendChild(search);
    results.classList.add("assets");
    css(results, "display", "none");
    const content = div("assets-content");
    const wrapper = div("assets-wrapper");
    wrapper.appendChild(div("assets-wrapper images"));
    content.append(div("indicator"), wrapper);
    results.appendChild(content);
    results.appendChild(this._loadMoreButton(results, true));
    panel.appendChild(results);
  }

  _loadMoreButton(box: HTMLElement, search: boolean): HTMLElement {
    const wrapper = div("button-wrapper");
    wrapper.classList.add("hidden");
    const button = document.createElement("button");
    button.classList.add("load-more");
    button.textContent = Locale.get(
      new LocaleKey("GCommonNames", "text.library-load-more"),
    ) as string;
    button.addEventListener("click", () => {
      this._loadAssets(
        box.querySelector<HTMLElement>(".assets-wrapper") as HTMLElement,
        this._CURRENT_CATEGORY as AssetQuery,
        this._updateUI.bind(this),
        search,
        true,
      );
      this._toggleShowMoreButton(true, true);
    });
    wrapper.appendChild(button);
    return wrapper;
  }

  /** The category tiles, three per row, with an assets box after each row. */
  _initElements(panel: HTMLElement): void {
    const elements = LibraryElements.getElements();
    for (let n = 0; n < elements.length; ++n) {
      const category = elements[n] as LibraryCategory;
      if (n > 0 && n % 3 == 0) {
        const box = assetsBox(false);
        panel.appendChild(box);
        box.appendChild(this._loadMoreButton(box, false));
      }
      // `.category-row:last-child`: a row is reused only while nothing follows it.
      const rows = [...this._libraryPanel.querySelectorAll(".category-row")].filter((row) => {
        const siblings = (row.parentElement as HTMLElement).children;
        return siblings[siblings.length - 1] === row;
      });
      let row = rows[rows.length - 1] as HTMLElement | undefined;
      if (!row || 3 === row.children.length) {
        row = div("category-row");
        panel.appendChild(row);
      }
      const tile = div("category");
      tile.addEventListener("click", () => this._categoryClicked(tile, category));
      row.appendChild(tile);
      const content = div("content");
      tile.appendChild(content);
      const icon = document.createElement("img");
      icon.classList.add("icon");
      icon.setAttribute("src", category.url);
      content.appendChild(icon);
      const title = document.createElement("span");
      title.classList.add("title");
      title.textContent = Locale.get(
        new LocaleKey("GCommonNames", category.path.replace(/\.$/, "")),
        category.name,
      ) as string;
      content.appendChild(title);
    }
    const last = assetsBox(false);
    panel.appendChild(last);
    last.appendChild(this._loadMoreButton(last, false));
  }

  /** A category tile: opens its row's box below it (or closes it) and loads the assets. */
  _categoryClicked(tile: HTMLElement, category: LibraryCategory): void {
    let name = category.name || category.path || "";
    if (name) name += "-";
    name += "All";
    designer().stats("librarypanel_search_category", name);
    const row = tile.closest(".category-row") as HTMLElement;
    const index = [...row.children].indexOf(tile);
    const siblings = [...(row.parentElement as HTMLElement).children];
    const next = siblings[siblings.indexOf(row) + 1];
    const box = next && next.classList.contains("assets") ? (next as HTMLElement) : null;
    const wasActive = tile.classList.contains("category") && tile.classList.contains("active");
    const panel = row.closest(".g-library-panel") as HTMLElement;
    for (const other of panel.querySelectorAll(".category")) other.classList.remove("active");
    tile.classList.add("active");
    const others = [...panel.querySelectorAll<HTMLElement>(".assets")].filter(
      (other) => other !== box,
    );
    for (const other of others) other.classList.remove("first", "second", "third");
    for (const span of document.querySelectorAll(".library-search > span")) {
      span.classList.remove("gravit-icon-close");
      span.classList.add("gravit-icon-search");
    }
    for (const other of others) css(other, "display", "none");
    if (!box) return;
    let wrappers = [...box.querySelectorAll<HTMLElement>(".assets-wrapper")];
    // jQuery's css("height") measures even a hidden box, so it is never
    // "auto" and every open sets the inline height to auto.
    for (const wrapper of wrappers) css(wrapper, "height", "auto");
    for (const old of box.querySelectorAll(".selector-container")) old.remove();
    for (const wrapper of wrappers) wrapper.replaceChildren();
    for (const other of others)
      for (const wrapper of other.querySelectorAll(".assets-wrapper")) wrapper.replaceChildren();
    const position = 0 === index ? "first" : 1 === index ? "second" : "third";
    const toggled = box.classList.contains(position);
    box.classList.remove("first", "second", "third");
    if (toggled) {
      css(box, "display", "none");
      tile.classList.remove("active");
    } else {
      box.classList.add(position);
      css(box, "display", "");
      tile.classList.add("active");
    }
    for (const content of box.querySelectorAll<HTMLElement>(".assets-content")) {
      content.className = "";
      content.classList.add("assets-content");
      content.classList.add("asset-" + category.path.slice(8).replace(/\./g, "-"));
    }
    wrappers = [...box.querySelectorAll<HTMLElement>(".assets-wrapper")];
    this._createScrollEvent();
    this._CURRENT_SKIP_COUNT = 0;
    this._IMAGE_PAGE_COUNT = 1;
    this._CURRENT_CATEGORY = category;
    this._CURRENT_ROOT_CATEGORY = category;
    const wrapper = wrappers[0];
    if (!wasActive && wrapper) this._loadAssets(wrapper, category, this._updateUI);
  }

  _loadAssets(
    wrapper: HTMLElement,
    query: AssetQuery,
    done: UpdateUI,
    search?: boolean,
    append?: boolean,
  ): void {
    this._toggleShowMoreButton(false, false);
    this._toggleLoading(true);
    void this._doLoadAssets(wrapper, query, done, search, append);
  }

  async _doLoadAssets(
    wrapper: HTMLElement,
    query: AssetQuery,
    done: UpdateUI,
    search?: boolean,
    append?: boolean,
  ): Promise<void> {
    let assets: LibraryAsset[] = [];
    let marketCount = 0;
    let photoCount = 0;
    try {
      if (search) {
        let photos: LibraryAsset[] = [];
        if (LibraryElements.isUnsplashIntegrationEnabled()) {
          if (!this._IMAGE_ASSET_DRAINED)
            try {
              photos = await marketApi();
            } catch (error) {
              console.warn("Unsplash search failed", error);
            }
          photoCount = (photos || []).length;
          if (!photoCount) this._IMAGE_ASSET_DRAINED = true;
        }
        assets = [];
        if (-1 !== this._CURRENT_SKIP_COUNT) assets = await marketApi();
        marketCount = (assets || []).length;
        assets = assets.concat(photos);
      } else if (
        typeof query !== "string" &&
        query.path &&
        query.path.startsWith("element.image")
      ) {
        if (LibraryElements.isUnsplashIntegrationEnabled()) {
          assets = await marketApi();
          photoCount = (assets || []).length;
        }
      } else {
        assets = await marketApi();
        marketCount = (assets || []).length;
      }
      if (marketCount < 90 && 0 === photoCount) this._toggleShowMoreButton(false, false);
      else this._toggleShowMoreButton(true, false);
      if (assets.length < 90) {
        this._CURRENT_SKIP_COUNT = -1;
        this._IMAGE_PAGE_COUNT++;
      } else {
        this._CURRENT_SKIP_COUNT += 90;
        this._IMAGE_PAGE_COUNT++;
      }
    } catch {
      // A failed request leaves the box empty.
    }
    this._toggleLoading(false);
    done.call(this, wrapper, query, assets, search, append);
  }

  _toggleLoading(loading: boolean): void {
    for (const box of this._libraryPanel.querySelectorAll(".assets"))
      box.classList.toggle("loading", loading);
  }

  _toggleShowMoreButton(shown: boolean, loading: boolean): void {
    const wrappers = this._libraryPanel.querySelectorAll(".assets > .button-wrapper");
    for (const wrapper of wrappers) {
      for (const button of wrapper.querySelectorAll(".load-more"))
        button.classList.toggle("hidden", loading);
      wrapper.classList.toggle("loading", loading);
      wrapper.classList.toggle("hidden", !shown);
    }
  }

  _getPreviewURI(asset: LibraryAsset): string {
    return asset.content && !asset.url_t
      ? "data:" + (asset.type || "image/svg+xml") + ";base64," + stringToBase64String(asset.content)
      : asset.url_t || asset.url || (asset.image as { thumb: string }).thumb;
  }

  /** Starts dragging an asset tile; a short click inserts it instead. */
  _onItemDragStartHandler(asset: LibraryAsset, event: MouseEvent, element?: HTMLElement): void {
    this._clickCheckTime = Date.now();
    const rect = element
      ? element.getBoundingClientRect()
      : (event.target as HTMLElement).getBoundingClientRect();
    let width = asset.width || rect.width || 50;
    let height = asset.height || rect.height || 50;
    const page = (
      (designer().getActiveDocument() as unknown as Document).getScene() as Scene
    ).getActivePage();
    if (!page) return;
    if (asset.path.startsWith("element.line.tile")) {
      height =
        (width =
          page.getGeometryBBox() && page.isFixedSized()
            ? 0.4 * (page.getGeometryBBox() as Rect).getWidth()
            : 320) / 10;
    } else {
      const box = page.getGeometryBBox();
      const pageWidth = box && page.isFixedSized() ? box.getWidth() : 800;
      const pageHeight = box && page.isFixedSized() ? box.getHeight() : 800;
      if (!asset.path.startsWith("element.ui") && !asset.path.startsWith("element.icons")) {
        const ratio = width / height;
        if ((width = pageWidth / 3) > 300) width = 300;
        height = width / ratio;
        width = Math.round(width);
        if ((height = Math.round(height)) > pageHeight) {
          const before = height;
          if ((height = pageHeight / 3) > 300) height = 300;
          width = (width / (asset.height as number)) * before;
          width = Math.round(width);
          height = Math.round(height);
        }
      }
      const view = designer().getWindows().getActiveWindow()?.getView();
      const zoom = view ? view.getZoom() : 1;
      height *= zoom;
      width *= zoom;
    }
    if (this._dragging) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    this._dragOffset = { x: centerX - event.clientX, y: centerY - event.clientY };
    this._dragging = true;
    this._currentElement = event.target as HTMLElement;
    this._currentItem = asset;
    this._previewSize = { w: width, h: height };
    let preview: HTMLElement;
    if (asset.path.startsWith("element.line.tile")) {
      preview = div();
      cssAll(preview, {
        background: 'url("' + asset.url + '")',
        "background-repeat": "repeat-x",
        "background-position": Math.round(height / 2) + "px 0px",
        position: "absolute",
        height: height / 2 + "px",
        width: width / 2 + "px",
        display: "none",
      });
    } else {
      if (asset.content && !asset.url) {
        const holder = div();
        holder.innerHTML = asset.content;
        preview = (holder.firstElementChild as HTMLElement | null) || holder;
      } else {
        preview = document.createElement("img");
        preview.setAttribute("src", asset.url || (asset.image ? asset.image.thumb : ""));
      }
      cssAll(preview, {
        position: "absolute",
        height: height + "px",
        width: width + "px",
        display: "none",
      });
      preview.addEventListener("dragstart", (e) => e.preventDefault());
      preview.setAttribute("draggable", "false");
    }
    document.body.appendChild(preview);
    this.dragPreview = preview;
    css(preview, "left", event.clientX + "px");
    css(preview, "top", event.clientY + "px");
    this._itemDragListener = (e) => this._onItemDrag(e);
    this._itemDragEndListener = (e) => this._onItemDragEndHandler(e);
    document.addEventListener("mousemove", this._itemDragListener);
    document.addEventListener("touchmove", this._itemDragListener as unknown as EventListener);
    document.addEventListener("mouseup", this._itemDragEndListener);
    document.addEventListener("touchend", this._itemDragEndListener as unknown as EventListener);
  }

  _removeDragListeners(): void {
    document.removeEventListener("mousemove", this._itemDragListener as EventListener);
    document.removeEventListener("touchmove", this._itemDragListener as unknown as EventListener);
    document.removeEventListener("mouseup", this._itemDragEndListener as EventListener);
    document.removeEventListener("touchend", this._itemDragEndListener as unknown as EventListener);
  }

  _onItemDragEndHandler(event: MouseEvent): void {
    this.dragPreview?.remove();
    if (Date.now() - this._clickCheckTime <= 200 || !this._dragMoved) {
      this._dragMoved = false;
      this._removeDragListeners();
      this._dragging = false;
      if (this._currentElement) this._currentElement.style.visibility = "visible";
      this._addAsset(this._currentItem as LibraryAsset);
      return;
    }
    this._dragMoved = false;
    if (!this._dragging) return;
    const document = designer().getActiveDocument() as unknown as Document;
    this._removeDragListeners();
    const x = event.clientX;
    const y = event.clientY;
    if (designer().positionIsOnCanvas(x, y)) {
      const view = document.getActiveWindow()?.getView();
      if (view) {
        const offset = this._dragOffset;
        const shifted = {
          clientX: x,
          clientY: y,
          offsetX: event.offsetX + (offset ? offset.x : 0),
          offsetY: event.offsetY + (offset ? offset.y : 0),
          pageX: event.pageX + (offset ? offset.x : 0),
          pageY: event.pageY + (offset ? offset.y : 0),
        };
        const local = (
          view as unknown as {
            _convertClientPositionFromMousePosition(event: unknown): {
              getX(): number;
              getY(): number;
            };
          }
        )._convertClientPositionFromMousePosition(shifted);
        const scenePoint = (
          view as unknown as {
            getViewTransform(scene?: unknown): {
              mapPoint(point: unknown): { getX(): number; getY(): number };
            };
          }
        )
          .getViewTransform(document.getScene())
          .mapPoint(local);
        this._addAsset(this._currentItem as LibraryAsset, {
          x: scenePoint.getX(),
          y: scenePoint.getY(),
        });
      }
    }
    this._dragging = false;
    if (this._currentElement) this._currentElement.style.visibility = "visible";
  }

  _onItemDrag(event: MouseEvent): void {
    this._dragMoved = true;
    if (this._currentElement) this._currentElement.style.visibility = "hidden";
    let x = event.clientX + (this._dragOffset ? this._dragOffset.x : 0);
    let y = event.clientY + (this._dragOffset ? this._dragOffset.y : 0);
    x -= this._previewSize.w / 2;
    y -= this._previewSize.h / 2;
    const preview = this.dragPreview as HTMLElement;
    css(preview, "left", x + "px");
    css(preview, "top", y + "px");
    css(preview, "display", "");
  }

  resize(): void {
    this._debouncedResizeHandler();
  }

  _getSmallestColumnIndex(heights: number[]): number {
    return heights.indexOf(Math.min.apply(null, heights)) || 0;
  }

  _getThumbnailSize(asset: LibraryAsset): Rect {
    const image = asset.image as { width: number; height: number };
    const scale = 200 / image.width;
    const height = parseInt(String(image.height * scale)) + 4;
    return new Rect(0, 0, 200, height);
  }

  _getChildrenHeight(column: HTMLElement): number {
    return [...column.children].reduce(
      (sum, child) => sum + (child as HTMLElement).getBoundingClientRect().height,
      0,
    );
  }
}

/** The asset of a photo tile (jQuery data "asset"). */
const assetOf = new WeakMap<HTMLElement, LibraryAsset>();
