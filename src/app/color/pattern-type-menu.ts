// Old: designer.browser.dev.js module 1238 (the unsupported-features dialog of the SVG export).
/**
 * The dialog an SVG export shows when elements have effects or paints SVG
 * can't hold. Port-map named the file after the pattern-type strings it
 * uses; the class is the old unnamed dialog:
 *
 *     new UnsupportedFeaturesDialog(SvgExport.getUnsupportedFeatures(page)).open();
 *
 * One line per element and feature, "• <feature> [<element name>]",
 * repeated lines dropped, and a checkbox that sets the
 * "disable_warning_unsupported_features" setting. The document's store
 * path reaches it through registerDocumentDialogs (document-host.ts).
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { escape } from "../../engine/core/util.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { Node } from "../../engine/scene/node.ts";
import { AngularGradient } from "../../engine/style/angular-gradient.ts";
import { Background } from "../../engine/style/background.ts";
import { NoisePattern } from "../../engine/style/noise-pattern.ts";
import { TexturePattern } from "../../engine/style/texture-pattern.ts";
import { registerDocumentDialogs } from "../document/document-host.ts";
import { Dialog } from "../dialogs/dialog.ts";
import { cssAll, css } from "../shell/dom.ts";
import { designer } from "../shell/globals.ts";

/** One element with what SVG can't hold (SvgExport.getUnsupportedFeatures). */
export interface UnsupportedFeatureEntry {
  name: string;
  features: unknown[];
}

function text(className: string, key: string): string {
  return Locale.get(new LocaleKey(className, key)) as string;
}

/** The name the dialog shows for an effect or paint. */
export function featureLabel(feature: unknown): string {
  if (feature instanceof Node) return feature.getNodeNameTranslated();
  if (feature instanceof NoisePattern) return text("GPatternChooser", "pattern-type.noise");
  if (feature instanceof TexturePattern) return text("GPatternChooser", "pattern-type.texture");
  if (feature instanceof Background) return text("GPatternChooser", "pattern-type.backgroundfill");
  if (feature instanceof AngularGradient)
    return text("GPatternChooser", "pattern-type.angulargradient");
  return "";
}

/**
 * An element name as markup that shows it as typed. Names are stored with
 * "<" and ">" as "&lt;" and "&gt;" (the name filter of Block); the old
 * dialog put them in as markup, so a name read from a file could add
 * markup to the dialog (BUGS-FIXED BUG-146).
 */
function nameHtml(name: string): string {
  return escape(String(name).replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
}

/** The list markup: one "• feature [name]" line per entry, duplicates dropped. */
export function featureLines(entries: readonly UnsupportedFeatureEntry[]): string {
  return [
    ...new Set(
      entries.map((entry) =>
        entry.features
          .map((feature) =>
            "• ".concat(featureLabel(feature), " [").concat(nameHtml(entry.name), "]"),
          )
          .join("<br>"),
      ),
    ),
  ].join("<br>");
}

export class UnsupportedFeaturesDialog {
  private readonly _dialog: Dialog;

  constructor(entries: readonly UnsupportedFeatureEntry[]) {
    const lines = featureLines(entries);
    const ok = document.createElement("button");
    ok.textContent = text("GLocale", "ok");
    ok.addEventListener("click", () => this.close());
    const content = document.createElement("div");
    this._dialog = new Dialog(content, { releaseOnClose: true, buttons: [ok] });
    const message = document.createElement("div");
    message.classList.add("message");
    cssAll(message, { "line-height": "1.5em", "max-height": "60%", overflow: "auto" });
    const span = document.createElement("span");
    // Old: .html(title + "<br>" + lines). The names are escaped in lines.
    span.innerHTML = text("GUnsupportedFeaturesDialog", "text.title-unsupported") + "<br>" + lines;
    message.appendChild(span);
    content.appendChild(message);
    const row = document.createElement("div");
    css(row, "margin-top", "10px");
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.setAttribute("type", "checkbox");
    css(checkbox, "margin-right", "5px");
    checkbox.addEventListener("change", () => {
      designer().setSetting("disable_warning_unsupported_features", checkbox.checked);
    });
    const caption = document.createElement("span");
    caption.textContent = text("GUnsupportedFeaturesDialog", "text.checked-unsupported");
    label.append(checkbox, caption);
    row.appendChild(label);
    content.appendChild(row);
  }

  open(): void {
    this._dialog.open();
  }

  close(): void {
    this._dialog.close();
  }
}

registerDocumentDialogs({
  unsupportedFeatures(features) {
    new UnsupportedFeaturesDialog(features as UnsupportedFeatureEntry[]).open();
  },
});
