# Tech Stack

## Scelta Iniziale

Il progetto parte con TypeScript.

Motivi:

- modelli dati fortemente tipizzati;
- scoring engine testabile senza UI;
- buon supporto per API, frontend e tooling;
- facile integrazione futura con Next.js, Vite, Node.js o servizi serverless;
- ecosistema solido per test automatici.

## Stack Proposto

### Core Engine

- TypeScript.
- Moduli puri in `src/domain/`.
- Test con Vitest.
- Configurazione strict in `tsconfig.json`.

### Backend (Rating Lab e API)

- Node.js con server HTTP in `src/rating-lab/server.ts`.
- Adapter Scryfall per dati carte.
- Adapter combo Commander Spellbook.
- Cache locale in `.cache/` per risultati riproducibili.
- PostgreSQL per i rating Elo quando c'e' `DATABASE_URL`.

### Frontend Report Mazzo

Non iniziato. Stack ancora aperto (React o Next.js). Il Rating Lab ha gia' HTML servito dal server Node.

## Principio Architetturale

Il motore di valutazione non deve dipendere dalla UI.

Flusso previsto:

```text
raw decklist
  -> parser
  -> card data adapter
  -> commander validator
  -> analyzeCommanderDeck pipeline
  -> deck analyzer
  -> combo evaluator
  -> scoring engine
  -> explanation generator
  -> report UI
```

## Layout Sorgenti

```text
src/
  analysis/
    deckStructureAnalyzer.ts
  card-data/
    cardDataSource.ts
    cachedCardDataSource.ts
    fileCardCache.ts
    inMemoryCardCache.ts
    inMemoryCardDataSource.ts
    cacheOnlyCardDataSource.ts
    scryfallBulkCardSource.ts
    scryfallCardDataSource.ts
    scryfallCardMapper.ts
  combo/
    commanderSpellbookComboDataProvider.ts
    commanderSpellbookTypes.ts
    comboCache.ts
    comboDataSource.ts
    comboDetector.ts
    comboEvaluator.ts
    fileComboCache.ts
    inMemoryComboDataSource.ts
    knownComboSeed.ts
  pipeline/
    analyzeCommanderDeck.ts
  consistency/
    consistencyAnalyzer.ts
  deck/
    resolveDeckList.ts
  domain/
    analysis.ts
    card.ts
    combo.ts
    deck.ts
    legality.ts
    scoring.ts
    index.ts
  explanation/
    explanationGenerator.ts
  parser/
    deckListParser.ts
  probability/
    hypergeometric.ts
  recommendations/
    recommendationEngine.ts
  ratings/
    cardRatingProvider.ts
    ratingStoreCardRatingProvider.ts
  report/
    reportRenderer.ts
  rating-lab/
    elo.ts
    matchmaker.ts
    postgresRatingStore.ts
    ratingStore.ts
    ratingStoreFactory.ts
    ratingTypes.ts
    scryfallRandomCardSource.ts
    server.ts
  scoring/
    commanderThemes.ts
    contextualCardEvaluator.ts
    scoringEngine.ts
  tagging/
    cardTagProvider.ts
    cardTagSnapshotBuilder.ts
    comboTagProvider.ts
    functionalTagger.ts
    tagOverrides.ts
  cli/
    analyzeDeck.ts
    buildCardTagCache.ts
    buildComboCache.ts
    cliOptions.ts
  index.ts
tests/
  fixtures/
    benchmarks/
      benchmarkDecks.ts
      benchmarkTypes.ts
      loadFixtureDeck.ts
    cards/
      stapleCards.ts
    combos/
      fixtureCombos.ts
    decks/
      real/
        kinnan-high-power.deck
        kess-spellslinger.deck
        grand-arbiter-stax.deck
        light-paws-voltron.deck
        rhys-tokens.deck
        muldrotha-casual.deck
        pantlaza-precon.deck
        pantlaza-precon-modded.deck
        pantlaza-illegal-color.deck
        kinnan-illegal-size.deck
        gishath-bad-mana.deck
        thrasios-tymna-cedh.deck
        whtz-120.deck
```

La CLI `npm run analyze` orchestra `analyzeCommanderDeck`.
I benchmark in `loadFixtureDeck.ts` ritagliano `combo_piece` come la pipeline, cosi' CLI e test non divergono.
`recommendDeckImprovements` propone solo carte dentro l'identita' colore e salta quelle gia' in lista.
`--offline` o `MTG_DECK_ORACLE_OFFLINE=1` non chiama Commander Spellbook ne' Scryfall: combo da seed/cache disco, carte da `.cache/scryfall-cards.json` tramite `CacheOnlyCardDataSource`.
`--notes` / `--score-notes` passa testo extra a `scoreNotes` nella pipeline.
I benchmark in `loadFixtureDeck.ts` ritagliano `combo_piece` come la pipeline, cosi' CLI e test non divergono.
`recommendDeckImprovements` propone solo carte dentro l'identita' colore e salta quelle gia' in lista.
`--offline` o `MTG_DECK_ORACLE_OFFLINE=1` non chiama Commander Spellbook ne' Scryfall: combo da seed/cache disco, carte da `.cache/scryfall-cards.json` tramite `CacheOnlyCardDataSource`.
`--notes` / `--score-notes` passa testo extra a `scoreNotes` nella pipeline.
Il seed alimenta anche i lookup per carta quando la cache disco e' vuota, senza bloccare le query live per carte sconosciute.
La cache disco in `.cache/commander-spellbook-combos.json` ha sempre priorita' sul seed.
`npm run build-combo-cache` puo' popolare il catalogo completo in locale; `.cache/` e' gitignored.
Il seed in `knownComboSeed` e' il catalogo riproducibile di CI e `--offline`: poche linee usate dalle fixture, non il dump Spellbook.
Il tagging tratta shroud come protection, insieme a hexproof e indestructible.
Il tag `stax` copre anche testi tipo "each player can't" e "cost {1} more".

CI GitHub Actions (`.github/workflows/ci.yml`) gira su Node 22: `npm ci`, `npm test`, `npm run typecheck`.

## Prossimo Step Tecnico

Dopo path di scoring unificato e consigli filtrati sul colore:

1. altre liste competitive;
2. UI web del report mazzo solo dopo il nucleo di scoring.

## Deploy Online

La prima base deployabile usa un server Node.js compilato in `dist/` e PostgreSQL quando e' presente `DATABASE_URL`.

Rotte principali del Rating Lab:

- `/`: homepage MTG Deck Oracle;
- `/rating-lab`: interfaccia confronti Elo;
- `/leaderboard`: classifica carte;
- `/graph`: attivita' voti;
- `/api/rating-lab/*`: API del laboratorio;
- `/health`: health check per hosting provider.

Non c'e' una rotta di analisi mazzo: quello resta CLI finche' non esiste M5.

In sviluppo locale, se `DATABASE_URL` non e' configurato, il laboratorio usa ancora il file JSON in `.cache/`.

## Rating Data Nel Core

Il core scoring puo' ricevere un `CardRatingProvider` esterno.
I rating Elo raccolti dal Rating Lab vengono normalizzati in valori carta 0-10, mantenendo 1500 come valore neutro circa 5/10.
Questo permette al componente `card_quality` di usare dati reali raccolti dal laboratorio senza rendere il motore dipendente dalla UI o dal database.

Il contextual evaluator considera la linea del comandante: se il comandante segnala graveyard, artifacts, tokens, spellslinger, lifegain, aristocrats, counters, enchantments, equipment o tribal, il target ideale di quel pacchetto aumenta prima di applicare diminishing returns.
`classifyCommanderBracket` assegna il tavolo Wizards da Game Changers, combo da due carte, extra turn e mass land denial. Il voto resta indipendente.
Il piano di gioco premia densita' di ruoli e copertura delle categorie chiave, non il semplice conteggio di carte taggate.
La mana base abbassa il target di terre se il mazzo ha gia' ramp/fast mana, cosi' un profilo cEDH con poche terre non viene trattato come un precon senza accelerazione.

## Tag Esterni

Il tagging resta deterministico con inferenza dal testo Oracle, ma puo' essere arricchito da un `CardTagProvider`.
La CLI carica automaticamente `.cache/external-card-tags.json` se il file esiste.
Questo file e' pensato come cache/import per segnali raccolti da hub esterni come Archidekt o Moxfield, normalizzando label comuni come `Card Draw`, `Removal`, `Graveyard` o `Board Wipes` nei tag interni.
Il provider puo' anche conservare evidence strutturate con `source` e `confidence`, cosi' una futura pipeline sulle circa 30k carte potra' pesare diversamente tag da Oracle text, hub community, Commander Spellbook e override manuali.
Il detector combo alimenta lo stesso sistema: dopo avere interrogato Commander Spellbook, le carte presenti in combo rilevate vengono ritaggate come `combo_piece` prima dello scoring finale.
Lo script `npm run build-card-tags` genera una snapshot `.cache/external-card-tags.json` dalle carte gia' presenti nella cache Scryfall locale, dal bulk data Scryfall con `--source scryfall-bulk`, oppure dal catalogo combo Commander Spellbook con `--source spellbook`.
`--import` accetta dump JSON da hub Archidekt/Moxfield e li mergia nello stesso file.
Di default fa merge con l'output esistente, deduplicando per carta, tag e fonte e conservando la confidenza piu' alta; `--replace` permette di rigenerare da zero.
