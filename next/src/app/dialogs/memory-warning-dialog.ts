// Old: designer.browser.dev.js module 1687 (GMemoryManager and its warning).
/**
 * Watches the JS heap: once a minute (where the container can tell) it
 * compares the used heap with the limit, and from 80% on shows a warning
 * once, stops and starts again after 30 minutes.
 *
 * The old manager also told the renderer to free its pooled buffers when
 * the last document closed (GRendererCtx.freeMemory); that renderer is
 * the dropped command recorder, so there is nothing to free.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { DocumentEvent } from "../document/document-event.ts";
import { baseConfig } from "../file-formats.ts";
import { container, designer } from "../shell/globals.ts";
import type { Dialog } from "./dialog.ts";
import { SystemDialog } from "./system-dialog.ts";

const minutes = (count: number): number => count * 60 * 1000;

/** What the container reports (GContainer.getMemoryInfo). */
interface MemoryInfo {
  heapSizeInUse: number;
  heapSizeLimit: number;
}

export interface MemoryManagerOptions {
  /** How often to look, at least once a minute (ms). */
  memoryCheckInterval?: number;
  /** Used share of the heap that triggers the warning; 0 or less never checks. */
  memoryUsageThreshold?: number;
  /** When to start again after a warning (ms); 0 or less never. */
  autostartTime?: number;
}

export class MemoryManager {
  private readonly _memoryCheckInterval: number;
  private readonly _memoryUsageThreshold: number;
  private readonly _autostartTime: number;
  private _memoryCheckIntervalId: ReturnType<typeof setInterval> | undefined;
  private _autostartScheduleId: ReturnType<typeof setTimeout> | undefined;
  private _dialog: Dialog | undefined;

  constructor({
    memoryCheckInterval = minutes(1),
    memoryUsageThreshold = 0.8,
    autostartTime = minutes(30),
  }: MemoryManagerOptions = {}) {
    this._memoryCheckInterval = Math.max(memoryCheckInterval, minutes(1));
    this._memoryUsageThreshold = memoryUsageThreshold;
    this._autostartTime = autostartTime;
  }

  start(): void {
    this.stop();
    designer().addEventListener(DocumentEvent, this._documentEvent, this);
    if (this._memoryUsageThreshold <= 0) return;
    if (container().isMemoryInfoAvailable())
      this._memoryCheckIntervalId = setInterval(
        this._checkMemory.bind(this),
        this._memoryCheckInterval,
      );
  }

  stop(): void {
    if (this._autostartScheduleId) {
      clearTimeout(this._autostartScheduleId);
      this._autostartScheduleId = undefined;
    }
    if (this._memoryCheckIntervalId) {
      clearInterval(this._memoryCheckIntervalId);
      this._memoryCheckIntervalId = undefined;
    }
    designer().removeEventListener(DocumentEvent, this._documentEvent, this);
  }

  _checkMemory(): void {
    if (this._calculateThreshold() >= this._memoryUsageThreshold) {
      this._openWarningDialog();
      this.stop();
      this._scheduleStartup();
    }
  }

  private _calculateThreshold(): number {
    const info = container().getMemoryInfo() as MemoryInfo | null;
    return info ? info.heapSizeInUse / info.heapSizeLimit : 0;
  }

  private _scheduleStartup(): void {
    if (this._autostartTime > 0)
      this._autostartScheduleId = setTimeout(() => {
        this.start();
      }, this._autostartTime);
  }

  private _openWarningDialog(): void {
    if (this._dialog) return;
    this._dialog = SystemDialog.custom({
      closeCallback: () => {
        this._dialog = undefined;
      },
      className: "g-memory-warn-dialog",
      closeable: false,
      icon: "info",
      title: (Locale.get(new LocaleKey("GMemoryManager", "text.title")) as string).replace(
        "%app",
        baseConfig.DESIGNER.TITLE,
      ),
      subtitle: Locale.get(new LocaleKey("GMemoryManager", "text.subtitle")),
      buttons: [
        {
          label: Locale.get(new LocaleKey("GLocale", "ok")) as string,
          onclick: (dialog) => {
            dialog.close();
          },
          highlighted: true,
        },
      ],
    });
  }

  /** Still registered, as before, but has nothing to do (see the note at the top). */
  private _documentEvent(): void {
    // Old: GRendererCtx.freeMemory() once a Removed event left no document.
  }
}
