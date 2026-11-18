#!/usr/bin/env python3
"""Pierwszy ekran, wariant C: linie podziału 5 stref + numery 01-05 + podświetlenie strefy pod kursorem
(przy pierwszym najechaniu na ok. 2,8 s mocniejsze linie z podpisem, potem przygasają), natychmiastowe przełączanie ujęć (bez opóźnienia)
  Usuwa też czarną podziałkę testową (WFX_V6-V9).
Idempotentny (znacznik HERO_ZONES_V1). Uruchamiać po każdym przebudowaniu, po patch_wfx.py.
Użycie: patch_hero_zones.py [plik.html ...]"""
import glob, re, sys
from pathlib import Path
PUB = Path(__file__).resolve().parent.parent / 'public'
MARK = 'HERO_ZONES_V1'

CSS_OLD = ".hero .imgs .hv { transition: opacity .45s cubic-bezier(.33,1,.68,1); }"
CSS_NEW = """/*HERO_ZONES_V1*/
.hero .imgs .hv { transition: opacity .45s cubic-bezier(.33,1,.68,1); }
.hzn { position: absolute; inset: 0; z-index: 4; pointer-events: none; opacity: 0; transition: opacity .6s; color: #fff; font-family: var(--font-mono); text-transform: uppercase; }
.hero.hz-in .hzn, .hero.hz-pk .hzn { opacity: 1; }
.hzn .zh { position: absolute; top: 46px; bottom: 0; left: calc(var(--hz, 0) * 100% / var(--n)); width: calc(100% / var(--n)); background: rgba(255,255,255,.07); border-top: 3px solid #fff; transition: left .7s cubic-bezier(.16,1,.3,1); }
.hzn i { position: absolute; top: 46px; bottom: 0; width: 0; border-left: 1px dashed rgba(255,255,255,.22); transition: border-color .6s; }
.hero.hz-pk .hzn i { border-left-color: rgba(255,255,255,.62); }
.hzn b { position: absolute; top: 66px; width: calc(100% / var(--n)); box-sizing: border-box; padding-right: 16px; justify-content: flex-end; font-size: 12px; font-weight: 500; line-height: 1; letter-spacing: .04em; color: rgba(255,255,255,.55); display: flex; align-items: center; gap: 8px; transition: color .5s; text-shadow: 0 1px 8px rgba(0,0,0,.4); }
.hzn b.on { color: #fff; }
.hzn b::before { content: ""; width: 8px; height: 8px; background: #7a4f36; opacity: 0; transition: opacity .4s; }
.hzn b.on::before { opacity: 1; }
.hzn b:nth-last-of-type(1) { padding-right: calc(8vw + 10px); }
/* uproszczenie: dół ekranu bez paska ujęć (numery są u góry), kursor bez licznika: strzałki przy ruchu, ikona przewijania w bezruchu */
.hero .hind { display: none; }
body .hcur.arrows::before { width: 8px; height: 8px; background: #fff; box-shadow: 0 0 0 3px rgba(0,0,0,.2); }
body .hcur .ar { font-size: 1.5rem; opacity: .85; text-shadow: 0 0 6px rgba(0,0,0,.55), 0 0 14px rgba(0,0,0,.35); }
/* przejście: kwadrat zostaje kropką, strzałki rozsuwają się z jego środka; w bezruchu wracają i kropka rośnie w ikonę przewijania */
body .hcur .ar { transition: translate .75s cubic-bezier(.16,1,.3,1), scale .75s cubic-bezier(.16,1,.3,1), transform .25s cubic-bezier(.16,1,.3,1), opacity .3s; }
body .hcur .ar.l { translate: 26px 0; scale: .4; }
body .hcur .ar.r { translate: -26px 0; scale: .4; }
body .hcur.arrows .ar { translate: 0 0; scale: 1; }
body .hcur.arrows .ar.r { transition-delay: .05s; }
body .hcur .hs { filter: drop-shadow(0 0 4px rgba(0,0,0,.5)); }
body .hcur .hs { width: 92px; }
body .hcur .cn { display: none; }
.hzn .hzc { position: absolute; left: 50%; top: calc(46px + 6vh); transform: translateX(-50%); padding: 10px 16px; background: rgba(0,0,0,.6); font-size: 12px; letter-spacing: .04em; white-space: nowrap; opacity: 0; transition: opacity .5s; }
.hero.hz-pk .hzn .hzc { opacity: 1; }
@media (max-width: 767px) { .hzn b:nth-last-of-type(1) { padding-right: 16px; } .hzn b { font-size: 11px; } .hzn .hzc { white-space: normal; text-align: center; max-width: 80vw; } }"""

HTML_OLD = """'<div class="ov"></div><div class="trig" aria-hidden="true">' + hl.map(function (p, i) { return '<i data-hz="' + i + '"></i>'; }).join('') + '</div><div class="dk"></div>' +"""
HTML_NEW = """'<div class="ov"></div><div class="trig" aria-hidden="true">' + hl.map(function (p, i) { return '<i data-hz="' + i + '"></i>'; }).join('') + '</div><div class="hzn" aria-hidden="true" style="--n:' + hl.length + '"><div class="zh"></div>' + hl.map(function (p, i) { return i ? '<i style="left:' + (i * 100 / hl.length) + '%"></i>' : ''; }).join('') + hl.map(function (p, i) { return '<b' + (i === 0 ? ' class="on"' : '') + ' style="left:' + (i * 100 / hl.length) + '%">' + (i < 9 ? '0' : '') + (i + 1) + '</b>'; }).join('') + '<div class="hzc">' + hl.length + ' ujęć: poruszaj kursorem w lewo i w prawo</div></div><div class="dk"></div>' +"""

JS_OLD = """        hd.forEach(function (d, j) { d.classList.toggle('on', j === i); });
      };
      hero.querySelectorAll('.trig i').forEach(function (z) {
        var i = +z.dataset.hz;
        on(z, 'pointerenter', function () { show(i); });
        on(z, 'click', function () { show(i); });
      });"""
JS_NEW = """        hd.forEach(function (d, j) { d.classList.toggle('on', j === i); });
        hero.style.setProperty('--hz', i);
        hero.querySelectorAll('.hzn b').forEach(function (d, j) { d.classList.toggle('on', j === i); });
        var zc2 = hero.querySelector('.hzn .hzc'); if (zc2 && hero.classList.contains('hz-pk')) zc2.textContent = 'Ujęcie ' + (i < 9 ? '0' : '') + (i + 1) + ' / ' + (hv.length < 10 ? '0' : '') + hv.length;
        var cn2 = document.querySelector('.hcur .cn'); if (cn2) cn2.textContent = (i + 1) + '/' + hv.length;
      };
      /* spokojniej: zmiana ujęcia dopiero, gdy kursor zatrzyma się w strefie na chwilę */
      var dw = null;
      hero.querySelectorAll('.trig i').forEach(function (z) {
        var i = +z.dataset.hz;
        on(z, 'pointerenter', function () { clearTimeout(dw); show(i); });
        on(z, 'pointerleave', function () { clearTimeout(dw); });
        on(z, 'click', function () { clearTimeout(dw); show(i); });
      });
      /* podpowiedź stref: przy pierwszym najechaniu (na dotyku po chwili od wejścia) linie na moment mocniej */
      (function () {
        var tg = hero.querySelector('.trig'), pk = null, seen = false;
        var peek = function (ms) { hero.classList.add('hz-pk'); clearTimeout(pk); pk = setTimeout(function () { hero.classList.remove('hz-pk'); }, ms); };
        if (tg) {
          on(tg, 'pointerenter', function (e) { if (e.pointerType !== 'mouse') return; hero.classList.add('hz-in'); if (!seen) { seen = true; peek(2800); } });
          on(tg, 'pointerleave', function () { hero.classList.remove('hz-in'); });
        }
        if (window.matchMedia && matchMedia('(hover: none)').matches) setTimeout(function () { peek(3400); }, 2200);
      })();"""

JS_OLD2 = "if (prev) setTimeout(function () { if (hv[cur] !== prev) prev.classList.remove('on'); }, 480);"
JS_NEW2 = "if (prev) setTimeout(function () { if (hv[cur] !== prev) prev.classList.remove('on'); }, 480);"

SUBS = [(CSS_OLD, CSS_NEW), (HTML_OLD, HTML_NEW), (JS_OLD, JS_NEW), (JS_OLD2, JS_NEW2)]
DBG = re.compile(r'<script>/\*WFX_V6\*/.*?</script>(?=\n</body>)', re.S)
DBG_NEW = '<script>/*WFX_V9 podziałka testowa usunięta*/</script>'

def patch(s, name):
    for a, b in SUBS:
        if s.count(a) != 1:
            sys.exit('Nie znaleziono dokładnie jednego miejsca w %s dla:\n%s' % (name, a[:100]))
        s = s.replace(a, b)
    s, k = DBG.subn(lambda m: DBG_NEW, s, count=1)
    if k != 1: sys.exit('Nie znaleziono podziałki testowej w ' + name)
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
