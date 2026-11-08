# motywdesign.pl

Statyczna strona MotywDesign. Folder `public/` jest wysyłany na hosting (lh.pl) przez GitHub Actions po każdym wpisie na gałąź `main`.

Wymagane sekrety repozytorium (Settings, Secrets and variables, Actions): `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`. Opcjonalnie: `FTP_PROTOCOL` (`ftps` lub `ftp`) i `FTP_DIR` (folder domeny na serwerze, domyślnie `./`).

`tools/build.py` buduje `public/` z kodu strony i danych z panelu.
