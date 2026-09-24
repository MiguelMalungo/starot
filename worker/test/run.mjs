/* node test/run.mjs — exercises the worker against the mock Stripe */
import assert from "node:assert/strict";
import worker, { validate } from "../src/index.js";
import { installMockStripe } from "./mock-stripe.mjs";

const env = {
  STRIPE_SECRET_KEY: "sk_test_x", SITE_URL: "https://miguelmalungo.github.io/starot/",
  TERMS_URL: "https://miguelmalungo.github.io/starot/terms.html", PRICE_CENTS: "300", CURRENCY: "eur",
  REQUIRE_TERMS: "true", STRIPE_TAX: "false", ALLOWED_ORIGINS: "", ALLOW_LOCALHOST: "false",
};
const SITE = "https://miguelmalungo.github.io";
const input = { y: 1990, m: 6, d: 21, h: 9, mi: 15, nt: 0, lat: 38.72, lon: -9.14, tz: "Europe/Lisbon", place: "Lisbon, Portugal" };
const mock = installMockStripe();
const call = (path, { method = "GET", body, origin = SITE, e = env } = {}) =>
  worker.fetch(new Request("https://pay.example" + path, {
    method, headers: { Origin: origin, "Content-Type": "application/json" }, body: body && JSON.stringify(body),
  }), e);
let passed = 0;
const t = async (name, fn) => { await fn(); passed++; console.log("  ✓", name); };

await t("preflight answers with the site origin", async () => {
  const r = await call("/checkout", { method: "OPTIONS" });
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), SITE);
});
await t("foreign origins are not echoed back", async () => {
  const r = await call("/health", { origin: "https://evil.example" });
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), SITE);
});
let sid;
await t("checkout creates a €3 session carrying the birth details", async () => {
  const r = await call("/checkout", { method: "POST", body: { input } });
  const j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j));
  assert.match(j.url, /^https:\/\/checkout\.stripe\.com\//);
  sid = [...mock.sessions.keys()].pop();
  const s = mock.sessions.get(sid);
  assert.equal(s.amount_total, 300);
  assert.equal(s.params["line_items[0][price_data][currency]"], "eur");
  assert.equal(s.metadata.place, "Lisbon, Portugal");
  assert.equal(s.metadata.v, "starot-map-1");
  assert.equal(s.success_url, `https://miguelmalungo.github.io/starot/?map=${sid}`);
  assert.equal(s.cancel_url, "https://miguelmalungo.github.io/starot/?canceled=1");
  assert.equal(s.params["consent_collection[terms_of_service]"], "required");
  assert.equal(s.params["allow_promotion_codes"], "true");
  assert.match(s.params["line_items[0][price_data][product_data][description]"], /21 Jun 1990 · 09:15 · Lisbon/);
});
await t("an unpaid session does not open the map", async () => {
  const r = await call(`/map?id=${sid}`);
  assert.equal(r.status, 402);
  assert.equal((await r.json()).error, "unpaid");
});
await t("a paid session returns the birth details", async () => {
  mock.pay(sid);
  const r = await call(`/map?id=${sid}`);
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.deepEqual(j, { ok: true, input: { ...input } });
});
await t("sessions from other products are refused", async () => {
  mock.sessions.set("cs_test_donation123", { id: "cs_test_donation123", payment_status: "paid", metadata: {} });
  assert.equal((await call("/map?id=cs_test_donation123")).status, 404);
});
await t("unknown and malformed ids are refused", async () => {
  assert.equal((await call("/map?id=cs_test_nosuchsession")).status, 404);
  assert.equal((await call("/map?id=../../customers")).status, 400);
});
await t("bad birth details never reach Stripe", async () => {
  const before = mock.calls.length;
  for (const bad of [{ ...input, m: 13 }, { ...input, d: 31, m: 6 }, { ...input, tz: "x; drop" }, { ...input, place: "" }, { ...input, lat: 95 }]) {
    const r = await call("/checkout", { method: "POST", body: { input: bad } });
    assert.equal(r.status, 400);
  }
  assert.equal(mock.calls.length, before);
});
await t("place names are stripped of markup", () => {
  assert.equal(validate({ ...input, place: "<b>Lisbon</b>\n" }).place, "bLisbon/b");
});
await t("localhost is only honoured when ALLOW_LOCALHOST is on", async () => {
  await call("/checkout", { method: "POST", body: { input }, origin: "http://localhost:8473" });
  assert.match([...mock.sessions.values()].pop().success_url, /^https:\/\/miguelmalungo/);
  const e2 = { ...env, ALLOW_LOCALHOST: "true" };
  const r = await call("/checkout", { method: "POST", body: { input }, origin: "http://localhost:8473", e: e2 });
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), "http://localhost:8473");
  assert.match([...mock.sessions.values()].pop().success_url, /^http:\/\/localhost:8473\/\?map=cs_test_/);
});
await t("Stripe Tax switch prices VAT-inclusive", async () => {
  await call("/checkout", { method: "POST", body: { input }, e: { ...env, STRIPE_TAX: "true" } });
  const p = [...mock.sessions.values()].pop().params;
  assert.equal(p["automatic_tax[enabled]"], "true");
  assert.equal(p["line_items[0][price_data][tax_behavior]"], "inclusive");
});
await t("a missing key fails closed", async () => {
  const r = await call("/checkout", { method: "POST", body: { input }, e: { ...env, STRIPE_SECRET_KEY: "" } });
  assert.equal(r.status, 500);
});
console.log(`\n${passed} passed`);
