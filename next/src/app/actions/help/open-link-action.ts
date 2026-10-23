// Old: designer.browser.dev.js module 1621 (GOpenLinkAction).
import { LocaleKey } from "../../../engine/core/locale/locale-key.ts";
import { Action } from "../action.ts";
import type { Category } from "../category.ts";
import { gContainer } from "../host.ts";
import { HELP_LINKS, type HelpLink } from "./help-links.ts";

/** Help > <link>: opens an address outside the app, one action per entry of Links. */
export class OpenLinkAction extends Action {
  static Links: readonly HelpLink[] = HELP_LINKS;
  static ID = "open-link";

  private readonly _name: string;
  private readonly _category: Category;
  private readonly _group: string;
  private readonly _link: string | null | undefined;
  private readonly _builder: HelpLink["builder"];
  private readonly _title: LocaleKey;
  private readonly _icon: string | null | undefined;

  constructor({ name, category, group, link, icon, builder }: HelpLink) {
    super();
    this._name = name;
    this._category = category;
    this._group = group;
    this._link = link;
    this._builder = builder;
    this._title = new LocaleKey("GOpenLinkAction", "title." + name);
    this._icon = icon;
  }

  override getIcon(): string | null {
    return this._icon || null;
  }

  override getId(): string {
    return OpenLinkAction.ID + "." + this._name;
  }

  override getTitle(): LocaleKey {
    return this._title;
  }

  override getCategory(): Category {
    return this._category;
  }

  override getGroup(): string {
    return this._group;
  }

  override isEnabled(): boolean {
    return true;
  }

  override execute(): void {
    if (this._link || this._builder) {
      const address =
        (this._builder && "function" == typeof this._builder && this._builder()) || this._link;
      if (address) gContainer().openExternalLink(null, address);
    }
  }

  override toString(): string {
    return "[Object GOpenLinkAction]";
  }
}
