# Product Spec

## Visione

MTG Deck Oracle e' un assistente di analisi per mazzi Commander. Il prodotto deve aiutare un giocatore a rispondere a tre domande:

1. Il mio mazzo e' legale e costruito correttamente?
2. Quanto e' forte davvero il mazzo in una partita reale?
3. Cosa posso migliorare senza perdere l'identita' del mazzo?

La valutazione deve essere comprensibile, motivata e utile. Un numero da 0 a 100 senza spiegazione non basta.

Stato rispetto al codice: il flusso sotto e' coperto dalla CLI, da `analyzeCommanderDeck` e dalla pagina `/analyze` (HTML Node, italiano). L'import da URL Moxfield/Archidekt e' Milestone 7.

## Utenti Target

- Giocatori casual che vogliono capire il power level del mazzo.
- Playgroup che vogliono confrontare i mazzi prima di giocare.
- Builder esperti che vogliono trovare buchi strutturali.
- Negozi o community che vogliono usare bracket piu' affidabili per eventi Commander.

## Flusso Utente Principale

1. L'utente incolla o carica la lista del mazzo.
2. Il sistema normalizza i nomi delle carte e identifica comandante, main deck e eventuali sezioni.
3. Il sistema verifica legalita' e struttura della lista.
4. Il sistema analizza categorie funzionali, curva, sinergie, combo e consistenza.
5. Il sistema produce voto, bracket di costruzione e spiegazione scritta del voto.
6. L'utente puo' esplorare dettagli e suggerimenti.

## Requisiti Funzionali

### Import Mazzo

Il sistema deve supportare:

- liste testuali semplici;
- formati con quantita' davanti al nome carta;
- formati con set e collector number, ad esempio `1 Jeska, Thrice Reborn (SLD) 1201`;
- formati `1x Card Name`;
- formati con set tra quadre, ad esempio `1 Sol Ring [CMM:400]`;
- sezioni esportate come commenti, ad esempio `// COMMANDER` e `// DECK`;
- sezioni come Commander, Deck, Creatures, Lands, Sideboard;
- import futuro da servizi esterni tramite URL o API.

Il parser deve essere tollerante sugli spazi e sui formati, ma severo sulla validita' finale della lista.

### Validazione Commander

Il sistema deve controllare:

- esistenza delle carte;
- esatto numero di carte richiesto dal formato;
- eventuali eccezioni o modifiche alle regole di deckbuilding date dal comandante o da altre carte;
- presenza di uno o piu' comandanti validi;
- singleton rule, salvo terre base e carte con regole speciali;
- identita' colore;
- carte bannate;
- carte non legali o non riconosciute.

Le liste non valide non devono ricevere un punteggio alto. Devono ricevere penalita' pesanti o una classificazione separata come "non valutabile come Commander legale".

Le liste piu' grandi di 100 carte non devono invece essere penalizzate automaticamente se una regola speciale le rende legali. In quel caso il sistema deve separare due domande:

- il mazzo e' legale con questa dimensione?
- la dimensione maggiore rende il mazzo meno consistente, o il comandante/piano di gioco compensa quel costo?

### Analisi Mazzo

Il report deve includere:

- curva di mana;
- distribuzione colori;
- numero e qualita' delle terre;
- fonti di ramp;
- card draw e card advantage;
- tutor;
- removal singoli e globali;
- counterspell e stack interaction;
- protezioni;
- recursion;
- graveyard hate;
- win condition;
- combo note;
- sinergie con il comandante;
- carte ad alto impatto.

### Analisi Combo

Il sistema puo' appoggiarsi a database combo esterni affidabili per riconoscere le combinazioni note presenti nella lista. La valutazione finale, pero', deve essere contestuale al mazzo.

Per ogni combo trovata il report deve indicare:

- carte coinvolte;
- risultato prodotto, ad esempio mana infinito, danni infiniti, pescata infinita, token infiniti o lock;
- numero di pezzi richiesti;
- costo di mana complessivo;
- costo necessario nel turno in cui si prova a chiudere;
- velocita' instant o sorcery;
- requisiti di board, come permanenti gia' in campo o creature senza summoning sickness;
- ruolo del comandante, se cerca, abilita, protegge o fa parte della combo;
- accessibilita' tramite tutor, draw, recursion o ridondanza;
- fragilita' rispetto a removal, counterspell o hate specifico.

Una combo non deve alzare molto il voto solo perche' esiste nella lista. Deve alzarlo se e' realmente trovabile, lanciabile e coerente con il piano del mazzo.

### Valutazione Finale

Il voto deve unire:

- potenza teorica delle carte;
- coerenza con il piano di gioco;
- consistenza statistica;
- velocita';
- resilienza;
- capacita' di interagire;
- qualita' delle win condition;
- rischio di bricking;
- penalita' per illegalita', dimensione errata o costruzione incoerente;
- normalizzazione statistica per confrontare mazzi di dimensioni diverse su una base comune.

## Requisiti Non Funzionali

- Spiegazioni trasparenti: ogni voto deve essere motivato.
- Aggiornabilita': database carte, banlist e combo devono essere aggiornabili.
- Separazione tra algoritmo e UI.
- Testabilita': l'algoritmo deve poter essere testato con mazzi fixture.
- Riproducibilita': stesso input e stessa versione dati devono produrre stesso output.

## Metriche di Qualita'

- Accuratezza nel riconoscimento delle carte.
- Capacita' di penalizzare liste illegali o gonfiate.
- Coerenza del voto rispetto a benchmark manuali.
- Utilita' dei suggerimenti.
- Basso numero di falsi positivi sulle combo.

## Fuori Scope Iniziale

- Marketplace o suggerimenti basati sul prezzo.
- Login utente.
- Salvataggio cloud dei mazzi.
- Simulatore completo di partite multiplayer.
- Valutazione perfetta del meta locale, che potra' diventare un modulo futuro.
