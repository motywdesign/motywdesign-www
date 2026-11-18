/* Panel MotywDesign v2: treść strony (strona główna, usługi, studio, ludzie, partnerzy, kontakt, opinie). */
(function () {
  'use strict';
  var MD = window.MD, S = MD.S, esc = MD.esc, ui = MD.ui, IC = MD.IC;
  var DEFS = {
    wall: { text: 'Projekt wnętrza to setki decyzji. Prowadzimy Cię przez każdą z nich tak, żebyś zawsze wiedział, co się dzieje i z czego to wynika.', muted: 'Nic Cię nie zaskoczy. Może poza efektem końcowym.' },
    promises: { items: [
      { title: 'Wiesz, na co się umawiamy.', text: 'Zakres, terminy i koszt projektu ustalamy na starcie. Od pierwszego spotkania wiesz, co dostaniesz.', project: '' },
      { title: 'Widzisz każdą decyzję.', text: 'Każde wnętrze oglądasz w wizualizacji, zanim cokolwiek zostanie kupione, i wiesz, dlaczego wygląda właśnie tak.', project: '' },
      { title: 'Prowadzimy do samego końca.', text: 'Jesteśmy z Tobą od pomiaru po odbiór, żeby po drodze nic się nie rozjechało.', project: '' }
    ] },
    modules: { snow: { mode: 'auto', from: '01.12', to: '06.01' }, valentine: { mode: 'auto', from: '07.02', to: '14.02' } }
  };
  MD.DEFS = DEFS;
  /* przed pierwszą edycją pola dopisuje domyślną treść i wypełnia luki w tablicach, żeby nie powstały puste miejsca */
  MD.seed = function (scope, path) {
    if (scope !== 's') return; var site = S.D.site, parts = String(path).split('.'), top = parts[0];
    if (DEFS[top] && site[top] == null) site[top] = MD.clone(DEFS[top]);
    var o = site;
    for (var i = 0; i < parts.length; i++) {
      var k = parts[i], last = i === parts.length - 1;
      if (Array.isArray(o) && /^\d+$/.test(k)) { var n = +k; while (o.length < n) o.push(last ? '' : {}); }
      if (last) break;
      if (o[k] == null) o[k] = /^\d+$/.test(parts[i + 1]) ? [] : {};
      o = o[k];
    }
  };
  function site() { return S.D.site; }
  function cols() { return '<div class="cols">' + Array.prototype.join.call(arguments, '') + '</div>'; }
  function card(t, lead, body, act, cls) { return '<div class="card' + (cls ? ' ' + cls : '') + '"><div class="ch"><h2>' + esc(t) + '</h2>' + (act || '') + '</div>' + (lead ? '<p class="lead-p">' + lead + '</p>' : '') + body + '</div>'; }
  function head(t, sub) { return '<div class="head"><h1>' + esc(t) + '</h1></div>' + (sub ? '<p class="sub-p">' + esc(sub) + '</p>' : '') + '<div style="margin-top:16px">'; }
  function pr(id) { var o = [['', 'Bez linku']]; MD.projects().forEach(function (p) { o.push([p.id, p.title || p.id]); }); return o; }

  /* ---------- Strona główna ---------- */
  function heroList() { var h = site().hero || {}; return (h.projects && h.projects.length) ? h.projects : (h.project ? [h.project] : []); }
  function setHeroList(L) { var h = site().hero = site().hero || {}; h.projects = L; h.project = L[0] || ''; MD.touch('site/content'); MD.rerender(); }
  function glowna() {
    var h = site().hero || {}, w = site().wall || DEFS.wall, items = (site().promises && site().promises.items) || DEFS.promises.items, hm = site().home || {}, L = heroList();
    var feat = MD.projects().filter(function (p) { return p.featured; });
    var shots = L.length ? '<div class="items cf">' + L.map(function (ref, i) { return '<div class="item"><div>' + ui.pick('Ujęcie ' + (i + 1), 's', 'hero.projects.' + i, { video: true, clear: 'Usuń' }) + '</div><div class="tools2"><button type="button" class="ib" data-act="hero-mv" data-i="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + ' aria-label="Wyżej">' + IC.up + '</button><button type="button" class="ib" data-act="hero-mv" data-i="' + i + '" data-d="1"' + (i === L.length - 1 ? ' disabled' : '') + ' aria-label="Niżej">' + IC.down + '</button><button type="button" class="ib" data-act="hero-del" data-i="' + i + '" aria-label="Usuń ujęcie">' + IC.trash + '</button></div></div>'; }).join('') + '</div>' : '<p class="muted">Brak ujęć. Strona pokaże okładkę pierwszego projektu.</p>';
    return head('Strona główna', 'Teksty i zdjęcia, które goście widzą jako pierwsze.') +
      cols(
        card('Pierwszy ekran', 'Teksty nad ujęciami na pierwszym ekranie strony.',
          '<div class="grid2">' + ui.field('Nadtytuł', 's', 'hero.kicker', { span: true, ph: 'Pracownia architektury i wnętrz · Warszawa' }) + ui.field('Hasło', 's', 'hero.title') + ui.field('Dopisek kursywą', 's', 'hero.accent', { hint: 'Jedno lub dwa słowa po haśle.' }) + ui.field('Opis', 's', 'hero.lead', { ta: true, rows: 2, span: true, hint: 'Do trzech linii.' }) +
          ui.select('Efekt przełączania', 's', 'hero.fx', [['mgla', 'Przenikanie (spokojne)'], ['pasy', 'Pasy (lamele)'], ['okno', 'Okno od środka']], { val: h.fx || 'mgla' }) + '</div>', '', 'wide'),
        card('Ujęcia na pierwszym ekranie', 'Przewijają się w tej kolejności: od pierwszego do ostatniego. Wideo i zdjęcia można mieszać.',
          shots + '<div style="margin-top:12px"><button type="button" class="btn" data-act="hero-add">' + IC.plus + 'Dodaj ujęcie</button></div>')) +
      cols(card('Trzy obietnice', 'Każda stoi przy okładce wybranego projektu.', '<div class="items c3">' + items.map(function (it, i) { return '<div class="item" style="grid-template-columns:1fr"><div class="grid2">' + ui.field('Obietnica ' + (i + 1), 's', 'promises.items.' + i + '.title', { val: it.title, span: true }) + ui.pick('Zdjęcie', 's', 'promises.items.' + i + '.project', { val: it.project, span: true }) + ui.field('Opis', 's', 'promises.items.' + i + '.text', { ta: true, span: true, val: it.text }) + '</div></div>'; }).join('') + '</div>', '', 'full')) +
      cols(
        card('Tekst ścienny', 'Duże zdanie po pierwszym ekranie. Dopowiedzenie pokazuje się w szarym tonie.', '<div class="grid2">' + ui.field('Zdanie główne', 's', 'wall.text', { ta: true, span: true, val: w.text }) + ui.field('Dopowiedzenie', 's', 'wall.muted', { span: true, val: w.muted }) + '</div>', '', 'narrow'),
        card('Pozostałe teksty strony głównej', null, '<div class="grid2">' + ui.field('Dlaczego my', 's', 'home.why', { ta: true, rows: 5 }) + ui.field('Co budujemy', 's', 'home.builds', { ta: true, rows: 5 }) + ui.field('„W czym możemy pomóc”: zdanie', 's', 'home.servicesText', { ta: true, span: true }) + ui.pick('„W czym możemy pomóc”: zdjęcie', 's', 'home.servicesProject', {}) + ui.field('Proces: zdanie wstępne', 's', 'home.procLead', { ta: true, rows: 2, w: 'l' }) + '</div>', '', 'wide'),
        card('Zaproszenie na dole strony', null, '<div class="grid2">' + ui.field('Nagłówek', 's', 'home.ctaHead') + ui.field('Przycisk', 's', 'home.ctaBtn') + ui.field('Dopisek pod przyciskiem', 's', 'home.ctaNote', { span: true }) + ui.pick('Zdjęcie przy zaproszeniu', 's', 'home.ctaImg', {}) + ui.pick('Zdjęcie w sekcji kontakt', 's', 'home.contactProject', {}) + '</div>', '', 'narrow')) +
      '<div class="cols">' + card('Wybrane projekty', 'Projekty na stronie głównej zaznaczasz w liście projektów przełącznikiem „Na głównej”. Bez zaznaczeń pokazują się trzy pierwsze.', feat.length ? '<div class="rows">' + feat.map(function (p) { return '<a class="prow" href="#/projekt/' + esc(p.id) + '" style="text-decoration:none;color:inherit"><span class="th" style="width:56px;height:42px;display:block">' + (MD.cover(p) ? '<img src="' + MD.cover(p) + '" alt="">' : '') + '</span><b style="font-weight:600">' + esc(p.title || p.id) + '</b></a>'; }).join('') + '</div>' : '<p class="muted">Nic nie jest zaznaczone. <a href="#/projekty">Przejdź do listy projektów</a>.</p>', '', 'full') + '</div></div>';
  }
  MD.acts['hero-add'] = function () { MD.pickPhoto({ title: 'Ujęcie na pierwszy ekran', video: true, onPick: function (ref) { if (!ref) return; var L = heroList().slice(); L.push(ref); setHeroList(L); } }); };
  MD.acts['hero-del'] = function (b) { var L = heroList().slice(); L.splice(+b.dataset.i, 1); setHeroList(L); };
  MD.acts['hero-mv'] = function (b) { var L = heroList().slice(), i = +b.dataset.i, j = i + (+b.dataset.d); if (j < 0 || j >= L.length) return; L.splice(j, 0, L.splice(i, 1)[0]); setHeroList(L); };

  /* ---------- Usługi ---------- */
  function uslugi() {
    return head('Usługi', 'Te same nazwy pokazują się na stronie głównej w „W czym możemy pomóc”.') +
      cols(card('Strona Usługi', null, '<div class="grid2">' + ui.field('Duże zdanie na górze', 's', 'servicesPage.lead', { ta: true, rows: 5, span: true }) + '</div>', '', 'narrow'),
        card('Lista usług', 'W polu „Zakres” oddzielaj pozycje przecinkami.', ui.list('s', 'servicesList', [['name', 'Nazwa'], ['project', 'Zdjęcie', { pick: true }], ['text', 'Opis', { ta: true, span: true, rows: 2 }], ['get', 'Zakres', { ta: true, span: true, rows: 2 }], ['hidden', 'Ukryj na stronie (zostaje w panelu)', { sw: true }]], { add: 'Dodaj usługę', empty: 'Brak usług.', cls: 'c2' }), '', 'wide')) + '</div>';
  }

  /* ---------- Studio ---------- */
  function studio() {
    var sp = site().studioPage || {}, vals = sp.values && sp.values.length ? sp.values : [{}, {}, {}];
    return head('Studio', 'Strona o pracowni: zdjęcia, teksty, wartości i osiągnięcia.') +
      cols(card('Początek strony', null, '<div class="grid2">' + ui.field('Duże zdanie', 's', 'studioPage.hero', { ta: true, span: true }) + '</div>', '', 'full')) +
      cols(card('Zdjęcia', 'Dwie pary zdjęć obok siebie. Puste pole: strona dobierze zdjęcie sama.', '<div class="grid2">' + [0, 1, 2, 3].map(function (i) { return ui.pick('Zdjęcie ' + (i + 1), 's', 'studioPage.imgs.' + i, {}); }).join('') + '</div>', '', 'full')) +
      cols(card('Teksty', null, '<div class="grid2">' + ui.field('Kim jesteśmy', 's', 'studioPage.origin', { ta: true, rows: 7 }) + ui.field('Po co jesteśmy', 's', 'studioPage.why', { ta: true, rows: 7 }) + ui.field('Zespół: zdanie', 's', 'studioPage.teamText', { ta: true, rows: 7 }) + ui.field('Jak pracujemy: zdanie nad tabelą', 's', 'studioPage.procText', { ta: true }) + '</div>', '', 'full')) +
      cols(card('Nasze wartości', 'Po najechaniu na wartość obok zmienia się zdjęcie.', '<div class="items c3">' + vals.map(function (v, i) { return '<div class="item" style="grid-template-columns:1fr"><div class="grid2">' + ui.field('Wartość ' + (i + 1), 's', 'studioPage.values.' + i + '.title', { val: v.title, span: true }) + ui.pick('Zdjęcie', 's', 'studioPage.values.' + i + '.project', { val: v.project, span: true }) + ui.field('Opis', 's', 'studioPage.values.' + i + '.text', { ta: true, span: true, val: v.text }) + '</div></div>'; }).join('') + '</div>', '', 'full')) +
      cols(card('Osiągnięcia', 'Tabela na stronie Studio: publikacje, wyróżnienia, ważne realizacje. Dopóki jest pusta, goście jej nie widzą.', '<div class="grid2">' + ui.field('Zdanie nad tabelą', 's', 'studioPage.awardsText', { ta: true, span: true }) + '</div><div style="margin-top:14px">' + ui.list('s', 'awards', [['name', 'Nazwa'], ['cat', 'Kategoria', { w: 'm' }], ['year', 'Rok', { w: 's', num: true }], ['url', 'Link (opcjonalnie)']], { add: 'Dodaj osiągnięcie', empty: 'Brak osiągnięć.', cls: 'c2' }) + '</div>', '', 'full')) + '</div>';
  }

  /* ---------- Ludzie i liczniki ---------- */
  function ludzie() {
    var a = site().about || {};
    return head('Ludzie i liczniki', 'Liczby, zespół i opis procesu pracy.') +
      cols(card('Liczniki', 'Liczba odlicza się przy przewijaniu strony. Puste pole oznacza, że licznik się nie pokaże, więc wpisuj tylko prawdziwe dane.', ui.list('s', 'about.stats', [['n', 'Liczba', { num: true, w: 's' }], ['unit', 'Jednostka', { w: 's' }], ['label', 'Podpis', { span: true }]], { add: 'Dodaj licznik', empty: 'Brak liczników.', cls: 'c4' }), '', 'full')) +
      cols(card('Ludzie', null, ui.list('s', 'about.people', [['photo', 'Zdjęcie', { pick: { empty: 'Brak zdjęcia', emptyLabel: 'Bez zdjęcia' }, span: true }], ['name', 'Imię i nazwisko'], ['role', 'Rola'], ['bio', 'Kilka zdań', { ta: true, span: true }]], { add: 'Dodaj osobę', empty: 'Brak osób.', cls: 'c2' }), '', 'full')) +
      cols(card('Jak pracujemy', null, '<div class="grid2">' + ui.field('Wstęp', 's', 'process.lead', { ta: true, span: true }) + '</div><div style="margin-top:14px">' + ui.list('s', 'process.steps', [['name', 'Nazwa etapu'], ['time', 'Czas'], ['text', 'Opis', { ta: true, span: true }], ['get', 'Rezultat', { span: true }], ['tm', 'Czas bazowy w tygodniach, np. 1-2', { w: 'l', hint: 'Do kalkulatora czasu. Pusty: etap ma stały czas z pola „Czas”.' }]], { add: 'Dodaj etap', empty: 'Brak etapów.', cls: 'c2' }) + '</div>', '', 'full')) + '</div>';
  }

  /* ---------- Partnerzy ---------- */
  function partnerzy() {
    return head('Partnerzy', 'Firmy, z którymi współpracujecie.') +
      cols(card('Logotypy', 'Logo pokazuje się w szarym kafelku, w odcieniach szarości, a po najechaniu w kolorze. Bez logo pokazuje się sama nazwa. Najlepiej wgrywać PNG lub SVG z przezroczystym tłem.', ui.list('s', 'partners', [['logo', 'Logo', { pick: { logo: true, empty: 'Brak logo', emptyLabel: 'Pokaże się sama nazwa' }, span: true }], ['name', 'Nazwa firmy'], ['url', 'Strona www (opcjonalnie)']], { add: 'Dodaj partnera', empty: 'Brak partnerów.', cls: 'c3' }), '', 'full')) + '</div>';
  }

  /* ---------- Kontakt ---------- */
  function kontakt() {
    return head('Kontakt', 'Dane kontaktowe, formularz i dane firmy do polityki prywatności.') +
      cols(card('Kontakt i formularz', null, '<div class="grid2">' + ui.field('Zaproszenie nad formularzem', 's', 'contact.title') + ui.field('Dopisek kursywą', 's', 'contact.accent') + ui.field('Opis', 's', 'contact.lead', { ta: true, span: true }) + ui.field('E-mail (tu trafiają zapytania)', 's', 'contact.email') + ui.field('Telefon: Paweł Deroń', 's', 'contact.phone') + ui.field('Telefon: Józef Bis', 's', 'contact.phone2') + ui.field('Adres pracowni', 's', 'contact.studioAddress') + ui.field('Instagram (adres)', 's', 'contact.instagram') + ui.field('YouTube (adres)', 's', 'contact.youtube') + ui.field('Facebook (adres)', 's', 'contact.facebook') + '</div>', '', 'wide'),
        card('Dane firmy do polityki prywatności', 'RODO wymaga, żeby polityka prywatności podawała administratora danych. Wpisz dane tak jak w CEIDG lub KRS.', '<div class="grid2">' + ui.field('Pełna nazwa firmy', 's', 'contact.firm', { span: true }) + ui.field('Adres siedziby', 's', 'contact.address', { span: true }) + ui.field('NIP', 's', 'contact.nip', { w: 'm' }) + '</div>', '', 'narrow')) + '</div>';
  }

  /* ---------- Opinie ---------- */
  function opinie() {
    return head('Opinie', 'Sekcja na stronie głównej, pod partnerami. Dopóki lista jest pusta, goście jej nie widzą.') +
      cols(card('Opinie klientów', 'Wpisuj tylko prawdziwe opinie, najlepiej za zgodą klienta.', ui.list('s', 'opinions', [['text', 'Treść opinii', { ta: true, span: true, rows: 4 }], ['name', 'Imię lub imiona'], ['place', 'Miejscowość'], ['project', 'Projekt (opcjonalnie)', { select: pr(), span: true }]], { add: 'Dodaj opinię', empty: 'Brak opinii.', cls: 'c2' }), '', 'full')) + '</div>';
  }

  var SEC = { glowna: glowna, uslugi: uslugi, studio: studio, ludzie: ludzie, partnerzy: partnerzy, kontakt: kontakt, opinie: opinie };
  MD.views.sec = function (r) { var f = SEC[r.sec]; MD.cur.after = null; MD.cur.mount = null; return f ? f() : '<div class="empty">Nie ma takiej sekcji. <a class="btn sm" href="#/projekty">Wróć</a></div>'; };
})();
