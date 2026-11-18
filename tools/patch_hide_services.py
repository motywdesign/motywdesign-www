#!/usr/bin/env python3
"""Ukrywanie usług (18.11.2026): usługa z polem hidden:true nie pokazuje się na stronie (lista usług, strona główna),
ale zostaje w panelu i w edytorze. Idempotentny (znacznik 'function svList(all)').
Użycie: patch_hide_services.py [plik.html ...]"""
import glob, sys
from pathlib import Path
PUB = Path(__file__).resolve().parent.parent / 'public'
SUBS = [
 ("  function svList() {\n    var l = Array.isArray(S.site && S.site.servicesList) && S.site.servicesList.length ? S.site.servicesList : DEF.servicesList;\n    return l.filter(function (x) { return x && x.name; });",
  "  function svList(all) {\n    var l = Array.isArray(S.site && S.site.servicesList) && S.site.servicesList.length ? S.site.servicesList : DEF.servicesList;\n    return l.filter(function (x) { return x && x.name && (all || !x.hidden); });"),
 ("contentDraft.servicesList = clone(svList());", "contentDraft.servicesList = clone(svList(true));"),
 ("if (k === 'servicesList') return clone(svList());", "if (k === 'servicesList') return clone(svList(true));"),
]
def patch(s, name):
    for a, b in SUBS:
        if s.count(a) != 1: sys.exit('nie znaleziono dokładnie jednego trafienia w %s: %s' % (name, a[:50]))
        s = s.replace(a, b)
    return s
def main():
    files = sys.argv[1:] or sorted(glob.glob(str(PUB / '**/*.html'), recursive=True))
    n = 0
    for f in files:
        s = Path(f).read_text(encoding='utf-8')
        if 'function svList() {' not in s: continue
        Path(f).write_text(patch(s, f), encoding='utf-8'); n += 1
    print('Podmieniono w %d plikach.' % n)
main()
