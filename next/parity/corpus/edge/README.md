# Edge-case files

Files the corpus scenarios open to record what the old app does with
unusual input (`parity/scenarios/corpus/edge.spec.ts`). Each is made by
`build-edge.ts` from a committed corpus file, so the content is real
old-app output and only the edge case is hand-made. Rebuilding gives the
same bytes.

```sh
cd next && node parity/corpus/edge/build-edge.ts
```

| File                   | Made from         | Edge case                                                                                                    |
| ---------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| uncompressed.gvdesign  | shapes-ellipses   | plain UTF-8 JSON instead of gzip; the app falls back to reading it as text                                   |
| no-preview.gvdesign    | fills-colors      | gzip without the `_preview` key; saving it again adds one                                                    |
| invalid-json.gvdesign  | shapes-polygons   | gzip of JSON cut off in the middle; the document stays in its loading state                                  |
| unknown-type.gvdesign  | shapes-rectangles | a page child with an unknown `@` type (with a child), which is dropped                                       |
| legacy-pre310.gvdesign | text-layout       | no root `dictionary` (a file from before 3.10), so text heights are recomputed the legacy way, plus `"v": 9` |
| linked-file.gvdesign   | images            | one dictionary image is a `file://` link that does not exist                                                 |
| tiny.gvdesign          | (hand-made)       | a scene with one page and nothing else, not even an annotation list                                          |
