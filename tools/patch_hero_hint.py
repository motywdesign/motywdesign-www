#!/usr/bin/env python3
"""Pierwszy ekran: wskaźnik 5 ujęć wyciągnięty ponad rozmycie krawędzi (01-05, kuleczka, podpis),
spokojniejsze przełączanie (zatrzymanie kursora 220 ms, przenikanie 0,7 s).
Idempotentny (znacznik HERO_HINT_V1). Uruchamiać po każdym przebudowaniu strony ze źródła, po patch_wfx.py.
Użycie: patch_hero_hint.py [plik.html ...]  (bez argumentów: wszystkie public/**/*.html)"""
import glob, sys
from pathlib import Path
PUB = Path(__file__).resolve().parent.parent / 'public'
MARK = 'HERO_HINT_V1'

CSS_OLD = """.hind { position: absolute; z-index: 6; left: 5vw; right: 5vw; bottom: 3.5vh; height: 34px; pointer-events: none; color: #fff; }
.hind .hk { position: absolute; bottom: 12px; left: calc((var(--i, 0) + .5) / var(--n) * 100%); transform: translateX(-50%); display: flex; align-items: center; gap: 8px; white-space: nowrap; transition: left .7s cubic-bezier(.16,1,.3,1); }
.hind .hk .sq { width: 8px; height: 8px; background: #fff; }
.hind .hdots { position: absolute; left: 0; right: 0; bottom: 0; display: flex; gap: 6px; }
.hind .hdots i { flex: 1; height: 2px; background: rgba(255,255,255,.28); transition: background .5s; }
.hind .hdots i.on { background: #fff; }
.hero .imgs .hv { transition: opacity .45s cubic-bezier(.33,1,.68,1); }"""

CSS_NEW = """/*HERO_HINT_V1*/
/* wskaźnik ujęć stoi nad pasem rozmycia krawędzi (10vh od dołu), więc jest ostry; napisy w środku stref, poza bocznym rozmyciem */
.hind { --g: 8px; position: absolute; z-index: 6; left: 5vw; right: 5vw; bottom: calc(10vh + 12px); pointer-events: none; color: #fff; text-shadow: 0 1px 10px rgba(0,0,0,.45); }
.hind .hn { display: flex; gap: var(--g); font-family: var(--font-mono); font-size: 12px; line-height: 1; letter-spacing: .04em; margin-bottom: 11px; }
.hind .hn span { flex: 1; text-align: center; color: rgba(255,255,255,.72); transition: color .5s, transform .7s cubic-bezier(.16,1,.3,1); }
.hind .hn span.on { color: #fff; transform: translateY(-2px); }
.hind .hdots { position: relative; display: flex; gap: var(--g); height: 3px; }
.hind .hdots i { flex: 1; height: 3px; background: rgba(255,255,255,.42); transition: background .5s; }
.hind .hdots i.on { background: #fff; }
.hind .hk { position: absolute; top: 50%; left: calc(var(--i, 0) * ((100% - (var(--n) - 1) * var(--g)) / var(--n) + var(--g)) + (100% - (var(--n) - 1) * var(--g)) / var(--n) / 2); transform: translate(-50%, -50%); transition: left .7s cubic-bezier(.16,1,.3,1); }
.hind .hk .sq { display: block; width: 10px; height: 10px; background: #fff; box-shadow: 0 0 0 4px rgba(0,0,0,.28); }
.hind .hhint { display: flex; justify-content: center; align-items: baseline; gap: 14px; margin-top: 13px; font-family: var(--font-mono); font-size: 12px; line-height: 1; letter-spacing: .04em; text-transform: uppercase; white-space: nowrap; }
.hind .hhint b { font-weight: 500; }
.hind .hhint .hm { color: rgba(255,255,255,.78); }
.hind .hhint .hm.t { display: none; }
@media (hover: none) { .hind .hhint .hm.d { display: none; } .hind .hhint .hm.t { display: inline; } }
.hero:not(.phero) .hl { bottom: calc(10vh + 112px); }
.hero:not(.phero) .hr { bottom: calc(10vh + 112px + 1.3rem); }
@media (max-width: 767px) { .hero .hind { bottom: calc(10vh + 12px); } .hind .hhint { display: none; } .hind .hn { font-size: 11px; margin-bottom: 9px; } .hero:not(.phero) .hr { bottom: calc(10vh + 56px); } }
.hero .imgs .hv { transition: opacity .7s cubic-bezier(.33,1,.68,1); }"""

HTML_OLD = """<div class="hind" data-hero aria-hidden="true" style="--n:' + hl.length + '"><div class="hk" id="hk"><span class="sq"></span></div><div class="hdots">' + hl.map(function (p, i) { return '<i' + (i === 0 ? ' class="on"' : '') + '></i>'; }).join('') + '</div></div></section>' +"""

HTML_NEW = """<div class="hind" data-hero aria-hidden="true" style="--n:' + hl.length + '"><div class="hn">' + hl.map(function (p, i) { return '<span' + (i === 0 ? ' class="on"' : '') + '>' + (i < 9 ? '0' : '') + (i + 1) + '</span>'; }).join('') + '</div><div class="hdots">' + hl.map(function (p, i) { return '<i' + (i === 0 ? ' class="on"' : '') + '></i>'; }).join('') + '<div class="hk" id="hk"><span class="sq"></span></div></div><div class="hhint"><b class="hc">Ujęcie 01 / ' + (hl.length < 10 ? '0' : '') + hl.length + '</b><span class="hm d">← poruszaj kursorem →</span><span class="hm t">← przesuń palcem →</span></div></div></section>' +"""

JS_OLD = """        if (hk) hk.style.setProperty('--i', i);
        hd.forEach(function (d, j) { d.classList.toggle('on', j === i); });
      };
      hero.querySelectorAll('.trig i').forEach(function (z) {
        var i = +z.dataset.hz;
        on(z, 'pointerenter', function () { show(i); });
        on(z, 'click', function () { show(i); });
      });"""

JS_NEW = """        if (hk) hk.style.setProperty('--i', i);
        hd.forEach(function (d, j) { d.classList.toggle('on', j === i); });
        hero.querySelectorAll('.hind .hn span').forEach(function (d, j) { d.classList.toggle('on', j === i); });
        var hc = hero.querySelector('.hind .hc'); if (hc) hc.textContent = 'Ujęcie ' + (i < 9 ? '0' : '') + (i + 1) + ' / ' + (hv.length < 10 ? '0' : '') + hv.length;
        var cn = document.querySelector('.hcur .cn'); if (cn) cn.textContent = (i + 1) + '/' + hv.length;
      };
      /* spokojniej: zmiana ujęcia dopiero, gdy kursor zatrzyma się w strefie na chwilę; szybki przejazd przez ekran nie robi serii przeskoków */
      var dw = null;
      hero.querySelectorAll('.trig i').forEach(function (z) {
        var i = +z.dataset.hz;
        on(z, 'pointerenter', function () { clearTimeout(dw); dw = setTimeout(function () { show(i); }, 220); });
        on(z, 'pointerleave', function () { clearTimeout(dw); });
        on(z, 'click', function () { clearTimeout(dw); show(i); });
      });"""

JS_OLD2 = "if (prev) setTimeout(function () { if (hv[cur] !== prev) prev.classList.remove('on'); }, 480);"
JS_NEW2 = "if (prev) setTimeout(function () { if (hv[cur] !== prev) prev.classList.remove('on'); }, 780);"

SUBS = [(CSS_OLD, CSS_NEW), (HTML_OLD, HTML_NEW), (JS_OLD, JS_NEW), (JS_OLD2, JS_NEW2)]

def patch(s, name):
    for a, b in SUBS:
        if s.count(a) != 1:
            sys.exit('Nie znaleziono dokładnie jednego miejsca w %s dla:\n%s' % (name, a[:100]))
        s = s.replace(a, b)
    return s

def main():
    files = sys.argv[1:] or sorted(glob.glob(str(PUB / '**/*.html'), recursive=True))
    n = 0
    for f in files:
        s = Path(f).read_text(encoding='utf-8')
        if 'class="hind"' not in s or MARK in s: continue
        Path(f).write_text(patch(s, f), encoding='utf-8'); n += 1
    print('Podmieniono w %d plikach.' % n)
main()
