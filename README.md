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
