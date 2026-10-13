"""The exact natal wheel on the man's calf and the one-line design on the woman's inner forearm.

   python3 tools/higgsfield/composite-wheel-forearm.py

Plates (in media/gallery/raw, git-ignored):
  calf-plate-man-clean.png       wheel-calf-man-v1.png with the AI-drawn wheel inpainted away
  wheel-forearm-woman-v1.png     cropped below its AI wheel, where the forearm is bare
Same ink model as composite-hands.py: the design's alpha, softened, multiplied into the skin."""
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "media/gallery/raw"
DES = ROOT / "media/designs"

# plate, crop box (or None), design, output, centre (x, y) in the plate, width px, x-squash for the
# curve of the limb, rotation in degrees (counter-clockwise)
JOBS = [
    ("calf-plate-man-clean.png", None, "design-1-natal-wheel.png", "wheel-calf-composite-man.png",
     (918, 1040), 560, .93, -2),
    ("wheel-forearm-woman-v1.png", (0, 1450, 1362, 2368), "design-4-sun-and-rising-gemini-leo.png",
     "line-forearm-composite-woman.png", (650, 1705), 340, 1, 43),
]
INK = (26, 28, 34)
STRENGTH = 1.6
OPACITY = 0.92

def ink_layer(path, width, squash, angle):
    a = Image.open(path).convert("RGBA").getchannel("A")
    a = a.crop(a.getbbox())
    h = round(a.height * width / a.width)
    a = a.resize((round(width * squash), h), Image.LANCZOS)
    a = a.rotate(angle, resample=Image.BICUBIC, expand=True)
    a = a.filter(ImageFilter.GaussianBlur(0.9))
    noise = Image.effect_noise(a.size, 22).filter(ImageFilter.GaussianBlur(1.2))
    return ImageChops.multiply(a, noise.point(lambda v: 205 + v * 50 // 255))

tint = tuple(min(255, round(c * STRENGTH)) for c in INK)
for plate, crop, design, out, (cx, cy), width, squash, angle in JOBS:
    base = Image.open(RAW / plate).convert("RGB")
    a = ink_layer(DES / design, width, squash, angle).point(lambda v: round(v * OPACITY))
    x, y = cx - a.width // 2, cy - a.height // 2
    region = base.crop((x, y, x + a.width, y + a.height))
    inked = ImageChops.multiply(region, Image.new("RGB", a.size, tint))
    base.paste(Image.composite(inked, region, a), (x, y))
    if crop:
        base = base.crop(crop)
    base.save(RAW / out)
    print(RAW / out)
