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
