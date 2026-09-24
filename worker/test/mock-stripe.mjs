/* An in-memory stand-in for the two Stripe endpoints the worker uses.
   Replaces globalThis.fetch for api.stripe.com only. */
export function installMockStripe({ checkoutBase = "https://checkout.stripe.com" } = {}) {
  const sessions = new Map();
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    if (url.hostname !== "api.stripe.com") return realFetch(input, init);
    const auth = (init.headers || {}).Authorization || "";
    calls.push({ method: init.method, path: url.pathname, body: init.body, auth });
    if (!auth.startsWith("Bearer sk_")) return reply(401, { error: { message: "bad key" } });
    if (init.method === "POST" && url.pathname === "/v1/checkout/sessions") {
      const p = new URLSearchParams(init.body);
      const id = "cs_test_" + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      const metadata = {};
      for (const [k, v] of p) { const m = k.match(/^metadata\[(\w+)\]$/); if (m) metadata[m[1]] = v; }
      const s = {
        id, object: "checkout.session", payment_status: "unpaid", status: "open", metadata,
        amount_total: +p.get("line_items[0][price_data][unit_amount]"),
        success_url: p.get("success_url").replace("{CHECKOUT_SESSION_ID}", id),
        cancel_url: p.get("cancel_url"), params: Object.fromEntries(p),
        url: `${checkoutBase}/c/pay/${id}`,
      };
      sessions.set(id, s);
      return reply(200, s);
    }
    const m = url.pathname.match(/^\/v1\/checkout\/sessions\/(cs_\w+)$/);
    if (init.method === "GET" && m) {
      const s = sessions.get(m[1]);
      return s ? reply(200, s) : reply(404, { error: { message: "No such checkout.session" } });
    }
    return reply(404, { error: { message: "unmocked " + url.pathname } });
  };
  const pay = id => { const s = sessions.get(id); s.payment_status = "paid"; s.status = "complete"; };
  return { sessions, calls, pay, restore: () => (globalThis.fetch = realFetch) };
}
function reply(status, obj) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}
