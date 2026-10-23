// Old: chunk.vendor.js module 718 (opentype.js tables/name.js, unchanged).
// The name table: family name, style, copyright and the other font names,
// per language.

import { Parser } from "../parse.ts";
import { Record as NameRecordTable, Table } from "../table.ts";
import { decode, encode } from "../types.ts";

/** Names by property (fontFamily, ...; unknown ids by number), then by language code. */
export type NameTable = Record<string, Record<string, string>>;

/** Name ids 0 to 22, as property names. */
const nameTableNames: string[] = [
  "copyright",
  "fontFamily",
  "fontSubfamily",
  "uniqueID",
  "fullName",
  "version",
  "postScriptName",
  "trademark",
  "manufacturer",
  "designer",
  "description",
  "manufacturerURL",
  "designerURL",
  "license",
  "licenseURL",
  "reserved",
  "preferredFamily",
  "preferredSubfamily",
  "compatibleFullName",
  "sampleText",
  "postScriptFindFontName",
  "wwsFamily",
  "wwsSubfamily",
];

/** Macintosh language id to BCP 47 code. */
const macLanguages: Record<number, string> = {
  0: "en",
  1: "fr",
  2: "de",
  3: "it",
  4: "nl",
  5: "sv",
  6: "es",
  7: "da",
  8: "pt",
  9: "no",
  10: "he",
  11: "ja",
  12: "ar",
  13: "fi",
  14: "el",
  15: "is",
  16: "mt",
  17: "tr",
  18: "hr",
  19: "zh-Hant",
  20: "ur",
  21: "hi",
  22: "th",
  23: "ko",
  24: "lt",
  25: "pl",
  26: "hu",
  27: "es",
  28: "lv",
  29: "se",
  30: "fo",
  31: "fa",
  32: "ru",
  33: "zh",
  34: "nl-BE",
  35: "ga",
  36: "sq",
  37: "ro",
  38: "cz",
  39: "sk",
  40: "si",
  41: "yi",
  42: "sr",
  43: "mk",
  44: "bg",
  45: "uk",
  46: "be",
  47: "uz",
  48: "kk",
  49: "az-Cyrl",
  50: "az-Arab",
  51: "hy",
  52: "ka",
  53: "mo",
  54: "ky",
  55: "tg",
  56: "tk",
  57: "mn-CN",
  58: "mn",
  59: "ps",
  60: "ks",
  61: "ku",
  62: "sd",
  63: "bo",
  64: "ne",
  65: "sa",
  66: "mr",
  67: "bn",
  68: "as",
  69: "gu",
  70: "pa",
  71: "or",
  72: "ml",
  73: "kn",
  74: "ta",
  75: "te",
  76: "si",
  77: "my",
  78: "km",
  79: "lo",
  80: "vi",
  81: "id",
  82: "tl",
  83: "ms",
  84: "ms-Arab",
  85: "am",
  86: "ti",
  87: "om",
  88: "so",
  89: "sw",
  90: "rw",
  91: "rn",
  92: "ny",
  93: "mg",
  94: "eo",
  128: "cy",
  129: "eu",
  130: "ca",
  131: "la",
  132: "qu",
  133: "gn",
  134: "ay",
  135: "tt",
  136: "ug",
  137: "dz",
  138: "jv",
  139: "su",
  140: "gl",
  141: "af",
  142: "br",
  143: "iu",
  144: "gd",
  145: "gv",
  146: "ga",
  147: "to",
  148: "el-polyton",
  149: "kl",
  150: "az",
  151: "nn",
};

/** Macintosh language id to Macintosh script id. */
const macLanguageToScript: Record<number, number> = {
  0: 0,
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 0,
  9: 0,
  10: 5,
  11: 1,
  12: 4,
  13: 0,
  14: 6,
  15: 0,
  16: 0,
  17: 0,
  18: 0,
  19: 2,
  20: 4,
  21: 9,
  22: 21,
  23: 3,
  24: 29,
  25: 29,
  26: 29,
  27: 29,
  28: 29,
  29: 0,
  30: 0,
  31: 4,
  32: 7,
  33: 25,
  34: 0,
  35: 0,
  36: 0,
  37: 0,
  38: 29,
  39: 29,
  40: 0,
  41: 5,
  42: 7,
  43: 7,
  44: 7,
  45: 7,
  46: 7,
  47: 7,
  48: 7,
  49: 7,
  50: 4,
  51: 24,
  52: 23,
  53: 7,
  54: 7,
  55: 7,
  56: 7,
  57: 27,
  58: 7,
  59: 4,
  60: 4,
  61: 4,
  62: 4,
  63: 26,
  64: 9,
  65: 9,
  66: 9,
  67: 13,
  68: 13,
  69: 11,
  70: 10,
  71: 12,
  72: 17,
  73: 16,
  74: 14,
  75: 15,
  76: 18,
  77: 19,
  78: 20,
  79: 22,
  80: 30,
  81: 0,
  82: 0,
  83: 0,
  84: 4,
  85: 28,
  86: 28,
  87: 28,
  88: 0,
  89: 0,
  90: 0,
  91: 0,
  92: 0,
  93: 0,
  94: 0,
  128: 0,
  129: 0,
  130: 0,
  131: 0,
  132: 0,
  133: 0,
  134: 0,
  135: 7,
  136: 4,
  137: 26,
  138: 0,
  139: 0,
  140: 0,
  141: 0,
  142: 0,
  143: 28,
  144: 0,
  145: 0,
  146: 0,
  147: 0,
  148: 6,
  149: 0,
  150: 0,
  151: 0,
};

/** Windows language id to BCP 47 code. */
const windowsLanguages: Record<number, string> = {
  1025: "ar-SA",
  1026: "bg",
  1027: "ca",
  1028: "zh-TW",
  1029: "cs",
  1030: "da",
  1031: "de",
  1032: "el",
  1033: "en",
  1034: "es",
  1035: "fi",
  1036: "fr",
  1037: "he",
  1038: "hu",
  1039: "is",
  1040: "it",
  1041: "ja",
  1042: "ko",
  1043: "nl",
  1044: "nb",
  1045: "pl",
  1046: "pt",
  1047: "rm",
  1048: "ro",
  1049: "ru",
  1050: "hr",
  1051: "sk",
  1052: "sq",
  1053: "sv",
  1054: "th",
  1055: "tr",
  1056: "ur",
  1057: "id",
  1058: "uk",
  1059: "be",
  1060: "sl",
  1061: "et",
  1062: "lv",
  1063: "lt",
  1064: "tg",
  1066: "vi",
  1067: "hy",
  1068: "az",
  1069: "eu",
  1070: "hsb",
  1071: "mk",
  1074: "tn",
  1076: "xh",
  1077: "zu",
  1078: "af",
  1079: "ka",
  1080: "fo",
  1081: "hi",
  1082: "mt",
  1083: "se",
  1086: "ms",
  1087: "kk",
  1088: "ky",
  1089: "sw",
  1090: "tk",
  1091: "uz",
  1092: "tt",
  1093: "bn-IN",
  1094: "pa",
  1095: "gu",
  1096: "or",
  1097: "ta",
  1098: "te",
  1099: "kn",
  1100: "ml",
  1101: "as",
  1102: "mr",
  1103: "sa",
  1104: "mn",
  1105: "bo",
  1106: "cy",
  1107: "km",
  1108: "lo",
  1110: "gl",
  1111: "kok",
  1114: "syr",
  1115: "si",
  1117: "iu",
  1118: "am",
  1121: "ne",
  1122: "fy",
  1123: "ps",
  1124: "fil",
  1125: "dv",
  1128: "ha",
  1130: "yo",
  1131: "qu-BO",
  1132: "nso",
  1133: "ba",
  1134: "lb",
  1135: "kl",
  1136: "ig",
  1144: "ii",
  1146: "arn",
  1148: "moh",
  1150: "br",
  1152: "ug",
  1153: "mi",
  1154: "oc",
  1155: "co",
  1156: "gsw",
  1157: "sah",
  1158: "quc",
  1159: "rw",
  1160: "wo",
  1164: "prs",
  2049: "ar-IQ",
  2052: "zh",
  2055: "de-CH",
  2057: "en-GB",
  2058: "es-MX",
  2060: "fr-BE",
  2064: "it-CH",
  2067: "nl-BE",
  2068: "nn",
  2070: "pt-PT",
  2074: "sr-Latn",
  2077: "sv-FI",
  2092: "az-Cyrl",
  2094: "dsb",
  2107: "se-SE",
  2108: "ga",
  2110: "ms-BN",
  2115: "uz-Cyrl",
  2117: "bn",
  2128: "mn-CN",
  2141: "iu-Latn",
  2143: "tzm",
  2155: "qu-EC",
  3073: "ar",
  3076: "zh-HK",
  3079: "de-AT",
  3081: "en-AU",
  3082: "es",
  3084: "fr-CA",
  3098: "sr",
  3131: "se-FI",
  3179: "qu",
  4097: "ar-LY",
  4100: "zh-SG",
  4103: "de-LU",
  4105: "en-CA",
  4106: "es-GT",
  4108: "fr-CH",
  4122: "hr-BA",
  4155: "smj-NO",
  5121: "ar-DZ",
  5124: "zh-MO",
  5127: "de-LI",
  5129: "en-NZ",
  5130: "es-CR",
  5132: "fr-LU",
  5146: "bs",
  5179: "smj",
  6145: "ary",
  6153: "en-IE",
  6154: "es-PA",
  6156: "fr-MC",
  6170: "sr-Latn-BA",
  6203: "sma-NO",
  7169: "aeb",
  7177: "en-ZA",
  7178: "es-DO",
  7194: "sr-Cyrl-BA",
  7227: "sms",
  8193: "ar-OM",
  8201: "en-JM",
  8202: "es-VE",
  8218: "bs-Cyrl",
  8251: "sms",
  9217: "ar-YE",
  9225: "en-029",
  9226: "es-CO",
  9275: "smn",
  10241: "ar-SY",
  10249: "en-BZ",
  10250: "es-PE",
  11265: "ar-JO",
  11273: "en-TT",
  11274: "es-AR",
  12289: "ar-LB",
  12297: "en-ZW",
  12298: "es-EC",
  13313: "ar-KW",
  13321: "en-PH",
  13322: "es-CL",
  14337: "ar-AE",
  14346: "es-UY",
  15361: "ar-BH",
  15370: "es-PY",
  16385: "ar-QA",
  16393: "en-IN",
  16394: "es-BO",
  17417: "en-MY",
  17418: "es-SV",
  18441: "en-SG",
  18442: "es-HN",
  19466: "es-NI",
  20490: "es-PR",
  21514: "es-US",
};

const utf16 = "utf-16";

/** Macintosh script id to encoding. */
const macScriptEncodings: Record<number, string> = {
  0: "macintosh",
  1: "x-mac-japanese",
  2: "x-mac-chinesetrad",
  3: "x-mac-korean",
  6: "x-mac-greek",
  7: "x-mac-cyrillic",
  9: "x-mac-devanagai",
  10: "x-mac-gurmukhi",
  11: "x-mac-gujarati",
  12: "x-mac-oriya",
  13: "x-mac-bengali",
  14: "x-mac-tamil",
  15: "x-mac-telugu",
  16: "x-mac-kannada",
  17: "x-mac-malayalam",
  18: "x-mac-sinhalese",
  19: "x-mac-burmese",
  20: "x-mac-khmer",
  21: "x-mac-thai",
  22: "x-mac-lao",
  23: "x-mac-georgian",
  24: "x-mac-armenian",
  25: "x-mac-chinesesimp",
  26: "x-mac-tibetan",
  27: "x-mac-mongolian",
  28: "x-mac-ethiopic",
  29: "x-mac-ce",
  30: "x-mac-vietnamese",
  31: "x-mac-extarabic",
};

/**
 * Macintosh language id to encoding, for the languages whose encoding
 * differs from their script's.
 */
const macLanguageEncodings: Record<number, string> = {
  15: "x-mac-icelandic",
  17: "x-mac-turkish",
  18: "x-mac-croatian",
  24: "x-mac-ce",
  25: "x-mac-ce",
  26: "x-mac-ce",
  27: "x-mac-ce",
  28: "x-mac-ce",
  30: "x-mac-icelandic",
  37: "x-mac-romanian",
  38: "x-mac-ce",
  39: "x-mac-ce",
  40: "x-mac-ce",
  143: "x-mac-inuit",
  146: "x-mac-gaelic",
};

/** The BCP 47 code of a name record's language, or undefined if unknown. */
function getLanguageCode(
  platformID: number,
  languageID: number,
  ltag: string[] | undefined,
): string | undefined {
  switch (platformID) {
    case 0: // Unicode
      if (languageID === 0xffff) {
        return "und";
      } else if (ltag) {
        return ltag[languageID];
      }
      break;
    case 1: // Macintosh
      return macLanguages[languageID];
    case 3: // Windows
      return windowsLanguages[languageID];
  }
  return undefined;
}

/** The encoding of a name record, or undefined if not supported. */
function getEncoding(
  platformID: number,
  encodingID: number,
  languageID: number,
): string | undefined {
  switch (platformID) {
    case 0: // Unicode
      return utf16;
    case 1: // Macintosh
      return macLanguageEncodings[languageID] || macScriptEncodings[encodingID];
    case 3: // Windows
      if (encodingID === 1 || encodingID === 10) {
        return utf16;
      }
      break;
  }
  return undefined;
}

/**
 * Parses the name table. ltag is the content of the ltag table, which
 * Unicode platform records index. Format 1 language tag records are skipped.
 */
export function parse(data: DataView, start: number, ltag?: string[]): NameTable {
  const name: NameTable = {};
  const p = new Parser(data, start);
  const format = p.parseUShort();
  const count = p.parseUShort();
  const stringOffset = p.offset + p.parseUShort();
  for (let i = 0; i < count; i++) {
    const platformID = p.parseUShort();
    const encodingID = p.parseUShort();
    const languageID = p.parseUShort();
    const nameID = p.parseUShort();
    const property = nameTableNames[nameID] || nameID;
    const byteLength = p.parseUShort();
    const offset = p.parseUShort();
    const language = getLanguageCode(platformID, languageID, ltag);
    const encoding = getEncoding(platformID, encodingID, languageID);
    if (encoding !== undefined && language !== undefined) {
      let text: string | undefined;
      if (encoding === utf16) {
        text = decode.UTF16(data, stringOffset + offset, byteLength);
      } else {
        text = decode.MACSTRING(data, stringOffset + offset, byteLength, encoding);
      }
      if (text) {
        let translations = name[property];
        if (translations === undefined) {
          translations = name[property] = {};
        }
        translations[language] = text;
      }
    }
  }
  if (format === 1) {
    // langTagCount; the language tag records are not read.
    p.parseUShort();
  }
  return name;
}

/** {23: "foo"} gives {foo: 23}; ["bar", "baz"] gives {bar: 0, baz: 1}. */
function reverseDict(dict: Record<number, string> | string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const key in dict) {
    result[(dict as Record<string, string>)[key] as string] = parseInt(key);
  }
  return result;
}

function makeNameRecord(
  platformID: number,
  encodingID: number,
  languageID: number,
  nameID: number,
  length: number,
  offset: number,
): Table {
  return new NameRecordTable("NameRecord", [
    { name: "platformID", type: "USHORT", value: platformID },
    { name: "encodingID", type: "USHORT", value: encodingID },
    { name: "languageID", type: "USHORT", value: languageID },
    { name: "nameID", type: "USHORT", value: nameID },
    { name: "length", type: "USHORT", value: length },
    { name: "offset", type: "USHORT", value: offset },
  ]);
}

/** The position of needle in haystack, or -1 (indexOf for arrays). */
function findSubArray(needle: number[], haystack: number[]): number {
  const needleLength = needle.length;
  const limit = haystack.length - needleLength + 1;
  loop: for (let pos = 0; pos < limit; pos++) {
    for (; pos < limit; pos++) {
      for (let k = 0; k < needleLength; k++) {
        if (haystack[pos + k] !== needle[k]) {
          continue loop;
        }
      }
      return pos;
    }
  }
  return -1;
}

/** Adds the bytes to the pool unless they are in it already; returns their offset. */
function addStringToPool(s: number[], pool: number[]): number {
  let offset = findSubArray(s, pool);
  if (offset < 0) {
    offset = pool.length;
    for (let i = 0, len = s.length; i < len; ++i) {
      pool.push(s[i] as number);
    }
  }
  return offset;
}

/**
 * Writes the names. Each name gets an old-style Macintosh record when its
 * language and characters allow it (else a Unicode record, adding the
 * language to ltag) and a Windows record when Windows knows the language.
 */
export function make(names: NameTable, ltag: string[]): Table {
  let nameID: number;
  const nameIDs: number[] = [];

  const namesWithNumericKeys: Record<number, Record<string, string>> = {};
  const nameTableIds = reverseDict(nameTableNames);
  for (const key in names) {
    let id: number | string | undefined = nameTableIds[key];
    if (id === undefined) {
      id = key;
    }
    nameID = parseInt(id as string);
    if (isNaN(nameID)) {
      throw new Error(
        'Name table entry "' + key + '" does not exist, see nameTableNames for complete list.',
      );
    }
    namesWithNumericKeys[nameID] = names[key] as Record<string, string>;
    nameIDs.push(nameID);
  }

  const macLanguageIds = reverseDict(macLanguages);
  const windowsLanguageIds = reverseDict(windowsLanguages);

  const nameRecords: Table[] = [];
  const stringPool: number[] = [];

  for (let i = 0; i < nameIDs.length; i++) {
    nameID = nameIDs[i] as number;
    const translations = namesWithNumericKeys[nameID] as Record<string, string>;
    for (const lang in translations) {
      const text = translations[lang] as string;
      let macPlatform = 1; // Macintosh
      let macLanguage = macLanguageIds[lang] as number;
      let macScript = macLanguageToScript[macLanguage] as number;
      const macEncoding = getEncoding(macPlatform, macScript, macLanguage) as string;
      let macName = encode.MACSTRING(text, macEncoding);
      if (macName === undefined) {
        macPlatform = 0; // Unicode
        macLanguage = ltag.indexOf(lang);
        if (macLanguage < 0) {
          macLanguage = ltag.length;
          ltag.push(lang);
        }
        macScript = 4; // Unicode 2.0 and later
        macName = encode.UTF16(text);
      }

      const macNameOffset = addStringToPool(macName, stringPool);
      nameRecords.push(
        makeNameRecord(macPlatform, macScript, macLanguage, nameID, macName.length, macNameOffset),
      );

      const winLanguage = windowsLanguageIds[lang];
      if (winLanguage !== undefined) {
        const winName = encode.UTF16(text);
        const winNameOffset = addStringToPool(winName, stringPool);
        nameRecords.push(makeNameRecord(3, 1, winLanguage, nameID, winName.length, winNameOffset));
      }
    }
  }

  nameRecords.sort(function (a, b) {
    return (
      (a.platformID as number) - (b.platformID as number) ||
      (a.encodingID as number) - (b.encodingID as number) ||
      (a.languageID as number) - (b.languageID as number) ||
      (a.nameID as number) - (b.nameID as number)
    );
  });

  const t = new Table("name", [
    { name: "format", type: "USHORT", value: 0 },
    { name: "count", type: "USHORT", value: nameRecords.length },
    { name: "stringOffset", type: "USHORT", value: 6 + nameRecords.length * 12 },
  ]);
  for (let r = 0; r < nameRecords.length; r++) {
    t.fields.push({ name: "record_" + r, type: "RECORD", value: nameRecords[r] });
  }
  t.fields.push({ name: "strings", type: "LITERAL", value: stringPool });
  return t;
}
