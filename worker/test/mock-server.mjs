/* node test/mock-server.mjs — the worker on http://localhost:8787 with a fake Stripe,
   so the whole pay-and-return flow can be tried locally without keys.
   In the site's console (on localhost):  localStorage['starot.api']='"http://localhost:8787"'  */
import http from "node:http";
import worker from "../src/index.js";
import { installMockStripe } from "./mock-stripe.mjs";

const PORT = 8787;
const mock = installMockStripe({ checkoutBase: `http://localhost:${PORT}` });
const env = {
  STRIPE_SECRET_KEY: "sk_test_mock", SITE_URL: "https://miguelmalungo.github.io/starot/",
  TERMS_URL: "https://miguelmalungo.github.io/starot/terms.html", PRICE_CENTS: "300", CURRENCY: "eur",
  REQUIRE_TERMS: "true", STRIPE_TAX: "false", ALLOWED_ORIGINS: "", ALLOW_LOCALHOST: "true",
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const m = url.pathname.match(/^\/c\/pay\/(cs_\w+)$/);
  if (m) {   /* the fake checkout page */
    const s = mock.sessions.get(m[1]);
    if (!s) { res.writeHead(404); return res.end("no session"); }
    if (url.searchParams.get("do") === "pay") { mock.pay(s.id); res.writeHead(303, { Location: s.success_url }); return res.end(); }
    if (url.searchParams.get("do") === "cancel") { res.writeHead(303, { Location: s.cancel_url }); return res.end(); }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(`<body style="font:16px system-ui;background:#f6f5f2;padding:40px;max-width:520px;margin:auto">
      <p style="color:#b33;font-weight:600">MOCK CHECKOUT — local test only, no money moves</p>
      <h2>STAROT · Astral map — €${(s.amount_total / 100).toFixed(2)}</h2>
      <p>${s.params["line_items[0][price_data][product_data][description]"]}</p>
      <p style="font-size:13px;color:#555">${s.params["custom_text[terms_of_service_acceptance][message]"] || ""}</p>
      <p><a id="pay" href="?do=pay">Pay</a> &nbsp; · &nbsp; <a id="cancel" href="?do=cancel">Cancel</a></p></body>`);
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const r = await worker.fetch(new Request(url, {
    method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks),
  }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(PORT, () => console.log(`mock worker on http://localhost:${PORT}`));
