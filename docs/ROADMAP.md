# Roadmap

## Milestone 0 - Fondamenta

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

Obiettivo: rendere il motore usabile da un giocatore.

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
