/* Panel MotywDesign v2: start. Logowanie obsługuje cms.js, tutaj tylko czekamy na sesję. */
(function () {
  'use strict';
  var MD = window.MD;
  function go() { MD.start(); }
  /* efekt przy zmianie efektu słowa: przerysuj formularz, żeby pokazać właściwe pola */
  document.addEventListener('input', function (e) {
    var b = e.target && e.target.getAttribute && e.target.getAttribute('data-b');
    if (b && /\.effect$/.test(b)) MD.rerender();
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
