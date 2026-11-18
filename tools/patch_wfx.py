#!/usr/bin/env python3
"""Efekt „Animacja przy wejściu”: odpala się przy każdym wejściu słowa w ekran.
Scroll w dół: wersja normalna. Scroll w górę: wersja odwrócona (od końca, litery z góry, rozświetlenie narasta powoli).

Kod strony powstaje z zewnętrznego źródła (v6/index.html), którego nie ma w repo, więc po każdym
buildzie trzeba uruchomić ten skrypt:  python3 tools/patch_wfx.py
Wersja 2 (znacznik WFX_V2). Skrypt jest idempotentny (drugie uruchomienie niczego nie zmienia)."""
import glob, sys
from pathlib import Path
PUB = Path(__file__).resolve().parent.parent / 'public'
MARK = 'WFX_DIR'
SUBS = [
 ("var HVC = null, HVL = [], HV_IO = null;",
  "var HVC = null, HVL = [], HV_IO = null;\n"
  "  var WFX_DIR = 'down', WFX_LY = window.pageYOffset || 0;\n"
  "  addEventListener('scroll', function () { var y = window.pageYOffset || 0; if (y !== WFX_LY) { WFX_DIR = y > WFX_LY ? 'down' : 'up'; WFX_LY = y; } }, { passive: true });"),
 ("if (!HV_IO) HV_IO = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { HV_IO.unobserve(en.target); wfxPlay(en.target); } }); }, { threshold: 0.6 });",
  "if (!HV_IO) HV_IO = new IntersectionObserver(function (es) { es.forEach(function (en) { var t = en.target; if (en.intersectionRatio >= 0.6) { if (t._armed !== false) { t._armed = false; wfxPlay(t, WFX_DIR === 'up'); } } else if (en.intersectionRatio < 0.05) t._armed = true; }); }, { threshold: [0, 0.05, 0.6] });"),
 ("function wfxPlay(el) {\n    var h = HVL[+el.dataset.hp]; if (!h || !G) return;\n"
  "    if (h.anim === 'glow') { var o = { v: 0 }, paint = function () {",
  "function wfxPlay(el, rev) {\n    var h = HVL[+el.dataset.hp]; if (!h || !G) return;\n"
  "    if (el._tl) { el._tl.kill(); el._tl = null; }\n"
  "    if (h.anim === 'glow') { var o = { v: 0 }, paint = function () {"),
 ("G.timeline({ onUpdate: paint }).to(o, { v: 1, duration: 0.5, ease: 'power2.out', onUpdate: paint }).to(o, { v: 0, duration: 1.1, ease: 'power2.in', onUpdate: paint, onComplete: paint }, '+=0.15'); return; }",
  "el._tl = G.timeline({ onUpdate: paint }).to(o, { v: 1, duration: rev ? 1.1 : 0.5, ease: rev ? 'power2.out' : 'power2.out', onUpdate: paint }).to(o, { v: 0, duration: rev ? 0.5 : 1.1, ease: 'power2.in', onUpdate: paint, onComplete: paint }, '+=0.15'); return; }"),
 ("if (h.anim === 'blur') G.fromTo(ls, { opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', stagger: 0.04, clearProps: 'filter' });\n"
  "    else G.fromTo(ls, { opacity: 0, yPercent: 70 }, { opacity: 1, yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.035 });",
  "if (h.anim === 'blur') el._tl = G.fromTo(ls, { opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', stagger: { each: 0.04, from: rev ? 'end' : 'start' }, clearProps: 'filter' });\n"
  "    else el._tl = G.fromTo(ls, { opacity: 0, yPercent: rev ? -70 : 70 }, { opacity: 1, yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: { each: 0.035, from: rev ? 'end' : 'start' } });"),
]

# v2: ponowne odtwarzanie już gdy słowo zjedzie poniżej 30% widoczności (nie dopiero po całkowitym wyjściu z ekranu), wyraźniejsza wersja odwrócona
UPGRADE = [
 ("else if (en.intersectionRatio < 0.05) t._armed = true; }); }, { threshold: [0, 0.05, 0.6] });",
  "else if (en.intersectionRatio < 0.3) t._armed = true; }); }, { threshold: [0, 0.3, 0.6] }); /*WFX_V2*/"),
 ("duration: rev ? 1.1 : 0.5, ease: rev ? 'power2.out' : 'power2.out'", "duration: rev ? 1.3 : 0.4, ease: 'power2.out'"),
 ("duration: rev ? 0.5 : 1.1, ease: 'power2.in'", "duration: rev ? 0.35 : 1.2, ease: 'power2.in'"),
 ("{ opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: 0.9,",
  "{ opacity: 0, filter: 'blur(10px)', xPercent: rev ? 60 : 0 }, { opacity: 1, filter: 'blur(0px)', xPercent: 0, duration: 0.9,"),
]

# v3: wbudowane animacje strony (wsuwanie tekstu liniami i słowami, liczenie cyfr) odpalają się za każdym wejściem w ekran:
# w dół normalnie, w górę w wersji odwróconej. Naprawia też „ciche” ponowne renderowanie po wczytaniu danych, które kasowało te animacje.
UPGRADE3 = [
 ("var quiet = false, booted = false;", "var quiet = false, booted = false, QY = 0; /*WFX_V3*/"),
 ("var y = window.scrollY; quiet = true; render(r);", "var y = window.scrollY; quiet = true; QY = y; render(r);"),
 ("var instant = quiet || !motion;",
  "var instant = quiet || !motion, inst0 = !motion, qs = function (el) { return quiet && (el.getBoundingClientRect().top + (window.scrollY || 0)) < QY + innerHeight * 0.9; };"),
 ("splitLines(el, { instant: instant });", "splitLines(el, { instant: inst0 || qs(el) });"),
 ("splitWords(el, instant); });", "splitWords(el, inst0 || qs(el)); });"),
 ("counters(g, instant); });", "counters(g, inst0 || qs(g)); });"),
 ("  function splitLines(el, opts) {",
  "  function bidir(el, items, off, dur, ease, st) {\n"
  "    G.set(items, { yPercent: off });\n"
  "    var go = function (rev) { G.killTweensOf(items); G.fromTo(items, { yPercent: rev ? -off : off }, { yPercent: 0, duration: dur, ease: ease, stagger: { each: st, from: rev ? 'end' : 'start' } }); };\n"
  "    ST.create({ trigger: el, start: txtStart(), onEnter: function () { go(false); }, onEnterBack: function () { go(true); }, onLeaveBack: function () { G.killTweensOf(items); G.set(items, { yPercent: off }); } });\n"
  "  }\n  function splitLines(el, opts) {"),
 ("G.from(s.lines, Object.assign({ yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.04 }, opts && opts.delay != null ? { delay: opts.delay } : { scrollTrigger: { trigger: el, start: txtStart(), once: true } }));",
  "if (opts && opts.delay != null) G.from(s.lines, { yPercent: 110, duration: 0.9, ease: 'power3.out', stagger: 0.04, delay: opts.delay }); else bidir(el, s.lines, 110, 0.9, 'power3.out', 0.04);"),
 ("G.from(s.words, { yPercent: 105, duration: 0.75, ease: 'power2.out', stagger: 0.018, scrollTrigger: { trigger: el, start: txtStart(), once: true } });",
  "bidir(el, s.words, 105, 0.75, 'power2.out', 0.018);"),
 ("      var o = { v: 0 };\n      G.from(el, { y: 40, opacity: 0, duration: 0.75, ease: 'power3.out', delay: i * 0.12, scrollTrigger: { trigger: group, start: txtStart(), once: true } });\n      G.to(o, { v: end, duration: 1.6, ease: 'expo.out', delay: i * 0.12, onUpdate: function () { c.textContent = numVal(o.v, dec); }, scrollTrigger: { trigger: group, start: txtStart(), once: true } });",
  "      G.set(el, { y: 40, opacity: 0 }); c.textContent = numVal(0, dec);\n"
  "      var play = function (rev) { if (el._o) G.killTweensOf(el._o); G.killTweensOf(el); var o = el._o = { v: rev ? end * 1.5 : 0 }; G.fromTo(el, { y: rev ? -40 : 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out', delay: i * 0.12 }); G.to(o, { v: end, duration: 1.6, ease: 'expo.out', delay: i * 0.12, onUpdate: function () { c.textContent = numVal(o.v, dec); } }); };\n"
  "      ST.create({ trigger: group, start: txtStart(), onEnter: function () { play(false); }, onEnterBack: function () { play(true); }, onLeaveBack: function () { if (el._o) G.killTweensOf(el._o); G.killTweensOf(el); G.set(el, { y: 40, opacity: 0 }); c.textContent = numVal(0, dec); } });"),
]

# v4: przy cofaniu scrolla animacja cofa się płynnie (tekst zjeżdża, cyfry liczą w dół), zamiast znikać skokiem; ponowne wejście od góry niczego nie chowa
UPGRADE4 = [
 ("/*WFX_V3*/", "/*WFX_V3*/ /*WFX_V4*/"),
 ("onEnter: function () { go(false); }, onEnterBack: function () { go(true); }, onLeaveBack: function () { G.killTweensOf(items); G.set(items, { yPercent: off }); } });",
  "onEnter: function () { go(false); }, onLeaveBack: function () { G.killTweensOf(items); G.to(items, { yPercent: off, duration: dur * 0.7, ease: 'power2.in', stagger: { each: st, from: 'end' } }); } });"),
 ("onEnter: function () { play(false); }, onEnterBack: function () { play(true); }, onLeaveBack: function () { if (el._o) G.killTweensOf(el._o); G.killTweensOf(el); G.set(el, { y: 40, opacity: 0 }); c.textContent = numVal(0, dec); } });",
  "onEnter: function () { play(false); }, onLeaveBack: function () { var o = el._o || (el._o = { v: end }); G.killTweensOf(o); G.killTweensOf(el); G.to(el, { y: 40, opacity: 0, duration: 0.6, ease: 'power2.in' }); G.to(o, { v: 0, duration: 0.9, ease: 'power2.in', onUpdate: function () { c.textContent = numVal(o.v, dec); } }); } });"),
]

# v5: przyciski paska właściciela (Złoto, Odśwież efekty strony, Edytuj teksty, Efekty słów, Panel) leżą w .gb i nie łapały stylu ciemnych przycisków (biały tekst na jasnym tle)
UPGRADE5 = [
 (".gpk .gx { display: none; width: min(300px, calc(100vw - 24px));",
  ".gpk .gb button { font: inherit; color: #fff; background: #111; border: 1px solid #444; border-radius: 8px; padding: 9px 12px; cursor: pointer; } /*WFX_V5*/\n.gpk .gx { display: none; width: min(300px, calc(100vw - 24px));"),
]

# v6: testowa nakładka z podziałką granic animacji, włączana dopiskiem ?granice do adresu (nie widać jej gościom)
DBG_JS = r'''(function () { try {
  if (!/[?&]granice\b/.test(location.search)) return;
  var d = document, r = d.createElement('div'); r.setAttribute('aria-hidden', 'true');
  r.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147482999;font:600 11px/1.2 ui-monospace,Menlo,monospace';
  function build() {
    var h = innerHeight, desk = matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)').matches, y = Math.round(h * (desk ? 0.67 : 0.85)), s = '';
    s += '<div style="position:absolute;left:0;top:0;bottom:0;width:34px;background:rgba(0,0,0,.55);border-right:1px solid rgba(255,255,255,.5)"></div>';
    for (var p = 0; p <= 100; p += 5) { var t = Math.round(h * p / 100), big = p % 10 === 0; s += '<div style="position:absolute;left:' + (big ? 10 : 20) + 'px;width:' + (big ? 24 : 14) + 'px;top:' + t + 'px;height:1px;background:#fff"></div>'; if (big && p > 0 && p < 100) s += '<div style="position:absolute;left:38px;top:' + (t - 6) + 'px;color:#fff;text-shadow:0 0 3px #000,0 0 3px #000">' + p + '%</div>'; }
    s += '<div style="position:absolute;left:0;right:0;top:' + y + 'px;border-top:2px dashed #ff3b30"></div>';
    s += '<div style="position:absolute;left:80px;top:' + (y - 28) + 'px;background:#ff3b30;color:#fff;padding:3px 7px;border-radius:4px">w dół: tu animacja wchodzi (start)</div>';
    s += '<div style="position:absolute;left:80px;top:' + (y + 6) + 'px;background:#0a84ff;color:#fff;padding:3px 7px;border-radius:4px">w górę: tu animacja się cofa</div>';
    s += '<div style="position:absolute;left:0;right:0;top:0;border-top:2px dashed #0a84ff"></div>';
    s += '<div style="position:absolute;right:8px;top:8px;background:#000;color:#fff;padding:4px 8px;border-radius:4px;opacity:.85">TEST: granice animacji (usuń ?granice z adresu, żeby wyłączyć)</div>';
    r.innerHTML = s;
  }
  function add() { build(); d.body.appendChild(r); }
  if (d.body) add(); else addEventListener('DOMContentLoaded', add);
  addEventListener('resize', build);
} catch (e) {} })();'''
UPGRADE6 = [
 ("</body>", "<script>/*WFX_V6*/" + DBG_JS + "</script>\n</body>"),
]

# v7: podziałka granic animacji widoczna od razu dla właściciela (gdy jest pasek właściciela), bez dopisku; ?granice=0 ją wyłącza, ?granice wymusza dla każdego
UPGRADE7 = [
 ("/*WFX_V6*/", "/*WFX_V6*/ /*WFX_V7*/"),
 ("if (!/[?&]granice\\b/.test(location.search)) return;",
  "var q = location.search, off = /[?&]granice=0\\b/.test(q), forced = /[?&]granice\\b/.test(q) && !off; if (off) return;"),
 ("function add() { build(); d.body.appendChild(r); }\n  if (d.body) add(); else addEventListener('DOMContentLoaded', add);",
  "function add() { build(); d.body.appendChild(r); }\n  setInterval(function () { if (!d.body) return; if (forced || d.querySelector('.gpk')) { if (!r.parentNode) add(); } else if (r.parentNode) r.parentNode.removeChild(r); }, 700);"),
]

# v8: podziałka pokazuje też pionowe paski stref na pierwszym ekranie (ruch kursora między strefami zmienia zdjęcie)
ZONES_JS = r"""  var z = d.createElement('div'); z.setAttribute('aria-hidden', 'true'); z.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147482998;font:600 11px/1.2 ui-monospace,Menlo,monospace';
  setInterval(function () {
    if (!r.parentNode) { if (z.parentNode) z.parentNode.removeChild(z); return; }
    var zs = d.querySelectorAll('.hero .trig i'), s = '', last = null;
    zs.forEach(function (el, i) {
      var b = el.getBoundingClientRect(); if (!b.width || b.bottom < 0 || b.top > innerHeight) return;
      var t = Math.max(0, b.top), h = Math.min(innerHeight, b.bottom) - t; last = b;
      s += '<div style="position:absolute;left:' + b.left + 'px;top:' + t + 'px;width:' + b.width + 'px;height:' + h + 'px;box-sizing:border-box;background:' + (i % 2 ? 'rgba(255,59,48,.10)' : 'rgba(10,132,255,.10)') + ';border-left:2px dashed #fff"></div>';
      s += '<div style="position:absolute;left:' + (b.left + 8) + 'px;top:' + (t + 48) + 'px;background:#000;color:#fff;padding:3px 7px;border-radius:4px;white-space:nowrap">strefa ' + (i + 1) + ': zdjęcie ' + (i + 1) + '</div>';
    });
    if (last) s += '<div style="position:absolute;left:' + (last.right - 2) + 'px;top:' + Math.max(0, last.top) + 'px;height:' + (Math.min(innerHeight, last.bottom) - Math.max(0, last.top)) + 'px;border-left:2px dashed #fff"></div>';
    if (z.innerHTML !== s) z.innerHTML = s;
    if (!z.parentNode) d.body.appendChild(z);
  }, 120);
"""
UPGRADE8 = [
 ("/*WFX_V7*/", "/*WFX_V7*/ /*WFX_V8*/"),
 ("  addEventListener('resize', build);\n} catch (e) {} })();", "  addEventListener('resize', build);\n" + ZONES_JS + "} catch (e) {} })();"),
]

# v9: z podziałki zostają tylko czarne przerywane pionowe linie stref pierwszego ekranu (widoczne dla właściciela; ?granice=0 wyłącza, ?granice wymusza)
import re
LINES_JS = r"""<script>/*WFX_V6*/ /*WFX_V7*/ /*WFX_V8*/ /*WFX_V9*/(function () { try {
  var q = location.search, off = /[?&]granice=0\b/.test(q), forced = /[?&]granice\b/.test(q) && !off; if (off) return;
  var d = document, z = d.createElement('div'); z.setAttribute('aria-hidden', 'true'); z.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147482998';
  setInterval(function () {
    if (!d.body) return;
    var zs = forced || d.querySelector('.gpk') ? d.querySelectorAll('.hero .trig i') : [], s = '', last = null;
    zs.forEach(function (el) {
      var b = el.getBoundingClientRect(); if (!b.width || b.bottom < 0 || b.top > innerHeight) return;
      var t = Math.max(0, b.top), h = Math.min(innerHeight, b.bottom) - t; last = b;
      s += '<div style="position:absolute;left:' + Math.round(b.left) + 'px;top:' + t + 'px;height:' + h + 'px;border-left:2px dashed #000"></div>';
    });
    if (last) s += '<div style="position:absolute;left:' + (Math.round(last.right) - 2) + 'px;top:' + Math.max(0, last.top) + 'px;height:' + (Math.min(innerHeight, last.bottom) - Math.max(0, last.top)) + 'px;border-left:2px dashed #000"></div>';
    if (z.innerHTML !== s) z.innerHTML = s;
    if (s) { if (!z.parentNode) d.body.appendChild(z); } else if (z.parentNode) z.parentNode.removeChild(z);
  }, 120);
} catch (e) {} })();</script>
</body>"""
def upgrade9(s):
    return re.sub(r'<script>/\*WFX_V6\*/.*?</script>\n</body>', lambda m: LINES_JS, s, count=1, flags=re.S)
def main():
    n = 0
    for f in sorted(glob.glob(str(PUB / '**/*.html'), recursive=True)):
        s = Path(f).read_text(encoding='utf-8')
        if 'wfxPlay' not in s or 'WFX_V9' in s: continue
        steps = ([] if MARK in s else SUBS) + ([] if 'WFX_V2' in s else UPGRADE) + ([] if 'WFX_V3' in s else UPGRADE3) + ([] if 'WFX_V4' in s else UPGRADE4) + ([] if 'WFX_V5' in s else UPGRADE5) + ([] if 'WFX_V6' in s else UPGRADE6) + ([] if 'WFX_V7' in s else UPGRADE7) + ([] if 'WFX_V8' in s else UPGRADE8)
        for a, b in steps:
            if s.count(a) != 1:
                sys.exit('Nie znaleziono dokładnie jednego miejsca w %s dla:\n%s' % (f, a[:90]))
            s = s.replace(a, b)
        s = upgrade9(s)
        if 'WFX_V9' not in s: sys.exit('v9 nie zadziałało w ' + f)
        Path(f).write_text(s, encoding='utf-8'); n += 1
    print('Podmieniono efekty w %d plikach.' % n)
main()
