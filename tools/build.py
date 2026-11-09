#!/usr/bin/env python3
"""Buduje statyczną stronę motywdesign.pl z kodu artefaktu MotywDesign v2.

Wejście:  src/index.source.html  (kod artefaktu, bez ramki dokumentu)
          data/projects/*.json, data/site/content.json  (eksport bazy)
          assets/<id>.<ext>      (zdjęcia z magazynu artefaktu)
Wyjście:  public/  (gotowe pliki na hosting)
"""
import json, glob, os, re, shutil, sys, html
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SITE_URL = os.environ.get('SITE_URL', 'https://motywdesign.pl').rstrip('/')
PUB = ROOT / 'public'

def unwrap(d):
    return d.get('data', d) if isinstance(d, dict) and 'data' in d and isinstance(d['data'], dict) else d

# ---------- dane ----------
projects = []
for f in sorted(glob.glob(str(ROOT / 'db/projects/*.json'))):
    d = unwrap(json.load(open(f, encoding='utf-8')))
    d['id'] = d.get('id') or Path(f).stem
    d['published'] = True            # wszystkie projekty widoczne
    projects.append(d)
site = unwrap(json.load(open(ROOT / 'db/site/content.json', encoding='utf-8')))

# ---------- zdjęcia ----------
from PIL import Image
OPT = ROOT / 'assets_opt'; OPT.mkdir(exist_ok=True)
assets = {}
for p in sorted(glob.glob(str(ROOT / 'assets/*'))):
    b = os.path.basename(p)
    m = re.match(r'^([0-9a-f]{32})\.(\w+)$', b)
    if not m:
        continue
    i = m.group(1)
    if m.group(2) == 'mp4':
        shutil.copy2(ROOT / 'assets_vid' / (i + '.mp4') if (ROOT / 'assets_vid' / (i + '.mp4')).exists() else p, OPT / (i + '.mp4'))
        assets[i] = 'mp4'
        continue
    out = OPT / (i + '.webp')
    if not out.exists():
        im = Image.open(p)
        im.load()
        if im.mode not in ('RGB', 'RGBA'):
            im = im.convert('RGBA' if 'A' in im.mode or im.mode == 'P' else 'RGB')
        im.thumbnail((2000, 2000), Image.LANCZOS)
        im.save(out, 'WEBP', quality=78, method=4)
    assets[i] = 'webp'
used = set()
blob = json.dumps(projects) + json.dumps(site)
for i in re.findall(r'(?:"|vid:|blob:)([0-9a-f]{32})', blob):
    used.add(i)
missing = sorted(i for i in used if i not in assets)
if missing:
    print('UWAGA: brak %d plików graficznych' % len(missing), file=sys.stderr)

# ---------- źródło ----------
src = (ROOT / '../v6/index.html').read_text(encoding='utf-8')

def sub1(old, new, s):
    if old not in s:
        raise SystemExit('Nie znaleziono fragmentu do podmiany: ' + old[:70])
    return s.replace(old, new, 1)

# migawka danych = prawdziwe dane
i = src.index('var SNAP = ')
j = src.index(';\n  function fallbackToExamples(')
snap = json.dumps({'projects': projects, 'site': site}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
src = src[:i] + 'var SNAP = ' + snap + src[j:]

# zdjęcia z folderu /img/
imgx = json.dumps({k: v for k, v in assets.items() if k in used}, separators=(',', ':'))
src = sub1("function blob(id) { return id ? (IMC.mem[id] || '/_blob/' + id) : ''; }",
           "var IMGX = " + imgx + ";\n  function blob(id) { return id ? '/img/' + id + '.' + (IMGX[id] || (window.__IMGX && window.__IMGX[id]) || 'webp') : ''; }", src)

# bez pamięci podręcznej danych w przeglądarce (strona statyczna ma jedną prawdę)
src = sub1("    if (/^#panel/.test(location.hash)) return;\n    try {\n      var raw = localStorage.getItem(DC.key);",
           "    return;\n    try {\n      var raw = localStorage.getItem(DC.key);", src)

# ---------- adresy podstron ----------
STATIC_ROUTER = r"""
  /* ===== Adresy podstron (wersja na własną domenę) ===== */
  var PAGES = __PAGES__;
  function hashToPath(h) {
    h = (h || '').replace(/^#/, '');
    if (ALIAS[h] != null) h = ALIAS[h];
    if (!h) return '/';
    if (h === 'projekty') return '/projekty/';
    if (h === 'studio') return '/studio/';
    if (h === 'jak-pracujemy' || h === 'studio-proces') return '/studio/jak-pracujemy/';
    if (h === 'kontakt') return '/kontakt/';
    if (h === 'uslugi') return '/uslugi/';
    if (h === 'prywatnosc' || h === 'polityka-prywatnosci' || h === 'cookies') return '/prywatnosc/';
    if (h.indexOf('projekt-') === 0) return '/projekty/' + h.slice(8) + '/';
    if (h === 'panel') return '/panel/';
    if (h.indexOf('panel-') === 0) return '/panel/#' + h;
    return null;
  }
  function pathToHash(p) {
    p = (p || '/').replace(/\/index\.html$/, '/').replace(/\/+$/, '');
    if (p === '') return '';
    if (p === '/projekty') return 'projekty';
    if (p === '/studio') return 'studio';
    if (p === '/studio/jak-pracujemy') return 'jak-pracujemy';
    if (p === '/kontakt') return 'kontakt';
    if (p === '/uslugi') return 'uslugi';
    if (p === '/prywatnosc') return 'prywatnosc';
    if (p === '/panel' || p.indexOf('/panel/') === 0) return 'panel';
    if (p.indexOf('/projekty/') === 0) return 'projekt-' + decodeURIComponent(p.slice(10));
    return '';
  }
  (function legacyHash() { var lp = hashToPath(location.hash); if (location.hash && lp && lp !== '/' && location.pathname === '/') history.replaceState(null, '', lp); })();
  function setSeo(r) {
    var key = r.v === 'project' ? 'project:' + r.id : r.v, pg = PAGES[key] || PAGES.home, url = SITE + (hashToPath(r.v === 'about' && r.sec ? 'jak-pracujemy' : r.v === 'project' ? 'projekt-' + r.id : ({ home: '', gallery: 'projekty', about: 'studio', contact: 'kontakt', services: 'uslugi', privacy: 'prywatnosc' })[r.v] || '') || '/');
    document.title = pg.t;
    function mt(sel, attr, val) { var el = document.querySelector(sel); if (el) el.setAttribute(attr, val); }
    mt('meta[name="description"]', 'content', pg.d); mt('link[rel="canonical"]', 'href', url);
    mt('meta[property="og:title"]', 'content', pg.t); mt('meta[property="og:description"]', 'content', pg.d); mt('meta[property="og:url"]', 'content', url);
    if (pg.i) mt('meta[property="og:image"]', 'content', pg.i);
  }
  function fixLinks() {
    [].forEach.call(document.querySelectorAll('a[href^="#"]'), function (a) {
      var h = a.getAttribute('href'); if (a.dataset.hs === h) return; var p = hashToPath(h);
      if (p) { a.dataset.hs = p; a.setAttribute('href', p); }
    });
  }
  function toTop() { try { if (typeof LEN !== 'undefined' && LEN) { LEN.scrollTo(0); return; } } catch (x) {} window.scrollTo({ top: 0, behavior: 'smooth' }); }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var u; try { u = new URL(a.getAttribute('href') || '', location.href); } catch (x) { return; }
    if (u.origin !== location.origin) return;
    var p = u.pathname; if (p.charAt(p.length - 1) !== '/' && p.indexOf('.') < 0) p += '/';
    if (!(p === '/' || pathToHash(p) !== '')) return;
    e.preventDefault();
    if (p === location.pathname) { if (/^#panel/.test(u.hash)) { location.hash = u.hash; return; } toTop(); window.dispatchEvent(new Event('hashchange')); return; }
    history.pushState(null, '', p + u.hash); go(false); window.dispatchEvent(new Event('hashchange'));
  });
  window.addEventListener('popstate', function () { go(false); window.dispatchEvent(new Event('hashchange')); });
  new MutationObserver(function () { fixLinks(); }).observe(document.documentElement, { childList: true, subtree: true });
  fixLinks();
"""

pages = {}
def desc(s, n=158):
    s = re.sub(r'\s+', ' ', (s or '').strip())
    return s if len(s) <= n else s[:n - 1].rsplit(' ', 1)[0] + '…'
hero = site.get('hero', {}) if isinstance(site.get('hero'), dict) else {}
about = site.get('about', {}) if isinstance(site.get('about'), dict) else {}
contact = site.get('contact', {}) if isinstance(site.get('contact'), dict) else {}
base_desc = desc(hero.get('line') or about.get('lead') or 'Pracownia projektowa wnętrz premium. Warszawa i cała Polska.')
NAME = 'MotywDesign'
pages['home'] = {'t': NAME + ' | Wnętrza premium, Warszawa', 'd': base_desc}
pages['gallery'] = {'t': 'Projekty | ' + NAME, 'd': 'Realizacje i projekty wnętrz pracowni MotywDesign: domy, apartamenty i mieszkania.'}
pages['about'] = {'t': 'Studio | ' + NAME, 'd': desc(about.get('lead') or base_desc)}
pages['services'] = {'t': 'Usługi | ' + NAME, 'd': 'Zakres usług pracowni MotywDesign: projekt wnętrz, wizualizacje, dokumentacja wykonawcza i nadzór autorski.'}
pages['contact'] = {'t': 'Kontakt | ' + NAME, 'd': 'Kontakt z pracownią MotywDesign: telefony, e-mail i adres pracowni w Warszawie.'}
pages['privacy'] = {'t': 'Polityka prywatności | ' + NAME, 'd': 'Informacje o danych i plikach cookies na stronie MotywDesign.'}
def img_url(i):
    return SITE_URL + '/img/%s.%s' % (i, assets[i]) if i in assets else ''
for p in projects:
    bits = [b for b in [p.get('location'), ('%s m²' % p['area']) if p.get('area') else '', p.get('scope')] if b]
    d = p.get('lead') or (', '.join(str(b) for b in bits))
    hero_id = p.get('heroImg') or ((p.get('images') or [{}])[0] or {}).get('id') if isinstance((p.get('images') or [{}])[0], dict) else p.get('heroImg')
    pages['project:' + p['id']] = {'t': '%s | %s' % (p.get('title') or p['id'], NAME), 'd': desc(d or base_desc), 'i': img_url(hero_id) if hero_id else ''}

src = sub1("  window.addEventListener('hashchange', function () { go(false); });",
           STATIC_ROUTER.replace('__PAGES__', json.dumps(pages, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')) +
           "\n  window.addEventListener('hashchange', function () { if (/^\\/panel/.test(location.pathname)) { go(false); return; } if (hashToPath(location.hash) && hashToPath(location.hash) !== '/') { history.replaceState(null, '', hashToPath(location.hash)); go(false); } });", src)
src = sub1("var h = (location.hash || '').replace(/^#/, '');\n    if (ALIAS[h] != null) h = ALIAS[h];\n    if (!h) return { v: 'home' };",
           "var h = pathToHash(location.pathname);\n    if (h === 'panel') { var hh = (location.hash || '').replace(/^#/, ''); if (/^panel/.test(hh)) h = hh; }\n    if (!h) return { v: 'home' };", src)
src = sub1("  var ALIAS = {", "  var SITE = '" + SITE_URL + "';\n  var ALIAS = {", src)
src = sub1("    var first = !curKey; curKey = key; curRoute = r;",
           "    var first = !curKey; curKey = key; curRoute = r; setSeo(r);", src)

src = sub1("    document.title = (t || '') + 'MotywDesign';", "    if (r.v !== 'panel') setSeo(r); else document.title = 'Panel · MotywDesign';", src)

src = sub1("    if (!S.canEdit || !S.db || S.dbState !== 'ready' || S.fromCache) return '';\n    var dirty = snapDirty();", "    return '';\n    var dirty = snapDirty();", src)

# panel i funkcje edycji nie istnieją na stronie statycznej: edycja wymaga artefaktu
# (S.canEdit zostaje false, bo brak window.claude)

# ---------- ramka dokumentu ----------
def esc(s):
    return html.escape(s or '', quote=True)

STRIP = [r'<title>.*?</title>\s*', r'<link rel="canonical"[^>]*>\s*', r'<meta name="claude:viewport-fit-sides"[^>]*>\s*',
         r'<meta name="description"[^>]*>\s*', r'<meta property="og:[^"]*"[^>]*>\s*', r'<meta name="twitter:[^"]*"[^>]*>\s*',
         r'<link rel="icon"[^>]*>\s*']
body_src = src.replace('<script src="lib/gsap.min.js">', '<script src="/cms.js"></script>\n<script src="lib/gsap.min.js">', 1).replace('src="lib/', 'src="/lib/').replace('url("fonts/', 'url("/fonts/')
for pat in STRIP:
    body_src = re.sub(pat, '', body_src, flags=re.S)
assert '</head>' in body_src

def head_block(key, url):
    pg = pages[key]
    og = pg.get('i') or HOME_OG
    t = esc(pg['t']); d = esc(pg['d']); u = esc(url); o = esc(og)
    return ('<title>%s</title>\n<meta name="description" content="%s">\n<link rel="canonical" href="%s">\n'
            '<link rel="icon" type="image/svg+xml" href="/favicon.svg">\n'
            '<meta property="og:type" content="website"><meta property="og:site_name" content="%s"><meta property="og:locale" content="pl_PL">\n'
            '<meta property="og:title" content="%s"><meta property="og:description" content="%s"><meta property="og:url" content="%s"><meta property="og:image" content="%s">\n'
            '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="%s"><meta name="twitter:description" content="%s"><meta name="twitter:image" content="%s">\n'
            % (t, d, u, NAME, t, d, u, o, t, d, o))

def noscript(key):
    links = [('/', 'Strona główna'), ('/projekty/', 'Projekty'), ('/studio/', 'Studio'), ('/uslugi/', 'Usługi'), ('/kontakt/', 'Kontakt')]
    li = ''.join('<li><a href="%s">%s</a></li>' % (u, t) for u, t in links)
    pl = ''.join('<li><a href="/projekty/%s/">%s</a></li>' % (esc(p['id']), esc(p.get('title') or p['id'])) for p in projects)
    return '<noscript><h1>%s</h1><p>%s</p><ul>%s</ul><h2>Projekty</h2><ul>%s</ul></noscript>' % (NAME, esc(pages[key]['d']), li, pl)

first_img = None
for p in projects:
    hid = p.get('heroImg')
    if hid in assets:
        first_img = hid; break
HOME_OG = SITE_URL + '/og.png'

def write_page(rel, key):
    url = SITE_URL + ('/' + rel + '/' if rel else '/')
    doc = body_src.replace('</head>', head_block(key, url) + '</head>', 1)
    doc = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + '\n' + noscript(key), doc, count=1)
    out = PUB / rel / 'index.html' if rel else PUB / 'index.html'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(doc, encoding='utf-8')

if PUB.exists():
    shutil.rmtree(PUB)
PUB.mkdir(parents=True)
urls = [('', 'home'), ('projekty', 'gallery'), ('studio', 'about'), ('uslugi', 'services'), ('kontakt', 'contact'), ('prywatnosc', 'privacy')]
for rel, key in urls:
    write_page(rel, key)
for p in projects:
    write_page('projekty/' + p['id'], 'project:' + p['id'])
    urls.append(('projekty/' + p['id'], 'project:' + p['id']))
# 404: ten sam program, pokazuje stronę główną
doc404 = (PUB / 'index.html').read_text(encoding='utf-8')
(PUB / '404.html').write_text(doc404, encoding='utf-8')

# zdjęcia
(PUB / 'img').mkdir()
for i in sorted(used):
    if i in assets:
        shutil.copy2(OPT / ('%s.%s' % (i, assets[i])), PUB / 'img' / ('%s.%s' % (i, assets[i])))

# pliki statyczne z artefaktu: biblioteki, czcionki, ikona, og.png, llms.txt
for sub in ('lib', 'fonts'):
    shutil.copytree(ROOT / 'static' / sub, PUB / sub)
for f in ('favicon.svg', 'og.png', 'llms.txt'):
    shutil.copy2(ROOT / 'static' / f, PUB / f)

# ---------- panel: strona logowania, API, dane startowe ----------
pages['panel'] = {'t': 'Panel | ' + NAME, 'd': 'Panel administracyjny.'}
(PUB / 'panel').mkdir(exist_ok=True)
pdoc = body_src.replace('</head>', head_block('panel', SITE_URL + '/panel/').replace('<meta name="description"', '<meta name="robots" content="noindex,nofollow">\n<meta name="description"', 1) + '</head>', 1)
(PUB / 'panel' / 'index.html').write_text(pdoc, encoding='utf-8')

shutil.copytree(ROOT / 'cms' / 'api', PUB / 'api')
shutil.copy2(ROOT / 'cms' / 'cms.js', PUB / 'cms.js')

import hashlib, secrets
code_file = ROOT / 'setup_code.txt'
if not code_file.exists():
    code_file.write_text(secrets.token_urlsafe(15))
setup_code = code_file.read_text().strip()
(PUB / 'seed').mkdir()
seed = {'projects': {p['id']: {k: v for k, v in p.items() if k != 'id'} for p in projects}, 'site': {'content': site}, 'textEdits': {}}
(PUB / 'seed' / 'content.json').write_text(json.dumps(seed, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
(PUB / 'seed' / 'setup.json').write_text(json.dumps({'sha256': hashlib.sha256(setup_code.encode()).hexdigest()}))
(PUB / 'seed' / '.htaccess').write_text('Require all denied\nDeny from all\n')

# sitemap + robots + .htaccess
today = os.environ.get('LASTMOD', '')
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for rel, key in urls:
    sm.append('<url><loc>%s</loc>%s</url>' % (SITE_URL + ('/' + rel + '/' if rel else '/'), ('<lastmod>%s</lastmod>' % today) if today else ''))
sm.append('</urlset>')
(PUB / 'sitemap.xml').write_text('\n'.join(sm) + '\n')
(PUB / 'robots.txt').write_text('User-agent: *\nAllow: /\nDisallow: /panel/\nDisallow: /api/\nDisallow: /data/\nDisallow: /seed/\nSitemap: %s/sitemap.xml\n' % SITE_URL)
(PUB / '.htaccess').write_text("""DirectoryIndex index.html index.php
ErrorDocument 404 /404.html
Options -Indexes
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{HTTP:X-Forwarded-Proto} =http
RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^projekty/[^/]+/?$ /projekty/index.html [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^panel/.+$ /panel/index.html [L]
</IfModule>
<IfModule mod_headers.c>
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set X-Frame-Options "SAMEORIGIN"
</IfModule>
<IfModule mod_deflate.c>
AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml text/xml
</IfModule>
<IfModule mod_expires.c>
ExpiresActive On
ExpiresByType image/webp "access plus 1 year"
ExpiresByType image/jpeg "access plus 1 year"
ExpiresByType image/png "access plus 1 year"
ExpiresByType image/svg+xml "access plus 1 month"
ExpiresByType text/html "access plus 0 seconds"
</IfModule>
<IfModule mod_headers.c>
<FilesMatch "\\.(webp|jpg|jpeg|png|mp4)$">
Header set Cache-Control "public, max-age=31536000, immutable"
</FilesMatch>
</IfModule>
""")

print('OK: %d podstron, %d zdjęć, %.1f MB' % (len(urls), len(used & set(assets)), sum(f.stat().st_size for f in PUB.rglob('*') if f.is_file()) / 1e6))
