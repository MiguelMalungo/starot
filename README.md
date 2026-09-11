# STAROT · Observatory of Fates

Three ways of asking the dark, all rendered in stardust. A WebGL engine holds
52,000 twinkling stars that slowly rotate like a living universe; whatever you ask,
the answer is drawn by the stars assembling into a figure — a tarot sigil, a natal
wheel, a numerological seal. Move your cursor through it and the tiny lens carves
and swirls the swarm; lift your hand and it settles back.

## The instruments

The first screen is the hall: choose **Tarot reading**, **Astral map** or **Numerology**.
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

### Numerology
Enter the full name given at birth and the date. Pythagorean letter values, master
numbers 11 · 22 · 33 preserved. Five cards: **Life Path**, **Expression**, **Soul Urge**,
**Personality** and **Personal Year** (birthday and maturity numbers appear in the
Life Path exhibit). Each number has its own geometric seal drawn in stars.

## Tech

A single self-contained `index.html` — WebGL point cloud, hand-drawn arcana, zodiac
and planet glyphs, a small ephemeris, no build step and no dependencies beyond Google
Fonts. Just open the file, or visit the GitHub Pages deployment.

## Credits

Designed and built with Claude. All 22 Major Arcana readings, 36 Sun / Moon / Rising
readings and 12 number readings written for this edition.
