# MTG Deck Oracle

MTG Deck Oracle e' una piattaforma pensata per aiutare i giocatori di Magic: The Gathering a capire quanto e' forte, solido e coerente il loro mazzo Commander.

L'obiettivo non e' dare un voto superficiale basato solo sulle carte piu' famose o sui bracket Commander, ma costruire una valutazione completa del mazzo: legalita', consistenza, curva di mana, sinergie, combo, ramp, interaction, velocita', resilienza e qualita' del piano di gioco.

Il risultato e' un punteggio da 0 a 100 accompagnato da una spiegazione leggibile, utile sia a chi vuole migliorare il mazzo sia a chi vuole capire se il power level e' adatto al proprio tavolo.

Oggi il motore e' usabile da CLI. Il sito pubblico e' il Rating Lab per i confronti Elo tra carte; la UI del report mazzo arriva dopo la calibrazione dello scoring.

Il motore puo' ricevere rating Elo raccolti dal Rating Lab tramite un provider dedicato, normalizzandoli in valori carta 0-10 per il componente `card_quality`.

## Problema

Molti strumenti esistenti sottovalutano aspetti fondamentali della valutazione di un mazzo Commander. Un esempio banale ma importante: se un sito premia solo la quantita' di carte forti, una lista da 200 carte puo' ottenere un punteggio altissimo anche se in Commander il mazzo deve essere da 100 carte e, soprattutto, aggiungere troppe carte riduce drasticamente la probabilita' di pescare quelle giuste.

MTG Deck Oracle deve evitare questi errori. La forza di un mazzo non dipende solo dalla potenza teorica delle singole carte, ma dalla probabilita' concreta che il mazzo funzioni durante una partita reale.

## Cosa Fa Oggi Il Motore

- Parsing di liste testuali (quantita', `1x`, set/collector number, sezioni tipo `// COMMANDER`).
- Risoluzione carte via Scryfall con cache in `.cache/`.
- Validazione Commander: comandante, identita' colore, banlist, duplicati, dimensione, eccezioni tipo Whtz.
- Tag funzionali da oracle text (ramp, draw, tutor, interaction, protection incluso shroud, sinergie).
- Combo da Commander Spellbook, con seed locale e cache disco.
- Consistenza ipergeometrica, scoring 0-100, bracket 1-5, spiegazione e consigli strutturali.
- Report CLI in JSON, Markdown o HTML, con voto 0-100 e bracket di costruzione separati.

Non esiste ancora: pagina web per incollare una decklist, import da URL Moxfield/Archidekt, grafici interattivi.

## Output Del Report

`npm run analyze` restituisce:

- voto complessivo da 0 a 100;
- bracket Commander dalle regole di costruzione (Game Changers, combo da due carte), con 4 vs 5 ancora aiutato dal voto;
- testo di spiegazione del voto (`scoreNotes`), con nota extra da CLI via `--notes`;
- breakdown dei sottopunteggi;
- legalita' e cap;
- combo rilevate e impatto;
- punti forti, punti deboli e consigli, con aggiunte filtrate sull'identita' colore del comandante.

## Principio Guida

Il cuore del progetto e' l'algoritmo di valutazione. Deve essere severo con liste illegali, incoerenti o artificialmente gonfiate, e deve premiare i mazzi che hanno un piano chiaro, carte coerenti, buone probabilita' di funzionare e strumenti realistici per vincere o interagire.

## Documentazione

- `docs/PRODUCT_SPEC.md`: specifica funzionale del prodotto.
- `docs/COMPETITOR_ANALYSIS.md`: prima analisi degli strumenti simili e delle opportunita' di differenziazione.
- `docs/TECH_STACK.md`: stack TypeScript, layout `src/` e pipeline di analisi.
- `docs/SCORING_ALGORITHM.md`: specifica vigente dell'algoritmo di valutazione.
- `docs/PROJECT_PLANNER.md`: planner operativo, decisioni prese e benchmark.
- `docs/ROADMAP.md`: milestone con stato di avanzamento.
- `docs/DEPLOYMENT.md`: deploy del Rating Lab (Node 22 + PostgreSQL).

Queste guide devono descrivere il codice attuale. Dopo ogni slice di sviluppo si aggiornano README, roadmap, planner e, se cambia lo scoring, `SCORING_ALGORITHM.md`.

## Stato Progetto

Il motore di valutazione e' implementato e testato (Vitest + typecheck, CI su Node 22). La priorita' resta calibrare lo scoring su liste reali prima della UI report.

Fatto: parser, validazione, tagging, combo Spellbook (seed allargato + cache), pipeline `analyzeCommanderDeck`, CLI, Rating Lab, 21 decklist reali oracle-tagged (inclusi landfall, blink, control, reanimator e tribal), consigli filtrati sul colore.

In corso: catalogo Spellbook completo (resta fuori dal repo), calibrazione restante. Voto e bracket sono output distinti. Benchmark e CLI usano lo stesso ritaglio `combo_piece`.

Non in corso: UI del report mazzo.

```bash
npm test
npm run typecheck
```

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
`--offline` (o `MTG_DECK_ORACLE_OFFLINE=1`) non chiama Spellbook ne' Scryfall: combo dal seed/cache, carte solo da `.cache/scryfall-cards.json`.
`--notes` (alias `--score-notes`) aggiunge una nota scritta al voto, per esempio la calibrazione del playgroup.

```bash
npm run analyze -- path/to/decklist.txt --offline
npm run analyze -- path/to/decklist.txt --notes "Core solido del martedi, non un 3."
npm run build-combo-cache
```
Le combo rilevate aggiungono anche tag `combo_piece` alle carte coinvolte, con evidence da `commander_spellbook`.
Di default prova anche a caricare i rating raccolti dal Rating Lab e usarli nel componente `card_quality`.
Se presente, legge anche `.cache/external-card-tags.json` per arricchire i tag funzionali con dati esterni tipo hub Archidekt/Moxfield.

Per disabilitare i rating esterni:

```bash
npm run analyze -- path/to/decklist.txt --no-card-ratings
```

Formato supportato per i tag esterni:

```json
{
  "cards": [
    {
      "name": "Reanimate",
      "source": "moxfield",
      "tags": ["Recursion", "Graveyard"]
    },
    {
      "name": "Underworld Breach",
      "tags": [
        { "tag": "Combo", "source": "commander_spellbook", "confidence": 0.95 },
        { "tag": "Graveyard", "source": "archidekt", "confidence": 0.8 }
      ]
    }
  ]
}
```

Il formato strutturato permette di tenere traccia di provenienza e confidenza dei tag mentre il motore continua a usare i tag funzionali normalizzati.

Per generare una prima cache tag dalle carte gia' presenti nella cache Scryfall locale:

```bash
npm run build-card-tags
```

Lo script legge `.cache/scryfall-cards.json` e scrive `.cache/external-card-tags.json`.
Per generare la cache partendo dal bulk data Scryfall delle carte Oracle legali in Commander:

```bash
npm run build-card-tags -- --source scryfall-bulk
```

Per aggiungere i tag `combo_piece` dal catalogo Commander Spellbook:

```bash
npm run build-card-tags -- --source spellbook
```

Per importare dump tag da hub Archidekt/Moxfield senza sovrascrivere il resto:

```bash
npm run build-card-tags -- --import path/to/archidekt-tags.json --import path/to/moxfield-tags.json
```

Di default lo script mergia i nuovi tag con quelli gia' presenti nel file di output, cosi' non elimina dati importati da Archidekt, Moxfield o Commander Spellbook.
Per rigenerare il file da zero:

```bash
npm run build-card-tags -- --replace
```

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
All'avvio il server puo' applicare seed list di rating:
`bestcard.txt` porta le carte valide e deduplicate a 1600; `topCommanderStaples.txt` recupera la vecchia classifica con scala 2100-1600.
I seed aggiornano solo carte senza voti registrati, cosi' non sovrascrivono rating gia' modificati dai match.

La prima carta viene scelta al 50% tra carte con rating sopra 1500 e al 50% tra carte con rating 1500 o inferiore, quando il DB ha candidati disponibili.
La seconda carta viene scelta al 30% random e al 70% tra carte con rating simile alla prima, includendo rating uguale e un range circa +/-10%.
I pulsanti `scarse`, `meh`, `forti` e `tutte` sopra le carte permettono di forzare la fascia della prima carta: scarse sotto 1500, meh da 1500 a 1700, forti sopra 1700, tutte con logica automatica.
La leaderboard carica 100 carte per pagina e arricchisce progressivamente le carte seed-only con immagini e dettagli Scryfall.

## Deploy

Il sito online e' il Rating Lab, non l'analyzer di mazzi. Espone homepage `/`, `/rating-lab`, leaderboard `/leaderboard`, grafico `/graph` e API `/api/rating-lab/*`.

Per preparare il database PostgreSQL:

```bash
psql "$DATABASE_URL" -f database/rating-lab.sql
```

Build e avvio produzione:

```bash
npm run build
npm start
```
