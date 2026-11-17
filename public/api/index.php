<?php
declare(strict_types=1);
/* Mały panel treści MotywDesign: dane w plikach JSON, jedno konto, sesja w ciasteczku. */
ini_set('display_errors', '0');
mb_internal_encoding('UTF-8');
$ROOT = dirname(__DIR__);
$DATA = $ROOT . '/data';
const IDLE = 7200;          // wylogowanie po 2 h bezczynności
const MAX_FAILS = 5;        // błędnych prób logowania
const LOCK_SECS = 900;      // blokada na 15 min
const MAX_JSON = 4000000;   // 4 MB na jeden zapis
const MAX_UPLOAD = 30000000;

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

function out($a, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}
function fail(string $msg, int $code = 400): void { out(['error' => $msg], $code); }

function ensure_data(): void {
    global $DATA;
    if (!is_dir($DATA)) { @mkdir($DATA, 0750, true); }
    if (!is_file($DATA . '/.htaccess')) { @file_put_contents($DATA . '/.htaccess', "Require all denied\nDeny from all\n"); }
    if (!is_file($DATA . '/index.html')) { @file_put_contents($DATA . '/index.html', ''); }
}
/* pliki prywatne mają przedrostek <?php exit; ?>, więc nawet źle skonfigurowany serwer nie pokaże ich treści */
function priv_read(string $name) {
    global $DATA;
    $p = $DATA . '/' . $name . '.php';
    if (!is_file($p)) return null;
    $s = (string)file_get_contents($p);
    $i = strpos($s, "\n");
    $j = json_decode($i === false ? '' : substr($s, $i + 1), true);
    return is_array($j) ? $j : null;
}
function priv_write(string $name, array $v): void {
    global $DATA;
    ensure_data();
    $p = $DATA . '/' . $name . '.php';
    $tmp = $p . '.tmp' . bin2hex(random_bytes(4));
    file_put_contents($tmp, "<?php exit; ?>\n" . json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    rename($tmp, $p);
}
function https_on(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
}
function start_session(): void {
    session_name('mdsid');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => https_on(), 'httponly' => true, 'samesite' => 'Strict']);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', (string)IDLE);
    session_start();
    if (isset($_SESSION['t']) && time() - (int)$_SESSION['t'] > IDLE) { $_SESSION = []; }
    if (!empty($_SESSION['auth'])) { $_SESSION['t'] = time(); }
    if (empty($_SESSION['csrf'])) { $_SESSION['csrf'] = bin2hex(random_bytes(16)); }
}
function is_auth(): bool { return !empty($_SESSION['auth']); }
function require_auth_post(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Metoda niedozwolona', 405);
    if (!is_auth()) fail('Brak dostępu. Zaloguj się ponownie.', 401);
    $h = $_SERVER['HTTP_X_CSRF'] ?? '';
    if (!is_string($h) || !hash_equals((string)$_SESSION['csrf'], $h)) fail('Sesja wygasła. Odśwież stronę.', 403);
}
function body_json(): array {
    $raw = file_get_contents('php://input', false, null, 0, MAX_JSON + 1);
    if ($raw === false || strlen($raw) > MAX_JSON) fail('Za duży zapis', 413);
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}
function client_ip(): string { return substr(preg_replace('/[^0-9a-fA-F:\.]/', '', (string)($_SERVER['REMOTE_ADDR'] ?? '')), 0, 45); }

/* ---- treść ---- */
function content_path(): string { global $DATA; return $DATA . '/content.json'; }
function content_load(): array {
    global $ROOT;
    ensure_data();
    $p = content_path();
    if (!is_file($p)) {
        $seed = $ROOT . '/seed/content.json';
        if (is_file($seed)) { @copy($seed, $p); }
    }
    $j = is_file($p) ? json_decode((string)file_get_contents($p), true) : null;
    if (!is_array($j)) $j = [];
    foreach (['projects', 'site', 'textEdits'] as $k) { if (!isset($j[$k]) || !is_array($j[$k])) $j[$k] = []; }
    return $j;
}
function imgx_load(): array {
    global $DATA, $ROOT;
    $p = $DATA . '/imgx.json';
    $j = is_file($p) ? json_decode((string)file_get_contents($p), true) : null;
    return is_array($j) ? $j : [];
}

$CFG = require __DIR__ . '/config.php';
define('CFG', $CFG);
function http_get(string $url): ?string {
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_FOLLOWLOCATION => false]);
        $r = curl_exec($c); $code = (int)curl_getinfo($c, CURLINFO_HTTP_CODE); curl_close($c);
        return ($r !== false && $code === 200) ? (string)$r : null;
    }
    $r = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 10]]));
    return $r === false ? null : (string)$r;
}
/* zwraca adres e-mail zweryfikowanego konta albo null */
function google_email(string $cred): ?string {
    if (strlen($cred) < 100 || strlen($cred) > 4000 || !preg_match('/^[A-Za-z0-9_\-\.]+$/', $cred)) return null;
    $raw = http_get(CFG['tokeninfo'] . '?id_token=' . rawurlencode($cred));
    $j = $raw ? json_decode($raw, true) : null;
    if (!is_array($j)) return null;
    if (($j['aud'] ?? '') !== CFG['client_id']) return null;
    if (!in_array($j['iss'] ?? '', ['accounts.google.com', 'https://accounts.google.com'], true)) return null;
    if ((int)($j['exp'] ?? 0) < time()) return null;
    if (!in_array((string)($j['email_verified'] ?? ''), ['true', '1'], true)) return null;
    $e = strtolower((string)($j['email'] ?? ''));
    return $e !== '' ? $e : null;
}

start_session();
$a = $_GET['a'] ?? '';

if ($a === 'data') {
    $c = content_load();
    $projects = [];
    foreach ($c['projects'] as $id => $doc) { if (is_array($doc)) { $doc['id'] = (string)$id; $projects[] = $doc; } }
    $r = ['projects' => $projects, 'site' => $c['site']['content'] ?? null, 'imgx' => (object)imgx_load(), 'redirects' => (object)meta_load()['redirects']];
    if (is_auth()) {
        $te = [];
        foreach ($c['textEdits'] as $id => $doc) { if (is_array($doc)) { $te[] = ['id' => (string)$id] + $doc; } }
        $r['textEdits'] = $te;
    }
    out($r);
}

if ($a === 'session') {
    out(['auth' => is_auth(), 'csrf' => (string)$_SESSION['csrf'], 'gid' => CFG['client_id'], 'email' => $_SESSION['email'] ?? null]);
}

/* logowanie kontem Google: token z "Zaloguj przez Google" sprawdzamy u Google, wpuszczamy tylko adresy z config.php */
if ($a === 'google') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Metoda niedozwolona', 405);
    $h = $_SERVER['HTTP_X_CSRF'] ?? '';
    if (!hash_equals((string)$_SESSION['csrf'], (string)$h)) fail('Odśwież stronę i spróbuj ponownie.', 403);
    $ip = client_ip();
    $att = priv_read('attempts') ?? [];
    $now = time();
    foreach ($att as $k => $v) { if (($v['until'] ?? 0) < $now && ($v['last'] ?? 0) < $now - 3600) unset($att[$k]); }
    $rec = $att[$ip] ?? ['n' => 0, 'until' => 0, 'last' => 0];
    if (($rec['until'] ?? 0) > $now) { fail('Za dużo prób. Spróbuj za ' . (int)ceil(($rec['until'] - $now) / 60) . ' min.', 429); }
    $in = body_json();
    $cred = (string)($in['credential'] ?? '');
    $email = google_email($cred);
    if ($email !== null && in_array($email, array_map('strtolower', CFG['allowed']), true)) {
        unset($att[$ip]); priv_write('attempts', $att);
        session_regenerate_id(true);
        $_SESSION['auth'] = true; $_SESSION['email'] = $email; $_SESSION['t'] = time(); $_SESSION['csrf'] = bin2hex(random_bytes(16));
        out(['ok' => true, 'email' => $email]);
    }
    $rec['n'] = (int)$rec['n'] + 1; $rec['last'] = $now;
    if ($rec['n'] >= MAX_FAILS) { $rec['until'] = $now + LOCK_SECS; $rec['n'] = 0; }
    $att[$ip] = $rec; priv_write('attempts', $att);
    if ($email === null) fail('Nie udało się zweryfikować logowania Google. Spróbuj ponownie.', 401);
    fail('To konto Google (' . $email . ') nie ma dostępu.', 403);
}

if ($a === 'logout') {
    require_auth_post();
    $_SESSION = [];
    session_destroy();
    out(['ok' => true]);
}

if ($a === 'save') {
    require_auth_post();
    $in = body_json();
    $op = (string)($in['op'] ?? '');
    $path = (string)($in['path'] ?? '');
    $data = $in['data'] ?? null;
    if (!in_array($op, ['set', 'update', 'delete'], true)) fail('Nieznana operacja');
    $col = ''; $id = '';
    if ($path === 'site/content') { $col = 'site'; $id = 'content'; }
    elseif (preg_match('#^(projects|textEdits)/([A-Za-z0-9_\-]{1,120})$#', $path, $m)) { $col = $m[1]; $id = $m[2]; }
    else fail('Niedozwolona ścieżka');
    if ($op !== 'delete' && !is_array($data)) fail('Brak danych');
    ensure_data();
    $lock = fopen($GLOBALS['DATA'] . '/.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) fail('Serwer zajęty, spróbuj ponownie.', 503);
    $c = content_load();
    $cur = $c[$col][$id] ?? null;
    if ($op === 'set') $c[$col][$id] = $data;
    elseif ($op === 'update') $c[$col][$id] = array_merge(is_array($cur) ? $cur : [], $data);
    else unset($c[$col][$id]);
    /* kopia zapasowa poprzedniej wersji, najwyżej raz na 5 minut, 40 ostatnich */
    $bk = $GLOBALS['DATA'] . '/backup';
    if (!is_dir($bk)) { @mkdir($bk, 0750, true); @file_put_contents($bk . '/.htaccess', "Require all denied\nDeny from all\n"); }
    $last = glob($bk . '/content-*.json') ?: [];
    sort($last);
    $lastT = $last ? (int)filemtime(end($last)) : 0;
    if (is_file(content_path()) && time() - $lastT > 300) {
        @copy(content_path(), $bk . '/content-' . date('Ymd-His') . '.json');
        $last = glob($bk . '/content-*.json') ?: []; sort($last);
        while (count($last) > 40) { @unlink(array_shift($last)); }
    }
    /* stary zapis wprost na stronę: lustro w szkicu, żeby publikacja szkicu go nie cofnęła */
    if (in_array($col, ['projects', 'site'], true) && is_file($GLOBALS['DATA'] . '/draft.json')) {
        $dd = draft_load();
        if ($col === 'site') { $dd['site'] = $c['site']; }
        elseif ($op === 'delete') { unset($dd['projects'][$id]); }
        else { $dd['projects'][$id] = $c['projects'][$id]; }
        draft_write($dd);
    }
    $tmp = content_path() . '.tmp' . bin2hex(random_bytes(4));
    file_put_contents($tmp, json_encode($c, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE));
    rename($tmp, content_path());
    flock($lock, LOCK_UN); fclose($lock);
    out(['ok' => true]);
}

/* ====================== szkic, publikacja, historia (panel v2) ====================== */
const KEEP_DRAFT_SNAP = 40;     // migawek szkicu (najwyżej jedna na 5 min)
const KEEP_PUB_SNAP = 25;       // poprzednich publikacji
const TRASH_DAYS = 30;

function json_read_file(string $p): ?array {
    if (!is_file($p)) return null;
    $j = json_decode((string)file_get_contents($p), true);
    return is_array($j) ? $j : null;
}
function json_write_atomic(string $p, array $v): void {
    $tmp = $p . '.tmp' . bin2hex(random_bytes(4));
    file_put_contents($tmp, json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE));
    rename($tmp, $p);
}
function hist_dir(): string {
    global $DATA;
    $d = $DATA . '/history';
    if (!is_dir($d)) { @mkdir($d, 0750, true); @file_put_contents($d . '/.htaccess', "Require all denied\nDeny from all\n"); }
    return $d;
}
function meta_load(): array {
    global $DATA;
    $m = json_read_file($DATA . '/meta.json') ?? [];
    if (!isset($m['redirects']) || !is_array($m['redirects'])) $m['redirects'] = [];
    return $m;
}
function meta_write(array $m): void { global $DATA; ensure_data(); json_write_atomic($DATA . '/meta.json', $m); }
function draft_from_content(array $c): array {
    return ['projects' => $c['projects'], 'site' => $c['site'], 'trash' => [], 'redirects' => []];
}
function draft_load(): array {
    global $DATA;
    ensure_data();
    $d = json_read_file($DATA . '/draft.json');
    if ($d === null) { $d = draft_from_content(content_load()); }
    foreach (['projects', 'site', 'trash', 'redirects'] as $k) { if (!isset($d[$k]) || !is_array($d[$k])) $d[$k] = []; }
    return $d;
}
function draft_write(array $d): void { global $DATA; ensure_data(); json_write_atomic($DATA . '/draft.json', $d); }
function snap_name(string $kind): string { return $kind . '-' . date('Ymd-His') . '-' . bin2hex(random_bytes(2)); }
function snap_prune(string $kind, int $keep): void {
    $f = glob(hist_dir() . '/' . $kind . '-*.json') ?: [];
    sort($f);
    while (count($f) > $keep) { @unlink(array_shift($f)); }
}
/* migawka szkicu: najwyżej jedna na 5 minut (zapisujemy stan sprzed zmiany) */
function draft_snapshot(bool $force = false): void {
    global $DATA;
    $src = $DATA . '/draft.json';
    if (!is_file($src)) return;
    $f = glob(hist_dir() . '/draft-*.json') ?: [];
    sort($f);
    $last = $f ? (int)filemtime(end($f)) : 0;
    if ($force || time() - $last > 300) {
        @copy($src, hist_dir() . '/' . snap_name('draft') . '.json');
        snap_prune('draft', KEEP_DRAFT_SNAP);
    }
}
function with_lock(callable $fn) {
    global $DATA;
    ensure_data();
    $lock = fopen($DATA . '/.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) fail('Serwer zajęty, spróbuj ponownie.', 503);
    try { return $fn(); } finally { flock($lock, LOCK_UN); fclose($lock); }
}
function valid_id(string $id): bool { return (bool)preg_match('/^[A-Za-z0-9_\-]{1,120}$/', $id); }
function purge_trash(array &$d): void {
    $lim = time() - TRASH_DAYS * 86400;
    foreach ($d['trash'] as $id => $t) { if ((int)($t['at'] ?? 0) < $lim) unset($d['trash'][$id]); }
}
function resolve_redirects(array $map, array $liveIds): array {
    foreach ($map as $old => $new) {
        if (isset($liveIds[$old])) { unset($map[$old]); continue; }
        $n = 0;
        while (isset($map[$new]) && $n++ < 10) { $new = $map[$new]; }
        if ($new === $old || !isset($liveIds[$new])) { unset($map[$old]); continue; }
        $map[$old] = $new;
    }
    return $map;
}

if ($a === 'redirects') {
    out(['redirects' => (object)meta_load()['redirects']]);
}

if ($a === 'draft') {
    if (!is_auth()) fail('Brak dostępu. Zaloguj się ponownie.', 401);
    $d = draft_load(); $c = content_load(); $m = meta_load();
    out([
        'draft' => ['projects' => (object)$d['projects'], 'site' => $d['site']['content'] ?? null, 'trash' => (object)$d['trash'], 'redirects' => (object)$d['redirects']],
        'published' => ['projects' => (object)$c['projects'], 'site' => $c['site']['content'] ?? null],
        'meta' => ['publishedAt' => $m['publishedAt'] ?? null, 'rev' => (int)($m['rev'] ?? 0), 'hasDraftFile' => is_file($GLOBALS['DATA'] . '/draft.json')],
        'imgx' => (object)imgx_load(),
        'ai' => priv_read('ai') !== null && !empty(priv_read('ai')['key']),
    ]);
}

/* autozapis: lista operacji na szkicu (nie dotyka strony widocznej dla gości) */
if ($a === 'dsave') {
    require_auth_post();
    $in = body_json();
    $ops = $in['ops'] ?? null;
    if (!is_array($ops) || !$ops || count($ops) > 60) fail('Brak operacji');
    $at = with_lock(function () use ($ops) {
        $d = draft_load();
        draft_snapshot();
        foreach ($ops as $o) {
            if (!is_array($o)) continue;
            $op = (string)($o['op'] ?? ''); $path = (string)($o['path'] ?? ''); $data = $o['data'] ?? null;
            if (!in_array($op, ['set', 'delete'], true)) fail('Nieznana operacja');
            if ($op === 'set' && !is_array($data)) fail('Brak danych');
            if ($path === 'site/content') { if ($op === 'delete') fail('Niedozwolone'); $d['site']['content'] = $data; }
            elseif ($path === 'redirects') { if ($op === 'delete') $d['redirects'] = []; else { $r = []; foreach ($data as $k => $v) { if (is_string($k) && is_string($v) && valid_id($k) && valid_id($v)) $r[$k] = $v; } $d['redirects'] = $r; } }
            elseif (preg_match('#^(projects|trash)/([A-Za-z0-9_\-]{1,120})$#', $path, $m)) {
                if ($op === 'delete') unset($d[$m[1]][$m[2]]); else $d[$m[1]][$m[2]] = $data;
            }
            else fail('Niedozwolona ścieżka');
        }
        purge_trash($d);
        draft_write($d);
        return time();
    });
    out(['ok' => true, 'at' => $at]);
}

if ($a === 'publish') {
    require_auth_post();
    $res = with_lock(function () {
        $d = draft_load(); $c = content_load(); $m = meta_load();
        if (!count($d['projects']) && count($c['projects'])) fail('Szkic nie ma żadnego projektu. Przywróć wersję z historii, zanim opublikujesz.', 422);
        foreach ($d['projects'] as $id => $p) {
            if (!is_array($p) || trim((string)($p['title'] ?? '')) === '') fail('Projekt „' . $id . '” nie ma nazwy. Uzupełnij ją przed publikacją.', 422);
        }
        if (is_file(content_path())) { @copy(content_path(), hist_dir() . '/' . snap_name('pub') . '.json'); snap_prune('pub', KEEP_PUB_SNAP); }
        purge_trash($d);
        $c['projects'] = $d['projects'];
        $c['site'] = $d['site'];
        json_write_atomic(content_path(), $c);
        $red = $m['redirects'];
        foreach ($d['redirects'] as $o => $n) { $red[$o] = $n; }
        $m['redirects'] = resolve_redirects($red, $c['projects']);
        $m['publishedAt'] = time();
        $m['rev'] = (int)($m['rev'] ?? 0) + 1;
        meta_write($m);
        $d['redirects'] = [];
        draft_write($d);
        return ['at' => $m['publishedAt'], 'rev' => $m['rev']];
    });
    out(['ok' => true] + $res);
}

if ($a === 'history') {
    if (!is_auth()) fail('Brak dostępu. Zaloguj się ponownie.', 401);
    $items = [];
    foreach (['draft', 'pub'] as $k) {
        foreach (glob(hist_dir() . '/' . $k . '-*.json') ?: [] as $f) {
            $b = basename($f, '.json');
            if (!preg_match('/^(draft|pub)-(\d{8})-(\d{6})-/', $b, $mm)) continue;
            $dt = DateTime::createFromFormat('Ymd-His', $mm[2] . '-' . $mm[3]);
            $items[] = ['id' => $b, 'kind' => $k, 'at' => $dt ? $dt->getTimestamp() : (int)filemtime($f)];
        }
    }
    usort($items, fn($x, $y) => $y['at'] <=> $x['at']);
    out(['items' => array_slice($items, 0, 60)]);
}

if ($a === 'restore' || $a === 'discard') {
    require_auth_post();
    $in = body_json();
    $id = (string)($in['id'] ?? '');
    with_lock(function () use ($a, $id) {
        $d = draft_load();
        if ($a === 'discard') {
            draft_snapshot(true);
            $nd = draft_from_content(content_load());
            $nd['trash'] = [];
            draft_write($nd);
            return;
        }
        if (!preg_match('/^(draft|pub)-\d{8}-\d{6}-[0-9a-f]{4}$/', $id)) fail('Nieprawidłowa wersja');
        $snap = json_read_file(hist_dir() . '/' . $id . '.json');
        if ($snap === null) fail('Nie znaleziono tej wersji', 404);
        draft_snapshot(true);
        if (strpos($id, 'draft-') === 0) {
            foreach (['projects', 'site', 'trash', 'redirects'] as $k) { if (isset($snap[$k]) && is_array($snap[$k])) $d[$k] = $snap[$k]; }
        } else {
            $d['projects'] = is_array($snap['projects'] ?? null) ? $snap['projects'] : [];
            $d['site'] = is_array($snap['site'] ?? null) ? $snap['site'] : [];
        }
        draft_write($d);
    });
    out(['ok' => true]);
}

/* generator opisów: serwer pyta Claude. Klucz leży w data/ai.php na hostingu, nie w repozytorium */
if ($a === 'ai') {
    require_auth_post();
    $cfg = priv_read('ai');
    if (!is_array($cfg) || empty($cfg['key'])) fail('Generator nie ma jeszcze klucza API. Zobacz README, rozdział „Generator opisów”.', 501);
    $in = body_json();
    $prompt = (string)($in['prompt'] ?? '');
    if ($prompt === '' || strlen($prompt) > 40000) fail('Za długie lub puste zapytanie');
    $now = time();
    $rate = array_values(array_filter(priv_read('ai_rate') ?? [], fn($t) => $t > $now - 3600));
    if (count($rate) >= 40) fail('Za dużo zapytań w ostatniej godzinie. Spróbuj za chwilę.', 429);
    $rate[] = $now; priv_write('ai_rate', $rate);
    $content = [];
    $mt = ['webp' => 'image/webp', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif'];
    $ids = is_array($in['images'] ?? null) ? array_slice($in['images'], 0, 6) : [];
    foreach ($ids as $iid) {
        $iid = (string)$iid;
        if (!preg_match('/^[0-9a-f]{32}$/', $iid)) continue;
        foreach ($mt as $ext => $mime) {
            $fp = $ROOT . '/img/' . $iid . '.' . $ext;
            if (is_file($fp) && filesize($fp) < 4500000) { $content[] = ['type' => 'image', 'source' => ['type' => 'base64', 'media_type' => $mime, 'data' => base64_encode((string)file_get_contents($fp))]]; break; }
        }
    }
    $content[] = ['type' => 'text', 'text' => $prompt];
    $body = json_encode(['model' => (string)($cfg['model'] ?? 'claude-sonnet-5-5'), 'max_tokens' => min(4000, max(200, (int)($in['max_tokens'] ?? 2000))), 'messages' => [['role' => 'user', 'content' => $content]]], JSON_UNESCAPED_UNICODE);
    @set_time_limit(120);
    $resp = null; $code = 0;
    if (function_exists('curl_init')) {
        $c = curl_init('https://api.anthropic.com/v1/messages');
        curl_setopt_array($c, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 110, CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_HTTPHEADER => ['content-type: application/json', 'x-api-key: ' . $cfg['key'], 'anthropic-version: 2023-06-01']]);
        $resp = curl_exec($c); $code = (int)curl_getinfo($c, CURLINFO_HTTP_CODE); curl_close($c);
    }
    $j = is_string($resp) ? json_decode($resp, true) : null;
    if ($code !== 200 || !is_array($j)) fail('Claude nie odpowiedział (kod ' . $code . '). Spróbuj ponownie za chwilę.', 502);
    $txt = '';
    foreach ($j['content'] ?? [] as $blk) { if (($blk['type'] ?? '') === 'text') $txt .= (string)$blk['text']; }
    out(['text' => $txt]);
}

if ($a === 'upload') {
    require_auth_post();
    if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) fail('Brak pliku');
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) fail('Błąd wgrywania (kod ' . (int)$f['error'] . '). Plik może przekraczać limit serwera.', 400);
    if ($f['size'] > MAX_UPLOAD) fail('Plik jest za duży (limit 30 MB).', 413);
    $fi = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string)$fi->file($f['tmp_name']);
    $map = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif', 'image/avif' => 'avif', 'video/mp4' => 'mp4', 'video/webm' => 'webm'];
    if (!isset($map[$mime])) fail('Niedozwolony typ pliku.', 415);
    $ext = $map[$mime];
    $dir = $ROOT . '/img';
    if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
    $id = bin2hex(random_bytes(16));
    if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $id . '.' . $ext)) fail('Nie udało się zapisać pliku.', 500);
    @chmod($dir . '/' . $id . '.' . $ext, 0644);
    ensure_data();
    $lock = fopen($GLOBALS['DATA'] . '/.lock', 'c');
    if ($lock && flock($lock, LOCK_EX)) {
        $x = imgx_load(); $x[$id] = $ext;
        file_put_contents($GLOBALS['DATA'] . '/imgx.json', json_encode($x), LOCK_EX);
        flock($lock, LOCK_UN); fclose($lock);
    }
    out(['id' => $id, 'url' => '/img/' . $id . '.' . $ext, 'sizeBytes' => (int)$f['size'], 'contentType' => $mime]);
}

fail('Nieznane żądanie', 404);
