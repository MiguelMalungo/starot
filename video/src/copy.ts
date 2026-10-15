/* Everything the viewer reads, in both languages. The edit is the same; only the words change. */
export type Copy = {
  hook: string; birth: string; sky: string; nine: string; print: string;
  miguel1: string; miguel2: string; domain: string; offer: string; cover: string;
  rec: string; sheet: string; sheet2: string;
  name: string; city: string; files: string[]; counter: string;
};

export const EN: Copy = {
  hook: "I asked the stars to design a tattoo.",
  birth: "your birthday + name →",
  sky: "→ the sky the night you were born",
  nine: "→ 9 designs from your sky, numbers & Maya signs",
  print: "print-ready · SVG · PNG",
  miguel1: "I'm Miguel, an artist from Porto.",
  miguel2: "I made this for you.",
  domain: "starot.one",
  offer: "free until 15 Jan · then €5",
  cover: "the stars drew my tattoo",
  rec: "rec/phone-en.mp4",
  sheet: "sheet-en-1.jpg",
  sheet2: "sheet-en-2.jpg",
  name: "Maria Inês Soares Costa",
  city: "09:15 · LISBON",
  files: ["natal-wheel.svg", "sun-gemini.png", "maya-day-1-imix.svg", "flash-sheet · A3 · 300 dpi"],
  counter: "of",
};

export const PT: Copy = {
  hook: "Pedi às estrelas que desenhassem uma tatuagem.",
  birth: "o seu aniversário + nome →",
  sky: "→ o céu da noite em que nasceu",
  nine: "→ 9 desenhos do seu céu, números e signos maias",
  print: "pronta para imprimir · SVG · PNG",
  miguel1: "Sou o Miguel, artista do Porto.",
  miguel2: "Fiz isto para você.",
  domain: "starot.one",
  offer: "grátis até 15 jan · depois €5",
  cover: "as estrelas desenharam a minha tatuagem",
  rec: "rec/phone-pt.mp4",
  sheet: "sheet-pt-1.jpg",
  sheet2: "sheet-pt-2.jpg",
  name: "Maria Inês Soares Costa",
  city: "09:15 · LISBOA",
  files: ["roda-natal.svg", "sol-gemeos.png", "nawal-1-imix.svg", "folha de flash · A3 · 300 dpi"],
  counter: "de",
};
