#!/usr/bin/env python3
"""Poprawki z audytu telefonów (18.11.2026): ucinane nagłówki podstron, karty projektów, opisy projektu w jednej
kolumnie, przycisk "Wszystkie projekty", minimalne rozmiary fontów, większe pola dotyku, podpowiedź dla dotyku.
Idempotentny (znacznik MOBILE_FIX_V1). Uruchamiać po patch_wfx.py i patch_hero_zones.py po każdym przebudowaniu.
Użycie: patch_mobile_fixes.py [plik.html ...]"""
import glob, sys
from pathlib import Path
PUB = Path(__file__).resolve().parent.parent / 'public'
MARK = 'MOBILE_FIX_V1'

CSS_ANCHOR = '\n</style>\n<div class="pre" id="pre"'
CSS = """
/*MOBILE_FIX_V1*/
/* minimalne rozmiary tekstu: etykiety mono nie mniejsze niż 12px */
.nx-meta dt, .nx-rm, .ck-cp { font-size: .75rem; }
.parea small { font-size: max(.5em, 12px); }
.filters button sup { font-size: 11px; }
.hzn .hzc .t { display: none; }
@media (hover: none) { .hzn .hzc .d { display: none; } .hzn .hzc .t { display: inline; } }
@media (max-width: 767px) {
  /* nagłówki podstron (Projekty, Studio, Usługi) miały 4rem i wychodziły poza ekran */
  .hto .h-m.big { font-size: 1.9rem; line-height: 1.18; }
  /* opis projektu: etykieta nad tekstem, nie obok (wąska kolumna) */
  .nx-sg h3, .nx-st { grid-column: 1 / -1; }
  /* karty na liście projektów: tytuł nad opisem, nic nie wychodzi poza kartę */
  .bcard .ptx, .bcard.wide .ptx { flex-direction: column; align-items: flex-start; gap: .35rem; padding: 0 1rem; bottom: 1rem; }
  .bcard .ptx h3, .bcard.wide .ptx h3 { font-size: 1.5rem; }
  .bcard .ptx .eb { text-align: left; font-size: .75rem; text-shadow: 0 1px 8px rgba(0,0,0,.55); }
  .bcard .ptx .eb em, .pcard .ptx .eb em { color: #e8e8e8; }
  .bcard .pim::after { background: linear-gradient(180deg, #0000 30%, rgba(0,0,0,.74)); }
  .pcard .ptx .eb { text-shadow: 0 1px 8px rgba(0,0,0,.55); }
  /* ostatnia karta taśmy: napis się mieścił tylko na komputerze */
  /* wezwanie do kontaktu: długie słowo mieści się też na 320 px */
  .pcard-w.all a { font-size: 1.5rem; }
  .pcard-w.all a svg, .pcard-w.all a .aw svg { width: 1.5rem; height: 1.5rem; }
}
@media (max-width: 360px) { .cta .cb h2 { font-size: 1.9rem; } }
/* tablet: karty w dwóch kolumnach są wąskie, więc opis pod tytułem; nagłówek bez dużego wcięcia */
@media (max-width: 1100px) {
  .bcard:not(.wide) .ptx { flex-direction: column; align-items: flex-start; gap: .35rem; padding: 0 1rem; bottom: 1rem; }
  .bcard:not(.wide) .ptx h3 { font-size: 1.5rem; }
  .bcard:not(.wide) .ptx .eb { text-align: left; font-size: .75rem; text-shadow: 0 1px 8px rgba(0,0,0,.55); }
  .bcard:not(.wide) .pim::after { background: linear-gradient(180deg, #0000 30%, rgba(0,0,0,.74)); }
}
@media (max-width: 900px) { .hto .h-m.big { text-indent: 0; font-size: 2.6rem; } }
@media (max-width: 767px) { .hto .h-m.big { font-size: 1.9rem; } }
/* większe pola dotyku bez zmiany wyglądu */
@media (pointer: coarse) {
  .navc .logo, .navc .tog, .foot .fb .leg a, .foot .fb .logo, #nsoc a { position: relative; }
  .navc .logo::after, .navc .tog::after, .foot .fb .leg a::after, .foot .fb .logo::after, #nsoc a::after { content: ""; position: absolute; inset: -11px -8px; }
}"""

HZC_OLD = """'<div class="hzc">' + hl.length + ' ujęć: poruszaj kursorem w lewo i w prawo</div></div>"""
HZC_NEW = """'<div class="hzc"><span class="d">' + hl.length + ' ujęć: poruszaj kursorem w lewo i w prawo</span><span class="t">' + hl.length + ' ujęć: przesuń palcem w lewo i w prawo</span></div></div>"""

def patch(s, name):
    if s.count(CSS_ANCHOR) != 1: sys.exit('brak kotwicy CSS w ' + name)
    s = s.replace(CSS_ANCHOR, CSS + CSS_ANCHOR)
    if 'HERO_ZONES_V1' in s:
        if s.count(HZC_OLD) != 1: sys.exit('brak podpowiedzi stref w ' + name)
        s = s.replace(HZC_OLD, HZC_NEW)
    return s

def main():
    files = sys.argv[1:] or sorted(glob.glob(str(PUB / '**/*.html'), recursive=True))
    n = 0
    for f in files:
        s = Path(f).read_text(encoding='utf-8')
        if CSS_ANCHOR not in s or MARK in s: continue
        Path(f).write_text(patch(s, f), encoding='utf-8'); n += 1
    print('Podmieniono w %d plikach.' % n)
main()
