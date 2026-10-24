// Old: designer.browser.dev.js module 67 (GRichTooltipConfig, TOOLTIP_AREA).
/**
 * What a rich tooltip shows: title, description, shortcut, video or
 * picture, and how it is placed. The tooltip itself is widgets/rich-tooltip.ts.
 *
 * Fields that were not given stay undefined (the old constructor assigned
 * every field, so the prototype's nulls were shadowed); the tooltip then
 * uses its defaults, because it merges the config the way $.extend did,
 * skipping undefined values but keeping nulls.
 */

/** The fields a config takes (the old constructor's destructured object). */
export interface RichTooltipFields {
  title: unknown;
  description?: unknown;
  video?: unknown;
  pic?: unknown;
  isPro?: unknown;
  middle?: unknown;
  shortcut?: unknown;
  videoTimeout?: unknown;
  marginLeft?: unknown;
  side?: unknown;
  learnMore?: unknown;
  upgradeToProStatsValue?: unknown;
  forceShow?: unknown;
  flipHorizontal?: unknown;
}

/** getConfig(): every field, undefined where none was given. */
export interface RichTooltipConfigValues {
  title: unknown;
  description: unknown;
  video: unknown;
  pic: unknown;
  isPro: unknown;
  middle: unknown;
  marginLeft: unknown;
  shortcut: unknown;
  videoTimeout: unknown;
  side: unknown;
  learnMore: unknown;
  upgradeToProStatsValue: unknown;
  forceShow: unknown;
  flipHorizontal: unknown;
}

export class RichTooltipConfig {
  static from(fields: RichTooltipFields): RichTooltipConfig {
    return new RichTooltipConfig(fields);
  }

  _title: unknown = null;
  _description: unknown = null;
  _video: unknown = null;
  _pic: unknown = null;
  _isPro: unknown = null;
  _middle: unknown = null;
  _marginLeft: unknown = null;
  _shortcut: unknown = null;
  _videoTimeout: unknown = null;
  _side: unknown = null;
  _learnMore: unknown = null;
  _upgradeToProStatsValue: unknown = null;
  _forceShow: unknown = false;
  _flipHorizontal: unknown = false;

  constructor(fields: RichTooltipFields) {
    const {
      title,
      description,
      video,
      pic,
      isPro,
      middle,
      shortcut,
      videoTimeout,
      marginLeft,
      side,
      learnMore,
      upgradeToProStatsValue,
      forceShow,
      flipHorizontal,
    } = fields;
    if (!title) throw new Error("");
    this._title = title;
    this._description = description;
    this._video = video;
    this._pic = pic;
    this._isPro = isPro;
    this._middle = middle;
    this._marginLeft = marginLeft;
    this._shortcut = shortcut;
    this._videoTimeout = videoTimeout;
    this._side = side;
    this._learnMore = learnMore;
    this._upgradeToProStatsValue = upgradeToProStatsValue;
    this._forceShow = forceShow;
    this._flipHorizontal = flipHorizontal;
  }

  /** Changes the given fields; forceShow and flipHorizontal can't be changed. */
  setConfig(fields: Partial<RichTooltipFields>): this {
    const {
      title,
      description,
      video,
      pic,
      isPro,
      middle,
      shortcut,
      videoTimeout,
      marginLeft,
      side,
      learnMore,
      upgradeToProStatsValue,
    } = fields;
    if (title !== undefined) this._title = title;
    if (!this._title) throw new Error("");
    if (description !== undefined) this._description = description;
    if (video !== undefined) this._video = video;
    if (pic !== undefined) this._pic = pic;
    if (isPro !== undefined) this._isPro = isPro;
    if (middle !== undefined) this._middle = middle;
    if (shortcut !== undefined) this._shortcut = shortcut;
    if (videoTimeout !== undefined) this._videoTimeout = videoTimeout;
    if (marginLeft !== undefined) this._marginLeft = marginLeft;
    if (side !== undefined) this._side = side;
    if (learnMore !== undefined) this._learnMore = learnMore;
    if (upgradeToProStatsValue !== undefined) this._upgradeToProStatsValue = upgradeToProStatsValue;
    return this;
  }

  getConfig(): RichTooltipConfigValues {
    return {
      title: this._title,
      description: this._description,
      video: this._video,
      pic: this._pic,
      isPro: this._isPro,
      middle: this._middle,
      marginLeft: this._marginLeft,
      shortcut: this._shortcut,
      videoTimeout: this._videoTimeout,
      side: this._side,
      learnMore: this._learnMore,
      upgradeToProStatsValue: this._upgradeToProStatsValue,
      forceShow: this._forceShow,
      flipHorizontal: this._flipHorizontal,
    };
  }

  toString(): string {
    return "[Object GRichTooltipConfig]";
  }
}

/** Where a tooltip is shown; the actions pass it with their tooltip configs. */
export const TOOLTIP_AREA = {
  TOOLBAR: "TOOLBAR",
  SIDEBAR: "SIDEBAR",
  MAIN_MENU: {
    TRY_PRO_COMMON: "TRY_PRO_COMMON",
    TRY_EXP_PDF_ADVANCED_SETTING: "TRY_EXP_PDF_ADVANCED_SETTING",
  },
} as const;
