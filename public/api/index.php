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

start_session();
$a = $_GET['a'] ?? '';

if ($a === 'data') {
    $c = content_load();
    $projects = [];
    foreach ($c['projects'] as $id => $doc) { if (is_array($doc)) { $doc['id'] = (string)$id; $projects[] = $doc; } }
    $r = ['projects' => $projects, 'site' => $c['site']['content'] ?? null, 'imgx' => (object)imgx_load()];
    if (is_auth()) {
        $te = [];
        foreach ($c['textEdits'] as $id => $doc) { if (is_array($doc)) { $te[] = ['id' => (string)$id] + $doc; } }
        $r['textEdits'] = $te;
    }
    out($r);
}

if ($a === 'session') {
    out(['auth' => is_auth(), 'csrf' => (string)$_SESSION['csrf'], 'setup' => priv_read('auth') === null]);
}

if ($a === 'setup') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Metoda niedozwolona', 405);
    if (priv_read('auth') !== null) fail('Hasło jest już ustawione.', 409);
    $h = $_SERVER['HTTP_X_CSRF'] ?? '';
    if (!hash_equals((string)$_SESSION['csrf'], (string)$h)) fail('Odśwież stronę i spróbuj ponownie.', 403);
    $in = body_json();
    $seed = json_decode((string)@file_get_contents($ROOT . '/seed/setup.json'), true);
    $want = is_array($seed) ? (string)($seed['sha256'] ?? '') : '';
    $code = trim((string)($in['code'] ?? ''));
    $pw = (string)($in['password'] ?? '');
    if ($want === '' || !hash_equals($want, hash('sha256', $code))) { usleep(800000); fail('Nieprawidłowy kod startowy.', 403); }
    if (mb_strlen($pw) < 12) fail('Hasło musi mieć co najmniej 12 znaków.');
    priv_write('auth', ['hash' => password_hash($pw, PASSWORD_DEFAULT), 'created' => time()]);
    session_regenerate_id(true);
    $_SESSION['auth'] = true; $_SESSION['t'] = time(); $_SESSION['csrf'] = bin2hex(random_bytes(16));
    out(['ok' => true]);
}

if ($a === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Metoda niedozwolona', 405);
    $ip = client_ip();
    $att = priv_read('attempts') ?? [];
    $now = time();
    foreach ($att as $k => $v) { if (($v['until'] ?? 0) < $now && ($v['last'] ?? 0) < $now - 3600) unset($att[$k]); }
    $rec = $att[$ip] ?? ['n' => 0, 'until' => 0, 'last' => 0];
    if (($rec['until'] ?? 0) > $now) { fail('Za dużo prób. Spróbuj za ' . (int)ceil(($rec['until'] - $now) / 60) . ' min.', 429); }
    $auth = priv_read('auth');
    $in = body_json();
    $pw = (string)($in['password'] ?? '');
    if ($auth && password_verify($pw, (string)$auth['hash'])) {
        unset($att[$ip]); priv_write('attempts', $att);
        session_regenerate_id(true);
        $_SESSION['auth'] = true; $_SESSION['t'] = time(); $_SESSION['csrf'] = bin2hex(random_bytes(16));
        out(['ok' => true]);
    }
    $rec['n'] = (int)$rec['n'] + 1; $rec['last'] = $now;
    if ($rec['n'] >= MAX_FAILS) { $rec['until'] = $now + LOCK_SECS; $rec['n'] = 0; }
    $att[$ip] = $rec; priv_write('attempts', $att);
    usleep(800000);
    fail('Nieprawidłowe hasło.', 401);
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
    $tmp = content_path() . '.tmp' . bin2hex(random_bytes(4));
    file_put_contents($tmp, json_encode($c, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE));
    rename($tmp, content_path());
    flock($lock, LOCK_UN); fclose($lock);
    out(['ok' => true]);
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
