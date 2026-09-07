# Competitor Analysis

## Obiettivo

Questo documento raccoglie una prima analisi degli strumenti esistenti per valutare mazzi Commander. Serve a capire cosa funziona, cosa manca e dove MTG Deck Oracle puo' differenziarsi.

## Strumenti Analizzati

### Commander Power Meter

Punti forti:

- usa i Commander Brackets ufficiali;
- produce uno scoring 0-100;
- considera Game Changers, tutor, fast mana, combo, sinergie e backbone del mazzo;
- dichiara l'uso di Commander Spellbook per le combo;
- supporta import da Moxfield, Archidekt e Manabox.

Limiti o rischi da verificare:

- non e' chiaro quanto pesi davvero la consistenza statistica;
- non e' chiaro come tratti liste non standard o volutamente gonfiate;
- il modello sembra molto centrato sui segnali di power level, meno sulla probabilita' concreta di vedere i pezzi.

### EDHcheck

Punti forti:

- valuta bracket, power score, combo, tutor e fast mana;
- spiega che il power level dipende da velocita', consistenza e resilienza;
- considera ramp, mana base, draw, interaction e compattezza delle win condition;
- usa Commander Spellbook per le combo.

Limiti o rischi da verificare:

- la scala 1-10 puo' restare soggettiva se non accompagnata da un breakdown molto chiaro;
- bisogna testare casi limite come mazzi con troppe carte, mana base pessima o combo incomplete;
- non e' chiaro se penalizzi abbastanza la probabilita' di accesso ai pezzi chiave.

### MTG Master AI Commander Deck Analyzer

Punti forti:

- produce report pratici con raccomandazioni;
- distingue general score e bracket score;
- considera mana, ramp, draw, interaction, resilienza, tutor, combo compatte e pattern ad alto rischio;
- punta su spiegazioni in linguaggio naturale.

Limiti o rischi da verificare:

- se l'analisi e' molto AI-driven, puo' essere meno riproducibile;
- potrebbe essere difficile capire esattamente perche' un voto cambia;
- serve verificare quanto sia deterministico su stesso input.

### Spelltrace

Punti forti:

- mostra land count, curva di mana, combo e power assessment;
- documenta un sistema impact-based con rating per categorie come removal, tutor, fast mana e draw;
- applica moltiplicatori di sinergia e bonus di categoria.

Limiti o rischi da verificare:

- i bonus per singole carte possono premiare troppo la potenza individuale;
- se i deck-wide adjustments sono troppo semplici, possono essere manipolati;
- serve verificare quanto distingua una combo completa da pezzi di combo non realistici.

### EDHREC, Moxfield e Archidekt

Punti forti:

- EDHREC e' ottimo per popolarita', sinergia e suggerimenti per comandante;
- Moxfield e Archidekt sono ottimi deckbuilder;
- Archidekt e Moxfield aiutano con categorie, playtest e import/export;
- questi strumenti sono standard de facto per molti giocatori Commander.

Limiti:

- non sono nati principalmente per dare un voto affidabile al power level;
- EDHREC indica cosa viene giocato spesso, non necessariamente cosa rende un mazzo piu' forte;
- popolarita' e forza non coincidono.

## Cosa Funziona Nei Competitor

- Import semplice da decklist o siti di deckbuilding.
- Uso dei Commander Brackets come linguaggio condiviso.
- Rilevamento di combo tramite Commander Spellbook.
- Conteggio di tutor, fast mana e Game Changers.
- Breakdown per ramp, draw, interaction e win condition.
- Report leggibile per Rule Zero e discussione pre-partita.

## Uso Di Database Combo Esterni

Per la parte combo ha senso appoggiarsi a strumenti e database gia' affidabili, invece di ricostruire tutto da zero. La parte difficile non e' solo sapere che due o tre carte formano una combo, ma capire quanto quella combo conta nel mazzo specifico.

Commander Spellbook espone una REST API pubblica tramite `https://backend.commanderspellbook.com`. Gli endpoint utili includono ricerca varianti con `/variants/` e analisi decklist con `/find-my-combos`. Questo rende possibile integrare combo reali senza scraping fragile.

Approccio consigliato:

- usare fonti esterne per identificare combo note;
- importare pezzi richiesti, risultato prodotto e note operative quando disponibili;
- rilevare se nel mazzo ci sono combo complete o parziali;
- valutare internamente costo, accessibilita', velocita', fragilita' e sinergia col comandante.

Esempio:

- due carte producono mana infinito e danni infiniti;
- altre tre carte formano una seconda combo;
- il nostro sistema non deve limitarsi a dire "ci sono due combo";
- deve spiegare quale chiude davvero la partita, quanto costa, se funziona a velocita' istantaneo, se richiede board gia' pronto, se il comandante aiuta e quanto e' facile trovare i pezzi.

## Cosa Sembra Mancare

- Penalita' robuste per liste fuori formato, come mazzi da 120, 150 o 200 carte senza una regola che le renda legali.
- Modello esplicito di consistenza basato su probabilita'.
- Distinzione netta tra "carta forte presente" e "carta forte accessibile".
- Penalita' per carte forti ma scollegate dal piano di gioco.
- Valutazione della probabilita' di lanciare le spell in curva, non solo della curva media.
- Gestione severa di combo incomplete o troppo fragili.
- Spiegazione del voto collegata direttamente ai sottopunteggi.
- Benchmark pubblici con casi limite.

## Opportunita' Per MTG Deck Oracle

MTG Deck Oracle dovrebbe posizionarsi come valutatore piu' rigoroso e spiegabile.

Differenziatori:

- scoring 0-100 con breakdown trasparente;
- bracket Commander come output secondario, non unico criterio;
- hard cap per liste illegali;
- supporto a regole speciali di deckbuilding, come commander che modificano la dimensione del mazzo;
- normalizzazione di consistenza per dimensione mazzo;
- probabilita' ipergeometriche per accesso a carte/funzioni chiave;
- database benchmark con mazzi reali e casi limite;
- valutazione contestuale delle combo invece di semplice conteggio;
- spiegazione chiara del perche' il voto non sale anche se ci sono tante carte potenti.

## Requisiti Derivati Dallo Studio

1. Una decklist non valida non deve mai ottenere un voto alto.
2. Un mazzo da piu' di 100 carte deve essere prima validato rispetto alle regole applicabili, incluse eventuali eccezioni del comandante.
3. Un mazzo illegalmente gonfiato deve perdere punteggio per legalita' e consistenza.
4. Un mazzo legalmente piu' grande deve essere normalizzato statisticamente, non bocciato automaticamente.
5. Le combo devono essere rilevate tramite fonti affidabili quando possibile.
6. Le combo devono essere valutate in base a completezza, accessibilita', costo, velocita', protezione e ruolo del comandante.
7. I tutor devono aumentare il punteggio solo se cercano carte realmente decisive.
8. I Game Changers devono influenzare il bracket, ma non sostituire l'intera valutazione.
9. Il report deve separare potenza, consistenza, legalita' e fit col tavolo.
10. Lo stesso mazzo deve produrre lo stesso risultato con la stessa versione dell'algoritmo.

## Prossime Verifiche

Per completare lo studio servono test pratici:

- caricare lo stesso precon su piu' strumenti e confrontare i risultati;
- caricare un mazzo forte ma illegale da 200 carte;
- caricare un mazzo con combo incomplete;
- caricare un mazzo con tante staples ma nessun piano coerente;
- caricare un mazzo casual molto sinergico ma senza carte costose;
- confrontare spiegazione, voto e bracket restituiti.

Questi test dovrebbero diventare fixture del nostro algoritmo.
