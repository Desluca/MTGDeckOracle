# Project Planner

## Priorita' Strategica

La priorita' del progetto e' costruire un motore di valutazione affidabile. L'interfaccia deve rendere leggibile il risultato, ma il valore del prodotto nasce dall'algoritmo.

Ordine consigliato:

1. Definire modello dati.
2. Implementare parser e validazione.
3. Costruire scoring engine deterministico.
4. Creare benchmark di mazzi reali.
5. Solo dopo, costruire UI completa.

## Architettura Proposta

```text
frontend
  upload decklist
  report UI
  charts

backend
  analyzeCommanderDeck pipeline
  deck parser
  card database adapter
  combo data adapter
  commander legality validator
  deck analyzer
  scoring engine
  explanation generator

data
  card cache
  banlist
  functional tags
  combo database
  benchmark decks
```

## Moduli

### Deck Parser

Responsabilita':

- leggere liste testuali;
- riconoscere quantita' e sezioni;
- normalizzare nomi carte;
- segnalare ambiguita';
- produrre una struttura dati pulita.

Output atteso:

```text
DeckList
  commander[]
  mainboard[]
  metadata
  parse_warnings[]
```

### Card Data Adapter

Responsabilita':

- recuperare dati carta da Scryfall o cache locale;
- esporre mana value, colori, identita' colore, tipi, oracle text e legalita';
- gestire carte double-faced, adventure, partner e background.

### Commander Validator

Responsabilita':

- controllare regole del formato;
- applicare eventuali regole speciali del comandante o di carte che modificano il deckbuilding;
- applicare banlist;
- validare identita' colore;
- validare duplicati;
- calcolare `legality_cap`.

### Functional Tagger

Responsabilita':

- assegnare ruoli alle carte;
- distinguere ramp, draw, tutor, removal, win condition, protezione e sinergie;
- permettere override manuali per casi difficili.
- fornire una prima classificazione automatica basata su oracle text e type line.

### Combo Detector

Responsabilita':

- appoggiarsi a database combo affidabili quando possibile;
- normalizzare i dati combo importati;
- verificare combo complete;
- riconoscere output come mana infinito, danni infiniti, pescata infinita, token infiniti, mill infinito, lock o value engine;
- stimare numero pezzi;
- stimare accessibilita';
- stimare costo mana totale e costo nel turno di chiusura;
- verificare velocita' instant/sorcery e requisiti di board;
- valutare se il comandante trova, abilita, protegge o fa parte della combo;
- distinguere combo vincenti da value engine.

### Combo Data Adapter

Responsabilita':

- integrare fonti esterne affidabili, ad esempio Commander Spellbook o dataset equivalenti;
- evitare scraping fragile o non autorizzato;
- mantenere separato il database combo dallo scoring engine;
- salvare versione e fonte dei dati usati;
- permettere override manuali per combo mancanti, ambigue o valutate male.

### Scoring Engine

Responsabilita':

- calcolare sottopunteggi;
- usare valore carta contestuale, non solo rating statici;
- applicare moltiplicatori di consistenza;
- applicare penalita';
- applicare cap di legalita';
- produrre breakdown numerico.
- produrre una prima stima di bracket Commander.

### Contextual Card Evaluator

Responsabilita':

- partire da un valore base della carta;
- aumentare il valore se il ruolo e' scarso nel mazzo;
- ridurre il valore marginale quando il ruolo e' gia' saturo;
- spiegare perche' una carta contribuisce piu' o meno in quel mazzo specifico.

### Rating Lab

Responsabilita':

- mostrare due carte random all'utente;
- raccogliere quale carta viene percepita come piu' forte;
- aggiornare un rating Elo per carta;
- salvare confronti e rating in un database locale;
- proporre circa meta' dei confronti con carte a rating simile per affinare meglio i punteggi.

### Explanation Generator

Responsabilita':

- trasformare i dati numerici in spiegazione;
- evidenziare i 3-5 fattori principali del voto;
- suggerire miglioramenti concreti.

### Report Renderer

Responsabilita':

- trasformare il report tecnico in output leggibile;
- supportare formato JSON per integrazioni;
- supportare Markdown per lettura rapida;
- supportare HTML come base per una futura UI.

### Recommendation Engine

Responsabilita':

- suggerire miglioramenti basati su problemi strutturali;
- proporre esempi di carte da aggiungere;
- proporre possibili tagli a bassa sinergia o costo troppo alto;
- mantenere separata la logica dei consigli dallo scoring numerico.

### CLI Analyzer

Responsabilita':

- leggere una decklist da file;
- chiamare `analyzeCommanderDeck` (parse, resolve, validate, tag, combo, score, explain);
- usare cache locale per Scryfall e Commander Spellbook;
- `--offline` usa cache/seed per carte e combo, senza HTTP;
- `--notes` aggiunge testo di calibrazione al voto;
- produrre report JSON, Markdown o HTML.

## Modello Dati Iniziale

```text
Card
  id
  name
  mana_value
  colors
  color_identity
  type_line
  oracle_text
  legalities
  tags[]
  power_rating

DeckAnalysis
  legality
  commander
  colors
  card_count
  mana_curve
  role_counts
  detected_combos
  synergy_score
  consistency_score
  interaction_score
  final_score
  explanation
```

## Benchmark

La suite vive in `tests/fixtures/benchmarks/`. I profili sintetici coprono precon, casual, high power, cEDH-like, 200 carte illegali, Whtz legale, combo frammentate, mana base pessima e identita' colore illegale.

Liste reali oracle-tagged in `tests/fixtures/decks/real/` (bracket atteso = costruzione, non fascia di voto):

- `pantlaza-precon.deck` (2);
- `pantlaza-precon-modded.deck` (2);
- `muldrotha-casual.deck` (3);
- `kinnan-high-power.deck` (4, range 86-93 nei benchmark di scoring, allineato alla pipeline);
- `thrasios-tymna-cedh.deck` (5);
- `kess-spellslinger.deck` (4);
- `grand-arbiter-stax.deck` (3);
- `light-paws-voltron.deck` (2);
- `rhys-tokens.deck` (2);
- `urza-artifacts.deck` (4);
- `sythis-enchantress.deck` (2);
- `teysa-aristocrats.deck` (3);
- `aesi-landfall.deck` (3);
- `brago-blink.deck` (3);
- `teferi-control.deck` (4);
- `meren-reanimator.deck` (3);
- `krenko-goblins.deck` (3);
- `gishath-bad-mana.deck` (2);
- `whtz-120.deck` (4, oversized legale con Isochron);
- `kinnan-illegal-size.deck` (4);
- `pantlaza-illegal-color.deck` (2).

I range e i `expectedMainFindings` stanno in `benchmarkDecks.ts`. Il report deve citare il piano del comandante, non solo il voto.

Prossimo passo calibrazione: UI web del report mazzo dopo il nucleo di scoring.

## Decisioni Prese

- Linguaggio e test: TypeScript, Vitest, `tsconfig` strict, Node 22.
- Dati carte: Scryfall API con cache file in `.cache/scryfall-cards.json`.
- Combo: Commander Spellbook via API ufficiale, cache file, seed versionato in `knownComboSeed` (Isochron, Thoracle, Breach, Dualcaster).
- Rating persistenti: JSON locale in sviluppo, PostgreSQL in produzione (`DATABASE_URL`).
- Report mazzo: CLI oggi; UI web dopo M6.
- Rating Lab: sito Node gia' deployabile (Render).

Ancora aperte, non bloccanti per lo scoring:

- Stack frontend del report mazzo (Next.js, Vite React o altro).
- Lingua UI report (italiano, inglese o entrambe).

## Rischi

- Valutazione percepita come arbitraria se non spiegata bene.
- Path CLI/pipeline vs benchmark: i due path ritagliano `combo_piece` allo stesso modo; la soglia 4 vs 5 e' 93, cosi' un high-power a 92 resta Optimized.
- Seed combo piccolo vs catalogo Spellbook live: voti diversi online e `--offline` se manca la cache disco.
- Carte difficili da taggare automaticamente.
- Power level Commander soggettivo tra playgroup diversi.
- Dati esterni incompleti o non aggiornati (`.cache/` gitignored).

## Mitigazioni

- Algoritmo spiegabile e versionato.
- Benchmark manuali rivisti nel tempo.
- Pesi configurabili.
- Report con confidenza, non solo voto.
- Separazione tra legalita', potenza e coerenza.
- Validatore basato su regole configurabili, non su assunzioni fisse.
- CLI end-to-end per verificare mazzi reali prima della UI.

## Definition of Done Per MVP

Il motore (MVP CLI) e' coperto quando, e oggi lo e':

- accetta una lista Commander testuale;
- riconosce le carte;
- segnala errori di legalita';
- calcola curva, categorie principali e consistenza;
- rileva almeno un set iniziale di combo;
- produce voto 0-100 con breakdown;
- distingue liste illegalmente gonfiate da liste legalmente piu' grandi per regole speciali;
- normalizza correttamente la consistenza dei mazzi piu' grandi;
- supera test su fixture benchmark.

L'MVP prodotto (sito report) richiede in piu' M5, dopo che M6 ha liste reali coerenti tra CLI e test.
