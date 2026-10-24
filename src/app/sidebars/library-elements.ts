// Old: designer.browser.dev.js module 1664 (the library elements) and the
// category table it reads, config ELEMENTS (chunk.vendor.js module 832).
/**
 * The categories of the Libraries sidebar. The table is the old one byte
 * for byte, including the category icons on the old asset CDN; see
 * "Library categories still point at the old asset CDN" in QUESTIONS.md.
 * The assets themselves came from the marketplace API, which is gone.
 */

/** A sub category: a market path, or a search tag (icons, photos). */
export interface LibraryCategoryChild {
  name: string;
  path?: string;
  tag?: string;
  count?: number;
}

/** A library category tile. */
export interface LibraryCategory {
  name: string;
  path: string;
  color: string;
  url: string;
  children?: LibraryCategoryChild[];
}

/** config.ENABLE_UNSPLASH_INTEGRATION of the old browser build. */
export const ENABLE_UNSPLASH_INTEGRATION = true;

/** config.ELEMENTS. */
export const ELEMENTS: readonly LibraryCategory[] = [
  {
    name: "Shapes",
    path: "element.shape",
    color: "#ffcf61",
    url: "https://dkqeh8b5t3gxm.cloudfront.net/icons/shape",
  },
  {
    name: "Illustrations",
    path: "element.illustration.",
    color: "#28256c",
    url: "https://dkqeh8b5t3gxm.cloudfront.net/icons/illustration",
    children: [
      { name: "Realistic", path: "element.illustration.realistic" },
      { name: "Linear", path: "element.illustration.line" },
      { name: "Multi-Colored", path: "element.illustration.color" },
      { name: "Solid", path: "element.illustration.solid" },
      { name: "X-Ray", path: "element.illustration.x-ray" },
    ],
  },
  {
    name: "Icons",
    path: "element.icons",
    color: "#5f82db",
    url: "https://dkqeh8b5t3gxm.cloudfront.net/icons/icon",
    children: [
      { name: "Alphabet", tag: "alphabet", count: 576 },
      { name: "Animals", tag: "animals", count: 836 },
      { name: "Arrows", tag: "arrows", count: 985 },
      { name: "Astrology", tag: "astrology", count: 431 },
      { name: "Baby", tag: "baby", count: 495 },
      { name: "Beauty", tag: "beauty", count: 580 },
      { name: "Business", tag: "business", count: 2139 },
      { name: "Cinema", tag: "cinema", count: 1371 },
      { name: "City", tag: "city", count: 1150 },
      { name: "Clothing", tag: "clothing", count: 911 },
      { name: "Computer Hardware", tag: "computer-hardware", count: 914 },
      { name: "Crime", tag: "crime", count: 183 },
      { name: "Culture", tag: "cultures", count: 762 },
      { name: "DIY", tag: "diy", count: 411 },
      { name: "Data", tag: "data", count: 1266 },
      { name: "Drinks", tag: "drinks", count: 314 },
      { name: "Ecommerce", tag: "ecommerce", count: 1490 },
      { name: "Editing", tag: "editing", count: 1722 },
      { name: "Files", tag: "files", count: 1033 },
      { name: "Finance", tag: "finance", count: 974 },
      { name: "Flags", tag: "flags", count: 275 },
      { name: "Folders", tag: "folders", count: 225 },
      { name: "Food", tag: "food", count: 1289 },
      { name: "Free Popular", tag: "free-icons", count: 1025 },
      { name: "Gaming", tag: "gaming", count: 990 },
      { name: "Hands", tag: "hands", count: 262 },
      { name: "Healthcare", tag: "healthcare", count: 1075 },
      { name: "Holidays", tag: "holidays", count: 530 },
      { name: "Household", tag: "household", count: 2210 },
      { name: "Industry", tag: "industry", count: 1185 },
      { name: "Logos", tag: "logos", count: 2420 },
      { name: "Maps", tag: "maps", count: 676 },
      { name: "Media Controls", tag: "media-controls", count: 326 },
      { name: "Messaging", tag: "messaging", count: 1579 },
      { name: "Military", tag: "military", count: 600 },
      { name: "Mobile", tag: "mobile", count: 1164 },
      { name: "Music", tag: "music", count: 611 },
      { name: "Nature", tag: "nature", count: 38 },
      { name: "Network", tag: "network", count: 708 },
      { name: "Operating Systems", tag: "operating-systems", count: 115 },
      { name: "People", tag: "users", count: 1299 },
      { name: "Photo and Video", tag: "photo-video", count: 790 },
      { name: "Plants", tag: "plants", count: 749 },
      { name: "Printing", tag: "printing", count: 442 },
      { name: "Profile", tag: "profile", count: 598 },
      { name: "Programming", tag: "programming", count: 830 },
      { name: "Science", tag: "science", count: 1578 },
      { name: "Security", tag: "security", count: 631 },
      { name: "Shopping", tag: "shopping", count: 714 },
      { name: "Social Media", tag: "social-networks", count: 494 },
      { name: "Sports", tag: "sports", count: 1496 },
      { name: "Time And Date", tag: "time-and-date", count: 1321 },
      { name: "Transport", tag: "transport", count: 1802 },
      { name: "Travel", tag: "travel", count: 1490 },
      { name: "User Interface", tag: "user-interface", count: 2423 },
      { name: "Weather", tag: "weather", count: 754 },
    ],
  },
  {
    name: "Emojis",
    path: "element.emoji.",
    color: "#a8ddef",
    url: "https://dkqeh8b5t3gxm.cloudfront.net/icons/emoji",
    children: [
      { name: "Klex", path: "element.emoji.klex" },
      { name: "Classic", path: "element.emoji.classic" },
      { name: "Cube", path: "element.emoji.cube" },
      { name: "Cone", path: "element.emoji.cone" },
    ],
  },
  {
    name: "Stickers",
    path: "element.sticker",
    color: "#dd3647",
    url: "https://dkqeh8b5t3gxm.cloudfront.net/icons/sticker",
  },
  {
    name: "Frames",
    path: "element.frame",
    color: "#6656dd",
    url: "https://dkqeh8b5t3gxm.cloudfront.net/icons/frame",
  },
  {
    name: "Lines",
    path: "element.line",
    color: "#02bbc2",
    url: "https://dkqeh8b5t3gxm.cloudfront.net/icons/line",
  },
  {
    name: "Unsplash Photos",
    path: "element.image",
    color: "#5ba1e7",
    url: "https://dkqeh8b5t3gxm.cloudfront.net/icons/image",
    children: [
      { name: "Wallpapers", path: "element.image.wallpapers", tag: "wallpapers" },
      { name: "Textures", path: "element.image.textures", tag: "textures" },
      { name: "Nature", path: "element.image.nature", tag: "nature" },
      { name: "Current Events", path: "element.image.events", tag: "events" },
      { name: "Architecture", path: "element.image.architecture", tag: "architecture" },
      { name: "Business", path: "element.image.business", tag: "business" },
      { name: "Films", path: "element.image.films", tag: "films" },
      { name: "Animals", path: "element.image.animals", tag: "animals" },
      { name: "Travel", path: "element.image.travel", tag: "travel" },
      { name: "Fashion", path: "element.image.fashion", tag: "fashion" },
      { name: "Food", path: "element.image.food", tag: "food" },
      { name: "Spirituality", path: "element.image.spirituality", tag: "spiritual" },
      { name: "Experimental", path: "element.image.experimental", tag: "experimental" },
      { name: "Health", path: "element.image.health", tag: "health" },
      { name: "Culture", path: "element.image.culture", tag: "culture" },
      { name: "People", path: "element.image.people", tag: "people" },
    ],
  },
];

// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- the old module was a static-only class
export class LibraryElements {
  /** The categories, without the Unsplash one when that integration is off. */
  static getElements(): LibraryCategory[] {
    return LibraryElements.isUnsplashIntegrationEnabled()
      ? ELEMENTS.slice()
      : ELEMENTS.filter((element) => "element.image" !== element.path);
  }

  static isUnsplashIntegrationEnabled(): boolean {
    return ENABLE_UNSPLASH_INTEGRATION;
  }
}
