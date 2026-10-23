# engine/text/gtl

The GTL ("Gravit text layout") engine behind GText: rich text runs, word
splitting, line breaking, lists, caret and selection geometry, and drawing
glyph outlines through the text transformers. TLCore (tl-core.ts) is the
entry point; the canvas context and the path and direction transformers
live one folder up (tl-canvas-context.ts, tl-path-text-transformer.ts,
tl-direction-text-transformer.ts) because the core requires them directly.

## Origin and license

GTL is Gravit's fork of carota, the canvas rich text editor by Daniel
Earwicker (https://github.com/danielearwicker/carota), released under the
MIT license:

> Copyright (c) 2014 Daniel Earwicker
>
> Permission is hereby granted, free of charge, to any person obtaining a
> copy of this software and associated documentation files (the
> "Software"), to deal in the Software without restriction, including
> without limitation the rights to use, copy, modify, merge, publish,
> distribute, sublicense, and/or sell copies of the Software, and to permit
> persons to whom the Software is furnished to do so, subject to the
> following conditions:
>
> The above copyright notice and this permission notice shall be included
> in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
> OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
> MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
> NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
> DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
> OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
> USE OR OTHER DEALINGS IN THE SOFTWARE.

The port follows the fork as it is in the old bundle, with every Gravit
change: OpenType measuring and glyph outlines instead of canvas text,
letter and word spacing, paragraph spacing and indent, super- and
subscript, text transformations, CJK and punctuation line breaking, lists
with markers, and the transformers.

## Files and carota names

| File                                                                   | Old module    | carota                     |
| ---------------------------------------------------------------------- | ------------- | -------------------------- |
| formatting.ts                                                          | 148           | runs.js                    |
| tl-util.ts                                                             | 161 (GTLUtil) | util.js, part of dom.js    |
| run-draw.ts                                                            | 195           | text.js                    |
| rect.ts                                                                | 230           | rect.js                    |
| node.ts                                                                | 267           | node.js                    |
| tl-core.ts                                                             | 367           | editor.js (no DOM)         |
| tl-code.ts, render-flags.ts                                            | 368, 369      |                            |
| measure.ts, default-font-measure.ts, measurement.ts                    | 416, 928, 508 | text.js measure            |
| list-util.ts                                                           | 509           | per.js                     |
| inline.ts                                                              | 510           | part.js                    |
| transformer-util.ts                                                    | 650           |                            |
| document.ts                                                            | 652           | doc.js                     |
| frame.ts, line.ts, line-buffer.ts                                      | 653, 654, 918 | frame.js, line.js, wrap.js |
| range.ts                                                               | 916           | range.js                   |
| word.ts, positioned-word.ts                                            | 917, 919      | word.js, positionedword.js |
| tl-codes.ts, code-node.ts                                              | 920, 921      | codes.js                   |
| string-part.ts, path-number.ts, vertex-source-part.ts, list-markers.ts | 922-925       |                            |
| runs.ts                                                                | 926           | characters.js              |
| characters.ts                                                          | 927           | split.js                   |

## Things to know

- Runs are plain objects derived from each other with Object.create, and
  some properties are made read-only with value descriptors. The old
  modules ran in sloppy mode, where writes to those properties fail
  silently; the port writes run properties with Reflect.set where that can
  happen, so it behaves the same in strict mode.
- The measure cache in run-draw.ts and the text meter are global, as
  before: the first TLCore.initialize installs the OpenType meter with its
  font manager, and the first one also fills the default formatting from
  the text style defaults (late-bound.ts: engine-style registers GStylable).
- Each layout feeds the letter spacing at the end of its widest line into
  the next layout as spacing padding (TLDocument.\_lastSpacingPadding).
- tl-core.test.ts runs gtl-probe.ts against the port and compares it with
  the same probe recorded in the old app (\_\_fixtures\_\_/old-gtl.json).
