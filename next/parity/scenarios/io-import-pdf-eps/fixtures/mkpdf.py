# Regenerates the PDF fixtures of the io-import-pdf-eps scenarios.
# Usage: python mkpdf.py [name.pdf ...]   (writes next to this file; needs
# fontTools). With names, only those files are written: fontTools stamps
# the subset fonts with the current time, so regenerating changes them.
#
# Each file exercises a part of the PDF importer's canvas bridge: colors,
# text and text merging, embedded fonts, patterns and shadings, images,
# form XObjects, graphics state, annotations and page geometry.
import io
import os
import sys
import zlib

from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
ASSET_FONTS = os.path.abspath(os.path.join(NEXT, "..", "public", "assets", "font"))
ICONS = os.path.join(NEXT, "parity", "fixtures", "import", "font", "gravit-icons.ttf")
PHOTO = os.path.join(NEXT, "parity", "fixtures", "import", "raster", "photo.jpg")


def pdf(objs, root=1):
    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offs = []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
    for o in offs:
        out += b"%010d 00000 n \n" % o
    out += b"trailer\n<< /Size %d /Root %d 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, root, x)
    return bytes(out)


def stream(data, extra=b"", compress=True):
    if compress:
        d = zlib.compress(data, 9)
        return b"<< /Length %d /Filter /FlateDecode %s>>\nstream\n" % (len(d), extra) + d + b"\nendstream"
    return b"<< /Length %d %s>>\nstream\n" % (len(data), extra) + data + b"\nendstream"


ONLY = set(sys.argv[1:])


def write(name, objs):
    if ONLY and name not in ONLY:
        return
    with open(os.path.join(HERE, name), "wb") as f:
        f.write(pdf(objs))


def page_doc(pages, extra_objs=()):
    """pages: list of (mediabox, content bytes, resources bytes, extra page entries)."""
    n = len(pages)
    objs = [b"<< /Type /Catalog /Pages 2 0 R >>", None]
    kids = []
    first_page = 3
    for i, (box, content, resources, extra) in enumerate(pages):
        page_id = first_page + 2 * i
        kids.append(b"%d 0 R" % page_id)
        objs.append(
            b"<< /Type /Page /Parent 2 0 R /MediaBox [%s] /Contents %d 0 R /Resources %s %s>>"
            % (box, page_id + 1, resources, extra)
        )
        objs.append(stream(content))
    objs[1] = b"<< /Type /Pages /Kids [%s] /Count %d >>" % (b" ".join(kids), n)
    objs.extend(extra_objs)
    return objs


def circle(cx, cy, r):
    k = 0.5523
    c = r * k
    return (
        f"{cx+r} {cy} m {cx+r} {cy+c} {cx+c} {cy+r} {cx} {cy+r} c {cx-c} {cy+r} {cx-r} {cy+c} {cx-r} {cy} c "
        f"{cx-r} {cy-c} {cx-c} {cy-r} {cx} {cy-r} c {cx+c} {cy-r} {cx+r} {cy-c} {cx+r} {cy} c h"
    ).encode()


# 1) colors: gray, RGB, CMYK through every operator form
c = b"\n".join([
    b"0.5 g 10 10 30 30 re f",
    b"0.2 0.4 0.6 rg 50 10 30 30 re f",
    b"0.1 0.2 0.3 0.4 k 90 10 30 30 re f",
    b"1 0 0 0 K 4 w 130 10 30 30 re S",
    b"/DeviceCMYK cs 0 0.5 1 0 sc 170 10 30 30 re f",
    b"/DeviceCMYK CS 0 1 0 0 SC 3 w 210 10 30 30 re S",
    b"/DeviceRGB cs 0.9 0.8 0.1 scn 10 50 30 30 re f",
    b"/DeviceGray CS 0.3 SCN 50 50 30 30 re S",
    b"0 0 0 1 k 0 0 1 rg 90 50 30 30 re f",
    b"1 1 0 0 k 0.3 G 130 50 30 30 re B",
    b"/CS1 cs 0.7 sc 170 50 30 30 re f",
    b"/CS2 cs 0.4 sc 210 50 30 30 re f",
])
write("colors.pdf", page_doc(
    [(b"0 0 260 100", c, b"<< /ColorSpace << /CS1 9 0 R /CS2 10 0 R >> >>", b"")],
    [
        b"null", b"null", b"null", b"null",  # 5-8 unused
        b"[/Separation /Spot /DeviceCMYK << /FunctionType 2 /Domain [0 1] /C0 [0 0 0 0] /C1 [0 0.5 1 0] /N 1 >>]",
        b"[/Indexed /DeviceRGB 1 <ff000000ff00>]",
    ],
))

# 2) text with the standard fonts: spacing, scaling, leading, rendering
# modes, text matrices, kerning arrays; laid out so the importer merges
# words into lines and lines into paragraphs.
c = b"\n".join([
    b"BT /F1 14 Tf 20 260 Td (Hello) Tj ( World) Tj ET",
    b"BT /F1 14 Tf 75 240 Td (centered) Tj ET",
    b"BT /F1 14 Tf 20 220 Td (left line one) Tj 0 -16 Td (left line two) Tj 0 -16 Td (left line three) Tj ET",
    b"BT /F2 12 Tf 16 TL 220 260 Td (Times) Tj T* (next line) Tj (quote) ' 2 1 (dquote) \" ET",
    b"BT /F3 10 Tf 2 Tc 4 Tw 150 Tz 220 180 Td (Courier spaced) Tj ET",
    b"BT /F1 12 Tf 20 150 Td [(Ke) 120 (rn) -300 (ing)] TJ ET",
    b"BT /F1 12 Tf 1 Tr 1 0 0 RG 20 130 Td (stroked) Tj ET",
    b"BT /F1 12 Tf 2 Tr 0 0 1 rg 0 1 0 RG 120 130 Td (fill and stroke) Tj ET",
    b"BT /F1 12 Tf 3 Tr 250 130 Td (invisible) Tj ET",
    b"BT /F2 18 Tf 0.866 0.5 -0.5 0.866 40 40 Tm (rotated) Tj ET",
    b"BT /F2 18 Tf 1 0 0.3 1 200 40 Tm (skewed) Tj ET",
    b"BT /F1 10 Tf 5 Ts 20 100 Td (rise) Tj ET",
    b"BT /F4 12 Tf 20 80 Td (abc) Tj ET",
    b"BT /F1 12 Tf 7 Tr 300 80 Td (clip) Tj ET 0 1 0 rg 300 70 60 30 re f",
    b"BT /F1 12 Tf 0.2 0.6 0.2 rg 160 100 Td (same) Tj ( line) Tj ET BT /F1 12 Tf 0.2 0.6 0.2 rg 210 100 Td (merged) Tj ET",
])
write("text.pdf", page_doc(
    [(b"0 0 400 280", c,
      b"<< /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R /F4 8 0 R >> >>", b"")],
    [
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Oblique >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Symbol >>",
    ],
))


# 3) embedded TrueType fonts: a subset of Open Sans (a family in the
# importer's Google font list), Open Sans Bold Italic, and the Gravit icon
# font (not in the list, so it becomes an embedded font).
def subset_font(path, text=None, unicodes=None):
    font = TTFont(path)
    options = subset.Options()
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.notdef_outline = True
    options.layout_features = []
    sub = subset.Subsetter(options)
    sub.populate(text=text or "", unicodes=unicodes or [])
    sub.subset(font)
    buf = io.BytesIO()
    font.save(buf)
    data = buf.getvalue()
    font = TTFont(io.BytesIO(data))
    return data, font


def truetype(first_id, base, data, font, first, last, codes_to_unicode=None):
    upem = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    widths = []
    for code in range(first, last + 1):
        uni = codes_to_unicode(code) if codes_to_unicode else code
        glyph = cmap.get(uni)
        widths.append(round(hmtx[glyph][0] * 1000 / upem) if glyph else 0)
    head = font["head"]
    font_dict = (
        b"<< /Type /Font /Subtype /TrueType /BaseFont /%s /FirstChar %d /LastChar %d /Widths [%s] "
        b"/FontDescriptor %d 0 R %s>>"
        % (base, first, last, b" ".join(b"%d" % w for w in widths), first_id + 1,
           b"" if codes_to_unicode else b"/Encoding /WinAnsiEncoding ")
    )
    descriptor = (
        b"<< /Type /FontDescriptor /FontName /%s /Flags %d /FontBBox [%d %d %d %d] /ItalicAngle 0 "
        b"/Ascent %d /Descent %d /CapHeight 700 /StemV 80 /FontFile2 %d 0 R >>"
        % (base, 4 if codes_to_unicode else 32, head.xMin, head.yMin, head.xMax, head.yMax,
           font["hhea"].ascent, font["hhea"].descent, first_id + 2)
    )
    return [font_dict, descriptor, stream(data, b"/Length1 %d " % len(data))]


regular, regular_font = subset_font(os.path.join(ASSET_FONTS, "OpenSans-Regular.ttf"), text="Embedded Open Sans text")
bold, bold_font = subset_font(os.path.join(ASSET_FONTS, "OpenSans-BoldItalic.ttf"), text="Bold Italic")
icons, icons_font = subset_font(ICONS, unicodes=list(range(0xE000, 0xE008)))
c = b"\n".join([
    b"BT /F1 20 Tf 20 150 Td (Embedded Open Sans text) Tj ET",
    b"BT /F2 18 Tf 20 110 Td (Bold Italic) Tj ET",
    b"BT /F3 24 Tf 20 60 Td <0001020304> Tj ET",
    b"BT /F1 12 Tf 0.8 0 0 rg 20 30 Td (Open Sans) Tj ET",
])
write("embedded-fonts.pdf", page_doc(
    [(b"0 0 300 180", c, b"<< /Font << /F1 5 0 R /F2 8 0 R /F3 11 0 R >> >>", b"")],
)[:4] + truetype(5, b"OpenSans-Regular", regular, regular_font, 32, 126)
    + truetype(8, b"OpenSans-BoldItalic", bold, bold_font, 32, 126)
    + truetype(11, b"GravitIcons", icons, icons_font, 0, 7, lambda code: 0xE000 + code))

# 4) patterns and shadings: tiling patterns (colored and uncolored), shading
# patterns as fill and stroke, axial and radial sh, text filled with a
# shading pattern.
tile = b"0 0 1 rg 0 0 5 5 re f 1 0 0 rg 5 5 5 5 re f"
tile_uncolored = b"0 0 4 4 re f"
c = b"\n".join([
    b"/Pattern cs /P1 scn 10 10 80 60 re f",
    b"/Pattern cs /P2 scn 100 10 80 60 re f",
    b"/Pattern cs /P3 0.2 0.6 0.9 scn 190 10 80 60 re f",
    b"/Pattern CS /P2 SCN 6 w 280 10 80 60 re S",
    b"q 10 80 80 60 re W n /Sh1 sh Q",
    b"q 100 80 80 60 re W n /Sh2 sh Q",
    b"q 190 80 80 60 re W n /Sh3 sh Q",
    b"BT /F1 24 Tf /Pattern cs /P2 scn 280 100 Td (Grad) Tj ET",
    b"q 1 0 0 1 300 150 cm /Sh2 sh Q",
])
axial = b"<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [100 0 180 0] /Function << /FunctionType 2 /Domain [0 1] /C0 [1 0 0] /C1 [0 0 1] /N 1 >> /Extend [true true] >>"
radial = b"<< /ShadingType 3 /ColorSpace /DeviceRGB /Coords [140 110 0 140 110 40] /Function << /FunctionType 2 /Domain [0 1] /C0 [1 1 0] /C1 [0 0.5 0] /N 1 >> /Extend [false true] >>"
cmyk_axial = b"<< /ShadingType 2 /ColorSpace /DeviceCMYK /Coords [190 80 270 140] /Function << /FunctionType 3 /Domain [0 1] /Bounds [0.5] /Encode [0 1 0 1] /Functions [ << /FunctionType 2 /Domain [0 1] /C0 [1 0 0 0] /C1 [0 1 0 0] /N 1 >> << /FunctionType 2 /Domain [0 1] /C0 [0 1 0 0] /C1 [0 0 1 0] /N 1 >> ] >> >>"
write("patterns.pdf", page_doc(
    [(b"0 0 380 200", c,
      b"<< /Pattern << /P1 5 0 R /P2 6 0 R /P3 7 0 R >> /Shading << /Sh1 8 0 R /Sh2 9 0 R /Sh3 10 0 R >> /Font << /F1 11 0 R >> >>",
      b"")],
)[:4] + [
    stream(tile, b"/Type /Pattern /PatternType 1 /PaintType 1 /TilingType 1 /BBox [0 0 10 10] /XStep 10 /YStep 10 /Resources << >> "),
    b"<< /Type /Pattern /PatternType 2 /Shading %s >>" % axial,
    stream(tile_uncolored, b"/Type /Pattern /PatternType 1 /PaintType 2 /TilingType 2 /BBox [0 0 8 8] /XStep 8 /YStep 8 /Resources << >> "),
    b"<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [10 0 90 0] /Function << /FunctionType 2 /Domain [0 1] /C0 [0 1 0] /C1 [1 0 1] /N 1 >> >>",
    radial,
    cmyk_axial,
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
])

# 5) images and XObjects: RGB, gray, indexed, 1-bit, stencil mask, explicit
# mask, Decode arrays, DCT, inline images, nested form XObjects with
# matrices and bounding boxes.
w = h = 4
rgb = bytes(v for y in range(h) for x in range(w) for v in (x * 64, y * 64, 200))
gray = bytes((x + y) * 30 for y in range(h) for x in range(w))
indexed = bytes((x + y) % 3 for y in range(h) for x in range(w))
bits = bytes([0b10100000, 0b01010000, 0b10100000, 0b01010000])
jpg = open(PHOTO, "rb").read()
form_inner = b"0 0.6 0 rg 0 0 20 20 re f"
form_outer = b"1 0 0 rg 0 0 30 10 re f q 1 0 0 1 5 12 cm /Fi Do Q"
c = b"\n".join([
    b"q 40 0 0 40 10 10 cm /I1 Do Q",
    b"q 40 0 0 40 60 10 cm /I2 Do Q",
    b"q 40 0 0 40 110 10 cm /I3 Do Q",
    b"q 40 0 0 40 160 10 cm /I4 Do Q",
    b"q 0 0 1 rg 40 0 0 40 210 10 cm /I5 Do Q",
    b"q 40 0 0 40 260 10 cm /I6 Do Q",
    b"q 60 0 0 40 10 60 cm /I7 Do Q",
    b"q 40 0 0 40 80 60 cm BI /W 2 /H 2 /CS /RGB /BPC 8 ID \xff\x00\x00\x00\xff\x00\x00\x00\xff\xff\xff\x00 EI Q",
    b"q 40 0 0 40 130 60 cm BI /W 4 /H 1 /CS /G /BPC 8 /D [1 0] ID \x00\x40\x80\xff EI Q",
    b"q 0.8 0.2 0.2 rg 40 0 0 40 180 60 cm BI /W 8 /H 2 /IM true ID \xf0\x0f EI Q",
    b"q 1 0 0 1 230 60 cm /Fo Do Q",
    b"q 2 0 0 2 260 70 cm /Fo Do Q",
    b"q 0.7 0.7 0.7 rg 0 0 0 RG 1 w 10 110 330 30 re B Q",
    b"q 10 115 100 20 re W n 40 0 0 40 20 105 cm /I1 Do Q",
])
write("images-xobjects.pdf", page_doc(
    [(b"0 0 350 150", c,
      b"<< /XObject << /I1 5 0 R /I2 6 0 R /I3 7 0 R /I4 8 0 R /I5 9 0 R /I6 10 0 R /I7 11 0 R /Fo 12 0 R /Fi 13 0 R >> >>",
      b"")],
)[:4] + [
    stream(rgb, b"/Type /XObject /Subtype /Image /Width 4 /Height 4 /ColorSpace /DeviceRGB /BitsPerComponent 8 "),
    stream(gray, b"/Type /XObject /Subtype /Image /Width 4 /Height 4 /ColorSpace /DeviceGray /BitsPerComponent 8 /Decode [1 0] "),
    stream(indexed, b"/Type /XObject /Subtype /Image /Width 4 /Height 4 /ColorSpace [/Indexed /DeviceRGB 2 <ff0000 00ff00 0000ff>] /BitsPerComponent 8 "),
    stream(bits, b"/Type /XObject /Subtype /Image /Width 4 /Height 4 /ColorSpace /DeviceGray /BitsPerComponent 1 "),
    stream(bits, b"/Type /XObject /Subtype /Image /Width 4 /Height 4 /ImageMask true "),
    stream(rgb, b"/Type /XObject /Subtype /Image /Width 4 /Height 4 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Mask [0 100 0 255 150 255] "),
    b"<< /Type /XObject /Subtype /Image /Width 80 /Height 60 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length %d >>\nstream\n" % len(jpg) + jpg + b"\nendstream",
    stream(form_outer, b"/Type /XObject /Subtype /Form /BBox [0 0 40 40] /Matrix [1 0 0 1 2 2] /Resources << /XObject << /Fi 13 0 R >> >> "),
    stream(form_inner, b"/Type /XObject /Subtype /Form /BBox [0 0 15 15] /Resources << >> "),
])

# 6) graphics state: line caps, joins, miter limits, dashes, clipping (nonzero
# and even-odd), fill rules, alpha and blend modes, a soft mask, nested q/Q.
c = b"\n".join([
    b"0 0 0 RG 8 w 0 J 10 10 m 60 10 l S 1 J 10 30 m 60 30 l S 2 J 10 50 m 60 50 l S",
    b"0 j 80 10 m 100 50 l 120 10 l S 1 j 130 10 m 150 50 l 170 10 l S 2 j 180 10 m 200 50 l 220 10 l S",
    b"0 j 2 M 230 10 m 250 50 l 270 10 l S",
    b"1 w [6 2 2 2] 1 d 10 70 m 200 70 l S [] 0 d",
    b"q 210 60 60 40 re W n 0 0 1 rg 200 50 100 100 re f Q",
    b"q 280 60 m 330 60 l 305 100 l h 290 70 m 320 70 l 305 90 l h W* n 1 0 0 rg 270 50 80 80 re f Q",
    b"0.2 0.7 0.2 rg 10 110 m 60 110 l 60 140 l 10 140 l h 20 120 m 50 120 l 50 130 l 20 130 l h f*",
    b"0.2 0.2 0.7 rg 70 110 m 120 110 l 120 140 l 70 140 l h 80 120 m 110 120 l 110 130 l 80 130 l h f",
    b"q /GS1 gs 1 0 0 rg 130 110 40 30 re f Q",
    b"q /GS2 gs 0 1 0 rg 150 120 40 30 re f Q",
    b"q /GS3 gs 0 0 1 rg 190 110 40 30 re f Q",
    b"q /GS4 gs 0.5 0 0.5 rg 240 110 60 40 re f Q",
    b"0 0.5 0.5 rg 0 0 0 RG 2 w 310 110 30 30 re b*",
    b"q 1 0 0 1 10 160 cm q 0.5 0 0 0.5 0 0 cm 0 0 0 rg 0 0 40 40 re f Q 30 0 20 20 re f Q",
])
write("graphics-state.pdf", page_doc(
    [(b"0 0 360 200", c,
      b"<< /ExtGState << /GS1 5 0 R /GS2 6 0 R /GS3 7 0 R /GS4 8 0 R >> >>", b"")],
)[:4] + [
    b"<< /Type /ExtGState /ca 0.5 /CA 0.5 >>",
    b"<< /Type /ExtGState /BM /Multiply >>",
    b"<< /Type /ExtGState /BM /Screen /ca 0.8 /LW 3 /LC 1 /LJ 1 /D [[2 2] 0] >>",
    b"<< /Type /ExtGState /SMask << /Type /Mask /S /Luminosity /G 9 0 R >> >>",
    stream(b"/Sh1 sh", b"/Type /XObject /Subtype /Form /BBox [240 110 300 150] /Group << /S /Transparency /CS /DeviceGray >> /Resources << /Shading << /Sh1 << /ShadingType 2 /ColorSpace /DeviceGray /Coords [240 0 300 0] /Function << /FunctionType 2 /Domain [0 1] /C0 [1] /C1 [0] /N 1 >> >> >> >> "),
])

# 7) page geometry and annotations: pages of different sizes, a rotated page,
# a crop box, and annotations with appearance streams (drawn with the
# display intent).
c1 = b"0 0 1 rg 10 10 50 30 re f"
c2 = b"1 0 0 rg 10 10 50 30 re f"
c3 = b"0 1 0 rg 10 10 50 30 re f"
ap = b"0.9 0.6 0 rg 0 0 40 20 re f"
objs = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R 5 0 R 7 0 R] /Count 3 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R /Resources << >> /Annots [9 0 R 11 0 R] >>",
    stream(c1),
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Rotate 90 /Contents 6 0 R /Resources << >> >>",
    stream(c2),
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /CropBox [50 50 250 200] /Contents 8 0 R /Resources << >> >>",
    stream(c3),
    b"<< /Type /Annot /Subtype /Square /Rect [100 50 140 70] /AP << /N 10 0 R >> /F 4 >>",
    stream(ap, b"/Type /XObject /Subtype /Form /BBox [0 0 40 20] /Resources << >> "),
    b"<< /Type /Annot /Subtype /Link /Rect [10 60 60 90] /Border [0 0 1] /A << /S /URI /URI (https://example.com) >> >>",
]
write("pages-annotations.pdf", objs)

# 8) a Type 3 font: glyphs are content streams.
glyph_a = b"500 0 0 0 500 700 d1 0 0 m 250 700 l 500 0 l h f"
glyph_b = b"500 0 0 0 500 700 d1 0 0 500 700 re f"
c = b"BT /T3 20 Tf 0.1 0.3 0.8 rg 20 40 Td (abab) Tj ET"
write("type3.pdf", page_doc(
    [(b"0 0 200 100", c, b"<< /Font << /T3 5 0 R >> >>", b"")],
)[:4] + [
    b"<< /Type /Font /Subtype /Type3 /FontBBox [0 0 500 700] /FontMatrix [0.001 0 0 0.001 0 0] /CharProcs << /a 6 0 R /b 7 0 R >> /Encoding << /Type /Encoding /Differences [97 /a /b] >> /FirstChar 97 /LastChar 98 /Widths [500 500] /Resources << >> >>",
    stream(glyph_a),
    stream(glyph_b),
])


# 9) a CFF (Type1C) font built from Open Sans outlines, and a Type0 font
# (CIDFontType2, Identity-H) with a ToUnicode map.
def cff_font(text):
    from fontTools.fontBuilder import FontBuilder
    from fontTools.pens.t2CharStringPen import T2CharStringPen
    source = TTFont(os.path.join(ASSET_FONTS, "OpenSans-Regular.ttf"))
    cmap = source.getBestCmap()
    glyph_set = source.getGlyphSet()
    names = [".notdef"] + sorted({cmap[ord(ch)] for ch in text if ord(ch) in cmap})
    charstrings, metrics = {}, {}
    for name in names:
        pen = T2CharStringPen(source["hmtx"][name][0], glyph_set)
        glyph_set[name].draw(pen)
        charstrings[name] = pen.getCharString()
        metrics[name] = source["hmtx"][name]
    fb = FontBuilder(source["head"].unitsPerEm, isTTF=False)
    fb.setupGlyphOrder(names)
    fb.setupCharacterMap({ord(ch): cmap[ord(ch)] for ch in text if ord(ch) in cmap})
    fb.setupCFF("ParityCFF", {"FullName": "Parity CFF"}, charstrings, {})
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=1069, descent=-293)
    fb.setupNameTable({"familyName": "Parity CFF", "styleName": "Regular"})
    fb.setupOS2()
    fb.setupPost()
    buf = io.BytesIO()
    fb.save(buf)
    font = TTFont(io.BytesIO(buf.getvalue()))
    return font["CFF "].compile(font), font, names


cff_data, cff_ttfont, cff_names = cff_font("Compact Font")
cff_upem = cff_ttfont["head"].unitsPerEm
cff_widths = []
cff_cmap = cff_ttfont.getBestCmap()
for code in range(32, 127):
    g = cff_cmap.get(code)
    cff_widths.append(round(cff_ttfont["hmtx"][g][0] * 1000 / cff_upem) if g else 0)

type0, type0_font = subset_font(os.path.join(ASSET_FONTS, "OpenSans-Regular.ttf"), text="Composite text")
type0_cmap = type0_font.getBestCmap()
order = type0_font.getGlyphOrder()
gids = [order.index(type0_cmap[ord(ch)]) for ch in "Composite text"]
to_unicode = (
    b"/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def "
    b"/CMapName /Adobe-Identity-UCS def /CMapType 2 def 1 begincodespacerange <0000> <FFFF> endcodespacerange "
    + b"%d beginbfchar " % len(set(gids))
    + b" ".join(b"<%04X> <%04X>" % (gid, ord(ch)) for gid, ch in sorted(set(zip(gids, "Composite text"))))
    + b" endbfchar endcmap CMapName currentdict /CMap defineresource pop end end"
)
c = b"\n".join([
    b"BT /F1 22 Tf 20 120 Td (Compact Font) Tj ET",
    b"BT /F2 20 Tf 0.2 0.2 0.6 rg 20 70 Td <" + b"".join(b"%04X" % g for g in gids) + b"> Tj ET",
    b"BT /F2 12 Tf 20 40 Td [<" + b"".join(b"%04X" % g for g in gids[:5]) + b"> -500 <" + b"".join(b"%04X" % g for g in gids[5:]) + b">] TJ ET",
])
write("cff-type0-fonts.pdf", page_doc(
    [(b"0 0 300 160", c, b"<< /Font << /F1 5 0 R /F2 8 0 R >> >>", b"")],
)[:4] + [
    b"<< /Type /Font /Subtype /Type1 /BaseFont /ParityCFF /FirstChar 32 /LastChar 126 /Widths [%s] /FontDescriptor 6 0 R >>" % b" ".join(b"%d" % w for w in cff_widths),
    b"<< /Type /FontDescriptor /FontName /ParityCFF /Flags 32 /FontBBox [-550 -271 1204 1048] /ItalicAngle 0 /Ascent 1069 /Descent -293 /CapHeight 714 /StemV 80 /FontFile3 7 0 R >>",
    stream(cff_data, b"/Subtype /Type1C "),
    b"<< /Type /Font /Subtype /Type0 /BaseFont /OpenSans-Composite /Encoding /Identity-H /DescendantFonts [9 0 R] /ToUnicode 12 0 R >>",
    b"<< /Type /Font /Subtype /CIDFontType2 /BaseFont /OpenSans-Composite /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor 10 0 R /DW 600 /CIDToGIDMap /Identity >>",
    b"<< /Type /FontDescriptor /FontName /OpenSans-Composite /Flags 32 /FontBBox [-550 -271 1204 1048] /ItalicAngle 0 /Ascent 1069 /Descent -293 /CapHeight 714 /StemV 80 /FontFile2 11 0 R >>",
    stream(type0, b"/Length1 %d " % len(type0)),
    stream(to_unicode),
])


# 10) embedded fonts whose family is not in the Google font list but whose
# full name is a listed family plus a weight name. The importer strips the
# weight names in module 1204's order (ExtraLight, ExtraBold, SemiBold,
# Thin, Light, Regular, Medium, Bold, Heavy), so "Open Sans ExtraBold"
# becomes "open sans" and maps to Open Sans 800; stripping "bold" first
# would leave "open sans extra". The same fonts are written for the
# canvas bridge's unit test (src/io/import/pdf/__fixtures__).
BRIDGE_FIXTURES = os.path.join(NEXT, "src", "io", "import", "pdf", "__fixtures__")


def renamed_font(family, full_name, ps_name, text):
    data, font = subset_font(os.path.join(ASSET_FONTS, "OpenSans-Regular.ttf"), text=text)
    name = font["name"]
    for record in list(name.names):
        if record.nameID in (1, 2, 3, 4, 6, 16, 17):
            name.removeNames(nameID=record.nameID)
    for name_id, value in ((1, family), (2, "Regular"), (3, ps_name), (4, full_name), (6, ps_name)):
        name.setName(value, name_id, 3, 1, 0x409)
        name.setName(value, name_id, 1, 0, 0)
    font.recalcTimestamp = False
    buf = io.BytesIO()
    font.save(buf)
    data = buf.getvalue()
    return data, TTFont(io.BytesIO(data))


weight_fonts = [
    (b"ParityXYZ-ExtraBold", "Parity XYZ", "Open Sans ExtraBold", "Extra bold"),
    (b"ParityXYZ-Bold", "Parity XYZ Two", "Open Sans Bold", "Plain bold"),
    (b"ParityXYZ-Thin", "Parity XYZ Three", "Open Sans Thin", "Thin text"),
]
c = []
resources = []
objs = []
for i, (base, family, full_name, text) in enumerate(weight_fonts):
    data, font = renamed_font(family, full_name, base.decode(), text)
    if ONLY and "font-weight-names.pdf" not in ONLY:
        continue
    os.makedirs(BRIDGE_FIXTURES, exist_ok=True)
    with open(os.path.join(BRIDGE_FIXTURES, base.decode() + ".ttf"), "wb") as f:
        f.write(data)
    c.append(b"BT /F%d 18 Tf 20 %d Td (%s) Tj ET" % (i + 1, 120 - 40 * i, text.encode()))
    resources.append(b"/F%d %d 0 R" % (i + 1, 5 + 3 * i))
    objs += truetype(5 + 3 * i, base, data, font, 32, 126)
write("font-weight-names.pdf", page_doc(
    [(b"0 0 300 160", b"\n".join(c), b"<< /Font << %s >> >>" % b" ".join(resources), b"")],
)[:4] + objs)


# 11) encrypted PDFs (needs pypdf): one that needs a user password, which
# pdf.js rejects with a PasswordException (the import never calls back),
# and one with only an owner password, which pdf.js decrypts on its own.
def encrypted(name, user_password, owner_password, algorithm):
    if ONLY and name not in ONLY:
        return
    from pypdf import PdfReader, PdfWriter
    plain = pdf(page_doc([(
        b"0 0 200 100",
        b"0.2 0.4 0.6 rg 10 10 80 40 re f BT /F1 14 Tf 10 70 Td (Secret text) Tj ET",
        b"<< /Font << /F1 5 0 R >> >>",
        b"",
    )], [b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]))
    writer = PdfWriter(clone_from=PdfReader(io.BytesIO(plain)))
    writer.encrypt(user_password, owner_password, algorithm=algorithm)
    with open(os.path.join(HERE, name), "wb") as f:
        writer.write(f)


encrypted("encrypted-user-password.pdf", "secret", "owner", "RC4-40")
encrypted("encrypted-owner-password.pdf", "", "owner", "RC4-128")
