# STAROT · Observatory of Fates

Three ways of asking the dark, all rendered in stardust. A WebGL engine holds
52,000 twinkling stars that slowly rotate like a living universe; whatever you ask,
the answer is drawn by the stars assembling into a figure — a tarot sigil, a natal
wheel, a numerological seal. Move your cursor through it and the tiny lens carves
and swirls the swarm; lift your hand and it settles back.

## The instruments

The first screen is the hall: choose **Tarot reading**, **Astral map**, **Numerology** or **Your tattoos**.
The header links switch between them at any time; the STAROT mark returns to the hall.

### Tarot reading
- **A reading for myself** — deals three cards: past, present, future.
- **For someone else** — pauses for a moment of silent contemplation before the deal.
- Each card's figure is drawn from thousands of stars; reversed cards form upside down.

### Astral map
Enter your birth date, hour and birthplace (a searchable list of ~170 cities, or manual
latitude / longitude / time zone). The observatory computes, in the browser:

- Sun, Moon and the eight planets — sign, degree, house, retrograde.
- Ascendant, Midheaven and Placidus house cusps (equal houses above the polar circles).
- Major aspects (conjunction, opposition, trine, square, sextile) with orbs.
- Element and modality balance.

The stars form your natal wheel; the *Sun*, *Moon* and *Rising* cards each turn the
sky into that sign's seal with a bespoke reading. Tick **I don't know the hour** and
the planets are still cast for the day — only the horizon and houses are left unread.

Positions come from Meeus' solar theory, the principal terms of the lunar theory, and
JPL Keplerian elements for the planets (valid 1800–2050) — good to a fraction of a
degree. Time zones and historical DST are resolved by the browser's `Intl` tables.

### Maya day sign
Enter the birth date. The Tzolk'in, the 260-day count, as K'iche' daykeepers keep it
(GMT correlation 584283 — checked against 21 Dec 2012 = 4 Ajaw). Four cards: the **day sign**
(nawal) with its tone, the **tone** in bar-and-dot numerals, the **trecena** and the **cross**
(the signs 8 and 6 days either side). The twenty day signs are our own drawings, each in a
cartouche on the three-lobed stand of the Maya day signs.

### Numerology
Enter the full name given at birth and the date. Pythagorean letter values, master
numbers 11 · 22 · 33 preserved. Five cards: **Life Path**, **Expression**, **Soul Urge**,
**Personality** and **Personal Year** (birthday and maturity numbers appear in the
Life Path exhibit). Each number has its own geometric seal drawn in stars.

## Free readings, paid tattoos

Every reading is free and complete: tarot, the full astral map (all ten planets, houses,
aspects, Moon and Rising), numerology, the Maya day sign, and a 3600 × 4500 star poster of your sky, with an
optional offering (a pay-what-you-want link).

**The product is the tattoo flash, €5**: nine designs drawn from your own readings —
1. the natal wheel, 2. ☉ beside your Sun sign, 3. the ascendant arrow beside your Rising
sign, 4. both of those in one line, 5. Life Path, Expression, Soul and Persona as their
seals in a row, and from the Maya count 6. the day sign with its tone, 7. the tone in a ring,
8. the trecena, 9. the cross (3 and 4 need the birth hour) — on two
print-ready A3 flash sheets, plus each design as vector SVG and 4000 px PNG in a ZIP for
the tattoo artist. The fourth door, **Your tattoos**, takes name, date, hour and place;
every free reading also ends with **Make it a tattoo**, which carries what it already
knows. The designs can be previewed free (watermarked), drawn in stars and on paper.

Payment is Stripe Checkout through a tiny Cloudflare Worker in [`worker/`](worker/).
There are no accounts and no database: the birth details and the four numbers (never the
name) travel as the Checkout Session's metadata, and after paying, the page's address
(`?sheet=cs_…`) is the buyer's permanent link to their designs, on any device. The paywall
only switches on once `CONFIG.payApi` is set; until then the tattoo files download free.

Setup and going live: [`docs/LAUNCH.md`](docs/LAUNCH.md). Photos and videos of the designs
on skin, for the gallery: [`docs/MEDIA.md`](docs/MEDIA.md).

## How the designs are drawn

Every design is drawn once with the canvas 2D API; a small recorder (`SvgCtx`) replays
the same calls as SVG paths, so the stars, the poster, the flash sheet and the vector
files all come from one drawing. Text inside designs uses hand-drawn single-stroke
characters, so nothing depends on a font.

## Languages

English and Brazilian Portuguese. Portuguese-language browsers get PT automatically;
`?lang=pt` / `?lang=en` force a language (and is what search engines index), and the
EN/PT button in the header switches. Every reading, the city list (with ~100 Brazilian
and Portuguese cities, each in its own historical time zone), the designs' captions,
Stripe's checkout page and the terms (`termos.html`) follow the language.

## Tech

A self-contained `index.html` — WebGL point cloud, hand-drawn arcana, zodiac
and planet glyphs, a small ephemeris, no build step and no dependencies beyond Google
Fonts (JSZip loads from cdnjs only when a ZIP is made). `terms.html` / `termos.html` hold the terms and privacy notice; `worker/` holds the payment
worker (`npm test` runs it against a mock Stripe).

## Credits

Designed and built with Claude. All 22 Major Arcana readings, 36 Sun / Moon / Rising
readings and 12 number readings written for this edition.
