/**
 * The rows of the settings dialog (settings/settings-dialog.ts), as the old
 * module built them with jQuery. The switches are uncontrolled: Save reads
 * them from the DOM, as before, so the row list decides what Save sees.
 */
import { useLayoutEffect, useRef, type ReactNode, type Ref } from "react";
import type { InputBox } from "../widgets/input-box.ts";
import { InputBoxView } from "../widgets/input-box-view.tsx";

/**
 * `_createSetting(label, description, editor)`: label text, description
 * HTML (its links open in a new tab) or, without one, the text block
 * aligned to the middle.
 */
export function Setting({
  label,
  description,
  className,
  children,
  after,
}: {
  label: string | null;
  description: string | null;
  /** "sub-setting" for the row nested in the theme row. */
  className?: string;
  children: ReactNode;
  /** Rows the old code appended to this row's element. */
  after?: ReactNode;
}): ReactNode {
  const descriptionRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = descriptionRef.current;
    if (element)
      for (const link of element.querySelectorAll("a")) link.setAttribute("target", "_blank");
  }, [description]);
  return (
    <div className={"setting" + (className ? " " + className : "")}>
      <div className="form">
        <div
          className="text-description"
          style={description ? undefined : { verticalAlign: "middle" }}
        >
          <div className="label">{label}</div>
          {description ? (
            <div
              ref={descriptionRef}
              className="description"
              dangerouslySetInnerHTML={{ __html: description }}
            />
          ) : null}
        </div>
        <div className="editor">{children}</div>
      </div>
      {after}
    </div>
  );
}

/** `label.g-switch > input[type=checkbox][data-setting] + div`. */
export function Switch({
  setting,
  checked,
  className,
  onLabelChange,
}: {
  setting: string;
  checked: boolean;
  /** Extra classes of the label ("test" on the notifications row). */
  className?: string;
  /** A change listener on the label (the decimals row). */
  onLabelChange?: (input: HTMLInputElement) => void;
}): ReactNode {
  return (
    <label
      className={"g-switch" + (className ? " " + className : "")}
      onChange={
        onLabelChange
          ? (event) => onLabelChange(event.target as unknown as HTMLInputElement)
          : undefined
      }
    >
      <input type="checkbox" data-setting={setting} defaultChecked={checked} />
      <div />
    </label>
  );
}

/** The auto-save switch and its interval select (option values are indexes). */
export function AutoSaveEditor({
  checked,
  intervals,
  selected,
}: {
  checked: boolean;
  intervals: readonly number[];
  /** Index of the stored interval; -1 selects nothing. */
  selected: number;
}): ReactNode {
  const ref = useRef<HTMLSelectElement>(null);
  // Old: .val(index) after the options were added; -1 (unknown) leaves
  // no option selected.
  useLayoutEffect(() => {
    if (ref.current) ref.current.value = String(selected);
  }, [selected]);
  return (
    <>
      <Switch setting="auto_save" checked={checked} />
      <select ref={ref} data-setting="auto_save_interval">
        {intervals.map((interval, index) => (
          <option key={index} value={index}>
            {interval}
          </option>
        ))}
      </select>
    </>
  );
}

/** The theme button: `div.g-select.g-theme-selector[type=button]`. */
export function ThemeSelector({
  name,
  onClick,
}: {
  name: string;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
}): ReactNode {
  return (
    <div
      // A div with a type attribute, as the old markup had.
      {...{ type: "button" }}
      className="g-select g-theme-selector"
      style={{ minWidth: "170px", width: "max-content" }}
      data-setting="theme"
      onClick={onClick}
    >
      {name}
    </div>
  );
}

/** The rows of the theme overlay. */
export function ThemeRows({
  themes,
  onPick,
}: {
  themes: readonly { name: string }[];
  onPick: (index: number) => void;
}): ReactNode {
  return themes.map((theme, index) => (
    <div
      key={index}
      className="g-theme-row"
      onClick={() => onPick(index)}
      dangerouslySetInnerHTML={{ __html: theme.name }}
    />
  ));
}

/** The rounding switch and the decimals box beside it. */
export function DecimalsEditor({
  on,
  valueShown,
  boxRef,
  onToggle,
  onBoxChange,
}: {
  on: boolean;
  valueShown: boolean;
  boxRef: Ref<InputBox | null>;
  onToggle: (input: HTMLInputElement) => void;
  onBoxChange: (box: InputBox) => void;
}): ReactNode {
  return (
    <div>
      <Switch setting="decimals-num-onoff" checked={on} onLabelChange={onToggle} />
      <div>
        <InputBoxView
          ref={boxRef}
          type="text"
          style={{ width: "60px", display: valueShown ? undefined : "none" }}
          data-setting="decimals-num-val"
          options={{ minValue: 0, maxVal: 6 }}
          onChange={(_value, box) => onBoxChange(box)}
        />
      </div>
    </div>
  );
}

/** What the rows show; the controller fills it from the settings. */
export interface SettingsRowsModel {
  texts: Readonly<Record<string, string>>;
  highlightOnHover: boolean;
  autoExpandLayers: boolean;
  /** Null when auto-save is off in this build. */
  autoSave: {
    checked: boolean;
    intervals: readonly number[];
    selected: number;
    warningSetting: string;
    warningChecked: boolean;
  } | null;
  /** Null in production, beta, LTS and RC builds. */
  developer: { stepsDebug: boolean; cache: boolean } | null;
  themeName: string;
  onThemeClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  toolbarAlignment: boolean;
  storeTextPath: boolean;
  decimals: {
    on: boolean;
    valueShown: boolean;
    boxRef: Ref<InputBox | null>;
    onToggle: (input: HTMLInputElement) => void;
    onBoxChange: (box: InputBox) => void;
  };
  disableUnsupportedWarning: boolean;
  epsOutlineFonts: boolean;
  notificationsDisabled: boolean;
  scrubbingSetting: string;
  scrubbingOff: boolean;
  /** Electron only; null elsewhere. */
  backupCopy: boolean | null;
}

/** Every row in the old order. */
export function SettingsRows({ model }: { model: SettingsRowsModel }): ReactNode {
  const s = (key: string): string => model.texts[key] as string;
  return (
    <>
      <Setting
        label={s("setting.highlight-on-hover")}
        description={s("setting.highlight-on-hover-description")}
      >
        <Switch setting="highlight_on_hover" checked={model.highlightOnHover} />
      </Setting>
      <Setting
        label={s("setting.auto-expand-layers")}
        description={s("setting.auto-expand-layers-description")}
      >
        <Switch setting="auto_expand_layers" checked={model.autoExpandLayers} />
      </Setting>
      {model.autoSave ? (
        <>
          <Setting label={s("setting.auto-save")} description={s("setting.auto-save-description")}>
            <AutoSaveEditor
              checked={model.autoSave.checked}
              intervals={model.autoSave.intervals}
              selected={model.autoSave.selected}
            />
          </Setting>
          <Setting
            label={s("setting.auto-save-warning")}
            description={s("setting.auto-save-warning-description")}
          >
            <Switch
              setting={model.autoSave.warningSetting}
              checked={model.autoSave.warningChecked}
            />
          </Setting>
        </>
      ) : null}
      {model.developer ? (
        <>
          <Setting label={s("setting.enable_steps_debug")} description={null}>
            <Switch setting="enable_steps_debug" checked={model.developer.stepsDebug} />
          </Setting>
          {/* Not in the string tables in the old app either. */}
          <Setting label="Enable cached rendering" description={null}>
            <Switch setting="enable_cache" checked={model.developer.cache} />
          </Setting>
        </>
      ) : null}
      <Setting
        label={s("setting.change-theme")}
        description={null}
        after={
          // Old: the toolbar row was appended to the theme row's element.
          <Setting
            label={null}
            description={s("setting.ui-toolbar-alignment")}
            className="sub-setting"
          >
            <Switch setting="ui_toolbar_alignment" checked={model.toolbarAlignment} />
          </Setting>
        }
      >
        <ThemeSelector name={model.themeName} onClick={model.onThemeClick} />
      </Setting>
      <Setting
        label={s("setting.store-textpath")}
        description={s("setting.store-textpath-description")}
      >
        <Switch setting="dont_store_textpath" checked={model.storeTextPath} />
      </Setting>
      <Setting
        label={s("setting.decimals-num")}
        description={s("setting.decimals-num-description")}
      >
        <DecimalsEditor {...model.decimals} />
      </Setting>
      <Setting
        label={s("setting.disable-warning-unsupported-features")}
        description={s("setting.disable-warning-unsupported-features-description")}
      >
        <Switch
          setting="disable_warning_unsupported_features"
          checked={model.disableUnsupportedWarning}
        />
      </Setting>
      <Setting
        label={s("setting.eps-outline-fonts")}
        description={s("setting.eps-outline-fonts-description")}
      >
        <Switch setting="eps_outline_fonts" checked={model.epsOutlineFonts} />
      </Setting>
      <Setting
        label={s("setting.disable-notifications")}
        description={s("setting.disable-notifications-description")}
      >
        <Switch
          setting="notifications_disabled"
          checked={model.notificationsDisabled}
          className="test"
        />
      </Setting>
      <Setting label={s("setting.disable-scrubbing")} description={null}>
        <Switch setting={model.scrubbingSetting} checked={model.scrubbingOff} />
      </Setting>
      {model.backupCopy !== null ? (
        <Setting
          label={s("setting.create-backup-copy-of-file")}
          description={s("setting.create-backup-copy-of-file-description")}
        >
          <Switch setting="create_backup_copy" checked={model.backupCopy} />
        </Setting>
      ) : null}
    </>
  );
}

/** The GSettingsDialog string keys the rows use. */
export const SETTINGS_TEXT_KEYS = [
  "setting.highlight-on-hover",
  "setting.highlight-on-hover-description",
  "setting.auto-expand-layers",
  "setting.auto-expand-layers-description",
  "setting.auto-save",
  "setting.auto-save-description",
  "setting.auto-save-warning",
  "setting.auto-save-warning-description",
  "setting.enable_steps_debug",
  "setting.change-theme",
  "setting.ui-toolbar-alignment",
  "setting.store-textpath",
  "setting.store-textpath-description",
  "setting.decimals-num",
  "setting.decimals-num-description",
  "setting.disable-warning-unsupported-features",
  "setting.disable-warning-unsupported-features-description",
  "setting.eps-outline-fonts",
  "setting.eps-outline-fonts-description",
  "setting.disable-notifications",
  "setting.disable-notifications-description",
  "setting.disable-scrubbing",
  "setting.create-backup-copy-of-file",
  "setting.create-backup-copy-of-file-description",
] as const;
