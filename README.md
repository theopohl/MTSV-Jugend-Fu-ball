# MTSV Hohenwestedt Jugend – Instagram-Post-Generator

Eine kleine Web-App, mit der die Trainer der Jugendmannschaften (A/B/C/D-Jugend)
selbst fertige Instagram-Beiträge erzeugen können: **Spieltag-Ankündigungen**
und **Ergebnis-Posts**, immer im gleichen Design, direkt im Browser – ganz ohne
Design-Programm.

- **Trainer** tragen online nur Ergebnisse (und optional den Spielplan) ein.
- Die App baut daraus automatisch das fertige Bild **und** den passenden
  Instagram-Text.
- Das fertige Bild wird als PNG heruntergeladen und danach **von Hand** bei
  Instagram hochgeladen – die App postet nichts automatisch.

Diese Anleitung ist für Nicht-Programmierer:innen geschrieben. Sie führt einmal
komplett durch die Einrichtung. Das dauert ca. 20–30 Minuten.

---

## Was du am Ende hast

- Eine Web-Adresse (z. B. `https://DEINNAME.github.io/DEINREPO/`), die du dir
  auf dem iPad/iPhone **wie eine App auf den Home-Bildschirm** legen kannst.
- Eine kostenlose Datenbank bei Supabase, in der Spielpläne, Ergebnisse,
  Mannschaftsfotos und Gegner-Logos gespeichert werden – von allen Trainern
  gemeinsam nutzbar.
- Laufende Kosten: **0 €**, solange du im kostenlosen Supabase- und
  GitHub-Tarif bleibst.

---

## Schritt 1: Supabase-Projekt anlegen

1. Gehe auf [supabase.com](https://supabase.com) und erstelle kostenlos ein
   Konto (z. B. mit deinem GitHub-Account).
2. Klicke auf **New Project**.
   - Name: z. B. `mtsv-hohenwestedt-jugend`
   - Datenbank-Passwort: irgendein sicheres Passwort, das du dir merkst
     (wird für diese App nicht mehr gebraucht, aber gut aufheben).
   - Region: am besten eine Region in Europa (z. B. Frankfurt).
3. Warte, bis das Projekt fertig eingerichtet ist (dauert 1–2 Minuten).

## Schritt 2: Datenbank einrichten (`schema.sql`)

1. Öffne im Supabase-Dashboard links **SQL Editor**.
2. Klicke auf **New query**.
3. Öffne die Datei [`supabase/schema.sql`](supabase/schema.sql) aus diesem
   Projekt, kopiere den **gesamten Inhalt** und füge ihn in den SQL Editor ein.
4. Klicke auf **Run**. Das legt an:
   - die Tabellen `teams`, `opponents`, `fixtures`, `team_photos`
   - zwei Speicher-Ordner (Storage-Buckets) `team-photos` und `opponent-logos`
   - Zugriffsregeln (RLS-Policies), die Lesen/Schreiben erlauben
   - die vier Mannschaften A/B/C/D-Jugend als Startdaten

Wenn das ohne Fehlermeldung durchläuft, ist die Datenbank fertig.

## Schritt 3: Zugangsdaten in `config.js` eintragen

1. Öffne im Supabase-Dashboard **Project Settings → API**.
2. Kopiere:
   - die **Project URL** (sieht aus wie `https://abcdefgh.supabase.co`)
   - den **anon public key** (ein langer Text-Schlüssel)
3. Öffne die Datei [`config.js`](config.js) in diesem Projekt und trage beides
   ein:

   ```js
   supabaseUrl: "https://abcdefgh.supabase.co",
   supabaseAnonKey: "eyJ...dein-key...",
   ```

4. Trage außerdem einen eigenen **Passcode** ein (frei wählbar), den sich alle
   Trainer merken:

   ```js
   passcode: "mtsv2026",
   ```

> Der `anon key` ist bei Supabase **bewusst öffentlich** und kein Geheimnis –
> er gehört nicht in eine `.env`-Datei, sondern darf im Frontend-Code stehen.
> Die eigentliche Absicherung passiert über die Zugriffsregeln in der
> Datenbank (siehe Grenzen weiter unten).

## Schritt 4: Assets prüfen

Im Ordner [`assets/`](assets) liegen bereits:

- `mtsv-logo.png` – das Vereinslogo
- `jersey-bg.png` – die Trikot-Textur für Ergebnis-Posts
- `icons/` – App-Icons für die PWA

Falls du ein schöneres/größeres Vereinslogo hast, kannst du `mtsv-logo.png`
einfach durch deine eigene Datei ersetzen (gleicher Dateiname, am besten mit
weißem Hintergrund, da es auf der weißen Logo-Box platziert wird).

## Schritt 5: Auf GitHub Pages veröffentlichen

1. Lade dieses gesamte Projekt in ein neues GitHub-Repository hoch (z. B. über
   GitHub Desktop oder die GitHub-Weboberfläche „Upload files").
2. Gehe im Repository auf **Settings → Pages**.
3. Wähle bei **Source** den Branch `main` und Ordner `/ (root)`, dann
   **Save**.
4. Nach ein bis zwei Minuten ist die Seite erreichbar unter
   `https://DEINNAME.github.io/DEINREPO/`.

## Schritt 6: Auf dem iPad/iPhone installieren

1. Öffne die Adresse aus Schritt 5 in **Safari** auf dem iPad/iPhone.
2. Tippe auf das Teilen-Symbol (Quadrat mit Pfeil nach oben).
3. Wähle **Zum Home-Bildschirm**.
4. Fertig – die App öffnet sich jetzt im Vollbild mit eigenem Icon, wie eine
   echte App.

Für einen einzelnen Trainer lohnt sich ein direkter Link mit vorgewählter
Mannschaft, z. B.:

```
https://DEINNAME.github.io/DEINREPO/trainer.html?team=b-jugend
```

(gültige Werte: `a-jugend`, `b-jugend`, `c-jugend`, `d-jugend`)

---

## Erste Nutzung

1. Öffne `trainer.html` (mit Passcode) und lege über **Spielplan-Import** im
   Generator (`index.html`) den kompletten Spielplan der Saison an – entweder
   Spiel für Spiel oder als eingefügte Tabelle (Spieltag, Gegner, Datum,
   Uhrzeit, Ort, Heim/Auswärts).
2. Nach jedem Spiel trägt der Trainer auf `trainer.html` das Ergebnis ein.
3. Im Generator (`index.html`) Mannschaft, Post-Typ (Ankündigung/Ergebnis) und
   ggf. ein Mannschaftsfoto wählen → Vorschau prüfen → **PNG herunterladen**
   und **Bildtext kopieren** → beides von Hand bei Instagram hochladen.

---

## Grenzen des Passcode-Schutzes

Diese App verwendet **kein echtes Nutzer-Login**. Der „Passcode" ist nur eine
einfache Zugangssperre, die im Browser abgefragt wird – er verschlüsselt oder
schützt die Datenbank selbst nicht. Das bedeutet konkret:

- Wer den Supabase-`anon key` kennt (er steht offen in `config.js` /
  im Quellcode der Webseite), kann theoretisch direkt über die Supabase-API
  auf die Tabellen zugreifen, **ohne** den Passcode zu kennen.
- Der Passcode verhindert nur, dass zufällige Besucher der Web-Adresse ohne
  Weiteres die Trainer-Oberfläche sehen und bedienen – er ist **kein
  Sicherheitsmechanismus gegen gezielte Angriffe**.
- Für die Daten dieser App (Spielpläne, Ergebnisse, Mannschaftsfotos,
  Gegner-Logos) ist das ein bewusst in Kauf genommenes, geringes Risiko, da es
  sich um ohnehin öffentliche Vereinsinformationen handelt.

Falls dir das nicht reicht (z. B. wenn sensiblere Daten dazukommen sollten),
müsste man auf echte Supabase-Auth-Logins mit striktes RLS pro Nutzer
umstellen – das ist mit dieser einfachen Version bewusst nicht umgesetzt.

---

## Projektstruktur

```
index.html            Generator (Admin-Seite): Post erzeugen, Spielplan-Import
trainer.html           Trainer-Eingabe: Ergebnis, Fotos, Gegner
config.js               Supabase-Zugangsdaten + Passcode + Design-Konstanten
styles.css              Gemeinsames Erscheinungsbild
manifest.json, sw.js    PWA (installierbar, offline-fähig)
js/
  gate.js               Passcode-Sperre
  supabase-client.js     Supabase-Verbindung
  db.js                  Datenbankzugriffe (Teams/Gegner/Spiele/Fotos)
  caption.js             Bildtext-Vorlagen (Deutsch, fest)
  renderer.js            Canvas-Zeichner für beide Post-Vorlagen
  app-index.js           Logik der Generator-Seite
  app-trainer.js         Logik der Trainer-Seite
assets/
  mtsv-logo.png, jersey-bg.png, icons/
supabase/schema.sql      Datenbank-Schema, Storage, RLS, Seed-Daten
```

## Bekannte Einschränkungen

- Kein automatisches Posten zu Instagram (nur Download + manueller Upload).
- Keine fussball.de-Anbindung – Ergebnisse werden von den Trainern von Hand
  eingetragen.
- Das Bearbeiten bestehender Spiele im Spielplan ist bewusst einfach gehalten
  (löschen + neu anlegen statt eines eigenen Bearbeiten-Dialogs).
