<?php
declare(strict_types=1);
/* Strona startowa narzędzi: widoczna tylko po zalogowaniu kontem Google (ta sama sesja co Tablica). */
ini_set('display_errors', '0');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('mdtab');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
ini_set('session.use_strict_mode', '1');
session_start();
$auth = !empty($_SESSION['auth']) && (time() - (int)($_SESSION['t'] ?? 0) <= 28800);
$email = (string)($_SESSION['email'] ?? '');
if ($auth) { $_SESSION['t'] = time(); }
if (!$auth) {
?>
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>Narzędzia MotywDesign</title>
<style>
:root{--bg:#f5f5f7;--card:#fff;--ink:#1d1d1f;--mut:#6e6e73;--acc:#B4552D}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b0c;--card:#1a1a1c;--ink:#f2f2f4;--mut:#a1a1a6}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Arial,sans-serif;padding:16px}
.card{width:100%;max-width:380px;background:var(--card);border-radius:18px;padding:28px;box-shadow:0 8px 30px rgba(0,0,0,.12);display:flex;flex-direction:column;gap:14px}
h1{margin:0 0 2px;font-size:22px;letter-spacing:-.02em}p{margin:0;color:var(--mut);font-size:14px}.err{color:#d70015;min-height:20px;font-size:14px}#g{min-height:44px}
</style>
</head>
<body>
<div class="card"><h1>Narzędzia MotywDesign</h1><p>Zaloguj się kontem Google, aby wejść.</p><div id="g"></div><div class="err" role="alert" id="err"></div></div>
<script>
(function(){
if(location.protocol==='http:'&&!/^(localhost|127\.)/.test(location.hostname)){location.replace('https://'+location.host+location.pathname+location.search);return;}
var A='tablica/api/index.php',err=document.getElementById('err'),csrf='';
function jf(a,body){var o={credentials:'same-origin'};if(body){o.method='POST';o.headers={'Content-Type':'application/json','X-CSRF':csrf};o.body=JSON.stringify(body);}
 return fetch(A+'?a='+a,o).then(function(r){return r.json().then(function(j){if(!r.ok||j.error)throw new Error(j.error||'Błąd');return j;});});}
jf('session').then(function(s){
  csrf=s.csrf;
  var sc=document.createElement('script');sc.src='https://accounts.google.com/gsi/client';sc.async=true;
  sc.onload=function(){try{
    google.accounts.id.initialize({client_id:s.gid,ux_mode:'popup',auto_select:false,callback:function(r){
      err.textContent='';
      jf('google',{credential:r.credential}).then(function(){location.reload();}).catch(function(e){err.textContent=e.message;});
    }});
    google.accounts.id.renderButton(document.getElementById('g'),{theme:'outline',size:'large',text:'signin_with',locale:'pl',width:324});
  }catch(e){err.textContent='Nie udało się wczytać logowania Google.';}};
  sc.onerror=function(){err.textContent='Nie udało się połączyć z Google.';};
  document.head.appendChild(sc);
}).catch(function(e){err.textContent=e.message;});
})();
</script>
</body>
</html>
<?php
exit;
}
?>
<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>Narzędzia MotywDesign</title>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23fff'/%3E%3Crect x='10' y='34' width='20' height='20' fill='%23B4552D'/%3E%3C/svg%3E">
<style>
:root{--bg:#f5f5f7;--card:#fff;--ink:#1d1d1f;--mut:#6e6e73;--line:rgba(0,0,0,.08);--acc:#B4552D;--blue:#0071e3}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b0c;--card:#1a1a1c;--ink:#f2f2f4;--mut:#a1a1a6;--line:rgba(255,255,255,.1);--acc:#d9764d;--blue:#4c9dff}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1100px;margin:0 auto;padding:32px max(16px,env(safe-area-inset-right)) 80px max(16px,env(safe-area-inset-left))}
header{display:flex;align-items:center;gap:12px;margin-bottom:28px}
header i{width:12px;height:12px;background:var(--acc);display:block;flex:none}
h1{font-size:26px;line-height:1.15;margin:0;letter-spacing:-.02em}
header p{margin:0 0 0 auto;color:var(--mut);font-size:13px}
#out{border:0;background:none;color:var(--blue);font:inherit;cursor:pointer;padding:0 0 0 8px}#out:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
.q{display:block;width:100%;max-width:420px;height:42px;border:0;border-radius:999px;background:var(--card);box-shadow:0 1px 2px rgba(0,0,0,.06),0 0 0 1px var(--line);padding:0 18px;font:inherit;color:inherit;margin-bottom:30px}
.q:focus{outline:2px solid var(--blue)}
section{margin-bottom:34px}
h2{font-size:13px;font-weight:600;color:var(--mut);margin:0 0 10px 4px;letter-spacing:.02em}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
a.t{display:flex;flex-direction:column;gap:3px;padding:16px 18px;background:var(--card);border-radius:14px;color:inherit;text-decoration:none;box-shadow:0 1px 2px rgba(0,0,0,.05),0 0 0 1px var(--line);transition:transform .15s,box-shadow .15s}
a.t:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.12),0 0 0 1px var(--line)}
a.t:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
a.t b{font-weight:600;font-size:15px}
a.t span{color:var(--mut);font-size:13px}
.none{display:none;color:var(--mut)}
foot{display:block;margin-top:40px;color:var(--mut);font-size:12.5px}
@media (prefers-reduced-motion:reduce){a.t{transition:none}}
</style>
</head>
<body>
<div class="wrap">
<header><i aria-hidden="true"></i><h1>Narzędzia MotywDesign</h1><p><span id="who"></span> <button id="out" type="button">Wyloguj</button></p></header>
<input class="q" id="q" type="search" placeholder="Szukaj narzędzia…" aria-label="Szukaj narzędzia" autocomplete="off">

<section data-g><h2>Oferty i klienci</h2><div class="g">
<a class="t" href="/app/"><b>Panel klientów</b><span>Klienci, linki, hasła, ankiety i tablice w jednym miejscu</span></a>
<a class="t" href="https://claude.ai/artifact/LgNvxTJ2i7EbazhfZqej1u" target="_blank" rel="noopener"><b>Generator ofert</b><span>Oferty dla klientów w stylu pracowni</span></a>
<a class="t" href="https://claude.ai/artifact/C5TrhuhuQEXN2zxQ6k3pdV" target="_blank" rel="noopener"><b>Ankiety MotywDesign</b><span>Ankiety i formularze dla klientów</span></a>
<a class="t" href="/tablica/"><b>Tablica MotywDesign</b><span>Wspólna tablica zespołu i klientów (wersja na domenie, z logowaniem)</span></a>
<a class="t" href="https://claude.ai/artifact/EHZQDd7cLuifHtME4jJ27j" target="_blank" rel="noopener"><b>Tablica klienta</b><span>Wcześniejsza wersja tablicy</span></a>
</div></section>

<section data-g><h2>Projektowanie</h2><div class="g">
<a class="t" href="https://claude.ai/artifact/8TaEAxJdndzuqYX9k4wHiA" target="_blank" rel="noopener"><b>Nasłonecznienie wnętrza</b><span>Słońce przez okna, odblask w telewizorze</span></a>
<a class="t" href="https://claude.ai/artifact/1ZPZhjSwzDwCgZKmDdb5cH" target="_blank" rel="noopener"><b>Interaktywna elektryka</b><span>Rysunek elektryki z włącznikami i lampami</span></a>
<a class="t" href="https://claude.ai/artifact/7HNUcxjkgcX6j4J6tB7QTW" target="_blank" rel="noopener"><b>Edytor rzutów</b><span>Czyszczenie i edycja rzutów od klientów</span></a>
</div></section>

<section data-g><h2>Strona i marka</h2><div class="g">
<a class="t" href="https://motywdesign.pl/panel/" target="_blank" rel="noopener"><b>Panel strony</b><span>Edycja projektów i tekstów na motywdesign.pl</span></a>
<a class="t" href="https://claude.ai/artifact/Cu1oiHJ5D2mbkuQQj37sj9" target="_blank" rel="noopener"><b>Strona (wersja w Claude)</b><span>Archiwum wersji przed wdrożeniem na domenę</span></a>
<a class="t" href="https://claude.ai/artifact/UmCXCN86nGY2d7v3VnYMJk" target="_blank" rel="noopener"><b>Teksty strony</b><span>Robocze teksty na stronę</span></a>
<a class="t" href="https://claude.ai/artifact/YWNS5BwPHpRUcnM5jmqYTD" target="_blank" rel="noopener"><b>Bazowy</b><span>Design system narzędzi pracowni</span></a>
<a class="t" href="https://claude.ai/artifact/Mrkiqi9rdaaWrezzzh7s2Y" target="_blank" rel="noopener"><b>Próbnik złotego</b><span>Dobór złotego akcentu</span></a>
</div></section>

<section data-g><h2>Media społecznościowe</h2><div class="g">
<a class="t" href="https://claude.ai/artifact/NRo7und3YHRXcrjB7kfrPU" target="_blank" rel="noopener"><b>Generator postów</b><span>Posty dla Instagrama i Facebooka</span></a>
<a class="t" href="https://claude.ai/artifact/9s43WyAt1Dy7wyNNJNdMix" target="_blank" rel="noopener"><b>Generator bumerangu</b><span>Krótkie zapętlone animacje</span></a>
<a class="t" href="https://claude.ai/artifact/RF3x2EuTLv5BgTeejcgon1" target="_blank" rel="noopener"><b>Instagram MotywDesign</b><span>Plan i podgląd profilu</span></a>
</div></section>

<section data-g><h2>Organizacja</h2><div class="g">
<a class="t" href="https://claude.ai/artifact/MS65vzndQxbE4E5HNDtf3D" target="_blank" rel="noopener"><b>Projekty MotywDesign</b><span>Panel linków do wszystkich projektów i stron</span></a>
<a class="t" href="https://claude.ai/artifact/DQ8zpCar2PZUMd3ycK7fJi" target="_blank" rel="noopener"><b>Planer dnia</b><span>Plan dnia i poranny brief</span></a>
<a class="t" href="https://claude.ai/artifact/2Z6pgfCnJbsRbedB6ZPxTN" target="_blank" rel="noopener"><b>Mapa porządku</b><span>Struktura narzędzi i dokumentów</span></a>
</div></section>

<p class="none" id="none">Nic nie pasuje do wyszukiwania.</p>
<foot>Linki do narzędzi w Claude otwierają się tylko po zalogowaniu na Twoje konto.</foot>
</div>
<script>
(function(){
var q=document.getElementById('q'),none=document.getElementById('none');
function norm(s){return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ł/g,'l');}
q.addEventListener('input',function(){
  var t=norm(q.value.trim()),shown=0;
  [].forEach.call(document.querySelectorAll('section[data-g]'),function(s){
    var n=0;[].forEach.call(s.querySelectorAll('a.t'),function(a){var ok=!t||norm(a.textContent).indexOf(t)>-1;a.style.display=ok?'':'none';if(ok)n++;});
    s.style.display=n?'':'none';shown+=n;
  });
  none.style.display=shown?'none':'block';
});
})();
</script>
<script>
(function(){
document.getElementById('who').textContent=<?= json_encode($email, JSON_UNESCAPED_UNICODE) ?>;
document.getElementById('out').addEventListener('click',function(){
  fetch('tablica/api/index.php?a=session',{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(s){
    return fetch('tablica/api/index.php?a=logout',{method:'POST',credentials:'same-origin',headers:{'X-CSRF':s.csrf}});
  }).catch(function(){}).then(function(){location.reload();});
});
})();
</script>
</body>
</html>
