# Writes the io-import-sketch fixtures that parity/fixtures/import/generators/
# mksketch.py doesn't: symbol edge cases and a PDF image fill.
# Usage: python mkfixtures.py <scratch dir>
# The scratch dir receives mksketch.py's own fixtures (its helpers run at
# import time); the new files go to parity/fixtures/import/sketch.
import os
import runpy
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
FIXTURES = os.path.join(NEXT, "parity", "fixtures", "import")
GENERATOR = os.path.join(FIXTURES, "generators", "mksketch.py")

scratch = sys.argv[1]
os.makedirs(os.path.join(scratch, "sketch"), exist_ok=True)
sys.argv = [GENERATOR, scratch]
g = runpy.run_path(GENERATOR)
g["write_doc"].__globals__["OUT"] = FIXTURES

rect, color, ref, st, colorfill = g["rect"], g["color"], g["ref"], g["st"], g["colorfill"]
layer, sgroup, rshape, oshape = g["layer"], g["sgroup"], g["rshape"], g["oshape"]
page_of, board, master, inst = g["page_of"], g["board"], g["master"], g["inst"]
text_layer, attributed, run_style = g["text_layer"], g["attributed"], g["run_style"]
write_doc, IMG1, IMG2 = g["write_doc"], g["IMG1"], g["IMG2"]
RED, GREEN, BLUE = g["RED"], g["GREEN"], g["BLUE"]

# Symbols: a master with a bitmap layer (the instance waits for the image
# before it scales), a layer pinned to a corner (resizingType 1) that
# moves when an instance has another height, and a centred auto-width
# text (textBehaviour 0) whose override is wider than its frame.
m3 = master("M3", "SYM-3", rect(0, 0, 120, 60), [
    sgroup("M3R", "Back", rect(0, 0, 120, 60), [rshape("M3R-r", 120, 60)], st([colorfill(BLUE)]), resizingConstraint=63),
    layer("bitmap", "M3B", "Picture", rect(80, 10, 30, 15), image=ref("images/img1"), style=st()),
    sgroup("M3P", "Pinned", rect(10, 40, 20, 15), [oshape("M3P-o", 20, 15)], st([colorfill(RED)]),
           resizingConstraint=9, resizingType=1),
    text_layer("M3T", rect(10, 10, 60, 20), attributed([("Label", run_style("OpenSans-Regular", 14, "NSRGB", "1 1 1 1", 2))])),
])
m4 = master("M4", "SYM-4", rect(200, 0, 100, 50), [
    sgroup("M4R", "Back", rect(0, 0, 100, 50), [rshape("M4R-r", 100, 50)], st([colorfill(GREEN)])),
    sgroup("M4P", "Pinned", rect(60, 30, 30, 15), [rshape("M4P-r", 30, 15)], st([colorfill(RED)]), resizingType=1),
    text_layer("M4T", rect(10, 15, 40, 20), attributed([("Mid", run_style("OpenSans-Regular", 14, "NSRGB", "0 0 0 1", 2))])),
])
sym_page = page_of("PS", "Symbols", [m3, m4])
use_page = page_of("P1", "Page 1", [
    inst("I-image", "SYM-3", rect(0, 0, 120, 60)),
    inst("I-taller", "SYM-3", rect(0, 100, 120, 150), {"M3T": "A much longer override than the frame"}),
    inst("I-image-override", "SYM-3", rect(150, 100, 240, 120), {"M3B": ref("images/img2")}),
    inst("I-pinned", "SYM-4", rect(150, 0, 100, 25)),
    inst("I-pinned-wide", "SYM-4", rect(300, 0, 150, 100), {"M4T": "Override wider than its frame"}),
])
write_doc("sketch/symbols-edge-v49.sketch", [sym_page, use_page],
          files=[("images/img1.png", IMG1), ("images/img2.png", IMG2)])

# An image fill whose image is a PDF (rendered through pdf.js) next to a
# PNG fill.
PDF = (b"%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
       b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
       b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 20 10] /Contents 4 0 R >> endobj\n"
       b"4 0 obj << /Length 23 >> stream\n1 0 0 rg 0 0 10 10 re f\nendstream endobj\n"
       b"trailer << /Root 1 0 R >>\n%%EOF\n")
images = board("A1", "PDF image", rect(0, 0, 300, 120), [
    sgroup("PDF-fill", "PDF fill", rect(10, 10, 100, 60), [rshape("PDF-fill-r", 100, 60)],
           st([colorfill(color(0, 0, 0), fillType=4, patternFillType=1, image=ref("images/doc"))])),
    sgroup("PNG-fill", "PNG fill", rect(150, 10, 100, 60), [rshape("PNG-fill-r", 100, 60)],
           st([colorfill(color(0, 0, 0), fillType=4, patternFillType=1, image=ref("images/img1"))])),
])
write_doc("sketch/pdf-image-v49.sketch", [page_of("P1", "Page 1", [images])],
          files=[("images/doc.pdf", PDF), ("images/img1.png", IMG1)])
