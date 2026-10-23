// Old: chunk.vendor.js module 176 (GSystem).
/**
 * Operating system, hardware class, language and byte order, detected once
 * when the module loads. Key (Meta vs Ctrl, key symbols) and Platform
 * (modifier tracking, canvas limits) read these values; keep the detection
 * here and nowhere else.
 */

export const OperatingSystem = {
  Unix: 0,
  Windows: 1,
  OSX_IOS: 2,
} as const;
export type OperatingSystem = (typeof OperatingSystem)[keyof typeof OperatingSystem];

export const Hardware = {
  Desktop: 10,
  Tablet: 20,
  Phone: 30,
} as const;
export type Hardware = (typeof Hardware)[keyof typeof Hardware];

interface NavigatorLike {
  userAgent?: string;
  platform?: string;
  language?: string;
  maxTouchPoints?: number;
  browserLanguage?: string;
  systemLanguage?: string;
  userLanguage?: string;
}

function currentNavigator(): NavigatorLike | undefined {
  return typeof navigator === "undefined" ? undefined : (navigator as NavigatorLike);
}

/**
 * The device type ua-parser-js 0.7.33 reports ("tablet", "mobile", ...),
 * with the old extra rule that Samsung SM-P605/P610/P615 are tablets.
 *
 * ua-parser-js is not a dependency yet, so only the extra rule is checked
 * here; every other user agent falls through to the old regex fallback in
 * `detectHardware`, which gives the same answer for desktop browsers.
 */
export function deviceTypeFromUserAgent(userAgent: string): string | undefined {
  if (/android.+((SM-P605|SM-P610|SM-P615))/i.test(userAgent)) return "tablet";
  return undefined;
}

/** Old hardware detection; exported for tests with a fake navigator. */
export function detectHardware(nav: NavigatorLike | undefined): Hardware {
  if (nav === undefined) return Hardware.Desktop;
  try {
    const type = deviceTypeFromUserAgent(nav.userAgent ?? "");
    if (type) {
      if (type === "tablet") return Hardware.Tablet;
      if (type === "mobile") return Hardware.Phone;
    }
  } catch (error) {
    console.error("UAParser (Third party library)", error);
  }
  let tablet = false;
  let phone = false;
  let touchMac: boolean | number | undefined = false;
  if (nav.userAgent) {
    tablet = !!nav.userAgent.match(/(iPad|SCH-I800|xoom|kindle)/i);
    phone = !!nav.userAgent.match(
      /(iPhone|iPod|blackberry|android 0.5|htc|lg|midp|mmp|mobile|nokia|opera mini|palm|pocket|psp|sgh|smartphone|symbian|treo mini|Playstation Portable|SonyEricsson|Samsung|MobileExplorer|PalmSource|Benq|Windows Phone|Windows Mobile|IEMobile|Windows CE|Nintendo Wii)/i,
    );
    touchMac =
      !!nav.userAgent.match(/(macintosh)/i) && nav.maxTouchPoints && nav.maxTouchPoints > 1;
  }
  return tablet || touchMac ? Hardware.Tablet : phone ? Hardware.Phone : Hardware.Desktop;
}

/** Old operating system detection; exported for tests with a fake navigator. */
export function detectOperatingSystem(nav: NavigatorLike | undefined): OperatingSystem {
  if (nav === undefined) return OperatingSystem.Unix;
  const rules: { string: string | undefined; subString: string; identity: OperatingSystem }[] = [
    { string: nav.platform, subString: "Win", identity: OperatingSystem.Windows },
    { string: nav.platform, subString: "Mac", identity: OperatingSystem.OSX_IOS },
    { string: nav.userAgent, subString: "iPhone", identity: OperatingSystem.OSX_IOS },
    { string: nav.userAgent, subString: "iPad", identity: OperatingSystem.OSX_IOS },
    { string: nav.userAgent, subString: "Android", identity: OperatingSystem.Unix },
    { string: nav.platform, subString: "Linux", identity: OperatingSystem.Unix },
  ];
  for (const rule of rules) {
    if (rule.string && rule.string.indexOf(rule.subString) != -1) return rule.identity;
  }
  return OperatingSystem.Windows;
}

/** Old language detection: the part before the first "-", lower case. */
export function detectLanguage(nav: NavigatorLike | undefined): string | null {
  if (nav === undefined) return null;
  const parts = (
    nav.language ||
    nav.browserLanguage ||
    nav.systemLanguage ||
    nav.userLanguage ||
    ""
  ).split("-");
  // The old condition was `2 == parts.length || parts`, which is always true.
  return (parts[0] as string).toLowerCase();
}

function detectLittleEndian(): boolean {
  // The old check read the ArrayBuffer itself by index, which is always
  // undefined, so it always reported little endian.
  return true;
}

/** The old GSystem: detected values plus the two enums. */
export const System = {
  OperatingSystem,
  Hardware,
  littleEndian: detectLittleEndian(),
  operatingSystem: detectOperatingSystem(currentNavigator()) as OperatingSystem,
  hardware: detectHardware(currentNavigator()) as Hardware,
  language: detectLanguage(currentNavigator()),
};
