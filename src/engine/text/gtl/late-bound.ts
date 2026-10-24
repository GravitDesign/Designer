// What TLCore needs from GStylable (chunk.vendor.js module 28, engine-style),
// which the old core required directly. engine-style registers its class
// once at load time:
//
//   engine/style/stylable.ts:
//     registerStylable(Stylable);
//
// Until then TLCore.initialize throws when it has to fill the default
// formatting (the first initialization), and render can't read the
// border alignment.

/** The default geometry values of a property set (`_tfi`, `_fc`, `_plh`, ...). */
export interface PropertySetDefaults {
  geometryProperties?: Record<string, unknown>;
}

/** The parts of GStylable the core reads. */
export interface StylableLike {
  PropertySetInfo: Record<string, PropertySetDefaults>;
  PropertySet: { Text: string | number; Paragraph: string | number };
  ParagraphAlignment: { Left: unknown; Center: unknown; Right: unknown; Justify: unknown };
  BorderAlignment: { Inside: unknown; Outside: unknown };
}

let stylable: StylableLike | null = null;

export function registerStylable(value: StylableLike): void {
  stylable = value;
}

export function getStylable(): StylableLike {
  if (!stylable) {
    throw new Error("GStylable is not registered (engine-style calls registerStylable)");
  }
  return stylable;
}
