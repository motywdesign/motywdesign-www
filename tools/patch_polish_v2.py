#!/usr/bin/env python3
"""Trzy poprawki po audycie (18.11.2026): bez edytorskiego wcięcia nagłówków na tablecie, wyższa maska animacji
nagłówków (nie ucina j/p w kursywie), wyraźniejsze strzałki kursora na pierwszym ekranie.
Idempotentny (znacznik POLISH_V2). Uruchamiać po patch_mobile_fixes.py po każdym przebudowaniu.
Użycie: patch_polish_v2.py [plik.html ...]"""
import glob, sys
from pathlib import Path
PUB = Path(__file__).resolve().parent.parent / 'public'
MARK = 'POLISH_V2'

CSS_ANCHOR = '\n</style>\n<div class="pre" id="pre"'
CSS = """
/*POLISH_V2*/
/* tablet: bez wcięcia 33% w nagłówkach, pierwsze słowo nie stoi samo w linii */
@media (max-width: 1100px) {
  .h-m, .svc .ht h3 { --ind: 0; text-indent: 0; }
}
/* bez wcięcia etykieta sekcji nie ma miejsca obok nagłówka: stoi nad nim */
@media (min-width: 768px) and (max-width: 1100px) {
  .intro .ebc { position: static; top: auto; grid-column: 1 / -1; margin-bottom: -2.75rem; }
}
/* maska animacji nagłówków: miejsce na ogonki j/p w kursywie (układ bez zmian dzięki ujemnemu marginesowi) */
.split-mask { padding-bottom: .26em; margin-bottom: -.26em; }
/* strzałki kursora: większe, pełna widoczność, mocniejszy cień */
body .hcur .ar { font-size: 1.75rem; opacity: .92; text-shadow: 0 0 2px rgba(0,0,0,.7), 0 0 8px rgba(0,0,0,.55), 0 0 18px rgba(0,0,0,.4); }
body .hcur.mv-l .ar.l, body .hcur.mv-r .ar.r { opacity: 1; }
body .hcur .hs { width: 104px; }"""

def patch(s, name):
    if s.count(CSS_ANCHOR) != 1: sys.exit('brak kotwicy CSS w ' + name)
    return s.replace(CSS_ANCHOR, CSS + CSS_ANCHOR)

def main():
    files = sys.argv[1:] or sorted(glob.glob(str(PUB / '**/*.html'), recursive=True))
    n = 0
    for f in files:
        s = Path(f).read_text(encoding='utf-8')
        if CSS_ANCHOR not in s or MARK in s: continue
        Path(f).write_text(patch(s, f), encoding='utf-8'); n += 1
    print('Podmieniono w %d plikach.' % n)
main()
