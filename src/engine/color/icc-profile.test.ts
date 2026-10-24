import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ASSETS_ROOT } from "../../../server/paths.ts";
import type { IccHeader } from "./icc-header.ts";
import { IccProfile } from "./icc-profile.ts";
import oldValues from "./test-data/old-color-values.json" with { type: "json" };

function profileBytes(): Uint8Array {
  return new Uint8Array(fs.readFileSync(path.join(ASSETS_ROOT, "data/icc/USWebCoatedSWOP.icc")));
}

function read(bytes: Uint8Array): IccHeader | null {
  let result: IccHeader | null | undefined;
  new IccProfile().read(bytes.slice().buffer, (p) => (result = p));
  // The callback runs synchronously.
  expect(result).not.toBeUndefined();
  return result ?? null;
}

const sum = (table: ArrayLike<number> | null) => Array.from(table ?? []).reduce((a, b) => a + b, 0);

describe("IccProfile.read", () => {
  it("reads the SWOP profile's lookup tables like the old reader", () => {
    const profile = read(profileBytes()) as IccHeader;
    const old = oldValues.profile;
    expect(profile.AtoB1CLUTNumPts).toBe(old.AtoB1CLUTNumPts);
    expect(profile.BtoA1CLUTNumPts).toBe(old.BtoA1CLUTNumPts);
    expect(profile.AtoB1normalizationRange).toBe(old.AtoB1normalizationRange);
    expect(profile.BtoA1normalizationRange).toBe(old.BtoA1normalizationRange);
    expect(profile.AtoB1CLUT?.length).toBe(old.AtoB1CLUT);
    expect(profile.BtoA1CLUT?.length).toBe(old.BtoA1CLUT);
    expect(profile.AtoB1InputChange?.length).toBe(old.AtoB1InputChange);
    expect(profile.AtoB1OutputChange?.length).toBe(old.AtoB1OutputChange);
    expect(profile.BtoA1InputChange?.length).toBe(old.BtoA1InputChange);
    expect(profile.BtoA1OutputChange?.length).toBe(old.BtoA1OutputChange);
    expect(
      [
        profile.AtoB1CLUT,
        profile.BtoA1CLUT,
        profile.AtoB1InputChange,
        profile.BtoA1OutputChange,
      ].map(sum),
    ).toEqual(old.sums);
    expect(profile.illuminant).toEqual(old.illuminant);
    expect(profile.intent).toBe(old.intent);
    expect(profile.Flags).toBe(old.Flags);
    expect(profile.profileFormatVersionMinor).toBe(old.minor);
    expect(profile.colorSpace).toBe(IccProfile.ColorSpace.Cmyk);
    expect(profile.deviceClass).toBe(IccProfile.DeviceClass.Output);
  });

  it("rejects buffers that are too short", () => {
    expect(read(profileBytes().slice(0, 132))).toBeNull();
  });

  it("rejects a size that doesn't match the header", () => {
    expect(read(profileBytes().slice(0, 4000))).toBeNull();
  });

  it("rejects profiles that aren't v2 CMYK output profiles", () => {
    const wrongVersion = profileBytes();
    wrongVersion[8] = 4;
    expect(read(wrongVersion)).toBeNull();
    const display = profileBytes();
    new DataView(display.buffer).setUint32(12, IccProfile.DeviceClass.Display);
    expect(read(display)).toBeNull();
    const embedded = profileBytes();
    new DataView(embedded.buffer).setUint16(44, IccProfile.Flags.Embedded);
    expect(read(embedded)).toBeNull();
    const otherWhite = profileBytes();
    new DataView(otherWhite.buffer).setUint16(70, 0x9000);
    expect(read(otherWhite)).toBeNull();
  });

  it("rejects profiles without both AToB1 and BToA1 tables", () => {
    const bytes = profileBytes();
    const view = new DataView(bytes.buffer);
    const count = view.getUint32(128);
    for (let i = 0; i < count; i++) {
      if (view.getUint32(132 + 12 * i) === IccProfile.Tags.BToA1) {
        view.setUint32(132 + 12 * i, IccProfile.Tags.BToA2);
      }
    }
    expect(read(bytes)).toBeNull();
  });
});
