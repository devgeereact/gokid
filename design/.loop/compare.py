"""Band-compare a simulator screenshot against the reference, in normalised pt.

Both images are reduced to a table of vertical content bands (rows that are not the flat
background). Reference = 393x852pt. The shot is whatever the sim is; we normalise by width.
"""

import sys
from PIL import Image

REF = "/Users/gideonakinlotan/WebstormProjects/gokid/design/GoKid-auth-screen.png"
SHOT = sys.argv[1]
SHOT_PT_W = float(sys.argv[2]) if len(sys.argv) > 2 else 402.0  # iPhone 17 Pro logical width


def bands(path, pt_w, bg=None, tol=8, min_h=3, margin_frac=0.05):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    px = im.load()
    S = W / pt_w
    if bg is None:
        bg = px[W // 2, int(H * 0.11)]
    x0m = int(W * margin_frac)
    x1m = W - x0m

    def near(c):
        return all(abs(c[i] - bg[i]) <= tol for i in range(3))

    out, cur = [], None
    for y in range(H):
        xs = [x for x in range(x0m, x1m, 2) if not near(px[x, y])]
        if xs:
            if cur is None:
                cur = [y, y, min(xs), max(xs)]
            else:
                cur[1] = y
                cur[2] = min(cur[2], min(xs))
                cur[3] = max(cur[3], max(xs))
        else:
            if cur:
                out.append(cur)
            cur = None
    if cur:
        out.append(cur)
    res = []
    for y0, y1, bx0, bx1 in out:
        if y1 - y0 + 1 < min_h * S:
            continue
        res.append(
            dict(
                y0=y0 / S, y1=y1 / S, h=(y1 - y0 + 1) / S,
                x0=bx0 / S, x1=bx1 / S, w=(bx1 - bx0 + 1) / S,
            )
        )
    return res, bg, S, (W, H)


rb, rbg, rs, rsize = bands(REF, 393.0)
sb, sbg, ss, ssize = bands(SHOT, SHOT_PT_W)

print(f"REF  {rsize} bg={'#%02X%02X%02X' % rbg}  {len(rb)} bands  (393pt wide)")
print(f"SHOT {ssize} bg={'#%02X%02X%02X' % sbg}  {len(sb)} bands  ({SHOT_PT_W:.0f}pt wide)")
print()
print(f"{'REFERENCE':<44} | {'SCREENSHOT':<44}")
print("-" * 92)
for i in range(max(len(rb), len(sb))):
    r = rb[i] if i < len(rb) else None
    s = sb[i] if i < len(sb) else None
    rt = f"y {r['y0']:6.1f}-{r['y1']:6.1f} h{r['h']:5.1f}  x {r['x0']:5.1f}-{r['x1']:5.1f}" if r else ""
    st = f"y {s['y0']:6.1f}-{s['y1']:6.1f} h{s['h']:5.1f}  x {s['x0']:5.1f}-{s['x1']:5.1f}" if s else ""
    print(f"{rt:<44} | {st:<44}")
