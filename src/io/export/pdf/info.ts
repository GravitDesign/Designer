// Old: chunk.vendor.js module 1426 (the PDF document information).
import { Locale } from "../../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { PDFDictionary } from "./pdf-dictionary.ts";
import type { PDFIndirectReference } from "./indirect-reference.ts";

/**
 * Author, producer, creator, title and the creation and modification
 * time in local time with its zone offset (`D:YYYYMMDDHHmmSS+hh'mm'`;
 * west of UTC and UTC itself get "-").
 */
export class PDFInfo extends PDFDictionary {
  constructor(author?: string | null, title?: string | null) {
    super();
    this.putText(
      "/Author",
      author || (Locale.get(new LocaleKey("GDocument", "text.default-export-author")) as string),
    );
    this.putText(
      "/Producer",
      Locale.get(new LocaleKey("GDocument", "text.default-export-producer")) as string,
    );
    this.putText(
      "/Creator",
      Locale.get(new LocaleKey("GDocument", "text.default-export-author")) as string,
    );
    this.putText("/Title", title || "Untitled");
    const twoDigits = (value: number) => ("0" + parseInt(String(value))).slice(-2);
    const now = new Date();
    const zoneOffset = now.getTimezoneOffset();
    const sign = zoneOffset < 0 ? "+" : "-";
    const hours = Math.floor(Math.abs(zoneOffset / 60));
    const minutes = Math.abs(zoneOffset % 60);
    const zone = [sign, twoDigits(hours), "'", twoDigits(minutes), "'"].join("");
    const date = [
      now.getFullYear(),
      twoDigits(now.getMonth() + 1),
      twoDigits(now.getDate()),
      twoDigits(now.getHours()),
      twoDigits(now.getMinutes()),
      twoDigits(now.getSeconds()),
      zone,
    ].join("");
    this.putText("/CreationDate", "D:" + date);
    this.putText("/ModDate", "D:" + date);
  }

  getMetadata(): unknown {
    const metadata = this.get("/Metadata") as PDFIndirectReference | null;
    return metadata ? metadata.getPDFObject() : null;
  }
}
