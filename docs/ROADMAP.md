# Roadmap

Le milestone restano il piano di prodotto. L'ordine reale non e' strettamente M0→M7: la calibrazione (M6) parte prima della UI report (M5).

## Stato Attuale

| Milestone | Stato |
| --- | --- |
| M0 Fondamenta | Fatto |
| M1 Parser e validazione | Fatto (liste testuali; niente import URL) |
| M2 Analisi strutturale | Fatto nel motore (curva e ruoli nel report CLI; grafici UI dopo) |
| M3 Scoring engine MVP | Fatto. Voto e bracket sono output distinti. |
| M4 Combo e sinergie | Parziale: adapter Spellbook, seed Isochron/Thoracle/Breach/Dualcaster, cache; catalogo pieno non in repo |
| M5 UI MVP report mazzo | Non iniziato (il Rating Lab non sostituisce questa milestone) |
| M6 Calibrazione | In corso: 21 liste reali, `expectedMainFindings` sul report; bracket da costruzione |
| M7 Miglioramenti avanzati | Parziale: recommendation strutturali filtrate sul colore; URL, budget, versioning no |

Prossimi slice: UI report dopo il nucleo di scoring.

## Milestone 0 - Fondamenta

Stato: fatto.

Obiettivo: chiarire dominio, dati e criteri di valutazione.

Attivita':

- Definire formati supportati per import mazzo.
- Scegliere stack tecnico.
- Definire modello dati carta e mazzo.
- Definire pesi iniziali dello scoring.
- Preparare prime fixture di test.

Output:

- documentazione aggiornata;
- modello dati iniziale;
- lista benchmark minima;
- scelta stack.

## Milestone 1 - Parser e Validazione

Stato: fatto per liste testuali. Import da URL Moxfield/Archidekt resta M7.

Obiettivo: trasformare una decklist in dati affidabili.

Attivita':

- Implementare parser liste testuali.
- Integrare Scryfall o cache dati carte.
- Riconoscere comandante e main deck.
- Validare identita' colore, banlist, duplicati e dimensione.
- Gestire errori leggibili per l'utente.

Output:

- decklist normalizzata;
- report legalita';
- test su liste valide e invalide.

## Milestone 2 - Analisi Strutturale

Stato: fatto nel motore. I grafici arrivano con M5.

Obiettivo: produrre una panoramica utile del mazzo.

Attivita':

- Calcolare curva di mana.
- Calcolare distribuzione colori e fonti mana.
- Classificare terre, ramp, draw, removal, tutor e win condition.
- Evidenziare carte ad alto impatto.
- Rilevare anomalie come troppe poche terre o curva troppo alta.

Output:

- breakdown del mazzo;
- grafici o dati pronti per grafici;
- prime spiegazioni testuali.

## Milestone 3 - Scoring Engine MVP

Stato: fatto. Il voto 0-100 e il bracket ufficiale sono separati. Game Changers e combo da due carte alzano il minimo di costruzione; 4 vs 5 usa il voto.

Obiettivo: generare un voto 0-100 spiegabile.

Attivita':

- Implementare sottopunteggi.
- Applicare cap di legalita'.
- Applicare penalita' dimensione mazzo.
- Implementare moltiplicatore di consistenza.
- Usare probabilita' ipergeometriche per accesso a funzioni chiave.
- Generare breakdown numerico.

Output:

- voto finale;
- bracket stimato;
- spiegazione dei fattori principali;
- test specifici su mazzi da 100, 120, 150 e 200 carte.

## Milestone 4 - Combo e Sinergie

Stato: parziale. `CommanderSpellbookComboDataProvider` + `FileComboCache` + seed Isochron/Thoracle/Breach/Dualcaster. `--offline` usa il seed. Il catalogo completo si ottiene con `npm run build-combo-cache` e resta in `.cache/` (gitignored). Il seed resta piccolo e versionato; non si committano migliaia di combo Spellbook.

Obiettivo: riconoscere non solo carte forti, ma interazioni reali.

Attivita':

- Integrare una fonte combo affidabile o un dataset curato.
- Rilevare combo complete.
- Rilevare combo parziali senza premiarle troppo.
- Stimare accessibilita' tramite tutor e draw.
- Stimare costo mana, velocita' instant/sorcery e requisiti di board.
- Valutare se il comandante e' un pezzo, un abilitatore, un tutor o una protezione per la combo.
- Collegare combo al punteggio win condition e consistenza.

Output:

- lista combo trovate;
- risultato prodotto da ogni combo, come mana infinito, danni infiniti, pescata infinita o lock;
- spiegazione del loro impatto;
- penalita' per combo incomplete, lente, fragili o non realistiche.

## Milestone 5 - UI MVP

Stato: non iniziato. Il Rating Lab (`/rating-lab`) raccoglie Elo carte; non e' la pagina di analisi mazzo.

Obiettivo: rendere il motore usabile da un giocatore senza CLI.

Attivita':

- Pagina upload/incolla decklist.
- Pagina report.
- Visualizzazione curva mana.
- Sezioni punti forti, deboli e consigli.
- Evidenziazione errori bloccanti.

Output:

- sito navigabile;
- report leggibile;
- esperienza completa end-to-end.

## Milestone 6 - Calibrazione

Stato: in corso. Si lavora su questa milestone prima di M5.

Suite attuale: profili sintetici in `tests/fixtures/benchmarks/benchmarkDecks.ts` e 21 liste reali in `tests/fixtures/decks/real/` (Pantlaza precon e precon-modded, Muldrotha, Kinnan, Thrasios/Tymna, Gishath, Whtz 120, Kess spellslinger, Grand Arbiter stax, Light-Paws voltron, Rhys tokens, Urza artifacts, Sythis enchantress, Teysa aristocrats, Aesi landfall, Brago blink, Teferi control, Meren reanimator, Krenko goblins, due illegalita').

Aperto: UI del report mazzo. Il bracket non e' piu' una fascia del voto.

Obiettivo: rendere il voto credibile.

Attivita':

- Aggiungere mazzi benchmark.
- Confrontare voto algoritmo con valutazioni manuali.
- Correggere pesi.
- Aggiungere casi limite.
- Validare liste competitive e casual.

Output:

- scoring piu' stabile;
- range attesi per archetipi;
- regressioni automatiche.

## Milestone 7 - Miglioramenti Avanzati

Stato: parziale. Recommendation strutturali in CLI, filtrate sull'identita' colore del comandante. Restano URL, budget, versioning e UI.

Obiettivo: aumentare qualita' e profondita' del report.

Possibili attivita':

- Profili di meta o playgroup.
- Suggerimenti di sostituzione carte.
- Modalita' budget.
- Supporto multilingua.
- Import da URL Moxfield/Archidekt.
- Versionamento dell'algoritmo.
- Report condivisibile.

## Criteri di Successo

Il progetto funziona se:

- non premia liste illegali o gonfiate;
- riconosce differenza tra potenza teorica e consistenza reale;
- spiega il voto in modo convincente;
- aiuta il giocatore a migliorare il mazzo;
- produce risultati coerenti su mazzi benchmark.
