# Scoring Algorithm

## Obiettivo

L'algoritmo deve stimare quanto un mazzo Commander sia forte, consistente e adatto al suo piano di gioco. Il voto finale va da 0 a 100 e deve sempre essere accompagnato da una spiegazione.

La regola principale e': una carta forte aumenta il punteggio solo se il mazzo puo' trovarla, lanciarla, proteggerla o sfruttarla in modo coerente.

## Pipeline di Valutazione

1. Parsing lista.
2. Normalizzazione carte tramite database esterno, ad esempio Scryfall.
3. Validazione Commander.
4. Classificazione funzionale delle carte.
5. Analisi statistica della consistenza.
6. Rilevamento combo e sinergie.
7. Calcolo sottopunteggi.
8. Applicazione penalita' e cap.
9. Generazione spiegazione.

## Validazione Prima del Voto

Prima di calcolare la forza del mazzo, il sistema deve stabilire se la lista e' valutabile come Commander.

### Errori Bloccanti

Questi errori impediscono un voto pieno:

- mazzo senza comandante valido;
- mazzo con carte non riconosciute;
- carte fuori identita' colore;
- carte bannate;
- duplicati illegali;
- dimensione diversa da 100 carte, comandante incluso, salvo formati o regole speciali dichiarate.

Una lista illegale puo' ricevere un report, ma il voto deve essere limitato da un cap severo.

Esempio, se nessuna carta o comandante modifica la regola di deckbuilding:

- mazzo Commander legale da 100 carte: voto massimo 100;
- mazzo illegalmente da 101-110 carte: voto massimo 70, con penalita' di consistenza;
- mazzo illegalmente da 111-150 carte: voto massimo 45;
- mazzo illegalmente da oltre 150 carte: voto massimo 25;
- mazzo con carte bannate o identita' colore illegale: voto massimo 40;
- mazzo senza comandante valido: voto massimo 30.

Questo evita il problema dei siti che premiano liste enormi solo perche' contengono molte carte forti. Tuttavia non bisogna assumere che ogni mazzo sopra 100 carte sia automaticamente pessimo o illegale: alcune carte possono modificare le regole di costruzione del mazzo. In questi casi il cap di legalita' deve seguire la regola applicabile, mentre la valutazione di potenza deve comunque normalizzare probabilita' e consistenza.

## Struttura del Voto

Punteggio base:

```text
score = weighted_sum(subscores) - penalties
score = clamp(score, 0, legality_cap)
```

Sottopunteggi consigliati:

| Area | Peso |
| --- | ---: |
| Legalita' e struttura | 15 |
| Consistenza | 20 |
| Piano di gioco e sinergia comandante | 15 |
| Qualita' media carte | 10 |
| Ramp e mana base | 10 |
| Card advantage | 8 |
| Interaction | 8 |
| Win condition e combo | 8 |
| Resilienza | 4 |
| Velocita' | 2 |

I pesi vanno calibrati con test su mazzi reali. La consistenza deve pesare molto perche' Commander e' singleton e la probabilita' di trovare pezzi chiave cambia drasticamente con dimensione, tutor e ridondanza.

## Legalita' e Struttura

Questo modulo valuta:

- numero totale carte;
- presenza comandante;
- regole singleton;
- identita' colore;
- banlist;
- proporzione terre/non terre;
- presenza di categorie minime per giocare una partita.

Penalita' importanti:

- lista troppo grande;
- troppe poche terre senza ramp sufficiente;
- troppe carte costose senza accelerazione;
- molte carte fuori piano;
- molte carte non lanciabili per problemi di colori.

## Consistenza

La consistenza misura la probabilita' che il mazzo faccia cio' che promette.

Componenti:

- probabilita' di avere terre e colori nei primi turni;
- probabilita' di trovare ramp entro turno 2-3;
- probabilita' di trovare draw engine o refill;
- probabilita' di accedere a win condition;
- ridondanza di effetti chiave;
- dipendenza eccessiva da una singola carta non comandante.

### Normalizzazione Dimensione Mazzo

La dimensione effettiva del mazzo influenza la probabilita' di pescare carte specifiche. Se il mazzo supera la dimensione standard, non basta applicare una penalita' fissa: bisogna calcolare quanto cambia la consistenza.

Questa non deve essere una penalita' automatica di principio. Un mazzo legalmente piu' grande puo' essere forte se il comandante o il piano di gioco compensano la varianza, per esempio con draw, tutor, ridondanza, payoff che premiano il deck size o regole speciali. L'algoritmo deve normalizzare la valutazione su una base comune e poi decidere se il mazzo e' davvero meno consistente.

Formula iniziale:

```text
baseline_size = expected_or_reference_deck_size
size_ratio = baseline_size / deck_size
consistency_multiplier = size_ratio ^ 1.4
```

Esempi:

| Dimensione | Moltiplicatore consistenza |
| ---: | ---: |
| 100 | 1.00 |
| 110 | 0.88 |
| 150 | 0.57 |
| 200 | 0.38 |

Un mazzo da 200 carte puo' contenere molte bombe, ma il sistema deve riconoscere che le vedra' molto meno spesso rispetto a un mazzo da 100. Se pero' il comandante rende legale o premia quel deck size, la penalita' non deve arrivare dalla legalita': deve arrivare, se serve, dall'analisi probabilistica.

### Probabilita' di Accesso

Per carte singole o categorie funzionali, usare una stima ipergeometrica:

```text
P(almeno 1 successo) = 1 - C(deck_size - successes, draws) / C(deck_size, draws)
```

Dove:

- `deck_size` e' il numero di carte nel mazzo pescabile;
- `successes` e' il numero di carte che svolgono la funzione cercata;
- `draws` e' il numero di carte viste entro un certo turno.

Esempio: probabilita' di vedere almeno una fonte di ramp entro turno 3, considerando mano iniziale e pescate.

## Piano di Gioco

Il sistema deve identificare il piano principale:

- aggro/combat;
- aristocrats;
- spellslinger;
- tokens;
- voltron;
- reanimator;
- control;
- stax;
- combo;
- landfall;
- graveyard;
- blink;
- artifact;
- enchantress;
- tribal.

Il punteggio aumenta quando:

- il comandante supporta il piano;
- molte carte convergono sullo stesso piano;
- le win condition sono coerenti;
- il mazzo ha abbastanza ridondanza.

Il punteggio cala quando:

- il mazzo contiene troppe sottotematiche scollegate;
- le carte forti non collaborano;
- la curva non supporta il game plan;
- il mazzo dipende da sequenze improbabili.

## Qualita' Carte

Ogni carta puo' avere un rating base derivato da:

- dati manuali curati;
- dati raccolti dal rating lab tramite confronti Elo tra carte;
- presenza in mazzi competitivi;
- EDHREC o fonti simili;
- ruolo funzionale;
- efficienza costo/effetto;
- sinergia con comandante e piano.

Il rating della carta non deve essere assoluto. Una carta puo' essere ottima in un mazzo e mediocre in un altro.

Per evitare il problema dei siti che assegnano sempre lo stesso valore alla stessa carta, MTG Deck Oracle deve separare:

- valore base della carta;
- valore contestuale nel mazzo;
- valore marginale rispetto a cio' che il mazzo ha gia'.

Esempio: una carta ramp e' molto preziosa in un mazzo che non ha quasi accelerazione, ma puo' avere valore marginale piu' basso in un mazzo che ha gia' 20 fonti di ramp. Non significa che la carta diventi "brutta": significa che aggiunge meno al mazzo specifico.

Formula concettuale:

```text
contextual_card_value =
  base_card_value
  * role_need_multiplier
  * synergy_multiplier
  * redundancy_multiplier
  * curve_fit_multiplier
```

Il `role_need_multiplier` deve aumentare quando il ruolo e' scarso e diminuire quando il ruolo e' gia' saturo. Questo crea diminishing returns naturali e rende il punteggio piu' vicino al valore reale della carta nel mazzo.

Esempio:

- `Demonic Tutor` e' quasi sempre forte.
- Un pezzo tribale specifico e' forte solo se il mazzo usa davvero quella tribu'.
- Una carta da combo e' debole se il resto della combo non e' presente o non e' tutorabile.
- Una fonte di ramp aggiuntiva puo' valere molto in un mazzo lento e poco in un mazzo gia' pieno di accelerazione.

## Combo e Sinergie

Il progetto non deve necessariamente reinventare il rilevamento grezzo delle combo. Esistono gia' database e siti molto affidabili, come Commander Spellbook, che catalogano combo, pezzi necessari e risultati prodotti. MTG Deck Oracle puo' appoggiarsi a queste fonti per scoprire quali carte del mazzo formano combo.

La parte proprietaria e importante dell'algoritmo deve essere la valutazione della combo nel contesto del mazzo specifico.

In pratica:

- fonte esterna: quali carte formano una combo;
- MTG Deck Oracle: quanto quella combo e' accessibile, veloce, protetta, coerente e rilevante nel mazzo analizzato.

Il sistema deve distinguere:

- combo complete;
- combo quasi complete;
- sinergie forti;
- sinergie leggere;
- carte morte fuori contesto.

Per ogni combo:

- identificare pezzi necessari;
- verificare se sono tutti presenti;
- stimare accessibilita' tramite tutor, draw e comandante;
- stimare costo mana totale;
- stimare costo mana effettivo nello stesso turno;
- verificare se la combo puo' essere avviata a velocita' istantaneo;
- verificare se richiede summoning sickness o permanenti gia' in campo;
- verificare se il comandante e' uno dei pezzi, un tutor, un payoff o una protezione;
- stimare vulnerabilita';
- capire se vince, genera vantaggio enorme o e' solo valore incrementale.

Una combo completa ma composta da cinque pezzi non tutorabili non deve valere quanto una combo compatta da due pezzi con tutor e protezione.

### Combo Data Adapter

Il sistema dovrebbe avere un adapter dedicato ai database combo esterni.

Responsabilita':

- importare combo note da una fonte affidabile;
- normalizzare nomi carte e varianti;
- riconoscere combo complete dentro una lista;
- riconoscere combo parziali;
- recuperare output della combo, ad esempio mana infinito, danni infiniti, pescata infinita, token infiniti, mill infinito o lock;
- mantenere la fonte aggiornabile senza riscrivere lo scoring engine.

Se una fonte esterna non espone API ufficiali, il progetto deve preferire dataset pubblici, export consentiti o integrazioni manuali curate. Non bisogna basare il prodotto su scraping fragile o non autorizzato.

### Valutazione Combo

Ogni combo rilevata deve ricevere un `combo_impact_score`, separato dal semplice fatto che la combo esista.

Fattori consigliati:

- numero di pezzi richiesti;
- mana totale richiesto;
- mana richiesto nel turno di chiusura;
- colori necessari;
- velocita' sorcery o instant;
- necessita' di avere permanenti gia' in campo;
- necessita' di creature senza summoning sickness;
- se il comandante e' parte della combo;
- se il comandante cerca, abilita o protegge la combo;
- quantita' di tutor che trovano i pezzi;
- card draw e selezione disponibili;
- protezioni disponibili;
- vulnerabilita' a removal, counterspell, graveyard hate o artifact/enchantment hate;
- tipo di payoff: vittoria immediata, mana infinito, danni infiniti, pescata infinita, value engine o soft lock.

Bozza formula:

```text
combo_impact =
  payoff_score
  * access_multiplier
  * commander_synergy_multiplier
  * speed_multiplier
  * protection_multiplier
  * fragility_penalty
```

Esempio:

- una combo da 2 carte che fa danni infiniti, costa poco, e' tutorabile e include il comandante deve pesare molto;
- una combo da 4 carte che fa mana infinito ma richiede permanenti gia' in campo e nessuna protezione deve pesare meno;
- tre carte che "scombano tra loro" ma non chiudono la partita devono essere trattate come engine o sinergia forte, non come win condition automatica.

### Output Combo Nel Report

Il report deve mostrare:

- combo trovate;
- carte coinvolte;
- risultato prodotto;
- costo stimato;
- velocita' stimata;
- ruolo del comandante;
- quanto e' facile trovarla;
- quanto e' fragile;
- impatto sul voto e sul bracket.

Esempio:

```text
Combo trovata: Carta A + Carta B.
Risultato: mana infinito e danni infiniti.
Valutazione: impatto alto, perche' richiede solo 2 pezzi, il comandante aiuta a trovare Carta A e il costo di chiusura e' basso. La combo e' pero' vulnerabile a removal istantaneo su Carta B.
```

## Mana Base e Curva

Analisi minima:

- numero terre;
- fonti colorate per colore;
- terre tappate;
- mana rocks;
- ramp verde;
- costo medio mana;
- picchi nella curva;
- spell a costo alto senza accelerazione.

Il sistema deve valutare se il mazzo puo' lanciare le proprie magie nei turni in cui sono rilevanti.

## Interaction

Il modulo interaction valuta:

- removal creature;
- removal permanente;
- board wipe;
- counterspell;
- protezioni;
- graveyard hate;
- artifact/enchantment hate;
- capacita' di rispondere a combo.

Il punteggio deve considerare il colore del mazzo. Non tutti i colori hanno le stesse risposte, ma un mazzo forte deve comunque avere strumenti realistici per non perdere da solo contro il tavolo.

## Velocita' e Bracket

Il bracket stimato non deve sostituire il voto numerico. Deve essere una traduzione leggibile del risultato.

Bozza:

| Voto | Interpretazione |
| ---: | --- |
| 0-20 | Lista non valida, casual incompleto o quasi ingiocabile |
| 21-40 | Casual debole o molto incoerente |
| 41-60 | Casual funzionante |
| 61-75 | Casual forte / high power leggero |
| 76-88 | High power |
| 89-100 | cEDH o quasi cEDH |

Il bracket deve considerare anche velocita' media di vittoria, tutor, combo compatte, free interaction, fast mana e densita' di carte ad alta efficienza.

## Penalita' Anti-Abuso

Il sistema deve riconoscere input costruiti per manipolare il voto.

Penalita':

- carte totali diverse da 100;
- molte carte forti ma nessun piano;
- combo incomplete inserite solo per alzare il punteggio;
- mana base incompatibile con i costi;
- curve troppo alte;
- ridondanza falsa, cioe' carte simili ma non realmente sostituibili;
- liste con sezioni duplicate o parsing ambiguo.

## Spiegazione del Voto

Ogni report deve generare una spiegazione in linguaggio naturale:

- perche' il voto e' alto o basso;
- quali sottopunteggi pesano di piu';
- quali errori bloccano il voto;
- quali modifiche darebbero il miglior aumento;
- quanto il mazzo sembra coerente con il comandante.

Esempio sintetico:

```text
Il mazzo ottiene 67/100. Il piano token con il comandante e' chiaro e ha buone payoff, ma la curva e' alta e il mazzo ha poche fonti di ramp nei primi turni. Sono presenti due combo complete, pero' solo una e' facilmente accessibile. La mana base e' sufficiente ma migliorabile. Il voto e' limitato dalla consistenza, non dalla potenza delle singole carte.
```

## Calibrazione

Per rendere l'algoritmo affidabile servono mazzi benchmark:

- precon recenti;
- precon modificati;
- casual medi;
- casual forti;
- high power;
- cEDH noti;
- liste illegali o volutamente sbagliate;
- liste gonfiate da 120, 150 e 200 carte.

Ogni benchmark deve avere:

- voto atteso;
- bracket atteso;
- spiegazione manuale;
- motivi per cui il voto non deve salire o scendere troppo.

## Prima Versione Implementabile

La prima versione dell'algoritmo puo' usare:

- database carte da Scryfall;
- tag funzionali manuali;
- database combo curato;
- formule probabilistiche semplici;
- pesi configurabili in JSON;
- fixture di mazzi per test automatici.

In seguito si potra' aggiungere machine learning o ranking basato su dati reali, ma solo dopo aver costruito una base deterministica e spiegabile.
