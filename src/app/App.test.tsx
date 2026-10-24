import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { App } from "./App.tsx";

describe("App", () => {
  it("renders the frame parts in the old order, without styles", () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toBe(
      '<div class="frame">' +
        [
          "windows",
          "info",
          "header",
          "toolbar",
          "banner",
          "overlay",
          "panels",
          "footer",
          "left-sidebars",
          "right-sidebars",
        ]
          .map((id) => `<div id="${id}"></div>`)
          .join("") +
        "</div>",
    );
  });
});
