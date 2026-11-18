/* Panel MotywDesign v2: projekty (lista, edycja, kosz, generator opisów). */
(function () {
  'use strict';
  var MD = window.MD, S = MD.S, esc = MD.esc;
  var TYPES = ['Dom', 'Mieszkanie', 'Apartament', 'Wnętrze komercyjne'];
  var STATUSES = ['Zrealizowany', 'W realizacji', 'Projekt'];
  var SCOPES = ['Projekt wnętrz', 'Projekt domu i wnętrz', 'Projekt i nadzór', 'Wizualizacje 3D'];
  var SCENES = [['', 'Brak'], ['las', 'Salon z sosnami'], ['wola', 'Mieszkanie z widokiem na miasto'], ['powisle', 'Salon z orzechową zabudową'], ['mokotow', 'Kuchnia z kamienną wyspą'], ['skarpa', 'Wnętrze z widokiem na dolinę'], ['kancelaria', 'Biblioteka z filcem']];
  var MAX_BIG = 2;
  var IC = {
    search: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#6e6e73" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="5"/><path d="M11 11l3.5 3.5"/></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M7 2v10M2 7h10"/></svg>',
    more: '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><circle cx="3.5" cy="8" r="1.3"/><circle cx="8" cy="8" r="1.3"/><circle cx="12.5" cy="8" r="1.3"/></svg>',
    grab: '<svg width="14" height="22" viewBox="0 0 14 22" fill="currentColor" aria-hidden="true"><circle cx="4" cy="6" r="1.5"/><circle cx="10" cy="6" r="1.5"/><circle cx="4" cy="11" r="1.5"/><circle cx="10" cy="11" r="1.5"/><circle cx="4" cy="16" r="1.5"/><circle cx="10" cy="16" r="1.5"/></svg>',
    back: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 2.5L4.5 7 9 11.5"/></svg>',
    chev: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M3 5l4 4 4-4"/></svg>',
    left: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M9 2.5L4.5 7 9 11.5"/></svg>',
    right: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M5 2.5L9.5 7 5 11.5"/></svg>',
    up: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2.5 9L7 4.5 11.5 9"/></svg>',
    down: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2.5 5L7 9.5 11.5 5"/></svg>',
    trash: '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2.5 4h9M5.5 4V2.5h3V4M3.5 4l.6 7.5h5.8l.6-7.5"/></svg>',
    ok: '<svg class="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke-width="1.4"/><path d="M4.3 7.2l2 2L9.8 5.2"/></svg>',
    no: '<svg class="ic" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><circle cx="7" cy="7" r="6"/><circle cx="7" cy="7" r="1.3" fill="currentColor" stroke="none"/></svg>'
  };
  MD.IC = IC;

  /* ---------- pomocnicze pola formularzy (używane też w content.js) ---------- */
  var ui = MD.ui = {};
  function fid(scope, path) { return 'f-' + scope + '-' + String(path).replace(/[^a-zA-Z0-9]+/g, '-'); }
  ui.field = function (label, scope, path, o) {
    o = o || {}; var v = o.val !== undefined ? o.val : MD.get(scope, path); if (o.lines && Array.isArray(v)) v = v.join('\n');
    var id = fid(scope, path), attrs = ' id="' + id + '" data-b="' + scope + ':' + esc(path) + '"' + (o.num ? ' data-t="num"' : '') + (o.lines ? ' data-t="lines"' : '') + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : '') + (o.inputmode ? ' inputmode="' + o.inputmode + '"' : '');
    var inner = o.ta ? '<textarea' + attrs + ' rows="' + (o.rows || 3) + '"' + (o.mono ? ' class="mono"' : '') + '>' + esc(v == null ? '' : v) + '</textarea>' : '<input type="text"' + attrs + (o.num || o.mono ? ' class="num"' : '') + ' value="' + esc(v == null ? '' : v) + '" autocomplete="off">';
    return '<div class="fld' + (o.span ? ' span2' : '') + (o.w ? ' w-' + o.w : '') + '"><label class="lbl" for="' + id + '">' + esc(label) + '</label>' + inner + (o.hint ? '<span class="hint">' + esc(o.hint) + '</span>' : '') + '</div>';
  };
  ui.select = function (label, scope, path, opts, o) {
    o = o || {}; var v = o.val !== undefined ? o.val : MD.get(scope, path), id = fid(scope, path);
    return '<div class="fld' + (o.span ? ' span2' : '') + '"><label class="lbl" for="' + id + '">' + esc(label) + '</label><select id="' + id + '" data-b="' + scope + ':' + esc(path) + '">' + opts.map(function (x) { var val = Array.isArray(x) ? x[0] : x, tx = Array.isArray(x) ? x[1] : x; return '<option value="' + esc(val) + '"' + ((v || '') === val ? ' selected' : '') + '>' + esc(tx) + '</option>'; }).join('') + '</select>' + (o.hint ? '<span class="hint">' + esc(o.hint) + '</span>' : '') + '</div>';
  };
  ui.seg = function (label, scope, path, opts, o) {
    o = o || {}; var v = o.val !== undefined ? o.val : MD.get(scope, path);
    return '<div class="fld fseg' + (o.span ? ' span2' : '') + '"><span class="lbl">' + esc(label) + '</span><div class="seg" role="group" aria-label="' + esc(label) + '">' + opts.map(function (x) { var val = Array.isArray(x) ? x[0] : x, tx = Array.isArray(x) ? x[1] : x; return '<button type="button" data-act="seg" data-scope="' + scope + '" data-path="' + esc(path) + '" data-val="' + esc(val) + '" aria-pressed="' + ((v || '') === val) + '">' + esc(tx) + '</button>'; }).join('') + '</div></div>';
  };
  ui.sw = function (label, scope, path, on, act) {
    return '<button type="button" class="sw" role="switch" aria-checked="' + !!on + '"' + (act ? ' data-act="' + act + '"' : ' data-act="sw" data-scope="' + scope + '" data-path="' + esc(path) + '"') + '><span class="tk"></span><span>' + esc(label) + '</span></button>';
  };
  /* pole ze zdjęciem: podgląd, „Wybierz”, „Zdjęcie automatycznie” */
  ui.pick = function (label, scope, path, o) {
    o = o || {}; var v = MD.get(scope, path), inf = MD.refInfo(v), logo = !!o.logo;
    var pv = inf && inf.url ? (inf.video ? '<video src="' + inf.url + '#t=0.1" muted playsinline preload="metadata"></video>' : '<img src="' + inf.url + '" alt="">') : '<span>' + (inf ? 'Brak podglądu' : esc(o.empty || 'Automatycznie')) + '</span>';
    return '<div class="fld' + (o.span ? ' span2' : '') + '"><span class="lbl">' + esc(label) + '</span><div class="pk"><div class="pv' + (logo ? ' logo' : '') + '">' + pv + '</div><div style="min-width:0;flex:1"><div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(inf ? inf.label : (o.emptyLabel || 'Strona dobierze zdjęcie sama')) + '</div><div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><button type="button" class="btn sm" data-act="pick" data-scope="' + scope + '" data-path="' + esc(path) + '"' + (o.video ? ' data-video="1"' : '') + (o.logo ? ' data-logo="1"' : '') + '>' + (v ? 'Zmień' : 'Wybierz') + '</button>' + (v ? '<button type="button" class="btn sm ghost" data-act="pick-clear" data-scope="' + scope + '" data-path="' + esc(path) + '">' + (o.clear || 'Usuń') + '</button>' : '') + '</div></div></div></div>';
  };
  MD.acts.seg = function (b) { MD.set(b.dataset.scope, b.dataset.path, b.dataset.val); MD.rerender(); };
  MD.acts.sw = function (b) { MD.set(b.dataset.scope, b.dataset.path, b.getAttribute('aria-checked') !== 'true'); MD.rerender(); };
  MD.acts.pick = function (b) {
    var sc = b.dataset.scope, pa = b.dataset.path;
    MD.pickPhoto({ title: 'Wybierz zdjęcie', current: MD.get(sc, pa), video: !!b.dataset.video, auto: !b.dataset.logo, onPick: function (ref) { if (b.dataset.logo) ref = String(ref || '').replace(/^blob:/, ''); MD.set(sc, pa, ref || (/\.\d+$/.test(pa) ? '' : undefined)); MD.rerender(); } });
  };
  MD.acts['pick-clear'] = function (b) { MD.set(b.dataset.scope, b.dataset.path, /\.\d+$/.test(b.dataset.path) ? '' : undefined); MD.rerender(); };
  /* lista powtarzalnych wierszy (opinie, osiągnięcia, partnerzy…): fields = [[klucz, etykieta, {ta, span, pick}]] */
  ui.list = function (scope, path, fields, o) {
    o = o || {}; var arr = MD.get(scope, path) || [];
    var h = arr.map(function (it, i) {
      return '<div class="item"><div class="grid2">' + fields.map(function (f) {
        var p = path + '.' + i + '.' + f[0], op = f[2] || {};
        if (op.show && !op.show(it)) return '';
        if (op.sw) return '<div class="fld span2">' + ui.sw(f[1], scope, p, !!MD.get(scope, p)) + '</div>';
        if (op.pick) return ui.pick(f[1], scope, p, Object.assign({ span: op.span }, op.pick === true ? {} : op.pick));
        if (op.select) return ui.select(f[1], scope, p, op.select, { span: op.span });
        return ui.field(f[1], scope, p, op);
      }).join('') + '</div><div class="tools2"><button type="button" class="ib" data-act="li" data-op="up" data-scope="' + scope + '" data-path="' + esc(path) + '" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="Wyżej">' + IC.up + '</button><button type="button" class="ib" data-act="li" data-op="down" data-scope="' + scope + '" data-path="' + esc(path) + '" data-i="' + i + '"' + (i === arr.length - 1 ? ' disabled' : '') + ' aria-label="Niżej">' + IC.down + '</button><button type="button" class="ib" data-act="li" data-op="del" data-scope="' + scope + '" data-path="' + esc(path) + '" data-i="' + i + '" aria-label="Usuń">' + IC.trash + '</button></div></div>';
    }).join('');
    return (arr.length ? '<div class="items' + (o.cls ? ' ' + o.cls : '') + '">' + h + '</div>' : '') + (arr.length ? '' : '<p class="muted" style="margin:6px 0 12px">' + esc(o.empty || 'Lista jest pusta.') + '</p>') + '<div style="margin-top:12px"><button type="button" class="btn" data-act="li" data-op="add" data-scope="' + scope + '" data-path="' + esc(path) + '">' + IC.plus + esc(o.add || 'Dodaj') + '</button></div>';
  };
  MD.acts.li = function (b) {
    var op = b.dataset.op; if (op === 'del' && b.dataset.confirm !== '0') {
      var arr = MD.get(b.dataset.scope, b.dataset.path) || [], it = arr[+b.dataset.i];
      var snapshot = MD.clone(it), sc = b.dataset.scope, pa = b.dataset.path, i = +b.dataset.i;
      MD.listOp(sc, pa, 'del', i);
      MD.toast('Usunięto pozycję.', { undo: function () { var a = MD.get(sc, pa) || []; a.splice(i, 0, snapshot); MD.set(sc, pa, a); MD.rerender(); } });
      return;
    }
    MD.listOp(b.dataset.scope, b.dataset.path, op, +b.dataset.i);
  };

  /* ---------- logika projektów ---------- */
  var DEFAULT_URL = /^nowy-projekt(-\d+)?$/;
  function uniqueId(base, except) {
    base = MD.slug(base) || 'projekt'; var id = base, n = 2, taken = function (x) { return x !== except && (S.D.projects[x] || S.D.trash[x] || (S.D.redirects && S.D.redirects[x])); };
    while (taken(id)) id = base + '-' + (n++);
    return id;
  }
  MD.uniqueId = uniqueId;
  function checks(p, id) {
    var im = p.images || [], pics = im.filter(function (x) { return !x.video; });
    return [
      { ok: im.length > 0, t: 'Okładka', d: 'Dodaj co najmniej jedno zdjęcie, pierwsze jest okładką.', go: 'pe-photos' },
      { ok: String(p.lead || '').trim().length >= 20, t: 'Zdanie o projekcie', d: 'Jedno zdanie pod nazwą, widać je też w Google.', go: 'pe-lead' },
      { ok: String(p.story || '').trim().length >= 200, t: 'Opowieść o projekcie', d: 'Kilka akapitów o decyzjach i materiałach. Można wygenerować.', go: 'pe-story' },
      { ok: pics.length > 0 && pics.every(function (x) { return String(x.caption || '').trim(); }), t: 'Podpisy zdjęć', d: pics.filter(function (x) { return !String(x.caption || '').trim(); }).length + ' zdjęć bez podpisu.', go: 'pe-photos' },
      { ok: !!(String(p.location || '').trim() && p.year && p.area), t: 'Lokalizacja, rok i metraż', d: 'Pokazują się pod nazwą na liście i na stronie projektu.', go: 'f-p-location' },
      { ok: !DEFAULT_URL.test(id), t: 'Adres strony', d: 'Zmień domyślny adres „nowy-projekt”.', go: 'pe-slug' }
    ];
  }
  MD.checks = checks;
  function readyN(p, id) { return checks(p, id).filter(function (c) { return c.ok; }).length; }
  function applyOrder(ids) {
    ids.forEach(function (id, i) { var p = S.D.projects[id]; if (p && p.order !== (i + 1) * 10) { p.order = (i + 1) * 10; MD.touch('projects/' + id); } });
  }
  MD.newProject = function () {
    var id = uniqueId('nowy-projekt'), list = MD.projects(), max = list.reduce(function (m, p) { return Math.max(m, p.order || 0); }, 0);
    S.D.projects[id] = { title: 'Nowy projekt', type: 'Dom', status: 'Projekt', scope: 'Projekt wnętrz', published: false, featured: false, images: [], order: max + 10 };
    MD.touch('projects/' + id); location.hash = '#/projekt/' + id;
  };
  MD.dupProject = function (id) {
    var src = S.D.projects[id]; if (!src) return;
    var nid = uniqueId(id + '-kopia'), c = MD.clone(src); c.title = (src.title || id) + ' (kopia)'; c.published = false; c.featured = false;
    S.D.projects[nid] = c;
    var ids = MD.projects().sort(function (a, b) { return (a.order || 0) - (b.order || 0); }).map(function (p) { return p.id; }).filter(function (x) { return x !== nid; });
    ids.splice(ids.indexOf(id) + 1, 0, nid); applyOrder(ids); MD.touch('projects/' + nid);
    MD.toast('Zrobiono kopię. Jest ukryta, dopóki jej nie włączysz.'); location.hash = '#/projekt/' + nid;
  };
  MD.trashProject = function (id) {
    var p = S.D.projects[id]; if (!p) return;
    S.D.trash[id] = { at: Math.floor(Date.now() / 1000), project: MD.clone(p) };
    delete S.D.projects[id]; MD.touch('projects/' + id); MD.touch('trash/' + id);
    MD.toast('Projekt „' + (p.title || id) + '” w koszu. Zostaje tam 30 dni.', { undo: function () { MD.restoreProject(id, true); } });
    if (/^#\/projekt\//.test(location.hash)) location.hash = '#/projekty'; else MD.rerender();
  };
  MD.restoreProject = function (id, quiet) {
    var t = S.D.trash[id]; if (!t) return;
    var nid = S.D.projects[id] ? uniqueId(id + '-przywrocony') : id;
    S.D.projects[nid] = t.project; delete S.D.trash[id]; MD.touch('projects/' + nid); MD.touch('trash/' + id);
    if (!quiet) MD.toast('Przywrócono projekt „' + (t.project.title || nid) + '”.');
    MD.closeLayer(); if (MD.cur.route && MD.cur.route.v === 'list') MD.rerender(); else MD.go();
  };
  /* zmiana adresu: dokument dostaje nowy identyfikator, stary adres przekierowuje po publikacji */
  MD.renameProject = function (old, nu, quiet) {
    if (old === nu || !S.D.projects[old]) return true;
    if (S.D.projects[nu] || S.D.trash[nu]) return false;
    var doc = S.D.projects[old]; S.D.projects[nu] = doc; delete S.D.projects[old];
    var R = S.D.redirects = S.D.redirects || {};
    if (S.P.projects[old]) R[old] = nu;
    Object.keys(R).forEach(function (k) { if (R[k] === old) R[k] = nu; });
    delete R[nu];
    MD.touch('projects/' + old); MD.touch('projects/' + nu); MD.touch('redirects');
    MD.cur.pid = nu; if (MD.cur.route) MD.cur.route.id = nu;
    MD.cur.quiet = '#/projekt/' + nu; location.hash = '#/projekt/' + nu;
    return true;
  };

  /* ---------- LISTA ---------- */
  var LV = MD.lv = { q: '', f: 'all' };
  function norm(s) { return MD.slug(s).replace(/-/g, ''); }
  function filtered() {
    var all = MD.projects(), q = norm(LV.q);
    return all.filter(function (p) {
      if (LV.f === 'vis' && p.published === false) return false;
      if (LV.f === 'hid' && p.published !== false) return false;
      if (LV.f === 'feat' && !p.featured) return false;
      if (LV.f === 'chg' && !MD.projChanged(p.id).length) return false;
      if (q) { var hay = norm([p.title, p.id, p.location, p.type, p.style, p.motif].join(' ')); if (hay.indexOf(q) < 0) return false; }
      return true;
    });
  }
  function counts() {
    var all = MD.projects(), c = { all: all.length, vis: 0, hid: 0, feat: 0, chg: 0 };
    all.forEach(function (p) { if (p.published === false) c.hid++; else c.vis++; if (p.featured) c.feat++; if (MD.projChanged(p.id).length) c.chg++; });
    return c;
  }
  function rowHtml(p, canDrag, i, n, pos) {
    var ch = MD.projChanged(p.id), isNew = ch[0] === 'new', rn = readyN(p, p.id), th = MD.cover(p);
    var st = isNew ? '<span class="pill chg">Nowy</span>' : ch.length ? '<span class="pill chg">Zmieniony</span>' : '<span class="pill ok">Opublikowany</span>';
    var meta = [p.type, p.location, p.year, p.area ? p.area + ' m²' : ''].filter(Boolean).join(' · ');
    return '<div class="prow" data-id="' + esc(p.id) + '"' + (canDrag ? ' draggable="true"' : '') + '>' +
      '<button type="button" class="grab" aria-label="Przeciągnij, żeby zmienić kolejność" tabindex="-1">' + IC.grab + '</button>' +
      '<span class="no' + (pos ? '' : ' off') + '" title="' + (pos ? 'Miejsce na stronie' : 'Ukryty: nie ma miejsca na stronie') + '">' + (pos || '–') + '</span>' +
      '<a class="th" href="#/projekt/' + esc(p.id) + '" tabindex="-1" aria-hidden="true">' + (th ? '<img loading="lazy" src="' + th + '" alt="">' : '') + '</a>' +
      '<div class="mid"><a class="tt" href="#/projekt/' + esc(p.id) + '" style="color:inherit;text-decoration:none">' + esc(p.title || p.id) + '</a><div class="mt">' + esc(meta || 'Uzupełnij dane projektu') + '</div><div class="tags">' + st + (rn < 6 ? '<span class="pill chg">Gotowy ' + rn + '/6</span>' : '') + (p.published === false ? '<span class="pill">Ukryty</span>' : '') + '</div></div>' +
      '<div class="act"><div class="tg">' + ui.sw('Widoczny', '', '', p.published !== false, 'pm-pub').replace('data-act="pm-pub"', 'data-act="pm-pub" data-id="' + esc(p.id) + '"') + ui.sw('Na głównej', '', '', !!p.featured, 'pm-feat').replace('data-act="pm-feat"', 'data-act="pm-feat" data-id="' + esc(p.id) + '"') + '</div>' +
      '<a class="btn sm" href="#/projekt/' + esc(p.id) + '">Edytuj</a><button type="button" class="ib" data-act="pm-menu" data-id="' + esc(p.id) + '" aria-haspopup="menu" aria-label="Więcej: ' + esc(p.title || p.id) + '">' + IC.more + '</button></div></div>';
  }
  function rowsHtml() {
    var L = filtered(), canDrag = LV.f === 'all' && !LV.q;
    if (!L.length) return '<div class="empty">' + (MD.projects().length ? 'Żaden projekt nie pasuje. <button class="btn sm" data-act="lv-clear">Wyczyść filtry</button>' : 'Nie ma jeszcze projektów. <button class="btn primary sm" data-act="pm-new">Dodaj pierwszy</button>') + '</div>';
    MD.cur.canDrag = canDrag;
    var pos = {}, k = 0; MD.projects().forEach(function (p) { if (p.published !== false) pos[p.id] = ++k; });
    return '<div class="rows" id="rows">' + L.map(function (p, i) { return rowHtml(p, canDrag, i, L.length, pos[p.id]); }).join('') + '</div>' + (canDrag ? '' : '<p class="small muted" style="margin-top:10px">Kolejność zmienisz po wyczyszczeniu wyszukiwarki i filtrów.</p>');
  }
  MD.views.list = function () {
    var c = counts(), tr = Object.keys(S.D.trash || {}).length;
    var F = [['all', 'Wszystkie'], ['vis', 'Widoczne'], ['hid', 'Ukryte'], ['feat', 'Na głównej'], ['chg', 'Zmienione']];
    MD.cur.mount = function () { var q = MD.$('#q'); if (q) q.addEventListener('input', function () { LV.q = q.value; MD.$('#rowbox').innerHTML = rowsHtml(); }); };
    return '<div class="head"><h1>Projekty<span class="c">' + c.all + '</span></h1><div style="display:flex;gap:8px;flex-wrap:wrap">' + (tr ? '<button class="btn" data-act="pm-trash">Kosz (' + tr + ')</button>' : '') + '<button class="btn primary" data-act="pm-new">' + IC.plus + 'Nowy projekt</button></div></div>' +
      '<p class="sub-p">Zmiany zapisują się same. Na stronie pojawią się po kliknięciu „Opublikuj” u góry.</p>' +
      '<div class="tools"><label class="search">' + IC.search + '<span class="vh">Szukaj projektu</span><input id="q" type="search" placeholder="Szukaj po nazwie, miejscu, typie" value="' + esc(LV.q) + '" autocomplete="off"><kbd aria-hidden="true">/</kbd></label>' +
      '<div class="seg" role="group" aria-label="Filtr">' + F.map(function (f) { return '<button type="button" data-act="lv-f" data-f="' + f[0] + '" aria-pressed="' + (LV.f === f[0]) + '">' + f[1] + '<span class="n">' + c[f[0]] + '</span></button>'; }).join('') + '</div></div>' +
      '<p class="small muted" style="margin-top:12px">Numer przy zdjęciu to miejsce na stronie (ukryte projekty go nie mają). Zmienisz je, przeciągając uchwyt.</p><div id="rowbox" style="margin-top:8px">' + rowsHtml() + '</div>';
  };
  MD.acts['lv-f'] = function (b) { LV.f = b.dataset.f; MD.rerender(); };
  MD.acts['lv-clear'] = function () { LV.f = 'all'; LV.q = ''; MD.rerender(); };
  MD.acts['pm-new'] = function () { MD.newProject(); };
  MD.acts['pm-pub'] = function (b) { var p = S.D.projects[b.dataset.id]; if (!p) return; p.published = p.published === false; MD.touch('projects/' + b.dataset.id); MD.rerender(); };
  MD.acts['pm-feat'] = function (b) { var p = S.D.projects[b.dataset.id]; if (!p) return; p.featured = !p.featured; MD.touch('projects/' + b.dataset.id); MD.rerender(); };
  MD.acts['pm-menu'] = function (b) {
    var id = b.dataset.id, p = S.D.projects[id], live = S.P.projects[id] && S.P.projects[id].published !== false;
    var ids = MD.projects().map(function (x) { return x.id; }), i = ids.indexOf(id);
    MD.menu(b, '<a href="#/projekt/' + esc(id) + '">Edytuj</a>' + (live ? '<a href="/projekty/' + esc(id) + '/" target="_blank" rel="noopener">Zobacz na stronie</a>' : '') + '<button data-act="pm-dup" data-id="' + esc(id) + '">Duplikuj</button>' +
      (LV.f === 'all' && !LV.q ? '<button data-act="pm-mv" data-id="' + esc(id) + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + '>Przesuń wyżej</button><button data-act="pm-mv" data-id="' + esc(id) + '" data-d="1"' + (i === ids.length - 1 ? ' disabled' : '') + '>Przesuń niżej</button>' : '') +
      '<button class="dg" data-act="pm-del" data-id="' + esc(id) + '">Przenieś do kosza</button>', true);
  };
  MD.acts['pm-dup'] = function (b) { MD.closeMenu(); MD.dupProject(b.dataset.id); };
  MD.acts['pm-del'] = function (b) { MD.closeMenu(); MD.trashProject(b.dataset.id); };
  MD.acts['pm-mv'] = function (b) {
    MD.closeMenu(); var ids = MD.projects().map(function (x) { return x.id; }), i = ids.indexOf(b.dataset.id), j = i + (+b.dataset.d);
    if (i < 0 || j < 0 || j >= ids.length) return; ids.splice(j, 0, ids.splice(i, 1)[0]); applyOrder(ids); MD.rerender();
  };
  MD.acts['pm-trash'] = function () {
    var T = S.D.trash || {}, ids = Object.keys(T).sort(function (a, b) { return T[b].at - T[a].at; });
    MD.modal({ title: 'Kosz', narrow: true, body: '<p class="muted small" style="margin-bottom:8px">Projekty z kosza znikają ze strony po publikacji. Po 30 dniach kosz czyści się sam.</p>' + (ids.length ? ids.map(function (id) { var left = Math.max(0, 30 - Math.floor((Date.now() / 1000 - T[id].at) / 86400)); return '<div class="hist"><div><b>' + esc(T[id].project.title || id) + '</b><span class="small muted">Zostało ' + left + ' dni</span></div><button class="btn sm" data-act="pm-restore" data-id="' + esc(id) + '">Przywróć</button></div>'; }).join('') : '<p class="muted">Kosz jest pusty.</p>') });
  };
  MD.acts['pm-restore'] = function (b) { MD.restoreProject(b.dataset.id); };
  /* przeciąganie */
  var dragId = null;
  document.addEventListener('dragstart', function (e) { var r = e.target.closest && e.target.closest('.prow[data-id]'); if (!r || !MD.cur.canDrag) return; dragId = r.getAttribute('data-id'); r.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); } catch (x) {} });
  document.addEventListener('dragover', function (e) { if (!dragId) return; var r = e.target.closest && e.target.closest('.prow[data-id]'); if (!r) return; e.preventDefault(); MD.$$('.prow.over').forEach(function (x) { x.classList.remove('over'); }); if (r.getAttribute('data-id') !== dragId) r.classList.add('over'); });
  document.addEventListener('drop', function (e) {
    if (!dragId) return; var r = e.target.closest && e.target.closest('.prow[data-id]'); if (!r) return; e.preventDefault();
    var to = r.getAttribute('data-id'), ids = MD.projects().map(function (x) { return x.id; }); if (to !== dragId) { ids.splice(ids.indexOf(dragId), 1); ids.splice(ids.indexOf(to), 0, dragId); applyOrder(ids); }
    dragId = null; MD.rerender();
  });
  document.addEventListener('dragend', function () { dragId = null; MD.$$('.prow.drag,.prow.over').forEach(function (x) { x.classList.remove('drag', 'over'); }); });

  /* ---------- EDYCJA ---------- */
  function checkHtml(p, id) {
    var L = checks(p, id), n = L.filter(function (c) { return c.ok; }).length;
    return '<div class="ch"><h2>Gotowy do publikacji</h2><span class="pill ' + (n === 6 ? 'ok' : 'chg') + ' mono">' + n + '/6</span></div><div class="prog" aria-hidden="true"><i style="width:' + Math.round(n / 6 * 100) + '%"></i></div>' +
      L.map(function (c) { return '<div class="check ' + (c.ok ? 'ok' : 'no') + '">' + (c.ok ? IC.ok : IC.no) + '<div><b style="font-weight:500">' + esc(c.t) + '</b>' + (c.ok ? '' : '<div class="small muted">' + esc(c.d) + ' <a href="#" data-act="pe-go" data-go="' + c.go + '">Przejdź</a></div>') + '</div></div>'; }).join('') +
      '<p class="small muted" style="margin-top:10px">To podpowiedź, nie blokada. Projekt możesz opublikować w każdej chwili.</p>';
  }
  function snipHtml(p, id) {
    return '<div class="u">motywdesign.pl › projekty › ' + esc(id) + '</div><div class="t">' + esc((p.title || 'Nazwa projektu') + ' · MotywDesign') + '</div><div class="d">' + esc(String(p.lead || 'Dodaj zdanie o projekcie, pokaże się tutaj i w wynikach Google.').slice(0, 160)) + '</div>';
  }
  function imgCard(p, im, i, n) {
    var pics = !im.video, bigN = (function () { var o = bigOrder(p.images); return o.indexOf(i); })(), pairN = pairOrder(p.images).indexOf(i);
    var isHero = heroIdx(p) === i, lay = im.big ? 'big' : im.pair ? 'pair' : 'std';
    return '<div class="thumb" data-i="' + i + '"><div class="im" draggable="true" title="Przeciągnij, żeby zmienić kolejność">' + (im.video ? '<video src="' + MD.imgUrl(im.id, true) + '#t=0.1" muted playsinline preload="metadata"></video>' : '<img loading="lazy" src="' + MD.imgUrl(im.th || im.id) + '" alt="' + esc(im.caption || '') + '">') +
      '<div class="bd">' + (i === 0 ? '<span class="pill">Okładka</span>' : '') + (im.video ? '<span class="pill vd">Wideo</span>' : '') + '</div></div>' +
      '<div class="ft"><input type="text" data-cap="' + i + '" value="' + esc(im.caption || '') + '" placeholder="Podpis zdjęcia" aria-label="Podpis zdjęcia ' + (i + 1) + '">' +
      (im.video ? '<select data-vmode="' + i + '" aria-label="Sposób odtwarzania"><option value="auto"' + (im.mode !== 'play' ? ' selected' : '') + '>Autoplay, pętla, bez dźwięku</option><option value="play"' + (im.mode === 'play' ? ' selected' : '') + '>Z przyciskiem play</option></select>' : '') +
      '<div class="lay" role="group" aria-label="Układ na stronie projektu"><button type="button" data-act="im-lay" data-i="' + i + '" data-l="std" aria-pressed="' + (lay === 'std') + '">Zwykłe</button><button type="button" data-act="im-lay" data-i="' + i + '" data-l="big" aria-pressed="' + (lay === 'big') + '" title="Na całą szerokość. Najwyżej ' + MAX_BIG + ' zdjęcia">Duże' + (im.big ? ' ' + (bigN + 1) : '') + '</button><button type="button" data-act="im-lay" data-i="' + i + '" data-l="pair" aria-pressed="' + (lay === 'pair') + '" title="Dwa zdjęcia obok siebie">Para' + (im.pair ? ' ' + (pairN + 1) : '') + '</button>' + (pics ? '<button type="button" data-act="im-hero" data-i="' + i + '" aria-pressed="' + isHero + '" title="Zdjęcie w tle nagłówka strony projektu">Tło</button>' : '') + '</div>' +
      '<div class="mv"><span style="display:flex;gap:4px"><button type="button" class="ib" data-act="im-mv" data-i="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Przesuń w lewo">' + IC.left + '</button><button type="button" class="ib" data-act="im-mv" data-i="' + i + '" data-d="1"' + (i === n - 1 ? ' disabled' : '') + ' aria-label="Przesuń w prawo">' + IC.right + '</button></span>' + (i > 0 ? '<button type="button" class="btn sm ghost" data-act="im-cover" data-i="' + i + '">Na okładkę</button>' : '') + '<button type="button" class="ib" data-act="im-del" data-i="' + i + '" aria-label="Usuń zdjęcie">' + IC.trash + '</button></div></div></div>';
  }
  function keyOrder(imgs, k) { var l = []; imgs.forEach(function (im, i) { if (im && im[k]) l.push(i); }); l.sort(function (a, b) { var x = imgs[a][k] === true ? 1000 + a : +imgs[a][k], y = imgs[b][k] === true ? 1000 + b : +imgs[b][k]; return x - y; }); return l; }
  function keyRenum(imgs, k) { keyOrder(imgs, k).forEach(function (i, n) { imgs[i][k] = n + 1; }); }
  function bigOrder(imgs) { return keyOrder(imgs, 'big'); }
  function pairOrder(imgs) { return keyOrder(imgs, 'pair'); }
  function heroIdx(p) { var ims = p.images || [], i = p.heroImg ? ims.map(function (x) { return x.id; }).indexOf(p.heroImg) : -1; return i >= 0 ? i : 0; }
  function slotHtml(p, k, label) {
    var id = p[k], url = id ? MD.imgUrl(id) : '';
    return '<div class="slot"><span class="lbl">' + label + '</span><div class="si">' + (url ? '<img src="' + url + '" alt="' + label + '">' : 'Brak zdjęcia') + '</div><div class="ac"><button type="button" class="btn sm" data-act="ba-pick" data-k="' + k + '">' + (id ? 'Zmień' : 'Wybierz') + '</button>' + (id ? '<button type="button" class="btn sm ghost" data-act="ba-clear" data-k="' + k + '">Usuń</button>' : '') + '</div></div>';
  }
  MD.views.edit = function (r) {
    var id = r.id, p = S.D.projects[id];
    if (!p) {
      var red = S.D.redirects && S.D.redirects[id]; if (red && S.D.projects[red]) { setTimeout(function () { location.replace('#/projekt/' + red); }, 0); return ''; }
      return '<div class="empty">Nie ma takiego projektu. <a class="btn sm" href="#/projekty">Wróć do listy</a></div>';
    }
    if (!Array.isArray(p.images)) p.images = [];
    var live = S.P.projects[id] && S.P.projects[id].published !== false, rn = Object.keys(S.D.redirects || {}).filter(function (k) { return S.D.redirects[k] === id; });
    MD.cur.after = function (sc, path) {
      var pp = S.D.projects[MD.cur.pid]; if (!pp) return;
      if (sc === 'p' && path === 'title') {
        var h = MD.$('#pe-h1'); if (h) h.textContent = pp.title || 'Projekt bez nazwy';
        if (!S.P.projects[MD.cur.pid] && MD.cur.autoSlug === MD.cur.pid) { var nid = uniqueId(MD.slug(pp.title) || 'nowy-projekt', MD.cur.pid); if (nid !== MD.cur.pid && MD.renameProject(MD.cur.pid, nid)) { MD.cur.autoSlug = nid; var sl = MD.$('#pe-slug'); if (sl) sl.value = nid; } }
      }
      var cb = MD.$('#pe-check'); if (cb) cb.innerHTML = checkHtml(pp, MD.cur.pid);
      var sn = MD.$('#pe-snip'); if (sn) sn.innerHTML = snipHtml(pp, MD.cur.pid);
    };
    MD.cur.autoSlug = (DEFAULT_URL.test(id) || (!S.P.projects[id] && id === MD.slug(p.title))) ? id : null;
    MD.cur.mount = function (root) { mountEdit(root); };
    var colors = (function () { var s = {}; MD.projects().forEach(function (x) { if (x.color) s[x.color] = x.motif || x.title; }); return s; })();
    return '<div class="crumbs"><a href="#/projekty">' + IC.back + 'Wszystkie projekty</a><div style="display:flex;gap:8px;flex-wrap:wrap">' + (live ? '<a class="btn" href="/projekty/' + esc(id) + '/" target="_blank" rel="noopener">Zobacz na stronie</a>' : '') + '<button class="ib" data-act="pe-menu" aria-haspopup="menu" aria-label="Więcej">' + IC.more + '</button></div></div>' +
      '<div class="head" style="margin-top:6px"><h1 id="pe-h1">' + esc(p.title || 'Projekt bez nazwy') + '</h1><span>' + (S.P.projects[id] ? (MD.projChanged(id).length ? '<span class="pill chg">Zmieniony, niepublikowany</span>' : '<span class="pill ok">Opublikowany</span>') : '<span class="pill chg">Nowy, niepublikowany</span>') + '</span></div>' +
      '<div class="edit"><div class="form">' +
    '<div class="card"><h2>Podstawowe informacje</h2><div class="grid2" style="margin-top:14px">' + ui.field('Nazwa projektu', 'p', 'title', { w: 'l' }) + ui.field('Dopisek kursywą', 'p', 'accent', { hint: 'Jedno lub dwa słowa, np. „wśród sosen”.' }) + ui.field('Styl', 'p', 'style', { ph: 'Np. Nowoczesny', w: 'm' }) +
      ui.seg('Typ', 'p', 'type', TYPES) + ui.seg('Status', 'p', 'status', STATUSES) + ui.select('Zakres prac', 'p', 'scope', [''].concat(SCOPES).map(function (x) { return [x, x || 'Wybierz…']; }), { span: false }) + ui.field('Lokalizacja', 'p', 'location', { ph: 'Warszawa, Konstancin' }) +
      ui.field('Rok', 'p', 'year', { num: true, inputmode: 'numeric', w: 's' }) + ui.field('Metraż (m²)', 'p', 'area', { num: true, inputmode: 'decimal', w: 's' }) +
      ui.field('Motyw', 'p', 'motif', { ph: 'Np. Sosna, Kamień', w: 'm' }) + '<div class="fld w-c"><label class="lbl" for="pe-color">Kolor</label><div style="display:flex;gap:8px;align-items:center"><input type="color" id="pe-color" value="' + esc(/^#[0-9a-fA-F]{6}$/.test(p.color || '') ? p.color : '#888888') + '" style="width:48px;height:36px;padding:2px;border:1px solid var(--ctl);border-radius:8px;background:var(--field)" aria-label="Kolor"><input type="text" class="num" data-b="p:color" id="f-p-color" value="' + esc(p.color || '') + '" placeholder="#5d6b4f" style="max-width:130px"></div></div>' + 
      '<div class="fld w-url"><label class="lbl" for="pe-slug">Adres strony</label><div class="urlbox"><span class="pre">motywdesign.pl/projekty/</span><input type="text" id="pe-slug" value="' + esc(id) + '" autocomplete="off" spellcheck="false"><span class="pre" style="border-left:0;border-right:1px solid var(--ctl);border-radius:0 8px 8px 0">/</span></div><span class="hint" id="pe-slug-h">' + (S.P.projects[id] ? 'Projekt jest już na stronie. Zmiana adresu przekieruje stary link na nowy po publikacji.' : 'Adres powstaje z nazwy, dopóki go nie zmienisz sam.') + (rn.length ? ' Przekierowanie: /' + rn.map(esc).join('/, /') + '/' : '') + '</span></div>' + '</div>' +
      (Object.keys(colors).length ? '<div class="fld" style="margin-top:12px"><span class="lbl">Kolory z innych projektów</span><div class="swatches">' + Object.keys(colors).map(function (c) { return '<button type="button" data-act="pe-color" data-c="' + esc(c) + '" aria-pressed="' + (p.color === c) + '"><span class="c" style="background:' + esc(c) + '"></span>' + esc(colors[c]) + '</button>'; }).join('') + '</div></div>' : '') + '</div>' +
      '<div class="card"><div class="ch"><h2>Opis</h2></div><p class="lead-p">Zdanie o projekcie pokazuje się pod nazwą i w Google. Opowieść to kilka akapitów o decyzjach i materiałach.</p><div class="split"><div class="l"><div class="grid2">' + ui.field('Zdanie o projekcie', 'p', 'lead', { ta: true, rows: 2, span: true, hint: 'Do ok. 160 znaków.' }) + ui.field('Opowieść o projekcie', 'p', 'story', { ta: true, rows: 10, span: true, hint: 'Akapity oddziel pustym wierszem.' }) + '</div></div><div class="r"><button type="button" class="btn" data-act="ai-story">' + (S.ai ? 'Wygeneruj opis (Claude)' : 'Opisz przez Claude (kopiuj prośbę)') + '</button><div class="snip" id="pe-snip" aria-label="Podgląd w Google" style="margin-top:12px">' + snipHtml(p, id) + '</div><span class="hint small muted">Tak projekt wygląda w wynikach Google.</span></div></div></div>' +
      '<div class="card" id="pe-photos"><div class="ch"><h2>Zdjęcia <span class="muted" style="font-weight:400">' + p.images.length + '</span></h2><button type="button" class="btn sm" data-act="ai-caps"' + (p.images.some(function (x) { return !x.video; }) ? '' : ' disabled') + '>' + (S.ai ? 'Opisz zdjęcia (Claude)' : 'Opisz przez Claude (kopiuj prośbę)') + '</button></div><p class="lead-p">Pierwsze zdjęcie jest okładką. „Duże” zajmuje całą szerokość (najwyżej ' + MAX_BIG + '), „Para” ustawia dwa zdjęcia obok siebie, „Tło” to zdjęcie w nagłówku strony projektu.</p>' +
      '<div class="drop" id="pe-drop"><div><b style="font-weight:500">Przeciągnij pliki tutaj</b><div class="small muted">Zdjęcia JPG, PNG, WebP. Filmy tylko MP4, do 20 MB.</div></div><label class="btn primary" for="pe-up">' + IC.plus + 'Dodaj zdjęcia</label><input class="vh" type="file" id="pe-up" accept="image/*,video/mp4" multiple></div>' +
      (p.images.length ? '<div class="thumbs">' + p.images.map(function (im, i) { return imgCard(p, im, i, p.images.length); }).join('') + '</div>' : '<p class="muted">Brak zdjęć. Dodaj pierwsze, żeby projekt miał okładkę.</p>') + '</div>' +
      '<div class="card"><details class="adv"' + (p.before || p.after || p.scene ? ' open' : '') + '><summary><h2>Zaawansowane: przed i po</h2>' + IC.chev + '</summary><div class="in"><p class="lead-p">Jeśli dodasz oba zdjęcia, na stronie projektu pojawi się suwak porównania.</p><div class="slots">' + slotHtml(p, 'before', 'Przed') + slotHtml(p, 'after', 'Po') + '</div><div class="grid2" style="margin-top:16px">' + ui.select('Rysunek zastępczy, gdy brak zdjęć', 'p', 'scene', SCENES, { hint: 'Wektorowa scena pokazywana, dopóki projekt nie ma okładki.' }) + '</div></div></details></div>' +
      '</div><aside><div class="card" id="pe-check">' + checkHtml(p, id) + '</div><div class="card"><h2>Widoczność</h2><div style="margin-top:6px">' +
      '<div class="sws" style="border-top:0"><div><b>Widoczny na stronie</b><span class="small muted">Po wyłączeniu projekt znika ze strony po publikacji.</span></div>' + ui.sw('', 'p', 'published', p.published !== false) + '</div>' +
      '<div class="sws"><div><b>Na stronie głównej</b><span class="small muted">Wybrane projekty pod pierwszym ekranem.</span></div>' + ui.sw('', 'p', 'featured', !!p.featured) + '</div>' +
      '<div class="sws"><div><b>Cała szerokość w portfolio</b><span class="small muted">Kafel rozciągnięty na dwie kolumny.</span></div>' + ui.sw('', 'p', 'wide', !!p.wide) + '</div></div></div></aside></div>';
  };

  function mountEdit(root) {
    var slug = MD.$('#pe-slug', root);
    if (slug) {
      slug.addEventListener('input', function () { MD.cur.autoSlug = null; var v = MD.slug(slug.value), h = MD.$('#pe-slug-h'); if (h && v && v !== MD.cur.pid && (S.D.projects[v] || S.D.trash[v])) h.textContent = 'Ten adres jest już zajęty. Wybierz inny.'; });
      slug.addEventListener('change', function () {
        var v = MD.slug(slug.value) || MD.cur.pid, h = MD.$('#pe-slug-h');
        if (v !== MD.cur.pid && (S.D.projects[v] || S.D.trash[v])) { slug.value = MD.cur.pid; MD.toast('Ten adres jest już zajęty.', { bad: true }); return; }
        slug.value = v; if (v !== MD.cur.pid) { MD.renameProject(MD.cur.pid, v); var pp = S.D.projects[v]; var cb = MD.$('#pe-check'); if (cb) cb.innerHTML = checkHtml(pp, v); var sn = MD.$('#pe-snip'); if (sn) sn.innerHTML = snipHtml(pp, v); if (h) h.textContent = S.P.projects[MD.cur.pid] || Object.keys(S.D.redirects || {}).some(function (k) { return S.D.redirects[k] === v; }) ? 'Stary adres będzie przekierowywał na nowy po publikacji.' : 'Adres zapisany.'; }
      });
    }
    var col = MD.$('#pe-color', root);
    if (col) col.addEventListener('input', function () { var t = MD.$('#f-p-color'); t.value = col.value; MD.set('p', 'color', col.value); });
    var drop = MD.$('#pe-drop', root), up = MD.$('#pe-up', root);
    function addFiles(files) {
      var pid = MD.cur.pid;
      MD.upload(files, { video: true }).then(function (L) {
        var p = S.D.projects[pid]; if (!p || !L.length) return;
        L.forEach(function (x) { var o = { id: x.id, caption: '' }; if (x.th) o.th = x.th; if (x.video) { o.video = true; o.mode = 'auto'; } p.images.push(o); });
        MD.touch('projects/' + pid); if (MD.cur.pid === pid) MD.rerender();
        MD.toast('Dodano ' + L.length + ' ' + MD.plural(L.length, 'plik', 'pliki', 'plików') + '.');
      });
    }
    if (up) up.addEventListener('change', function () { addFiles(up.files); up.value = ''; });
    if (drop) {
      ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) { e.preventDefault(); drop.classList.add('on'); } }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('on'); }); });
      drop.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); addFiles(e.dataTransfer.files); } });
    }
    root.addEventListener('input', function (e) {
      var t = e.target, p = S.D.projects[MD.cur.pid]; if (!p) return;
      if (t.hasAttribute('data-cap')) { p.images[+t.getAttribute('data-cap')].caption = t.value; MD.touch('projects/' + MD.cur.pid); MD.cur.after('p', 'images'); }
    });
    root.addEventListener('change', function (e) {
      var t = e.target, p = S.D.projects[MD.cur.pid]; if (!p) return;
      if (t.hasAttribute('data-vmode')) { p.images[+t.getAttribute('data-vmode')].mode = t.value; MD.touch('projects/' + MD.cur.pid); }
    });
  }
  function cur() { return S.D.projects[MD.cur.pid]; }
  function touchP() { MD.touch('projects/' + MD.cur.pid); MD.rerender(); }
  MD.acts['pe-go'] = function (b) { var t = document.getElementById(b.dataset.go); if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (t.focus && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) t.focus(); } };
  MD.acts['pe-color'] = function (b) { MD.set('p', 'color', b.dataset.c); MD.rerender(); };
  MD.acts['pe-menu'] = function (b) {
    MD.menu(b, '<button data-act="pm-dup" data-id="' + esc(MD.cur.pid) + '">Duplikuj</button><button class="dg" data-act="pm-del" data-id="' + esc(MD.cur.pid) + '">Przenieś do kosza</button>', true);
  };
  /* przeciąganie zdjęć projektu (myszką); na dotyku zostają strzałki */
  var imDrag = null;
  function imClear() { MD.$$('.thumb.drag,.thumb.over').forEach(function (x) { x.classList.remove('drag', 'over'); }); }
  document.addEventListener('dragstart', function (e) { var t = e.target.closest && e.target.closest('.thumb[data-i]'); if (!t || !cur()) return; imDrag = +t.getAttribute('data-i'); t.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'zdjecie-' + imDrag); } catch (x) {} });
  document.addEventListener('dragover', function (e) { if (imDrag === null) return; var t = e.target.closest && e.target.closest('.thumb[data-i]'); if (!t) return; e.preventDefault(); imClear(); var d = MD.$('.thumb[data-i="' + imDrag + '"]'); if (d) d.classList.add('drag'); if (+t.getAttribute('data-i') !== imDrag) t.classList.add('over'); });
  document.addEventListener('drop', function (e) {
    if (imDrag === null) return; var t = e.target.closest && e.target.closest('.thumb[data-i]'), p = cur(); if (!t || !p) return; e.preventDefault();
    var to = +t.getAttribute('data-i'), from = imDrag; imDrag = null; imClear();
    if (to !== from && from >= 0 && from < p.images.length && to >= 0 && to < p.images.length) { p.images.splice(to, 0, p.images.splice(from, 1)[0]); touchP(); }
  });
  document.addEventListener('dragend', function () { imDrag = null; imClear(); });
  MD.acts['im-mv'] = function (b) { var p = cur(), i = +b.dataset.i, j = i + (+b.dataset.d); if (j < 0 || j >= p.images.length) return; p.images.splice(j, 0, p.images.splice(i, 1)[0]); touchP(); };
  MD.acts['im-cover'] = function (b) { var p = cur(), i = +b.dataset.i; p.images.unshift(p.images.splice(i, 1)[0]); touchP(); };
  MD.acts['im-del'] = function (b) {
    var p = cur(), i = +b.dataset.i, im = p.images[i], pid = MD.cur.pid; p.images.splice(i, 1); if (p.heroImg === im.id) p.heroImg = ''; keyRenum(p.images, 'big'); keyRenum(p.images, 'pair'); touchP();
    MD.toast('Usunięto zdjęcie z projektu.', { undo: function () { var q = S.D.projects[pid]; if (!q) return; q.images.splice(i, 0, im); keyRenum(q.images, 'big'); keyRenum(q.images, 'pair'); MD.touch('projects/' + pid); if (MD.cur.pid === pid) MD.rerender(); } });
  };
  MD.acts['im-hero'] = function (b) { var p = cur(), i = +b.dataset.i, im = p.images[i]; if (!im || im.video) return; var on = heroIdx(p) === i && p.heroImg; p.heroImg = on ? '' : im.id; if (p.heroImg) { if (im.big) { delete im.big; keyRenum(p.images, 'big'); } if (im.pair) { delete im.pair; keyRenum(p.images, 'pair'); } } touchP(); };
  MD.acts['im-lay'] = function (b) {
    var p = cur(), i = +b.dataset.i, im = p.images[i], l = b.dataset.l; if (!im) return;
    if (l === 'big') { if (!im.big && p.images.filter(function (x) { return x.big; }).length >= MAX_BIG) { MD.toast('Duże mogą być najwyżej ' + MAX_BIG + ' zdjęcia. Odznacz któreś, żeby wybrać inne.', { bad: true }); return; } keyRenum(p.images, 'big'); if (im.big) delete im.big; else { im.big = p.images.filter(function (x) { return x.big; }).length + 1; delete im.pair; if (p.heroImg === im.id) p.heroImg = ''; } }
    else if (l === 'pair') { keyRenum(p.images, 'pair'); if (im.pair) delete im.pair; else { im.pair = p.images.filter(function (x) { return x.pair; }).length + 1; delete im.big; if (p.heroImg === im.id) p.heroImg = ''; } }
    else { delete im.big; delete im.pair; }
    keyRenum(p.images, 'big'); keyRenum(p.images, 'pair'); touchP();
  };
  MD.acts['ba-pick'] = function (b) { var k = b.dataset.k; MD.pickPhoto({ title: k === 'before' ? 'Zdjęcie „przed”' : 'Zdjęcie „po”', current: cur()[k] ? 'blob:' + cur()[k] : '', onPick: function (ref) { cur()[k] = String(ref || '').replace(/^blob:/, ''); touchP(); } }); };
  MD.acts['ba-clear'] = function (b) { cur()[b.dataset.k] = ''; touchP(); };

  /* ---------- generator opisów (Claude przez serwer) ---------- */
  var VOICE = [
    'Piszesz opisy realizacji do portfolio pracowni MotywDesign (wnętrza i domy premium, Warszawa). Tekst ma brzmieć jak dobry artykuł z magazynu wnętrzarskiego w rodzaju „Label” albo „Weranda”: rzeczowo, architektonicznie, spokojnie. Opowiada pracownia, w pierwszej osobie liczby mnogiej („poprowadziliśmy”, „zostawiliśmy”, „zdecydowaliśmy się”).',
    'Bohaterem jest projekt: układ i proporcje, światło, materiały, stolarka, detal i to, jak łączą się ze sobą pomieszczenia. Mieszkańcy są tłem. Wspominasz o nich krótko i tylko wtedy, gdy wyjaśnia to decyzję projektową, np. „Domownicy dużo gotują, więc kuchnia dostała blat na całej długości ściany”. Nie opisujesz ich dnia, uczuć, marzeń ani charakteru.',
    'Każde zdanie niesie konkret: co zrobiliśmy, z czego, gdzie i po co. Detal nazywasz fachowo i dokładnie, tak jak architekt w rozmowie z redaktorem: fornir, lite drewno, frezowane fronty bez uchwytów, cofnięty cokół, ryflowanie, podcięcie z liniowym światłem, mikrocement, lastryko, spiek, trawertyn, przeszklenie w stalowej ramie, wnęka, zabudowa pod skos, oś widokowa, amfilada. To przykłady słownictwa, nie lista do odhaczenia: używasz tylko tego, co naprawdę jest w projekcie.',
    'Ton dojrzały, oszczędny i pewny. Zdania pełne, różnej długości, z czasownikami zamiast rzeczowników („przenieśliśmy”, nie „dokonaliśmy przeniesienia”). „Jest” i „ma” zamiast „stanowi” i „posiada”. Kolejna myśl wynika z poprzedniej treścią, bez łączników typu „Co więcej”, „Ponadto”, „Dodatkowo”. Akapit kończysz konkretem, nie podsumowaniem.',
    'Unikasz tonu bajki i poradnika: żadnych zdrobnień, zachwytów, zwracania się do czytelnika, metafor o duszy, sercu domu, ciepłym gnieździe ani magii. Nigdy: długich myślników (— ani –), wypunktowań, wykrzykników, pytań retorycznych, konstrukcji „nie X, ale Y” i „nie tylko…, ale też…”, wyliczanek po trzy przymiotniki, imiesłowowych ogonów na końcu zdania („podkreślając charakter”, „nadając wnętrzu lekkości”), zakończeń w rodzaju „Efektem jest wnętrze, które…”. Nie używasz słów: wyjątkowy, unikalny, luksusowy, ponadczasowy, harmonia, harmonijny, oaza, idealny, perfekcyjny, zachwyca, design, przytulny, magiczny, kluczowy, niezwykły, przestrzeń pełna, serce domu, nowoczesny charakter, ciepły klimat, nuta, dedykowany.',
    'Fakty: nie zmyślasz imion, zawodów, marek, wymiarów, cen ani liczby osób. Materiały, kolory i rozwiązania opisujesz tylko takie, które widać na załączonych zdjęciach albo podano w danych i notatkach. Gdy na zdjęciu nie da się rozpoznać materiału na pewno, piszesz ogólniej („jasne drewno”, „kamień o matowej powierzchni”), zamiast zgadywać gatunek. Polska typografia: cudzysłowy „…”, pisownia według zasad obowiązujących od 2026 roku.',
    'Przykład rytmu i rejestru (wymyślony, nie kopiuj z niego faktów ani zdań): „Mieszkanie w przedwojennej kamienicy miało wysokie sufity i układ poszatkowany przez kolejne przeróbki. Zaczęliśmy od korytarza. Skróciliśmy go, a w jego ścianie schowaliśmy szafy z frontami bez uchwytów, dzięki czemu salon odzyskał trzecie okno. Dębową jodełkę oczyściliśmy i olejowaliśmy na naturalny kolor, a w kuchni ten sam kamień przechodzi z blatu na ścianę, bez fugi na styku.”'
  ].join('\n');
  function aiCall(prompt, images, maxTokens) { return MD.api('ai', { body: { prompt: prompt, images: images || [], max_tokens: maxTokens || 2000 } }).then(function (j) { return j.text || ''; }); }
  function parseJson(t) { t = String(t || '').replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim(); var a = t.indexOf('{'), b = t.lastIndexOf('}'), c = t.indexOf('['), d = t.lastIndexOf(']'); if (c >= 0 && (a < 0 || c < a)) { a = c; b = d; } return JSON.parse(t.slice(a, b + 1)); }
  function noKey() { MD.modal({ title: 'Generator opisów nie jest jeszcze włączony', narrow: true, body: '<p>Żeby Claude mógł pisać opisy i podpisy, serwer potrzebuje klucza API Anthropic. Klucz wpisuje się raz, w pliku <span class="mono">data/ai.php</span> na hostingu. Instrukcja jest w README repozytorium, w rozdziale „Generator opisów”.</p><p class="muted small" style="margin-top:8px">Dopóki klucza nie ma, opisy i podpisy wpisujesz ręcznie, wszystko inne działa jak zwykle.</p>', footer: '<button class="btn primary" data-act="close">Rozumiem</button>' }); }
  function imgIds(p) { return (p.images || []).filter(function (x) { return !x.video; }).slice(0, 6).map(function (x) { return x.id; }); }
  MD.acts['ai-story'] = function () {
    if (!S.ai) { copyStoryPrompt(); return; }
    var pid = MD.cur.pid, p = S.D.projects[pid];
    MD.modal({ title: 'Opis projektu od Claude', sticky: true, body: '<p class="muted small" style="margin-bottom:10px">Claude obejrzy do 6 pierwszych zdjęć i dane projektu. Wynik zobaczysz tutaj, nic nie zmieni się w projekcie, dopóki nie klikniesz „Wstaw”.</p><div class="fld"><label class="lbl" for="ai-n">Notatki (opcjonalnie)</label><textarea id="ai-n" rows="4" placeholder="Co wiesz, a nie widać na zdjęciach: materiały, wymagania inwestora, ciekawe decyzje"></textarea></div><div id="ai-out" style="margin-top:14px"></div>', footer: '<button class="btn" data-act="close">Zamknij</button><button class="btn primary" id="ai-go">Wygeneruj</button>' });
    MD.$('#ai-go').onclick = function () {
      var btn = this, out = MD.$('#ai-out'); btn.disabled = true; btn.textContent = 'Piszę…'; out.innerHTML = '<p class="muted">Claude ogląda zdjęcia i pisze, to potrwa do minuty.</p>';
      var meta = ['Nazwa: ' + p.title, p.type && 'Typ: ' + p.type, p.status && 'Status: ' + p.status, p.scope && 'Zakres prac: ' + p.scope, p.location && 'Lokalizacja: ' + p.location, p.year && 'Rok: ' + p.year, p.area && 'Metraż: ' + p.area + ' m²', p.style && 'Styl: ' + p.style, p.motif && 'Motyw: ' + p.motif].filter(Boolean).join('\n');
      var caps = (p.images || []).filter(function (x) { return x.caption; }).map(function (x) { return '- ' + x.caption; }).join('\n');
      var notes = MD.$('#ai-n').value.trim();
      var prompt = VOICE + '\n\nDane projektu:\n' + meta + (caps ? '\n\nPodpisy zdjęć:\n' + caps : '') + (notes ? '\n\nNotatki pracowni:\n' + notes : '') + '\n\nZadanie: napisz dwa teksty. „lead”: jedno zdanie o projekcie, do 160 znaków, bez kropki wypunktowań. „story”: 3 do 4 akapitów (razem 1200 do 1800 znaków), akapity rozdzielone pustym wierszem. Odpowiedz wyłącznie obiektem JSON w postaci {"lead":"…","story":"…"}, bez komentarza i bez bloku kodu.';
      aiCall(prompt, imgIds(p), 2500).then(function (t) {
        var j = parseJson(t); btn.disabled = false; btn.textContent = 'Wygeneruj jeszcze raz';
        out.innerHTML = '<div class="fld"><label class="lbl" for="ai-l">Zdanie o projekcie</label><textarea id="ai-l" rows="2">' + esc(j.lead || '') + '</textarea></div><div class="fld" style="margin-top:12px"><label class="lbl" for="ai-s">Opowieść</label><textarea id="ai-s" rows="10">' + esc(j.story || '') + '</textarea></div><div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn accent" id="ai-ins">Wstaw do projektu</button></div><p class="small muted" style="margin-top:8px">Przeczytaj i popraw, zanim opublikujesz. Claude nie zna klientów, więc sprawdź fakty.</p>';
        MD.$('#ai-ins').onclick = function () { var q = S.D.projects[pid]; if (!q) return; var old = { lead: q.lead, story: q.story }; q.lead = MD.$('#ai-l').value.trim(); q.story = MD.$('#ai-s').value.trim(); MD.touch('projects/' + pid); MD.closeLayer(); if (MD.cur.pid === pid) MD.rerender(); MD.toast('Wstawiono opis.', { undo: function () { var z = S.D.projects[pid]; if (!z) return; z.lead = old.lead; z.story = old.story; MD.touch('projects/' + pid); if (MD.cur.pid === pid) MD.rerender(); } }); };
      }).catch(function (e) { btn.disabled = false; btn.textContent = 'Spróbuj jeszcze raz'; out.innerHTML = '<p class="err-t">' + esc(e.status === 501 ? 'Generator nie ma jeszcze klucza API.' : (e.message || 'Nie udało się.')) + '</p>'; });
    };
  };
  /* bez klucza API: kopiuje gotową prośbę, którą wklejasz w rozmowie z Claude (ten opisuje zdjęcia w panelu przez przeglądarkę) */
  function copyCapsPrompt() {
    var pid = MD.cur.pid, p = S.D.projects[pid] || {}, empty = (p.images || []).filter(function (x) { return !x.video && !String(x.caption || '').trim(); }).length;
    var txt = 'Uzupełnij podpisy zdjęć w panelu motywdesign.pl/panel w projekcie „' + (p.title || pid) + '” (adres: #/projekt/' + pid + '). ' + (empty ? 'Bez podpisu jest ' + empty + ' ' + MD.plural(empty, 'zdjęcie', 'zdjęcia', 'zdjęć') + '. ' : 'Wszystkie zdjęcia mają już podpisy, sprawdź je i popraw tylko to, co błędne. ') + 'Obejrzyj każde zdjęcie i wpisz krótką nazwę pomieszczenia w stylu istniejących podpisów (np. „Salon z kominkiem”, „Kuchnia z wyspą”). Istniejących podpisów nie zmieniaj. Zapisz do wersji roboczej i nie publikuj.';
    copyPrompt(txt, 'podpisy');
  }
  function copyPrompt(txt, co) {
    function manual() { MD.modal({ title: 'Prośba dla Claude', narrow: true, body: '<p class="muted small" style="margin-bottom:8px">Skopiuj ten tekst i wklej go w rozmowie z Claude.</p><textarea readonly rows="9" style="width:100%" onfocus="this.select()">' + esc(txt) + '</textarea>', footer: '<button class="btn" data-act="close">Zamknij</button>' }); }
    try { navigator.clipboard.writeText(txt).then(function () { MD.toast('Skopiowano prośbę. Wklej ją w rozmowie z Claude, a on wpisze ' + co + '.'); }, manual); } catch (e) { manual(); }
  }
  /* opis projektu bez klucza API: prośba z danymi projektu i wytycznymi stylu */
  function copyStoryPrompt() {
    var pid = MD.cur.pid, p = S.D.projects[pid] || {};
    var meta = ['Nazwa: ' + (p.title || pid), p.type && 'Typ: ' + p.type, p.status && 'Status: ' + p.status, p.scope && 'Zakres prac: ' + p.scope, p.location && 'Lokalizacja: ' + p.location, p.year && 'Rok: ' + p.year, p.area && 'Metraż: ' + p.area + ' m²', p.style && 'Styl: ' + p.style, p.motif && 'Motyw: ' + p.motif].filter(Boolean).join('\n');
    var caps = (p.images || []).filter(function (x) { return x.caption; }).map(function (x) { return '- ' + x.caption; }).join('\n');
    var txt = 'Napisz opis projektu „' + (p.title || pid) + '” w panelu motywdesign.pl/panel (adres: #/projekt/' + pid + '). Obejrzyj zdjęcia projektu (do 6 pierwszych) i wpisz dwa teksty w polach „Zdanie o projekcie” (jedno zdanie, do 160 znaków) i „Opowieść o projekcie” (3 do 4 akapitów, razem 1200 do 1800 znaków, akapity rozdzielone pustym wierszem). Zapisz do wersji roboczej i nie publikuj. Jeśli któreś pole już coś zawiera, najpierw pokaż mi propozycję i zapytaj, czy nadpisać.\n\nWytyczne stylu:\n' + VOICE + '\n\nDane projektu:\n' + meta + (caps ? '\n\nPodpisy zdjęć:\n' + caps : '');
    copyPrompt(txt, 'opis');
  }
  MD.acts['ai-caps'] = function () {
    if (!S.ai) { copyCapsPrompt(); return; }
    var pid = MD.cur.pid, p = S.D.projects[pid], idx = []; p.images.forEach(function (x, i) { if (!x.video) idx.push(i); });
    var res = {}, stop = false;
    MD.modal({ title: 'Podpisy zdjęć od Claude', sticky: true, body: '<p class="muted small" style="margin-bottom:10px">Claude ogląda zdjęcia i proponuje krótkie podpisy: nazwa pomieszczenia, czasem pora dnia. Zaznacz, które wstawić.</p><div id="cp-body"><p class="muted" id="cp-st">Zaczynam…</p></div>', footer: '<button class="btn" data-act="close">Zamknij</button><button class="btn accent" id="cp-ins" disabled>Wstaw zaznaczone</button>' });
    function draw() {
      MD.$('#cp-body').innerHTML = '<p class="muted small" id="cp-st"></p><div>' + idx.map(function (i) { var im = p.images[i], r = res[i]; return '<label class="hist" style="gap:12px;cursor:pointer"><input type="checkbox" data-ci="' + i + '"' + (r ? ' checked' : ' disabled') + ' style="width:18px;height:18px;flex:none"><img src="' + MD.imgUrl(im.th || im.id) + '" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:8px;flex:none"><span style="flex:1;min-width:0"><span class="small muted" style="display:block">' + esc(im.caption || 'bez podpisu') + '</span><b>' + esc(r || '…') + '</b></span></label>'; }).join('') + '</div>';
      MD.$('#cp-ins').disabled = !Object.keys(res).length;
    }
    draw();
    var batches = []; for (var k = 0; k < idx.length; k += 6) batches.push(idx.slice(k, k + 6));
    batches.reduce(function (pr, B) {
      return pr.then(function () {
        if (stop) return; var st = MD.$('#cp-st'); if (st) st.textContent = 'Opisuję zdjęcia ' + (B[0] + 1) + ' do ' + (B[B.length - 1] + 1) + '…';
        var prompt = 'Jesteś redaktorem portfolio pracowni architektury wnętrz MotywDesign. Do załączonych zdjęć (kolejność jak podano) napisz krótkie podpisy po polsku: nazwa pomieszczenia lub detalu, czasem pora dnia lub widok, do 6 słów, bez kropki, bez długich myślników, bez zachwytów. Projekt: ' + (p.title || '') + (p.type ? ', ' + p.type : '') + '. Odpowiedz wyłącznie tablicą JSON z ' + B.length + ' napisami, np. ["Salon i jadalnia", "Kuchnia"].';
        return aiCall(prompt, B.map(function (i) { return p.images[i].id; }), 800).then(function (t) { var a = parseJson(t); B.forEach(function (i, n) { if (a[n]) res[i] = String(a[n]).trim(); }); draw(); });
      });
    }, Promise.resolve()).then(function () { var st = MD.$('#cp-st'); if (st) st.textContent = 'Gotowe. Zaznacz, które podpisy wstawić.'; }).catch(function (e) { var st = MD.$('#cp-st'); if (st) { st.className = 'err-t'; st.textContent = e.status === 501 ? 'Generator nie ma jeszcze klucza API.' : (e.message || 'Nie udało się.'); } });
    MD.$('#cp-ins').onclick = function () {
      var q = S.D.projects[pid]; if (!q) return; var old = q.images.map(function (x) { return x.caption; }), n = 0;
      MD.$$('input[data-ci]:checked').forEach(function (c) { var i = +c.getAttribute('data-ci'); if (res[i] && q.images[i]) { q.images[i].caption = res[i]; n++; } });
      MD.touch('projects/' + pid); MD.closeLayer(); if (MD.cur.pid === pid) MD.rerender();
      MD.toast('Wstawiono ' + n + ' ' + MD.plural(n, 'podpis', 'podpisy', 'podpisów') + '.', { undo: function () { var z = S.D.projects[pid]; if (!z) return; z.images.forEach(function (x, i) { if (i < old.length) x.caption = old[i]; }); MD.touch('projects/' + pid); if (MD.cur.pid === pid) MD.rerender(); } });
    };
  };
})();
