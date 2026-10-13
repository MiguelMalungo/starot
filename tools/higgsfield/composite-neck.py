"""Lays the exact STAROT one-line design (☉ sign · ↑ sign) onto clean Higgsfield neck plates.

   python3 tools/higgsfield/composite-neck.py

The image model keeps turning the ascendant arrow into ♐, so, as with the hands, the
plates are bare skin and the real design file is inked on here. Same ink model as
composite-hands.py: the design's alpha, softened, multiplied into the skin."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "media/gallery/raw"
DES = ROOT / "media/designs"
DESIGN = DES / "design-4-sun-and-rising-gemini-leo.png"

# plate, output, centre (x, y), size in px (row width, or stack height), rotation in degrees,
# layout ("row" as drawn, or "stack": the symbols upright, one under the other), crop box or None
PLACES = [
    ("neck-plate-man-v13.png", "neck-composite-man.png", (895, 1370), 330, 0, "row", None),
    # hers runs down the side of the neck below the right ear, behind the jaw; close-up crop
    ("neck-plate-woman-clean.png", "ear-composite-woman.png", (1158, 850), 290, 2, "stack", (850, 0, 1726, 1100)),
]
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
            part = a.crop((start, 0, x, a.height)); parts.append(part.crop(part.getbbox())); start = None
    tall = max(p.height for p in parts)
    gap = round(tall * .3)
    w = max(p.width for p in parts)
    out = Image.new("L", (w, sum(p.height for p in parts) + gap * (len(parts) - 1)), 0)
    y = 0
    for p in parts:
        out.paste(p, ((w - p.width) // 2, y)); y += p.height + gap
    return out

def ink_layer(path, size, angle, layout="row"):
    a = Image.open(path).convert("RGBA").getchannel("A")
    a = a.crop(a.getbbox())
    if layout == "stack":
        a = stack(a)
        a = a.resize((round(a.width * size / a.height), size), Image.LANCZOS)
    else:
        a = a.resize((size, round(a.height * size / a.width)), Image.LANCZOS)
    a = a.rotate(angle, resample=Image.BICUBIC, expand=True)
    a = a.filter(ImageFilter.GaussianBlur(0.9))
    noise = Image.effect_noise(a.size, 22).filter(ImageFilter.GaussianBlur(1.2))
    return ImageChops.multiply(a, noise.point(lambda v: 205 + v * 50 // 255))

tint = tuple(min(255, round(c * STRENGTH)) for c in INK)
for plate, out, (cx, cy), size, angle, layout, crop in PLACES:
    if not (RAW / plate).exists():
        continue
    base = Image.open(RAW / plate).convert("RGB")
    a = ink_layer(DESIGN, size, angle, layout).point(lambda v: round(v * OPACITY))
    x, y = cx - a.width // 2, cy - a.height // 2
    region = base.crop((x, y, x + a.width, y + a.height))
    inked = ImageChops.multiply(region, Image.new("RGB", a.size, tint))
    base.paste(Image.composite(inked, region, a), (x, y))
    if crop:
        base = base.crop(crop)
    base.save(RAW / out)
    print(RAW / out)
