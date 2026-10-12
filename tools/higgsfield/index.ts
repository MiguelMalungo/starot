/* Higgsfield setup check: one Seedance 2.5 text-to-video generation through the official SDK.
   Credentials are read at runtime from .env.local (HF_CREDENTIALS=key-id:key-secret), which
   Git ignores. This makes one billable request.   Run:  npm run example */
import { config as loadEnv } from "dotenv";
import { config, higgsfield, AuthenticationError, CredentialsMissedError, NotEnoughCreditsError, HiggsfieldError } from "@higgsfield/client/v2";

loadEnv({ path: new URL(".env.local", import.meta.url).pathname, quiet: true });
if (!process.env.HF_CREDENTIALS) {
  console.error("HF_CREDENTIALS is missing — add it to tools/higgsfield/.env.local as key-id:key-secret.");
  process.exit(1);
}
config({ credentials: process.env.HF_CREDENTIALS });

try {
  const result = await higgsfield.subscribe("bytedance/seedance-2.5/text-to-video", {
    input: { prompt: "A cinematic scene at sunset", duration: 5, resolution: "720p", aspect_ratio: "16:9" },
    withPolling: true,
  });
  const status = result.status as string;
  if (status === "completed" && result.video?.url) {
    console.log(`completed · request ${result.request_id}`);
    console.log(result.video.url);
  } else if (status === "nsfw") {
    console.error(`moderated · request ${result.request_id} was flagged by content moderation; no video.`);
    process.exitCode = 2;
  } else if (status === "failed" || status === "canceled" || status === "cancelled") {
    console.error(`${status} · request ${result.request_id}; no video.`);
    process.exitCode = 2;
  } else {
    console.error(`unexpected status "${status}" · request ${result.request_id}; no video URL returned.`);
    process.exitCode = 2;
  }
} catch (e) {
  if (e instanceof CredentialsMissedError || e instanceof AuthenticationError) console.error("Authentication failed — check the key id and secret in .env.local.");
  else if (e instanceof NotEnoughCreditsError) console.error("Not enough Higgsfield credits for this request.");
  else if (e instanceof HiggsfieldError) console.error(`Higgsfield error: ${e.message}`);
  else console.error(`Unexpected error: ${(e as Error).message}`);
  process.exitCode = 1;
}
