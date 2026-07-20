"""
Re-frames the preset avatar cutouts so they actually fill their disc.

The originals were badly composed: the fox had a stray full-height artifact line at x=0 and the animal
itself crammed into the right ~55% of the frame; the elephant wasted 19% on the left. Because the
stray pixels reached the frame edge, a normal alpha-bbox trim did nothing — so `contentFit="cover"`
scaled the whole (mostly empty) frame and the animal rendered small and off-centre inside the ring,
instead of filling it the way design/GoKid-addchild-screen.png shows.

Fix: find the LARGEST CONTIGUOUS run of dense rows/columns (which ignores isolated artifact lines),
crop to it, then re-pad onto a square transparent canvas with a small even margin. Square keeps
`cover` and `contain` both well-behaved, and centring means the animal sits in the middle of the ring.
Transparency is preserved, so the art still works on the home cards' per-child washes.
"""

from PIL import Image
import shutil
import os

ASSETS = "assets/images"
FILES = ["gokid-cut-fox.png", "gokid-cut-elephant.png", "gokid-lion.png"]
# Margin as a fraction of the square canvas, so the animal has a little breathing room in the ring.
MARGIN = 0.04


def runs(density, threshold):
    """Contiguous index runs where density exceeds threshold."""
    out, start = [], None
    for i, v in enumerate(density):
        if v > threshold:
            if start is None:
                start = i
        elif start is not None:
            out.append((start, i - 1))
            start = None
    if start is not None:
        out.append((start, len(density) - 1))
    return out


def widest(density, threshold=0.02):
    r = runs(density, threshold)
    if not r:
        return 0, len(density) - 1
    return max(r, key=lambda ab: ab[1] - ab[0])


for name in FILES:
    path = os.path.join(ASSETS, name)
    im = Image.open(path).convert("RGBA")
    w, h = im.size
    alpha = im.split()[-1].load()

    cols = [sum(1 for y in range(h) if alpha[x, y] > 40) / h for x in range(w)]
    rows = [sum(1 for x in range(w) if alpha[x, y] > 40) / w for y in range(h)]

    l, r = widest(cols)
    t, b = widest(rows)
    cropped = im.crop((l, t, r + 1, b + 1))
    cw, ch = cropped.size

    # Square canvas sized to the longer edge plus margin, animal centred.
    side = int(max(cw, ch) * (1 + MARGIN * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(cropped, ((side - cw) // 2, (side - ch) // 2), cropped)

    backup = path.replace(".png", "-original.png")
    if not os.path.exists(backup):
        shutil.copy2(path, backup)
    canvas.save(path)

    print(f"{name}: {w}x{h} -> content {cw}x{ch} -> square {side}x{side}  (backup: {os.path.basename(backup)})")
