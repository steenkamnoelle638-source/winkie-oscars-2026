# Winkie Oscars 2026

’n Vriendegroep se Oscar-stemwebwerf in Afrikaans, gebaseer op die bestaande Vriende Oscar Rewards-webwerf. Die toepassing is gewone HTML, CSS en JavaScript met ’n SQLite-databasis. Daar is geen TypeScript- of Docker-stappe nie.

## Maak oop in VS Code

1. Installeer Node.js **22.5 of nuwer**.
2. Clone hierdie repository en open die projekvouer.
3. Open ’n terminal in die projekvouer en voer uit:

```sh
npm install
npm start
```

4. Gaan na <http://localhost:3000>.

Vir outomatiese herlaai tydens ontwikkeling, gebruik `npm run dev`.

## Stem en resultate

- Sewe deelnemers kan stem; ’n kieser se eie naam word uit elke vraag se kandidate gehaal.
- Daar is 40 vrae oor agt toekennings: The MVP Award, The Skill Issue Award, The Comedy Award, The Rage Machine Award, The Big Brain Award, The Unhinged Award, The NPC Award en The Friendly Fire Award.
- Die vrae verskyn in ’n gerandomiseerde volgorde per kieser. Die volgorde bly dieselfde vir daardie kieser sodat gestoorde antwoorde aan die regte vrae gekoppel bly.
- Die resultateblad wys al agt toekennings met ’n ikoon, kategorie-etiket en kort verduideliking. Klik ’n toekenning om sy vyf vrae terug te kyk; die paneel vervaag daarna na die top-drie-podium. Klik die podium om die kaart te minimaliseer en outomaties na die volgende ongeopenbaarde kategorie te gaan.
- Die algehele wenners bly ’n aparte onthulling. Die rooi teatergordyne het ’n gelaagde, gedrapeerde valance; wanneer die onthulling begin, trek die panele oop en bly met tiebacks aan die kante.
- Die rankingblad wys die tellings per vraag.

## GitHub Pages

Die Pages-tuisblad is die wortel-lêer `index.html`; GitHub Pages bedien nie die Node/SQLite-bediener nie. Op die Pages-skakel gebruik die demonstrasie dus `localStorage`: stemme en ranglyste bly net in daardie blaaier/toestel, en die demo-admin-wagwoord is nie sekuriteit nie. Dit laat die ontwerp en al vier bladsye werk, maar versamel nie ’n gedeelde groepstem nie. Vir stemme wat tussen almal se toestelle gedeel word, moet `server.js` op ’n Node-host loop met ’n duursame SQLite-lêer; GitHub Pages alleen kan dit nie doen nie.

## Omgewingsveranderlikes

- `PORT` — webbedienerpoort; verstek `3000`.
- `SQLITE_PATH` — opsionele plek vir SQLite-lêer; verstek `data/awards.sqlite`.
- `ADMIN_PASSWORD` — admin-wagwoord; demo-verstek `oscar2026`. Stel ’n eie waarde voor gebruik deur ander mense.

## Projeklêers

- `server.js` — JavaScript-bediener, API, SQLite-inisialisering en saadlys.
- `public/index.html` — plaaslike HTML-dokument.
- `index.html` — GitHub Pages root entrypoint.
- `public/styles.css` — responsiewe donker-en-goud ontwerp.
- `public/app.js` — bladsyvloei, stemme, resultate en ranglys.
- `public/awards-data.js` — gedeelde bron vir die agt kategorieë en 40 vrae.
- `data/schema.sql` — SQLite-tabelles.
- `public/images/` — plaaslike WebP-portrette; die twee tydelike deelnemers wys voorlopige avatarbeelde.

Die werklike databasis (`data/awards.sqlite`) word outomaties geskep wanneer die bediener begin en word nie in Git gestoor nie. Ou vrae met ID’s `q1`–`q6` word met die nuwe stemstel vervang omdat daardie ou stemme nie na die nuwe vrae oorgedra kan word nie.
