# Builds raster/photo.heic: HEVC still from raster/photo.jpg (ffmpeg -i photo.jpg -frames:v 1 -c:v libx265 -pix_fmt yuv420p -f hevc img.hevc)
# wrapped in a hand-built HEIF container. Usage: python mkheic.py <out.heic> (img.hevc in the cwd)
import struct, sys
data = open('img.hevc', 'rb').read()
# split Annex B
nals = []; i = 0
idx = [j for j in range(len(data) - 3) if data[j:j+3] == b'\x00\x00\x01']
for k, s in enumerate(idx):
    e = idx[k+1] if k + 1 < len(idx) else len(data)
    n = data[s+3:e]
    while n.endswith(b'\x00'): n = n[:-1]
    nals.append(n)
typ = lambda n: (n[0] >> 1) & 0x3f
vps = [n for n in nals if typ(n) == 32]; sps = [n for n in nals if typ(n) == 33]; pps = [n for n in nals if typ(n) == 34]
slices = [n for n in nals if typ(n) < 32]
print([typ(n) for n in nals])
def rbsp(n):
    out = bytearray(); z = 0
    for b in n:
        if z >= 2 and b == 3: z = 0; continue
        out.append(b); z = z + 1 if b == 0 else 0
    return bytes(out)
s = rbsp(sps[0])
ptl = s[3:3+12]  # after 2-byte NAL header and 1 byte (vps id, max sub layers, nesting)
W, H = 80, 60
def box(t, payload): return struct.pack('>I', 8 + len(payload)) + t + payload
def full(t, v, f, payload): return box(t, struct.pack('>I', (v << 24) | f) + payload)
hvcc = bytes([1]) + ptl[0:1] + ptl[1:5] + ptl[5:11] + ptl[11:12]
hvcc += struct.pack('>H', 0xF000) + bytes([0xFC, 0xFD, 0xF8, 0xF8]) + struct.pack('>H', 0) + bytes([0x0F])
arrays = [(32, vps), (33, sps), (34, pps)]
hvcc += bytes([len(arrays)])
for t, lst in arrays:
    hvcc += bytes([0x80 | t]) + struct.pack('>H', len(lst))
    for n in lst: hvcc += struct.pack('>H', len(n)) + n
mdat_payload = b''.join(struct.pack('>I', len(n)) + n for n in slices)
ftyp = box(b'ftyp', b'heic' + struct.pack('>I', 0) + b'mif1heic')
hdlr = full(b'hdlr', 0, 0, struct.pack('>I', 0) + b'pict' + b'\x00' * 12 + b'\x00')
pitm = full(b'pitm', 0, 0, struct.pack('>H', 1))
infe = full(b'infe', 2, 0, struct.pack('>HH', 1, 0) + b'hvc1' + b'\x00')
iinf = full(b'iinf', 0, 0, struct.pack('>H', 1) + infe)
ispe = full(b'ispe', 0, 0, struct.pack('>II', W, H))
ipco = box(b'ipco', box(b'hvcC', hvcc) + ispe)
ipma = full(b'ipma', 0, 0, struct.pack('>I', 1) + struct.pack('>H', 1) + bytes([2, 0x81, 0x02]))
iprp = box(b'iprp', ipco + ipma)
def build(offset):
    iloc = full(b'iloc', 0, 0, bytes([0x44, 0x00]) + struct.pack('>H', 1) + struct.pack('>HHH', 1, 0, 1) + struct.pack('>II', offset, len(mdat_payload)))
    meta = full(b'meta', 0, 0, hdlr + pitm + iloc + iinf + iprp)
    return ftyp + meta
head = build(0)
off = len(head) + 8
out = build(off) + box(b'mdat', mdat_payload)
open(sys.argv[1], 'wb').write(out)
print(len(out))
