/* Łącznik strony z panelem: udaje bazę, wgrywanie plików i konto właściciela, a dane bierze z /api/. */
(function () {
  'use strict';
  var API = '/api/';
  var st = { auth: false, csrf: '', setup: false };
  var cache = null, loading = null, subs = { projects: [], site: [], textEdits: [] };
  var sessionP = null;

  function jf(url, opt) {
    opt = opt || {}; opt.credentials = 'same-origin';
    return fetch(url, opt).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j && j.error || ('HTTP ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function session() {
    if (!sessionP) sessionP = jf(API + '?a=session&t=' + Date.now()).then(function (s) { st = s; return s; }).catch(function () { return st; });
    return sessionP;
  }
  function load() {
    if (!loading) loading = jf(API + '?a=data&t=' + Date.now()).then(function (d) {
      cache = { projects: {}, site: d.site || null, textEdits: {} };
      (d.projects || []).forEach(function (p) { cache.projects[p.id] = p; });
      (d.textEdits || []).forEach(function (p) { cache.textEdits[p.id] = p; });
      window.__IMGX = d.imgx || {};
      return cache;
    });
    return loading;
  }
  function snapDoc(id, data) { return { id: id, exists: data != null, data: function () { return clone(data); } }; }
  function colSnap(name) {
    var ids = Object.keys(cache[name] || {});
    return { docs: ids.map(function (id) { var d = clone(cache[name][id]); delete d.id; return snapDoc(id, d); }), size: ids.length, empty: !ids.length };
  }
  function notify(key) {
    (subs[key] || []).slice().forEach(function (fn) { try { fn(); } catch (e) {} });
    if (key === 'site') (subs['site'] || []);
  }
  function save(op, path, data) {
    return session().then(function () {
      return jf(API + '?a=save', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF': st.csrf }, body: JSON.stringify({ op: op, path: path, data: data }) });
    });
  }
  function apply(op, col, id, data) {
    if (col === 'site') { cache.site = op === 'delete' ? null : (op === 'update' ? Object.assign({}, cache.site || {}, data) : data); return; }
    var cur = cache[col][id];
    if (op === 'delete') delete cache[col][id];
    else if (op === 'update') cache[col][id] = Object.assign({}, cur || {}, data);
    else cache[col][id] = data;
  }
  function parsePath(p) {
    var m = String(p).split('/');
    return m[0] === 'site' ? { col: 'site', id: 'content' } : { col: m[0], id: m[1] };
  }
  function docRef(path) {
    var pp = parsePath(path), key = pp.col === 'site' ? 'site' : pp.col;
    return {
      id: pp.id,
      get: function () { return load().then(function () { return snapDoc(pp.id, pp.col === 'site' ? clone(cache.site) : clone(cache[pp.col][pp.id])); }); },
      onSnapshot: function (cb, err) {
        var active = true;
        function fire() { if (active && cache) cb(snapDoc(pp.id, pp.col === 'site' ? clone(cache.site) : clone(cache[pp.col][pp.id]))); }
        subs[key].push(fire);
        load().then(fire).catch(function (e) { if (active && err) err(e); });
        return function () { active = false; subs[key] = subs[key].filter(function (f) { return f !== fire; }); };
      },
      set: function (data) { return save('set', path, data).then(function () { apply('set', pp.col, pp.id, clone(data)); notify(key); }); },
      update: function (data) { return save('update', path, data).then(function () { apply('update', pp.col, pp.id, clone(data)); notify(key); }); },
      delete: function () { return save('delete', path).then(function () { apply('delete', pp.col, pp.id); notify(key); }); }
    };
  }
  var db = {
    collection: function (name) {
      return {
        doc: function (id) { return docRef(name + '/' + id); },
        get: function () { return load().then(function () { return colSnap(name); }); },
        onSnapshot: function (cb, err) {
          var active = true;
          function fire() { if (active && cache) cb(colSnap(name)); }
          subs[name].push(fire);
          load().then(fire).catch(function (e) { if (active && err) err(e); });
          return function () { active = false; subs[name] = subs[name].filter(function (f) { return f !== fire; }); };
        }
      };
    },
    doc: function (path) { return docRef(path); }
  };
  var assets = {
    upload: function (blob) {
      return session().then(function () {
        var fd = new FormData(); fd.append('file', blob, blob.name || 'plik');
        return jf(API + '?a=upload', { method: 'POST', headers: { 'X-CSRF': st.csrf }, body: fd });
      }).then(function (r) { window.__IMGX = window.__IMGX || {}; window.__IMGX[r.id] = r.url.split('.').pop(); return r; });
    },
    list: function () { return Promise.resolve({ assets: [], usage: 0 }); },
    delete: function () { return Promise.resolve(); }
  };
  var user = {
    canEdit: function () { return session().then(function (s) { return !!s.auth; }); },
    isOwner: function () { return st.auth; },
    id: function () { return Promise.resolve('owner'); },
    me: function () { return Promise.resolve({ id: 'owner' }); }
  };

  window.claude = {
    use: function (name) {
      if (name === 'db') return session().then(function () { return db; });
      if (name === 'user') return session().then(function () { return user; });
      if (name === 'assets') return session().then(function (s) { return s.auth ? assets : null; });
      return Promise.resolve(null);
    }
  };

  /* ---- logowanie ---- */
  function onPanel() { return /^\/panel(\/|$)/.test(location.pathname); }
  function css() {
    var s = document.createElement('style');
    s.textContent = '#md-login{position:fixed;inset:0;z-index:99999;background:#fff;color:#000;display:flex;align-items:center;justify-content:center;padding:24px;font:16px/1.5 Inter,system-ui,sans-serif}' +
      '#md-login form{width:100%;max-width:380px;display:flex;flex-direction:column;gap:14px}#md-login h1{font:600 28px/1.15 Inter,system-ui,sans-serif;margin:0 0 4px;letter-spacing:-.02em}' +
      '#md-login p{margin:0;color:#444;font-size:15px}#md-login label{font:12px/1 "Source Code Pro",monospace;text-transform:uppercase;letter-spacing:.08em;color:#444}' +
      '#md-login input{width:100%;box-sizing:border-box;padding:14px;border:1px solid #000;border-radius:0;font:16px Inter,system-ui,sans-serif;background:#fff;color:#000}' +
      '#md-login input:focus{outline:2px solid #A8845A;outline-offset:2px}#md-login button{padding:15px;border:0;border-radius:0;background:#000;color:#fff;font:600 16px Inter,system-ui,sans-serif;cursor:pointer}' +
      '#md-login button:disabled{opacity:.5}#md-login .er{color:#b00020;font-size:14px;min-height:20px}#md-login a{color:#000}' +
      '#md-out{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:9999;background:#000;color:#fff;border:0;padding:10px 14px;font:13px "Source Code Pro",monospace;cursor:pointer;border-radius:0;opacity:.85}';
    document.head.appendChild(s);
  }
  function login() {
    css();
    var d = document.createElement('div'); d.id = 'md-login';
    var setup = st.setup;
    d.innerHTML = '<form autocomplete="on" novalidate><h1>' + (setup ? 'Ustaw hasło do panelu' : 'Panel MotywDesign') + '</h1>' +
      '<p>' + (setup ? 'To pierwsze uruchomienie. Wpisz kod startowy od Claude i wymyśl hasło (co najmniej 12 znaków).' : 'Zaloguj się, żeby edytować stronę.') + '</p>' +
      (setup ? '<label for="mdc">Kod startowy</label><input id="mdc" type="text" autocomplete="off" autocapitalize="off">' : '') +
      '<label for="mdp">' + (setup ? 'Nowe hasło' : 'Hasło') + '</label><input id="mdp" type="password" autocomplete="' + (setup ? 'new-password' : 'current-password') + '">' +
      (setup ? '<label for="mdp2">Powtórz hasło</label><input id="mdp2" type="password" autocomplete="new-password">' : '') +
      '<div class="er" role="alert"></div><button type="submit">' + (setup ? 'Ustaw hasło' : 'Zaloguj') + '</button><p><a href="/">Wróć na stronę</a></p></form>';
    document.body.appendChild(d);
    document.documentElement.style.overflow = 'hidden';
    var f = d.querySelector('form'), er = d.querySelector('.er'), btn = d.querySelector('button');
    setTimeout(function () { var i = d.querySelector('input'); if (i) i.focus(); }, 50);
    f.addEventListener('submit', function (e) {
      e.preventDefault(); er.textContent = '';
      var pw = d.querySelector('#mdp').value, body;
      if (setup) {
        if (pw !== d.querySelector('#mdp2').value) { er.textContent = 'Hasła nie są takie same.'; return; }
        body = { code: d.querySelector('#mdc').value, password: pw };
      } else body = { password: pw };
      btn.disabled = true;
      jf(API + '?a=' + (setup ? 'setup' : 'login'), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF': st.csrf }, body: JSON.stringify(body) })
        .then(function () { location.reload(); })
        .catch(function (x) { btn.disabled = false; er.textContent = x.message || 'Nie udało się zalogować.'; });
    });
  }
  function logoutBtn() {
    css();
    var b = document.createElement('button'); b.id = 'md-out'; b.type = 'button'; b.textContent = 'Wyloguj';
    b.addEventListener('click', function () {
      jf(API + '?a=logout', { method: 'POST', headers: { 'X-CSRF': st.csrf } }).catch(function () {}).then(function () { location.href = '/'; });
    });
    document.body.appendChild(b);
  }
  function init() {
    session().then(function (s) {
      if (s.auth) logoutBtn();
      /* strona jest jedną aplikacją: wejście do panelu może nastąpić też przez kliknięcie linku, więc pilnujemy stale */
      setInterval(function () {
        var el = document.getElementById('md-login');
        if (onPanel() && !st.auth) { if (!el) login(); }
        else if (el) { el.remove(); document.documentElement.style.overflow = ''; }
        var ob = document.getElementById('md-out');
        if (ob) ob.style.display = onPanel() ? '' : 'none';
      }, 150);
      if (onPanel() && !s.auth) login();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
