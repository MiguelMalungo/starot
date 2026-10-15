/* Image-to-video for the launch video: uploads a local still and animates it.
   npx tsx video.ts <https URL of the still> <out-name> "<prompt>" [endpoint]
   Saves media/gallery/raw/<out-name>.mp4. One billable request. */
import { config as loadEnv } from "dotenv";
import { config, higgsfield, HiggsfieldError } from "@higgsfield/client/v2";
import { writeFile } from "node:fs/promises";

loadEnv({ path: new URL(".env.local", import.meta.url).pathname, quiet: true });
const creds = process.env.HF_CREDENTIALS || "";
if (!creds.includes(":")) { console.error("HF_CREDENTIALS is missing from tools/higgsfield/.env.local."); process.exit(1); }
config({ credentials: creds });

const [still, name, prompt, endpoint = "bytedance/seedance-2.5/image-to-video"] = process.argv.slice(2);
/* the still must be reachable by URL: a public https link, e.g. a file published with the site */
if (!/^https:\/\//.test(still)) { console.error("Pass the still as a public https URL."); process.exit(1); }
const image_url = still;
try {
  const r: any = await higgsfield.subscribe(endpoint, {
    input: { prompt, image_url, duration: 5, resolution: "1080p", aspect_ratio: "9:16" },
    withPolling: true,
  });
  const url = r.video?.url;
  if (r.status !== "completed" || !url) { console.error(`${r.status} · ${JSON.stringify(r).slice(0, 400)}`); process.exit(2); }
  const out = new URL(`../../media/gallery/raw/${name}.mp4`, import.meta.url);
  await writeFile(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
  console.log("completed", out.pathname);
} catch (e) {
  console.error(e instanceof HiggsfieldError ? `Higgsfield error: ${e.message}` : String(e)); process.exit(1);
}
