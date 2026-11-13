"""Teams 앱 아이콘(color 192x192, outline 32x32)을 외부 라이브러리 없이 만든다."""
import struct, zlib, sys, os

def png(path, w, h, px):
    raw = b''.join(b'\x00' + bytes(px[y*w*4:(y+1)*w*4]) for y in range(h))
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) \
        + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    open(path, 'wb').write(data)

def render(w, h, shade, ss=4):
    px = [0] * (w * h * 4)
    for y in range(h):
        for x in range(w):
            acc = [0, 0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    c = shade((x + (sx + .5) / ss) / w, (y + (sy + .5) / ss) / h)
                    if c:
                        a = c[3] / 255
                        for i in range(3): acc[i] += c[i] * a
                        acc[3] += a
            n = ss * ss
            if acc[3]:
                px[(y*w+x)*4:(y*w+x)*4+4] = [round(acc[0]/acc[3]), round(acc[1]/acc[3]), round(acc[2]/acc[3]), round(acc[3]/n*255)]
    return px

MARBLES = [(.34, .40, .17, (255, 196, 61)), (.64, .36, .14, (255, 99, 132)), (.50, .68, .19, (72, 214, 168))]

def color(u, v):
    for cx, cy, r, (R, G, B) in MARBLES:
        d2 = (u-cx)**2 + (v-cy)**2
        if d2 <= r*r:
            hl = ((u-(cx-r*.35))**2 + (v-(cy-r*.35))**2) ** .5 / r  # 하이라이트
            k = max(0, 1 - hl) * .55
            return (round(R + (255-R)*k), round(G + (255-G)*k), round(B + (255-B)*k), 255)
    return (91, 95, 199, 255)  # Teams 보라

def outline(u, v):
    for cx, cy, r, _ in MARBLES:
        d = ((u-cx)**2 + (v-cy)**2) ** .5
        if d <= r and d >= r - .07:
            return (255, 255, 255, 255)
    return None

out = sys.argv[1]
png(os.path.join(out, 'color.png'), 192, 192, render(192, 192, color, 2))
png(os.path.join(out, 'outline.png'), 32, 32, render(32, 32, outline, 6))
print('ok')
