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

### Backend Futuro

- Node.js con API HTTP.
- Adapter Scryfall per dati carte.
- Adapter combo per fonti esterne affidabili.
- Cache locale per ridurre chiamate esterne e rendere i risultati riproducibili.
- PostgreSQL per dati persistenti online, a partire dai rating raccolti dal Rating Lab.

### Frontend Futuro

- React o Next.js.
- Pagina import decklist.
- Pagina report con voto, bracket, curva, combo, punti forti e punti deboli.

## Principio Architetturale

Il motore di valutazione non deve dipendere dalla UI.

Flusso previsto:

```text
raw decklist
  -> parser
  -> card data adapter
  -> commander validator
  -> deck analyzer
  -> combo evaluator
  -> scoring engine
  -> explanation generator
  -> report UI
```

## Cartelle Iniziali

```text
src/
  analysis/
    deckStructureAnalyzer.ts
  card-data/
    cardDataSource.ts
    cachedCardDataSource.ts
    fileCardCache.ts
    inMemoryCardCache.ts
    scryfallCardDataSource.ts
    scryfallCardMapper.ts
  combo/
    commanderSpellbookComboDataProvider.ts
    commanderSpellbookTypes.ts
    comboDataSource.ts
    comboDetector.ts
    comboEvaluator.ts
    inMemoryComboDataSource.ts
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
    contextualCardEvaluator.ts
    scoringEngine.ts
  tagging/
    functionalTagger.ts
    tagOverrides.ts
  cli/
    analyzeDeck.ts
    cliOptions.ts
  index.ts
tests/
  fixtures/
    benchmarks/
      benchmarkDecks.ts
      benchmarkTypes.ts
```

## Prossimo Step Tecnico

Dopo parser, validatore, card-data, combo, Commander Spellbook, tagger, consistenza, scoring MVP, spiegazioni, recommendations, renderer report, CLI e benchmark iniziali, il prossimo blocco da implementare e':

1. sostituire parte dei benchmark sintetici con decklist reali;
2. aggiungere una UI web sopra il renderer HTML;
3. rendere i suggerimenti sensibili a budget, colori e target bracket;
4. ottimizzare il provider combo per ridurre il numero di chiamate su decklist complete.

## Deploy Online

La prima base deployabile usa un server Node.js compilato in `dist/` e PostgreSQL quando e' presente `DATABASE_URL`.

Rotte principali:

- `/`: homepage MTG Deck Oracle;
- `/rating-lab`: interfaccia Rating Lab;
- `/api/rating-lab/*`: API del laboratorio;
- `/health`: health check per hosting provider.

In sviluppo locale, se `DATABASE_URL` non e' configurato, il laboratorio usa ancora il file JSON in `.cache/`.

## Rating Data Nel Core

Il core scoring puo' ricevere un `CardRatingProvider` esterno.
I rating Elo raccolti dal Rating Lab vengono normalizzati in valori carta 0-10, mantenendo 1500 come valore neutro circa 5/10.
Questo permette al componente `card_quality` di usare dati reali raccolti dal laboratorio senza rendere il motore dipendente dalla UI o dal database.

Il contextual evaluator considera anche una prima forma di "linea del comandante": se il comandante segnala sinergia con il cimitero, il target ideale del pacchetto graveyard aumenta prima di applicare diminishing returns.
