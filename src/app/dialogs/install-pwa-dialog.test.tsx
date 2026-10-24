import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InstallPwaDialogView, type InstallPwaTexts } from "./install-pwa-dialog-view.tsx";

const noop = () => undefined;

const texts: InstallPwaTexts = {
  title: "Title",
  description: "Runs offline",
  dot: ".",
  install: "Install",
  notNow: "Not now",
  requires: "Needs <b>Chromium</b>",
  footerMain: "Main",
  footerLink: "Link",
  moreInformation: "More",
};

function render(supported: boolean): string {
  return renderToStaticMarkup(
    <InstallPwaDialogView
      texts={texts}
      supported={supported}
      onClose={noop}
      onInstall={noop}
      onNotNow={noop}
    />,
  );
}

describe("install PWA dialog view (UI-DIALOG-020)", () => {
  it("shows the description without the subscription link, then the buttons", () => {
    const html = render(true);
    expect(html).toContain(
      '<div class="title">Title</div><div class="description"><span>Runs offline</span>' +
        "<span>.</span></div>" +
        '<div class="buttons"><button class="primary g-button">Install</button>' +
        '<button class="g-button">Not now</button></div>',
    );
    expect(html).not.toContain("chromium-section");
  });

  it("shows the requirement note as HTML instead of the buttons where unsupported", () => {
    const html = render(false);
    expect(html).toContain(
      '<div class="chromium-section"><div class="chromium-content">Needs <b>Chromium</b></div></div>',
    );
    expect(html).not.toContain('class="buttons"');
    expect(html).toContain(
      '<div class="footer"><span>Main</span><span>Link</span><span>.</span><span> </span>' +
        '<a href="" target="_blank">More</a></div>',
    );
  });
});
