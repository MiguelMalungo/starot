import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender,
  interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing,
} from "remotion";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadJost } from "@remotion/google-fonts/Jost";
import type { Copy } from "./copy";

/* The STAROT launch, made of stars: one particle field scatters and gathers into the birth date,
   the natal wheel, the nine designs and the STAROT star, the way the site draws everything. */

const cor = loadCormorant("normal", { weights: ["300", "400"] });
const corI = loadCormorant("italic", { weights: ["300", "400"] });
const jost = loadJost("normal", { weights: ["300", "400", "500"] });
const SERIF = cor.fontFamily, SANS = jost.fontFamily;

const C = { void: "#050609", gold: "#d8b877", goldBright: "#f3e3bb", bone: "#ebe5d6", ink: "#1c1a1e", paper: "#f2ece0" };
const W = 1080, H = 1920, FPS = 30, N = 7000;
const s = (sec: number) => Math.round(sec * FPS);
export const DURATION2 = s(26);
const MUSIC_FROM = s(4 * 60 + 27);   /* Blop from 4:27: its re-entry at 4:36 lands at 9 s, on the nine designs */
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(.2, .7, .2, 1);

/* ── seeded randomness, so every render is identical ─────────── */
const rng = (seed: number) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

/* ── target shapes, sampled from drawings into N points each ─── */
type Pts = Float32Array;   // x0,y0,x1,y1…
const sample = (draw: (c: CanvasRenderingContext2D) => void, seed: number, step = 2): Pts => {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d", { willReadFrequently: true })!; c.fillStyle = c.strokeStyle = "#fff"; draw(c);
  const d = c.getImageData(0, 0, W, H).data, hits: number[] = [];
  for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (d[(y * W + x) * 4 + 3] > 110) hits.push(x, y);
  const r = rng(seed), n = hits.length / 2, out = new Float32Array(N * 2);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  for (let i = 0; i < N; i++) { const k = order[i % Math.max(n, 1)] ?? 0; out[i * 2] = (hits[k * 2] ?? W / 2) + (r() - .5) * 1.6; out[i * 2 + 1] = (hits[k * 2 + 1] ?? H / 2) + (r() - .5) * 1.6; }
  return out;
};
const loadImg = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
const STAR = "M32 8 L35.8 25.6 L52 12 L38.4 28.2 L56 32 L38.4 35.8 L52 52 L35.8 38.4 L32 56 L28.2 38.4 L12 52 L25.6 35.8 L8 32 L25.6 28.2 L12 12 L28.2 25.6 Z";

type Shapes = { scatter: Pts; date: Pts; designs: Pts[]; logo: Pts; kinds: string[] };
const useShapes = (copy: Copy) => {
  const [shapes, set] = useState<Shapes | null>(null);
  const [h] = useState(() => delayRender("star shapes", { timeoutInMilliseconds: 120000 }));
  useEffect(() => {
    (async () => {
      await Promise.all([cor.waitUntilDone(), corI.waitUntilDone(), jost.waitUntilDone()]); await document.fonts.ready;
      const r = rng(7), scatter = new Float32Array(N * 2);
      for (let i = 0; i < N; i++) { scatter[i * 2] = r() * W; scatter[i * 2 + 1] = r() * H; }
      const date = sample(c => {
        c.textAlign = "center"; c.font = `300 214px ${SERIF}`; c.fillText("21.06.1990", W / 2, 1010);
        c.font = `400 62px ${SANS}`; (c as any).letterSpacing = "14px"; c.fillText(copy.city, W / 2, 1140);
      }, 11, 2);
      const list: { file: string; kind: string; ratio: number }[] = await (await fetch(staticFile("designs/index.json"))).json();
      const designs: Pts[] = [];
      for (const [i, d] of list.entries()) {
        const im = await loadImg(staticFile(d.file));
        const bw = d.ratio > 1.5 ? 1000 : 860, bh = 900, k = Math.min(bw / d.ratio, bh) / 1, w = Math.min(bw, bh * d.ratio), hh = w / d.ratio;
        designs.push(sample(c => c.drawImage(im, (W - w) / 2, 1000 - hh / 2, w, hh), 100 + i, 2)); void k;
      }
      const logo = sample(c => { c.translate(W / 2 - 300, 830 - 300); c.scale(600 / 64, 600 / 64); c.fill(new Path2D(STAR)); c.beginPath(); c.arc(32, 32, 16, 0, 7); c.globalAlpha = .5; c.fill(); }, 33, 2);
      set({ scatter, date, designs, logo, kinds: list.map(d => d.kind) }); continueRender(h);
    })().catch(e => { console.error(e); continueRender(h); });
  }, [h, copy.city]);
  return shapes;
};

/* ── the choreography: which shape the stars hold, frame by frame ── */
/* shape ids: -1 scatter · 0 date · 1–9 designs · 10 logo */
type Beat = { a: number; b: number; t: number };
const MORPH_START = s(9), MORPH_STEP = 15, MORPH_LEN = 8;
const beat = (f: number): Beat => {
  const tr = (a: number, b: number, f0: number, len: number): Beat => ({ a, b, t: interpolate(f, [f0, f0 + len], [0, 1], clamp) });
  if (f < 78) return { a: -1, b: -1, t: 0 };
  if (f < 150) return tr(-1, 0, 78, 32);                       // the birth date writes itself in stars
  if (f < MORPH_START) return tr(0, 1, 150, 64);               // the date dissolves into the natal wheel
  if (f < MORPH_START + 8 * MORPH_STEP) {                      // on the beat: the nine designs, one after another
    const k = Math.floor((f - MORPH_START) / MORPH_STEP);
    return tr(1 + k, 2 + k, MORPH_START + k * MORPH_STEP, MORPH_LEN);
  }
  if (f < s(13) + 30) return tr(9, -1, s(13), 26);             // the stars scatter
  if (f < s(21)) return { a: -1, b: -1, t: 0 };
  return tr(-1, 10, s(21), 50);                                // and gather into the STAROT star
};
const designIndex = (f: number) => f < MORPH_START ? 1 : Math.min(9, 2 + Math.floor((f - MORPH_START - MORPH_LEN) / MORPH_STEP) + 0);

/* ── the star field ───────────────────────────────────────────── */
const StarField: React.FC<{ shapes: Shapes }> = ({ shapes }) => {
  const f = useCurrentFrame(), ref = useRef<HTMLCanvasElement>(null);
  const [glow] = useState(() => { const c = document.createElement("canvas"); c.width = W / 2; c.height = H / 2; return c; });
  const [meta] = useState(() => {   // per-star constants: delay, size, colour bucket, twinkle phase, drift
    const r = rng(42), m = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) { m[i * 6] = r(); m[i * 6 + 1] = .7 + r() * 1.6; m[i * 6 + 2] = Math.floor(r() * 3); m[i * 6 + 3] = r() * 6.28; m[i * 6 + 4] = (r() - .5) * 2; m[i * 6 + 5] = (r() - .5) * 2; }
    return m;
  });
  const [dust] = useState(() => { const r = rng(9), d = new Float32Array(900 * 3); for (let i = 0; i < 900; i++) { d[i * 3] = r() * W; d[i * 3 + 1] = r() * H; d[i * 3 + 2] = r(); } return d; });
  useLayoutEffect(() => {
    const cv = ref.current!; const c = cv.getContext("2d")!;
    c.clearRect(0, 0, W, H);
    const { a, b, t } = beat(f);
    const pick = (id: number) => id === -1 ? shapes.scatter : id === 0 ? shapes.date : id === 10 ? shapes.logo : shapes.designs[id - 1];
    const A = pick(a), B = pick(b), still = a === b || t >= 1;
    /* background dust, drifting slowly */
    c.fillStyle = "rgba(233,226,210,.5)";
    c.beginPath();
    for (let i = 0; i < 900; i++) { const x = (dust[i * 3] + f * (.15 + dust[i * 3 + 2] * .35)) % W, y = dust[i * 3 + 1]; const r = .5 + dust[i * 3 + 2] * .9; c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.283); }
    c.fill();
    const COLS = ["#fff6e2", "#f3e3bb", "#e2c58a"];
    const scatterDrift = (i: number) => [Math.sin(f * .012 + meta[i * 6 + 3]) * 14 * meta[i * 6 + 4], Math.cos(f * .01 + meta[i * 6 + 3]) * 14 * meta[i * 6 + 5]];
    for (let bucket = 0; bucket < 3; bucket++) {
      c.fillStyle = COLS[bucket]; c.beginPath();
      for (let i = 0; i < N; i++) {
        if (meta[i * 6 + 2] !== bucket) continue;
        let x: number, y: number;
        const ax = A[i * 2], ay = A[i * 2 + 1], bx = B[i * 2], by = B[i * 2 + 1];
        if (still) { x = (t >= 1 ? bx : ax); y = (t >= 1 ? by : ay); }
        else {
          const d = meta[i * 6], lt = Math.min(1, Math.max(0, (t - d * .35) / .65)), e = lt < .5 ? 4 * lt * lt * lt : 1 - Math.pow(-2 * lt + 2, 3) / 2;
          const dx = bx - ax, dy = by - ay, sw = Math.sin(Math.PI * lt) * .28;   // a swirl across the path
          x = ax + dx * e - dy * sw * meta[i * 6 + 4]; y = ay + dy * e + dx * sw * meta[i * 6 + 4];
        }
        const shapeId = t >= 1 ? b : a; const loose = (shapeId === -1 && (still || t < .02)) || (b === -1 && t > 0);
        if (loose) { const [ox, oy] = scatterDrift(i); x += ox * (b === -1 ? t : 1); y += oy * (b === -1 ? t : 1); }
        else { x += Math.sin(f * .07 + meta[i * 6 + 3]) * .7; y += Math.cos(f * .06 + meta[i * 6 + 3]) * .7; }
        const tw = .75 + .35 * Math.sin(f * .18 + meta[i * 6 + 3] * 3), r = meta[i * 6 + 1] * tw * (loose ? .85 : 1.05);
        c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.283);
      }
      c.fill();
    }
    /* bloom: a blurred copy laid back over the stars; it flares when the music comes back in */
    const flare = interpolate(f, [MORPH_START - 2, MORPH_START + 3, MORPH_START + 24], [0, 1, 0], clamp);
    const g = glow.getContext("2d")!; g.clearRect(0, 0, W / 2, H / 2); g.filter = "blur(9px)"; g.drawImage(cv, 0, 0, W / 2, H / 2); g.filter = "none";
    c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = .55 + .9 * flare; c.drawImage(glow, 0, 0, W, H); c.restore();
  }, [f, shapes, meta, dust, glow]);
  const vis = interpolate(f, [s(13) + 2, s(13) + 16, s(21) - 4, s(21)], [1, 0, 0, 1], clamp);
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, opacity: vis }} />;
};

/* ── captions: words rise in one by one, out of a soft blur ───── */
const Words: React.FC<{ text: string; dur: number; y?: number; size?: number; color?: string; shadow?: boolean; italic?: boolean; delay?: number }> = (
  { text, dur, y = 240, size = 66, color = C.goldBright, shadow = true, italic = true, delay = 3 }) => {
  const f = useCurrentFrame(), words = text.split(" ");
  const out = interpolate(f, [dur - 7, dur], [1, 0], clamp);
  return (
    <div style={{ position: "absolute", left: 64, right: 64, top: y, textAlign: "center", fontFamily: SERIF, fontStyle: italic ? "italic" : "normal",
      fontWeight: 400, fontSize: size, lineHeight: 1.14, color, opacity: out, textShadow: shadow ? "0 2px 22px rgba(0,0,0,.9)" : "none", textWrap: "balance" as any }}>
      {words.map((w, i) => {
        const p = interpolate(f, [delay + i * 2.2, delay + i * 2.2 + 10], [0, 1], { ...clamp, easing: ease });
        return <span key={i} style={{ display: "inline-block", opacity: p, filter: `blur(${(1 - p) * 8}px)`, transform: `translateY(${(1 - p) * 16}px)`, marginRight: ".26em" }}>{w}</span>;
      })}
    </div>
  );
};

/* ── 5 · the sheets, and the files ────────────────────────────── */
const Sheets: React.FC<{ copy: Copy; dur: number }> = ({ copy, dur }) => {
  const f = useCurrentFrame();
  const rise = spring({ frame: f, fps: FPS, config: { damping: 16, mass: 1 } });
  const second = spring({ frame: f - 34, fps: FPS, config: { damping: 15, mass: 1 } });
  const push = interpolate(f, [0, dur], [1, 1.1], clamp);
  const sweep = interpolate(f, [8, 60], [-60, 160], clamp);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 55% at 30% 22%, #3b2a16, ${C.void} 72%)`, perspective: 1800 }}>
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <div style={{ position: "absolute", left: 200, top: 520, width: 640, transform: `translateX(${second * 150}px) rotate(${6 * second}deg)`, opacity: second }}>
          <Img src={staticFile(copy.sheet2)} style={{ width: "100%", borderRadius: 6, boxShadow: "0 40px 90px rgba(0,0,0,.7)", filter: "sepia(.12)" }} />
        </div>
        <div style={{ position: "absolute", left: 180, top: 470, width: 680, transform: `translateY(${(1 - rise) * 900}px) rotateX(${(1 - rise) * 28}deg) rotate(${-4 + 2 * rise - 3 * second}deg) translateX(${-90 * second}px)`, transformOrigin: "50% 100%" }}>
          <Img src={staticFile(copy.sheet)} style={{ width: "100%", borderRadius: 6, boxShadow: "0 50px 110px rgba(0,0,0,.75)", filter: "sepia(.12)" }} />
          <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: `linear-gradient(105deg, transparent ${sweep - 30}%, rgba(255,236,190,.42) ${sweep}%, transparent ${sweep + 30}%)`, mixBlendMode: "soft-light" }} />
        </div>
      </AbsoluteFill>
      {/* the files, as they land in the downloads */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1500, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        {copy.files.map((name, i) => {
          const p = spring({ frame: f - 46 - i * 7, fps: FPS, config: { damping: 18 } });
          return <div key={name} style={{ fontFamily: SANS, fontSize: 30, letterSpacing: ".12em", color: C.goldBright, padding: "12px 26px 10px", borderRadius: 999,
            border: "1px solid rgba(216,184,119,.45)", background: "rgba(5,6,9,.72)", opacity: p, transform: `translateX(${(1 - p) * 220}px)` }}>↓ &nbsp;{name}</div>;
        })}
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(5,6,9,.85) 0, transparent 22%)" }} />
      <Words text={copy.print} dur={dur} y={240} size={58} italic={false} />
    </AbsoluteFill>
  );
};

/* ── 6 · the line drawn in ink, by hand ───────────────────────── */
const Ink: React.FC<{ copy: Copy; dur: number }> = ({ copy, dur }) => {
  const f = useCurrentFrame();
  const [svg, setSvg] = useState<string | null>(null), [h] = useState(() => delayRender("ink svg"));
  useEffect(() => { fetch(staticFile("designs/4-sky.svg")).then(r => r.text()).then(t => { setSvg(t.replace(/#111/g, C.ink).replace(/<path /g, '<path pathLength="1" ').replace(/<svg /, '<svg style="width:100%;height:auto;display:block;overflow:visible" ')); continueRender(h); }); }, [h]);
  const p = interpolate(f, [6, dur - 30], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const push = interpolate(f, [0, dur], [1.0, 1.08], clamp);
  const stamp = interpolate(f, [dur - 34, dur - 20], [0, 1], clamp);
  const half = Math.round(dur / 2);
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {/* paper grain */}
      <AbsoluteFill style={{ opacity: .5, mixBlendMode: "multiply", backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .45  0 0 0 0 .38  0 0 0 0 .28  0 0 0 .22 0"/></filter><rect width="240" height="240" filter="url(#n)"/></svg>')}")` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 70% at 30% 18%, rgba(255,214,150,.35), transparent 60%), radial-gradient(ellipse 120% 100% at 50% 50%, transparent 55%, rgba(60,40,20,.45))" }} />
      <style>{`.ink path[fill="none"]{stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--p))}.ink path:not([fill="none"]){opacity:var(--p)}`}</style>
      <div className="ink" style={{ position: "absolute", left: 90, right: 90, top: 860, transform: `scale(${push})`, ["--p" as any]: p }} dangerouslySetInnerHTML={{ __html: svg || "" }} />
      <div style={{ position: "absolute", bottom: 300, width: "100%", textAlign: "center", fontFamily: SANS, fontSize: 26, letterSpacing: ".34em", color: "rgba(28,26,30,.62)", opacity: stamp }}>
        PORTO · 41.15° N · 8.61° W
      </div>
      <Sequence durationInFrames={half}><Words text={copy.miguel1} dur={half} y={300} size={68} color={C.ink} shadow={false} /></Sequence>
      <Sequence from={half} durationInFrames={dur - half}><Words text={copy.miguel2} dur={dur - half} y={300} size={76} color={C.ink} shadow={false} /></Sequence>
    </AbsoluteFill>
  );
};

/* ── the edit ─────────────────────────────────────────────────── */
export const StarsLaunch: React.FC<{ copy: Copy }> = ({ copy }) => {
  const f = useCurrentFrame(), { durationInFrames } = useVideoConfig();
  const shapes = useShapes(copy);
  const name = interpolate(f, [92, 110, 140, 150], [0, 1, 1, 0], clamp);
  const counterOn = interpolate(f, [MORPH_START - 6, MORPH_START, s(13) - 4, s(13)], [0, 1, 1, 0], clamp);
  const typed = Math.floor(interpolate(f, [s(21) + 40, s(21) + 70], [0, copy.domain.length], clamp));
  const caret = f > s(21) + 34 && f < s(21) + 96 && Math.floor(f / 8) % 2 === 0;
  const offer = interpolate(f, [s(21) + 84, s(21) + 98], [0, 1], { ...clamp, easing: ease });
  const crisp = interpolate(f, [s(21) + 44, s(21) + 60], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 45% at 68% 32%, rgba(84,66,38,.28), transparent 70%), radial-gradient(ellipse 55% 50% at 18% 82%, rgba(38,44,66,.32), transparent 70%), ${C.void}` }}>
      {shapes && <StarField shapes={shapes} />}

      {/* captions over the stars */}
      <Sequence durationInFrames={78}><Words text={copy.hook} dur={78} y={760} size={78} delay={6} /></Sequence>
      <Sequence from={78} durationInFrames={72}><Words text={copy.birth} dur={72} y={250} /></Sequence>
      <div style={{ position: "absolute", top: 1290, width: "100%", textAlign: "center", fontFamily: SANS, fontSize: 34, letterSpacing: ".3em", textTransform: "uppercase", color: C.gold, opacity: name }}>{copy.name}</div>
      <Sequence from={150} durationInFrames={MORPH_START - 150}><Words text={copy.sky} dur={MORPH_START - 150} y={250} /></Sequence>
      <Sequence from={MORPH_START} durationInFrames={s(13) - MORPH_START}><Words text={copy.nine} dur={s(13) - MORPH_START} y={210} size={60} delay={1} /></Sequence>
      <div style={{ position: "absolute", top: 1640, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 300, fontSize: 40, letterSpacing: ".28em", color: C.goldBright, opacity: counterOn, fontVariantNumeric: "tabular-nums" }}>
        {designIndex(f)} <span style={{ color: C.gold, fontSize: 26 }}>{copy.counter}</span> 9
      </div>

      <Sequence from={s(13)} durationInFrames={s(4)} name="sheets"><Sheets copy={copy} dur={s(4)} /></Sequence>
      <Sequence from={s(17)} durationInFrames={s(4)} name="ink"><Ink copy={copy} dur={s(4)} /></Sequence>

      {/* the end: the crisp star settles over the star-made one, then the address */}
      <Sequence from={s(21)}>
        <div style={{ position: "absolute", left: W / 2 - 300, top: 830 - 300, width: 600, height: 600, opacity: crisp * .9 }}>
          <svg viewBox="0 0 64 64" width="600" height="600" style={{ filter: "drop-shadow(0 0 30px rgba(243,227,187,.6)) drop-shadow(0 0 90px rgba(216,184,119,.4))" }}>
            <path d={STAR} fill={C.gold} opacity=".85" /><circle cx="32" cy="32" r="3" fill={C.goldBright} />
          </svg>
        </div>
      </Sequence>
      <div style={{ position: "absolute", top: 1240, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 300, fontSize: 100, letterSpacing: ".16em", paddingLeft: ".16em", color: C.bone }}>
        {f >= s(21) ? copy.domain.slice(0, typed) : ""}<span style={{ opacity: caret ? 1 : 0, color: C.gold }}>|</span>
      </div>
      <div style={{ position: "absolute", top: 1400, width: "100%", textAlign: "center", fontFamily: SANS, fontSize: 34, letterSpacing: ".24em", textTransform: "uppercase", color: C.gold, opacity: offer, transform: `translateY(${(1 - offer) * 14}px)` }}>{copy.offer}</div>

      <AbsoluteFill style={{ background: "radial-gradient(ellipse 120% 95% at 50% 45%, transparent 58%, rgba(0,0,0,.55))", pointerEvents: "none" }} />
      <Audio src={staticFile("music.mp3")} startFrom={MUSIC_FROM}
        volume={fr => interpolate(fr, [0, 8, durationInFrames - 45, durationInFrames - 4], [0, 1, 1, 0], clamp)} />
    </AbsoluteFill>
  );
};
