# Regenerates the hand-written import fixtures. Usage: python mkpdf.py <fixtures/import dir>
import zlib, sys, os
OUT = sys.argv[1]
def pdf(objs, root=1, info=None):
    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offs = []
    for i, o in enumerate(objs, 1):
        offs.append(len(out))
        out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
    for o in offs: out += b"%010d 00000 n \n" % o
    tr = b"<< /Size %d /Root %d 0 R" % (len(objs) + 1, root)
    if info: tr += b" /Info %d 0 R" % info
    out += b"trailer\n" + tr + b" >>\nstartxref\n%d\n%%%%EOF\n" % x
    return bytes(out)
def stream(data, extra=b"", compress=True):
    if compress:
        d = zlib.compress(data, 9); return b"<< /Length %d /Filter /FlateDecode %s>>\nstream\n" % (len(d), extra) + d + b"\nendstream"
    return b"<< /Length %d %s>>\nstream\n" % (len(data), extra) + data + b"\nendstream"
k = 0.5523
def circle(cx, cy, r):
    c = r * k
    return (f"{cx+r} {cy} m {cx+r} {cy+c} {cx+c} {cy+r} {cx} {cy+r} c {cx-c} {cy+r} {cx-r} {cy+c} {cx-r} {cy} c "
            f"{cx-r} {cy-c} {cx-c} {cy-r} {cx} {cy-r} c {cx+c} {cy-r} {cx+r} {cy-c} {cx+r} {cy} c h").encode()
# 1) vector, two pages, text with a standard font, shading, alpha, dash
c1 = b"\n".join([
  b"0.86 0.16 0.16 rg 20 120 100 60 re f",
  b"0 0 0 RG 3 w 20 120 100 60 re S",
  b"q 0.2 0.4 0.8 rg /GS1 gs 150 110 m 280 110 l 215 190 l h f Q",
  b"q 0 0.5 0 RG 4 w [6 3] 0 d 1 J 1 j 20 90 m 120 60 180 100 280 70 c S Q",
  b"q 1 0 0 1 0 0 cm 20 20 120 30 re W n /Sh1 sh Q",
  b"BT /F1 18 Tf 0.1 0.1 0.1 rg 160 30 Td (Hello PDF) Tj ET",
  b"BT /F2 12 Tf 0.6 0 0.6 rg 160 12 Td (Times Roman) Tj ET",
])
c2 = b"\n".join([
  b"0.95 0.85 0.2 rg " + circle(100, 100, 70) + b" f",
  b"0.3 0.3 0.3 RG 2 w " + circle(100, 100, 40) + b" S",
  b"0 0 1 0 k 40 20 40 20 re f",
  b"0.5 g 120 20 40 20 re f",
])
objs = [
  b"<< /Type /Catalog /Pages 2 0 R >>",
  b"<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
  b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 5 0 R /Resources << /Font << /F1 7 0 R /F2 8 0 R >> /ExtGState << /GS1 9 0 R >> /Shading << /Sh1 10 0 R >> >> >>",
  b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 6 0 R /Resources << >> >>",
  stream(c1), stream(c2),
  b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  b"<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>",
  b"<< /Type /ExtGState /ca 0.5 /CA 0.5 >>",
  b"<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [20 0 140 0] /Function << /FunctionType 2 /Domain [0 1] /C0 [1 0 0] /C1 [0 0 1] /N 1 >> /Extend [true true] >>",
]
open(os.path.join(OUT, "pdf/vector-2pages.pdf"), "wb").write(pdf(objs))
# 2) images: Flate RGB with SMask, and DCT
jpg = open(os.path.join(OUT, "raster/photo.jpg"), "rb").read()
w = h = 8
rgb = bytearray(); alpha = bytearray()
for y in range(h):
    for x in range(w):
        rgb += bytes([x * 32, y * 32, 128]); alpha.append(255 if (x + y) % 3 else 60)
c3 = b"q 120 0 0 120 20 60 cm /Im1 Do Q q 160 0 0 120 160 60 cm /Im2 Do Q 0 0 0 RG 1 w 10 10 m 330 10 l S"
objs = [
  b"<< /Type /Catalog /Pages 2 0 R >>",
  b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 340 200] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R /Im2 6 0 R >> >> >>",
  stream(c3),
  stream(bytes(rgb), b"/Type /XObject /Subtype /Image /Width 8 /Height 8 /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask 7 0 R "),
  b"<< /Type /XObject /Subtype /Image /Width 80 /Height 60 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length %d >>\nstream\n" % len(jpg) + jpg + b"\nendstream",
  stream(bytes(alpha), b"/Type /XObject /Subtype /Image /Width 8 /Height 8 /ColorSpace /DeviceGray /BitsPerComponent 8 "),
]
open(os.path.join(OUT, "pdf/images.pdf"), "wb").write(pdf(objs))
# 3) AI (PDF compatible): XMP with dc:format illustrator
xmp = b'''<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?><x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:format>application/vnd.adobe.illustrator</dc:format></rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>'''
c4 = b"0.1 0.6 0.9 rg 30 30 140 80 re f 0.9 0.3 0.1 rg " + circle(150, 110, 40) + b" f"
objs = [
  b"<< /Type /Catalog /Pages 2 0 R /Metadata 5 0 R >>",
  b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 220 160] /Contents 4 0 R /Resources << >> >>",
  stream(c4),
  stream(xmp, b"/Type /Metadata /Subtype /XML ", compress=False),
]
open(os.path.join(OUT, "misc/pdf-compatible.ai"), "wb").write(pdf(objs))
# same content without the XMP: a plain PDF saved as .ai
objs2 = objs[:4]
objs2[0] = b"<< /Type /Catalog /Pages 2 0 R >>"
open(os.path.join(OUT, "misc/plain-pdf.ai"), "wb").write(pdf(objs2))
open(os.path.join(OUT, "pdf/plain.pdf"), "wb").write(pdf(objs2))
open(os.path.join(OUT, "pdf/broken.pdf"), "wb").write(b"%PDF-1.4\nthis is not a pdf body\n%%EOF\n")
