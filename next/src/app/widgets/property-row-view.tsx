/**
 * `<PropertyRowView {...options}>`: the inspector row of property-row.ts,
 * with the old element tree:
 *
 *     div.g-property-row
 *       label.property-label > span.vertical-align (or the icon)
 *       div.columns > (div|label).column > [div.prefix] div.content
 *       div.labels > label (only when a column has a caption)
 */
import type { MouseEvent, ReactNode } from "react";
import {
  columnClasses,
  columnsClasses,
  columnStyle,
  hasLabel,
  isFormControlContent,
  rowClasses,
  type PropertyRowColumn,
  type PropertyRowOptions,
} from "./property-row.ts";

const NBSP = " ";

/** The click arrow the old code appended to every span of a clickable label. */
function ClickArrow(): ReactNode {
  return <span className="gravit-icon-down click-arrow" />;
}

function RowLabel({ options }: { options: PropertyRowOptions }): ReactNode {
  const hasIcon = Object.prototype.hasOwnProperty.call(options, "icon");
  const classes = ["property-label"];
  if (hasIcon) classes.push("strict-line-height");
  const click = options.click;
  if (click) classes.push("clickable");
  const onClick = click ? (event: MouseEvent<HTMLSpanElement>) => click(event) : undefined;
  let body: ReactNode;
  if (hasIcon) {
    body =
      "string" == typeof options.icon ? (
        <span className={options.icon} onClick={onClick}>
          {click ? <ClickArrow /> : null}
        </span>
      ) : (
        options.icon
      );
  } else {
    body = (
      <span className="vertical-align" onClick={onClick}>
        {options.label}
        {click ? <ClickArrow /> : null}
      </span>
    );
  }
  return <label className={classes.join(" ")}>{body}</label>;
}

function Column({
  column,
  isMenu,
  rawClick,
}: {
  column: PropertyRowColumn;
  isMenu?: boolean;
  rawClick?: PropertyRowOptions["rawClick"];
}): ReactNode {
  const Tag = column.content && isFormControlContent(column) ? "label" : "div";
  let prefix: ReactNode = null;
  if (column.prefix) {
    let html: string;
    let width: string | number | null = null;
    if ("string" == typeof column.prefix) html = column.prefix + "&nbsp;";
    else {
      html = column.prefix.label;
      width = column.prefix.width || null;
    }
    prefix = (
      <div
        className="prefix"
        style={width !== null ? { width } : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  if (!column.content && column.html) {
    // Old: $(t.html).appendTo(column), after the prefix. The markup comes
    // from the panels' own code; it is put in as it is.
    let markup = "";
    if (column.prefix) {
      const label =
        "string" == typeof column.prefix ? column.prefix + "&nbsp;" : column.prefix.label;
      const width = "string" == typeof column.prefix ? null : column.prefix.width || null;
      const style =
        width !== null ? ` style="width: ${"number" == typeof width ? width + "px" : width};"` : "";
      markup = `<div class="prefix"${style}>${label}</div>`;
    }
    return (
      <Tag
        className={columnClasses(column, false)}
        style={columnStyle(column)}
        onClick={rawClick ? (event: MouseEvent<HTMLElement>) => rawClick(event) : undefined}
        dangerouslySetInnerHTML={{ __html: markup + column.html }}
      />
    );
  }
  const body: ReactNode = column.content ? <div className="content">{column.content}</div> : NBSP;
  const menuArrow = isMenu ? (
    <div
      className="gravit-icon-right"
      onClick={(event) => {
        const columnElement = (event.currentTarget as HTMLElement).parentElement;
        const control = columnElement ? columnElement.querySelector(".content > *") : null;
        if (control instanceof HTMLElement) control.click();
      }}
    />
  ) : null;
  return (
    <Tag
      className={columnClasses(column, false)}
      style={columnStyle(column)}
      onClick={rawClick ? (event: MouseEvent<HTMLElement>) => rawClick(event) : undefined}
    >
      {prefix}
      {body}
      {menuArrow}
    </Tag>
  );
}

function Caption({ column }: { column: PropertyRowColumn }): ReactNode {
  let body: ReactNode;
  if (column.label) {
    body =
      "string" == typeof column.label ? (
        <span className={column.labelClass ? column.labelClass : undefined}>{column.label}</span>
      ) : (
        column.label
      );
  } else body = NBSP;
  const classes = columnClasses(column, true);
  return (
    <label className={classes || undefined} style={columnStyle(column)}>
      {body}
    </label>
  );
}

export function PropertyRowView(options: PropertyRowOptions): ReactNode {
  const captions = options.columns.some((column) => !!column.label);
  const height = Object.prototype.hasOwnProperty.call(options, "height")
    ? options.height
    : undefined;
  return (
    <div className={rowClasses(options)}>
      {hasLabel(options) ? <RowLabel options={options} /> : null}
      <div
        className={columnsClasses(options)}
        style={height !== undefined ? { height } : undefined}
      >
        {options.columns.map((column, index) => (
          <Column key={index} column={column} isMenu={options.isMenu} rawClick={options.rawClick} />
        ))}
      </div>
      {captions ? (
        <div className="labels">
          {options.columns.map((column, index) => (
            <Caption key={index} column={column} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
