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
def main():
    n = 0
    for f in sorted(glob.glob(str(PUB / '**/*.html'), recursive=True)):
        s = Path(f).read_text(encoding='utf-8')
        if 'wfxPlay' not in s or 'WFX_V5' in s: continue
        steps = ([] if MARK in s else SUBS) + ([] if 'WFX_V2' in s else UPGRADE) + ([] if 'WFX_V3' in s else UPGRADE3) + ([] if 'WFX_V4' in s else UPGRADE4) + UPGRADE5
        for a, b in steps:
            if s.count(a) != 1:
                sys.exit('Nie znaleziono dokładnie jednego miejsca w %s dla:\n%s' % (f, a[:90]))
            s = s.replace(a, b)
        Path(f).write_text(s, encoding='utf-8'); n += 1
    print('Podmieniono efekty w %d plikach.' % n)
main()
