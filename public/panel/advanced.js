/* Panel MotywDesign v2: zaawansowane (efekty słów, dodatki sezonowe). */
(function () {
  'use strict';
  var MD = window.MD, S = MD.S, esc = MD.esc, ui = MD.ui;
  var EFF = [['preview', 'Podgląd zdjęcia'], ['swap', 'Zamiana słowa'], ['highlight', 'Podświetlenie'], ['enter', 'Animacja przy wejściu']];
  var ANIM = [['glow', 'Rozświetlenie'], ['blur', 'Wyostrzenie z rozmycia'], ['cascade', 'Kaskada liter']];
  function eff(it) { return it.effect || 'preview'; }
  function efekty() {
    return '<div class="head"><h1>Efekty słów i podglądy</h1></div><p class="sub-p">Zaawansowane. Wpisz słowo lub fragment zdania dokładnie tak, jak stoi w zwykłym akapicie na stronie. Pierwsze takie miejsce dostanie efekt. Na telefonie karta pokazuje się po dotknięciu słowa.</p><div style="margin-top:16px">' +
      '<div class="card"><h2>Efekty</h2>' + ui.list('s', 'hovers', [
        ['word', 'Słowo lub fraza w tekście', { span: true }],
        ['effect', 'Efekt', { select: EFF }],
        ['img', 'Zdjęcie (podgląd)', { pick: true, show: function (it) { return eff(it) === 'preview'; } }],
        ['title', 'Tytuł karty', { show: function (it) { return eff(it) === 'preview'; } }],
        ['sub', 'Podpis', { show: function (it) { return eff(it) === 'preview'; } }],
        ['swap', 'Zamień na', { show: function (it) { return eff(it) === 'swap'; } }],
        ['anim', 'Animacja', { select: ANIM, show: function (it) { return eff(it) === 'enter'; } }]
      ], { add: 'Dodaj efekt', empty: 'Nie ma jeszcze żadnych efektów.' }) + '</div></div>';
  }
  /* termin: dd.mm, może przechodzić przez Nowy Rok */
  function parseDM(t) { var m = /^(\d{1,2})\.(\d{1,2})$/.exec(String(t || '').trim()); if (!m) return null; var d = +m[1], mo = +m[2]; if (mo < 1 || mo > 12 || d < 1 || d > 31) return null; return mo * 100 + d; }
  function inSeason(c) { var a = parseDM(c.from), b = parseDM(c.to); if (a == null || b == null) return false; var n = new Date(), t = (n.getMonth() + 1) * 100 + n.getDate(); return a <= b ? (t >= a && t <= b) : (t >= a || t <= b); }
  var MODS = [
    { id: 'snow', name: 'Śnieg', season: 'Święta', desc: 'Delikatny śnieg na całej stronie. Nie zasłania treści i nie przeszkadza w klikaniu.' },
    { id: 'valentine', name: 'Serce w znaku', season: 'Walentynki', desc: 'Mosiężny kwadrat przed nazwą składa się w bijące serce. Po najechaniu na logo unoszą się małe serca.' }
  ];
  function dodatki() {
    var cfg = (S.D.site && S.D.site.modules) || MD.DEFS.modules;
    return '<div class="head"><h1>Dodatki sezonowe</h1></div><p class="sub-p">Zaawansowane. Każdy dodatek możesz włączyć na stałe albo ustawić termin, w którym włączy się sam co roku.</p><div style="margin-top:16px">' +
      MODS.map(function (m) {
        var c = Object.assign({}, MD.DEFS.modules[m.id], cfg[m.id] || {}), live = c.mode === 'on' || (c.mode === 'auto' && inSeason(c)), base = 'modules.' + m.id;
        return '<div class="card"><div class="ch"><h2>' + esc(m.name) + ' <span class="mono muted" style="font-weight:400;margin-left:6px">' + esc(m.season) + '</span></h2><span class="pill ' + (live ? 'ok' : '') + '">' + (live ? 'Działa teraz' : 'Teraz nie działa') + '</span></div><p class="lead-p">' + esc(m.desc) + '</p>' +
          '<div class="grid2">' + ui.seg('Tryb', 's', base + '.mode', [['off', 'Wyłączony'], ['on', 'Włączony'], ['auto', 'W terminie']], { val: c.mode, span: true }) +
          (c.mode === 'auto' ? ui.field('Od (dd.mm)', 's', base + '.from', { val: c.from, mono: true, ph: '01.12' }) + ui.field('Do (dd.mm)', 's', base + '.to', { val: c.to, mono: true, ph: '06.01', hint: 'Termin może przechodzić przez Nowy Rok.' }) : '') + '</div></div>';
      }).join('') + '</div>';
  }
  MD.views.adv = function (r) { MD.cur.after = null; MD.cur.mount = null; return r.sec === 'dodatki' ? dodatki() : efekty(); };
})();
