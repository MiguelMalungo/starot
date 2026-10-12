"""Lays the exact STAROT hand designs onto a clean Higgsfield plate (no AI redrawing of symbols).

   python3 tools/higgsfield/composite-hands.py

Each design is cropped, scaled to ~3 cm on the hand, rotated to run along the index finger,
and multiplied into the skin with a slightly soft edge, the way healed fine-line ink looks.
Positions and angles are measured on hands-plate-v10.png (2496 x 1664)."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "media/gallery/raw"
DES = ROOT / "media/designs"
PLATE = RAW / "hands-plate-v10.png"

# design file, centre (x, y), length in px (~3 cm on that hand), rotation in degrees (counter-clockwise)
PLACES = [
    ("design-2-sun-gemini.png", (650, 690), 250, 30),     # his right hand: ☉ by the wrist, ♊ towards the index finger
    ("design-3-rising-leo.png", (1895, 925), 225, -33),   # her left hand: along her index finger
]
INK = (26, 28, 34)        # blue-black, the colour healed black ink settles to
STRENGTH = 1.6            # how far the ink darkens the skin under it (lower = darker)
OPACITY = 0.92

def ink_layer(path, length, angle):
    d = Image.open(path).convert("RGBA")
    a = d.getchannel("A")
    d = d.crop(a.getbbox())
    h = round(d.height * length / d.width)
    a = d.getchannel("A").resize((length, h), Image.LANCZOS)
    a = a.rotate(angle, resample=Image.BICUBIC, expand=True)
    a = a.filter(ImageFilter.GaussianBlur(0.9))                       # healed, slightly soft edge
    noise = Image.effect_noise(a.size, 22).filter(ImageFilter.GaussianBlur(1.2))
    a = ImageChops.multiply(a, noise.point(lambda v: 205 + v * 50 // 255))
    return a

base = Image.open(PLATE).convert("RGB")
tint = tuple(min(255, round(c * STRENGTH)) for c in INK)
for f, (cx, cy), length, angle in PLACES:
    a = ink_layer(DES / f, length, angle).point(lambda v: round(v * OPACITY))
    x, y = cx - a.width // 2, cy - a.height // 2
    region = base.crop((x, y, x + a.width, y + a.height))
    inked = ImageChops.multiply(region, Image.new("RGB", a.size, tint))   # multiply keeps the skin texture under the ink
    base.paste(Image.composite(inked, region, a), (x, y))
out = RAW / "hands-composite.png"
base.save(out)
print(out)
