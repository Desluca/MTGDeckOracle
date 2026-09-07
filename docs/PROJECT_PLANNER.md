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
- eseguire parsing, risoluzione carte, validazione, tagging, analisi, combo e scoring;
- usare cache locale per dati Scryfall;
- produrre un report JSON utile per debug e test end-to-end.

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

## Benchmark Necessari

Creare una cartella futura `fixtures/decks/` con:

- `precon_low.deck`;
- `precon_modded.deck`;
- `casual_mid.deck`;
- `casual_strong.deck`;
- `high_power.deck`;
- `cedh.deck`;
- `illegal_200_cards.deck`;
- `illegal_color_identity.deck`;
- `bad_mana_base.deck`;
- `combo_fragments.deck`.

Ogni fixture dovrebbe avere un file atteso:

```text
expected_score_range
expected_bracket
expected_main_findings
```

La prima suite benchmark deve coprire almeno:

- precon-like;
- casual tuned;
- high power;
- cEDH-like;
- mazzo illegalmente gonfiato da 200 carte;
- mazzo Whtz-style legalmente sopra 100 carte;
- combo frammentate;
- mana base pessima.

## Decisioni Da Prendere

- Stack frontend: Next.js, Vite React o altro.
- Stack backend: Node.js/TypeScript, Python o altro.
- Database: solo file JSON iniziali, SQLite o PostgreSQL.
- Fonte dati carte: Scryfall API con cache locale.
- Database combo: integrazione con fonte esterna affidabile, dataset pubblico o database manuale curato.
- Lingua UI: italiano, inglese o entrambe.

## Rischi

- Valutazione percepita come arbitraria se non spiegata bene.
- Pesi iniziali dello scoring non ancora calibrati su benchmark reali.
- False combo rilevate per parsing troppo superficiale.
- Carte difficili da taggare automaticamente.
- Regole speciali di deckbuilding trattate come errori invece che come eccezioni legali.
- Power level Commander soggettivo tra playgroup diversi.
- Dati esterni incompleti o non aggiornati.

## Mitigazioni

- Algoritmo spiegabile e versionato.
- Benchmark manuali rivisti nel tempo.
- Pesi configurabili.
- Report con confidenza, non solo voto.
- Separazione tra legalita', potenza e coerenza.
- Validatore basato su regole configurabili, non su assunzioni fisse.
- CLI end-to-end per verificare mazzi reali prima della UI.

## Definition of Done Per MVP

L'MVP e' pronto quando:

- accetta una lista Commander testuale;
- riconosce le carte;
- segnala errori di legalita';
- calcola curva, categorie principali e consistenza;
- rileva almeno un set iniziale di combo;
- produce voto 0-100 con breakdown;
- distingue liste illegalmente gonfiate da liste legalmente piu' grandi per regole speciali;
- normalizza correttamente la consistenza dei mazzi piu' grandi;
- supera test su fixture benchmark.
