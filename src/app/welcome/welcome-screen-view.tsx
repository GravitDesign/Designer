/**
 * The content of the welcome screen / new-document dialog
 * (welcome/welcome-screen.ts), as the old module built it with jQuery.
 * The controller owns every state; this only renders it.
 */
import type { ReactNode, Ref } from "react";
import type { InputBox } from "../widgets/input-box.ts";
import { InputBoxView } from "../widgets/input-box-view.tsx";
import { UnitSelectView } from "../widgets/unit-select-view.tsx";
import type { Preset } from "./presets.ts";

/** One sidebar entry: its class, the two texts (string-table HTML) and its handler. */
export interface WelcomeOption {
  className: string;
  title: string;
  subtitle: string;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}

/** One footer link. */
export interface WelcomeLink {
  text: string;
  onClick: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export interface WelcomeScreenTexts {
  width: string;
  height: string;
  createCanvas: string;
  leaveEmpty: string;
  dontShow: string;
}

export interface WelcomeScreenState {
  /** The `.option` with "active". */
  activeOption: string | null;
  /** Indexes of the `.option-separator`s with "active". */
  activeSeparators: ReadonlySet<number>;
  /** The "don't show" row: null before the start page was first shown. */
  footer: { serial: number; checked: boolean } | null;
  /** The version line (HTML: the old code used .html()). */
  version: string;
}

/** The separators and options in sidebar order; a separator's class may be empty. */
export type SidebarEntry =
  | { kind: "separator"; className: string; index: number }
  | { kind: "option"; option: WelcomeOption };

export interface WelcomeScreenViewProps {
  /**
   * Shown at the top of the sidebar in the GravitDesign Next look (the
   * mark and wordmark, brand/brand-mark.tsx); absent in the classic look,
   * whose stylesheet paints the old logo there.
   */
  brandHead?: ReactNode;
  entries: readonly SidebarEntry[];
  links: readonly WelcomeLink[];
  presets: readonly Preset[];
  texts: WelcomeScreenTexts;
  state: WelcomeScreenState;
  widthRef: Ref<InputBox | null>;
  heightRef: Ref<InputBox | null>;
  onSizeKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onCreate: () => void;
  onPresetClick: (event: React.MouseEvent<HTMLElement>, preset: Preset) => void;
  onDontShowChange: (checked: boolean) => void;
  onVersionClick: () => void;
}

const SIZE_OPTIONS = { minValue: 0, incrementValue: 1, allowEmptyValue: true };

function Sidebar({
  brandHead,
  entries,
  links,
  state,
  onVersionClick,
}: Pick<
  WelcomeScreenViewProps,
  "brandHead" | "entries" | "links" | "state" | "onVersionClick"
>): ReactNode {
  // Old: links dealt round-robin into three columns.
  const columns: WelcomeLink[][] = [[], [], []];
  links.forEach((link, index) => (columns[index % 3] as WelcomeLink[]).push(link));
  return (
    <div className="sidebar">
      {brandHead}
      <div className="sidebar-options">
        {entries.map((entry) =>
          entry.kind === "separator" ? (
            <div
              key={"separator-" + entry.index}
              className={
                "option-separator" +
                (entry.className ? " " + entry.className : "") +
                (state.activeSeparators.has(entry.index) ? " active" : "")
              }
            />
          ) : (
            <div
              key={entry.option.className}
              className={
                "option " +
                entry.option.className +
                (state.activeOption === entry.option.className ? " active" : "")
              }
              onClick={entry.option.onClick}
            >
              <div className="option-icon" />
              <div className="option-text">
                <div
                  className="option-title"
                  dangerouslySetInnerHTML={{ __html: entry.option.title }}
                />
                <div
                  className="option-subtitle"
                  dangerouslySetInnerHTML={{ __html: entry.option.subtitle }}
                />
              </div>
            </div>
          ),
        )}
      </div>
      <div className="footer">
        <div className="links-container">
          {columns.map((column, index) => (
            <div key={index} className="links-column">
              {column.map((link, row) => (
                <div key={row} className="link">
                  <div className="link-icon" />
                  <a onClick={link.onClick}>{link.text}</a>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        className="version"
        onClick={onVersionClick}
        dangerouslySetInnerHTML={{ __html: state.version }}
      />
    </div>
  );
}

function PresetsFrame({
  presets,
  texts,
  widthRef,
  heightRef,
  onSizeKeyDown,
  onCreate,
  onPresetClick,
}: Pick<
  WelcomeScreenViewProps,
  "presets" | "texts" | "widthRef" | "heightRef" | "onSizeKeyDown" | "onCreate" | "onPresetClick"
>): ReactNode {
  return (
    <div className="presets-container">
      <div className="header">
        <div className="preset custom-size">
          <div className="g-input" onClick={(event) => event.stopPropagation()}>
            <div className="input-holder">
              <div>
                <InputBoxView
                  ref={widthRef}
                  type={undefined}
                  name="width"
                  placeholder={texts.width}
                  options={SIZE_OPTIONS}
                  onKeyDown={onSizeKeyDown}
                />
                <img className="versus" src="assets/icon/versus.svg" />
                <InputBoxView
                  ref={heightRef}
                  type={undefined}
                  name="height"
                  placeholder={texts.height}
                  options={SIZE_OPTIONS}
                  onKeyDown={onSizeKeyDown}
                />
              </div>
            </div>
            <UnitSelectView name="unit" short defaultValue="px" />
            <img className="result" src="assets/icon/result.svg" />
            <button className="cloud-button active" onClick={onCreate}>
              <span>{texts.createCanvas}</span>
            </button>
          </div>
          <p className="infinite-canvas">{texts.leaveEmpty}</p>
        </div>
      </div>
      <div className="presets-frame">
        <div className="presets">
          {presets.map((preset) => (
            <div key={preset.id} className="preset">
              <p className="title">{preset.name}</p>
              <div className="icon" onClick={(event) => onPresetClick(event, preset)}>
                <img src={"assets/img/new-document/" + preset.icon + "-white.svg"} />
                <img
                  src={"assets/img/new-document/" + preset.icon + "-black.svg"}
                  className="hover"
                />
              </div>
              <div className="select-container">
                <p className="name" onClick={(event) => onPresetClick(event, preset)}>
                  {preset.subTitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WelcomeScreenView(props: WelcomeScreenViewProps): ReactNode {
  const { state, texts, onDontShowChange } = props;
  return (
    <>
      <Sidebar {...props} />
      <div className="frame">
        <PresetsFrame {...props} />
        {state.footer ? (
          <div className="footer-section" key={state.footer.serial}>
            <label>
              {texts.dontShow}
              <input
                type="checkbox"
                defaultChecked={state.footer.checked}
                onChange={(event) => onDontShowChange(event.currentTarget.checked)}
              />
            </label>
          </div>
        ) : null}
      </div>
    </>
  );
}

/** The preset sizes overlay: one `li` per size, "Name (WxH unit)". */
export function PresetListView({
  items,
  onPick,
}: {
  items: readonly string[];
  onPick: (event: React.MouseEvent<HTMLLIElement>) => void;
}): ReactNode {
  return items.map((item, index) => (
    <li key={index} data-value={index} onClick={onPick}>
      {item}
    </li>
  ));
}

/** A recent file entry of the recent files overlay. */
export interface RecentItem {
  iconClass: string;
  name: string;
  onClick: () => void;
}

export function RecentDocumentsView({
  items,
  empty,
}: {
  items: readonly RecentItem[] | null;
  empty: string;
}): ReactNode {
  return (
    <div className="menu">
      {items && items.length ? (
        items.map((item, index) => (
          <div key={index} className="item file" onClick={item.onClick}>
            <div className={"icon" + (item.iconClass ? " " + item.iconClass : "")} />
            {/* Text, where the old overlay parsed the name as HTML: see
                "Recent file names on the welcome screen are text" in QUESTIONS.md. */}
            <div className="name">{item.name}</div>
          </div>
        ))
      ) : (
        <div className="item">{empty}</div>
      )}
    </div>
  );
}
