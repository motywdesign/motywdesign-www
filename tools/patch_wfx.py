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
def main():
    n = 0
    for f in sorted(glob.glob(str(PUB / '**/*.html'), recursive=True)):
        s = Path(f).read_text(encoding='utf-8')
        if 'wfxPlay' not in s or 'WFX_V2' in s: continue
        steps = ([] if MARK in s else SUBS) + UPGRADE
        for a, b in steps:
            if s.count(a) != 1:
                sys.exit('Nie znaleziono dokładnie jednego miejsca w %s dla:\n%s' % (f, a[:90]))
            s = s.replace(a, b)
        Path(f).write_text(s, encoding='utf-8'); n += 1
    print('Podmieniono efekty w %d plikach.' % n)
main()
