import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MessageDialogButton, MessageDialogView } from "./message-dialog-view.tsx";
import {
  CustomView,
  DialogV1View,
  DontShowAgainLabel,
  MessageView,
  PromptView,
  SpanButton,
  TextButton,
} from "./system-dialog-view.tsx";

const noop = () => undefined;

describe("system dialog content (UI-DIALOG-003, UI-DIALOG-004, UI-DIALOG-005)", () => {
  it("puts the message in as markup", () => {
    expect(renderToStaticMarkup(<MessageView html="a<br>b" />)).toBe(
      '<div class="message">a<br>b</div>',
    );
  });

  it("gives buttons only the classes they need", () => {
    expect(renderToStaticMarkup(<TextButton text="OK" primary onClick={noop} />)).toBe(
      '<button class="primary">OK</button>',
    );
    expect(renderToStaticMarkup(<TextButton text="Cancel" onClick={noop} />)).toBe(
      "<button>Cancel</button>",
    );
    expect(renderToStaticMarkup(<TextButton text="OK" primary disabled onClick={noop} />)).toBe(
      '<button class="primary g-disabled">OK</button>',
    );
    expect(
      renderToStaticMarkup(
        <SpanButton label="Don't save" className="" float="left" onClick={noop} />,
      ),
    ).toBe('<button style="float:left"><span>Don&#x27;t save</span></button>');
  });

  it("builds the prompt's field with the value", () => {
    const html = renderToStaticMarkup(
      <PromptView html="Name:" value="Symbol 1" input={null} onKeyPress={noop} />,
    );
    expect(html).toBe(
      '<div class="message">Name:</div><div class="input"><input class="max-width" type="text" value="Symbol 1"/></div>',
    );
  });

  it("renders the don't-show-again label", () => {
    expect(renderToStaticMarkup(<DontShowAgainLabel text="Don't show" onChange={noop} />)).toBe(
      '<label><input type="checkbox"/><span>Don&#x27;t show</span></label>',
    );
  });

  it("builds custom() content in the old order", () => {
    const html = renderToStaticMarkup(
      <CustomView
        closeable
        onClose={noop}
        icon="info"
        title="T"
        subtitle="S"
        buttons={[
          <SpanButton key={0} label="Go" className="g-pro-button highlighted" onClick={noop} />,
        ]}
      />,
    );
    expect(html).toBe(
      '<div class="g-btn-close"><span class="gravit-icon-close"></span></div>' +
        '<div class="icon"><div class="info"></div></div>' +
        '<div class="content"><span class="title">T</span><span class="subtitle">S</span>' +
        '<div class="buttons"><button class="g-pro-button highlighted"><span>Go</span></button></div></div>',
    );
  });

  it("leaves out the buttons box of custom() without buttons", () => {
    const html = renderToStaticMarkup(
      <CustomView closeable={false} onClose={noop} title="" subtitle="x" buttons={null} />,
    );
    expect(html).toBe(
      '<div class="content"><span class="title"></span><span class="subtitle">x</span></div>',
    );
  });

  it("builds the v1 dialog with options and the setting box", () => {
    const html = renderToStaticMarkup(
      <DialogV1View
        title="T"
        label="L"
        message="M"
        icon="assets/icon/dialog/info.svg"
        closeable={false}
        onClose={noop}
        options={{ values: ["a", "b"], tooltips: ["", "tip"], checked: true, onChange: noop }}
        setting="s"
        dontShowAgainText="D"
        buttons={[<button key={0}>OK</button>]}
      />,
    );
    expect(html).toContain('<header><span class="title">T</span></header>');
    expect(html).toContain('<pre class="message">M</pre>');
    expect(html).toContain(
      '<label><input type="radio" name="options" checked="" value="1"/><span>b</span><span class="tooltip" data-title="tip">?</span></label>',
    );
    expect(html).toContain(
      '<footer><label><input type="checkbox" data-property="s"/><span>D</span></label>',
    );
  });
});

describe("message dialog content (UI-DIALOG-011)", () => {
  it("puts the text in a span of a 1.5em message", () => {
    expect(renderToStaticMarkup(<MessageDialogView html="Too big.<br>" />)).toBe(
      '<div class="message" style="line-height:1.5em"><span>Too big.<br></span></div>',
    );
    expect(renderToStaticMarkup(<MessageDialogButton html="OK" onClick={noop} />)).toBe(
      "<button>OK</button>",
    );
  });
});
