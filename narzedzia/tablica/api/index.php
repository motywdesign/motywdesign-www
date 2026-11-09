<?php
declare(strict_types=1);
/* Zaplecze Tablicy MotywDesign: prosta baza dokumentów (SQLite), jedno konto, sesja w ciasteczku. */
ini_set('display_errors', '0');
mb_internal_encoding('UTF-8');
$ROOT = dirname(__DIR__);
$DATA = $ROOT . '/data';
const IDLE = 28800;         // wylogowanie po 8 h bezczynności
const MAX_FAILS = 5;
const LOCK_SECS = 900;
const MAX_JSON = 24000000;  // 24 MB na jedno żądanie
const MAX_UPLOAD = 30000000;

header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');

function out($a, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($a, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}
function fail(string $msg, int $code = 400, string $c = ''): void { out(['error' => $msg, 'code' => $c], $code); }

function ensure_data(): void {
    global $DATA;
    if (!is_dir($DATA)) { @mkdir($DATA, 0750, true); }
    if (!is_file($DATA . '/.htaccess')) { @file_put_contents($DATA . '/.htaccess', "Require all denied\nDeny from all\n"); }
    if (!is_file($DATA . '/index.html')) { @file_put_contents($DATA . '/index.html', ''); }
}
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
    session_name('mdtab');
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
    if (!is_auth()) fail('Brak dostępu. Zaloguj się ponownie.', 401, 'unauthenticated');
    $h = $_SERVER['HTTP_X_CSRF'] ?? '';
    if (!is_string($h) || !hash_equals((string)$_SESSION['csrf'], $h)) fail('Sesja wygasła. Odśwież stronę.', 403, 'csrf');
}
function body_json(): array {
    $raw = file_get_contents('php://input', false, null, 0, MAX_JSON + 1);
    if ($raw === false || strlen($raw) > MAX_JSON) fail('Za duży zapis', 413);
    $j = json_decode($raw, true);
    return is_array($j) ? $j : [];
}
function client_ip(): string { return substr(preg_replace('/[^0-9a-fA-F:\.]/', '', (string)($_SERVER['REMOTE_ADDR'] ?? '')), 0, 45); }

/* ---- baza ---- */
function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    global $DATA;
    ensure_data();
    $cfg = priv_read('dbname');
    if (!$cfg) { $cfg = ['f' => 'tablica-' . bin2hex(random_bytes(10)) . '.sqlite']; priv_write('dbname', $cfg); }
    $pdo = new PDO('sqlite:' . $DATA . '/' . $cfg['f']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=8000;');
    $pdo->exec('CREATE TABLE IF NOT EXISTS docs (path TEXT PRIMARY KEY, parent TEXT NOT NULL, id TEXT NOT NULL, data TEXT, seq INTEGER NOT NULL, del INTEGER NOT NULL DEFAULT 0)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS docs_parent_seq ON docs(parent, seq)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v INTEGER NOT NULL)');
    $pdo->exec("INSERT OR IGNORE INTO meta(k,v) VALUES('seq',0)");
    return $pdo;
}
function next_seq(PDO $pdo): int {
    $pdo->exec("UPDATE meta SET v=v+1 WHERE k='seq'");
    return (int)$pdo->query("SELECT v FROM meta WHERE k='seq'")->fetchColumn();
}
function valid_path(string $p): bool {
    if (strlen($p) > 400) return false;
    if (!preg_match('#^[A-Za-z0-9_\-\.~:]{1,120}(/[A-Za-z0-9_\-\.~:]{1,120})*$#', $p)) return false;
    return true;
}
function split_path(string $p): array {
    $i = strrpos($p, '/');
    return $i === false ? ['', $p] : [substr($p, 0, $i), substr($p, $i + 1)];
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
    fail('To konto Google (' . $email . ') nie ma dostępu do tablicy.', 403);
}

if ($a === 'logout') {
    require_auth_post();
    $_SESSION = [];
    session_destroy();
    out(['ok' => true]);
}

/* operacje na dokumentach: [{op:get|set|update|delete, path, data}] */
if ($a === 'ops') {
    require_auth_post();
    $in = body_json();
    $ops = $in['ops'] ?? [];
    if (!is_array($ops) || count($ops) > 400) fail('Zbyt wiele operacji');
    $pdo = db();
    $res = [];
    $pdo->exec('BEGIN IMMEDIATE');
    try {
        foreach ($ops as $o) {
            $op = (string)($o['op'] ?? ''); $path = (string)($o['path'] ?? '');
            if (!valid_path($path) || substr_count($path, '/') % 2 !== 1) { $res[] = ['error' => 'Niedozwolona ścieżka', 'code' => 'invalid_argument']; continue; }
            [$parent, $id] = split_path($path);
            $st = $pdo->prepare('SELECT data, del FROM docs WHERE path=?'); $st->execute([$path]); $row = $st->fetch(PDO::FETCH_ASSOC);
            $cur = ($row && !(int)$row['del']) ? json_decode((string)$row['data'], true) : null;
            if ($op === 'get') { $res[] = ['exists' => is_array($cur), 'data' => $cur]; continue; }
            $data = $o['data'] ?? null;
            if ($op === 'set' || $op === 'update') {
                if (!is_array($data)) { $res[] = ['error' => 'Brak danych', 'code' => 'invalid_argument']; continue; }
                $new = $op === 'set' ? $data : array_merge(is_array($cur) ? $cur : [], $data);
                $js = json_encode($new, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
                if ($js === false || strlen($js) > 1500000) { $res[] = ['error' => 'Dokument jest za duży', 'code' => 'invalid_argument']; continue; }
                $pdo->prepare('INSERT INTO docs(path,parent,id,data,seq,del) VALUES(?,?,?,?,?,0) ON CONFLICT(path) DO UPDATE SET data=excluded.data, seq=excluded.seq, del=0')
                    ->execute([$path, $parent, $id, $js, next_seq($pdo)]);
                $res[] = ['ok' => true];
            } elseif ($op === 'delete') {
                if ($row && !(int)$row['del']) {
                    $pdo->prepare('UPDATE docs SET data=NULL, del=1, seq=? WHERE path=?')->execute([next_seq($pdo), $path]);
                }
                $res[] = ['ok' => true];
            } else { $res[] = ['error' => 'Nieznana operacja', 'code' => 'invalid_argument']; }
        }
        $pdo->exec('COMMIT');
    } catch (Throwable $e) {
        $pdo->exec('ROLLBACK');
        fail('Błąd zapisu w bazie.', 500);
    }
    out(['res' => $res]);
}

/* odczyt i odpytywanie kolekcji: subs:[{path, since}] -> zmiany od since (z usuniętymi) */
if ($a === 'poll') {
    require_auth_post();
    $in = body_json();
    $subs = $in['subs'] ?? [];
    if (!is_array($subs) || count($subs) > 200) fail('Zbyt wiele subskrypcji');
    $pdo = db();
    $max = (int)$pdo->query("SELECT v FROM meta WHERE k='seq'")->fetchColumn();
    $out = [];
    foreach ($subs as $s) {
        $path = (string)($s['path'] ?? ''); $since = (int)($s['since'] ?? 0);
        if (!valid_path($path) || substr_count($path, '/') % 2 !== 0) { $out[] = ['error' => 'Niedozwolona ścieżka']; continue; }
        $st = $pdo->prepare('SELECT id, data, del, seq FROM docs WHERE parent=? AND seq>? ORDER BY seq LIMIT 3000');
        $st->execute([$path, $since]);
        $docs = [];
        while ($r = $st->fetch(PDO::FETCH_ASSOC)) {
            $docs[] = ['id' => $r['id'], 'del' => (int)$r['del'], 'seq' => (int)$r['seq'], 'data' => (int)$r['del'] ? null : json_decode((string)$r['data'], true)];
        }
        $out[] = ['docs' => $docs, 'more' => count($docs) >= 3000];
    }
    out(['max' => $max, 'subs' => $out]);
}

if ($a === 'upload') {
    require_auth_post();
    if (empty($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) fail('Brak pliku');
    $f = $_FILES['file'];
    if ($f['error'] !== UPLOAD_ERR_OK) fail('Błąd wgrywania (kod ' . (int)$f['error'] . '). Plik może przekraczać limit serwera.', 400);
    if ($f['size'] > MAX_UPLOAD) fail('Plik jest za duży (limit 30 MB).', 413);
    $fi = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string)$fi->file($f['tmp_name']);
    $map = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'image/gif' => 'gif', 'image/avif' => 'avif', 'application/pdf' => 'pdf'];
    if (!isset($map[$mime])) fail('Niedozwolony typ pliku.', 415);
    ensure_data();
    $dir = $GLOBALS['DATA'] . '/blob';
    if (!is_dir($dir)) { @mkdir($dir, 0750, true); @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n"); }
    $id = bin2hex(random_bytes(16));
    if (!move_uploaded_file($f['tmp_name'], $dir . '/' . $id . '.' . $map[$mime])) fail('Nie udało się zapisać pliku.', 500);
    out(['id' => $id, 'url' => '/_blob/' . $id, 'sizeBytes' => (int)$f['size'], 'contentType' => $mime]);
}

if ($a === 'blob') {
    if (!is_auth()) { http_response_code(401); exit; }
    $id = (string)($_GET['id'] ?? '');
    if (!preg_match('/^[0-9a-f]{32}$/', $id)) { http_response_code(404); exit; }
    $mimes = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp', 'gif' => 'image/gif', 'avif' => 'image/avif', 'pdf' => 'application/pdf'];
    foreach ($mimes as $ext => $m) {
        $p = $GLOBALS['DATA'] . '/blob/' . $id . '.' . $ext;
        if (is_file($p)) {
            header('Content-Type: ' . $m);
            header('Content-Length: ' . filesize($p));
            header('Cache-Control: private, max-age=31536000, immutable');
            readfile($p);
            exit;
        }
    }
    http_response_code(404); exit;
}

fail('Nieznane żądanie', 404);
