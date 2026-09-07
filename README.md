# MTG Deck Oracle

MTG Deck Oracle e' una piattaforma pensata per aiutare i giocatori di Magic: The Gathering a capire quanto e' forte, solido e coerente il loro mazzo Commander.

L'obiettivo non e' dare un voto superficiale basato solo sulle carte piu' famose o sui bracket Commander, ma costruire una valutazione completa del mazzo: legalita', consistenza, curva di mana, sinergie, combo, ramp, interaction, velocita', resilienza e qualita' del piano di gioco.

Il risultato finale sara' un punteggio da 0 a 100 accompagnato da una spiegazione leggibile, utile sia a chi vuole migliorare il mazzo sia a chi vuole capire se il power level e' adatto al proprio tavolo.

## Problema

Molti strumenti esistenti sottovalutano aspetti fondamentali della valutazione di un mazzo Commander. Un esempio banale ma importante: se un sito premia solo la quantita' di carte forti, una lista da 200 carte puo' ottenere un punteggio altissimo anche se in Commander il mazzo deve essere da 100 carte e, soprattutto, aggiungere troppe carte riduce drasticamente la probabilita' di pescare quelle giuste.

MTG Deck Oracle deve evitare questi errori. La forza di un mazzo non dipende solo dalla potenza teorica delle singole carte, ma dalla probabilita' concreta che il mazzo funzioni durante una partita reale.

## Funzionalita' Principali

- Caricamento lista mazzo in formato testo, Arena-like, Moxfield, Archidekt o simili.
- Riconoscimento comandante, colori, identita' colore e legalita' Commander.
- Controllo dimensione mazzo, duplicati non ammessi, carte bannate e coerenza con il comandante.
- Analisi delle carte piu' forti presenti nel mazzo.
- Rilevamento di combo e sinergie interne.
- Analisi curva di mana, distribuzione terre, ramp, draw, tutor, removal, counterspell, protezioni e win condition.
- Valutazione della consistenza tramite probabilita', ridondanza e accesso ai pezzi chiave.
- Punteggio finale da 0 a 100 con spiegazione dettagliata.
- Suggerimenti per migliorare il mazzo senza trasformarlo necessariamente in cEDH.

## Output Atteso

Per ogni mazzo analizzato, il sito dovrebbe restituire:

- voto complessivo da 0 a 100;
- bracket Commander stimato;
- riassunto del piano di gioco;
- punti forti;
- punti deboli;
- carte piu' impattanti;
- combo e sinergie trovate;
- problemi di consistenza;
- consigli di miglioramento.

## Principio Guida

Il cuore del progetto e' l'algoritmo di valutazione. Deve essere severo con liste illegali, incoerenti o artificialmente gonfiate, e deve premiare i mazzi che hanno un piano chiaro, carte coerenti, buone probabilita' di funzionare e strumenti realistici per vincere o interagire.

## Documentazione

- `docs/PRODUCT_SPEC.md`: specifica funzionale del prodotto.
- `docs/COMPETITOR_ANALYSIS.md`: prima analisi degli strumenti simili e delle opportunita' di differenziazione.
- `docs/TECH_STACK.md`: scelta dello stack TypeScript e architettura tecnica iniziale.
- `docs/SCORING_ALGORITHM.md`: bozza dell'algoritmo di valutazione.
- `docs/PROJECT_PLANNER.md`: planner operativo del progetto.
- `docs/ROADMAP.md`: roadmap di sviluppo per milestone.
- `docs/DEPLOYMENT.md`: istruzioni per portare online sito, API e database.

## Stato Progetto

Questa repository contiene per ora la bozza iniziale del progetto. La priorita' e' definire bene il modello di valutazione prima di implementare interfaccia, backend e database.

## CLI MVP

Dopo aver installato le dipendenze, e' possibile analizzare una decklist da file:

```bash
npm run analyze -- path/to/decklist.txt
```

Formato Markdown:

```bash
npm run analyze -- path/to/decklist.txt --format markdown
```

Formato HTML:

```bash
npm run analyze -- path/to/decklist.txt --format html
```

La CLI usa Scryfall per i dati carta, una cache locale in `.cache/` e Commander Spellbook per cercare combo note.

## Rating Lab

Il progetto include anche un sito locale per raccogliere dati utili al rating base delle carte. Mostra due carte random e chiede all'utente quale sia piu' forte.

```bash
npm run rating-lab
```

Poi apri:

```text
http://localhost:5174
```

Il rating lab usa Scryfall per pescare carte random legali in Commander e aggiorna i punteggi con Elo.
In locale salva carte/confronti in `.cache/rating-lab-db.json`; in produzione usa PostgreSQL tramite `DATABASE_URL`.
Ogni voto salva anche un visitor id anonimo e un timestamp, cosi' sara' possibile mostrare statistiche e grafici di attivita' nel tempo.

Una volta su due prova a scegliere la seconda carta tra quelle gia' viste con rating simile alla prima, cosi' i confronti diventano progressivamente piu' utili per affinare i punteggi.

## Deploy

La base online espone la homepage su `/`, il Rating Lab su `/rating-lab` e le API su `/api/rating-lab/*`.

Per preparare il database PostgreSQL:

```bash
psql "$DATABASE_URL" -f database/rating-lab.sql
```

Build e avvio produzione:

```bash
npm run build
npm start
```
