#!/usr/bin/env python3
"""Build pt/index.html, the static Portuguese twin of index.html (GitHub Pages cannot vary by ?lang=).
Run after every change to index.html:  python3 tools/build-pt.py"""
import pathlib, re, sys
root = pathlib.Path(__file__).resolve().parent.parent
s = (root / "index.html").read_text()
TITLE = "STAROT · Tarot, Mapa Astral, Numerologia e Flash de Tatuagem Grátis"
DESC = ("Tarot, mapa astral, numerologia e signo maia grátis. Transforme a sua leitura em nove desenhos "
        "de flash de tatuagem prontos a imprimir (SVG, PNG).")
def sub(pat, rep):
    global s
    s, n = re.subn(pat, lambda m: rep, s, count=1)
    if n != 1: sys.exit(f"build-pt: pattern not found: {pat}")
sub(r'<html lang="en">', '<html lang="pt-BR">')
sub(r'<head>\n', '<head>\n<base href="/">\n')
sub(r'<title>.*?</title>', f'<title>{TITLE}</title>')
sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{DESC}">')
sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="https://starot.one/pt/">')
sub(r'<meta property="og:locale" content="en_US">\n<meta property="og:locale:alternate" content="pt_BR">',
    '<meta property="og:locale" content="pt_BR">\n<meta property="og:locale:alternate" content="en_US">')
sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{TITLE}">')
sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{DESC}">')
sub(r'<meta property="og:url" content="[^"]*">', '<meta property="og:url" content="https://starot.one/pt/">')
sub(r'<meta name="twitter:title" content="[^"]*">', '<meta name="twitter:title" content="STAROT · Tarot, mapa astral e flash de tatuagem grátis">')
sub(r'<meta name="twitter:description" content="[^"]*">', '<meta name="twitter:description" content="A sua leitura, desenhada em pó de estrelas, transformada em nove desenhos de flash de tatuagem.">')
# the intro/FAQ in Portuguese in the served HTML, so crawlers see it without JS
pt = dict(re.findall(r"'(about\.[a-z0-9]+)':'([^']*)'", s))
for k, v in pt.items():
    s, n = re.subn(r'(data-t="%s">)[^<]*(<)' % re.escape(k), lambda m: m.group(1) + v + m.group(2), s, count=1)
    if n != 1: sys.exit(f"build-pt: {k} not found")
import json
qs = sorted(int(k[7:]) for k in pt if re.fullmatch(r"about\.q\d+", k))
faq_pt = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "inLanguage": "pt-BR", "mainEntity": [
    {"@type": "Question", "name": pt[f"about.q{i}"], "acceptedAnswer": {"@type": "Answer", "text": pt[f"about.a{i}"]}} for i in qs]},
    ensure_ascii=False)
s, n = re.subn(r'(<script type="application/ld\+json" id="faqLd">\n).*?(\n</script>)', lambda m: m.group(1) + faq_pt + m.group(2), s, count=1, flags=re.S)
if n != 1: sys.exit("build-pt: faqLd not found")

# bake menu.h1 (contains nested tags; about.* regex cannot handle it)
s, n = re.subn(r'(<h1 data-t="menu\.h1">).*?(</h1>)',
    lambda m: m.group(1) + 'Escolha o seu<br><em>instrumento.</em>' + m.group(2),
    s, count=1, flags=re.S)
if n != 1: sys.exit("build-pt: menu.h1 not found")
# PT-specific WebApplication JSON-LD
webapp_pt = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "STAROT",
  "url": "https://starot.one/pt/",
  "applicationCategory": "LifestyleApplication",
  "operatingSystem": "Any (web browser)",
  "inLanguage": "pt-BR",
  "description": (
    "Tarot, mapa astral, numerologia e signo maia grátis, mais um gerador de flash de tatuagem "
    "com folhas prontas a imprimir (SVG/PNG/ZIP). O STAROT em starot.one é um app web gratuito e "
    "independente de Miguel Ferraz Guedes e não tem afiliação com o app de astrologia Starot AI "
    "(starot.ai / NOONWAKE)."
  ),
  "image": "https://starot.one/og.jpg",
  "screenshot": "https://starot.one/og.jpg",
  "dateModified": "2026-11-09",
  "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
  "author": {
    "@type": "Person",
    "name": "Miguel Ferraz Guedes",
    "url": "https://miguelfguedes.pt",
    "sameAs": [
      "https://www.instagram.com/1gato100futuro/",
      "https://www.tiktok.com/@1gato100vidas",
      "https://linktr.ee/miguelfguedes",
    ],
  },
}
# pull sameAs from the EN block we are replacing, so handles stay in sync
m_wa = re.search(r'<script type="application/ld\+json">\n(\{"@context":"https://schema\.org","@type":"WebApplication".*?)\n</script>', s, flags=re.S)
if not m_wa: sys.exit("build-pt: WebApplication not found for sameAs sync")
en_wa = json.loads(m_wa.group(1))
webapp_pt["author"]["sameAs"] = en_wa["author"]["sameAs"]
webapp_pt["author"]["url"] = en_wa["author"]["url"]
# multi-line layout similar to EN
desc_json = json.dumps(webapp_pt["description"], ensure_ascii=False)
same_json = json.dumps(webapp_pt["author"]["sameAs"], ensure_ascii=False, separators=(",", ":"))
url_json = json.dumps(webapp_pt["author"]["url"], ensure_ascii=False)
webapp_pt_block = (
  '<script type="application/ld+json">\n'
  '{"@context":"https://schema.org","@type":"WebApplication","name":"STAROT","url":"https://starot.one/pt/",\n'
  '"applicationCategory":"LifestyleApplication","operatingSystem":"Any (web browser)","inLanguage":"pt-BR",\n'
  f'"description":{desc_json},\n'
  '"image":"https://starot.one/og.jpg",\n'
  '"screenshot":"https://starot.one/og.jpg",\n'
  '"dateModified":"2026-11-09",\n'
  '"offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"},\n'
  f'"author":{{"@type":"Person","name":"Miguel Ferraz Guedes","url":{url_json},\n'
  f'"sameAs":{same_json}' + '}}\n'
  '</script>'
)
s, n = re.subn(
    r'<script type="application/ld\+json">\n\{"@context":"https://schema\.org","@type":"WebApplication".*?\n</script>',
    webapp_pt_block,
    s, count=1, flags=re.S)
if n != 1: sys.exit("build-pt: WebApplication replace failed")

sub(r'<script>\n', "<script>window.FORCE_LANG='pt'</script>\n<script>\n")
out = root / "pt" / "index.html"
out.parent.mkdir(exist_ok=True)
s = s.replace("<!DOCTYPE html>\n", "<!DOCTYPE html>\n<!-- generated by tools/build-pt.py from index.html; do not edit -->\n", 1)
out.write_text(s)
print("wrote", out.relative_to(root))
