// Old: chunk.vendor.js module 641 (ICC profile reader).
import { GMath } from "../math/math.ts";
import { IccHeader } from "./icc-header.ts";

/** The fields of an mft1/mft2 lookup table header. */
class MFTHeaderData {
  numInputChannels: number | null = null;
  numOutputChannels: number | null = null;
  numCLUTGridPts: number | null = null;
  numInputTEntries: number | null = null;
  numOutputTEntries: number | null = null;
}

/**
 * Gravit's own ICC reader. It accepts only what the CMYK conversions need:
 * a version 2 CMYK output profile with a Lab connection space and a D50
 * illuminant, and reads its AToB1 and BToA1 (relative colorimetric) tables.
 */
export class IccProfile {
  static HEADER_LENGTH = 128;

  static VersionMajor = { v2: 2, v4: 4 };

  static DeviceClass = {
    Input: 1935896178,
    Display: 1835955314,
    Output: 1886549106,
    DeviceLink: 1818848875,
    ColorSpaceConv: 1936744803,
    Abstract: 1633842036,
    NamedColor: 1852662636,
  };

  static ColorSpace = {
    XYZ: 1482250784,
    Lab: 1281450528,
    Luv: 1282766368,
    YCbCr: 1497588338,
    Yxy: 1501067552,
    Rgb: 1380401696,
    Gray: 1196573017,
    Hsv: 1213421088,
    Hls: 1212961568,
    Cmyk: 1129142603,
    Cmy: 1129142560,
    Clr2: 843271250,
    Clr3: 860048466,
    Clr4: 876825682,
    Clr5: 893602898,
    Clr6: 910380114,
    Clr7: 927157330,
    Clr8: 943934546,
    Clr9: 960711762,
    ClrA: 1094929490,
    ClrB: 1111706706,
    ClrC: 1128483922,
    ClrD: 1145261138,
    ClrE: 1162038354,
    ClrF: 1178815570,
  };

  static PCS = { XYZ: 1482250784, Lab: 1281450528 };

  static Flags = { Embedded: 1, NotIndependent: 2 };

  static Intent = { Perceptual: 0, MediaRelCol: 1, Saturation: 2, ICCAbsoluteCol: 3 };

  static D50 = [0.9642, 1, 0.8249];

  static Tags = {
    AToB0: 1093812784,
    AToB1: 1093812785,
    AToB2: 1093812786,
    BlueColorant: 1649957210,
    BlueTRC: 1649693251,
    BToA0: 1110589744,
    BToA1: 1110589745,
    BToA2: 1110589746,
    CalibrationDateTime: 1667329140,
    CharTarget: 1952543335,
    ChromaticAdaptation: 1667785060,
    Chromaticity: 1667789421,
    Copyright: 1668313716,
    CrdInfo: 1668441193,
    DeviceMfgDesc: 1684893284,
    DeviceModelDesc: 1684890724,
    DeviceSettings: 1684371059,
    Gamut: 1734438260,
    GrayTRC: 1800688195,
    GreenColorant: 1733843290,
    GreenTRC: 1733579331,
    Luminance: 1819635049,
    Measurement: 1835360627,
    MediaBlackPoint: 1651208308,
    MediaWhitePoint: 2004119668,
    NamedColor: 1852010348,
    NamedColor2: 1852009522,
    OutputResponse: 1919251312,
    Preview0: 1886545200,
    Preview1: 1886545201,
    Preview2: 1886545202,
    ProfileDescription: 1684370275,
    ProfileSequenceDesc: 1886610801,
    Ps2CRD0: 1886610480,
    Ps2CRD1: 1886610481,
    Ps2CRD2: 1886610482,
    Ps2CRD3: 1886610483,
    Ps2CSA: 1886597747,
    Ps2RenderingIntent: 1886597737,
    RedColorant: 1918392666,
    RedTRC: 1918128707,
    ScreeningDesc: 1935897188,
    Screening: 1935897198,
    Technology: 1952801640,
    UcrBg: 1650877472,
    ViewingCondDesc: 1987405156,
    ViewingConditions: 1986618743,
  };

  static MFTType = { Mft1: 1835430961, Mft2: 1835430962 };

  static MFTHeaderData = MFTHeaderData;

  /**
   * Reads a profile and calls `done` with its data, or with null when the
   * profile isn't a supported CMYK profile. `done` runs synchronously.
   */
  read(buffer: ArrayBuffer, done: (header: IccHeader | null) => void): void {
    if (buffer && buffer.byteLength <= IccProfile.HEADER_LENGTH + 4) {
      done(null);
      return;
    }
    const header = new IccHeader();
    const view = new DataView(buffer, 0, IccProfile.HEADER_LENGTH + 4);
    const profileSize = view.getUint32(0);
    header.profileFormatVersionMajor = view.getUint8(8);
    header.profileFormatVersionMinor = view.getUint8(9) >> 4;
    header.deviceClass = view.getUint32(12);
    header.colorSpace = view.getUint32(16);
    header.PCS = view.getUint32(20);
    header.Flags = view.getUint16(44);
    header.intent = view.getUint16(64);
    const illuminantX = this.readS15Fixed16Number(view, 68);
    const illuminantY = this.readS15Fixed16Number(view, 72);
    const illuminantZ = this.readS15Fixed16Number(view, 76);
    header.illuminant = [illuminantX, illuminantY, illuminantZ];
    if (
      profileSize == buffer.byteLength &&
      header.profileFormatVersionMajor == IccProfile.VersionMajor.v2 &&
      header.deviceClass == IccProfile.DeviceClass.Output &&
      header.colorSpace == IccProfile.ColorSpace.Cmyk &&
      header.PCS == IccProfile.PCS.Lab &&
      0 == (header.Flags & IccProfile.Flags.Embedded) &&
      0 == (header.Flags & IccProfile.Flags.NotIndependent) &&
      GMath.isEqualEps(illuminantX, IccProfile.D50[0] as number, 1e-4) &&
      GMath.isEqualEps(illuminantY, IccProfile.D50[1] as number, 1e-4) &&
      GMath.isEqualEps(illuminantZ, IccProfile.D50[2] as number, 1e-4)
    ) {
      const tagCount = view.getUint32(IccProfile.HEADER_LENGTH);
      if (profileSize > IccProfile.HEADER_LENGTH + 4 + 12 * tagCount) {
        const tags = new DataView(buffer, IccProfile.HEADER_LENGTH + 4, 12 * tagCount);
        for (let i = 0, entry = 0; i < tagCount; ++i, entry += 12) {
          const signature = tags.getUint32(entry);
          const offset = tags.getUint32(entry + 4);
          const size = tags.getUint32(entry + 8);
          if (0 == (3 & offset) && profileSize >= offset + size) {
            switch (signature) {
              case IccProfile.Tags.AToB1:
              case IccProfile.Tags.BToA1:
                this.readLuts(buffer, offset, size, header, signature);
            }
          }
        }
      }
      if (null != header.AtoB1CLUT && null != header.BtoA1CLUT) done(header);
      else done(null);
    } else {
      done(null);
    }
  }

  readS15Fixed16Number(view: DataView, offset: number): number {
    return view.getInt16(offset) + view.getUint16(offset + 2) / 65536;
  }

  readLuts(
    buffer: ArrayBuffer,
    offset: number,
    _size: number,
    header: IccHeader,
    tag: number,
  ): void {
    const type = new DataView(buffer, offset, 4).getUint32(0);
    if (type == IccProfile.MFTType.Mft2) {
      const view = new DataView(buffer, offset, 52);
      const mft = new MFTHeaderData();
      this.readMFTHeaderData(view, type, mft);
      const inputCount = (mft.numInputChannels as number) * (mft.numInputTEntries as number);
      const inputBytes = 2 * inputCount;
      const clutCount =
        Math.pow(mft.numCLUTGridPts as number, mft.numInputChannels as number) *
        (mft.numOutputChannels as number);
      const clutBytes = 2 * clutCount;
      const outputCount = (mft.numOutputChannels as number) * (mft.numOutputTEntries as number);
      const outputBytes = 2 * outputCount;
      const inputView = new DataView(buffer, offset + 52, inputBytes);
      const clutView = new DataView(buffer, offset + 52 + inputBytes, clutBytes);
      const outputView = new DataView(buffer, offset + 52 + inputBytes + clutBytes, outputBytes);
      if (tag == IccProfile.Tags.AToB1) {
        header.AtoB1CLUTNumPts = mft.numCLUTGridPts;
        header.AtoB1InputChange = this.readUint16Table(inputView, inputCount);
        header.AtoB1CLUT = this.readUint16Table(clutView, clutCount);
        header.AtoB1OutputChange = this.readUint16Table(outputView, outputCount);
        header.AtoB1normalizationRange = 65535;
      } else if (tag == IccProfile.Tags.BToA1) {
        header.BtoA1CLUTNumPts = mft.numCLUTGridPts;
        header.BtoA1InputChange = this.readUint16Table(inputView, inputCount);
        header.BtoA1CLUT = this.readUint16Table(clutView, clutCount);
        header.BtoA1OutputChange = this.readUint16Table(outputView, outputCount);
        header.BtoA1normalizationRange = 65535;
      }
    } else if (type == IccProfile.MFTType.Mft1) {
      const view = new DataView(buffer, offset, 48);
      const mft = new MFTHeaderData();
      this.readMFTHeaderData(view, type, mft);
      const inputCount = 256 * (mft.numInputChannels as number);
      const clutCount =
        Math.pow(mft.numCLUTGridPts as number, mft.numInputChannels as number) *
        (mft.numOutputChannels as number);
      const outputCount = 256 * (mft.numOutputChannels as number);
      const input = new Uint8Array(buffer, offset + 48, inputCount);
      const clut = new Uint8Array(buffer, offset + 48 + inputCount, clutCount);
      const output = new Uint8Array(buffer, offset + 48 + inputCount + clutCount, outputCount);
      if (tag == IccProfile.Tags.AToB1) {
        header.AtoB1CLUTNumPts = mft.numCLUTGridPts;
        header.AtoB1InputChange = input;
        header.AtoB1CLUT = clut;
        header.AtoB1OutputChange = output;
        header.AtoB1normalizationRange = 255;
      } else if (tag == IccProfile.Tags.BToA1) {
        header.BtoA1CLUTNumPts = mft.numCLUTGridPts;
        header.BtoA1InputChange = input;
        header.BtoA1CLUT = clut;
        header.BtoA1OutputChange = output;
        header.BtoA1normalizationRange = 255;
      }
    }
  }

  readMFTHeaderData(view: DataView, type: number, mft: MFTHeaderData): void {
    mft.numInputChannels = view.getUint8(8);
    mft.numOutputChannels = view.getUint8(9);
    mft.numCLUTGridPts = view.getUint8(10);
    if (type == IccProfile.MFTType.Mft2) {
      mft.numInputTEntries = view.getUint16(48);
      mft.numOutputTEntries = view.getUint16(50);
    }
  }

  readUint16Table(view: DataView, count: number): Uint16Array {
    const table = new Uint16Array(count);
    for (let i = 0; i < count; ++i) table[i] = view.getUint16(2 * i);
    return table;
  }
}
