/**
 * Which look the app shows (CHANGES.md "Two looks"):
 *
 * - "next": GravitDesign Next, the default. The brand stylesheets load
 *   after the old theme stylesheet, the welcome screen shows the brand,
 *   the title, version line, favicon and web manifest carry the new
 *   name, and the introduction opens on the first start.
 * - "classic": the old Gravit Designer look, exactly as the old app
 *   showed it. The parity harness runs every old scenario in it.
 *
 * The choice is made once per page load, before the app starts: by the
 * inline script in index.html, so the first paint (the loading screen)
 * already has the right look. That script and resolveBranding follow
 * the same rules (branding.test.ts runs both):
 *
 * 1. `?branding=next` or `?branding=classic` in the address, which is
 *    also stored for later starts;
 * 2. `window.__gdBranding`, set before the page's scripts run by the
 *    parity harness (an init script) and by the desktop app's preload
 *    when GD_BRANDING is set; never stored;
 * 3. the stored choice, localStorage "designer.branding";
 * 4. "next".
 *
 * Until initBranding() runs (unit tests, which never boot the page) the
 * app is classic, so code that asks keeps its old behaviour.
 */
import { LocalStorageKeys } from "../storage/local-storage.ts";

export type Branding = "next" | "classic";

export const BRANDINGS: readonly Branding[] = ["next", "classic"];

/** The localStorage key of the stored choice. */
export const BRANDING_STORAGE_KEY = LocalStorageKeys.Branding;

/** The query parameter that picks a look (and stores it). */
export const BRANDING_QUERY = "branding";

/** The attribute index.html's script sets on <html> once it decided. */
export const BRANDING_ATTRIBUTE = "data-branding";

/** The product names of the two looks. */
export const PRODUCT_NAME: Record<Branding, string> = {
  next: "GravitDesign Next",
  classic: "Gravit Designer",
};

/** Where problems with the new app are reported. */
export const ISSUES_URL = "https://github.com/GravitDesign/designer/issues";

export function isBranding(value: unknown): value is Branding {
  return value === "next" || value === "classic";
}

/** What the decision looks at. */
export interface BrandingSources {
  /** location.search */
  search: string;
  /** window.__gdBranding */
  override: unknown;
  /** The raw localStorage value of BRANDING_STORAGE_KEY (JSON text) or null. */
  stored: string | null;
}

/** The look, and whether the query's choice is to be stored. */
export interface BrandingDecision {
  branding: Branding;
  store: Branding | null;
}

function parseStored(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function resolveBranding({ search, override, stored }: BrandingSources): BrandingDecision {
  const query = new URLSearchParams(search).get(BRANDING_QUERY);
  if (isBranding(query)) return { branding: query, store: query };
  if (isBranding(override)) return { branding: override, store: null };
  const saved = parseStored(stored);
  if (isBranding(saved)) return { branding: saved, store: null };
  return { branding: "next", store: null };
}

let active: Branding = "classic";

/**
 * Reads the look index.html's script picked (or decides it the same way
 * if the attribute is missing) and makes it the active one.
 */
export function initBranding(doc: Document = document, win: Window = window): Branding {
  const attribute = doc.documentElement.getAttribute(BRANDING_ATTRIBUTE);
  if (isBranding(attribute)) active = attribute;
  else {
    let stored: string | null;
    try {
      stored = win.localStorage.getItem(BRANDING_STORAGE_KEY);
    } catch {
      stored = null;
    }
    active = resolveBranding({
      search: win.location.search,
      override: (win as unknown as { __gdBranding?: unknown }).__gdBranding,
      stored,
    }).branding;
  }
  return active;
}

export function activeBranding(): Branding {
  return active;
}

export function isNextBranding(): boolean {
  return active === "next";
}

/** "GravitDesign Next" or "Gravit Designer": the window title suffix and the about text. */
export function productName(): string {
  return PRODUCT_NAME[active];
}

/** For tests: sets the active look directly. */
export function setActiveBranding(branding: Branding): void {
  active = branding;
}
