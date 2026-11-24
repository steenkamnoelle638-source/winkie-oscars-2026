# Winkie Oscars 2026

’n Vriendegroep se Oscar-stemwebwerf in Afrikaans, gebaseer op die bestaande Vriende Oscar Rewards-webwerf. Die toepassing is gewone HTML, CSS en JavaScript met ’n SQLite-databasis. Daar is geen TypeScript- of Docker-stappe nie.

## Maak oop in VS Code

1. Installeer Node.js **22.5 of nuwer**.
2. Clone hierdie repository en open die projekvouer in VS Code.
3. Open ’n terminal in die projekvouer en voer uit:

```sh
npm install
npm start
```

4. Gaan na <http://localhost:3000>.

Vir outomatiese herlaai tydens ontwikkeling, gebruik `npm run dev`.

## GitHub Pages

Die Pages-tuisblad is die wortel-lêer `index.html`; GitHub Pages bedien nie die Node/SQLite-bediener nie. Op die Pages-skakel gebruik die demonstrasie dus `localStorage`: stemme en ranglyste bly net in daardie blaaier/toestel, en die demo-admin-wagwoord is nie sekuriteit nie. Dit laat die ontwerp en al vier bladsye werk, maar versamel nie ’n gedeelde groepstem nie. Vir stemme wat tussen almal se toestelle gedeel word, moet `server.js` op ’n Node-host loop met ’n duursame SQLite-lêer; GitHub Pages alleen kan dit nie doen nie.

## Wat ingesluit is

- Die tuis-/reëlsblad met naamkeuse, die twee host-portrette en ’n bevestiging dat die reëls gelees is.
- ’n Stemblad met ses vrae; die gekose kieser word uit die kandidate verwyder en die bediener weier selfstemme.
- ’n Admin-beskermde resultateblad met kategorie-podiums en ’n algehele onthulling.
- ’n Rankingblad met tellings per vraag.
- Sewe deelnemers, waaronder twee tydelike plekhouers (`Deelnemer 6` en `Deelnemer 7`). Die eerste vyf portrette is plaaslik in `public/images/`; plekhouers wys aanvanklik-avatar’s.
- SQLite se skema in `data/schema.sql`. Die werklike databasis (`data/awards.sqlite`) word outomaties geskep wanneer die bediener begin en word nie in Git gestoor nie.

## Omgewingsveranderlikes

- `PORT` — webbedienerpoort; verstek `3000`.
- `SQLITE_PATH` — opsionele plek vir SQLite-lêer; verstek `data/awards.sqlite`.
- `ADMIN_PASSWORD` — admin-wagwoord; verstek vir die demonstrasie `oscar2026`. Stel ’n eie waarde voor gebruik deur ander mense.

## Projeklêers

- `server.js` — JavaScript-bediener, API, SQLite-inisialisering en saadlys.
- `public/index.html` — HTML-dokument.
- `public/styles.css` — responsiewe donker-en-goud ontwerp.
- `public/app.js` — bladsyvloei, naamkeuse, stemme, resultate en ranglys.
- `data/schema.sql` — SQLite-tabelles.
- `public/images/` — plaaslike WebP-portrette.
