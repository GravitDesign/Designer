import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccordionButton, accordionHeaderClass } from "./accordion-view.tsx";
import { checkboxSliderClass, CheckboxSliderView } from "./checkbox-slider-view.tsx";
import { debounce } from "./debounce.ts";
import { elasticHeight, twinMarkup } from "./elastic.ts";
import { InputBoxView } from "./input-box-view.tsx";
import { InputLabel, inputLabelStyle } from "./input-label-view.tsx";
import { inputLabelPadding } from "./input-label.ts";
import { InputSelectView } from "./input-select-view.tsx";
import { inputSelectItems } from "./input-select.ts";
import { PivotView } from "./pivot-view.tsx";
import { pivotSides } from "./pivot.ts";
import { PropertyRowView } from "./property-row-view.tsx";
import { isFormControlContent, markFormControl } from "./property-row.ts";
import { RichTooltipConfig } from "./rich-tooltip-config.ts";
import { RichTooltipContent, wrapperClass } from "./rich-tooltip-view.tsx";
import { tooltipOffsets, tooltipSettings } from "./rich-tooltip.ts";
import { UnitBoxView } from "./unit-box-view.tsx";
import { UnitSelectView } from "./unit-select-view.tsx";
import { unitOptions } from "./unit-select.ts";

const noop = () => undefined;

describe("rich tooltip config (UI-TOOLTIP-001)", () => {
  it("needs a title", () => {
    expect(() => RichTooltipConfig.from({ title: "" })).toThrow();
    expect(() => new RichTooltipConfig({ title: "x" }).setConfig({ title: "" })).toThrow();
    expect(() => new RichTooltipConfig({ title: "x" }).setConfig({})).not.toThrow();
  });

  it("leaves unset fields undefined so the tooltip defaults apply", () => {
    const settings = tooltipSettings(RichTooltipConfig.from({ title: "Undo", shortcut: ["Z"] }));
    expect(settings.middle).toBe(true);
    expect(settings.videoTimeout).toBe(2000);
    expect(settings.isPro).toBe(false);
    expect(settings.shortcut).toEqual(["Z"]);
  });

  it("keeps an explicit null over a default", () => {
    const settings = tooltipSettings(RichTooltipConfig.from({ title: "x", middle: null }));
    expect(settings.middle).toBeNull();
  });

  it("changes only the given fields", () => {
    const config = RichTooltipConfig.from({ title: "a", description: "d" });
    config.setConfig({ title: "b" });
    expect(config.getConfig().title).toBe("b");
    expect(config.getConfig().description).toBe("d");
  });
});

describe("rich tooltip (UI-TOOLTIP-002)", () => {
  it("offsets centred tooltips and side tooltips as before", () => {
    expect(
      tooltipOffsets({ side: false, middle: true, marginLeft: 0, flipHorizontal: false }),
    ).toEqual({
      offsetX: -13,
      offsetY: 4,
    });
    expect(
      tooltipOffsets({ side: true, middle: true, marginLeft: 5, flipHorizontal: false }),
    ).toEqual({
      offsetX: 5,
      offsetY: -6,
    });
    expect(
      tooltipOffsets({ side: false, middle: true, marginLeft: 3, flipHorizontal: true }),
    ).toEqual({
      offsetX: 10,
      offsetY: 4,
    });
  });

  it("shows title and description when enhanced", () => {
    const html = renderToStaticMarkup(
      <RichTooltipContent
        title="Anchor to the Left"
        isPro={false}
        shortcut={null}
        video={null}
        pic={null}
        description="Anchor selected element to the left."
        videoTimeout={2000}
        enhanced
        learnMore={null}
      />,
    );
    expect(html).toBe(
      '<div class="g-tooltip-content-wrapper"><div class="g-tooltip-content-header">' +
        '<div class="g-tooltip-content-title">Anchor to the Left</div></div>' +
        '<div class="g-tooltip-content-description">Anchor selected element to the left. </div></div>',
    );
  });

  it("shows only the title, marked simple, when not enhanced", () => {
    const html = renderToStaticMarkup(
      <RichTooltipContent
        title="T"
        isPro={false}
        shortcut={null}
        video="v.mp4"
        pic={null}
        description="D"
        videoTimeout={2000}
        enhanced={false}
        learnMore={null}
      />,
    );
    expect(html).toBe(
      '<div class="g-tooltip-content-wrapper"><div class="g-tooltip-content-header simple">' +
        '<div class="g-tooltip-content-title">T</div></div></div>',
    );
  });

  it("toggles the pro class on for a non-boolean isPro, as jQuery did", () => {
    expect(wrapperClass(null)).toBe("g-tooltip-content-wrapper g-pro");
    expect(wrapperClass(false)).toBe("g-tooltip-content-wrapper");
  });
});

describe("form widgets markup (UI-FIELD-159 .. UI-FIELD-168)", () => {
  it("renders the input box as a text input", () => {
    expect(renderToStaticMarkup(<InputBoxView className="x" data-property="w" />)).toBe(
      '<input type="text" class="x" data-property="w"/>',
    );
  });

  it("puts g-unitbox after the caller's classes", () => {
    expect(renderToStaticMarkup(<UnitBoxView className="a" />)).toBe(
      '<input type="text" class="a g-unitbox"/>',
    );
  });

  it("hides the select button without a list", () => {
    expect(renderToStaticMarkup(<InputSelectView className="dpi" />)).toBe(
      '<div class="dpi g-input-select"><input type="text"/><button style="display:none"></button></div>',
    );
    expect(renderToStaticMarkup(<InputSelectView options={{ list: [72] }} />)).toBe(
      '<div class="g-input-select"><input type="text"/><button></button></div>',
    );
    expect(inputSelectItems(["Auto", 1, { title: "t", data: 2 }])).toEqual([
      { title: "Auto", data: "Auto" },
      { title: 1, data: 1 },
      { title: "t", data: 2 },
    ]);
  });

  it("gives the checkbox slider its classes in order", () => {
    expect(checkboxSliderClass("closed-checkbox", true, true)).toBe(
      "closed-checkbox g-checkbox-slider checked",
    );
    expect(checkboxSliderClass(undefined, false, true)).toBe("checked");
    expect(checkboxSliderClass(undefined, false, false)).toBeUndefined();
    expect(renderToStaticMarkup(<CheckboxSliderView checked onChange={noop} />)).toBe(
      '<input type="checkbox" class="g-checkbox-slider checked" checked=""/>',
    );
    expect(
      renderToStaticMarkup(<CheckboxSliderView checked slider={false} onChange={noop} />),
    ).toBe('<input type="checkbox" checked=""/>');
  });

  it("lays out the pivot sides in GRect.Side order", () => {
    expect(pivotSides()).toEqual(["tl", "tc", "tr", "rc", "br", "bc", "bl", "lc", "cc"]);
    const html = renderToStaticMarkup(<PivotView value="cc" />);
    expect(html.startsWith('<div class="g-pivot"><div class="borderline"></div>')).toBe(true);
    expect(html).toContain('<div class="side g-active" data-side="cc"></div>');
    expect(html).toContain('<div class="side" data-side="tl"></div>');
  });

  it("lists the units with long and short names", () => {
    const options = unitOptions();
    expect(options.map((o) => o.unit)).toEqual(["px", "mm", "cm", "in", "pc", "pt"]);
    expect(options[0]?.short).toBe("px");
    expect(renderToStaticMarkup(<UnitSelectView short />)).toContain(
      '<option value="mm">mm</option>',
    );
  });

  it("renders the accordion button and the header class", () => {
    expect(renderToStaticMarkup(<AccordionButton collapsed onToggle={noop} />)).toBe(
      '<button class="g-accordion"><span class="gravit-icon-right"></span></button><div class="g-accordion-ghost"></div>',
    );
    expect(accordionHeaderClass(false)).toBe("expanded");
  });

  it("pads labelled inputs by the label length with autoPadding", () => {
    expect(inputLabelPadding({ label: "W" })).toBe("20px");
    expect(inputLabelPadding({ label: "Width", autoPadding: true })).toBe("26px");
    expect(inputLabelStyle({ label: "W" })).toEqual({ paddingLeft: "20px", width: "100%" });
    expect(renderToStaticMarkup(<InputLabel class="gravit-icon-x" />)).toBe(
      '<span class="g-input-label gravit-icon-x"></span>',
    );
  });
});

describe("property row (UI-FIELD-163)", () => {
  it("builds label, columns and captions with the old classes", () => {
    const html = renderToStaticMarkup(
      <PropertyRowView
        label="Size"
        clazz="size"
        columns={[
          { content: <input type="text" />, width: "auto", label: "W" },
          { content: <span>x</span>, prefix: "H" },
          {},
        ]}
      />,
    );
    expect(html).toBe(
      '<div class="g-property-row size"><label class="property-label"><span class="vertical-align">Size</span></label>' +
        '<div class="columns">' +
        '<label class="column auto-grow"><div class="content"><input type="text"/></div></label>' +
        '<div class="column"><div class="prefix">H&nbsp;</div><div class="content"><span>x</span></div></div>' +
        '<div class="column no-padding"> </div></div>' +
        '<div class="labels"><label class="auto-grow"><span>W</span></label><label> </label><label class="no-padding"> </label></div></div>',
    );
  });

  it("marks rows without label and with an icon", () => {
    expect(renderToStaticMarkup(<PropertyRowView columns={[]} />)).toBe(
      '<div class="g-property-row no-label"><div class="columns"></div></div>',
    );
    expect(renderToStaticMarkup(<PropertyRowView icon="gravit-icon-w" columns={[]} />)).toBe(
      '<div class="g-property-row icon-label"><label class="property-label strict-line-height"><span class="gravit-icon-w"></span></label><div class="columns"></div></div>',
    );
  });

  it("treats marked components as form controls", () => {
    function Field(): null {
      return null;
    }
    expect(isFormControlContent({ content: <Field /> })).toBe(false);
    markFormControl(Field);
    expect(isFormControlContent({ content: <Field /> })).toBe(true);
    expect(isFormControlContent({ content: <select /> })).toBe(true);
    expect(isFormControlContent({ content: <div />, input: true })).toBe(true);
  });
});

describe("elastic textarea (UI-FIELD-170)", () => {
  it("escapes the text for the twin", () => {
    expect(twinMarkup("a  b\n<c>&")).toBe("a&nbsp;b<br />&gt;c&gt;&amp;");
  });

  it("grows by one line, within the start and max heights", () => {
    expect(elasticHeight(40, 14, 54, 42, 200)).toBeNull();
    expect(elasticHeight(60, 14, 42, 42, 200)).toEqual({ height: 74, overflow: "hidden" });
    expect(elasticHeight(10, 14, 60, 42, 200)).toEqual({ height: 42, overflow: "hidden" });
    expect(elasticHeight(300, 14, 42, 42, 200)).toEqual({ height: 200, overflow: "auto" });
  });
});

describe("debounce (UI-FIELD-174)", () => {
  it("runs once with the last arguments after the wait", async () => {
    const calls: number[] = [];
    const run = debounce((n: number) => calls.push(n), 5);
    run(1);
    run(2);
    run(3);
    expect(calls).toEqual([]);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(calls).toEqual([3]);
  });
});
