// Old: designer.browser.dev.js module 18 (GCategory).
/**
 * Menu categories of the actions. A category has a label, a visibility, an
 * icon and a parent; the main menu builds its menus and submenus from the
 * category chain of each action (ACT-MENU-003).
 *
 * The predefined categories resolve their label, visibility and icon each
 * time they are read, so a language switch or the touch layout shows up
 * without rebuilding them.
 */
import { Locale } from "../../engine/core/locale/locale.ts";
import { LocaleKey } from "../../engine/core/locale/locale-key.ts";
import { GObject } from "../../engine/core/object.ts";
import { gDesigner } from "./host.ts";

export class Category extends GObject {
  label: string | null = null;
  visible: boolean = true;
  icon: unknown = null;
  parent: Category | null = null;

  /**
   * `label` is a LocaleKey or a string Locale.get resolves; `icon` a class
   * name ("gravit-icon-export") or, for the account category, an element.
   */
  constructor(label?: LocaleKey | string, visible: boolean = true, icon?: unknown) {
    super();
    this.label =
      label === undefined ? null : typeof label === "string" ? label : Locale.get(label) || null;
    this.visible = visible;
    this.icon = icon === undefined ? null : icon;
    this.parent = null;
  }

  static CATEGORY_FILE: Category;
  static CATEGORY_FILE_SHARE: Category;
  static CATEGORY_FILE_OPEN_RECENT: Category;
  static CATEGORY_FILE_SAVE_AS: Category;
  static CATEGORY_FILE_GRAVIT_CLOUD: Category;
  static CATEGORY_FILE_IMPORT: Category;
  static CATEGORY_FILE_IMPORT_IMAGE: Category;
  static CATEGORY_FILE_EXPORT: Category;
  static CATEGORY_FILE_EXPORT_PDF: Category;
  static CATEGORY_EDIT: Category;
  static CATEGORY_EDIT_PASTE: Category;
  static CATEGORY_EDIT_SELECT_SAME: Category;
  static CATEGORY_MODIFY: Category;
  static CATEGORY_MODIFY_COMBINE: Category;
  static CATEGORY_MODIFY_ARRANGE: Category;
  static CATEGORY_MODIFY_ALIGN: Category;
  static CATEGORY_MODIFY_TRANSFORM: Category;
  static CATEGORY_MODIFY_PATH: Category;
  static CATEGORY_MODIFY_SYMBOL: Category;
  static CATEGORY_VIEW: Category;
  static CATEGORY_VIEW_CANVAS: Category;
  static CATEGORY_VIEW_SNAP: Category;
  static CATEGORY_VIEW_MAGNIFICATION: Category;
  static CATEGORY_HELP: Category;
  static CATEGORY_HELP_SUPPORT: Category;
  static CATEGORY_HELP_BETA_FEEDBACK: Category;
  static CATEGORY_HELP_LEARN: Category;
  static CATEGORY_HELP_LANGUAGE: Category;
  static CATEGORY_HELP_SWITCHWEBCDR: Category;
  static CATEGORY_ACCOUNT: Category;
}

/**
 * A predefined category: a GCategory whose label, visibility, icon and
 * parent are getters over the given key and callbacks.
 */
function defineCategory(
  key: string,
  parent: Category | null = null,
  visible: () => boolean = () => true,
  icon: () => unknown = () => null,
): Category {
  const category = new Category();
  Object.defineProperties(category, {
    label: { get: () => Locale.get(new LocaleKey("GCategory", key)) },
    visible: { get: visible },
    icon: { get: icon },
    parent: { get: () => parent },
  });
  return category;
}

/** The icon a category shows in the touch layout only. */
const touchIcon = (icon: string) => () => (gDesigner().isTouchEnabled() ? icon : null);
const always = () => true;

Category.CATEGORY_FILE = defineCategory("category.file");
Category.CATEGORY_FILE_SHARE = defineCategory("category.file.share", Category.CATEGORY_FILE);
Category.CATEGORY_FILE_OPEN_RECENT = defineCategory(
  "category.file.open-recent",
  Category.CATEGORY_FILE,
);
Category.CATEGORY_FILE_SAVE_AS = defineCategory("category.file.save-as", Category.CATEGORY_FILE);
Category.CATEGORY_FILE_GRAVIT_CLOUD = defineCategory(
  "category.file.gravit-cloud",
  Category.CATEGORY_FILE,
);
Category.CATEGORY_FILE_IMPORT = defineCategory("category.file.import", Category.CATEGORY_FILE);
Category.CATEGORY_FILE_IMPORT_IMAGE = defineCategory(
  "category.file.import.image",
  Category.CATEGORY_FILE_IMPORT,
);
Category.CATEGORY_FILE_EXPORT = defineCategory(
  "category.file.export",
  Category.CATEGORY_FILE,
  always,
  touchIcon("gravit-icon-export"),
);
Category.CATEGORY_FILE_EXPORT_PDF = defineCategory(
  "category.file.export.pdf",
  Category.CATEGORY_FILE_EXPORT,
);
Category.CATEGORY_EDIT = defineCategory("category.edit");
Category.CATEGORY_EDIT_PASTE = defineCategory(
  "category.edit.paste",
  Category.CATEGORY_EDIT,
  always,
  touchIcon("gravit-icon-paste"),
);
Category.CATEGORY_EDIT_SELECT_SAME = defineCategory(
  "category.edit.select-same",
  Category.CATEGORY_EDIT,
);
Category.CATEGORY_MODIFY = defineCategory("category.modify");
Category.CATEGORY_MODIFY_COMBINE = defineCategory(
  "category.modify.combine",
  Category.CATEGORY_MODIFY,
);
Category.CATEGORY_MODIFY_ARRANGE = defineCategory(
  "category.modify.arrange",
  Category.CATEGORY_MODIFY,
  always,
  touchIcon("gravit-icon-arrange"),
);
Category.CATEGORY_MODIFY_ALIGN = defineCategory(
  "category.modify.align",
  Category.CATEGORY_MODIFY,
  always,
  touchIcon("gravit-icon-align"),
);
Category.CATEGORY_MODIFY_TRANSFORM = defineCategory(
  "category.modify.transform",
  Category.CATEGORY_MODIFY,
  always,
  touchIcon("gravit-icon-transform"),
);
Category.CATEGORY_MODIFY_PATH = defineCategory("category.modify.path", Category.CATEGORY_MODIFY);
Category.CATEGORY_MODIFY_SYMBOL = defineCategory(
  "category.modify.symbol",
  Category.CATEGORY_MODIFY,
  always,
  touchIcon("gravit-icon-symbol"),
);
Category.CATEGORY_VIEW = defineCategory(
  "category.view",
  null,
  always,
  touchIcon("gravit-icon-no-icon"),
);
Category.CATEGORY_VIEW_CANVAS = defineCategory("category.view.canvas", Category.CATEGORY_VIEW);
Category.CATEGORY_VIEW_SNAP = defineCategory(
  "category.view.snap",
  Category.CATEGORY_VIEW,
  always,
  touchIcon("gravit-icon-snap"),
);
Category.CATEGORY_VIEW_MAGNIFICATION = defineCategory(
  "category.view.magnification",
  Category.CATEGORY_VIEW,
  always,
  touchIcon("gravit-icon-zoom-in"),
);
Category.CATEGORY_HELP = defineCategory("category.help");
Category.CATEGORY_HELP_SUPPORT = defineCategory("category.help.support", Category.CATEGORY_HELP);
Category.CATEGORY_HELP_BETA_FEEDBACK = defineCategory(
  "category.help.beta_feedback",
  Category.CATEGORY_HELP,
);
Category.CATEGORY_HELP_LEARN = defineCategory("category.help.learn", Category.CATEGORY_HELP);
Category.CATEGORY_HELP_LANGUAGE = defineCategory("category.help.language", Category.CATEGORY_HELP);
Category.CATEGORY_HELP_SWITCHWEBCDR = defineCategory(
  "category.help.switchwebcdr",
  Category.CATEGORY_HELP,
);
// The account menu of the touch layout. Its icon was the signed-in user's
// avatar; the rewrite has no accounts, so it never has one (the old
// browser build had no signed-in user either).
Category.CATEGORY_ACCOUNT = defineCategory("category.account", null, () =>
  gDesigner().isTouchEnabled(),
);
