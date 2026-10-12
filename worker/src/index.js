/* STAROT payment worker — runs on Cloudflare Workers (free tier is plenty).

   POST /checkout   {input,nums,lang} → creates a Stripe Checkout Session for one tattoo flash sheet, returns {url}
   GET  /sheet?id=cs_…                → if that session is paid, returns {ok, input, nums} so the sheet reopens anywhere

   There is no database: the birth details and the four numerology numbers ride along as
   the session's metadata (the name they came from never leaves the browser), so the
   Checkout Session id *is* the buyer's key to their designs.

   Secret (wrangler secret put):  STRIPE_SECRET_KEY
   Vars (wrangler.toml):          SITE_URL, TERMS_URL, PRICE_CENTS, CURRENCY,
                                  REQUIRE_TERMS, STRIPE_TAX, ALLOWED_ORIGINS, ALLOW_LOCALHOST */

const MON = {
  en: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  pt: ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"],
};
/* everything the buyer reads at checkout, in both languages */
const COPY = {
  en: {
    name: "STAROT · Tattoo flash",
    desc: (when, place) => `Your tattoo designs and flash sheet · ${when} · ${place}`,
    submit: "Your designs open the moment payment completes.",
    terms: url => `I agree to the [Terms](${url}) and ask for my designs to be delivered immediately. I understand that once they are delivered I lose the 14-day right of withdrawal.`,
  },
  pt: {
    name: "STAROT · Folha de flash",
    desc: (when, place) => `Os seus desenhos de tatuagem e a folha de flash · ${when} · ${place}`,
    submit: "Os seus desenhos abrem assim que o pagamento for concluído.",
    terms: url => `Aceito os [Termos](${url}) e peço a entrega imediata dos meus desenhos. Entendo que, depois de entregues, perco o direito de arrependimento de 14 dias.`,
  },
};
const TAG = "starot-sheet-1";        // marks sessions created here, so no other payment can open a sheet
const NUMS_OK = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33]);
const pad = n => String(n).padStart(2, "0");

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": corsOrigin(env, origin),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(req.url);
    try {
      if (url.pathname === "/checkout" && req.method === "POST") return json(await checkout(req, env, origin), 200, cors);
      if (url.pathname === "/sheet" && req.method === "GET") return json(await openSheet(url, env), 200, cors);
      if (url.pathname === "/" || url.pathname === "/health") return json({ ok: true, service: "starot-pay" }, 200, cors);
      return json({ error: "not found" }, 404, cors);
    } catch (e) {
      if (!e.status) console.error(e);
      return json({ error: e.status ? e.message : "server error" }, e.status || 500, cors);
    }
  },
};

/* ── routes ─────────────────────────────────────────────── */

async function checkout(req, env, origin) {
  let body;
  try { body = await req.json(); } catch { throw fail(400, "bad json"); }
  const inp = validate(body && body.input);
  const nums = validateNums(body.nums);
  const lang = body.lang === "pt" ? "pt" : "en";
  const c = COPY[lang];
  const base = returnBase(env, origin);
  const back = lang === "pt" ? "&lang=pt" : "";
  const terms = lang === "pt" ? env.TERMS_URL.replace(/terms\.html$/, "termos.html") : env.TERMS_URL;
  const when = `${inp.d} ${MON[lang][inp.m - 1]} ${inp.y}` + (inp.nt ? "" : ` · ${pad(inp.h)}:${pad(inp.mi)}`);

  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("submit_type", "pay");
  p.set("success_url", `${base}?sheet={CHECKOUT_SESSION_ID}${back}`);
  p.set("cancel_url", `${base}?canceled=1${back}`);
  p.set("locale", lang === "pt" ? "pt-BR" : "auto");
  p.set("line_items[0][quantity]", "1");
  p.set("line_items[0][price_data][currency]", env.CURRENCY || "eur");
  p.set("line_items[0][price_data][unit_amount]", String(parseInt(env.PRICE_CENTS || "700", 10)));
  p.set("line_items[0][price_data][product_data][name]", c.name);
  p.set("line_items[0][price_data][product_data][description]", c.desc(when, inp.place));
  p.set("payment_intent_data[description]", `STAROT tattoo flash · ${when} · ${inp.place}`);
  p.set("allow_promotion_codes", "true");
  p.set("custom_text[submit][message]", c.submit);
  if (env.REQUIRE_TERMS !== "false") {
    /* EU digital content: the buyer asks for immediate delivery and acknowledges losing the 14-day withdrawal right.
       Stripe requires a Terms of Service URL in Settings → Public details for this to work. */
    p.set("consent_collection[terms_of_service]", "required");
    p.set("custom_text[terms_of_service_acceptance][message]", c.terms(terms));
  }
  if (env.STRIPE_TAX === "true") {
    p.set("automatic_tax[enabled]", "true");
    p.set("line_items[0][price_data][tax_behavior]", "inclusive");   // €7 stays €7, VAT inside
  }
  for (const [k, v] of Object.entries({ ...inp, nums: nums.join("."), v: TAG })) p.set(`metadata[${k}]`, String(v));

  const s = await stripe(env, "POST", "/checkout/sessions", p);
  if (!s.url) throw fail(502, "checkout unavailable");
  return { url: s.url };
}

async function openSheet(url, env) {
  const id = url.searchParams.get("id") || "";
  if (!/^cs_(test|live)_[A-Za-z0-9]{8,240}$/.test(id)) throw fail(400, "bad id");
  let s;
  try { s = await stripe(env, "GET", `/checkout/sessions/${id}`); }
  catch (e) { if (e.status === 404) throw fail(404, "not found"); throw e; }
  if (!s.metadata || s.metadata.v !== TAG) throw fail(404, "not found");
  if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") throw fail(402, "unpaid");
  return { ok: true, input: validate(s.metadata), nums: validateNums(String(s.metadata.nums || "").split(".")) };
}

/* ── helpers ────────────────────────────────────────────── */

/* birth details, strictly shaped — they travel through Stripe and back into the page */
export function validate(i) {
  if (!i || typeof i !== "object") throw fail(400, "missing input");
  const int = (v, lo, hi, name) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < lo || n > hi) throw fail(400, `bad ${name}`);
    return n;
  };
  const num = (v, lo, hi, name) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < lo || n > hi) throw fail(400, `bad ${name}`);
    return Math.round(n * 1e4) / 1e4;
  };
  const y = int(i.y, 1800, 2050, "year"), m = int(i.m, 1, 12, "month");
  const d = int(i.d, 1, new Date(Date.UTC(y, m, 0)).getUTCDate(), "day");
  const out = {
    y, m, d,
    h: int(i.h, 0, 23, "hour"),
    mi: int(i.mi, 0, 59, "minute"),
    nt: int(i.nt ?? 0, 0, 1, "nt"),
    lat: num(i.lat, -89.9, 89.9, "lat"),
    lon: num(i.lon, -180, 180, "lon"),
    tz: String(i.tz || ""),
    place: String(i.place || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 80),
  };
  if (!/^[A-Za-z0-9_+\-\/]{1,64}$/.test(out.tz)) throw fail(400, "bad tz");
  if (!out.place) throw fail(400, "bad place");
  return out;
}

/* Life Path, Expression, Soul, Persona — each 1–9 or a master number */
export function validateNums(n) {
  if (!Array.isArray(n) || n.length !== 4) throw fail(400, "bad nums");
  return n.map(x => {
    const v = Number(x);
    if (!NUMS_OK.has(v)) throw fail(400, "bad nums");
    return v;
  });
}

async function stripe(env, method, path, params) {
  if (!env.STRIPE_SECRET_KEY) throw fail(500, "payments not configured");
  const r = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(params ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: params ? params.toString() : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("stripe", r.status, j.error && j.error.message);
    const e = fail(r.status === 404 ? 404 : 502, r.status === 404 ? "not found" : "checkout unavailable");
    throw e;
  }
  return j;
}

function allowedOrigins(env) {
  const list = [env.SITE_URL, ...(env.ALLOWED_ORIGINS || "").split(",")]
    .map(s => (s || "").trim()).filter(Boolean)
    .map(s => { try { return new URL(s).origin; } catch { return ""; } }).filter(Boolean);
  return [...new Set(list)];
}
const isLocal = (env, origin) => env.ALLOW_LOCALHOST === "true" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
function corsOrigin(env, origin) {
  if (allowedOrigins(env).includes(origin) || isLocal(env, origin)) return origin;
  return allowedOrigins(env)[0] || "null";
}
/* send the buyer back to the page they came from when it's localhost (testing), otherwise to SITE_URL */
function returnBase(env, origin) {
  if (isLocal(env, origin)) return `${origin}/`;
  const u = new URL(env.SITE_URL);
  return u.origin + u.pathname.replace(/\/?$/, "/");
}

function fail(status, message) { const e = new Error(message); e.status = status; return e; }
function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
