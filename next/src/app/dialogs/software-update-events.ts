// Old: designer.browser.dev.js module 1188 (the software update events).
/**
 * The events the software update manager triggers on the designer and
 * the software update panel shows. Each takes an options object; fields
 * it doesn't pass stay undefined, as before.
 */
import { Event } from "../../engine/core/event.ts";
import { registerClass } from "../../engine/core/object.ts";

export interface UpdateEventOptions {
  isSilent?: boolean;
  newVersion?: string;
  currentVersion?: string | null;
  forceUpdate?: boolean;
  error?: unknown;
  percent?: string;
  size?: number;
}

class CheckingForUpdate extends Event {
  static {
    registerClass(this, "GSoftwareUpdateEvents.CheckingForUpdate");
  }

  isSilent: boolean | undefined;

  constructor(options: UpdateEventOptions = {}) {
    super();
    this.isSilent = options.isSilent;
  }
}

class InstallUpdate extends Event {
  static {
    registerClass(this, "GSoftwareUpdateEvents.InstallUpdate");
  }

  isSilent: boolean | undefined;

  constructor(options: UpdateEventOptions = {}) {
    super();
    this.isSilent = options.isSilent;
  }
}

class UpdateAvailable extends Event {
  static {
    registerClass(this, "GSoftwareUpdateEvents.UpdateAvailable");
  }

  newVersion: string | undefined;
  currentVersion: string | null | undefined;
  forceUpdate: boolean | undefined;
  isSilent: boolean | undefined;

  constructor(options: UpdateEventOptions = {}) {
    super();
    this.newVersion = options.newVersion;
    this.currentVersion = options.currentVersion;
    this.forceUpdate = options.forceUpdate;
    this.isSilent = options.isSilent;
  }
}

class UpdateError extends Event {
  static {
    registerClass(this, "GSoftwareUpdateEvents.UpdateError");
  }

  error: unknown;
  isSilent: boolean | undefined;

  constructor(options: UpdateEventOptions = {}) {
    super();
    this.error = options.error;
    this.isSilent = options.isSilent;
  }
}

class Downloading extends Event {
  static {
    registerClass(this, "GSoftwareUpdateEvents.Downloading");
  }

  percent: string | undefined;
  size: number | undefined;
  newVersion: string | undefined;
  isSilent: boolean | undefined;

  constructor(options: UpdateEventOptions = {}) {
    super();
    this.percent = options.percent;
    this.size = options.size;
    this.newVersion = options.newVersion;
    this.isSilent = options.isSilent;
  }
}

class DownloadComplete extends Event {
  static {
    registerClass(this, "GSoftwareUpdateEvents.DownloadComplete");
  }

  newVersion: string | undefined;
  forceUpdate: boolean | undefined;
  isSilent: boolean | undefined;

  constructor(options: UpdateEventOptions = {}) {
    super();
    this.newVersion = options.newVersion;
    this.forceUpdate = options.forceUpdate;
    this.isSilent = options.isSilent;
  }
}

class AfterUpdate extends Event {
  static {
    registerClass(this, "GSoftwareUpdateEvents.AfterUpdate");
  }

  currentVersion: string | null | undefined;
  isSilent: boolean | undefined;

  constructor(options: UpdateEventOptions = {}) {
    super();
    this.currentVersion = options.currentVersion;
    this.isSilent = options.isSilent;
  }
}

class UpdateNotAvailable extends Event {
  static {
    registerClass(this, "GSoftwareUpdateEvents.UpdateNotAvailable");
  }

  currentVersion: string | null | undefined;
  isSilent: boolean | undefined;

  constructor(options: UpdateEventOptions = {}) {
    super();
    this.currentVersion = options.currentVersion;
    this.isSilent = options.isSilent;
  }
}

class BeforeInstallUpdate extends Event {
  static {
    registerClass(this, "GSoftwareUpdateEvents.BeforeInstallUpdate");
  }

  isSilent: boolean | undefined;

  constructor(options: UpdateEventOptions = {}) {
    super();
    this.isSilent = options.isSilent;
  }
}

export const SoftwareUpdateEvents = {
  CheckingForUpdate,
  InstallUpdate,
  UpdateAvailable,
  UpdateError,
  Downloading,
  DownloadComplete,
  AfterUpdate,
  UpdateNotAvailable,
  BeforeInstallUpdate,
};
