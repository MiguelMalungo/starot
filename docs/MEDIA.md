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
saves the results in `media/gallery/raw/` (git-ignored) for review. `npm run example` is the
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
