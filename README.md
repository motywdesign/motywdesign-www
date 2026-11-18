# motywdesign.pl

Statyczna strona MotywDesign. Folder `public/` jest wysyłany na hosting (lh.pl) przez GitHub Actions po każdym wpisie na gałąź `main`.

Wymagane sekrety repozytorium (Settings, Secrets and variables, Actions): `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`. Opcjonalnie: `FTP_PROTOCOL` (`ftps` lub `ftp`) i `FTP_DIR` (folder domeny na serwerze, domyślnie `./`).

`tools/build.py` buduje `public/` z kodu strony i danych z panelu.

## Subdomena panelu

Na subdomenę panelu (`FTP_DIR_NARZEDZIA`) to repo wysyła tylko `narzedzia/index.php` (jako `narzedzia.php`) i `robots.txt`. Tablica (`tablica/`) ma własne repo `motywdesign/tablica-motywdesign` i wgrywa się stamtąd automatycznie. Katalog główny subdomeny (`index.php`, `.htaccess`) należy do rdzenia panelu z repo `motywdesign-panel`.

## Panel v2 (`/panel/`)

Panel to osobna aplikacja w `tools/panel/` (kopiowana do `public/panel/` przez `tools/build.py`). Zmiany zapisują się same do wersji roboczej (`data/draft.json`), a przycisk „Opublikuj” przenosi ją na stronę (`data/content.json`). Historia wersji i kosz (30 dni) są w panelu, kopie leżą w `data/history/`.

Efekt tekstu „Animacja przy wejściu” (scroll w dół: wersja normalna, scroll w górę: odwrócona) dopisuje do zbudowanych stron skrypt `tools/patch_wfx.py`. Kod strony powstaje z zewnętrznego źródła, więc po każdym `tools/build.py` trzeba go uruchomić ponownie (jest idempotentny).


Po zmianie adresu projektu stary adres przekierowuje na nowy (skrypt `cms.js`). Statyczne pliki SEO (tytuły i opisy w `<head>`, `sitemap.xml`, `llms.txt`) odświeżają się dopiero po ponownym zbudowaniu strony `tools/build.py`.

### Generator opisów (Claude)

Przyciski „Wygeneruj opis” i „Opisz zdjęcia” wołają serwer, a on API Anthropic. Najprościej: dodaj w GitHubie sekret `ANTHROPIC_API_KEY` (Settings → Secrets and variables → Actions). Wdrożenie samo utworzy na hostingu plik `data/ai.php` (krok „Włącz generator opisów”), a bez sekretu go pomija. Ręcznie: klucz w pliku `data/ai.php` na hostingu (nie w repozytorium; `config.php` nadpisuje się przy każdym wdrożeniu):

```php
<?php exit; ?>
{"key":"sk-ant-...","model":"claude-sonnet-5-5"}
```

Bez pliku przyciski pokażą instrukcję, reszta panelu działa. Limit: 40 zapytań na godzinę.

Po patch_wfx.py uruchom też `tools/patch_hero_zones.py` (linie stref i kursor pierwszego ekranu) `tools/patch_mobile_fixes.py` (poprawki telefonów z audytu 18.11.2026) `tools/patch_polish_v2.py` (wcięcie nagłówków na tablecie, maska animacji, strzałki kursora) i `tools/patch_hide_services.py` (ukrywanie usług przełącznikiem w panelu). Wszystkie pięć jest idempotentnych.
