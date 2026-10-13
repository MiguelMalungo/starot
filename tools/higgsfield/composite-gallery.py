"""Lays exact STAROT designs onto clean Higgsfield plates (no AI redrawing of symbols).

   python3 tools/higgsfield/composite-gallery.py [name ...]

Each job: plate (media/gallery/raw), design (media/designs/...), output name, centre (x, y) on
the plate, width in px, x/y squash for the curve of the body, rotation in degrees
(counter-clockwise), layout ("as drawn", or "stack": a row of symbols restacked upright), and
an optional crop. Same ink model as the other compositors: the design's alpha, softened, with a
little grain, multiplied into the skin so its texture shows through."""
import sys
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "media/gallery/raw"
DES = ROOT / "media/designs"
MAYA = DES / "maya-example"            # 12 Kib, born 17 March 1992: day sign, tone, trecena, cross

JOBS = {
    # the Maya count
    "maya-day-chest-man":      ("chest-plate-man-v25.png", MAYA / "maya-day.png", (1300, 1150), 250, 1, 1, 0, None, None),
    "maya-trecena-back-woman": ("back-plate-woman-v25.png", MAYA / "maya-trecena.png", (932, 1190), 220, 1, 1, 0, None, None),
    "maya-tone-forearm-woman": ("forearm-upper-plate-woman-v24.png", MAYA / "maya-tone.png", (1600, 875), 220, 1, .92, 11, None, None),
    "maya-cross-deltoid-man":  ("deltoid-plate-man-v24.png", MAYA / "maya-cross.png", (1050, 1180), 640, .9, 1, 0, None, None),
    # the sky
    "wheel-thigh-woman":       ("thigh-plate-woman-v25.png", DES / "design-1-natal-wheel.png", (975, 1360), 330, 1, .86, 29, None, None),
    "line-forearm-man":        ("forearm-plate-man-v24.png", DES / "design-4-sun-and-rising-gemini-leo.png", (1400, 1010), 490, 1, 1, -2, None, None),
    "line-neck-side-woman":    ("neck-side-plate-woman-v24.png", DES / "design-4-sun-and-rising-gemini-leo.png", (965, 1265), 300, 1, 1, -8, "stack", None),
}
INK = (26, 28, 34)
STRENGTH = 1.6
OPACITY = 0.92

def stack(a):
    """Split a row of symbols at its empty columns and stack them, upright, top to bottom."""
    cols = [a.crop((x, 0, x + 1, a.height)).getbbox() is not None for x in range(a.width)]
    parts, start = [], None
    for x, ink in enumerate(cols + [False]):
        if ink and start is None:
            start = x
        elif not ink and start is not None:
            p = a.crop((start, 0, x, a.height)); parts.append(p.crop(p.getbbox())); start = None
    tall = max(p.height for p in parts); gap = round(tall * .3); w = max(p.width for p in parts)
    out = Image.new("L", (w, sum(p.height for p in parts) + gap * (len(parts) - 1)), 0); y = 0
    for p in parts:
        out.paste(p, ((w - p.width) // 2, y)); y += p.height + gap
    return out

def ink_layer(path, size, sx, sy, angle, layout):
    a = Image.open(path).convert("RGBA").getchannel("A")
    a = a.crop(a.getbbox())
    if layout == "stack":          # size is the height of the stack
        a = stack(a); w, h = round(a.width * size / a.height), size
    else:                          # size is the width
        w, h = size, round(a.height * size / a.width)
    a = a.resize((max(1, round(w * sx)), max(1, round(h * sy))), Image.LANCZOS)
    a = a.rotate(angle, resample=Image.BICUBIC, expand=True)
    a = a.filter(ImageFilter.GaussianBlur(0.9))
    noise = Image.effect_noise(a.size, 22).filter(ImageFilter.GaussianBlur(1.2))
    return ImageChops.multiply(a, noise.point(lambda v: 205 + v * 50 // 255))

tint = tuple(min(255, round(c * STRENGTH)) for c in INK)
for name in (sys.argv[1:] or JOBS):
    plate, design, (cx, cy), size, sx, sy, angle, layout, crop = JOBS[name]
    base = Image.open(RAW / plate).convert("RGB")
    a = ink_layer(design, size, sx, sy, angle, layout).point(lambda v: round(v * OPACITY))
    x, y = cx - a.width // 2, cy - a.height // 2
    region = base.crop((x, y, x + a.width, y + a.height))
    inked = ImageChops.multiply(region, Image.new("RGB", a.size, tint))
    base.paste(Image.composite(inked, region, a), (x, y))
    if crop:
        base = base.crop(crop)
    base.save(RAW / f"{name}.png")
    print(RAW / f"{name}.png")
