// Old: designer.browser.dev.js module 1482 (mixed into GBrowserContainer).
/**
 * gContainer.download: saves a buffer as "<name>.<extension>". The caller
 * (downloadDataURI, module 1154) passes `mime` as Blob options
 * ({ type }), not as a string.
 */
import { saveAs } from "./save-as.ts";

export interface DownloadRequest {
  buffer?: BlobPart;
  name?: string;
  extension?: string;
  mime?: BlobPropertyBag;
}

export class Downloader {
  async download({ buffer, name, extension, mime }: DownloadRequest = {}): Promise<void> {
    saveAs(
      new Blob([buffer as BlobPart], mime),
      "".concat(String(name), ".").concat(String(extension)),
    );
  }
}
