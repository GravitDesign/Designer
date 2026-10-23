// Old: designer.browser.dev.js module 1622 (the Help menu links).
import { Category } from "../category.ts";

/** One Help menu link: GOpenLinkAction gets one of these. */
export interface HelpLink {
  name: string;
  link?: string | null;
  category: Category;
  group: string;
  icon?: string | null;
  /** Builds the address when it is opened; wins over `link` when it returns one. */
  builder?: (() => string | null | undefined) | null;
}

/** The tutorials playlist (module 1302; the rest of that module, a network check, is dropped). */
export const YOUTUBE_PLAYLIST =
  "https://www.youtube.com/playlist?list=PLqsk_4aqUvEYxmy5NpQakcZXa6_3w-I8F";

/** The links in the old order: contact, user guide, tutorials, feature requests. */
export const HELP_LINKS: readonly HelpLink[] = [
  {
    name: "contact-us",
    link: "https://github.com/rathlinus/gravit-designer",
    category: Category.CATEGORY_HELP_SUPPORT,
    group: "help/support",
  },
  {
    name: "user-guide",
    link: "/docs/index.html",
    category: Category.CATEGORY_HELP_LEARN,
    group: "help/learn",
  },
  {
    name: "tutorials",
    link: YOUTUBE_PLAYLIST,
    category: Category.CATEGORY_HELP_LEARN,
    group: "help/learn",
  },
  {
    name: "request-new-feature",
    link: "https://github.com/rathlinus/gravit-designer/issues",
    category: Category.CATEGORY_HELP,
    group: "help",
  },
];
