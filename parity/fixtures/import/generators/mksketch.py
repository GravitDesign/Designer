# Regenerates the hand-written import fixtures. Usage: python mksketch.py <fixtures/import dir>
import json, zipfile, sys, os
OUT = sys.argv[1]
def rect(x, y, w, h): return {"_class": "rect", "constrainProportions": False, "x": x, "y": y, "width": w, "height": h}
def color(r, g, b, a=1): return {"_class": "color", "red": r, "green": g, "blue": b, "alpha": a}
def cp(x, y): return {"_class": "curvePoint", "cornerRadius": 0, "curveFrom": "{%g, %g}" % (x, y), "curveMode": 1, "curveTo": "{%g, %g}" % (x, y), "hasCurveFrom": False, "hasCurveTo": False, "point": "{%g, %g}" % (x, y)}
def ovalpts():
    k = 0.2238
    pts = []
    for (px, py, fx, fy, tx, ty) in [(0.5, 0, 0.5 + k, 0, 0.5 - k, 0), (1, 0.5, 1, 0.5 + k, 1, 0.5 - k), (0.5, 1, 0.5 - k, 1, 0.5 + k, 1), (0, 0.5, 0, 0.5 - k, 0, 0.5 + k)]:
        pts.append({"_class": "curvePoint", "cornerRadius": 0, "curveFrom": "{%g, %g}" % (fx, fy), "curveMode": 2, "curveTo": "{%g, %g}" % (tx, ty), "hasCurveFrom": True, "hasCurveTo": True, "point": "{%g, %g}" % (px, py)})
    return pts
def style(fill=None, border=None, opacity=None):
    s = {"_class": "style", "endDecorationType": 0, "miterLimit": 10, "startDecorationType": 0}
    if fill: s["fills"] = [{"_class": "fill", "isEnabled": True, "color": fill, "fillType": 0, "noiseIndex": 0, "noiseIntensity": 0, "patternFillType": 1, "patternTileScale": 1}]
    if border: s["borders"] = [{"_class": "border", "isEnabled": True, "color": border[0], "fillType": 0, "position": 1, "thickness": border[1]}]
    if opacity is not None: s["contextSettings"] = {"_class": "graphicsContextSettings", "blendMode": 0, "opacity": opacity}
    return s
def shapegroup(oid, name, frame, child, st):
    return {"_class": "shapeGroup", "do_objectID": oid, "name": name, "frame": frame, "isVisible": True, "isLocked": False, "rotation": 0, "isFlippedHorizontal": False, "isFlippedVertical": False, "style": st, "hasClickThrough": False, "windingRule": 1, "layers": [child]}
rect_shape = {"_class": "rectangle", "do_objectID": "R1", "name": "Path", "frame": rect(0, 0, 100, 60), "isVisible": True, "rotation": 0, "edited": False, "fixedRadius": 8, "hasConvertedToNewRoundCorners": True, "booleanOperation": -1, "path": {"_class": "path", "isClosed": True, "pointRadiusBehaviour": 1, "points": [cp(0, 0), cp(1, 0), cp(1, 1), cp(0, 1)]}}
oval_shape = {"_class": "oval", "do_objectID": "O1", "name": "Path", "frame": rect(0, 0, 80, 80), "isVisible": True, "rotation": 0, "edited": False, "booleanOperation": -1, "path": {"_class": "path", "isClosed": True, "pointRadiusBehaviour": 1, "points": ovalpts()}}
artboard = {"_class": "artboard", "do_objectID": "A1", "name": "Board", "frame": rect(0, 0, 300, 200), "isVisible": True, "rotation": 0, "hasBackgroundColor": True, "backgroundColor": color(0.95, 0.95, 1), "includeBackgroundColorInExport": True, "style": {"_class": "style"}, "layers": [
    shapegroup("S1", "Red Box", rect(20, 20, 100, 60), rect_shape, style(color(0.86, 0.16, 0.16), (color(0, 0, 0), 2))),
    shapegroup("S2", "Blue Oval", rect(160, 40, 80, 80), oval_shape, style(color(0.2, 0.4, 0.8), None, 0.6)),
]}
page = {"_class": "page", "do_objectID": "P1", "name": "Page 1", "frame": rect(0, 0, 0, 0), "isVisible": True, "style": {"_class": "style"}, "layers": [artboard]}
def write(name, app_version):
    meta = {"appVersion": app_version, "version": 101 if float(app_version) >= 50 else 96, "pagesAndArtboards": {"P1": {"name": "Page 1", "artboards": {"A1": {"name": "Board"}}}}, "build": 1, "created": {"app": "com.bohemiancoding.sketch3", "appVersion": app_version}}
    doc = {"_class": "document", "do_objectID": "D1", "pages": [{"_class": "MSJSONFileReference", "_ref_class": "MSImmutablePage", "_ref": "pages/P1"}]}
    with zipfile.ZipFile(os.path.join(OUT, name), "w", zipfile.ZIP_DEFLATED) as z:
        for fn, data in [("document.json", doc), ("meta.json", meta), ("user.json", {}), ("pages/P1.json", page)]:
            zi = zipfile.ZipInfo(fn, date_time=(2020, 1, 1, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, json.dumps(data, separators=(",", ":")))
write("sketch/shapes-v49.sketch", "49.3")
write("sketch/shapes-v52.sketch", "52.2")

# ---------------------------------------------------------------------------
# Fixtures for the io-import-sketch scenarios: one file per converter area
# (primitives, groups and masks, boolean groups, styles and effects, text,
# symbols, bitmaps) plus broken inputs. Sketch 49 layout throughout.
import base64, math, plistlib, struct, zlib


def png(w, h, pixels):
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + b"".join(bytes(pixels[(y * w + x) % len(pixels)]) for x in range(w)) for y in range(h))
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))


IMG1 = png(4, 2, [(255, 0, 0, 255), (0, 255, 0, 255), (0, 0, 255, 255), (255, 255, 0, 128)])
IMG2 = png(2, 2, [(0, 128, 255, 255), (255, 128, 0, 255)])


def pt(x, y): return "{%g, %g}" % (x, y)


def cpt(x, y, mode=1, fr=None, to=None, radius=0, has_radius=True):
    p = {"_class": "curvePoint", "curveFrom": pt(*(fr or (x, y))), "curveMode": mode, "curveTo": pt(*(to or (x, y))),
         "hasCurveFrom": fr is not None, "hasCurveTo": to is not None, "point": pt(x, y)}
    if has_radius:
        p["cornerRadius"] = radius
    return p


def layer(cls, oid, name, frame, **kw):
    d = {"_class": cls, "do_objectID": oid, "name": name, "frame": frame, "isVisible": True, "isLocked": False,
         "rotation": 0, "isFlippedHorizontal": False, "isFlippedVertical": False}
    d.update(kw)
    return d


def shape(cls, oid, frame, points, closed=True, booleanOperation=-1, **kw):
    return layer(cls, oid, "Path", frame, edited=False, booleanOperation=booleanOperation,
                 path={"_class": "path", "isClosed": closed, "pointRadiusBehaviour": 1, "points": points}, **kw)


def sgroup(oid, name, frame, children, style, windingRule=1, **kw):
    return layer("shapeGroup", oid, name, frame, style=style, hasClickThrough=False, windingRule=windingRule,
                 layers=children, **kw)


def colorfill(c, **kw):
    f = {"_class": "fill", "isEnabled": True, "color": c, "fillType": 0, "noiseIndex": 0, "noiseIntensity": 0,
         "patternFillType": 1, "patternTileScale": 1}
    f.update(kw)
    return f


def st(fills=None, borders=None, **kw):
    s = {"_class": "style", "endDecorationType": 0, "miterLimit": 10, "startDecorationType": 0}
    if fills is not None:
        s["fills"] = fills
    if borders is not None:
        s["borders"] = borders
    s.update(kw)
    return s


def border(c, pos, w, **kw):
    b = {"_class": "border", "isEnabled": True, "color": c, "fillType": 0, "thickness": w}
    if pos is not None:
        b["position"] = pos
    b.update(kw)
    return b


def square(): return [cpt(0, 0), cpt(1, 0), cpt(1, 1), cpt(0, 1)]
def rshape(oid, w, h, **kw): return shape("rectangle", oid, rect(0, 0, w, h), square(), **kw)
def oshape(oid, w, h, **kw): return shape("oval", oid, rect(0, 0, w, h), ovalpts(), **kw)


def page_of(oid, name, layers):
    return {"_class": "page", "do_objectID": oid, "name": name, "frame": rect(0, 0, 0, 0), "isVisible": True,
            "style": {"_class": "style"}, "layers": layers}


def board(oid, name, frame, layers, bg=None, **kw):
    d = layer("artboard", oid, name, frame, style={"_class": "style"}, hasBackgroundColor=bg is not None,
              includeBackgroundColorInExport=True, layers=layers, **kw)
    if bg is not None:
        d["backgroundColor"] = bg
    return d


RED, GREEN, BLUE, BLACK = color(0.86, 0.16, 0.16), color(0.1, 0.7, 0.3), color(0.2, 0.4, 0.8), color(0, 0, 0)


def write_doc(name, pages, files=(), app_version="49.3", meta=True):
    """Writes a Sketch 49 zip: document.json, meta.json, user.json, pages/*.json, then `files`."""
    doc = {"_class": "document", "do_objectID": "D1", "pages": [
        {"_class": "MSJSONFileReference", "_ref_class": "MSImmutablePage", "_ref": "pages/" + p["do_objectID"]} for p in pages]}
    entries = [("document.json", json.dumps(doc, separators=(",", ":")).encode())]
    if meta:
        entries.append(("meta.json", json.dumps({"appVersion": app_version, "version": 96, "pagesAndArtboards": {}, "build": 1,
                                                 "created": {"app": "com.bohemiancoding.sketch3", "appVersion": app_version}},
                                                separators=(",", ":")).encode()))
    entries.append(("user.json", b"{}"))
    for p in pages:
        entries.append(("pages/%s.json" % p["do_objectID"], json.dumps(p, separators=(",", ":"), ensure_ascii=False).encode("utf-8")))
    entries += list(files)
    with zipfile.ZipFile(os.path.join(OUT, name), "w", zipfile.ZIP_DEFLATED) as z:
        for fn, data in entries:
            zi = zipfile.ZipInfo(fn, date_time=(2020, 1, 1, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, data)


# Primitives: every shape class, per-point and fixed corner radii, curve
# modes, open paths, rotation and flips, degenerate paths.
def ring(n, inner=None):
    out = []
    for i in range(n):
        r = 0.5 if inner is None or i % 2 == 0 else inner
        a = -math.pi / 2 + i * 2 * math.pi / n
        out.append(cpt(round(0.5 + r * math.cos(a), 4), round(0.5 + r * math.sin(a), 4)))
    return out


prims = board("A1", "Primitives", rect(0, 0, 600, 400), [
    sgroup("G-rect", "Rounded", rect(10, 10, 100, 60), [rshape("R1", 100, 60, fixedRadius=12)], st([colorfill(RED)])),
    sgroup("G-rect-big", "Radius too big", rect(130, 10, 60, 40), [rshape("R2", 60, 40, fixedRadius=80)], st([colorfill(GREEN)])),
    sgroup("G-corners", "Per point radius", rect(210, 10, 80, 80), [shape("rectangle", "R3", rect(0, 0, 80, 80), [
        cpt(0, 0, radius=4), cpt(1, 0, radius=10), cpt(1, 1), cpt(0, 1, radius=30)])], st([colorfill(BLUE)])),
    sgroup("G-noradius", "Missing radius key", rect(310, 10, 50, 50), [shape("rectangle", "R4", rect(0, 0, 50, 50), [
        cpt(0, 0, has_radius=False), cpt(1, 0), cpt(1, 1, has_radius=False), cpt(0, 1)], fixedRadius=6)], st([colorfill(RED)])),
    sgroup("G-oval", "Rotated oval", rect(380, 10, 90, 50), [oshape("O1", 90, 50)], st([colorfill(GREEN)]), rotation=30),
    sgroup("G-poly", "Polygon", rect(10, 110, 80, 80), [shape("polygon", "PG1", rect(0, 0, 80, 80), ring(5))], st([colorfill(BLUE)])),
    sgroup("G-star", "Star", rect(110, 110, 80, 80), [shape("star", "ST1", rect(0, 0, 80, 80), ring(10, 0.22))],
           st([colorfill(RED)]), isFlippedHorizontal=True),
    sgroup("G-tri", "Triangle", rect(210, 110, 80, 70), [shape("triangle", "TR1", rect(0, 0, 80, 70), [cpt(0.5, 0), cpt(1, 1), cpt(0, 1)])],
           st([colorfill(GREEN)]), isFlippedVertical=True),
    sgroup("G-open", "Open curve", rect(310, 110, 120, 60), [shape("shapePath", "SP1", rect(0, 0, 120, 60), [
        cpt(0, 1, mode=1), cpt(0.3, 0, mode=3, fr=(0.45, 0), to=(0.15, 0)), cpt(0.7, 1, mode=4, fr=(0.9, 1), to=(0.6, 0.8)),
        cpt(1, 0, mode=2, fr=(1, 0.2), to=(1, 0.2))], closed=False)], st(None, [border(BLACK, 0, 3)])),
    sgroup("G-badmode", "Unsupported curve mode", rect(450, 110, 60, 60), [shape("shapePath", "SP2", rect(0, 0, 60, 60), [
        cpt(0, 0), cpt(1, 0, mode=0, radius=5), cpt(1, 1), cpt(0, 1, mode=7)])], st([colorfill(BLUE)])),
    sgroup("G-badfirst", "Unsupported first point", rect(520, 110, 60, 60), [shape("shapePath", "SP5", rect(0, 0, 60, 60), [
        cpt(0, 0, mode=0, radius=5), cpt(1, 0), cpt(1, 1)])], st([colorfill(BLUE)])),
    sgroup("G-single", "Single point", rect(10, 220, 40, 40), [shape("shapePath", "SP3", rect(0, 0, 40, 40), [cpt(0.5, 0.5)])], st([colorfill(RED)])),
    sgroup("G-rot-flip", "Rotated and flipped", rect(80, 220, 100, 50), [rshape("R5", 100, 50)], st([colorfill(GREEN)]),
           rotation=-45, isFlippedHorizontal=True, isFlippedVertical=True),
    shape("shapePath", "SP4", rect(210, 220, 100, 80), [cpt(0, 0), cpt(1, 0.5), cpt(0, 1)], style=st([colorfill(BLUE)])),
    sgroup("G-inner", "Offset child", rect(330, 220, 120, 100), [shape("rectangle", "R6", rect(20, 30, 60, 40), square(), rotation=20)],
           st([colorfill(RED)])),
])
write_doc("sketch/primitives-v49.sketch", [page_of("P1", "Page 1", [prims])])


# Groups, nesting, visibility, clipping masks, artboards with and without
# background, an unknown layer class, a layer straight on the page, two pages.
def small(oid, x, y, c, child=None, **kw):
    return sgroup(oid, oid, rect(x, y, 40, 30), [child or rshape(oid + "-r", 40, 30)], st([colorfill(c)]), **kw)


groups_p1 = page_of("P1", "First", [
    board("A1", "No background", rect(0, 0, 400, 300), [
        layer("group", "G1", "Rotated group", rect(10, 10, 120, 80), rotation=15, hasClickThrough=False,
              layers=[small("G1a", 0, 0, RED), small("G1b", 60, 40, BLUE, oshape("G1b-o", 40, 30))]),
        layer("group", "G2", "Flipped group", rect(150, 10, 200, 120), isFlippedVertical=True, layers=[
            small("G2a", 0, 0, GREEN),
            layer("group", "G3", "Hidden locked", rect(50, 50, 100, 60), isVisible=False, isLocked=True, layers=[small("G3a", 10, 10, RED)]),
        ]),
        layer("group", "G4", "Masked", rect(10, 150, 200, 120), layers=[
            sgroup("G4m", "Mask", rect(0, 0, 120, 80), [oshape("G4m-o", 120, 80)], st([colorfill(BLACK)]), hasClippingMask=True),
            small("G4a", 20, 20, RED),
            small("G4b", 60, 40, BLUE, isVisible=False),
        ]),
        layer("slice", "SL1", "Slice", rect(0, 0, 50, 50)),
    ]),
    board("A2", "Background", rect(450, 0, 200, 150), [small("A2a", 10, 10, RED)], bg=color(1, 0.9, 0.8)),
    small("loose", 700, 20, GREEN, rotation=90),
])
groups_p2 = page_of("P2", "Second", [layer("group", "G5", "Plain group", rect(30, 30, 100, 100),
                                           layers=[small("G5a", 0, 0, BLUE), small("G5b", 50, 50, RED)])])
write_doc("sketch/groups-v49.sketch", [groups_p1, groups_p2])


# Boolean groups: uniform and mixed operations, -1 (none), winding rules.
def bool_group(oid, x, ops, **kw):
    kids = []
    for i, op in enumerate(ops):
        make = rshape if i % 2 == 0 else oshape
        k = make("%s-%d" % (oid, i), 50, 40, booleanOperation=op)
        k["frame"] = rect(i * 20, i * 10, 50, 40)
        kids.append(k)
    return sgroup(oid, oid, rect(x, 20, 100, 70), kids, st([colorfill(BLUE)], [border(BLACK, 1, 1)]), **kw)


bools = board("A1", "Booleans", rect(0, 0, 1200, 200), [
    bool_group("B-union", 0, [0, 0]),
    bool_group("B-sub", 120, [1, 1]),
    bool_group("B-int", 240, [2, 2, 2]),
    bool_group("B-xor", 360, [3, 3]),
    bool_group("B-none", 480, [-1, -1]),
    bool_group("B-mixed", 600, [-1, 0]),
    bool_group("B-mixed3", 720, [0, 1, 2]),
    bool_group("B-nonzero", 840, [0, 0], windingRule=0, rotation=10),
    bool_group("B-hidden", 960, [1, 1], isVisible=False),
    # Union first: the old check took 0 as "no operation yet", so this
    # counts as uniform and merges everything with union.
    bool_group("B-union-sub", 1080, [0, 1]),
])
write_doc("sketch/booleans-v49.sketch", [page_of("P1", "Page 1", [bools])])


# Styles and effects.
def grad(gtype, stops, fr="{0.5, 0}", to="{0.5, 1}", **kw):
    g = {"_class": "gradient", "elipseLength": 0, "from": fr, "gradientType": gtype, "shouldSmoothenOpacity": False, "to": to,
         "stops": [{"_class": "gradientStop", "color": c, "position": p} for (p, c) in stops]}
    g.update(kw)
    return g


def gfill(g, **kw): return colorfill(BLACK, fillType=1, gradient=g, **kw)
def ref(name): return {"_class": "MSJSONFileReference", "_ref_class": "MSImageData", "_ref": name}
def ctx(**kw): return dict({"_class": "graphicsContextSettings"}, **kw)


TWO = [(0, RED), (1, BLUE)]


def styled(oid, i, s, child=None, **kw):
    return sgroup(oid, oid, rect((i % 6) * 110, (i // 6) * 100, 90, 70), [child or rshape(oid + "-r", 90, 70)], s, **kw)


def blur(kind, radius, center="{0.5, 0.5}", enabled=True):
    return {"_class": "blur", "isEnabled": enabled, "center": center, "motionAngle": 0, "radius": radius, "type": kind}


styles = board("A1", "Styles", rect(0, 0, 700, 500), [
    styled("borders", 0, st(None, [border(RED, 0, 1), border(GREEN, 1, 2), border(BLUE, 2, 3), border(BLACK, None, 4, isEnabled=False)], miterLimit=4)),
    styled("fills", 1, st([colorfill(RED), colorfill(BLUE, isEnabled=False, contextSettings=ctx(blendMode=2, opacity=0.5)),
                           colorfill(color(0.5, 0.5, 0.5, 0.3), contextSettings=ctx(blendMode=15))])),
    styled("linear", 2, st([gfill(grad(0, [(0, RED), (0.4, GREEN), (1, color(0.2, 0.4, 0.8, 0.5))]))])),
    styled("linear-diag", 3, st([gfill(grad(0, TWO, fr="{0, 0}", to="{1, 1}"))])),
    styled("linear-point", 4, st([gfill(grad(0, TWO, fr="{0.5, 0.5}", to="{0.5, 0.5}"))])),
    styled("radial", 5, st([gfill(grad(1, TWO, fr="{0.5, 0.5}", to="{0.5, 1}", elipseLength=0.5))])),
    styled("radial-round", 6, st([gfill(grad(1, TWO, fr="{0.3, 0.3}", to="{1, 0.3}", elipseLength=1))])),
    styled("radial-zero", 7, st([gfill(grad(1, TWO, fr="{0.5, 0.5}", to="{0.8, 0.9}"))])),
    styled("angular", 8, st([gfill(grad(2, [(0.8, BLUE), (0, RED), (0.3, GREEN), (1, BLACK)]))])),
    styled("bad-fills", 9, st([gfill(grad(3, TWO)), colorfill(GREEN, fillType=2)])),
    styled("noise", 10, st([colorfill(BLACK, fillType=5, noiseIndex=1, noiseIntensity=0.3), colorfill(BLACK, fillType=5, noiseIndex=3)])),
    styled("image-tile", 11, st([colorfill(BLACK, fillType=4, patternFillType=0, patternTileScale=0.5, image=ref("images/img1"))])),
    styled("image-modes", 12, st([colorfill(BLACK, fillType=4, patternFillType=m, image=ref("images/img2")) for m in (1, 2, 3)])),
    styled("layer-blend", 13, st([colorfill(RED)], contextSettings=ctx(blendMode=7, opacity=0.4))),
    styled("layer-blend-default", 14, st([colorfill(RED)], contextSettings=ctx())),
    styled("blur-gauss", 15, st([colorfill(GREEN)], blur=blur(0, 4))),
    styled("blur-zoom", 16, st([colorfill(GREEN)], blur=blur(2, 10, "{0.2, 0.7}"))),
    styled("blur-bg", 17, st([colorfill(GREEN)], blur=blur(3, 6))),
    styled("blur-bg-off", 18, st([colorfill(GREEN)], blur=blur(3, 6, enabled=False))),
    styled("shadows", 19, st([colorfill(BLUE)],
                             shadows=[{"_class": "shadow", "isEnabled": True, "blurRadius": 4, "color": color(0, 0, 0, 0.5), "offsetX": 2, "offsetY": 3, "spread": 0},
                                      {"_class": "shadow", "isEnabled": False, "blurRadius": 1, "color": RED, "offsetX": -1, "offsetY": -1, "spread": 0}],
                             innerShadows=[{"_class": "innerShadow", "isEnabled": True, "blurRadius": 2, "color": GREEN, "offsetX": 1, "offsetY": 1, "spread": 0}],
                             colorControls={"_class": "colorControls", "isEnabled": True, "brightness": 0.2, "contrast": 1.5, "hue": 0.5, "saturation": 2})),
    styled("border-grad", 20, st(None, [border(BLACK, 1, 5, fillType=1, gradient=grad(0, TWO))])),
    styled("bg-color", 21, st([colorfill(RED)]), hasBackgroundColor=True, backgroundColor=color(0, 1, 1, 0.5)),
    styled("oval-styled", 22, st([colorfill(RED)], [border(BLUE, 2, 2)]), oshape("oval-styled-o", 90, 70)),
])
write_doc("sketch/styles-v49.sketch", [page_of("P1", "Page 1", [styles])], files=[("images/img1.png", IMG1), ("images/img2.png", IMG2)])


# Text: NSKeyedArchiver attributed strings with one and several runs, RGB
# and CMYK colours, alignment, line height, missing fonts, a plain string
# styled through textStyle, an NS.string wrapper, broken archives.
class Archive:
    """An NSKeyedArchiver object table; $objects[0] is $null."""

    def __init__(self):
        self.objects = ["$null"]

    def add(self, obj):
        self.objects.append(obj)
        return plistlib.UID(len(self.objects) - 1)

    def map(self, entries):
        keys = [self.add(k) for k in entries]
        return {"NS.keys": keys, "NS.objects": list(entries.values())}

    def encode(self, build):
        root = self.add(None)
        self.objects[root.data] = build(self)
        data = plistlib.dumps({"$archiver": "NSKeyedArchiver", "$objects": self.objects, "$top": {"root": root},
                               "$version": 100000}, fmt=plistlib.FMT_BINARY, sort_keys=False)
        return {"_class": "MSArchiveHeader", "_archive": base64.b64encode(data).decode()}


def font_attr(a, name, size):
    desc = a.add(a.map({"NSFontNameAttribute": a.add(name), "NSFontSizeAttribute": a.add(float(size))}))
    return a.add({"NSFontDescriptorAttributes": desc, "NSFontDescriptorOptions": 0})


def run_style(name, size, space, value, align=None, line=None):
    def build(a):
        entries = {"MSAttributedStringFontAttribute": font_attr(a, name, size),
                   "NSColor": a.add({"NSColorSpace": 1 if space == "NSRGB" else 5, space: value.encode()})}
        if align is not None:
            p = {"NSAlignment": align}
            if line is not None:
                p["NSMaxLineHeight"] = float(line)
            entries["NSParagraphStyle"] = a.add(p)
        return a.map(entries)
    return build


def attributed(runs, wrapper=False):
    """runs: (text, style builder) pairs; several runs get an NSAttributeInfo."""
    def build(a):
        text = "".join(t for t, _ in runs)
        string = a.add({"NS.string": text}) if wrapper else a.add(text)
        if len(runs) == 1:
            return {"NSString": string, "NSAttributes": a.add(runs[0][1](a))}
        refs = [a.add(b(a)) for _, b in runs]
        info = bytearray()
        for i, (t, _) in enumerate(runs):
            info += bytes([len(t), i])
        return {"NSString": string, "NSAttributes": a.add({"NS.objects": refs}), "NSAttributeInfo": a.add({"NS.data": bytes(info)})}
    return {"_class": "MSAttributedString", "archivedAttributedString": Archive().encode(build)}


def text_layer(oid, frame, attr, behaviour=0, **kw):
    return layer("text", oid, oid, frame, attributedString=attr, textBehaviour=behaviour, automaticallyDrawOnUnderlyingPath=False,
                 dontSynchroniseWithSymbol=False, glyphBounds="{{0, 0}, {10, 10}}", heightIsClipped=False, lineSpacingBehaviour=2, **kw)


text_style = {"_class": "textStyle", "encodedAttributes": {
    "NSColor": Archive().encode(lambda a: {"NSColorSpace": 1, "NSRGB": b"0.2 0.4 0.6"}),
    "NSParagraphStyle": Archive().encode(lambda a: {"NSAlignment": 1}),
    "MSAttributedStringFontAttribute": Archive().encode(lambda a: {"NSFontDescriptorAttributes": a.add(a.map({
        "NSFontNameAttribute": a.add("ParitySerif-Italic"), "NSFontSizeAttribute": a.add(14.0)}))}),
}}
texts = board("A1", "Text", rect(0, 0, 600, 400), [
    text_layer("T-single", rect(10, 10, 200, 40), attributed([("Centered bold", run_style("OpenSans-Bold", 24, "NSRGB", "0.1 0.2 0.3 1", 2, 30))])),
    text_layer("T-runs", rect(10, 70, 300, 30), attributed([
        ("Hello ", run_style("Helvetica", 18, "NSRGB", "1 0 0 1", 0)),
        ("Wörld ✓", run_style("OpenSans-Regular", 18, "NSCMYK", "0 0.5 1 0 1", 0)),
        ("!", run_style("ParitySerif-Italic", 20, "NSRGB", "0 0 1 0.5"))]), behaviour=1),
    text_layer("T-plain", rect(10, 120, 200, 30), {"_class": "MSAttributedString", "archivedAttributedString": Archive().encode(
        lambda a: {"NSString": a.add("Plain string")})}, style={"_class": "style", "textStyle": text_style}),
    text_layer("T-wrapper", rect(10, 170, 200, 30), attributed([("Wrapped string", run_style("OpenSans-Light", 12, "NSRGB", "0 0 0 1", 3))], wrapper=True),
               behaviour=2),
    text_layer("T-broken", rect(10, 220, 200, 30), {"_class": "MSAttributedString", "archivedAttributedString": {"_archive": "abc"}}),
    text_layer("T-badplist", rect(10, 260, 200, 30), {"_class": "MSAttributedString", "archivedAttributedString": {
        "_archive": base64.b64encode(b"notaplist-at-all").decode()}}),
    text_layer("T-rotated", rect(300, 200, 160, 40), attributed([("Rotated", run_style("OpenSans-Regular", 16, "NSRGB", "0 0.5 0 1", 4))]),
               behaviour=1, rotation=25),
])
write_doc("sketch/text-v49.sketch", [page_of("P1", "Page 1", [texts])])


# Symbols: masters on their own page, instances with text, image and
# nested symbol overrides, a swapped master, a removed nested symbol, an
# unknown master, the old numeric override format, scaled instances.
def master(oid, sid, frame, layers):
    return layer("symbolMaster", oid, oid, frame, symbolID=sid, style={"_class": "style"}, hasBackgroundColor=False,
                 includeBackgroundColorInExport=True, includeInCloudUpload=True, layers=layers)


def inst(oid, sid, frame, overrides=None, **kw):
    d = layer("symbolInstance", oid, oid, frame, symbolID=sid, style={"_class": "style"}, horizontalSpacing=0, verticalSpacing=0, **kw)
    if overrides is not None:
        d["overrides"] = overrides
    return d


m1 = master("M1", "SYM-1", rect(0, 0, 100, 50), [
    sgroup("M1R", "Back", rect(0, 0, 100, 50), [rshape("M1R-r", 100, 50, fixedRadius=5)], st([colorfill(BLUE)]), resizingConstraint=63),
    sgroup("M1I", "Picture", rect(70, 10, 20, 20), [rshape("M1I-r", 20, 20)],
           st([colorfill(BLACK, fillType=4, patternFillType=1, image=ref("images/img1"))]), resizingConstraint=18, resizingType=1),
    text_layer("M1T", rect(10, 15, 60, 20), attributed([("Label", run_style("OpenSans-Regular", 14, "NSRGB", "1 1 1 1", 2))])),
])
m2 = master("M2", "SYM-2", rect(150, 0, 120, 80), [
    sgroup("M2O", "Oval", rect(0, 0, 120, 80), [oshape("M2O-o", 120, 80)], st([colorfill(GREEN)])),
    inst("M2N", "SYM-1", rect(10, 15, 100, 50)),
])
sym_page = page_of("PS", "Symbols", [m1, m2])
use_page = page_of("P1", "Page 1", [
    inst("I-plain", "SYM-1", rect(0, 0, 100, 50)),
    inst("I-scaled", "SYM-1", rect(0, 80, 200, 100), {"M1T": "Changed", "M1I": ref("images/img2")}),
    inst("I-nested", "SYM-2", rect(250, 0, 120, 80), {"M2N": {"M1T": "Deep"}}),
    inst("I-swap", "SYM-1", rect(250, 100, 120, 80), {"symbolID": "SYM-2"}),
    inst("I-remove", "SYM-2", rect(400, 0, 120, 80), {"M2N": {"symbolID": ""}}),
    inst("I-unknown", "SYM-X", rect(400, 100, 50, 50)),
    inst("I-numeric", "SYM-1", rect(0, 200, 100, 50), {"0": {"M1T": "Old format"}}, rotation=20),
    inst("I-missing-key", "SYM-1", rect(150, 200, 100, 50), {"NOPE": "x"}),
])
write_doc("sketch/symbols-v49.sketch", [sym_page, use_page], files=[("images/img1.png", IMG1), ("images/img2.png", IMG2)])

# Bitmaps.
bitmaps = board("A1", "Bitmaps", rect(0, 0, 400, 300), [
    layer("bitmap", "BM1", "Image", rect(10, 10, 80, 40), image=ref("images/img1"), style=st()),
    layer("bitmap", "BM2", "Rotated image", rect(120, 10, 60, 60), image=ref("images/img2"), rotation=45, isFlippedHorizontal=True,
          style=st(None, [border(RED, 1, 2)])),
    layer("bitmap", "BM3", "Missing image", rect(200, 10, 50, 50), image=ref("images/nothere"), style=st()),
    layer("group", "BG", "Group with image", rect(10, 100, 200, 120), rotation=10,
          layers=[layer("bitmap", "BM4", "Inner", rect(20, 20, 100, 50), image=ref("images/img2"), style=st())]),
])
write_doc("sketch/bitmaps-v49.sketch", [page_of("P1", "Page 1", [bitmaps])], files=[("images/img1.png", IMG1), ("images/img2.png", IMG2)])

# Broken inputs.
with open(os.path.join(OUT, "sketch/not-a-zip.sketch"), "wb") as f:
    f.write(b"This is not a zip file, just some text that is long enough. " * 2)
write_doc("sketch/no-meta-v49.sketch", [page_of("P1", "Page 1", [])], meta=False)
write_doc("sketch/no-pages-v49.sketch", [])
# The texts that parse; text-v49 with late fonts fails to save its broken ones.
valid = dict(texts)
valid["layers"] = [l for l in texts["layers"] if l["do_objectID"] not in ("T-broken", "T-badplist")]
write_doc("sketch/text-valid-v49.sketch", [page_of("P1", "Page 1", [valid])])
