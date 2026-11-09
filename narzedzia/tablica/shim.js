/* Zastępuje środowisko Claude (window.claude): baza dokumentów i zdjęcia trzymane na serwerze pracowni. */
(function () {
  'use strict';
  if (location.protocol === 'http:' && !/^(localhost|127\.)/.test(location.hostname)) { location.replace('https://' + location.host + location.pathname + location.search + location.hash); return; }
  var API = 'api/index.php';
  var csrf = '';
  var POLL_MS = 1500;

  function jfetch(a, body, extra) {
    var o = { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: {} };
    if (body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.headers['X-CSRF'] = csrf; o.body = JSON.stringify(body); }
    if (extra) { for (var k in extra) o[k] = extra[k]; }
    return fetch(API + '?a=' + a, o).then(function (r) {
      return r.json().catch(function () { return { error: 'Błąd serwera (' + r.status + ')' }; }).then(function (j) {
        if (!r.ok || j.error) { var e = new Error(j.error || 'Błąd'); e.code = j.code || ''; e.status = r.status; throw e; }
        return j;
      });
    });
  }

  /* ---- ekran logowania (konto Google) ---- */
  function loginScreen(info) {
    return new Promise(function (resolve) {
      var box = document.createElement('div');
      box.id = 'md-login';
      box.innerHTML =
        '<style>#md-login{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:#f5f5f7;color:#1d1d1f;font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Arial,sans-serif;padding:16px}' +
        '@media (prefers-color-scheme:dark){#md-login{background:#0b0b0c;color:#f2f2f4}#md-login .card{background:#1a1a1c!important}}' +
        '#md-login .card{width:100%;max-width:380px;background:#fff;border-radius:18px;padding:28px;box-shadow:0 8px 30px rgba(0,0,0,.12);display:flex;flex-direction:column;gap:14px}' +
        '#md-login h1{margin:0 0 2px;font-size:22px;letter-spacing:-.02em}#md-login p{margin:0;color:#6e6e73;font-size:14px}' +
        '#md-login .btn{min-height:44px;display:flex;align-items:center}#md-login .err{color:#d70015;min-height:20px;font-size:14px}</style>' +
        '<div class="card"><h1>Tablica MotywDesign</h1><p>Zaloguj się kontem Google, aby wejść na tablicę.</p>' +
        '<div class="btn" id="md-gbtn"></div><div class="err" role="alert"></div></div>';
      document.body.appendChild(box);
      var err = box.querySelector('.err');
      function onCred(resp) {
        err.textContent = '';
        jfetch('google', { credential: resp.credential }).then(function () { return jfetch('session'); })
          .then(function (s) { csrf = s.csrf; box.remove(); resolve(); })
          .catch(function (e) { err.textContent = e.message; });
      }
      var sc = document.createElement('script');
      sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
      sc.onload = function () {
        try {
          google.accounts.id.initialize({ client_id: info.gid, callback: onCred, auto_select: false, ux_mode: 'popup' });
          google.accounts.id.renderButton(document.getElementById('md-gbtn'), { theme: 'outline', size: 'large', text: 'signin_with', locale: 'pl', width: 324 });
        } catch (e) { err.textContent = 'Nie udało się wczytać logowania Google.'; }
      };
      sc.onerror = function () { err.textContent = 'Nie udało się połączyć z Google. Sprawdź internet lub blokadę skryptów.'; };
      document.head.appendChild(sc);
    });
  }

  /* ---- baza ---- */
  var queue = [], timer = null;
  function enqueue(op) {
    return new Promise(function (resolve, reject) {
      queue.push({ op: op, resolve: resolve, reject: reject });
      if (!timer) timer = setTimeout(flush, 25);
    });
  }
  function flush() {
    timer = null;
    var items = queue.splice(0, 300);
    if (queue.length) timer = setTimeout(flush, 5);
    if (!items.length) return;
    jfetch('ops', { ops: items.map(function (i) { return i.op; }) }).then(function (j) {
      items.forEach(function (it, n) {
        var r = j.res[n] || {};
        if (r.error) { var e = new Error(r.error); e.code = r.code || ''; it.reject(e); } else it.resolve(r);
      });
    }).catch(function (e) { items.forEach(function (it) { it.reject(e); }); });
  }

  var subs = {};      // id -> sub
  var subSeq = 0;
  var pollTimer = null, polling = false;

  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function snapOf(id, data) { return { id: id, exists: true, data: function () { return data; } }; }

  function notify(sub, changes) {
    var docs = Object.keys(sub.map).map(function (k) { return snapOf(k, sub.map[k].data); });
    var snap = { docs: docs, size: docs.length, empty: !docs.length,
      docChanges: function () { return changes; },
      forEach: function (fn) { docs.forEach(fn); } };
    try { sub.cb(snap); } catch (e) { if (window.console) console.error(e); }
  }
  function applyDocs(sub, docs, initial) {
    var changes = [];
    docs.forEach(function (d) {
      var cur = sub.map[d.id];
      if (d.seq > sub.since) sub.since = d.seq;
      if (d.del) {
        if (cur) { delete sub.map[d.id]; changes.push({ type: 'removed', doc: snapOf(d.id, cur.data) }); }
        return;
      }
      if (cur && same(cur.data, d.data)) { cur.seq = d.seq; return; }
      sub.map[d.id] = { data: d.data, seq: d.seq };
      changes.push({ type: cur ? 'modified' : 'added', doc: snapOf(d.id, d.data) });
    });
    if (initial || changes.length) notify(sub, changes);
  }
  function pollNow() {
    if (polling) return;
    var ids = Object.keys(subs);
    if (!ids.length) return;
    polling = true;
    var list = ids.map(function (k) { return { path: subs[k].path, since: subs[k].since }; });
    jfetch('poll', { subs: list }).then(function (j) {
      ids.forEach(function (k, n) {
        var sub = subs[k], r = j.subs[n];
        if (!sub || !r || r.error) return;
        applyDocs(sub, r.docs, !sub.ready);
        sub.ready = true;
        if (r.more) setTimeout(pollNow, 20);
      });
    }).catch(function (e) {
      ids.forEach(function (k) { if (subs[k] && subs[k].err) { try { subs[k].err(e); } catch (x) {} } });
    }).then(function () { polling = false; });
  }
  function ensurePolling() {
    if (pollTimer) return;
    pollTimer = setInterval(function () { if (!document.hidden) pollNow(); }, POLL_MS);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) pollNow(); });
  }
  function echo(path, data, removed) {
    var i = path.lastIndexOf('/'), parent = path.slice(0, i), id = path.slice(i + 1);
    Object.keys(subs).forEach(function (k) {
      var sub = subs[k];
      if (sub.path !== parent || !sub.ready) return;
      var cur = sub.map[id];
      if (removed) { if (cur) { delete sub.map[id]; notify(sub, [{ type: 'removed', doc: snapOf(id, cur.data) }]); } return; }
      if (cur && same(cur.data, data)) return;
      sub.map[id] = { data: data, seq: cur ? cur.seq : 0 };
      notify(sub, [{ type: cur ? 'modified' : 'added', doc: snapOf(id, data) }]);
    });
  }

  function docRef(path) {
    return {
      path: path, id: path.slice(path.lastIndexOf('/') + 1),
      get: function () {
        return enqueue({ op: 'get', path: path }).then(function (r) {
          var id = path.slice(path.lastIndexOf('/') + 1);
          return { id: id, exists: !!r.exists, data: function () { return r.exists ? r.data : undefined; } };
        });
      },
      set: function (data) { return enqueue({ op: 'set', path: path, data: data }).then(function (r) { echo(path, data, false); return r; }); },
      update: function (data) {
        return enqueue({ op: 'update', path: path, data: data }).then(function (r) { return r; });
      },
      delete: function () { return enqueue({ op: 'delete', path: path }).then(function (r) { echo(path, null, true); return r; }); }
    };
  }
  function colRef(path) {
    return {
      path: path,
      doc: function (id) { return docRef(path + '/' + id); },
      get: function () {
        return jfetch('poll', { subs: [{ path: path, since: 0 }] }).then(function (j) {
          var r = j.subs[0] || { docs: [] };
          var docs = r.docs.filter(function (d) { return !d.del; }).map(function (d) { return snapOf(d.id, d.data); });
          return { docs: docs, size: docs.length, empty: !docs.length, forEach: function (fn) { docs.forEach(fn); } };
        });
      },
      onSnapshot: function (cb, err) {
        var id = ++subSeq;
        subs[id] = { path: path, since: 0, map: {}, cb: cb, err: err, ready: false };
        ensurePolling();
        pollNow();
        setTimeout(pollNow, 200);
        return function () { delete subs[id]; };
      }
    };
  }
  var dbApi = { doc: docRef, collection: colRef };

  var assetsApi = {
    upload: function (blob) {
      var fd = new FormData();
      fd.append('file', blob, blob.name || 'plik');
      return fetch(API + '?a=upload', { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF': csrf }, body: fd })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.error) { var e = new Error(j.error || 'Błąd wgrywania'); e.code = j.code || ''; throw e; } return j; }); });
    }
  };

  var ready;
  window.claude = {
    use: function (name) {
      return ready.then(function () {
        if (name === 'db') return dbApi;
        if (name === 'assets') return assetsApi;
        return null;   // room, user, downloads: aplikacja ma własne zastępstwa
      });
    }
  };

  ready = jfetch('session').then(function (s) {
    csrf = s.csrf;
    return s.auth ? null : loginScreen(s);
  });

  /* aplikację uruchamiamy dopiero po zalogowaniu */
  ready.then(function () {
    var base = document.getElementById('app-script').getAttribute('data-src');
    var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = './assets/app-BVf0tWrA.css'; document.head.appendChild(l);
    var l2 = document.createElement('link'); l2.rel = 'stylesheet'; l2.href = './assets/app-CUp9k7C4.css'; document.head.appendChild(l2);
    var s = document.createElement('script'); s.type = 'module'; s.src = base; document.body.appendChild(s);
  });
})();
