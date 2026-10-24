#!/usr/bin/env bash
# Builds harfbuzz-2.2.0.wasm, the HarfBuzz the old bundle embedded (as
# asm.js, chunk.vendor.js module 998), for src/engine/text/harfbuzz.
#
# Usage: vendor/harfbuzz/build.sh [work dir]
#
# The work dir (default: $TMPDIR/gd-harfbuzz) receives emsdk and the
# HarfBuzz source; nothing but the .wasm lands in the repo. See README.md
# for the versions and why the flags are what they are.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="${1:-${TMPDIR:-/tmp}/gd-harfbuzz}"
EMSDK_VERSION=3.1.74
HB_VERSION=2.2.0
HB_SHA256=b7ccfcbd56b970a709e8b9ea9fb46c922c606c2feef8f086fb6a8492e530f810
HB_URL="https://www.freedesktop.org/software/harfbuzz/release/harfbuzz-$HB_VERSION.tar.bz2"

mkdir -p "$WORK"

if [ ! -d "$WORK/emsdk" ]; then
  git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$WORK/emsdk"
fi
case "$(uname -s)" in
  MINGW* | MSYS* | CYGWIN*) EMSDK_CMD="$WORK/emsdk/emsdk.bat" ;;
  *) EMSDK_CMD="$WORK/emsdk/emsdk" ;;
esac
"$EMSDK_CMD" install "$EMSDK_VERSION"
"$EMSDK_CMD" activate "$EMSDK_VERSION"
export EM_CONFIG="$WORK/emsdk/.emscripten"
# emcc is a shell wrapper around emcc.py; use the Python emsdk installed.
for py in "$WORK"/emsdk/python/*/python.exe "$WORK"/emsdk/python/*/bin/python3; do
  if [ -x "$py" ]; then export EMSDK_PYTHON="$py"; fi
done
EMCC="$WORK/emsdk/upstream/emscripten/emcc"

if [ ! -f "$WORK/harfbuzz-$HB_VERSION.tar.bz2" ]; then
  curl -fsSL -o "$WORK/harfbuzz-$HB_VERSION.tar.bz2" "$HB_URL"
fi
echo "$HB_SHA256  $WORK/harfbuzz-$HB_VERSION.tar.bz2" | sha256sum -c -
rm -rf "$WORK/src"
mkdir -p "$WORK/src"
tar xjf "$WORK/harfbuzz-$HB_VERSION.tar.bz2" -C "$WORK/src"
HB="$WORK/src/harfbuzz-$HB_VERSION/src"

# The library as configure builds it without glib, ICU, FreeType or
# threads: the OpenType shaper, the fallback shaper and the bundled UCDN
# Unicode tables (script detection needs them).
SOURCES=(
  hb-blob.cc hb-buffer-serialize.cc hb-buffer.cc hb-common.cc hb-face.cc
  hb-font.cc hb-map.cc hb-ot-name-language.cc hb-ot-name.cc hb-ot-tag.cc
  hb-set.cc hb-shape.cc hb-shape-plan.cc hb-shaper.cc hb-static.cc
  hb-unicode.cc hb-warning.cc
  hb-fallback-shape.cc
  hb-aat-layout.cc hb-aat-map.cc hb-ot-face.cc hb-ot-font.cc hb-ot-layout.cc
  hb-ot-color.cc hb-ot-map.cc hb-ot-math.cc hb-ot-shape.cc
  hb-ot-shape-complex-arabic.cc hb-ot-shape-complex-default.cc
  hb-ot-shape-complex-hangul.cc hb-ot-shape-complex-hebrew.cc
  hb-ot-shape-complex-indic.cc hb-ot-shape-complex-indic-table.cc
  hb-ot-shape-complex-khmer.cc hb-ot-shape-complex-myanmar.cc
  hb-ot-shape-complex-thai.cc hb-ot-shape-complex-use.cc
  hb-ot-shape-complex-use-table.cc hb-ot-shape-complex-vowel-constraints.cc
  hb-ot-shape-normalize.cc hb-ot-shape-fallback.cc hb-ot-var.cc
  hb-ucdn.cc hb-ucdn/ucdn.c
)

# Exactly the functions the old wrapper (chunk.vendor.js module 838) calls.
EXPORTS=(
  malloc free
  hb_blob_create hb_face_create hb_font_create hb_font_set_scale
  hb_font_set_variations hb_shape
  hb_buffer_create hb_buffer_destroy hb_buffer_add_utf8
  hb_buffer_guess_segment_properties hb_buffer_reverse hb_buffer_get_length
  hb_buffer_get_glyph_infos hb_buffer_get_glyph_positions
  hb_buffer_get_language hb_buffer_set_language
  hb_buffer_get_direction hb_buffer_set_direction
  hb_buffer_get_script hb_buffer_set_script
  hb_language_to_string hb_language_from_string
  hb_direction_to_string hb_direction_from_string
  hb_script_get_horizontal_direction hb_ot_tag_to_language
)
EXPORTED=$(printf '"_%s",' "${EXPORTS[@]}")
EXPORTED="[${EXPORTED%,}]"

OBJ="$WORK/obj"
rm -rf "$OBJ"
mkdir -p "$OBJ"
DEFINES=(-DHAVE_OT -DHAVE_FALLBACK -DHAVE_UCDN -DHB_NO_MT)
OBJECTS=()
for src in "${SOURCES[@]}"; do
  obj="$OBJ/$(basename "$src").o"
  case "$src" in
    *.c) "$EMCC" -O2 -std=c99 "${DEFINES[@]}" -I"$HB" -I"$HB/hb-ucdn" -c "$HB/$src" -o "$obj" ;;
    *) "$EMCC" -O2 -std=c++11 -fno-exceptions -fno-rtti -fno-threadsafe-statics \
      "${DEFINES[@]}" -I"$HB" -I"$HB/hb-ucdn" -c "$HB/$src" -o "$obj" ;;
  esac
  OBJECTS+=("$obj")
done

# A standalone module with no JavaScript glue: the loader in
# src/engine/text/harfbuzz/harfbuzz-module.ts instantiates it itself.
"$EMCC" -O2 "${OBJECTS[@]}" -o "$HERE/harfbuzz-$HB_VERSION.wasm" \
  --no-entry -sSTANDALONE_WASM -sFILESYSTEM=0 -sALLOW_MEMORY_GROWTH=1 \
  -sINITIAL_MEMORY=16777216 -sSTACK_SIZE=1048576 \
  -sEXPORTED_FUNCTIONS="$EXPORTED"

sha256sum "$HERE/harfbuzz-$HB_VERSION.wasm"
