"""Lays the exact STAROT hand designs onto a clean Higgsfield plate (no AI redrawing of symbols).

   python3 tools/higgsfield/composite-hands.py

Each pair is restacked upright — the sign by the knuckle, ☉ or ↑ by the wrist — scaled to ~3 cm,
and turned so the stack points the way the index finger points (the ascendant arrow points where
the finger points). The ink is multiplied into the skin with a slightly soft edge, the way healed
fine-line ink looks. The stacked layouts are also saved as the *-along.png design files.
Positions and angles are measured on hands-plate-v10.png (2496 x 1664)."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "media/gallery/raw"
DES = ROOT / "media/designs"
PLATE = RAW / "hands-plate-v10.png"

# design file, centre (x, y), length of the stack in px (~3 cm on that hand), direction of the index finger
# in degrees (counter-clockwise from pointing right); measured on the plate
PLACES = [
    ("design-2-sun-gemini.png", (835, 700), 270, 28),     # his right hand, finger points up-right
    ("design-3-rising-leo.png", (1760, 880), 245, 152),   # her left hand, finger points up-left
]
INK = (26, 28, 34)        # blue-black, the colour healed black ink settles to
STRENGTH = 1.6            # how far the ink darkens the skin under it (lower = darker)
OPACITY = 0.92

def stack_upright(path):
    """The pair drawn side by side → the same two symbols, upright, the second above the first."""
    a = Image.open(path).convert("RGBA").getchannel("A")
    a = a.crop(a.getbbox())
    cols = [any(a.getpixel((x, y)) > 40 for y in range(0, a.height, 2)) for x in range(a.width)]
    mid = a.width // 2                                   # widest empty run near the middle splits the pair
    gaps = [x for x in range(a.width // 4, 3 * a.width // 4) if not cols[x]]
    if gaps:
        mid = min(gaps, key=lambda x: abs(x - a.width // 2))
    first, second = (g.crop(g.getbbox()) for g in (a.crop((0, 0, mid, a.height)), a.crop((mid, 0, a.width, a.height))))
    gap = round(max(first.height, second.height) * .32)
    w = max(first.width, second.width)
    out = Image.new("L", (w, first.height + gap + second.height), 0)
    out.paste(second, ((w - second.width) // 2, 0))
    out.paste(first, ((w - first.width) // 2, second.height + gap))
    return out

def ink_layer(path, length, direction):
    a = stack_upright(path)
    along = Image.new("RGBA", (a.width + 200, a.height + 200), (0, 0, 0, 0))
    along.paste(Image.new("RGBA", a.size, (20, 20, 20, 255)), (100, 100), a)
    along.save(path.with_name(path.stem + "-along.png"))
    w = round(a.width * length / a.height)
    a = a.resize((w, length), Image.LANCZOS)
    a = a.rotate(direction - 90, resample=Image.BICUBIC, expand=True)   # the stack's top points along the finger
    a = a.filter(ImageFilter.GaussianBlur(0.9))                       # healed, slightly soft edge
    noise = Image.effect_noise(a.size, 22).filter(ImageFilter.GaussianBlur(1.2))
    a = ImageChops.multiply(a, noise.point(lambda v: 205 + v * 50 // 255))
    return a

base = Image.open(PLATE).convert("RGB")
tint = tuple(min(255, round(c * STRENGTH)) for c in INK)
for f, (cx, cy), length, direction in PLACES:
    a = ink_layer(DES / f, length, direction).point(lambda v: round(v * OPACITY))
    x, y = cx - a.width // 2, cy - a.height // 2
    region = base.crop((x, y, x + a.width, y + a.height))
    inked = ImageChops.multiply(region, Image.new("RGB", a.size, tint))   # multiply keeps the skin texture under the ink
    base.paste(Image.composite(inked, region, a), (x, y))
out = RAW / "hands-composite.png"
base.save(out)
print(out)
