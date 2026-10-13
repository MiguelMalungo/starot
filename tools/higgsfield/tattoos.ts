/* Generates the "on skin" example photos with Higgsfield — Grok Image 2.0, an image-editing
   model that takes our own design files as references — in a professional studio style.
   Credentials: HF_CREDENTIALS in tools/higgsfield/.env.local (git-ignored), read at runtime.
   The reference designs must be live on the site (media/designs/): the API fetches them by URL.
   Results land in media/gallery/raw/ (git-ignored) for review; pick the good ones by hand.

     npm run tattoos                      # every shot, 1 variant
     npm run tattoos -- hands-pair        # one shot
     VARIANTS=2 npm run tattoos           # more variants (each is a billable request)  */
import { config as loadEnv } from "dotenv";
import { config, higgsfield, HiggsfieldError } from "@higgsfield/client/v2";
import { mkdir, writeFile, readFile } from "node:fs/promises";

loadEnv({ path: new URL(".env.local", import.meta.url).pathname, quiet: true });
if (!process.env.HF_CREDENTIALS) { console.error("HF_CREDENTIALS is missing from tools/higgsfield/.env.local."); process.exit(1); }
config({ credentials: process.env.HF_CREDENTIALS });

const MODEL = "xai/grok-imagine-image-2.0";
const DESIGNS = "https://miguelmalungo.github.io/starot/media/designs/";
const OUT = new URL("../../media/gallery/raw/", import.meta.url);
const VARIANTS = Number(process.env.VARIANTS || 1);

type Shot = { id: string; refs: string[]; aspect: string; prompt: string };
type Outcome = { id: string; n: number; status: string; file?: string; request?: string; error?: string };

const STUDIO = "Professional studio photograph, high-end editorial campaign for a fine-line tattoo brand. " +
  "Seamless warm stone-grey backdrop, large softbox key light with a subtle rim light, gentle shadows, " +
  "85 mm lens, shallow depth of field, crisp focus on the tattoo, natural skin texture with visible pores, " +
  "muted elegant colour grade, minimal styling, tasteful and non-sexual, no text, no logos, no watermark.";
const TATTOO = "The tattoo is a healed black fine-line tattoo that reproduces the reference design exactly: " +
  "same symbols, same proportions, the same bold, even line weight as the reference, nothing added or removed, no shading, no colour.";

const SHOTS: Shot[] = [
  /* a clean plate for compositing: the exact designs are laid on afterwards (tools/higgsfield/composite-hands.py) */
  { id: "hands-plate", refs: [], aspect: "3:2",
    prompt: `Close-up of a couple holding hands, seen from above at a slight angle so the backs of both hands face the camera, fingers loosely interlaced. The man's RIGHT hand is on the left of the frame, the woman's LEFT hand is on the right; both thumbs relaxed and clearly visible, the soft area between thumb and index finger on the back of each hand clearly visible and unobstructed. No tattoos, no jewellery, clean bare skin. ${STUDIO}` },
  { id: "neck-plate-man", refs: [], aspect: "3:4",
    prompt: `The back of a man's neck and upper shoulders, head slightly bowed, short hair, smooth even skin on the back of the neck with plenty of bare skin, viewed straight on from behind. No tattoos, no jewellery, clean bare skin. ${STUDIO}` },
  { id: "neck-plate-woman", refs: [], aspect: "3:4",
    prompt: `Portrait of a woman seen from behind, hair gathered up in a low bun, wearing an elegant black silk dress with a low scooped back, the nape of her neck and upper back clearly visible, viewed straight on. No tattoos, no jewellery. ${STUDIO}` },
  { id: "forearm-plate-man", refs: [], aspect: "3:2",
    prompt: `A man's inner forearm, arm extended horizontally across the frame from left (elbow) to right (wrist), palm facing up, resting on a pale stone plinth, a rolled-up white linen shirt sleeve at the elbow, smooth even skin on the inner forearm clearly visible. No tattoos, no jewellery, no watch. ${STUDIO}` },
  { id: "forearm-plate-woman", refs: [], aspect: "3:2",
    prompt: `A woman's inner forearm, arm extended horizontally across the frame from left (elbow) to right (wrist), palm facing up, resting on a pale stone plinth, a pushed-up oatmeal knit sleeve at the elbow, smooth even skin on the inner forearm clearly visible. No tattoos, no jewellery, no watch. ${STUDIO}` },
  { id: "thigh-plate-woman", refs: [], aspect: "3:4",
    prompt: `A woman seated on a pale stone plinth, seen from the front, one leg forward, the front of her thigh clearly visible from knee to hip, wearing black high-waisted tailored shorts, smooth even skin on the front of the thigh. No tattoos, no jewellery. ${STUDIO}` },
  { id: "calf-plate-man", refs: [], aspect: "3:4",
    prompt: `A man's lower leg seen straight from behind, standing on a pale stone plinth, the back of his calf clearly visible from the back of the knee to the ankle, neutral linen shorts just visible at the top, smooth skin with light natural hair. No tattoos, no jewellery, no socks. ${STUDIO}` },
  { id: "neck-side-plate-woman", refs: [], aspect: "3:4",
    prompt: `Side profile portrait of a woman, seen from her right side, head turned slightly away from the camera, hair gathered up in a low bun, the side of her neck below and behind the ear clearly visible and well lit, from the ear down to the collarbone, wearing a black silk top with thin straps. No tattoos, no jewellery, no earrings. ${STUDIO}` },
  { id: "chest-plate-man", refs: [], aspect: "3:4",
    prompt: `A man's bare chest and shoulders seen from the front, standing relaxed, natural athletic build, smooth skin, the upper chest clearly visible from the collarbones to the middle of the torso, the area over the heart well lit, head cropped at the chin. No tattoos, no jewellery. ${STUDIO}` },
  { id: "back-plate-woman", refs: [], aspect: "3:4",
    prompt: `A woman seen from behind, wearing an elegant black backless dress that is open to the waist, hair in a low bun, the middle of her back and the line of the spine between the shoulder blades clearly visible and softly lit. No tattoos, no jewellery. ${STUDIO}` },
  { id: "forearm-upper-plate-woman", refs: [], aspect: "4:3",
    prompt: `Close-up of a woman's arm, palm facing up, resting on a pale stone plinth, the inner forearm clearly visible from the wrist to the elbow, the upper part near the elbow well lit, a short oatmeal knit sleeve just above the elbow. No tattoos, no jewellery, no watch. ${STUDIO}` },
  { id: "deltoid-plate-man", refs: [], aspect: "3:4",
    prompt: `A man's bare shoulder and upper arm seen from the side, slightly from behind, the rounded deltoid muscle of the shoulder clearly visible and well lit, arm relaxed at his side, smooth skin, head turned away out of frame. No tattoos, no jewellery. ${STUDIO}` },
  { id: "plexus-plate-woman", refs: [], aspect: "3:4",
    prompt: `A woman's torso seen from the front, standing relaxed, wearing a black bandeau top and black high-waisted tailored trousers, the bare midriff and the solar plexus between the bottom of the top and the navel clearly visible and softly lit, smooth skin, cropped at the chin and the hips. No tattoos, no jewellery, no piercings. ${STUDIO}` },
  { id: "plexus-plate-man", refs: [], aspect: "3:4",
    prompt: `A man's bare torso seen straight from the front, standing relaxed, lean natural build, smooth skin, the lower chest and the solar plexus — the hollow where the breastbone ends between the lower ribs — clearly visible and softly lit, cropped at the collarbones and just below the navel, dark trousers at the bottom edge. No tattoos, no jewellery. ${STUDIO}` },
  { id: "wheel-calf-man", refs: ["design-1-natal-wheel.png"], aspect: "3:4",
    prompt: `${TATTOO} A man's lower leg seen from behind and slightly to the side, the round natal-wheel tattoo about 12 cm wide on the back of his calf, standing on a plinth, bare leg, neutral linen shorts just visible. ${STUDIO}` },
  { id: "wheel-forearm-woman", refs: ["design-1-natal-wheel.png"], aspect: "3:4",
    prompt: `${TATTOO} A woman's inner forearm, palm up, resting on her knee, the round natal-wheel tattoo about 10 cm wide centred on the inner forearm, a simple oatmeal knit sleeve pushed up. ${STUDIO}` },
  { id: "line-neck-man", refs: ["design-4-sun-and-rising-gemini-leo.png"], aspect: "3:4",
    prompt: `${TATTOO} The back of a man's neck and upper shoulders, head slightly bowed, short hair, a small, discreet single horizontal row of four symbols only about 3.5 cm wide in total, each symbol under 1 cm tall, placed low on the back of the neck just above the top of the spine, with plenty of bare skin around it. ${STUDIO}` },
  { id: "line-neck-woman", refs: ["design-4-sun-and-rising-gemini-leo.png"], aspect: "3:4",
    prompt: `${TATTOO} The back of a woman's neck, hair gathered up in a low bun, bare shoulders with a black slip-dress strap, a small, discreet single horizontal row of four symbols only about 3 cm wide in total, each symbol under 1 cm tall, placed low on the back of the neck, with plenty of bare skin around it. ${STUDIO}` },
  { id: "numbers-obliques-man", refs: ["design-5-numbers-8-6-5-3-vertical.png"], aspect: "2:3",
    prompt: `${TATTOO} The side of a fit man's torso, shirtless, arm raised and resting behind his head, a small, discreet vertical line of four circular seals on the obliques, only about 8 cm long in total, each seal about 1.5 cm across with clear space between them, numerals upright, plenty of bare skin around it. ${STUDIO}` },
  { id: "numbers-obliques-woman", refs: ["design-5-numbers-8-6-5-3-vertical.png"], aspect: "2:3",
    prompt: `${TATTOO} The side of a woman's torso, wearing a black high-waisted bottom and a black bandeau top, arm raised above her head. A very small, delicate vertical line of four circular seals on her obliques: each seal is the size of a small coin, about 1.2 cm across, and the whole line is only about 6 cm long — shorter than the width of her palm — with lots of bare skin all around it. Numerals upright. ${STUDIO}` },
  { id: "hands-pair", refs: ["design-2-sun-gemini-along.png", "design-3-rising-leo-along.png"], aspect: "3:2",
    prompt: `${TATTOO} Close-up of a couple holding hands, palm to palm, seen from above so the backs of both hands face the camera. The man's RIGHT hand is on the left of the frame, the woman's LEFT hand is on the right. Each tattoo is about 3 cm long, on the back of the hand, in the soft area between the thumb and the index-finger bone, just behind the knuckles — not on the fingers and not on the thumb. Each tattoo is a vertical stack of two symbols, exactly as in its reference image, laid along the line of the index finger: the first symbol nearer the wrist, the second nearer the index knuckle. The man's hand has the first reference image; the woman's hand has the second reference image. ${STUDIO}` },
];

async function generate(shot: Shot, n: number): Promise<Outcome> {
  try {
    const r = await higgsfield.subscribe(MODEL, {
      input: { prompt: shot.prompt, ...(shot.refs.length ? { image_urls: shot.refs.map(f => DESIGNS + f) } : {}), aspect_ratio: shot.aspect, resolution: "2k", quality: "medium" },
      withPolling: true,
    });
    const status = r.status as string, url = r.images?.[0]?.url;
    if (status !== "completed" || !url) { console.error(shot.id, JSON.stringify(r).slice(0, 600)); return { id: shot.id, n, status, request: r.request_id }; }
    const img = await fetch(url);
    const ext = (img.headers.get("content-type") || "").includes("jpeg") ? "jpg" : "png";
    const file = `${shot.id}-v${n}.${ext}`;
    await writeFile(new URL(file, OUT), Buffer.from(await img.arrayBuffer()));
    return { id: shot.id, n, status, file, request: r.request_id };
  } catch (e) {
    return { id: shot.id, n, status: "error", error: e instanceof HiggsfieldError ? e.message : String(e) };
  }
}

await mkdir(OUT, { recursive: true });
const only = process.argv.slice(2);
const todo = SHOTS.filter(s => !only.length || only.includes(s.id));
const manifestUrl = new URL("manifest.json", OUT);
let manifest: Outcome[] = [];
try { manifest = JSON.parse(await readFile(manifestUrl, "utf8")); } catch {}
const start = (r => r ? Math.max(...r) : 0)(manifest.length ? manifest.map(m => m.n) : null);
const results = await Promise.all(todo.flatMap(s => Array.from({ length: VARIANTS }, (_, i) => generate(s, start + i + 1))));
for (const r of results) console.log(r.status.padEnd(10), r.id, r.file || r.error || r.request || "");
await writeFile(manifestUrl, JSON.stringify([...manifest, ...results], null, 2));
if (results.some(r => r.status !== "completed")) process.exitCode = 2;
