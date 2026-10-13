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

# plate, output, centre (x, y), width in px (~3.5 cm on that neck), rotation in degrees
PLACES = [
    ("neck-plate-man-v13.png", "neck-composite-man.png", (895, 1370), 330, 0),
    ("neck-plate-woman-clean.png", "neck-composite-woman.png", (890, 1175), 290, 0),
]
INK = (26, 28, 34)
STRENGTH = 1.6
OPACITY = 0.92

def ink_layer(path, width, angle):
    d = Image.open(path).convert("RGBA")
    a = d.getchannel("A")
    d = d.crop(a.getbbox())
    h = round(d.height * width / d.width)
    a = d.getchannel("A").resize((width, h), Image.LANCZOS)
    a = a.rotate(angle, resample=Image.BICUBIC, expand=True)
    a = a.filter(ImageFilter.GaussianBlur(0.9))
    noise = Image.effect_noise(a.size, 22).filter(ImageFilter.GaussianBlur(1.2))
    return ImageChops.multiply(a, noise.point(lambda v: 205 + v * 50 // 255))

tint = tuple(min(255, round(c * STRENGTH)) for c in INK)
for plate, out, (cx, cy), width, angle in PLACES:
    if not (RAW / plate).exists():
        continue
    base = Image.open(RAW / plate).convert("RGB")
    a = ink_layer(DESIGN, width, angle).point(lambda v: round(v * OPACITY))
    x, y = cx - a.width // 2, cy - a.height // 2
    region = base.crop((x, y, x + a.width, y + a.height))
    inked = ImageChops.multiply(region, Image.new("RGB", a.size, tint))
    base.paste(Image.composite(inked, region, a), (x, y))
    base.save(RAW / out)
    print(RAW / out)
