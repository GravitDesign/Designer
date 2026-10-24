import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { checkboxSliderClass, CheckboxSliderView } from "./checkbox-slider-view.tsx";
import { InputBoxView } from "./input-box-view.tsx";
import { inputLabelPadding } from "./input-label.ts";
import { InputSelectView } from "./input-select-view.tsx";
import { inputSelectItems } from "./input-select.ts";
import { pivotSides } from "./pivot.ts";
import { RichTooltipConfig } from "./rich-tooltip-config.ts";
import { RichTooltipContent, wrapperClass } from "./rich-tooltip-view.tsx";
import { tooltipOffsets, tooltipSettings } from "./rich-tooltip.ts";
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
  });

  it("lists the units with long and short names", () => {
    const options = unitOptions();
    expect(options.map((o) => o.unit)).toEqual(["px", "mm", "cm", "in", "pc", "pt"]);
    expect(options[0]?.short).toBe("px");
    expect(renderToStaticMarkup(<UnitSelectView short />)).toContain(
      '<option value="mm">mm</option>',
    );
  });

  it("pads labelled inputs by the label length with autoPadding", () => {
    expect(inputLabelPadding({ label: "W" })).toBe("20px");
    expect(inputLabelPadding({ label: "Width", autoPadding: true })).toBe("26px");
  });
});
