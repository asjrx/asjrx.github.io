#!/usr/bin/env python3
"""Draw the ASJ mark at any size.

There was no source for this icon - only a 256x256 PNG - so a Telegram profile
picture meant upscaling and losing it. It is drawn from numbers now, so any size
is exact. Rendered at 2048 and downsampled once, which is the antialiasing.

    ./make-icon.py 512 out.png        # Telegram wants 512, and crops to a circle

The ring reaches the edge on purpose: a circular crop then takes the whole mark
instead of eating a margin.
"""
import sys
from PIL import Image, ImageDraw

SS = 2048
# sampled off the original: indigo at the top left, magenta right, coral bottom right
STOPS = [(0.00, (79, 91, 213)), (0.18, (150, 60, 220)), (0.38, (200, 55, 215)),
         (0.58, (226, 64, 154)), (0.74, (240, 112, 90)), (0.88, (205, 60, 200)),
         (1.00, (79, 91, 213))]


def ring_colour(t):
    for i in range(len(STOPS) - 1):
        a, ca = STOPS[i]
        b, cb = STOPS[i + 1]
        if a <= t <= b:
            f = (t - a) / (b - a)
            return tuple(round(ca[j] + (cb[j] - ca[j]) * f) for j in range(3))
    return STOPS[-1][1]


def draw(size, path, circular=True):
    img = Image.new("RGBA", (SS, SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = SS / 2

    r_out = c - 8
    r_in = r_out - SS * 0.072
    for k in range(2160):                       # fine arcs so the gradient reads continuous
        a0 = k * (360 / 2160) - 135
        d.pieslice([c - r_out, c - r_out, c + r_out, c + r_out],
                   a0, a0 + (360 / 2160) + 0.35, fill=ring_colour(k / 2160))
    d.ellipse([c - r_in, c - r_in, c + r_in, c + r_in], fill=(233, 233, 233, 255))

    ink, w = (51, 51, 51, 255), SS * 0.103
    half, drop, gap = SS * 0.212, SS * 0.125, SS * 0.088
    for cy in (c - gap, c + gap):
        pts = [(c - half, cy - drop / 2), (c, cy + drop / 2), (c + half, cy - drop / 2)]
        d.line(pts, fill=ink, width=round(w), joint="curve")
        for px, py in pts:                      # PIL has no round line cap; these are the caps
            d.ellipse([px - w / 2, py - w / 2, px + w / 2, py + w / 2], fill=ink)

    out = img.resize((size, size), Image.LANCZOS)
    if circular:
        mask = Image.new("L", (SS, SS), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, SS - 1, SS - 1], fill=255)
        out.putalpha(mask.resize((size, size), Image.LANCZOS))
    out.save(path)
    print(f"wrote {path} at {size}x{size}")


if __name__ == "__main__":
    draw(int(sys.argv[1]) if len(sys.argv) > 1 else 512,
         sys.argv[2] if len(sys.argv) > 2 else "icon.png")
