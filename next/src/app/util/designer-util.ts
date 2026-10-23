// Old: designer.browser.dev.js module 40 (the designer's utility functions).
/**
 * The designer's grab-bag of helpers: node comparison and merging (used
 * when a symbol or a reloaded file is merged into the scene), change
 * blocking, image waiting, file name and string helpers, timing helpers
 * and the "has a newer version" save dialog.
 *
 * Dropped: encrypt, decrypt, toMD5 and getFileSHA256Digest (crypto-js,
 * only for cloud credentials and uploads), getFileStateAndRole (cloud
 * sharing), saveBBoxes (a Chrome-only debug dump into the sandboxed file
 * system). watchDog stays, with every Pro feature enabled.
 */
import { hasMixin } from "../../engine/core/object.ts";
import { System } from "../../engine/core/system.ts";
import { equals } from "../../engine/core/util.ts";
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Annotation } from "../../engine/scene/annotations/annotation.ts";
import { Element } from "../../engine/scene/element.ts";
import { Image } from "../../engine/scene/image.ts";
import { Node } from "../../engine/scene/node.ts";
import type { ContainerApi } from "../../engine/scene/node-container.ts";
import type { IdentityApi } from "../../engine/scene/node-identity.ts";
import type { PropertiesNode } from "../../engine/scene/node-properties.ts";
import type { Scene } from "../../engine/scene/scene.ts";
import { PathBase } from "../../engine/scene/path-base.ts";
import { Symbol as SymbolNode } from "../../engine/scene/symbol.ts";
import { Stylable } from "../../engine/style/stylable.ts";
import { config } from "../config.ts";
import { encode, trim } from "./base64.ts";

// ---------------------------------------------------------------------------
// Strings and bytes

export function encodeToUTF8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function decodeFromUTF8(bytes: Uint8Array): string {
  return new TextDecoder("utf-8").decode(bytes);
}

/** base64-js fromByteArray. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** base64-js toByteArray: throws on input that isn't base64. */
function base64ToBytes(base64: string): Uint8Array {
  if (base64.length % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** UTF-8 text as base64. */
export function stringToBase64String(text: string): string {
  return bytesToBase64(encodeToUTF8(text));
}

/** Base64 of UTF-8 text back to the text; "" when it isn't base64. */
export function base64StringToString(base64: string): string {
  let text: string;
  try {
    text = decodeFromUTF8(base64ToBytes(base64));
  } catch {
    text = "";
  }
  return text;
}

/** URL-safe base64 without padding. */
export function base64URLSafeEncode(base64: string): string {
  return trim(encode(base64));
}

/** The text of HTML (entities decoded, tags dropped). */
export function decodeHTML(html: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = html;
  return textarea.value;
}

export function toCapitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** `text` without `prefix` at its start. */
export function trimStart(text: string, prefix: string): string {
  if (!prefix || !prefix.length) return text;
  if (!text || !text.startsWith(prefix)) return text;
  return text.substring(prefix.length);
}

/** The first of `extensions` found as a word in `text` (case-insensitive), or null. */
export function getExtensionFromString(text: string, extensions: string[]): string | null {
  const pattern = new RegExp("\\b" + extensions.join("|") + "\\b", "gim");
  const match = text.match(pattern);
  return match ? (match[0] as string) : null;
}

/** The name without ".<extension>" when it ends with it (case-insensitive). */
export function getFileNameWithoutExtension(name: string, extension: string): string {
  if (name.toLowerCase().endsWith(".".concat(extension).toLowerCase())) {
    name = name.substr(0, name.lastIndexOf("."));
  }
  return name;
}

/** The name with every trailing ".<extension>" removed. */
export function removeAllSuffixWhichLikeExtension(name: string, extension: string): string {
  const suffix = ".".concat(extension).toLowerCase();
  while (name.toLowerCase().endsWith(suffix)) name = name.substr(0, name.lastIndexOf("."));
  return name;
}

/** The first of `versions` in `text`, else `fallback`. */
export function getVersionFromString(
  text: string,
  versions: string[],
  fallback: string | null,
): string | null {
  const match = text.match(versions.join("|"));
  return match ? (match[0] as string) : fallback;
}

/** A byte count split into decimal GB, MB and KB. */
export function getSizeInfo(bytes: number): { gb: number; mb: number; kb: number } {
  let rest = bytes;
  const mega = 1e6;
  const giga = 1e3 * mega;
  const info = { gb: 0, mb: 0, kb: 0 };
  const gb = Math.floor(rest / giga);
  if (gb) {
    info.gb = gb;
    rest -= gb * giga;
  }
  const mb = Math.floor(rest / mega);
  if (mb) {
    info.mb = mb;
    rest -= mb * mega;
  }
  const kb = Math.floor(rest / 1e3);
  if (kb) {
    info.kb = kb;
  }
  return info;
}

/** "Comment" for an object whose toString is "[GCommentAnnotation]", else null. */
export function getAnnotationType(annotation: { toString(): string }): string | null {
  const match = annotation.toString().match(/\[G(.*)Annotation\]/);
  return (match && match[1]) || null;
}

// ---------------------------------------------------------------------------
// Functions and timing

export function fakeFunction(): void {}

export function isFunction(value: unknown): boolean {
  if (undefined === value) return false;
  const tag = Object.prototype.toString.call(value);
  return (
    [
      "[object Function]",
      "[object AsyncFunction]",
      "[object GeneratorFunction]",
      "[object Proxy]",
    ].indexOf(tag) >= 0
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Calls `fn` `wait` ms after the last call. */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | 0 = 0;
  return function (this: unknown, ...args: A): void {
    const run = (): void => {
      timer = 0;
      fn.apply(this, args);
    };
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, wait);
  };
}

/** Calls `fn` at once, then ignores calls for `wait` ms. */
export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  wait: number,
): (...args: A) => void {
  let blocked = false;
  return function (this: unknown, ...args: A): void {
    if (!blocked) {
      fn.apply(this, args);
      blocked = true;
      setTimeout(() => (blocked = false), wait);
    }
  };
}

/** `() => first() && second()`. */
export const chaining = (first: () => unknown, second: () => unknown) => (): unknown =>
  first() && second();

/** Runs `fn` and logs what it throws. */
export const _tryAndCatch = async (fn: () => unknown): Promise<void> => {
  try {
    await fn();
  } catch (error) {
    console.log(error);
  }
};

/**
 * Calls `fn` for every index, starting at `start` and alternating
 * outwards (start, start + 1, start - 1, start + 2, ...).
 */
export function iterateAroundIndex<T>(
  list: readonly T[],
  start: number,
  fn: (item: T, index: number) => void,
): void {
  let done = 0;
  let offset = 0;
  const length = list.length;
  while (done < length) {
    const index = start + offset;
    fn(list[index] as T, index);
    done++;
    if (offset > 0 && start - offset >= 0) offset = -offset;
    else if (offset > 0) offset++;
    else if (start - offset + 1 < length) offset = 1 - offset;
    else offset--;
  }
}

let passiveSupported: boolean | undefined;

/** Whether addEventListener takes { passive } (asked once). */
export function isPassiveSupported(): boolean {
  if (undefined === passiveSupported) {
    passiveSupported = false;
    try {
      const options = {
        get passive(): boolean {
          passiveSupported = true;
          return false;
        },
      };
      window.addEventListener("test", null as unknown as EventListener, options);
      window.removeEventListener("test", null as unknown as EventListener, options as never);
    } catch {
      passiveSupported = false;
    }
  }
  return passiveSupported;
}

/** The screen is at least MIN_SUPPORTED_SCREEN_SIZE wide (a tablet's longer side counts). */
export function isSupportedScreenSize(width?: number): boolean {
  if (!width && System.hardware === System.Hardware.Tablet) {
    return (
      (window.screen.height > window.screen.width ? window.screen.height : window.screen.width) >=
      config.MIN_SUPPORTED_SCREEN_SIZE
    );
  }
  return (width || window.screen.availWidth) >= config.MIN_SUPPORTED_SCREEN_SIZE;
}

/**
 * The old Pro gates. Every Pro feature is enabled in the port, so trap
 * always runs the handler and check always gives the Pro value.
 */
export const watchDog = {
  /** The old (handler, allowed, interrupted, feature): only the handler matters with Pro. */
  trap:
    <E>(handler?: ((event: E) => unknown) | null) =>
    (event: E): unknown =>
      handler ? handler(event) : undefined,
  /** The old (pro, free): the Pro value. */
  check: <T>(value: T): T => value,
};

// ---------------------------------------------------------------------------
// Symbols

/** The node or one of its parents is a symbol (with `instancesOnly`: not a master). */
export function isSymbol(node: Node, instancesOnly?: boolean): boolean {
  const test = (candidate: Node | null): boolean =>
    !!candidate &&
    candidate instanceof SymbolNode &&
    (!instancesOnly || !(candidate as unknown as { isMaster(): boolean }).isMaster());
  return !!test(node) || !!node.findParent(test);
}

export const isSymbolInstance = (node: Node): boolean => isSymbol(node, true);

// ---------------------------------------------------------------------------
// Changes

interface Updatable {
  beginUpdate(): void;
  endUpdate(): void;
}

/** Blocks reference changes, the scene's updates, the selection and the nodes' updates. */
export function blockChanges(
  editor: { _beginSelectionUpdate(): void } | null | undefined,
  nodes: Updatable[] | null | undefined,
  scene: { startBlockReferenceChanges(): void } | null | undefined,
  root: Updatable | null | undefined,
): void {
  if (scene) scene.startBlockReferenceChanges();
  if (root) root.beginUpdate();
  if (editor) editor._beginSelectionUpdate();
  if (nodes) nodes.forEach((node) => node.beginUpdate());
}

/** Undoes blockChanges; extra arguments are ended too. */
export function releaseChanges(
  editor: { _finishSelectionUpdate(): void } | null | undefined,
  nodes: Updatable[] | null | undefined,
  scene: { endBlockReferenceChanges(): void } | null | undefined,
  ...more: Updatable[]
): void {
  if (nodes) nodes.forEach((node) => node.endUpdate());
  if (editor) editor._finishSelectionUpdate();
  if (more) more.forEach((node) => node.endUpdate());
  if (scene) scene.endBlockReferenceChanges();
}

// ---------------------------------------------------------------------------
// Comparing and merging nodes

/** The nodes as the merge helpers use them. */
type MergeNode = Node &
  PropertiesNode &
  ContainerApi &
  StyledMergeNode & {
    serialize(): string;
    deserialize(blob: string): void;
  };

/** A node with the container and identity members. */
type TreeNode = Node & ContainerApi & IdentityApi;

const tree = (node: unknown): TreeNode => node as TreeNode;

interface StyledMergeNode {
  getEffects(): MergeNode | null;
  getPaintLayers():
    | (MergeNode & {
        getBorderLayers(): MergeLayer[];
        getFillLayers(): MergeLayer[];
      })
    | null;
  getAnchorPoints(): MergeNode;
}

interface MergeLayer {
  getId(): string;
  assignFrom(other: MergeLayer): void;
}

const asMerge = (node: unknown): MergeNode => node as MergeNode;

/** The stored ("$") and custom ("@") property names of a node, without the prefix. */
function storedPropertyNames(node: object, ignored: readonly string[]): string[] {
  return Object.keys(node)
    .filter((key) => (key.startsWith("$") || key.startsWith("@")) && !ignored.includes(key))
    .map((key) => key.slice(1));
}

/** Two nodes have different property names or values (ignoring `ignored`, with prefix). */
export function areNodePropertiesDifferent(
  a: PropertiesNode,
  b: PropertiesNode,
  ignored: readonly string[] = [],
): boolean {
  const mine = storedPropertyNames(a, ignored);
  const theirs = storedPropertyNames(b, ignored);
  return !equals(mine, theirs) || !a.arePropertiesEqual(b, mine);
}

/**
 * Whether two nodes differ: class, properties (ignoring $lmd, $storedUrl
 * and $__ids by default), style, effects, paint layers, anchor points and
 * children, recursively.
 */
export function isDifferent(a: Node, b: Node, ignored?: readonly string[]): boolean {
  if (!ignored) ignored = ["$lmd", "$storedUrl", "$__ids"];
  if (!(a instanceof (b.constructor as abstract new (...args: never[]) => unknown))) return true;
  if (hasMixin(a, Node.Properties) !== hasMixin(b, Node.Properties)) return true;
  if (hasMixin(a, Node.Properties) && areNodePropertiesDifferent(asMerge(a), asMerge(b), ignored)) {
    return true;
  }
  if (hasMixin(a, Element.Stylable) !== hasMixin(b, Element.Stylable)) return true;
  if (hasMixin(a, Element.Stylable)) {
    const mine = asMerge(a).getEffects();
    const theirs = asMerge(b).getEffects();
    if (Boolean(mine) !== Boolean(theirs)) return true;
    if (mine && isDifferent(mine, theirs as Node, ignored)) return true;
    const myLayers = asMerge(a).getPaintLayers();
    const theirLayers = asMerge(b).getPaintLayers();
    if (Boolean(myLayers) !== Boolean(theirLayers)) return true;
    if (myLayers && isDifferent(myLayers, theirLayers as Node, ignored)) return true;
  }
  if (hasMixin(a, Node.Container) !== hasMixin(b, Node.Container)) return true;
  if (a instanceof PathBase != b instanceof PathBase) return true;
  if (a instanceof PathBase) {
    const mine = asMerge(a).getAnchorPoints();
    const myPoints = mine.getChildren();
    const theirs = asMerge(b).getAnchorPoints();
    const theirPoints = theirs.getChildren();
    if (myPoints.length !== theirPoints.length) return true;
    for (let i = 0; i < myPoints.length; i++) {
      const p = mine.getChildByIndex(i);
      const q = theirs.getChildByIndex(i);
      // Sic: XOR of two objects, which is 0 for any two nodes.
      if ((p as unknown as number) ^ (q as unknown as number)) return true;
      if (areNodePropertiesDifferent(asMerge(p), asMerge(q), ignored)) return true;
    }
  }
  if (hasMixin(a, Node.Container)) {
    const mine = tree(a).getChildren();
    const theirs = tree(b).getChildren();
    if (mine.length !== theirs.length) return true;
    for (let i = 0; i < mine.length; i++) {
      if (isDifferent(mine[i] as Node, theirs[i] as Node, ignored)) return true;
    }
  }
  return false;
}

/** Copies `source`'s style, anchor points, children and properties into `target`; errors are logged. */
export function mergeNode(target: Node, source: Node): void {
  try {
    _mergeStyle(target, source);
    _mergePath(target, source);
    _mergeChildren(target, source);
    _mergeProperties(target, source);
  } catch (error) {
    console.log(error, error && (error as Error).stack);
  }
}

/** Sets every stored ("$") property of `source` on `target`. */
export function _mergeProperties(target: Node, source: Node): void {
  const names = Object.keys(source)
    .filter((key) => key.startsWith("$"))
    .map((key) => key.slice(1));
  asMerge(target).setProperties(names, asMerge(source).getProperties(names));
}

/**
 * Assigns the paint layers: for annotations only the first border and
 * fill, otherwise every layer that has a counterpart with the same id.
 */
export function _mergeStyle(target: Node, source: Node): void {
  if (hasMixin(target, Element.Stylable)) {
    const mine = asMerge(target).getPaintLayers() as NonNullable<
      ReturnType<StyledMergeNode["getPaintLayers"]>
    >;
    const theirs = asMerge(source).getPaintLayers() as NonNullable<
      ReturnType<StyledMergeNode["getPaintLayers"]>
    >;
    const myBorders = mine.getBorderLayers();
    const theirBorders = theirs.getBorderLayers();
    const myFills = mine.getFillLayers();
    const theirFills = theirs.getFillLayers();
    if (hasMixin(target, Annotation)) {
      if (theirBorders.length && myBorders.length)
        (myBorders[0] as MergeLayer).assignFrom(theirBorders[0] as MergeLayer);
      if (theirFills.length && myFills.length)
        (myFills[0] as MergeLayer).assignFrom(theirFills[0] as MergeLayer);
    } else {
      myBorders.forEach((layer) => {
        const other = theirBorders.find((candidate) => tree(candidate).getId() === layer.getId());
        if (other) layer.assignFrom(other);
      });
      myFills.forEach((layer) => {
        const other = theirFills.find((candidate) => tree(candidate).getId() === layer.getId());
        if (other) layer.assignFrom(other);
      });
    }
  }
}

/** Replaces a path's anchor points with `source`'s. */
export function _mergePath(target: Node, source: Node): void {
  if (target instanceof PathBase) {
    const points = asMerge(target).getAnchorPoints();
    points.beginUpdate();
    points.clearChildren();
    points.deserialize(asMerge(source).getAnchorPoints().serialize());
    points.endUpdate();
  }
}

export function _mergeChildren(target: Node, source: Node): void {
  if (!hasMixin(target, Node.Container)) return;
  const mine = tree(target).getChildren();
  const theirs = tree(source).getChildren();
  _removeDeletedChildren(target, source);
  _cloneChildrenIntoReceiver(target, source);
  _updateCommonChildren(mine, theirs);
}

/** Removes the children of `target` whose id `source` has no child for. */
export function _removeDeletedChildren(target: Node, source: Node): void {
  const mine = tree(target).getChildren();
  const theirs = tree(source).getChildren();
  mine.forEach((child) => {
    if (!theirs.some((other) => tree(other).getId() === tree(child).getId()))
      tree(target).removeChild(child);
  });
}

/** Inserts clones of the children of `source` that `target` lacks, before their next sibling's counterpart. */
export function _cloneChildrenIntoReceiver(target: Node, source: Node): void {
  for (let child = tree(source).getLastChild(); null !== child; child = child.getPrevious()) {
    const current = child;
    if (
      tree(target)
        .getChildren()
        .some((other) => tree(other).getId() === tree(current).getId())
    )
      continue;
    const next = current.getNext();
    const reference =
      next &&
      tree(target)
        .getChildren()
        .find((other) => tree(other).getId() === tree(next).getId());
    tree(target).insertChild((current as unknown as { clone(): Node }).clone(), reference || null);
  }
}

/** Merges each child that has a different counterpart with the same id. */
export function _updateCommonChildren(mine: readonly Node[], theirs: readonly Node[]): void {
  mine.forEach((child) => {
    const other = theirs.find((candidate) => tree(candidate).getId() === tree(child).getId());
    if (other && isDifferent(child, other)) mergeNode(child, other);
  });
}

/**
 * Calls `fn` with the matching layers of every element in `elements`
 * ("fill", "border" or "effect" layers equal to `layer`), or with `layer`
 * alone for a single element.
 */
export function iterateEqualStyleLayers(
  kind: "fill" | "border" | "effect",
  layer: unknown,
  elements: readonly Node[],
  fn: (layer: unknown) => void,
): void {
  const found: unknown[] = [];
  if (elements.length > 1) {
    for (let i = 0; i < elements.length; i++) {
      const element = asMerge(elements[i]);
      let layers: unknown[] = [];
      if ("fill" === kind)
        layers = (
          element.getPaintLayers() as NonNullable<ReturnType<StyledMergeNode["getPaintLayers"]>>
        ).getFillLayers();
      else if ("border" === kind)
        layers = (
          element.getPaintLayers() as NonNullable<ReturnType<StyledMergeNode["getPaintLayers"]>>
        ).getBorderLayers();
      else if ("effect" === kind) {
        for (
          let effect = tree(element.getEffects() as Node).getFirstChild();
          null !== effect;
          effect = effect.getNext()
        ) {
          layers.push(effect);
        }
      }
      for (let k = 0; k < layers.length; k++) {
        const candidate = layers[k];
        if (
          ("fill" === kind && Stylable.FillPaintLayer.equals(candidate as never, layer as never)) ||
          ("border" === kind &&
            Stylable.BorderPaintLayer.equals(candidate as never, layer as never)) ||
          ("effect" === kind && equals(candidate, layer))
        ) {
          found.push(candidate);
        }
      }
    }
    found.forEach((item) => fn(item));
  } else fn(layer);
}

// ---------------------------------------------------------------------------
// Images

/**
 * Resolves once every image in `scene` has loaded or failed; rejects
 * after `timeout` ms with images still pending (or when `options.cancelled`
 * is set by then).
 */
export function resolveDocumentImages(
  scene: Scene,
  timeout: number,
  options: { cancelled?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const finished = (status: unknown): boolean =>
      status === Image.ImageStatus.Loaded || status === Image.ImageStatus.Error;
    let pending = 0;
    scene.accept((node: Node) => {
      if (node instanceof Image && !finished(node.getStatus())) pending++;
    });
    if (pending > 0) {
      let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        if (pending > 0 || options.cancelled) {
          scene.removeEventListener(Image.StatusEvent, onStatus);
          reject();
        }
      }, timeout);
      const onStatus = (event: { status: unknown }): void => {
        if (finished(event.status) && --pending <= 0) {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          scene.removeEventListener(Image.StatusEvent, onStatus);
          resolve(true);
        }
        if (options.cancelled) {
          if (timer) {
            clearTimeout(timer);
            timer = null;
          }
          scene.removeEventListener(Image.StatusEvent, onStatus);
          reject();
        }
      };
      scene.addEventListener(Image.StatusEvent, onStatus);
    } else resolve(true);
  });
}

// ---------------------------------------------------------------------------
// The "has a newer version" dialog of saving

/** SystemDialog.custom as this dialog uses it (app-widgets-dialogs). */
export interface CustomDialogHost {
  custom(options: Record<string, unknown>): unknown;
  Shortcut: { Esc: unknown; Enter: unknown };
  /** gDesigner.getToolbar()._updateActions(). */
  updateToolbarActions(): void;
}

let customDialogHost: CustomDialogHost | null = null;

/** The dialogs cluster registers SystemDialog here. */
export function registerCustomDialogHost(host: CustomDialogHost | null): void {
  customDialogHost = host;
}

/**
 * The dialog a save shows when the file has a newer version (UI-DIALOG-036):
 * Cancel, Reload or Save. Only version-controlled items (the cloud's)
 * have newer versions, so the local app never shows it.
 */
export function buildDialogDocumentHasUpdates<T>(
  document: T,
  reload: (document: T) => void,
  save: (document: T) => void,
  cancel?: ((document: T) => void) | null,
): unknown {
  const host = customDialogHost;
  if (!host) throw new Error("buildDialogDocumentHasUpdates: no dialog host registered");
  const text = (group: string, key: string): string =>
    Locale.get(new LocaleKey(group, key)) as string;
  return host.custom({
    subtitle: text("GSaveAction", "has-new-version-when-save-message"),
    className: "g-has-updates-warning-dialog",
    icon: "info",
    closeable: false,
    buttons: [
      {
        label: text("GCommonNames", "text.cancel"),
        closeOnClick: true,
        shortcut: host.Shortcut.Esc,
        position: "left",
        onclick: () => {
          if (cancel) cancel(document);
        },
      },
      {
        label: text("GSaveAction", "has-new-version-when-save-reload"),
        closeOnClick: true,
        onclick: () => {
          host.updateToolbarActions();
          reload(document);
        },
      },
      {
        label: text("GSaveAction", "has-new-version-when-save-save"),
        className: "primary",
        closeOnClick: true,
        shortcut: host.Shortcut.Enter,
        onclick: () => {
          save(document);
        },
      },
    ],
  });
}
