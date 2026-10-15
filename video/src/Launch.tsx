import React, { useEffect, useState } from "react";
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, continueRender, delayRender,
  interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing,
} from "remotion";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";
import { loadFont as loadJost } from "@remotion/google-fonts/Jost";
import type { Copy } from "./copy";

const { fontFamily: SERIF } = loadCormorant("normal", { weights: ["300", "400"] });
loadCormorant("italic", { weights: ["300", "400"] });
const { fontFamily: SANS } = loadJost("normal", { weights: ["300", "400", "500"] });

/* STAROT palette: the site's void, gold and bone */
const C = { void: "#050609", gold: "#d8b877", goldBright: "#f3e3bb", bone: "#ebe5d6", ink: "#1c1a1e", stencil: "#43307f" };
const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

/* the shot list, in frames */
export const SHOTS = {
  peel: [0, s(2)], phone: [s(2), s(5)], sky: [s(5), s(9)], nine: [s(9), s(13)],
  print: [s(13), s(17)], hands: [s(17), s(21)], end: [s(21), s(26)],
} as const;
export const DURATION = s(26);

/* the track: Blop, from 4:27, so its re-entry at 4:36 lands on the nine designs (9 s) */
const MUSIC_FROM = s(4 * 60 + 27);

const ease = Easing.bezier(.2, .7, .2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ── shared pieces ───────────────────────────────────────────── */

/** one warm lamp: a glow from the upper left and a soft vignette over every shot */
const Lamp: React.FC<{ strength?: number }> = ({ strength = 1 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 55% at 18% 8%, rgba(255,176,96,${.16 * strength}), transparent 70%)`, mixBlendMode: "screen" }} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 120% 95% at 50% 45%, transparent 55%, rgba(0,0,0,.62))" }} />
  </AbsoluteFill>
);

/** a caption that rises in and fades out at the end of its shot */
const Caption: React.FC<{ text: string; dur: number; y?: number; size?: number; italic?: boolean; delay?: number; color?: string }> = (
  { text, dur, y = 230, size = 66, italic = true, delay = 4, color = C.goldBright }) => {
  const f = useCurrentFrame();
  const inP = interpolate(f, [delay, delay + 12], [0, 1], { ...clamp, easing: ease });
  const out = interpolate(f, [dur - 8, dur], [1, 0], clamp);
  return (
    <div style={{
      position: "absolute", left: 70, right: 70, top: y, textAlign: "center", fontFamily: SERIF, fontStyle: italic ? "italic" : "normal",
      fontWeight: 400, fontSize: size, lineHeight: 1.12, color, opacity: inP * out, transform: `translateY(${(1 - inP) * 18}px)`,
      textShadow: "0 2px 18px rgba(0,0,0,.85), 0 0 2px rgba(0,0,0,.6)", textWrap: "balance" as any,
    }}>{text}</div>
  );
};

/** a dark band behind captions on bright footage */
const Scrim: React.FC<{ top?: boolean }> = ({ top = true }) => (
  <AbsoluteFill style={{ background: top ? "linear-gradient(to bottom, rgba(5,6,9,.78) 0, rgba(5,6,9,.35) 26%, transparent 42%)" : "none" }} />
);

/* ── 1 · the stencil peels off the skin ──────────────────────── */
const Peel: React.FC<{ copy: Copy; dur: number }> = ({ copy, dur }) => {
  const f = useCurrentFrame();
  const peel = interpolate(f, [18, dur - 2], [0, 1], { ...clamp, easing: Easing.bezier(.5, 0, .3, 1) });
  const zoom = interpolate(f, [0, dur], [1.06, 1.12], clamp);
  const design = { left: 190, top: 900, width: 700, height: 350 };
  const lines = (color: string, opacity: number, blur = 0): React.CSSProperties => ({
    position: "absolute", ...design, backgroundColor: color, opacity, filter: blur ? `blur(${blur}px)` : undefined,
    WebkitMaskImage: `url(${staticFile("stencil.png")})`, WebkitMaskSize: "contain", WebkitMaskRepeat: "no-repeat", WebkitMaskPosition: "center",
  });
  return (
    <AbsoluteFill style={{ background: C.void, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 58%" }}>
        <Img src={staticFile("skin.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "brightness(.78) saturate(1.05)" }} />
        {/* the purple transfer left on the skin, clearer as the paper lifts */}
        <div style={lines(C.stencil, .42 + .3 * peel, 1.1)} />
        {/* the stencil paper, hinged on its left edge */}
        <div style={{ position: "absolute", left: 140, top: 820, width: 800, height: 510, perspective: 1600 }}>
          <div style={{
            position: "absolute", inset: 0, transformOrigin: "0% 50%",
            transform: `rotateY(${-100 * peel}deg) rotateZ(${-4 * peel}deg) translateZ(${40 * peel}px)`, transformStyle: "preserve-3d",
            background: `linear-gradient(${100 + 40 * peel}deg, rgba(252,250,246,.93), rgba(236,232,226,.9))`,
            boxShadow: `0 ${18 + 30 * peel}px ${40 + 40 * peel}px rgba(0,0,0,${.28 + .25 * peel})`, borderRadius: 4,
            opacity: interpolate(peel, [.9, 1], [1, 0], clamp),
          }}>
            <div style={{ ...lines(C.stencil, .85), left: 50, top: 80 }} />
          </div>
        </div>
      </AbsoluteFill>
      <Lamp />
      <Scrim />
      <Caption text={copy.hook} dur={dur} y={250} size={70} delay={2} />
    </AbsoluteFill>
  );
};

/* ── a phone, for the screen recording ───────────────────────── */
const Phone: React.FC<{ children: React.ReactNode; scale?: number; y?: number }> = ({ children, scale = 1, y = 420 }) => {
  const W = 650, H = Math.round(650 * 1688 / 780);
  return (
    <div style={{ position: "absolute", left: (1080 - W) / 2 - 16, top: y, width: W + 32, height: H + 32, transform: `scale(${scale})`, transformOrigin: "50% 20%" }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 74, background: "linear-gradient(145deg,#2a2622,#0d0c0b 60%,#1d1a17)",
        boxShadow: "0 60px 120px rgba(0,0,0,.75), 0 0 0 2px rgba(216,184,119,.22), 0 0 80px rgba(255,170,90,.12)" }} />
      <div style={{ position: "absolute", left: 16, top: 16, width: W, height: H, borderRadius: 60, overflow: "hidden", background: "#000" }}>{children}</div>
    </div>
  );
};

/* ── 2 · opening starot.one and typing ───────────────────────── */
const PhoneTap: React.FC<{ copy: Copy; dur: number }> = ({ copy, dur }) => {
  const f = useCurrentFrame();
  const rise = spring({ frame: f, fps: FPS, config: { damping: 18, mass: .8 } });
  const A = { from: 2.7, len: 1.2 };             // the tap on "Get my tattoo files", at real speed
  const B = { from: 5.0, to: 11.25 };            // the form being filled, sped up to fit
  const aFrames = s(A.len), bFrames = dur - aFrames, rate = (B.to - B.from) / (bFrames / FPS);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 50% at 50% 60%, #15120e, ${C.void} 70%)` }}>
      <div style={{ transform: `translateY(${(1 - rise) * 120}px)`, position: "absolute", inset: 0 }}>
        <Phone>
          <Sequence durationInFrames={aFrames}><OffthreadVideo src={staticFile(copy.rec)} startFrom={s(A.from)} muted style={{ width: "100%" }} /></Sequence>
          <Sequence from={aFrames} durationInFrames={bFrames}><OffthreadVideo src={staticFile(copy.rec)} startFrom={s(B.from)} playbackRate={rate} muted style={{ width: "100%" }} /></Sequence>
        </Phone>
      </div>
      <Lamp strength={.8} />
      <Caption text={copy.birth} dur={dur} y={250} />
    </AbsoluteFill>
  );
};

/* ── 3 · the star map drawing itself, uncut ──────────────────── */
const SkyDraw: React.FC<{ copy: Copy; dur: number }> = ({ copy, dur }) => {
  const f = useCurrentFrame();
  const zoom = interpolate(f, [0, dur], [1.0, 1.22], { ...clamp, easing: Easing.inOut(Easing.quad) });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 50% at 50% 60%, #15120e, ${C.void} 70%)` }}>
      <Phone scale={zoom}><OffthreadVideo src={staticFile(copy.rec)} startFrom={s(12.5)} muted style={{ width: "100%" }} /></Phone>
      <Lamp strength={.8} />
      <Caption text={copy.sky} dur={dur} y={250} />
    </AbsoluteFill>
  );
};

/* ── 4 · the nine designs appear, one by one ─────────────────── */
type Design = { file: string; kind: string; ratio: number };
const useDesigns = () => {
  const [items, setItems] = useState<(Design & { svg: string })[] | null>(null);
  const [handle] = useState(() => delayRender("designs"));
  useEffect(() => {
    (async () => {
      const list: Design[] = await (await fetch(staticFile("designs/index.json"))).json();
      const out = await Promise.all(list.map(async d => ({ ...d,
        svg: (await (await fetch(staticFile(d.file))).text())
          .replace(/#111/g, C.goldBright).replace(/<path /g, '<path pathLength="1" ')
          .replace(/<svg /, '<svg style="width:100%;height:100%;display:block;overflow:visible" ') })));
      setItems(out); continueRender(handle);
    })();
  }, [handle]);
  return items;
};
/* the same arrangement as the site's showcase: wheel, Sun and Rising, the line, the seals, the four Maya signs */
const SLOTS: Record<string, { x: number; y: number; w: number; h: number }> = {
  wheel: { x: 300, y: 400, w: 480, h: 480 },
  sun: { x: 90, y: 935, w: 420, h: 210 }, rising: { x: 570, y: 935, w: 420, h: 210 },
  sky: { x: 150, y: 1190, w: 780, h: 195 },
  seals: { x: 130, y: 1420, w: 820, h: 186 },
  maya: { x: 95, y: 1650, w: 180, h: 229 }, mtone: { x: 335, y: 1675, w: 180, h: 180 },
  mtrecena: { x: 575, y: 1650, w: 180, h: 229 }, mcross: { x: 805, y: 1665, w: 200, h: 200 },
};
const Nine: React.FC<{ copy: Copy; dur: number }> = ({ copy, dur }) => {
  const f = useCurrentFrame();
  const items = useDesigns();
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 60% at 50% 55%, #14110c, ${C.void} 72%)` }}>
      <style>{`.dz path[fill="none"]{stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--p))}.dz path:not([fill="none"]){opacity:var(--p)}`}</style>
      {items?.map((d, i) => {
        const start = 6 + i * 10, p = interpolate(f, [start, start + 22], [0, 1], { ...clamp, easing: ease });
        const slot = SLOTS[d.kind]; if (!slot) return null;
        return (
          <div key={d.kind} className="dz" style={{ position: "absolute", left: slot.x, top: slot.y, width: slot.w, height: slot.h,
            ["--p" as any]: p, opacity: Math.min(1, p * 3), filter: `drop-shadow(0 0 ${10 * p}px rgba(243,227,187,.35))`,
            transform: `scale(${.94 + .06 * p})` }} dangerouslySetInnerHTML={{ __html: d.svg }} />
        );
      })}
      <Lamp strength={.6} />
      <Caption text={copy.nine} dur={dur} y={170} size={60} />
    </AbsoluteFill>
  );
};

/* ── 5 · the sheet, then the designs on skin ─────────────────── */
const Print: React.FC<{ copy: Copy; dur: number }> = ({ copy, dur }) => {
  const f = useCurrentFrame();
  const sheetLen = s(1.4), photoLen = Math.round((dur - sheetLen) / 3);
  const photos = ["hands-sun-rising.jpg", "wheel-thigh-woman.jpg", "maya-day-chest-man.jpg"];
  const sp = interpolate(f, [0, sheetLen], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: C.void }}>
      <Sequence durationInFrames={sheetLen}>
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 55% at 30% 20%, #3a2a17, ${C.void} 75%)` }}>
          <Img src={staticFile(copy.sheet)} style={{ position: "absolute", left: 140, top: 430, width: 800, borderRadius: 6,
            transform: `rotate(${-3 + 2 * sp}deg) scale(${.96 + .06 * sp})`, boxShadow: "0 40px 90px rgba(0,0,0,.7)",
            filter: "sepia(.18) brightness(.96)" }} />
        </AbsoluteFill>
      </Sequence>
      {photos.map((src, i) => (
        <Sequence key={src} from={sheetLen + i * photoLen} durationInFrames={photoLen}>
          <KenBurns src={src} dur={photoLen} dir={i % 2 ? -1 : 1} wide={src.startsWith("hands")} focus={src.startsWith("maya-day") ? "68% 45%" : "50% 55%"} />
        </Sequence>
      ))}
      <Lamp />
      <Scrim />
      <Caption text={copy.print} dur={dur} y={240} size={58} italic={false} />
    </AbsoluteFill>
  );
};
/* upright photos fill the frame; a landscape photo is shown whole, over a blurred copy of itself */
const KenBurns: React.FC<{ src: string; dur: number; dir?: number; wide?: boolean; focus?: string }> = ({ src, dur, dir = 1, wide = false, focus = "50% 50%" }) => {
  const f = useCurrentFrame();
  const z = interpolate(f, [0, dur], wide ? [1.0, 1.06] : [1.06, 1.14], clamp), x = interpolate(f, [0, dur], [0, 18 * dir], clamp);
  const fade = interpolate(f, [0, 4], [0, 1], clamp);
  const look = { filter: "brightness(.9) sepia(.12)" };
  if (!wide) return <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: focus, opacity: fade, transform: `scale(${z}) translateX(${x}px)`, ...look }} />;
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(40px) brightness(.45)", transform: "scale(1.2)" }} />
      <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: 560, width: 1080, transform: `scale(${z}) translateX(${x}px)`, boxShadow: "0 30px 80px rgba(0,0,0,.6)", ...look }} />
    </AbsoluteFill>
  );
};

/* ── 6 · the hand traces the wheel ───────────────────────────── */
const Hands: React.FC<{ copy: Copy; dur: number }> = ({ copy, dur }) => {
  const f = useCurrentFrame();
  /* the wheel's centre and the pen tip, in the 1080×1920 still; the ink sweeps round and ends at the pen */
  const cx = 535, cy = 784;
  const a = interpolate(f, [4, dur - 18], [0, 360], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const zoom = interpolate(f, [0, dur], [1.04, 1.16], clamp);
  const flicker = 1 + .04 * Math.sin(f * .9) + .025 * Math.sin(f * 2.3);
  const mask = `conic-gradient(from 180deg at ${cx}px ${cy}px, #000 0deg, #000 ${a}deg, transparent ${a + .5}deg)`;
  const half = Math.round(dur / 2);
  return (
    <AbsoluteFill style={{ background: C.void, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: `${cx}px ${cy + 120}px`, filter: `brightness(${flicker})` }}>
        <Img src={staticFile("desk-bare.jpg")} style={{ position: "absolute", width: 1080, height: 1920 }} />
        <Img src={staticFile("desk-wheel.jpg")} style={{ position: "absolute", width: 1080, height: 1920, WebkitMaskImage: mask, maskImage: mask }} />
      </AbsoluteFill>
      <Lamp strength={.5} />
      <Scrim />
      <Sequence durationInFrames={half}><Caption text={copy.miguel1} dur={half} y={250} size={64} /></Sequence>
      <Sequence from={half} durationInFrames={dur - half}><Caption text={copy.miguel2} dur={dur - half} y={250} size={70} /></Sequence>
    </AbsoluteFill>
  );
};

/* ── 7 · starot.one, then the gold star ──────────────────────── */
const STAR = "M32 8 L35.8 25.6 L52 12 L38.4 28.2 L56 32 L38.4 35.8 L52 52 L35.8 38.4 L32 56 L28.2 38.4 L12 52 L25.6 35.8 L8 32 L25.6 28.2 L12 12 L28.2 25.6 Z";
export const Star: React.FC<{ size: number; glow?: number }> = ({ size, glow = 1 }) => (
  <svg viewBox="0 0 64 64" width={size} height={size} style={{ filter: `drop-shadow(0 0 ${24 * glow}px rgba(243,227,187,.55)) drop-shadow(0 0 ${60 * glow}px rgba(216,184,119,.35))` }}>
    <circle cx="32" cy="32" r="16" fill={C.gold} opacity=".14" />
    <path d={STAR} fill={C.gold} /><circle cx="32" cy="32" r="3" fill={C.goldBright} />
  </svg>
);
const End: React.FC<{ copy: Copy; dur: number }> = ({ copy, dur }) => {
  const f = useCurrentFrame();
  const typed = Math.floor(interpolate(f, [8, 44], [0, copy.domain.length], clamp));
  const caret = f < 70 && Math.floor(f / 8) % 2 === 0;
  const star = spring({ frame: f - 52, fps: FPS, config: { damping: 14, mass: .9 } });
  const offer = interpolate(f, [78, 92], [0, 1], { ...clamp, easing: ease });
  const breathe = 1 + .03 * Math.sin(f / 9);
  return (
    <AbsoluteFill style={{ background: C.void, alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 640, width: "100%", display: "flex", justifyContent: "center", transform: `scale(${star * breathe})`, opacity: star }}>
        <Star size={240} glow={star} />
      </div>
      <div style={{ position: "absolute", top: 960, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 300, fontSize: 92,
        letterSpacing: ".16em", color: C.bone, paddingLeft: ".16em" }}>
        {copy.domain.slice(0, typed)}<span style={{ opacity: caret ? 1 : 0, color: C.gold, fontWeight: 300 }}>|</span>
      </div>
      <div style={{ position: "absolute", top: 1110, width: "100%", textAlign: "center", fontFamily: SANS, fontWeight: 400, fontSize: 34,
        letterSpacing: ".24em", textTransform: "uppercase", color: C.gold, opacity: offer, transform: `translateY(${(1 - offer) * 14}px)` }}>
        {copy.offer}
      </div>
    </AbsoluteFill>
  );
};

/* ── the edit ─────────────────────────────────────────────────── */
export const Launch: React.FC<{ copy: Copy }> = ({ copy }) => {
  const { durationInFrames } = useVideoConfig();
  const shot = (key: keyof typeof SHOTS, El: React.FC<{ copy: Copy; dur: number }>) => {
    const [a, b] = SHOTS[key];
    return <Sequence from={a} durationInFrames={b - a} name={key}><El copy={copy} dur={b - a} /></Sequence>;
  };
  return (
    <AbsoluteFill style={{ background: C.void }}>
      {shot("peel", Peel)}{shot("phone", PhoneTap)}{shot("sky", SkyDraw)}{shot("nine", Nine)}
      {shot("print", Print)}{shot("hands", Hands)}{shot("end", End)}
      <Audio src={staticFile("music.mp3")} startFrom={MUSIC_FROM}
        volume={f => interpolate(f, [0, 8, durationInFrames - 45, durationInFrames - 4], [0, 1, 1, 0], clamp)} />
    </AbsoluteFill>
  );
};

/* ── the cover: the nine-design sheet, "the stars drew my tattoo" ── */
export const Cover: React.FC<{ copy: Copy }> = ({ copy }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 55% at 28% 18%, #3a2a17, ${C.void} 72%)` }}>
    <Img src={staticFile(copy.sheet)} style={{ position: "absolute", left: 170, top: 520, width: 740, borderRadius: 6, transform: "rotate(-2.5deg)",
      boxShadow: "0 50px 110px rgba(0,0,0,.75)", filter: "sepia(.15)" }} />
    <div style={{ position: "absolute", left: 70, right: 70, top: 200, textAlign: "center", fontFamily: SERIF, fontStyle: "italic", fontWeight: 400,
      fontSize: 104, lineHeight: 1.02, color: C.goldBright, textShadow: "0 4px 30px rgba(0,0,0,.8)", textWrap: "balance" as any }}>{copy.cover}</div>
    <div style={{ position: "absolute", bottom: 150, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 18,
      fontFamily: SANS, fontWeight: 300, fontSize: 44, letterSpacing: ".18em", color: C.bone }}>
      <Star size={56} glow={.6} />starot.one
    </div>
    <Lamp strength={.7} />
  </AbsoluteFill>
);
