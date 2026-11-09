# billDsmart – Website

Statische Website für billDsmart (HTML, CSS, JavaScript – kein Build-Schritt, keine Abhängigkeiten).
Inhalte basieren auf dem Business Model Canvas.

## Inhalt

```
index.html        Seite (alle Texte, Deutsch und Englisch)
css/styles.css    Design
js/main.js        Interaktivität und Einstellungen
assets/favicon.svg
.nojekyll         sorgt dafür, dass GitHub Pages die Dateien unverändert ausliefert
```

Funktionen:
- Interaktive Treuhand-Demo im Hero (Meilenstein melden, freigeben, beanstanden, nachbessern)
- Gebührenrechner (0,3 %, Aufteilung Bauherrschaft / Unternehmer)
- Premium-Abo (CHF 290 / Monat)
- Zielgruppen-Tabs, FAQ, Kontaktformular
- Sprachumschaltung DE / EN, mobil optimiert, per Tastatur bedienbar

## Lokal ansehen

`index.html` doppelklicken – die Seite läuft direkt im Browser.

## Auf GitHub Pages veröffentlichen

**Variante A – ohne Git (im Browser):**
1. Auf github.com ein neues Repository anlegen, z. B. `billdsmart` (Public).
2. „Add file“ → „Upload files“ → den *Inhalt* dieses Ordners hineinziehen
   (`index.html` muss im obersten Ordner liegen, nicht in einem Unterordner).
   Hinweis: `.nojekyll` ist eine versteckte Datei – ggf. über „Add file → Create new file“ mit dem Namen `.nojekyll` (leer) anlegen.
3. „Commit changes“.
4. Settings → Pages → Source: „Deploy from a branch“, Branch: `main`, Ordner: `/ (root)` → Save.
5. Nach 1–2 Minuten ist die Seite unter `https://<benutzername>.github.io/billdsmart/` online.

**Variante B – mit Git:**
```bash
cd billdsmart
git init
git add .
git commit -m "billDsmart Website"
git branch -M main
git remote add origin https://github.com/<benutzername>/billdsmart.git
git push -u origin main
```
Danach wie oben Schritt 4.

## Anpassen

- **Texte:** in `index.html`. Jeder Text steht zweimal: `<span lang="de">…</span>` und `<span lang="en">…</span>`.
- **Texte der Demo, Formularmeldungen:** im Objekt `TEXT` in `js/main.js`.
- **Demo-Beträge:** `AMOUNTS` in `js/main.js`.
- **Farben und Schrift:** Variablen ganz oben in `css/styles.css`.

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
