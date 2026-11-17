/* Panel MotywDesign v2: rdzeń (stan, API, autozapis, publikacja, ramka, okna). */
(function () {
  'use strict';
  var MD = window.MD = { S: { D: null, P: null, imgx: {}, meta: {}, ai: false, csrf: '', email: '', state: 'saved', savedAt: 0, pub: 'idle', pubErr: '' }, views: {}, acts: {}, cur: {}, ext: {} };
  var S = MD.S, API = '/api/';

  /* ---------- narzędzia ---------- */
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  MD.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };
  var esc = MD.esc;
  MD.$ = function (s, r) { return (r || document).querySelector(s); };
  MD.$$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  MD.clone = function (o) { return o == null ? o : JSON.parse(JSON.stringify(o)); };
  /* postać porównawcza: puste pola i brak pola to to samo, klucze posortowane */
  function canon(v) {
    if (v === null || v === undefined) return 'null';
    if (typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return v.length ? '[' + v.map(canon).join(',') + ']' : 'null';
    var k = Object.keys(v).filter(function (x) { var y = v[x]; return !(y === '' || y === null || y === undefined || (typeof y === 'object' && !Object.keys(y).length)); }).sort();
    return k.length ? '{' + k.map(function (x) { return JSON.stringify(x) + ':' + canon(v[x]); }).join(',') + '}' : 'null';
  }
  MD.canon = canon;
  MD.slug = function (s) {
    var m = { 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };
    return String(s || '').toLowerCase().replace(/[ąćęłńóśźż]/g, function (c) { return m[c]; }).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/, '');
  };
  MD.hhmm = function (t) { var d = new Date(t); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
  MD.dt = function (sec) { var d = new Date(sec * 1000), p = function (n) { return ('0' + n).slice(-2); }; return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ', ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  MD.getP = function (o, path) { var p = String(path).split('.'); for (var i = 0; i < p.length; i++) { if (o == null) return undefined; o = o[p[i]]; } return o; };
  MD.setP = function (o, path, v) {
    var p = String(path).split('.');
    for (var i = 0; i < p.length - 1; i++) { var k = p[i]; if (o[k] == null || typeof o[k] !== 'object') o[k] = /^\d+$/.test(p[i + 1]) ? [] : {}; o = o[k]; }
    var last = p[p.length - 1];
    if (v === undefined) { if (Array.isArray(o)) o.splice(+last, 1); else delete o[last]; } else o[last] = v;
  };
  MD.imgUrl = function (ref, video) {
    ref = String(ref || ''); if (ref.indexOf('vid:') === 0) { ref = ref.slice(4); video = true; } else if (ref.indexOf('blob:') === 0) ref = ref.slice(5);
    if (!ref) return '';
    return '/img/' + ref + '.' + (S.imgx[ref] || (video ? 'mp4' : 'webp'));
  };
  MD.isVideoRef = function (ref) { return String(ref || '').indexOf('vid:') === 0; };
  MD.projects = function () {
    var a = []; var P = S.D.projects; Object.keys(P).forEach(function (id) { var d = P[id]; if (d && typeof d === 'object') a.push(Object.assign({ id: id }, d)); });
    return a.sort(function (x, y) { return (x.order == null ? 1e9 : x.order) - (y.order == null ? 1e9 : y.order); });
  };
  /* miniatura okładki projektu */
  MD.cover = function (p, big) { var im = p && p.images && p.images[0]; if (!im) return ''; return big || !im.th ? (im.video ? '' : MD.imgUrl(im.id)) : MD.imgUrl(im.th); };
  /* znaczenie wartości pola zdjęcia: id projektu (okładka), blob:ID, vid:ID */
  MD.refInfo = function (ref) {
    ref = ref || ''; if (!ref) return null;
    if (ref.indexOf('vid:') === 0) return { url: MD.imgUrl(ref), video: true, label: 'Własne wideo' };
    if (ref.indexOf('blob:') === 0) return { url: MD.imgUrl(ref), label: 'Zdjęcie' + (MD.photoOwner(ref.slice(5)) ? ' z projektu: ' + MD.photoOwner(ref.slice(5)) : '') };
    var p = S.D.projects[ref]; if (!p) return { url: '', label: 'Projekt usunięty' };
    var im = p.images && p.images[0]; return { url: im ? (im.video ? '' : MD.imgUrl(im.th || im.id)) : '', label: 'Okładka: ' + (p.title || ref) };
  };
  MD.photoOwner = function (id) { var t = ''; MD.projects().some(function (p) { return (p.images || []).some(function (im) { if (im.id === id) { t = p.title || p.id; return true; } }); }); return t; };

  /* ---------- API ---------- */
  function api(action, opt) {
    opt = opt || {}; var init = { credentials: 'same-origin' };
    if (opt.body !== undefined) { init.method = 'POST'; init.headers = { 'Content-Type': 'application/json', 'X-CSRF': S.csrf }; init.body = JSON.stringify(opt.body); }
    if (opt.form) { init.method = 'POST'; init.headers = { 'X-CSRF': S.csrf }; init.body = opt.form; }
    if (opt.keepalive) init.keepalive = true;
    return fetch(API + '?a=' + action + (opt.q || '') + (init.method ? '' : '&t=' + Date.now()), init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error((j && j.error) || ('HTTP ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  MD.api = api;

  /* ---------- autozapis ---------- */
  var dirty = {}, saveT = null, inflight = false, retryMs = 0, LS = 'mdp.pending';
  function getDoc(path) {
    if (path === 'site/content') return S.D.site;
    if (path === 'redirects') return S.D.redirects;
    var m = path.split('/'); return S.D[m[0]] ? S.D[m[0]][m[1]] : undefined;
  }
  function buildOps(paths) { return paths.map(function (p) { var d = getDoc(p); return d === undefined ? { op: 'delete', path: p } : { op: 'set', path: p, data: d }; }); }
  function persist() {
    try { var k = Object.keys(dirty); if (!k.length) localStorage.removeItem(LS); else localStorage.setItem(LS, JSON.stringify({ at: Date.now(), ops: buildOps(k) })); } catch (e) {}
  }
  function sched(ms) { clearTimeout(saveT); saveT = setTimeout(function () { MD.flush(); }, ms); }
  MD.touch = function (path) { dirty[path] = 1; persist(); setState('dirty'); sched(1200); chromeSoon(); };
  MD.dirtyCount = function () { return Object.keys(dirty).length; };
  MD.flush = function (unloading) {
    clearTimeout(saveT);
    var paths = Object.keys(dirty);
    if (inflight || !paths.length) return Promise.resolve();
    var snap = {}; paths.forEach(function (p) { snap[p] = canon(getDoc(p)) + (getDoc(p) === undefined ? 'U' : ''); });
    var ops = buildOps(paths), groups = [];
    for (var i = 0; i < ops.length; i += 40) groups.push(ops.slice(i, i + 40));
    inflight = true; setState('saving');
    return groups.reduce(function (pr, g) { return pr.then(function () { return api('dsave', { body: { ops: g }, keepalive: !!unloading }); }); }, Promise.resolve()).then(function () {
      inflight = false;
      paths.forEach(function (p) { if (canon(getDoc(p)) + (getDoc(p) === undefined ? 'U' : '') === snap[p]) delete dirty[p]; });
      persist(); S.savedAt = Date.now(); retryMs = 0;
      if (Object.keys(dirty).length) { setState('dirty'); sched(300); } else setState('saved');
      chromeSoon();
    }).catch(function (e) {
      inflight = false;
      if (e.status === 401 || e.status === 403) setState('auth');
      else if (e.status && e.status !== 429 && e.status !== 503 && e.status < 500) { S.errMsg = e.message; setState('error'); }
      else { retryMs = Math.min(30000, (retryMs || 4000) * 1.6); setState('offline'); sched(retryMs); }
    });
  };
  function setState(s) {
    S.state = s; var el = MD.$('#state'); if (!el) return;
    var t = { saved: 'Zapisano' + (S.savedAt ? ' ' + MD.hhmm(S.savedAt) : ''), dirty: 'Zapisuję…', saving: 'Zapisuję…', offline: 'Brak połączenia, kopia czeka w tej przeglądarce', auth: 'Sesja wygasła, kopia czeka w tej przeglądarce', error: 'Nie udało się zapisać' }[s];
    el.className = 'state' + (s === 'dirty' || s === 'saving' ? ' busy' : s === 'saved' ? '' : ' err');
    el.innerHTML = '<i></i><span>' + esc(t) + '</span>' + (s === 'auth' ? ' <button class="btn sm" data-act="reload">Zaloguj ponownie</button>' : s === 'offline' || s === 'error' ? ' <button class="btn sm" data-act="retry">Spróbuj teraz</button>' : '');
    if (s === 'error' && S.errMsg) el.title = S.errMsg;
  }
  MD.setState = setState;
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') MD.flush(true); });
  window.addEventListener('pagehide', function () { MD.flush(true); });
  window.addEventListener('online', function () { if (Object.keys(dirty).length) MD.flush(); });

  /* ---------- różnice względem opublikowanej wersji ---------- */
  var PF = { title: 'nazwa', accent: 'dopisek', type: 'typ', status: 'status', location: 'lokalizacja', year: 'rok', area: 'metraż', style: 'styl', scope: 'zakres', motif: 'motyw', color: 'kolor', lead: 'zdanie o projekcie', story: 'opowieść', images: 'zdjęcia', heroImg: 'tło nagłówka', before: 'zdjęcie przed', after: 'zdjęcie po', published: 'widoczność', featured: 'strona główna', wide: 'szerokość kafla', order: 'kolejność', scene: 'rysunek zastępczy', th: 'miniatury' };
  var SF = { hero: ['Strona główna: początek', '#/strona/glowna'], wall: ['Strona główna: teksty', '#/strona/glowna'], promises: ['Strona główna: obietnice', '#/strona/glowna'], home: ['Strona główna: teksty', '#/strona/glowna'], servicesList: ['Usługi', '#/strona/uslugi'], servicesPage: ['Usługi', '#/strona/uslugi'], studioPage: ['Studio', '#/strona/studio'], about: ['Ludzie i liczniki', '#/strona/ludzie'], process: ['Ludzie i liczniki: jak pracujemy', '#/strona/ludzie'], awards: ['Studio: osiągnięcia', '#/strona/studio'], partners: ['Partnerzy', '#/strona/partnerzy'], contact: ['Kontakt', '#/strona/kontakt'], opinions: ['Opinie', '#/strona/opinie'], hovers: ['Efekty słów', '#/zaawansowane/efekty'], modules: ['Dodatki sezonowe', '#/zaawansowane/dodatki'] };
  MD.PF = PF; MD.SF = SF;
  function projChanged(a, b) {
    var keys = {}; Object.keys(a || {}).concat(Object.keys(b || {})).forEach(function (k) { keys[k] = 1; });
    return Object.keys(keys).filter(function (k) { return canon(a && a[k]) !== canon(b && b[k]); });
  }
  MD.projChanged = function (id) {
    var P = S.P.projects, D = S.D.projects, from = id;
    Object.keys(S.D.redirects || {}).forEach(function (o) { if (S.D.redirects[o] === id && P[o] && !D[o]) from = o; });
    if (!P[from]) return ['new']; return projChanged(P[from], D[id]);
  };
  MD.diffs = function () {
    var out = [], P = S.P.projects, D = S.D.projects, R = S.D.redirects || {}, moved = {};
    Object.keys(R).forEach(function (o) { if (P[o] && !D[o] && D[R[o]]) moved[R[o]] = o; });
    Object.keys(D).forEach(function (id) {
      var from = moved[id] || id, a = P[from], b = D[id];
      if (!a) { out.push({ kind: 'Nowy', title: b.title || id, detail: 'Nowy projekt', route: '#/projekt/' + id }); return; }
      var ch = projChanged(a, b); if (moved[id]) ch.unshift('__url');
      if (ch.length) out.push({ kind: 'Zmieniony', title: b.title || id, detail: ch.map(function (k) { return k === '__url' ? 'adres /' + from + '/ na /' + id + '/' : (PF[k] || k); }).join(', '), route: '#/projekt/' + id });
    });
    Object.keys(P).forEach(function (id) {
      if (D[id] || R[id] && D[R[id]]) return;
      var t = S.D.trash && S.D.trash[id];
      out.push({ kind: t ? 'Do kosza' : 'Usunięty', title: P[id].title || id, detail: t ? 'Zniknie ze strony po publikacji, w koszu zostaje 30 dni' : 'Zniknie ze strony po publikacji', route: '#/projekty' });
    });
    var ds = S.D.site || {}, ps = S.P.site || {}, ks = {}, seen = {};
    Object.keys(ds).concat(Object.keys(ps)).forEach(function (k) { ks[k] = 1; });
    Object.keys(ks).forEach(function (k) {
      if (canon(ds[k]) !== canon(ps[k])) { var l = SF[k] || [k, '#/strona/glowna']; if (seen[l[0]]) { seen[l[0]].detail += ', ' + k; return; } var e = { kind: 'Zmieniony', title: l[0], detail: k, route: l[1] }; seen[l[0]] = e; out.push(e); }
    });
    out.forEach(function (e) { if (e.kind === 'Zmieniony' && SF[e.detail]) e.detail = 'Zmieniona treść'; else if (e.kind === 'Zmieniony' && e.route.indexOf('#/projekt/') !== 0) e.detail = 'Zmieniona treść'; });
    return out;
  };

  /* ---------- publikacja ---------- */
  MD.publish = function () {
    if (S.pub === 'busy') return;
    S.pub = 'busy'; S.pubErr = ''; renderStrip();
    return MD.flush().then(function () {
      if (MD.dirtyCount()) throw new Error('Nie udało się zapisać wersji roboczej. Spróbuj za chwilę.');
      return api('publish', { body: {} });
    }).then(function (r) {
      return reloadAll().then(function () { S.pub = 'idle'; renderStrip(); renderNav(); MD.toast('Opublikowano. Goście widzą nową wersję strony.'); return true; });
    }).catch(function (e) { S.pub = 'idle'; S.pubErr = e.message || 'Nie udało się opublikować.'; renderStrip(); return false; });
  };
  function reloadAll() {
    return api('draft').then(function (j) {
      S.D = { projects: j.draft.projects || {}, site: j.draft.site || {}, trash: j.draft.trash || {}, redirects: j.draft.redirects || {} };
      S.P = { projects: j.published.projects || {}, site: j.published.site || {} };
      ['projects', 'trash', 'redirects'].forEach(function (k) { if (Array.isArray(S.D[k])) S.D[k] = {}; });
      if (Array.isArray(S.D.site)) S.D.site = {}; if (Array.isArray(S.P.site)) S.P.site = {};
      S.P.projects = Array.isArray(S.P.projects) ? {} : S.P.projects;
      S.meta = j.meta || {}; S.imgx = Object.assign(S.imgx, j.imgx && !Array.isArray(j.imgx) ? j.imgx : {}); S.ai = !!j.ai;
    });
  }
  MD.reloadAll = reloadAll;

  /* ---------- ramka: nagłówek, pasek publikacji, nawigacja ---------- */
  var chromeT = null;
  function chromeSoon() { clearTimeout(chromeT); chromeT = setTimeout(function () { renderStrip(); renderNav(true); }, 350); }
  MD.chromeSoon = chromeSoon;
  function renderStrip() {
    var el = MD.$('#strip'); if (!el) return;
    var n = MD.diffs().length, when = S.meta && S.meta.publishedAt ? MD.dt(S.meta.publishedAt) : null;
    var h;
    if (S.pub === 'busy') h = '<div class="strip"><span class="dot"></span><div class="tx"><b>Publikuję…</b> <span>Możesz dalej pracować, strona odświeży się za chwilę.</span></div><div class="bar"><i></i></div></div>';
    else if (S.pubErr) h = '<div class="strip err"><span class="dot"></span><div class="tx"><b>Nie udało się opublikować.</b> <span>' + esc(S.pubErr) + '</span></div><button class="btn" data-act="publish">Spróbuj ponownie</button></div>';
    else if (!n) h = '<div class="strip clean"><span class="dot"></span><div class="tx"><b>Wszystko opublikowane.</b> <span>Strona pokazuje wersję z ' + (when ? esc(when) : 'ostatniej publikacji') + '.</span></div></div>';
    else h = '<div class="strip"><span class="dot"></span><div class="tx"><b>' + n + ' ' + plural(n, 'niepublikowana zmiana', 'niepublikowane zmiany', 'niepublikowanych zmian') + '.</b> <span>Wersja robocza zapisuje się sama. Goście i wyszukiwarki widzą wersję z ' + (when ? esc(when) : 'ostatniej publikacji') + '.</span></div><button class="btn" data-act="changes">Zobacz zmiany</button><button class="btn primary" data-act="publish">Opublikuj</button></div>';
    if (el.getAttribute('data-h') !== h) { el.setAttribute('data-h', h); el.innerHTML = h; }
  }
  MD.renderStrip = renderStrip;
  function plural(n, a, b, c) { var m10 = n % 10, m100 = n % 100; return n === 1 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) ? b : c; }
  MD.plural = plural;
  var NAVS = [
    ['g', 'Projekty'], ['#/projekty', 'Wszystkie projekty', 'count'],
    ['g', 'Treść strony'], ['#/strona/glowna', 'Strona główna'], ['#/strona/uslugi', 'Usługi'], ['#/strona/studio', 'Studio'], ['#/strona/ludzie', 'Ludzie i liczniki'], ['#/strona/partnerzy', 'Partnerzy'], ['#/strona/kontakt', 'Kontakt'], ['#/strona/opinie', 'Opinie', 'ops'],
    ['g', 'zaaw']
  ];
  function curHash() { return location.hash || '#/projekty'; }
  function navOn(h, cur) { if (h === '#/projekty') return /^#\/(projekty|projekt\/|$)/.test(cur) || cur === '' || cur === '#' || /^#panel/.test(cur) && !/^#panel-(home|services|studio|opinions|hovers|partners|about|contact|mods)$/.test(cur); return cur === h; }
  function renderNav() {
    var nav = MD.$('#nav'); if (!nav) return;
    var cur = curHash(), np = MD.projects().length, ops = (S.D.site && S.D.site.opinions || []).length, adv = /^#\/zaawansowane/.test(cur);
    var h = '';
    NAVS.forEach(function (n) {
      if (n[0] === 'g') { if (n[1] === 'zaaw') return; h += '<div class="grp">' + esc(n[1]) + '</div>'; return; }
      var c = n[2] === 'count' ? np : n[2] === 'ops' && ops ? ops : '';
      h += '<a href="' + n[0] + '"' + (navOn(n[0], cur) ? ' aria-current="page"' : '') + '><span class="sqm"></span><span>' + esc(n[1]) + '</span><span class="n">' + c + '</span></a>';
    });
    h += '<div class="grp"></div><button type="button" class="nl" data-act="adv-toggle" aria-expanded="' + (adv || MD.advOpen) + '"><span style="flex:1">Zaawansowane</span><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6e6e73" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" style="transform:rotate(' + (adv || MD.advOpen ? 90 : 0) + 'deg)"><path d="M4.5 2.5L8 6l-3.5 3.5"/></svg></button>';
    if (adv || MD.advOpen) {
      h += '<a class="sub" href="#/zaawansowane/efekty"' + (cur === '#/zaawansowane/efekty' || cur === '#/zaawansowane' ? ' aria-current="page"' : '') + '><span class="sqm"></span>Efekty słów i podglądy</a><a class="sub" href="#/zaawansowane/dodatki"' + (cur === '#/zaawansowane/dodatki' ? ' aria-current="page"' : '') + '><span class="sqm"></span>Dodatki sezonowe</a>';
    } else h += '<div class="hint">Efekty słów i podglądy, dodatki sezonowe</div>';
    if (nav.getAttribute('data-h') !== h) { nav.setAttribute('data-h', h); nav.innerHTML = h; }
    var tb = MD.$('#tabbar'); if (tb) {
      var inProj = navOn('#/projekty', cur), inCont = /^#\/strona\//.test(cur), inAdv = adv;
      tb.innerHTML = '<button data-act="tab-projects" aria-pressed="' + inProj + '"><span class="sqm"></span>Projekty</button><button data-act="tab-content" aria-pressed="' + inCont + '"><span class="sqm"></span>Treść strony</button><button data-act="tab-more" aria-pressed="' + inAdv + '"><span class="sqm"></span>Więcej</button>';
    }
  }
  MD.renderNav = renderNav;
  function shell() {
    MD.$('#app').innerHTML =
      '<header class="top"><a class="brand" href="#/projekty"><span class="sq"></span><b>motywdesign</b><span class="muted">Panel</span></a><span class="sp"></span>' +
      '<span class="state" id="state"></span>' +
      '<button class="btn" data-act="tools" aria-haspopup="menu">Narzędzia strony<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M2.5 4.5l3.5 3.5 3.5-3.5"/></svg></button>' +
      '<span class="muted hide-m">' + esc(S.email || '') + '</span><button class="btn ghost hide-m" data-act="logout">Wyloguj</button></header>' +
      '<div id="strip"></div><div id="recov"></div><div class="shell"><nav class="nav" id="nav" aria-label="Panel"></nav><main id="main" tabindex="-1"></main></div><div class="tabbar" id="tabbar"></div>';
    setState(S.state); renderStrip(); renderNav();
  }

  /* ---------- trasy ---------- */
  var TABMAP = { home: '#/strona/glowna', services: '#/strona/uslugi', studio: '#/strona/studio', opinions: '#/strona/opinie', hovers: '#/zaawansowane/efekty', partners: '#/strona/partnerzy', about: '#/strona/ludzie', contact: '#/strona/kontakt', mods: '#/zaawansowane/dodatki', projects: '#/projekty' };
  function parseRoute() {
    var h = location.hash || '';
    var lg = h.match(/^#panel(?:-(.+))?$/);
    if (lg) { var t = lg[1]; if (!t) return { v: 'list' }; if (TABMAP[t]) { location.hash = TABMAP[t]; return parseRoute(); } return { v: 'edit', id: decodeURIComponent(t) }; }
    var m = h.match(/^#\/projekt\/([^\/]+)$/); if (m) return { v: 'edit', id: decodeURIComponent(m[1]) };
    m = h.match(/^#\/strona\/([a-z]+)$/); if (m) return { v: 'sec', sec: m[1] };
    m = h.match(/^#\/zaawansowane(?:\/([a-z]+))?$/); if (m) return { v: 'adv', sec: m[1] || 'efekty' };
    return { v: 'list' };
  }
  MD.route = parseRoute;
  MD.go = function () {
    var r = parseRoute(), el = MD.$('#main'); if (!el) return;
    MD.cur = { route: r, pid: r.v === 'edit' ? r.id : null };
    var view = MD.views[r.v];
    el.innerHTML = view ? view(r) : '';
    if (MD.cur.mount) MD.cur.mount(el);
    renderNav(); window.scrollTo(0, 0);
  };
  MD.rerender = function () {
    var el = MD.$('#main'), r = MD.cur.route; if (!el || !r) return;
    var y = window.scrollY, ae = document.activeElement, id = ae && ae.id, ss = ae && ae.selectionStart;
    var keep = MD.cur; el.innerHTML = MD.views[r.v](r); MD.cur = Object.assign(MD.cur, { route: r, pid: keep.pid });
    if (MD.cur.mount) MD.cur.mount(el);
    window.scrollTo(0, y); if (id) { var n = document.getElementById(id); if (n) { n.focus(); try { if (ss != null) n.setSelectionRange(ss, ss); } catch (e) {} } }
  };
  window.addEventListener('hashchange', function () {
    if (MD.cur.quiet && MD.cur.quiet === location.hash) { MD.cur.quiet = null; renderNav(); return; }
    closeLayer(); MD.go();
  });

  /* ---------- wiązanie pól ---------- */
  document.addEventListener('input', function (e) {
    var t = e.target, b = t.getAttribute && t.getAttribute('data-b'); if (!b) return;
    var i = b.indexOf(':'), scope = b.slice(0, i), path = b.slice(i + 1), v = t.value, ty = t.getAttribute('data-t');
    if (ty === 'num') { v = String(v).replace(',', '.').trim(); v = v === '' ? undefined : (isFinite(+v) ? +v : v); }
    else if (ty === 'lines') v = String(v).split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    var root, tp;
    if (scope === 'p') { root = S.D.projects[MD.cur.pid]; tp = 'projects/' + MD.cur.pid; } else { root = S.D.site; tp = 'site/content'; }
    if (!root) return;
    if (scope === 's' && MD.seed) MD.seed(scope, path);
    MD.setP(root, path, v); MD.touch(tp);
    if (MD.cur.after) MD.cur.after(scope, path, t);
  });
  MD.set = function (scope, path, v) {
    var root = scope === 'p' ? S.D.projects[MD.cur.pid] : S.D.site;
    if (scope === 's' && MD.seed) MD.seed(scope, path);
    MD.setP(root, path, v); MD.touch(scope === 'p' ? 'projects/' + MD.cur.pid : 'site/content');
    if (MD.cur.after) MD.cur.after(scope, path);
  };
  MD.get = function (scope, path) { return MD.getP(scope === 'p' ? S.D.projects[MD.cur.pid] : S.D.site, path); };
  /* lista w treści strony: dodaj / usuń / przesuń */
  MD.listOp = function (scope, path, op, i, item) {
    var root = scope === 'p' ? S.D.projects[MD.cur.pid] : S.D.site, arr = MD.getP(root, path);
    if (!Array.isArray(arr)) { arr = []; MD.setP(root, path, arr); }
    if (op === 'add') arr.push(item || {}); else if (op === 'del') arr.splice(i, 1); else if (op === 'up' && i > 0) { var t = arr[i]; arr[i] = arr[i - 1]; arr[i - 1] = t; } else if (op === 'down' && i < arr.length - 1) { var u = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = u; }
    MD.touch(scope === 'p' ? 'projects/' + MD.cur.pid : 'site/content'); MD.rerender();
  };

  /* ---------- okna, menu, powiadomienia ---------- */
  var lastFocus = null, escFn = null;
  function closeLayer() { var r = MD.$('#layer-root'); if (r && r.firstChild) { r.innerHTML = ''; document.removeEventListener('keydown', escFn); if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} } } closeMenu(); }
  MD.closeLayer = closeLayer;
  MD.modal = function (o) {
    closeLayer(); lastFocus = document.activeElement;
    var r = MD.$('#layer-root');
    r.innerHTML = '<div class="layer" id="lay"><div class="dlg' + (o.narrow ? ' narrow' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '"><div class="dh"><h2>' + esc(o.title) + '</h2><button class="ib flat" data-act="close" aria-label="Zamknij"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8"/></svg></button></div><div class="db" id="dlg-body">' + o.body + '</div>' + (o.footer ? '<div class="df" id="dlg-foot">' + o.footer + '</div>' : '') + '</div></div>';
    var lay = MD.$('#lay'); lay.addEventListener('mousedown', function (e) { if (e.target === lay && !o.sticky) closeLayer(); });
    escFn = function (e) { if (e.key === 'Escape') closeLayer(); }; document.addEventListener('keydown', escFn);
    var f = MD.$('.dlg [autofocus], .dlg input, .dlg textarea, .dlg .btn', lay); if (f) f.focus();
    if (o.mount) o.mount(lay);
    return lay;
  };
  MD.confirm = function (o) {
    return new Promise(function (res) {
      MD.modal({ title: o.title, narrow: true, sticky: true, body: '<p>' + esc(o.text || '') + '</p>', footer: '<button class="btn" data-act="no">' + esc(o.cancel || 'Anuluj') + '</button><button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-act="yes">' + esc(o.ok || 'OK') + '</button>' });
      var lay = MD.$('#lay'); var fin = function (v) { return function () { closeLayer(); res(v); }; };
      MD.$('[data-act=no]', lay).onclick = fin(false); MD.$('[data-act=yes]', lay).onclick = fin(true); MD.$('[data-act=close]', lay).onclick = fin(false);
    });
  };
  var menuEl = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; document.removeEventListener('mousedown', menuOut, true); } }
  function menuOut(e) { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }
  MD.menu = function (anchor, html, right) {
    closeMenu(); var m = document.createElement('div'); m.className = 'menu'; m.setAttribute('role', 'menu'); m.innerHTML = html; document.body.appendChild(m); menuEl = m;
    var r = anchor.getBoundingClientRect(), w = m.offsetWidth;
    m.style.top = (window.scrollY + r.bottom + 4) + 'px'; m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, right ? r.right - w : r.left)) + 'px';
    setTimeout(function () { document.addEventListener('mousedown', menuOut, true); }, 0);
    var f = m.querySelector('button,a'); if (f) f.focus();
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); anchor.focus(); } });
    return m;
  };
  MD.closeMenu = closeMenu;
  MD.toast = function (msg, o) {
    o = o || {}; var box = MD.$('#toasts'), t = document.createElement('div'); t.className = 'toast' + (o.bad ? ' bad' : '');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (o.undo ? '<button type="button">Cofnij</button>' : '');
    if (o.undo) t.querySelector('button').onclick = function () { t.remove(); o.undo(); };
    box.appendChild(t); setTimeout(function () { t.remove(); }, o.undo ? 9000 : 4200);
  };

  /* ---------- wgrywanie plików ---------- */
  function prepImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !window.createImageBitmap) return Promise.resolve(file);
    return createImageBitmap(file).then(function (bmp) {
      var s = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
      if (s === 1 && file.size < 700000) return file;
      var c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, c.width, c.height);
      var webp = false; try { webp = c.toDataURL('image/webp', 0.1).indexOf('data:image/webp') === 0; } catch (e) {}
      var png = file.type === 'image/png', type = webp ? 'image/webp' : (png ? 'image/png' : 'image/jpeg');
      return new Promise(function (res) { c.toBlob(function (b) { res(b && b.size < file.size ? b : file); }, type, webp ? .84 : .86); });
    }).catch(function () { return file; });
  }
  function makeThumb(file) {
    if (!window.createImageBitmap) return Promise.resolve(null);
    return createImageBitmap(file).then(function (bmp) {
      var s = Math.min(1, 640 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, c.width, c.height);
      var webp = false; try { webp = c.toDataURL('image/webp', 0.1).indexOf('data:image/webp') === 0; } catch (e) {}
      return new Promise(function (res) { c.toBlob(function (b) { res(b); }, webp ? 'image/webp' : 'image/jpeg', .8); });
    }).catch(function () { return null; });
  }
  function rawUpload(blob, name) {
    var fd = new FormData(); fd.append('file', blob, name || blob.name || 'plik');
    return api('upload', { form: fd }).then(function (r) { S.imgx[r.id] = r.url.split('.').pop(); return r; });
  }
  /* wgrywa pliki po kolei; zwraca [{id, th, video, name}] */
  MD.upload = function (files, o) {
    o = o || {};
    files = [].slice.call(files || []).filter(function (f) { return /^image\//.test(f.type) || (o.video && /^video\//.test(f.type)); });
    var bad = files.filter(function (f) { return /^video\//.test(f.type) && f.type !== 'video/mp4'; });
    if (bad.length) { MD.toast('Plik ' + bad[0].name + ' nie jest MP4. WebM nie gra na iPhonie, wyeksportuj film jako MP4 (H.264).', { bad: true }); files = files.filter(function (f) { return bad.indexOf(f) < 0; }); }
    if (!files.length) return Promise.resolve([]);
    var bar = document.createElement('div'); bar.className = 'upbar'; document.body.appendChild(bar);
    var out = [], n = 0;
    return files.reduce(function (pr, f) {
      return pr.then(function () {
        bar.textContent = 'Wgrywam ' + (++n) + ' z ' + files.length + '…';
        var isV = /^video\//.test(f.type);
        if (isV && f.size > 20 * 1024 * 1024) { MD.toast('Film ' + f.name + ' ma ponad 20 MB. Zmniejsz go i wgraj jeszcze raz.', { bad: true }); return; }
        return (isV ? Promise.resolve(f) : prepImage(f)).then(function (b) {
          return rawUpload(b, f.name).then(function (r) {
            if (isV || o.noThumb) { out.push({ id: r.id, video: isV, name: f.name }); return; }
            return makeThumb(b).then(function (tb) { return tb ? rawUpload(tb, 'th.webp').then(function (t) { out.push({ id: r.id, th: t.id, name: f.name }); }, function () { out.push({ id: r.id, name: f.name }); }) : out.push({ id: r.id, name: f.name }); });
          });
        }).catch(function (e) { MD.toast('Nie udało się wgrać pliku ' + f.name + ': ' + (e.message || 'błąd'), { bad: true }); });
      });
    }, Promise.resolve()).then(function () { bar.remove(); return out; }, function (e) { bar.remove(); throw e; });
  };

  /* ---------- wybór zdjęcia (wybierak) ---------- */
  /* o: {title, current, auto, video, onPick(ref)} ; ref: '', 'blob:ID', 'vid:ID' albo id projektu (dla bieżącej wartości) */
  MD.pickPhoto = function (o) {
    var projs = MD.projects().filter(function (p) { return p.images && p.images.length; }), ti = 0, sel = o.current || '', q = '';
    var cur = o.current || '';
    if (cur) { var id0 = cur.replace(/^(blob|vid):/, ''); projs.some(function (p, i) { if ((p.images || []).some(function (im) { return im.id === id0; }) || p.id === cur) { ti = i; return true; } }); }
    function selId() { return String(sel).replace(/^(blob|vid):/, ''); }
    function grid() {
      var p = projs[ti]; if (!p) return '<p class="muted">Brak zdjęć w projektach. Wgraj własne.</p>';
      return '<div class="pgrid">' + p.images.map(function (im) {
        var ref = (im.video ? 'vid:' : 'blob:') + im.id, on = selId() === im.id;
        return '<button type="button" data-ref="' + esc(ref) + '" aria-pressed="' + on + '"><div class="im">' + (im.video ? '<video src="' + MD.imgUrl(im.id, true) + '#t=0.1" muted playsinline preload="metadata"></video>' : '<img loading="lazy" src="' + MD.imgUrl(im.th || im.id) + '" alt="">') + '</div><span class="cp">' + esc(im.caption || (im.video ? 'Wideo' : 'Zdjęcie')) + '</span>' + (on ? '<span class="ck"><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2.5 6.5l2.5 2.5L9.5 3.5"/></svg></span>' : '') + '</button>';
      }).join('') + '</div>';
    }
    function tabs() { return '<div class="seg" role="group" aria-label="Projekt" style="max-width:100%;overflow:auto">' + projs.map(function (p, i) { return '<button type="button" data-ti="' + i + '" aria-pressed="' + (i === ti) + '">' + esc(p.title || p.id) + '</button>'; }).join('') + '</div>'; }
    var lay = MD.modal({ title: o.title || 'Wybierz zdjęcie',
      body: '<div style="display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin-bottom:12px"><label class="search" style="flex:0 1 280px"><svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#6e6e73" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="5"/><path d="M11 11l3.5 3.5"/></svg><span class="vh">Szukaj projektu</span><input type="search" id="pk-q" placeholder="Szukaj projektu"></label><label class="btn" for="pk-up">Wgraj własne</label><input class="vh" type="file" id="pk-up" accept="image/*' + (o.video ? ',video/mp4' : '') + '">' + (o.auto ? '<button type="button" class="btn" data-pk="auto">Automatycznie</button>' : '') + '</div><div id="pk-tabs" style="margin-bottom:12px">' + tabs() + '</div><div id="pk-grid">' + grid() + '</div>',
      footer: '<span class="l" id="pk-l"></span><button class="btn" data-act="close">Anuluj</button><button class="btn primary" id="pk-ok">Użyj tego zdjęcia</button>' });
    function lbl() { MD.$('#pk-l', lay).textContent = sel && (MD.refInfo(sel) || {}).label ? 'Wybrane: ' + MD.refInfo(sel).label : 'Nic nie wybrano'; MD.$('#pk-ok', lay).disabled = !sel; }
    function redraw() { MD.$('#pk-grid', lay).innerHTML = grid(); MD.$('#pk-tabs', lay).innerHTML = tabs(); lbl(); }
    lbl();
    lay.addEventListener('click', function (e) {
      var b = e.target.closest('[data-ref]'); if (b) { sel = b.getAttribute('data-ref'); redraw(); return; }
      var t = e.target.closest('[data-ti]'); if (t) { ti = +t.getAttribute('data-ti'); redraw(); return; }
      if (e.target.closest('[data-pk=auto]')) { closeLayer(); o.onPick(''); return; }
      if (e.target.closest('#pk-ok') && sel) { closeLayer(); o.onPick(sel); }
    });
    MD.$('#pk-q', lay).addEventListener('input', function (e) {
      q = e.target.value.toLowerCase(); var i = projs.findIndex(function (p) { return (p.title || p.id).toLowerCase().indexOf(q) >= 0; }); if (i >= 0) { ti = i; redraw(); }
    });
    MD.$('#pk-up', lay).addEventListener('change', function (e) {
      MD.upload(e.target.files, { video: o.video, noThumb: true }).then(function (L) { if (L[0]) { closeLayer(); o.onPick((L[0].video ? 'vid:' : 'blob:') + L[0].id); } });
    });
  };

  /* ---------- globalne akcje ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-act]'); if (!b) return;
    var a = b.getAttribute('data-act');
    if (a === 'close') { closeLayer(); return; }
    var f = MD.acts[a]; if (f) { e.preventDefault(); f(b, e); }
  });
  MD.acts.reload = function () { location.reload(); };
  MD.acts.retry = function () { MD.flush(); };
  MD.acts.publish = function () { MD.publish(); };
  MD.acts.logout = function () { MD.flush().then(function () { return api('logout', { body: {} }); }).catch(function () {}).then(function () { try { localStorage.removeItem(LS); } catch (e) {} location.href = '/'; }); };
  MD.acts['adv-toggle'] = function () { MD.advOpen = !MD.advOpen; if (MD.advOpen && !/^#\/zaawansowane/.test(location.hash)) { location.hash = '#/zaawansowane/efekty'; } else renderNav(); };
  MD.acts['tab-projects'] = function () { location.hash = '#/projekty'; };
  MD.acts['tab-content'] = function () {
    MD.modal({ title: 'Treść strony', body: '<div class="sheetlist">' + NAVS.filter(function (n) { return n[0].charAt(0) === '#' && n[0].indexOf('#/strona/') === 0; }).map(function (n) { return '<a href="' + n[0] + '">' + esc(n[1]) + '</a>'; }).join('') + '</div>' });
  };
  MD.acts['tab-more'] = function () {
    MD.modal({ title: 'Więcej', body: '<div class="sheetlist"><a href="#/zaawansowane/efekty">Efekty słów i podglądy</a><a href="#/zaawansowane/dodatki">Dodatki sezonowe</a><button data-act="history">Historia wersji</button><a href="/" target="_blank" rel="noopener">Zobacz stronę</a><button data-act="logout">Wyloguj</button></div>' });
  };
  MD.acts.tools = function (b) {
    MD.menu(b, '<a href="/" target="_blank" rel="noopener">Zobacz stronę<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M4 2h6v6M10 2L3 9"/></svg></a><a href="/">Edytuj teksty na stronie</a><button data-act="history">Historia wersji</button><div class="nt">„Edytuj teksty na stronie” otwiera stronę z paskiem edycji, który widzisz po zalogowaniu. Zmiany tam trafiają na stronę od razu, bez szkicu.</div>', true);
  };
  MD.acts.changes = function () {
    var d = MD.diffs();
    MD.modal({ title: 'Co się zmieniło', body: '<p class="muted small" style="margin-bottom:8px">Od wersji z ' + esc(S.meta.publishedAt ? MD.dt(S.meta.publishedAt) : 'ostatniej publikacji') + '</p>' + (d.length ? d.map(function (x) { return '<div class="chg-row"><span class="pill chg">' + esc(x.kind) + '</span><div style="flex:1"><a href="' + esc(x.route) + '"><b>' + esc(x.title) + '</b></a><div class="small muted">' + esc(x.detail) + '</div></div></div>'; }).join('') : '<p class="muted">Nic się nie zmieniło.</p>'),
      footer: '<button class="btn danger" data-act="discard">Wróć do opublikowanej</button><span style="flex:1"></span><button class="btn" data-act="close">Zamknij</button><button class="btn primary" data-act="publish-close"' + (d.length ? '' : ' disabled') + '>Opublikuj ' + d.length + '</button>' });
  };
  MD.acts['publish-close'] = function () { closeLayer(); MD.publish(); };
  MD.acts.discard = function () {
    MD.confirm({ title: 'Wrócić do opublikowanej wersji?', text: 'Wszystkie niepublikowane zmiany znikną ze szkicu. Poprzedni szkic zostanie w historii wersji, więc możesz go przywrócić.', ok: 'Wróć do opublikowanej', danger: true }).then(function (ok) {
      if (!ok) return;
      MD.flush().then(function () { return api('discard', { body: {} }); }).then(reloadAll).then(function () { MD.go(); renderStrip(); MD.toast('Szkic wrócił do opublikowanej wersji.'); }).catch(function (e) { MD.toast(e.message || 'Nie udało się.', { bad: true }); });
    });
  };
  MD.acts.history = function () {
    closeMenu();
    MD.flush().then(function () { return api('history'); }).then(function (j) {
      var L = j.items || [];
      MD.modal({ title: 'Historia wersji', narrow: true, body: '<p class="muted small" style="margin-bottom:8px">Każda zmiana zapisuje się sama, a wersje robocze z ostatnich godzin da się przywrócić. Przywrócenie nie kasuje bieżącego szkicu, on też trafia do historii.</p>' + (L.length ? L.map(function (x) { return '<div class="hist"><div><b>' + MD.dt(x.at) + '</b><span class="small muted">' + (x.kind === 'pub' ? 'Wersja sprzed publikacji' : 'Wersja robocza, zapis automatyczny') + '</span></div><button class="btn sm" data-act="restore" data-id="' + esc(x.id) + '">Przywróć</button></div>'; }).join('') : '<p class="muted">Historia jest jeszcze pusta.</p>') });
    }).catch(function (e) { MD.toast(e.message || 'Nie udało się wczytać historii.', { bad: true }); });
  };
  MD.acts.restore = function (b) {
    var id = b.getAttribute('data-id');
    MD.confirm({ title: 'Przywrócić tę wersję do szkicu?', text: 'Bieżący szkic zostanie zapisany w historii. Strona dla gości się nie zmieni, dopóki nie klikniesz „Opublikuj”.', ok: 'Przywróć' }).then(function (ok) {
      if (!ok) return;
      MD.flush().then(function () { return api('restore', { body: { id: id } }); }).then(reloadAll).then(function () { MD.go(); renderStrip(); MD.toast('Przywrócono wersję do szkicu.'); }).catch(function (e) { MD.toast(e.message || 'Nie udało się.', { bad: true }); });
    });
  };

  /* ---------- start ---------- */
  MD.start = function () {
    MD.$('#app').innerHTML = '<div style="padding:48px 16px;text-align:center;color:#6e6e73">Wczytuję panel…</div>';
    return api('session').then(function (s) {
      S.csrf = s.csrf; S.email = s.email;
      if (!s.auth) { MD.$('#app').innerHTML = '<div style="padding:48px 16px;text-align:center;color:#6e6e73">Zaloguj się kontem Google, żeby wejść do panelu.</div>'; return; }
      return reloadAll().then(function () {
        var rec = null;
        try { var raw = localStorage.getItem(LS); if (raw) rec = JSON.parse(raw); } catch (e) {}
        var restored = 0;
        if (rec && rec.ops && rec.ops.length) {
          rec.ops.forEach(function (o) {
            var m = o.path.split('/');
            if (o.path === 'site/content') { if (o.op === 'set' && canon(S.D.site) !== canon(o.data)) { S.D.site = o.data; dirty[o.path] = 1; restored++; } }
            else if (o.path === 'redirects') { if (o.op === 'set') { S.D.redirects = o.data; dirty[o.path] = 1; } }
            else if (o.op === 'set') { if (canon(S.D[m[0]][m[1]]) !== canon(o.data)) { S.D[m[0]][m[1]] = o.data; dirty[o.path] = 1; restored++; } }
            else if (S.D[m[0]] && S.D[m[0]][m[1]] !== undefined) { delete S.D[m[0]][m[1]]; dirty[o.path] = 1; restored++; }
          });
        }
        shell();
        if (restored) {
          MD.$('#recov').innerHTML = '<div class="recov"><span>Przywrócono ' + restored + ' ' + plural(restored, 'niezapisaną zmianę', 'niezapisane zmiany', 'niezapisanych zmian') + ' z ' + esc(MD.hhmm(rec.at)) + '. Zapisuję je teraz.</span><button class="btn sm" data-act="recov-ok">OK</button></div>';
          persist(); setState('dirty'); sched(300);
        }
        MD.go(); chromeSoon();
      });
    }).catch(function (e) { MD.$('#app').innerHTML = '<div style="padding:48px 16px;text-align:center;color:#b00020">Nie udało się wczytać panelu: ' + esc(e.message || 'błąd') + '. <button class="btn" data-act="reload">Odśwież</button></div>'; });
  };
  MD.acts['recov-ok'] = function () { MD.$('#recov').innerHTML = ''; };

  /* skróty: / szuka, Alt+strzałki przesuwa (w liście) */
  document.addEventListener('keydown', function (e) {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !e.metaKey && !e.ctrlKey) { var s = MD.$('#q'); if (s) { e.preventDefault(); s.focus(); } }
  });
})();
