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
  "same symbols, same proportions, same thin even lines, nothing added or removed, no shading, no colour.";

const SHOTS: Shot[] = [
  { id: "wheel-calf-man", refs: ["design-1-natal-wheel.png"], aspect: "3:4",
    prompt: `${TATTOO} A man's lower leg seen from behind and slightly to the side, the round natal-wheel tattoo about 12 cm wide on the back of his calf, standing on a plinth, bare leg, neutral linen shorts just visible. ${STUDIO}` },
  { id: "wheel-forearm-woman", refs: ["design-1-natal-wheel.png"], aspect: "3:4",
    prompt: `${TATTOO} A woman's inner forearm, palm up, resting on her knee, the round natal-wheel tattoo about 10 cm wide centred on the inner forearm, a simple oatmeal knit sleeve pushed up. ${STUDIO}` },
  { id: "line-neck-man", refs: ["design-4-sun-and-rising-gemini-leo.png"], aspect: "3:4",
    prompt: `${TATTOO} The back of a man's neck and upper shoulders, head slightly bowed, short hair, the single horizontal row of four symbols about 7 cm wide placed low on the back of the neck just above the top of the spine. ${STUDIO}` },
  { id: "line-neck-woman", refs: ["design-4-sun-and-rising-gemini-leo.png"], aspect: "3:4",
    prompt: `${TATTOO} The back of a woman's neck, hair gathered up in a low bun, bare shoulders with a black slip-dress strap, the single horizontal row of four symbols about 6 cm wide placed low on the back of the neck. ${STUDIO}` },
  { id: "numbers-obliques-man", refs: ["design-5-numbers-8-6-5-3-vertical.png"], aspect: "2:3",
    prompt: `${TATTOO} The side of a fit man's torso, shirtless, arm raised and resting behind his head, the vertical line of four circular seals running down the obliques along the ribs to the waist, about 16 cm long, numerals upright. ${STUDIO}` },
  { id: "numbers-obliques-woman", refs: ["design-5-numbers-8-6-5-3-vertical.png"], aspect: "2:3",
    prompt: `${TATTOO} The side of a woman's torso, wearing a black high-waisted bottom and a black bandeau top, arm raised above her head, the vertical line of four circular seals running down the obliques from the ribs towards the hip, about 14 cm long, numerals upright. ${STUDIO}` },
  { id: "hands-pair", refs: ["design-2-sun-gemini.png", "design-3-rising-leo.png"], aspect: "3:2",
    prompt: `${TATTOO} A man and a woman holding hands, close-up on the backs of their hands with fingers interlaced. On the back of the man's hand, in the soft area between the thumb and the index finger near the wrist, the design from the first reference image about 3 cm wide. On the back of the woman's hand, in the same area, the design from the second reference image about 3 cm wide. ${STUDIO}` },
];

async function generate(shot: Shot, n: number): Promise<Outcome> {
  try {
    const r = await higgsfield.subscribe(MODEL, {
      input: { prompt: shot.prompt, image_urls: shot.refs.map(f => DESIGNS + f), aspect_ratio: shot.aspect, resolution: "2k", quality: "medium" },
      withPolling: true,
    });
    const status = r.status as string, url = r.images?.[0]?.url;
    if (status !== "completed" || !url) return { id: shot.id, n, status, request: r.request_id };
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
