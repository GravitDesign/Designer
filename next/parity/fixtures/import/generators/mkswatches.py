# Regenerates swatches/three.gvswatch (a gzipped serialized GSwatches node,
# the format of the pattern chooser's Export Swatches) and misc/drawing.cdr
# (a file with the CorelDRAW extension the app has no importer for).
# Usage: python mkswatches.py <fixtures/import dir>
import gzip, json, os, sys
OUT = sys.argv[1]
radial = json.dumps({"s": 0.5, "fx": 0.5, "fy": 0.5, "x": [
    {"p": 0, "c": "C#[255,255,255]", "o": 1}, {"p": 1, "c": "C#[200,0,120]", "o": 1}]}, separators=(",", ":"))
doc = {"@": "swatches", "@id": "fxSw01", "$": [
    {"@": "swatch", "@id": "fxSwA1", "_pt": "C#[10,20,30]"},
    {"@": "swatch", "@id": "fxSwB2", "_pt": "C#[0,160,80]"},
    {"@": "swatch", "@id": "fxSwC3", "_pt": "R#" + radial},
    # the same colour twice: the import skips swatches that already exist
    {"@": "swatch", "@id": "fxSwD4", "_pt": "C#[10,20,30]"},
]}
with open(os.path.join(OUT, "swatches", "three.gvswatch"), "wb") as f:
    f.write(gzip.compress(json.dumps(doc, separators=(",", ":")).encode(), 9, mtime=0))
with open(os.path.join(OUT, "misc", "drawing.cdr"), "wb") as f:
    f.write(b"CDR\x00not a real CorelDRAW file\n")
