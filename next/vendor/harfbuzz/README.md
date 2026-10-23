# HarfBuzz 2.2.0 for the text engine

`harfbuzz-2.2.0.wasm` is HarfBuzz 2.2.0, the version the old bundle embedded
as Emscripten asm.js (chunk.vendor.js module 998, 6.4 MB). The text engine
loads it in `src/engine/text/harfbuzz/harfbuzz-module.ts`; the wrapper the old
code called it through is `src/engine/text/fonts/harfbuzz.ts`.

Rebuild it with `vendor/harfbuzz/build.sh [work dir]` (bash; Git Bash works on
Windows). The script downloads emsdk and the HarfBuzz tarball into the work
dir, checks the tarball's SHA-256, compiles and writes the .wasm here.

## Versions

- HarfBuzz 2.2.0, `harfbuzz-2.2.0.tar.bz2` from freedesktop.org, SHA-256
  `b7ccfcbd56b970a709e8b9ea9fb46c922c606c2feef8f086fb6a8492e530f810`
- Emscripten 3.1.74 (emsdk `install 3.1.74`)
- Output SHA-256
  `0371d9b63d43a5b7b20ba6fad692027056799ca910a884a1bfcb3b89d7dd4561`

## Build

Sources: the files of `HB_BASE_sources`, `HB_FALLBACK_sources` and
`HB_OT_sources` from `src/Makefile.sources`, plus `hb-ucdn.cc` and
`hb-ucdn/ucdn.c` (the bundled Unicode tables; script detection needs them).
No glib, ICU, FreeType or threads, as in a plain `./configure` without those.

```sh
# C++ (every .cc file)
emcc -O2 -std=c++11 -fno-exceptions -fno-rtti -fno-threadsafe-statics \
  -DHAVE_OT -DHAVE_FALLBACK -DHAVE_UCDN -DHB_NO_MT -Isrc -Isrc/hb-ucdn -c ...
# C (ucdn.c)
emcc -O2 -std=c99 -DHAVE_OT -DHAVE_FALLBACK -DHAVE_UCDN -DHB_NO_MT -Isrc -Isrc/hb-ucdn -c ...
# link
emcc -O2 *.o -o harfbuzz-2.2.0.wasm --no-entry -sSTANDALONE_WASM -sFILESYSTEM=0 \
  -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=16777216 -sSTACK_SIZE=1048576 \
  -sEXPORTED_FUNCTIONS=[...]
```

There is no C glue and no Emscripten JavaScript: the module is standalone and
exports exactly the functions the old wrapper called (`malloc`, `free`,
`hb_blob_create`, `hb_face_create`, `hb_font_create`, `hb_font_set_scale`,
`hb_font_set_variations`, `hb_shape`, the `hb_buffer_*` functions it used,
`hb_language_*`, `hb_direction_*`, `hb_script_get_horizontal_direction`,
`hb_ot_tag_to_language`). Its imports are libc hooks (environment, fd
writes) that the loader answers with stubs.

## Why not harfbuzzjs

The rewrite plan said to try the `harfbuzzjs` npm package first. Version
1.6.4 (HarfBuzz 15.0.0) was measured against the old module in Node, shaping
13,030 cases the same way GOpenTypeFont does: every text of the parity text
scenarios and of the corpus documents, each word and character of them, and
extra Arabic, Hebrew, CJK, Devanagari and Thai strings, in the fonts the
documents use, at sizes 1, 12, 20, 24, 32, 60 and 72, plus script, language
and stylistic set options. 46 cases differed, all in glyph advances: newer
HarfBuzz scales advances differently, so for example the last glyph of
"مرحبا بالعالم" in Noto Sans Arabic at 20 gets 10 instead of 11. Several of
them are texts the corpus documents contain. harfbuzzjs also doesn't export
`hb_buffer_get_script`, `hb_buffer_get_direction`, `hb_buffer_get_language`,
`hb_buffer_reverse`, `hb_direction_to_string`/`from_string` or
`hb_script_get_horizontal_direction`, which the wrapper needs for script and
direction detection.

This build gave the same glyph ids, clusters, advances and offsets as the old
module for all 13,030 cases, and the same guessed script, direction, language
and horizontal direction for every Unicode code point (U+0000 to U+10FFFF
without surrogates), the same `hb_ot_tag_to_language` result for 70,304
OpenType language tags, and the same direction and language string
round trips.

## Licenses

HarfBuzz (`COPYING` in the source tarball):

```text
HarfBuzz is licensed under the so-called "Old MIT" license.  Details follow.
For parts of HarfBuzz that are licensed under different licenses see individual
files names COPYING in subdirectories where applicable.

Copyright © 2010,2011,2012  Google, Inc.
Copyright © 2012  Mozilla Foundation
Copyright © 2011  Codethink Limited
Copyright © 2008,2010  Nokia Corporation and/or its subsidiary(-ies)
Copyright © 2009  Keith Stribley
Copyright © 2009  Martin Hosken and SIL International
Copyright © 2007  Chris Wilson
Copyright © 2006  Behdad Esfahbod
Copyright © 2005  David Turner
Copyright © 2004,2007,2008,2009,2010  Red Hat, Inc.
Copyright © 1998-2004  David Turner and Werner Lemberg

For full copyright notices consult the individual files in the package.


Permission is hereby granted, without written agreement and without
license or royalty fees, to use, copy, modify, and distribute this
software and its documentation for any purpose, provided that the
above copyright notice and the following two paragraphs appear in
all copies of this software.

IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE TO ANY PARTY FOR
DIRECT, INDIRECT, SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES
ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN
IF THE COPYRIGHT HOLDER HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH
DAMAGE.

THE COPYRIGHT HOLDER SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING,
BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE.  THE SOFTWARE PROVIDED HEREUNDER IS
ON AN "AS IS" BASIS, AND THE COPYRIGHT HOLDER HAS NO OBLIGATION TO
PROVIDE MAINTENANCE, SUPPORT, UPDATES, ENHANCEMENTS, OR MODIFICATIONS.
```

UCDN (`src/hb-ucdn/COPYING`):

```text
Copyright (C) 2012 Grigori Goronzy <greg@kinoho.net>

The contents of this directory are licensed under the following terms:

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```
