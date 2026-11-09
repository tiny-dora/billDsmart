# billDsmart – Website

Statische Website für billDsmart (HTML, CSS, JavaScript – kein Build-Schritt, keine Abhängigkeiten).
Inhalte basieren auf dem Business Model Canvas, Farben und Schrift auf dem billDsmart-Logo.

Live: https://tiny-dora.github.io/billDsmart/

## Inhalt

```
index.html        Seite (alle Texte, Deutsch und Englisch)
css/styles.css    Design
js/main.js        Interaktivität und Einstellungen
assets/logo.svg        Logo als Vektorgrafik (für helle Hintergründe)
assets/logo-light.svg  Logo für dunkle Hintergründe
assets/logo.png        Logo in hoher Auflösung (4180 px breit, transparent) – z. B. für Paper und Folien
assets/logo-light.png  dito, helle Version
assets/favicon.svg     Bildmarke (Kran-D) als Browser-Icon
assets/fonts/          Schrift Lexend (lokal eingebunden, keine Verbindung zu Google nötig)
.nojekyll         sorgt dafür, dass GitHub Pages die Dateien unverändert ausliefert
```

Funktionen:
- Interaktive Treuhand-Demo im Hero (Meilenstein melden, freigeben, beanstanden, nachbessern)
- Gebührenrechner (0,3 %, Aufteilung Bauherrschaft / Unternehmer)
- Premium-Abo (CHF 290 / Monat)
- Zielgruppen-Tabs, FAQ, Kontaktformular
- Sprachumschaltung DE / EN, mobil optimiert, per Tastatur bedienbar

## Lokal ansehen

`index.html` doppelklicken – die Seite läuft direkt im Browser. (Die Schrift Lexend lädt lokal nur über einen Webserver, z. B. `python3 -m http.server`; auf GitHub Pages funktioniert sie automatisch.)

## Auf GitHub Pages veröffentlichen

**Variante A – ohne Git (im Browser):**
1. Auf github.com ein neues Repository anlegen, z. B. `billDsmart` (Public).
2. „Add file“ → „Upload files“ → den *Inhalt* dieses Ordners hineinziehen
   (`index.html` muss im obersten Ordner liegen, nicht in einem Unterordner).
   Hinweis: `.nojekyll` ist eine versteckte Datei – ggf. über „Add file → Create new file“ mit dem Namen `.nojekyll` (leer) anlegen.
3. „Commit changes“.
4. Settings → Pages → Source: „Deploy from a branch“, Branch: `main`, Ordner: `/ (root)` → Save.
5. Nach 1–2 Minuten ist die Seite unter `https://<benutzername>.github.io/billDsmart/` online.

**Variante B – mit Git:**
```bash
cd billDsmart
git init
git add .
git commit -m "billDsmart Website"
git branch -M main
git remote add origin https://github.com/<benutzername>/billDsmart.git
git push -u origin main
```
Danach wie oben Schritt 4.

## Anpassen

- **Texte:** in `index.html`. Jeder Text steht zweimal: `<span lang="de">…</span>` und `<span lang="en">…</span>`.
- **Texte der Demo, Formularmeldungen:** im Objekt `TEXT` in `js/main.js`.
- **Demo-Beträge:** `AMOUNTS` in `js/main.js`.
- **Farben und Schrift:** Variablen ganz oben in `css/styles.css` (Navy #1C3258, Orange #D4642D aus dem Logo).
- **E-Mail-Adresse:** `contact@billDsmart.ch` – in `index.html` (Kontaktbereich) und bei `CONTACT_EMAIL` in `js/main.js`.

### Kontaktformular aktivieren

GitHub Pages hat keinen Server. Ohne Einstellung öffnet das Formular das E-Mail-Programm
mit einer vorbereiteten Nachricht an `CONTACT_EMAIL`.

Damit Anfragen direkt ankommen:
1. Kostenloses Konto auf https://formspree.io anlegen und ein Formular erstellen.
2. Den Endpunkt (z. B. `https://formspree.io/f/abcdwxyz`) in `js/main.js` bei `FORM_ENDPOINT` eintragen.
3. `CONTACT_EMAIL` auf eure echte Adresse setzen.

## Vor einer echten Veröffentlichung

- Impressum und Datenschutzerklärung ergänzen (in der Schweiz für Websites mit Kontaktformular nötig).
- Partner (Partnerbank, Verbände) erst namentlich nennen, wenn eine Zusammenarbeit besteht.
