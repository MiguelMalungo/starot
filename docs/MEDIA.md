# Media: STAROT tattoos on skin

The site already has a gallery slot ("On skin") on the home screen and on the tattoo page.
It stays hidden until `CONFIG.gallery` in `index.html` has entries.

## What to make

| # | Design (file in `media/designs/`) | Placement | Size on skin |
|---|---|---|---|
| 1 | `design-1-natal-wheel.png` | inner forearm | ~10 cm |
| 2 | `design-1-natal-wheel.png` | upper back, between the shoulder blades | ~12 cm |
| 3 | `design-2-sun-gemini.png` | inside of the wrist | ~3 cm |
| 4 | `design-2-sun-gemini.png` | ankle | ~3 cm |
| 5 | `design-3-rising-leo.png` | collarbone | ~4 cm |
| 6 | `design-4-sun-and-rising-gemini-leo.png` | along the forearm / collarbone | ~6 cm |
| 7 | `design-5-numbers-8-6-5-3.png` | along the forearm or down the spine | ~8 cm |
| 8 | `design-flash-sheet.png` | the printed sheet on a tattoo artist's desk | product shot |

Plus 3–4 short videos (4–6 s): a wrist turning slowly, a push-in on the forearm wheel,
the flash sheet being slid across the desk.

The designs are black line art on a transparent background, for uploading as the
reference image.

## Generating them with the API

`tools/higgsfield/` uses the official Higgsfield SDK. Put `HF_CREDENTIALS=key-id:key-secret`
in `tools/higgsfield/.env.local` (git-ignored), then:

```bash
cd tools/higgsfield && npm install
npm run tattoos                  # the seven studio shots, one variant each
npm run tattoos -- hands-pair    # just one shot
```

It sends each shot to Grok Image 2.0 with our own design file as the reference image, and
saves the results in `media/gallery/raw/` (git-ignored) for review.

Small symbols on hands are where the model fails most (it moves, resizes and redraws them).
For those, generate a clean plate (`npm run tattoos -- hands-plate`) and lay the exact designs on
with `python3 tools/higgsfield/composite-hands.py`: positions, size and angle are set in the
script, and the ink is multiplied into the skin so its texture shows through.
The neck line goes the same way (`neck-plate-man`, then `python3 tools/higgsfield/composite-neck.py`),
because the model keeps redrawing the ascendant ↑ as ♐. The woman's bare-back plate is refused by
the moderation filter, so her plate is an earlier tattoo render with the AI tattoo patched out
(`neck-plate-woman-clean.png`, a skin patch from just below, blended with OpenCV `seamlessClone`); her line
is restacked upright and runs down the side of her neck below the ear, in a close-up crop. A side-profile plate
(`neck-side-plate-woman`) is ready to render once credits are topped up.
Everything since then goes through one script, `python3 tools/higgsfield/composite-gallery.py`
(the wheel on her thigh, the line on his forearm and on the side of her neck, and the four Maya
designs — 12 Kib, from `media/designs/maya-example/` — on his chest, her back, her inner forearm and
his shoulder): positions are measured on each plate and kept in the script.
The calf wheel and the woman's inner-forearm line come from earlier renders too
(`python3 tools/higgsfield/composite-wheel-forearm.py`): the AI wheel inpainted off the calf, and the
forearm render cropped below its wheel. Still to shoot once credits are topped up: the wheel on a
woman's front thigh (`thigh-plate-woman`) and the line on a man's inner forearm (`forearm-plate-man`),
then composite them the same way. `npm run example` is the
Seedance 2.5 setup check. Every generation is billed to your Higgsfield credits.

## Prompts (for the Higgsfield website)

Upload the design as the reference image, then use one of these prompts and adjust
the placement and size.

**Stills**
> Close-up photograph of a fine-line black tattoo on the inner forearm, the design exactly
> as in the reference image, about 10 cm wide, healed, crisp thin even lines, natural skin
> texture and pores, soft window daylight, shallow depth of field, 85 mm lens, editorial,
> neutral background, no text, no watermark.

> Small fine-line black tattoo on the inside of the wrist, the two symbols exactly as in the
> reference image, about 3 cm wide, healed, natural skin, a hand resting on linen, soft
> morning light, macro photograph, no text.

> A tattoo flash sheet printed on cream paper, exactly as in the reference image, lying on a
> tattoo artist's desk with ink caps, a stencil and a machine, warm studio light, top-down
> photograph.

**Video (from a finished still)**
> Slow push-in, the person turns their wrist gently towards the light, natural daylight,
> 5 seconds, steady camera, no text.

## Check every render before using it

These models often bend small symbols. STAROT promises accuracy, so throw away any render
where a glyph is wrong: a Gemini sign that isn't ♊, a missing centre dot in ☉, wrong
numbers or figures inside the seals. If a model keeps distorting the symbols, a reliable fallback is a real photo of
skin with the PNG laid over it in an editor (Photopea or Photoshop, blend mode *Multiply*,
a little blur and opacity around 85%).

## Be clear that they're renders

Until you have photos of real tattoos, mark AI images with `concept:true`. The gallery then
says "Concept renders, made with AI". Showing AI images as if they were customers'
tattoos could mislead buyers, and can count as misleading advertising under EU consumer law.

## Files and code

- Stills: JPG, 1080 × 1350 (4:5), under ~300 KB each.
- Videos: MP4 (H.264), 1080 × 1350 or 720 × 900, 4–6 s, silent, under ~4 MB, plus a
  JPG poster frame.
- Put them in `media/gallery/` and list them in `CONFIG.gallery`:

```js
gallery:[
  {src:"media/gallery/wheel-forearm.jpg", caption:"Natal wheel · forearm", captionPt:"Roda natal · antebraço", concept:true},
  {video:"media/gallery/sun-wrist.mp4", poster:"media/gallery/sun-wrist.jpg", caption:"Sun in Gemini · wrist", captionPt:"Sol em Gêmeos · pulso", concept:true},
],
```
